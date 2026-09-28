import { Request } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ukDateStr } from './ukTime';

const RESTRICTED_ROLES = ['care_staff', 'team_leader', 'senior_carer', 'supervisor', 'recruitment_admin'];

function fromToken(req: Request, field: string): string {
  const token = req.headers.authorization?.substring(7);
  if (token) { const d = jwt.decode(token) as any; return (req.staff as any)?.[field] || d?.[field] || ''; }
  return (req.staff as any)?.[field] || '';
}

export function getRole(req: Request): string { return fromToken(req, 'role'); }
export function getStaffId(req: Request): string { return fromToken(req, 'staffId'); }
export function getHomeId(req: Request): string { return fromToken(req, 'homeId'); }

// Residents this staff member may work with: their standing assignments PLUS anyone
// they are rostered with on today's rota. Assignments alone left a carer who was
// rostered with a resident today (cover, a swapped shift, a newly-admitted resident
// nobody had assigned yet) unable to see that resident's medication or documentation —
// e.g. a resident missing from the Medication Tasks dropdown entirely.
export async function getAssignedSuIds(staffId: string): Promise<string[]> {
  const rows = await query<{ su_id: string }>(
    'SELECT su_id FROM staff_service_user_assignments WHERE staff_id = $1',
    [staffId]
  );
  const ids = new Set<string>(rows.map((r: any) => r.su_id));
  try {
    const rota = await query<any>(
      `SELECT su_id, su_ids FROM staff_shifts WHERE staff_id = $1 AND shift_date = $2`,
      [staffId, ukDateStr()]
    );
    for (const sh of rota) {
      if (sh.su_id) ids.add(sh.su_id);
      if (Array.isArray(sh.su_ids)) sh.su_ids.forEach((id: string) => id && ids.add(id));
    }
  } catch { /* rota lookup is best-effort; fall back to assignments only */ }
  return Array.from(ids);
}

// Throws 403 if a restricted role tries to access a resident they're not assigned to.
// Managers (deputy_manager, home_manager, group_admin, admin) always pass.
export async function assertResidentAccess(req: Request, suId: string): Promise<void> {
  if (!suId) return;
  const role = getRole(req);
  if (!RESTRICTED_ROLES.includes(role)) return;
  const staffId = getStaffId(req);
  if (!staffId) throw new AppError('Not authenticated', 401);
  const ids = await getAssignedSuIds(staffId);
  if (!ids.includes(suId)) {
    throw new AppError('You do not have permission to access this resident\'s records', 403);
  }
}

export { RESTRICTED_ROLES };
