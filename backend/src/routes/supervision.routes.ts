import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';

const router = Router();

function fromToken(req: Request, field: string): string {
  const token = req.headers.authorization?.substring(7);
  if (token) { const d = jwt.decode(token) as any; return (req.staff as any)?.[field] || d?.[field] || ''; }
  return (req.staff as any)?.[field] || '';
}

router.use(authenticate);

// ===== SUPERVISIONS =====

// GET /api/supervision/?homeId=xxx&staffId=xxx
router.get('/', validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { homeId, staffId } = req.query;
      let sql = 'SELECT sup.*, s.first_name || \' \' || s.last_name as staff_name, svr.first_name || \' \' || svr.last_name as supervisor_name FROM supervisions sup JOIN staff s ON s.id = sup.staff_id JOIN staff svr ON svr.id = sup.supervisor_id';
      const params: any[] = [];
      if (homeId) { sql += ` WHERE sup.home_id = $${params.length + 1}`; params.push(homeId); }
      if (staffId) { sql += params.length ? ` AND sup.staff_id = $${params.length + 1}` : ` WHERE sup.staff_id = $${params.length + 1}`; params.push(staffId); }
      sql += ' ORDER BY sup.supervision_date DESC';
      const rows = await query(sql, params);
      res.json({ success: true, data: rows } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// GET /api/supervision/:id
router.get('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query(
        `SELECT sup.*, s.first_name || ' ' || s.last_name as staff_name, svr.first_name || ' ' || svr.last_name as supervisor_name 
         FROM supervisions sup JOIN staff s ON s.id = sup.staff_id JOIN staff svr ON svr.id = sup.supervisor_id WHERE sup.id = $1`,
        [req.params.id]
      );
      if (!rows.length) { return next(new AppError('Supervision record not found', 404)); }
      res.json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/supervision — create supervision record
router.post('/', [
  body('homeId').isUUID(),
  body('staffId').isUUID(),
  body('supervisorId').isUUID(),
  body('supervisionDate').isISO8601(),
  body('supervisionType').notEmpty(),
], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { homeId, staffId, supervisorId, supervisionDate, supervisionType, summary, strengths, areasForImprovement, actionPoints, nextDate } = req.body;
      const rows = await query(
        `INSERT INTO supervisions (home_id, staff_id, supervisor_id, supervision_date, supervision_type, summary, strengths, areas_for_improvement, action_points, next_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [homeId, staffId, supervisorId, supervisionDate, supervisionType, summary || null, strengths || null, areasForImprovement || null, actionPoints || null, nextDate || null]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// PATCH /api/supervision/:id
router.patch('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { summary, strengths, areasForImprovement, actionPoints, nextDate } = req.body;
      const updates: string[] = [];
      const vals: any[] = [];
      if (summary !== undefined) { updates.push(`summary=$${updates.length + 1}`); vals.push(summary); }
      if (strengths !== undefined) { updates.push(`strengths=$${updates.length + 1}`); vals.push(strengths); }
      if (areasForImprovement !== undefined) { updates.push(`areas_for_improvement=$${updates.length + 1}`); vals.push(areasForImprovement); }
      if (actionPoints !== undefined) { updates.push(`action_points=$${updates.length + 1}`); vals.push(actionPoints); }
      if (nextDate !== undefined) { updates.push(`next_date=$${updates.length + 1}`); vals.push(nextDate); }
      if (!updates.length) { return res.status(400).json({ success: false, error: 'No fields to update' }); }
      vals.push(req.params.id);
      const rows = await query(`UPDATE supervisions SET ${updates.join(', ')}, updated_at=NOW() WHERE id=$${vals.length} RETURNING *`, vals);
      res.json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// DELETE /api/supervision/:id
router.delete('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await query('DELETE FROM supervisions WHERE id = $1', [req.params.id]);
      res.json({ success: true, message: 'Supervision record deleted' } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// ===== APPRAISALS =====

// GET /api/appraisal/?homeId=xxx&staffId=xxx
router.get('/appraisal', validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { homeId, staffId } = req.query;
      let sql = 'SELECT apr.*, s.first_name || \' \' || s.last_name as staff_name, apr_s.first_name || \' \' || apr_s.last_name as appraiser_name FROM appraisals apr JOIN staff s ON s.id = apr.staff_id JOIN staff apr_s ON apr_s.id = apr.appraiser_id';
      const params: any[] = [];
      if (homeId) { sql += ` WHERE apr.home_id = $${params.length + 1}`; params.push(homeId); }
      if (staffId) { sql += params.length ? ` AND apr.staff_id = $${params.length + 1}` : ` WHERE apr.staff_id = $${params.length + 1}`; params.push(staffId); }
      sql += ' ORDER BY apr.appraisal_date DESC';
      const rows = await query(sql, params);
      res.json({ success: true, data: rows } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// GET /api/appraisal/:id
router.get('/appraisal/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query(
        `SELECT apr.*, s.first_name || ' ' || s.last_name as staff_name, apr_s.first_name || ' ' || apr_s.last_name as appraiser_name 
         FROM appraisals apr JOIN staff s ON s.id = apr.staff_id JOIN staff apr_s ON apr_s.id = apr.appraiser_id WHERE apr.id = $1`,
        [req.params.id]
      );
      if (!rows.length) { return next(new AppError('Appraisal record not found', 404)); }
      res.json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/appraisal — create appraisal
router.post('/appraisal', [
  body('homeId').isUUID(),
  body('staffId').isUUID(),
  body('appraiserId').isUUID(),
  body('appraisalDate').isISO8601(),
], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { homeId, staffId, appraiserId, appraisalDate, rating, performanceSummary, comments, goals, nextReviewDate } = req.body;
      const rows = await query(
        `INSERT INTO appraisals (home_id, staff_id, appraiser_id, appraisal_date, rating, performance_summary, comments, goals, next_review_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [homeId, staffId, appraiserId, appraisalDate, rating || null, performanceSummary || null, comments || null, goals || null, nextReviewDate || null]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// PATCH /api/appraisal/:id
router.patch('/appraisal/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { rating, performanceSummary, comments, goals, nextReviewDate } = req.body;
      const updates: string[] = [];
      const vals: any[] = [];
      if (rating !== undefined) { updates.push(`rating=$${updates.length + 1}`); vals.push(rating); }
      if (performanceSummary !== undefined) { updates.push(`performance_summary=$${updates.length + 1}`); vals.push(performanceSummary); }
      if (comments !== undefined) { updates.push(`comments=$${updates.length + 1}`); vals.push(comments); }
      if (goals !== undefined) { updates.push(`goals=$${updates.length + 1}`); vals.push(goals); }
      if (nextReviewDate !== undefined) { updates.push(`next_review_date=$${updates.length + 1}`); vals.push(nextReviewDate || null); }
      if (!updates.length) { return res.status(400).json({ success: false, error: 'No fields to update' }); }
      vals.push(req.params.id);
      const rows = await query(`UPDATE appraisals SET ${updates.join(', ')}, updated_at=NOW() WHERE id=$${vals.length} RETURNING *`, vals);
      res.json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// DELETE /api/appraisal/:id
router.delete('/appraisal/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await query('DELETE FROM appraisals WHERE id = $1', [req.params.id]);
      res.json({ success: true, message: 'Appraisal record deleted' } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
