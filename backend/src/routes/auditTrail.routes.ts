import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { query } from '../config/database';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';

const router = Router();
router.use(authenticate);

function fromToken(req: Request, field: string): string {
  const token = req.headers.authorization?.substring(7);
  if (token) { const d = jwt.decode(token) as any; return (req.staff as any)?.[field] || d?.[field] || ''; }
  return (req.staff as any)?.[field] || '';
}

router.get('/', requireRole('home_manager', 'group_admin', 'auditor'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
      const resourceType = req.query.resourceType as string;
      const resourceId = req.query.resourceId as string;
      const staffId = req.query.staffId as string;
      const from = req.query.from as string;
      const to = req.query.to as string;
      const page = parseInt(req.query.page as string || '1');
      const limit = parseInt(req.query.limit as string || '50');
      const offset = (page - 1) * limit;

      let sql = `SELECT * FROM audit_trail WHERE home_id = $1`;
      const params: any[] = [homeId];

      if (resourceType) { sql += ` AND resource_type = $${params.length + 1}`; params.push(resourceType); }
      if (resourceId) { sql += ` AND resource_id = $${params.length + 1}::uuid`; params.push(resourceId); }
      if (staffId) { sql += ` AND staff_id = $${params.length + 1}::uuid`; params.push(staffId); }
      if (from) { sql += ` AND created_at >= $${params.length + 1}`; params.push(from); }
      if (to) { sql += ` AND created_at <= $${params.length + 1}`; params.push(to + 'T23:59:59Z'); }

      const countSql = sql.replace('SELECT *', 'SELECT COUNT(*)');
      const [{ count }] = await query(countSql, params) as any;

      sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);
      const rows = await query(sql, params);

      res.json({ success: true, data: rows, meta: { total: parseInt(count), page, limit } } as any);
    } catch (err) { next(err); }
  }
);

// Helper used by other routes to log an audit event
export async function logAudit(opts: {
  homeId: string; staffId: string; staffName: string;
  action: string; resourceType: string; resourceId?: string;
  resourceLabel?: string; oldData?: any; newData?: any;
  ipAddress?: string;
}) {
  try {
    await query(`
      INSERT INTO audit_trail (home_id, staff_id, staff_name, action, resource_type, resource_id, resource_label, old_data, new_data, ip_address)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [opts.homeId, opts.staffId, opts.staffName, opts.action, opts.resourceType,
       opts.resourceId || null, opts.resourceLabel || null,
       opts.oldData ? JSON.stringify(opts.oldData) : null,
       opts.newData ? JSON.stringify(opts.newData) : null,
       opts.ipAddress || null]
    );
  } catch (_) { /* audit failure never breaks the main operation */ }
}

export default router;
