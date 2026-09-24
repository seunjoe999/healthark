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
    `SELECT id, title, due_time, created_by, assigned_staff_id, assigned_role, visible_team_ids, su_id
     FROM tasks WHERE home_id = $1 AND task_date = $2 AND status = 'pending'`,
    [homeId, todayStr]
  );

  let myTeamId: string | null = null;
  if (staffId) {
    const staffRows = await query<any>('SELECT team_id FROM staff WHERE id = $1', [staffId]);
    myTeamId = staffRows[0]?.team_id || null;
  }

  let visible = rows.filter((t: any) => {
    if (t.created_by === staffId) return true;
    if (t.assigned_staff_id) return t.assigned_staff_id === staffId;
    const hasRoleTarget = !!t.assigned_role;
    const hasTeamTarget = !!(t.visible_team_ids && t.visible_team_ids.length > 0);
    if (!hasRoleTarget && !hasTeamTarget) return true; // general/all-staff task
    if (hasRoleTarget && t.assigned_role === role) return true;
    if (hasTeamTarget && myTeamId && t.visible_team_ids.includes(myTeamId)) return true;
    return false;
  });

  if (RESTRICTED_ROLES.includes(role) && staffId) {
    const assignedSuIds = await getAssignedSuIds(staffId);
    visible = visible.filter((t: any) => t.created_by === staffId || t.assigned_staff_id === staffId || !t.su_id || assignedSuIds.includes(t.su_id));
  }

  // Only tasks due within the staff member's own shift(s) today block them from
  // clocking out — a general "all staff" task due during the NEXT shift is that
  // shift's responsibility, not theirs. Previously this counted every pending
  // task for the whole day regardless of who was on shift when, so staff could
  // never clock out: the next shift's tasks always showed as still outstanding.
  // A task with no due_time can't be matched to a shift, so it's left in
  // (same as before) rather than silently exempting it.
  if (staffId) {
    const shiftRows = await query<any>(
      `SELECT start_time, end_time FROM staff_shifts WHERE staff_id = $1 AND home_id = $2 AND shift_date = $3`,
      [staffId, homeId, todayStr]
    );
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
    }
  }

  return visible.map((t: any) => ({ id: t.id, title: t.title, dueTime: t.due_time || null }));
}
