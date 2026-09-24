import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';
import { assertResidentAccess, getAssignedSuIds, getRole, getStaffId, RESTRICTED_ROLES } from '../utils/residentAccess';

const router = Router();
router.use(authenticate);

function tok(req: Request, field: string): string {
  const t = req.headers.authorization?.substring(7);
  if (t) { const d = jwt.decode(t) as any; return (req.staff as any)?.[field] || d?.[field] || ''; }
  return (req.staff as any)?.[field] || '';
}

// GET /api/service-feedback?suId= — list, most recent first
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = tok(req, 'homeId');
    const { suId } = req.query as Record<string, string>;
    if (suId) await assertResidentAccess(req, suId);
    let sql = `
      SELECT f.*, su.first_name || ' ' || su.last_name AS su_name,
             s.first_name || ' ' || s.last_name AS completed_by_name
      FROM service_user_feedback f
      JOIN service_users su ON su.id = f.su_id
      LEFT JOIN staff s ON s.id = f.completed_by
      WHERE f.home_id = $1`;
    const params: unknown[] = [homeId];
    if (suId) { sql += ` AND f.su_id = $2`; params.push(suId); }
    else if (RESTRICTED_ROLES.includes(getRole(req))) {
      const ids = await getAssignedSuIds(getStaffId(req));
      if (!ids.length) return res.json({ success: true, data: [] } as ApiResponse);
      params.push(ids); sql += ` AND f.su_id = ANY($${params.length})`;
    }
    sql += ' ORDER BY f.completed_at DESC LIMIT 200';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/service-feedback/:id
router.get('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query<any>(
        `SELECT f.*, su.first_name || ' ' || su.last_name AS su_name,
                s.first_name || ' ' || s.last_name AS completed_by_name
         FROM service_user_feedback f
         JOIN service_users su ON su.id = f.su_id
         LEFT JOIN staff s ON s.id = f.completed_by
         WHERE f.id = $1`,
        [req.params.id]
      );
      if (!rows.length) throw new AppError('Feedback not found', 404);
      await assertResidentAccess(req, rows[0].su_id);
      res.json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/service-feedback
router.post('/', [body('suId').isUUID(), body('answers').isObject()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = tok(req, 'homeId');
      const staffId = tok(req, 'staffId');
      const { suId, project, location, answers } = req.body;
      await assertResidentAccess(req, suId);
      const rows = await query(
        `INSERT INTO service_user_feedback (home_id, su_id, completed_by, project, location, answers)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [homeId, suId, staffId, project || null, location || null, JSON.stringify(answers)]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
