import { query } from '../config/database';
import { ukDateStr, ukDayOfWeek, ukTimeHHMM, ukDaysBetween } from './ukTime';
import { getAssignedSuIds } from './residentAccess';
import { pickCurrentShiftIndex, fetchEffectiveShiftsForDate } from './taskDue';

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

const PRIVILEGED_MAR_ROLES = ['super_admin', 'home_manager', 'group_admin', 'deputy_manager', 'admin', 'director', 'registered_manager', 'service_manager'];

export interface DueMedicationTask {
  medicationId: string; suId: string; suName: string; suPhoto: string | null;
  medicationName: string; dose: string; route: string; instructions: string;
  isControlled: boolean; scheduledTime: string; status: string;
  recordId?: string; givenBy?: string; notes?: string | null; marCode?: string | null;
  // Needed by the task sign-off form to decide whether to show the body map,
  // and to show staff the prescribed application site for a cream/patch.
  medicineType?: string | null; applicationSite?: string | null; applicationSiteLabel?: string | null;
  // Post-administration observation (how the person was 30–60 min after the dose).
  outcomeNote?: string | null; outcomeNoteAt?: string | null;
}

// Medication due-today as a per-staff task list — shared by the /mar/due-today endpoint
// (what staff see on their task list) and the clock-out compulsory-completion check
// (what blocks clocking out), so the two can never silently disagree about what's due.
//
// currentShiftStaffId (optional) narrows doses to the staff member's CURRENT shift
// window (day or night) — RoundSys-style, each shift sees its own medication.
// Their rota shifts for today are read here (same UK-date logic as the task
// gate), the current one picked with the same in-progress/next/last rule, and
// doses kept only when their scheduled time falls inside that window
// (overnight shifts normalised, post-midnight doses tried both as-is and +24h).
// Without it, the full day's doses are returned as before.
export async function getDueTodayTasks(homeId: string, staffId: string, role: string, shiftSuIds?: string[], currentShiftStaffId?: string): Promise<DueMedicationTask[]> {
  const isPrivileged = PRIVILEGED_MAR_ROLES.includes(role);
  const today = ukDateStr();

  // The two reads below are independent — fired together. Each one waited out
  // separately stacks waits past the phone's timeout on the clock-out path
  // (see clockin.routes.ts), where this function runs on every clock-out.
  // getAssignedSuIds itself runs its two queries one after the other; the
  // rota part is kicked off here alongside the assignments part and merged
  // inside.
  // Only query per-staff tables when `!isPrivileged && staffId` — starting
  // un-awaited queries with an empty `staffId` previously threw Postgres 22P02
  // (`invalid input syntax for type uuid: ""`) unhandled rejections in cron jobs.
  const [assignmentRows, rotaResidentRows] = isPrivileged || !staffId
    ? [[], []]
    : await Promise.all([
        query<{ su_id: string }>(
          'SELECT su_id FROM staff_service_user_assignments WHERE staff_id = $1',
          [staffId]
        ),
        fetchEffectiveShiftsForDate(staffId, homeId, today),
      ]);

  let assignedSuIds: string[] | null = null;
  if (!isPrivileged) {
    const ids = new Set<string>((assignmentRows as any[]).map((r: any) => r.su_id));
    for (const sh of rotaResidentRows as any[]) {
      if (sh.su_id) ids.add(sh.su_id);
      if (Array.isArray(sh.su_ids)) sh.su_ids.forEach((id: string) => id && ids.add(id));
    }
    assignedSuIds = Array.from(ids);
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
  // The medication list and today's MAR records are independent reads — fired
  // together for the same stacked-wait reason as above.
  const [meds, recordRows] = await Promise.all([
    query<any>(sql, params),
    // Ordered oldest-first so the Map below keeps the LATEST entry per slot —
    // e.g. an "Attempted" (completed=false) logged at 08:05 followed by a
    // successful "Given" at 08:20 for the same dose must resolve to "given",
    // not get stuck on the earlier attempt.
    // scheduled_time is a TIME column and comes back as "HH:MM:SS" — trim to "HH:MM"
    // so it matches the slot keys from getTimeSlots() below, or a logged record can
    // never be matched back to its slot and the task looks permanently unresolved.
    query<any>(
      `SELECT id, medication_id, LEFT(scheduled_time::text, 5) as scheduled_time,
              given, refused, mar_code, completed, given_by, notes, outcome_note, outcome_note_at
       FROM mar_records WHERE home_id = $1 AND record_date = $2 ORDER BY created_at ASC`,
      [homeId, today]
    ),
  ]);
  const recordMap = new Map<string, any>();
  for (const r of recordRows as any[]) recordMap.set(`${r.medication_id}|${r.scheduled_time}`, r);

  const todayDow = ukDayOfWeek();
  const tasks: DueMedicationTask[] = [];
  for (const med of meds as any[]) {
    if (med.frequency === 'weekly') {
      if (Array.isArray(med.weekly_days) && med.weekly_days.length > 0) {
        if (!med.weekly_days.map(Number).includes(todayDow)) continue;
      } else if (med.start_date) {
        const anchorDow = ukDayOfWeek(new Date(med.start_date));
        if (anchorDow !== todayDow) continue;
      }
    }
    if (med.frequency === 'every_3_days' && med.start_date) {
      const daysSinceAnchor = ukDaysBetween(med.start_date, today);
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
        outcomeNote: existing?.outcome_note ?? null, outcomeNoteAt: existing?.outcome_note_at ?? null,
        medicineType: med.medicine_type ?? null,
        applicationSite: med.application_site ?? null, applicationSiteLabel: med.application_site_label ?? null,
      });
    }
  }
  tasks.sort((a, b) => (a.scheduledTime || '').localeCompare(b.scheduledTime || ''));
  // Per-shift view (see header comment): keep only doses whose scheduled time
  // falls inside the staff member's CURRENT shift window. A dose with no
  // parseable time can't be matched to a shift, so it's kept rather than
  // silently dropped. Falls back to the full day's list when the current
  // shift can't be determined (no rota rows, unparseable times).
  if (currentShiftStaffId) {
    try {
      const shiftRows = await fetchEffectiveShiftsForDate(currentShiftStaffId, homeId, today);
      if (shiftRows.length) {
        const idx = pickCurrentShiftIndex(shiftRows, ukTimeHHMM());
        const cur = shiftRows[idx];
        if (cur) {
          const toMin = (t: string) => { const [h, m] = String(t).slice(0, 5).split(':').map(Number); return h * 60 + m; };
          const start = toMin(String(cur.start_time).slice(0, 5));
          let end = toMin(String(cur.end_time).slice(0, 5));
          if (end <= start) end += 1440;
          const inWindow = (sched?: string | null) => {
            if (!sched) return true;
            const raw = toMin(sched.slice(0, 5));
            if (Number.isNaN(raw)) return true;
            const candidates = raw < start ? [raw + 1440, raw] : [raw, raw + 1440];
            return candidates.some(d => d >= start && d <= end);
          };
          return tasks.filter(t => inWindow(t.scheduledTime));
        }
      }
    } catch (shiftErr) {
      // Shift lookup failed — fail open with the full day's list, same as before.
    }
  }
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
  const today = ukDateStr();
  const [totalRows, countedRows] = await Promise.all([
    query<any>(
      `SELECT COUNT(DISTINCT sm.su_id) AS total FROM su_medications sm
       JOIN service_users su ON su.id = sm.su_id
       WHERE su.home_id = $1 AND su.status = 'live' AND sm.is_active = true
         AND sm.is_prn = false
         AND (sm.end_date IS NULL OR sm.end_date >= $3::date)
         AND ($2::uuid[] IS NULL OR sm.su_id = ANY($2::uuid[]))`,
      [homeId, suScope ? suIds : null, today]
    ),
    query<any>(
      `SELECT COUNT(DISTINCT su_id) AS counted FROM daily_records
       WHERE home_id = $1 AND record_type = 'medication_stock_count'
         AND (recorded_at AT TIME ZONE 'Europe/London')::date = $3::date
         AND ($2::uuid[] IS NULL OR su_id = ANY($2::uuid[]))`,
      [homeId, suScope ? suIds : null, today]
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
