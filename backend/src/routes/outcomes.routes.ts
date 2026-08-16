import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';
import { assertResidentAccess, getAssignedSuIds } from '../utils/residentAccess';

const PRIVILEGED_ROLES = ['home_manager', 'group_admin', 'deputy_manager', 'admin'];

const router = Router();
router.use(authenticate);

function fromToken(req: Request, field: string): string {
  const token = req.headers.authorization?.substring(7);
  if (token) { const d = jwt.decode(token) as any; return (req.staff as any)?.[field] || d?.[field] || ''; }
  return (req.staff as any)?.[field] || '';
}

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const suId = req.query.suId as string;
    if (suId) await assertResidentAccess(req, suId);
    const role = fromToken(req, 'role');
    const myStaffId = fromToken(req, 'staffId');
    const isPrivileged = PRIVILEGED_ROLES.includes(role);
    let sql = `
      SELECT o.*,
             su.first_name || ' ' || su.last_name AS su_name,
             su.photo_url AS su_photo,
             s.first_name || ' ' || s.last_name AS created_by_name,
             cp.plan_type
      FROM care_outcomes o
      JOIN service_users su ON su.id = o.su_id
      LEFT JOIN staff s ON s.id = o.created_by
      LEFT JOIN care_plans cp ON cp.id = o.care_plan_id
      WHERE o.home_id = $1`;
    const params: any[] = [homeId];
    if (suId) { sql += ` AND o.su_id = $${params.length + 1}::uuid`; params.push(suId); }
    if (!isPrivileged) {
      const assignedSuIds = await getAssignedSuIds(myStaffId);
      if (assignedSuIds.length === 0) {
        res.json({ success: true, data: [] } as ApiResponse);
        return;
      }
      params.push(assignedSuIds);
      sql += ` AND o.su_id = ANY($${params.length})`;
    }
    sql += ' ORDER BY o.target_date ASC NULLS LAST, o.created_at DESC';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

router.post('/',
  [body('suId').isUUID(), body('goal').notEmpty()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      const homeId = req.body.homeId || fromToken(req, 'homeId');
      const { suId, carePlanId, goal, description, targetDate, reviewDate, status } = req.body;
      const rows = await query(`
        INSERT INTO care_outcomes (su_id, home_id, care_plan_id, goal, description, target_date, review_date, status, created_by, updated_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9) RETURNING *`,
        [suId, homeId, carePlanId || null, goal, description || null, targetDate || null, reviewDate || null, status || 'ongoing', staffId]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.patch('/:id',
  param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      const homeId = fromToken(req, 'homeId');
      const { goal, description, targetDate, reviewDate, status, progressNotes, achievedDate } = req.body;
      await query(`
        UPDATE care_outcomes SET
          goal = COALESCE($1, goal),
          description = COALESCE($2, description),
          target_date = COALESCE($3, target_date),
          review_date = COALESCE($4, review_date),
          status = COALESCE($5::outcome_status, status),
          progress_notes = COALESCE($6, progress_notes),
          achieved_date = COALESCE($7, achieved_date),
          updated_by = $8,
          updated_at = NOW()
        WHERE id = $9 AND home_id = $10`,
        [goal || null, description || null, targetDate || null, reviewDate || null,
         status || null, progressNotes || null, achievedDate || null, staffId, req.params.id, homeId]
      );
      const updated = await query('SELECT * FROM care_outcomes WHERE id = $1', [req.params.id]);
      res.json({ success: true, data: updated[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.post('/:id/reviews',
  param('id').isUUID(),
  [body('status').notEmpty(), body('notes').notEmpty(), body('reviewDate').isDate()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      const { status, notes, reviewDate } = req.body;
      const rows = await query(`
        INSERT INTO outcome_reviews (outcome_id, reviewed_by, status, notes, review_date)
        VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [req.params.id, staffId, status, notes, reviewDate]
      );
      // Update parent outcome status
      await query(`UPDATE care_outcomes SET status = $1::outcome_status, updated_at = NOW() WHERE id = $2`, [status, req.params.id]);
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.get('/:id/reviews', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query(`
        SELECT r.*, s.first_name || ' ' || s.last_name AS reviewed_by_name
        FROM outcome_reviews r LEFT JOIN staff s ON s.id = r.reviewed_by
        WHERE r.outcome_id = $1 ORDER BY r.review_date DESC`, [req.params.id]);
      res.json({ success: true, data: rows } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.delete('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = fromToken(req, 'homeId');
      await query('DELETE FROM care_outcomes WHERE id = $1 AND home_id = $2', [req.params.id, homeId]);
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
