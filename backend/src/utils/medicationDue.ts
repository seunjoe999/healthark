import { query } from '../config/database';
import { ukDateStr, ukDayOfWeek } from './ukTime';
import { getAssignedSuIds } from './residentAccess';

const FREQ_TIMES: Record<string, string[]> = {
  once_daily: ['08:00'],
  twice_daily: ['08:00', '20:00'],
  three_times_daily: ['08:00', '14:00', '20:00'],
  four_times_daily: ['08:00', '12:00', '16:00', '20:00'],
  weekly: ['08:00'],
  every_3_days: ['08:00'],
  as_required: [],
  other: ['08:00'],
};

// A medication's `apply_time` is the staff-chosen administration time (e.g. Atorvastatin
// at 19:00 instead of a default 08:00) — shifts the whole slot list so apply_time drives
// the actual time(s) shown, instead of silently falling back to the FREQ_TIMES defaults.
export function getTimeSlots(frequency: string, applyTime?: string | null): string[] {
  const defaults = FREQ_TIMES[frequency] || ['08:00'];
  if (!applyTime || !defaults.length) return defaults;
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const toTime = (mins: number) => {
    mins = ((mins % 1440) + 1440) % 1440;
    return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
  };
  const applyMin = toMin(String(applyTime).slice(0, 5));
  const offset = applyMin - toMin(defaults[0]);
  return defaults.map(t => toTime(toMin(t) + offset));
}

const PRIVILEGED_MAR_ROLES = ['home_manager', 'group_admin', 'deputy_manager', 'admin', 'director', 'registered_manager', 'service_manager'];

export interface DueMedicationTask {
  medicationId: string; suId: string; suName: string; suPhoto: string | null;
  medicationName: string; dose: string; route: string; instructions: string;
  isControlled: boolean; scheduledTime: string; status: string;
  recordId?: string; givenBy?: string; notes?: string | null; marCode?: string | null;
  // Needed by the task sign-off form to decide whether to show the body map,
  // and to show staff the prescribed application site for a cream/patch.
  medicineType?: string | null; applicationSite?: string | null; applicationSiteLabel?: string | null;
}

// Medication due-today as a per-staff task list — shared by the /mar/due-today endpoint
// (what staff see on their task list) and the clock-out compulsory-completion check
// (what blocks clocking out), so the two can never silently disagree about what's due.
export async function getDueTodayTasks(homeId: string, staffId: string, role: string, shiftSuIds?: string[]): Promise<DueMedicationTask[]> {
  const isPrivileged = PRIVILEGED_MAR_ROLES.includes(role);
  const today = ukDateStr();

  let assignedSuIds: string[] | null = null;
  if (!isPrivileged) {
    assignedSuIds = await getAssignedSuIds(staffId);
    if (assignedSuIds.length === 0) return [];
  }
  // Narrow further to residents actually on THIS staff member's rota shift today, when
  // known. staff_service_user_assignments is a standing caseload that can include
  // residents this person isn't rostered with today — without this, the clock-out gate
  // (see clockin.routes.ts) blocked on medication for a resident's whole caseload
  // regardless of who they were actually rostered to work with on the shift they're
  // trying to end.
  if (shiftSuIds && shiftSuIds.length > 0) {
    assignedSuIds = assignedSuIds ? assignedSuIds.filter(id => shiftSuIds.includes(id)) : shiftSuIds;
  }

  let sql = `SELECT m.id AS medication_id, m.su_id, m.medication_name, m.dose, m.frequency, m.route,
                    m.notes AS instructions, m.is_prn, m.is_controlled, m.apply_time, m.start_date, m.end_date, m.time_slots, m.weekly_days,
                    m.medicine_type, m.application_site, m.application_site_label,
                    su.first_name || ' ' || su.last_name AS su_name, su.photo_url AS su_photo
             FROM su_medications m
             JOIN service_users su ON su.id = m.su_id
             WHERE m.home_id = $1 AND m.is_active = true AND m.is_prn = false`;
  const params: any[] = [homeId];
  if (assignedSuIds) {
    sql += ` AND m.su_id = ANY($${params.length + 1})`;
    params.push(assignedSuIds);
  }
  sql += ` AND (m.end_date IS NULL OR m.end_date >= $${params.length + 1})`;
  params.push(today);
  const meds = await query<any>(sql, params);

  // Ordered oldest-first so the Map below keeps the LATEST entry per slot —
  // e.g. an "Attempted" (completed=false) logged at 08:05 followed by a
  // successful "Given" at 08:20 for the same dose must resolve to "given",
  // not get stuck on the earlier attempt.
  // scheduled_time is a TIME column and comes back as "HH:MM:SS" — trim to "HH:MM"
  // so it matches the slot keys from getTimeSlots() below, or a logged record can
  // never be matched back to its slot and the task looks permanently unresolved.
  const recordRows = await query<any>(
    `SELECT id, medication_id, LEFT(scheduled_time::text, 5) as scheduled_time,
            given, refused, mar_code, completed, given_by, notes
     FROM mar_records WHERE home_id = $1 AND record_date = $2 ORDER BY created_at ASC`,
    [homeId, today]
  );
  const recordMap = new Map<string, any>();
  for (const r of recordRows as any[]) recordMap.set(`${r.medication_id}|${r.scheduled_time}`, r);

  const todayDow = ukDayOfWeek();
  const tasks: DueMedicationTask[] = [];
  for (const med of meds as any[]) {
    if (med.frequency === 'weekly') {
      if (Array.isArray(med.weekly_days) && med.weekly_days.length > 0) {
        if (!med.weekly_days.map(Number).includes(todayDow)) continue;
      } else if (med.start_date) {
        const anchorDow = new Date(med.start_date).getDay();
        if (anchorDow !== todayDow) continue;
      }
    }
    if (med.frequency === 'every_3_days' && med.start_date) {
      const anchor = new Date(med.start_date);
      const anchorMidnight = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
      const now = new Date();
      const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const daysSinceAnchor = Math.round((todayMidnight.getTime() - anchorMidnight.getTime()) / 86400000);
      if (daysSinceAnchor < 0 || daysSinceAnchor % 3 !== 0) continue;
    }
    // Prefer the manager's own explicitly-set time_slots (each dose independently
    // timed, e.g. morning 08:00 / evening 18:30) over the evenly-offset default —
    // matches the MAR grid's logic. Without this, a medication with real,
    // unevenly-spaced dose times had its later doses silently recomputed to the
    // wrong time and never surfaced as due, so they never popped up as a task.
    // De-duped — a manager-entered time_slots array with an accidental repeated
    // time (e.g. saved before this session's "every dose needs a real time" fix
    // existed) used to surface as the SAME dose appearing 2-3 times on the to-do
    // list at that one time, instead of once.
    const times = Array.from(new Set<string>((med.time_slots && med.time_slots.length) ? med.time_slots : getTimeSlots(med.frequency, med.apply_time)));
    for (const t of times) {
      const existing = recordMap.get(`${med.medication_id}|${t}`);
      // completed=false (e.g. an "Attempted" outcome — resident refused but
      // staff plan to try again) keeps this on the pending task list instead
      // of being treated as resolved, so it doesn't silently drop off.
      const unresolved = existing && existing.completed === false;
      tasks.push({
        medicationId: med.medication_id, suId: med.su_id, suName: med.su_name, suPhoto: med.su_photo,
        medicationName: med.medication_name, dose: med.dose, route: med.route, instructions: med.instructions,
        isControlled: med.is_controlled, scheduledTime: t,
        status: (!existing || unresolved) ? 'pending' : (existing.given ? 'given' : existing.refused ? 'refused' : (existing.mar_code || 'logged')),
        recordId: existing?.id, givenBy: existing?.given_by,
        // Surfaced so a retry (e.g. after an "Attempted" outcome) can show the
        // previous attempt's handover note instead of reopening to a blank form —
        // see LogMARModal's existingRecord usage in MAR.tsx.
        notes: existing?.notes ?? null, marCode: existing?.mar_code ?? null,
        medicineType: med.medicine_type ?? null,
        applicationSite: med.application_site ?? null, applicationSiteLabel: med.application_site_label ?? null,
      });
    }
  }
  tasks.sort((a, b) => (a.scheduledTime || '').localeCompare(b.scheduledTime || ''));
  return tasks;
}

export interface StockCountStatus { total: number; counted: number; done: boolean }

// Medication Count is required at both ends of a shift: a soft reminder from
// clock-in onward, and a hard block at clock-out. Counting is scoped to TODAY
// (not "since this shift's clock-in") — see the counted query below for why
// the stricter window trapped staff who had genuinely done the count.
// `since` is retained for callers but no longer affects the result.
export async function getStockCountStatus(homeId: string, since?: Date, suIds?: string[]): Promise<StockCountStatus> {
  // "Counted" used to mean a row in medication_stock got touched — but that table
  // only updates itself automatically off MAR administration (see mar.routes.ts),
  // never off the actual "Medication Count" record staff fill in (a daily_records
  // note, recordType 'medication_stock_count' — see MedicationCountForm.tsx). The
  // two were completely unrelated, so this always read 0 counted regardless of how
  // many count records staff genuinely submitted, permanently blocking clock-out.
  //
  // `total` used to always mean every live resident on medication in the WHOLE
  // home, regardless of who's asking — fine for a manager's home-wide overview,
  // but fatal as a clock-out gate: it required ONE staff member's own shift to
  // have counted every resident in the building before THEY could clock out,
  // which is structurally impossible for anyone who isn't single-handedly
  // covering the entire home. That's why reports kept showing a stuck fraction
  // (7/13, 9/13, 11/13, ...) that could never reach completion — staff were
  // being held to a total that was never theirs to clear. When `suIds` is
  // given (the caller's own rostered residents), both sides of the fraction
  // are scoped to just those residents instead.
  const suScope = suIds && suIds.length > 0;
  const [totalRows, countedRows] = await Promise.all([
    query<any>(
      // Only residents with a real SCHEDULED (non-PRN) MAR — a resident with
      // no active medications, or PRN-only (no charted doses to check stock
      // against), has an empty MAR and must never inflate the denominator.
      // Staff reported being blocked at clock-out with "0/2 residents counted"
      // over residents who have nothing to be counted for.
      `SELECT COUNT(DISTINCT sm.su_id) AS total FROM su_medications sm
       JOIN service_users su ON su.id = sm.su_id
       WHERE su.home_id = $1 AND su.status = 'live' AND sm.is_active = true
         AND sm.is_prn = false
         AND (sm.end_date IS NULL OR sm.end_date >= CURRENT_DATE)
         AND ($2::uuid[] IS NULL OR sm.su_id = ANY($2::uuid[]))`,
      [homeId, suScope ? suIds : null]
    ),
    // Counted = a Medication Count record filed TODAY, regardless of when this
    // particular shift clocked in. Was scoped to "since this shift's clock-in",
    // which silently discarded a count filed minutes before clocking in or
    // during an earlier shift the same day — staff had genuinely done the count
    // and still got 0/N blocked at clock-out, repeatedly.
    query<any>(
      `SELECT COUNT(DISTINCT su_id) AS counted FROM daily_records
       WHERE home_id = $1 AND record_type = 'medication_stock_count' AND recorded_at::date = CURRENT_DATE
         AND ($2::uuid[] IS NULL OR su_id = ANY($2::uuid[]))`,
      [homeId, suScope ? suIds : null]
    ),
  ]);
  const total = parseInt(totalRows[0]?.total || '0', 10);
  const counted = parseInt(countedRows[0]?.counted || '0', 10);
  // suIds given but empty (e.g. no rota shift on record today) means there's
  // nothing reliable to scope against — fail open rather than falling back to
  // the unscoped home-wide total this was just fixed to avoid.
  if (suIds && suIds.length === 0) return { total: 0, counted: 0, done: true };
  return { total, counted, done: total === 0 || counted >= total };
}
