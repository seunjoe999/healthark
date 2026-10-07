import { query } from '../config/database';
import { RESTRICTED_ROLES, getAssignedSuIds } from './residentAccess';
import { ukDateStr } from './ukTime';

export interface DueGeneralTask { id: string; title: string; dueTime: string | null }

// Pending (non-medication) tasks visible to this staff member for today — used by the
// clock-out compulsory-completion gate. Mirrors the same visibility rules GET /api/tasks
// uses (creator / direct assignment / role match / team match / general "all staff"
// tasks with no restriction), so a task that wouldn't even show on a staff member's own
// list can never block them from clocking out over it.
export async function getMyPendingTasksToday(homeId: string, staffId: string, role: string): Promise<DueGeneralTask[]> {
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
  const shiftRows = staffId
    ? await query<any>(
        `SELECT su_id, su_ids, start_time, end_time FROM staff_shifts WHERE staff_id = $1 AND home_id = $2 AND shift_date = $3`,
        [staffId, homeId, todayStr]
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
      visible = visible.filter((t: any) => {
        if (!t.due_time) return true;
        const raw = toMin(String(t.due_time).slice(0, 5));
        return windows.some(w => {
          const due = raw < w.start ? raw + 1440 : raw;
          return due >= w.start && due <= w.end;
        });
      });
    } else {
      visible = visible.filter((t: any) => !t.due_time);
    }
  }

  return visible.map((t: any) => ({ id: t.id, title: t.title, dueTime: t.due_time || null }));
}
