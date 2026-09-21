import { query } from '../config/database';
import { RESTRICTED_ROLES, getAssignedSuIds } from './residentAccess';

export interface DueGeneralTask { id: string; title: string; dueTime: string | null }

// Pending (non-medication) tasks visible to this staff member for today — used by the
// clock-out compulsory-completion gate. Mirrors the same visibility rules GET /api/tasks
// uses (creator / direct assignment / role match / team match / general "all staff"
// tasks with no restriction), so a task that wouldn't even show on a staff member's own
// list can never block them from clocking out over it.
export async function getMyPendingTasksToday(homeId: string, staffId: string, role: string): Promise<DueGeneralTask[]> {
  const todayStr = new Date().toISOString().split('T')[0];
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

  return visible.map((t: any) => ({ id: t.id, title: t.title, dueTime: t.due_time || null }));
}
