import { query } from '../config/database';

const FREQ_TIMES: Record<string, string[]> = {
  once_daily: ['08:00'],
  twice_daily: ['08:00', '20:00'],
  three_times_daily: ['08:00', '14:00', '20:00'],
  four_times_daily: ['08:00', '12:00', '16:00', '20:00'],
  weekly: ['08:00'],
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
}

// Medication due-today as a per-staff task list — shared by the /mar/due-today endpoint
// (what staff see on their task list) and the clock-out compulsory-completion check
// (what blocks clocking out), so the two can never silently disagree about what's due.
export async function getDueTodayTasks(homeId: string, staffId: string, role: string): Promise<DueMedicationTask[]> {
  const isPrivileged = PRIVILEGED_MAR_ROLES.includes(role);
  const today = new Date().toISOString().split('T')[0];

  let assignedSuIds: string[] | null = null;
  if (!isPrivileged) {
    const assignments = await query<any>('SELECT su_id FROM staff_service_user_assignments WHERE staff_id = $1', [staffId]);
    assignedSuIds = assignments.map((a: any) => a.su_id);
    if (assignedSuIds.length === 0) return [];
  }

  let sql = `SELECT m.id AS medication_id, m.su_id, m.medication_name, m.dose, m.frequency, m.route,
                    m.notes AS instructions, m.is_prn, m.is_controlled, m.apply_time, m.start_date,
                    su.first_name || ' ' || su.last_name AS su_name, su.photo_url AS su_photo
             FROM su_medications m
             JOIN service_users su ON su.id = m.su_id
             WHERE m.home_id = $1 AND m.is_active = true AND m.is_prn = false`;
  const params: any[] = [homeId];
  if (assignedSuIds) {
    sql += ` AND m.su_id = ANY($2)`;
    params.push(assignedSuIds);
  }
  const meds = await query<any>(sql, params);

  const recordRows = await query<any>(
    `SELECT medication_id, scheduled_time, given, refused, mar_code
     FROM mar_records WHERE home_id = $1 AND record_date = $2`,
    [homeId, today]
  );
  const recordMap = new Map<string, any>();
  for (const r of recordRows as any[]) recordMap.set(`${r.medication_id}|${r.scheduled_time}`, r);

  const todayDow = new Date().getDay();
  const tasks: DueMedicationTask[] = [];
  for (const med of meds as any[]) {
    if (med.frequency === 'weekly' && med.start_date) {
      const anchorDow = new Date(med.start_date).getDay();
      if (anchorDow !== todayDow) continue;
    }
    const times = getTimeSlots(med.frequency, med.apply_time);
    for (const t of times) {
      const existing = recordMap.get(`${med.medication_id}|${t}`);
      tasks.push({
        medicationId: med.medication_id, suId: med.su_id, suName: med.su_name, suPhoto: med.su_photo,
        medicationName: med.medication_name, dose: med.dose, route: med.route, instructions: med.instructions,
        isControlled: med.is_controlled, scheduledTime: t,
        status: existing ? (existing.given ? 'given' : existing.refused ? 'refused' : (existing.mar_code || 'logged')) : 'pending',
      });
    }
  }
  tasks.sort((a, b) => (a.scheduledTime || '').localeCompare(b.scheduledTime || ''));
  return tasks;
}

export interface StockCountStatus { total: number; counted: number; done: boolean }

// Medication Count is required at both ends of a shift: a soft reminder from
// clock-in onward (checked against "today"), and a hard block at clock-out
// (checked against "since this shift started" — a count done on an earlier
// shift today doesn't excuse skipping it on this one).
export async function getStockCountStatus(homeId: string, since?: Date): Promise<StockCountStatus> {
  const [totalRows, countedRows] = await Promise.all([
    query<any>(
      `SELECT COUNT(DISTINCT su_id) AS total FROM su_medications sm
       JOIN service_users su ON su.id = sm.su_id
       WHERE su.home_id = $1 AND su.status = 'live' AND sm.is_active = true`,
      [homeId]
    ),
    since
      ? query<any>(
          `SELECT COUNT(DISTINCT su_id) AS counted FROM medication_stock
           WHERE home_id = $1 AND updated_at >= $2`,
          [homeId, since]
        )
      : query<any>(
          `SELECT COUNT(DISTINCT su_id) AS counted FROM medication_stock
           WHERE home_id = $1 AND updated_at::date = CURRENT_DATE`,
          [homeId]
        ),
  ]);
  const total = parseInt(totalRows[0]?.total || '0', 10);
  const counted = parseInt(countedRows[0]?.counted || '0', 10);
  return { total, counted, done: total === 0 || counted >= total };
}
