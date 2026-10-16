import { query } from '../config/database';
import { RESTRICTED_ROLES, getAssignedSuIds } from './residentAccess';
import { ukDateStr, ukTimeHHMM } from './ukTime';

export interface DueGeneralTask { id: string; title: string; dueTime: string | null }

// Which of a staff member's shifts today "now" belongs to — shared with the
// clock-in flow (clockin.routes.ts) and the staff dashboard, which both use
// the same rule: whichever shift is actually in progress, else the next one
// still to come today, else the last one of the day. Centralised here so the
// task list, the overdue pop-up and the clock-out gate can never disagree
// about which shift (day or night) is the current one.
function toMins(t?: string | null): number | null {
  if (!t) return null;
  const [h, m] = String(t).slice(0, 5).split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

export function pickCurrentShiftIndex(shifts: { start_time?: string | null; end_time?: string | null }[], nowHHMM: string): number {
  const wins = shifts.map((s, i) => {
    const st = toMins(s.start_time);
    let en = toMins(s.end_time);
    if (st == null || en == null) return null;
    if (en <= st) en += 1440; // overnight shift
    return { i, st, en };
  }).filter((w): w is { i: number; st: number; en: number } => w !== null);
  if (!wins.length) return 0;
  const now = toMins(nowHHMM) ?? 0;
  const inProg = wins.find(w => now >= w.st && now <= w.en);
  if (inProg) return inProg.i;
  const upcoming = wins.filter(w => w.st > now).sort((a, b) => a.st - b.st)[0];
  if (upcoming) return upcoming.i;
  return wins.sort((a, b) => b.st - a.st)[0].i;
}

// Pending (non-medication) tasks visible to this staff member for today — used by the
// clock-out compulsory-completion gate. Mirrors the same visibility rules GET /api/tasks
// uses (creator / direct assignment / role match / team match / general "all staff"
// tasks with no restriction), so a task that wouldn't even show on a staff member's own
// list can never block them from clocking out over it.
//
// currentShiftOnly narrows the result to the staff member's CURRENT shift (day or
// night) instead of the whole day — the RoundSys-style behaviour where each shift
// sees its own tasks. Only tasks whose due_time falls inside the current shift's
// own start-to-end window (or that carry no due_time at all) are returned; the
// night shift's tasks never appear while the day shift is on, and vice versa.
// Overnight shifts (end <= start) are normalised by treating the end as the
// following day, and a task due after UK midnight (e.g. 00:30) is tried both
// as-is and +24h to see which lands inside the window.
export async function getMyPendingTasksToday(homeId: string, staffId: string, role: string, onlyShiftId?: string, currentShiftOnly = false): Promise<DueGeneralTask[]> {
  // UK date, not the server's own UTC clock — during BST the server's UTC date is
  // still "yesterday" for up to an hour after UK midnight, so this used to check
  // yesterday's task list (and yesterday's rota shift, below) against a staff
  // member clocking out right around midnight, either missing genuinely pending
  // tasks or matching against the wrong shift window entirely — this gate blocks
  // clock-out, so getting the date wrong here directly produces a stuck clock-in.
  const todayStr = ukDateStr();
  const rows = await query<any>(
    `SELECT id, title, due_time, category, created_by, assigned_staff_id, assigned_role, visible_team_ids, su_id
     FROM tasks WHERE home_id = $1 AND task_date = $2 AND status = 'pending'`,
    [homeId, todayStr]
  );

  let myTeamId: string | null = null;
  if (staffId) {
    const staffRows = await query<any>('SELECT team_id FROM staff WHERE id = $1', [staffId]);
    myTeamId = staffRows[0]?.team_id || null;
  }

  // 30-minute post-PRN observation tasks (created by mar.routes) show on the
  // task list with their due time but must never block clock-out — they're a
  // follow-up prompt, not a shift-closing prerequisite, and trapping staff
  // over them is exactly the clock-out deadlock this gate has repeatedly
  // caused for other task types.
  const blockable = rows.filter((t: any) => t.category !== 'medication_observation');

  let visible = blockable.filter((t: any) => {
    if (t.created_by === staffId) return true;
    if (t.assigned_staff_id) return t.assigned_staff_id === staffId;
    const hasRoleTarget = !!t.assigned_role;
    const hasTeamTarget = !!(t.visible_team_ids && t.visible_team_ids.length > 0);
    if (!hasRoleTarget && !hasTeamTarget) return true; // general/all-staff task
    if (hasRoleTarget && t.assigned_role === role) return true;
    if (hasTeamTarget && myTeamId && t.visible_team_ids.includes(myTeamId)) return true;
    return false;
  });

  // staff_shifts for today, fetched once and reused below for both resident scope
  // and the time-window check — same rota-derived approach GET /api/tasks uses
  // (see tasks.routes.ts) instead of the static staff_service_user_assignments
  // caseload, so a carer only sees/is blocked by tasks for whoever they're
  // actually rostered with today, not their whole long-term assignment list.
  //
  // onlyShiftId narrows this to ONE specific shift (the one actually being
  // clocked out of) — without it, a staff member with two shifts today had
  // tasks due during shift 2 block them from clocking out of shift 1.
  const shiftRows = staffId
    ? await query<any>(
        onlyShiftId
          ? `SELECT su_id, su_ids, start_time, end_time FROM staff_shifts WHERE staff_id = $1 AND home_id = $2 AND shift_date = $3 AND id = $4`
          : `SELECT su_id, su_ids, start_time, end_time FROM staff_shifts WHERE staff_id = $1 AND home_id = $2 AND shift_date = $3`,
        onlyShiftId ? [staffId, homeId, todayStr, onlyShiftId] : [staffId, homeId, todayStr]
      )
    : [];

  if (RESTRICTED_ROLES.includes(role) && staffId) {
    const rotaSuIds = Array.from(new Set(
      shiftRows.flatMap((sh: any) => [sh.su_id, ...(Array.isArray(sh.su_ids) ? sh.su_ids : [])].filter(Boolean))
    ));
    if (shiftRows.length > 0) {
      // Has a rota entry today — scope to exactly those residents.
      visible = visible.filter((t: any) => t.created_by === staffId || t.assigned_staff_id === staffId || !t.su_id || rotaSuIds.includes(t.su_id));
    } else {
      // No rota entry at all today — this person isn't on shift. Falling back to
      // their static long-term assignment list used to still trap them at
      // clock-out over a resident-linked task (e.g. a Medication Stock count)
      // for someone they're not actually working with today, same fail-open
      // principle already applied to the medication-due and stock-count checks
      // in clockin.routes.ts. Only their own created/assigned tasks can still
      // block them; every other resident-linked task is excluded.
      visible = visible.filter((t: any) => t.created_by === staffId || t.assigned_staff_id === staffId || !t.su_id);
    }
  }

  // Only tasks due within the staff member's own shift(s) today block them from
  // clocking out — a general "all staff" task due during the NEXT shift is that
  // shift's responsibility, not theirs. Previously this counted every pending
  // task for the whole day regardless of who was on shift when, so staff could
  // never clock out: the next shift's tasks always showed as still outstanding.
  // A task with no due_time can't be matched to a shift, so it's left in
  // (same as before) rather than silently exempting it.
  //
  // currentShiftOnly (RoundSys-style per-shift task view) narrows the window
  // to the CURRENT shift alone: a day shift ending at 20:00 never sees or
  // blocks on the night shift's tasks, and the night shift never sees the
  // day's. Falls back to all of today's shifts only when the current one
  // can't be determined (no shift rows, or unparseable times).
  //
  // When there's NO shift row at all for today, the window can't be verified —
  // failing open here (excluding every due-timed task rather than keeping them
  // all in, which is what happened before) matches the same fail-open principle
  // used for the clock-out medication check in clockin.routes.ts: a data gap in
  // the rota must never be the reason a real task outside someone's actual
  // working hours traps them at clock-out.
  if (staffId) {
    if (shiftRows.length) {
      const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
      const windows = shiftRows.map((s: any) => {
        const start = toMin(String(s.start_time).slice(0, 5));
        let end = toMin(String(s.end_time).slice(0, 5));
        if (end <= start) end += 1440; // overnight shift
        return { start, end };
      });
      let activeWindows = windows;
      if (currentShiftOnly) {
        const idx = pickCurrentShiftIndex(shiftRows, ukTimeHHMM());
        if (shiftRows[idx]) {
          const s = shiftRows[idx];
          const start = toMin(String(s.start_time).slice(0, 5));
          let end = toMin(String(s.end_time).slice(0, 5));
          if (end <= start) end += 1440;
          activeWindows = [{ start, end }];
        }
      }
      visible = visible.filter((t: any) => {
        if (!t.due_time) return true;
        const raw = toMin(String(t.due_time).slice(0, 5));
        return activeWindows.some(w => {
          // A due time after UK midnight (e.g. 00:30 on an overnight shift)
          // means the next calendar day from the shift's point of view — try
          // it both as-is and +24h to see which lands inside the window.
          const candidates = raw < w.start ? [raw + 1440, raw] : [raw, raw + 1440];
          return candidates.some(due => due >= w.start && due <= w.end);
        });
      });
    } else {
      visible = visible.filter((t: any) => !t.due_time);
    }
  }

  return visible.map((t: any) => ({ id: t.id, title: t.title, dueTime: t.due_time || null }));
}
