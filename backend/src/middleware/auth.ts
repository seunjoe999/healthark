import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../config/database';
import { JwtPayload, StaffRole, ApiResponse } from '../types';

// Extend Express Request to carry staff context
declare global {
  namespace Express {
    interface Request {
      staff: JwtPayload;
    }
  }
}

// ── Verify JWT and attach staff to request ──────────────────────
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'Authentication required' } as ApiResponse);
      return;
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not configured');

    const payload = jwt.verify(token, secret) as JwtPayload;

    // Verify staff still active in database (not terminated/suspended since token issued)
    const rows = await query<{ is_active: boolean; status: string; organisation_id: string }>(
      'SELECT is_active, status, organisation_id FROM staff WHERE id = $1',
      [payload.staffId]
    );

    if (!rows.length || !rows[0].is_active || rows[0].status === 'terminated') {
      res.status(401).json({ success: false, error: 'Account is inactive' } as ApiResponse);
      return;
    }

    // Keep organisationId in payload in sync with DB (handles migration edge cases)
    if (rows[0].organisation_id && !payload.organisationId) {
      payload.organisationId = rows[0].organisation_id;
    }

    req.staff = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ success: false, error: 'Token expired' } as ApiResponse);
    } else if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ success: false, error: 'Invalid token' } as ApiResponse);
    } else {
      next(err);
    }
  }
}

// ── Role-based access guard ─────────────────────────────────────
export function requireRole(...roles: StaffRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.staff) {
      res.status(401).json({ success: false, error: 'Not authenticated' } as ApiResponse);
      return;
    }
    if (!roles.includes(req.staff.role)) {
      res.status(403).json({
        success: false,
        error: `Requires one of: ${roles.join(', ')}. You are: ${req.staff.role}`
      } as ApiResponse);
      return;
    }
    next();
  };
}

// ── Verify staff has access to the requested home ───────────────
export async function requireHomeAccess(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const homeId = req.params.homeId || req.body.homeId || req.query.homeId as string;
    if (!homeId) {
      next();
      return;
    }

    const { role, staffId, organisationId } = req.staff;

    // group_admin sees all homes in their org
    if (role === 'group_admin') {
      const rows = await query<{ id: string }>(
        'SELECT id FROM homes WHERE id = $1 AND organisation_id = $2',
        [homeId, organisationId]
      );
      if (!rows.length) {
        res.status(403).json({ success: false, error: 'Home not found in your organisation' } as ApiResponse);
        return;
      }
      next();
      return;
    }

    // All other roles - check staff_home_access table
    const rows = await query<{ staff_id: string }>(
      'SELECT staff_id FROM staff_home_access WHERE staff_id = $1 AND home_id = $2',
      [staffId, homeId]
    );

    if (!rows.length) {
      // Fallback: staff assigned directly to this home
      const direct = await query<{ id: string }>(
        'SELECT id FROM staff WHERE id = $1 AND home_id = $2',
        [staffId, homeId]
      );
      if (!direct.length) {
        res.status(403).json({ success: false, error: 'Access to this home is not permitted' } as ApiResponse);
        return;
      }
    }

    next();
  } catch (err) {
    next(err);
  }
}

// ── Verify specific permission within a home ────────────────────
export function requirePermission(
  permission: 'canViewCarePlans' | 'canEditCarePlans' | 'canViewSensitive' |
              'canRunReports' | 'canManageStaff' | 'canApproveLeave' |
              'canViewPhones' | 'canViewKeysafe' | 'canViewFinancials'
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { role, staffId } = req.staff;

      // group_admin and home_manager have all permissions
      if (role === 'group_admin' || role === 'home_manager') {
        next();
        return;
      }

      const homeId = req.params.homeId || req.body.homeId;
      if (!homeId) {
        next();
        return;
      }

      // Map permission name to DB column
      const colMap: Record<string, string> = {
        canViewCarePlans: 'can_view_care_plans',
        canEditCarePlans: 'can_edit_care_plans',
        canViewSensitive: 'can_view_sensitive',
        canRunReports: 'can_run_reports',
        canManageStaff: 'can_manage_staff',
        canApproveLeave: 'can_approve_leave',
        canViewPhones: 'can_view_phones',
        canViewKeysafe: 'can_view_keysafe',
        canViewFinancials: 'can_view_financials',
      };

      const col = colMap[permission];
      const rows = await query<Record<string, boolean>>(
        `SELECT ${col} FROM staff_home_access WHERE staff_id = $1 AND home_id = $2`,
        [staffId, homeId]
      );

      if (!rows.length || !rows[0][col]) {
        res.status(403).json({
          success: false,
          error: 'You do not have permission for this action'
        } as ApiResponse);
        return;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
