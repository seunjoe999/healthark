import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';

const router = Router();

function nd(v: any): string | null { return v && String(v).trim() ? String(v).trim() : null; }

router.use(authenticate);

function fromToken(req: Request, field: string): string {
  const token = req.headers.authorization?.substring(7);
  if (token) { const d = jwt.decode(token) as any; return (req.staff as any)?.[field] || d?.[field] || ''; }
  return (req.staff as any)?.[field] || '';
}

// GET /api/care-plans?suId=xxx or ?homeId=xxx
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { suId, homeId } = req.query as Record<string, string>;
    const targetHomeId = homeId || fromToken(req, 'homeId');

    let sql = `SELECT cp.*,
                      su.first_name || ' ' || su.last_name as su_name,
                      s.first_name || ' ' || s.last_name as created_by_name
               FROM care_plans cp
               JOIN service_users su ON su.id = cp.su_id
               LEFT JOIN staff s ON s.id = cp.created_by
               WHERE cp.is_active = true`;
    const params: unknown[] = [];
    let idx = 1;

    if (suId) { sql += ` AND cp.su_id = $${idx++}`; params.push(suId); }
    else { sql += ` AND cp.home_id = $${idx++}`; params.push(targetHomeId); }
    sql += ' ORDER BY cp.plan_type, cp.created_at DESC';

    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/care-plans/:id
router.get('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query(
        `SELECT cp.*, su.first_name || ' ' || su.last_name as su_name,
                s.first_name || ' ' || s.last_name as created_by_name
         FROM care_plans cp
         JOIN service_users su ON su.id = cp.su_id
         LEFT JOIN staff s ON s.id = cp.created_by
         WHERE cp.id = $1`,
        [req.params.id]
      );
      if (!rows.length) throw new AppError('Care plan not found', 404);

      const updates = await query(
        `SELECT cpu.*, s.first_name || ' ' || s.last_name as updated_by_name
         FROM care_plan_updates cpu JOIN staff s ON s.id = cpu.updated_by
         WHERE cpu.care_plan_id = $1 ORDER BY cpu.created_at DESC`,
        [req.params.id]
      );

      res.json({ success: true, data: { ...rows[0] as object, updates } } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/care-plans
router.post('/',
  [body('suId').isUUID(), body('planType').notEmpty(), body('homeId').optional().isUUID()],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      const homeId = req.body.homeId || fromToken(req, 'homeId');
      const { suId, planType, customName, aimsOutcomes, whatICanDo, howToSupport,
              reviewFrequency } = req.body;

      // Calculate next review date
      const freqDays: Record<string, number> = {
        weekly: 7, fortnightly: 14, monthly: 30, eight_weekly: 56, yearly: 365
      };
      const days = freqDays[reviewFrequency || 'monthly'] || 30;
      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + days);

      const rows = await query(
        `INSERT INTO care_plans (su_id, home_id, plan_type, custom_name, aims_outcomes,
          what_i_can_do, how_to_support, review_frequency, next_review_date, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [suId, homeId, planType, customName || null, aimsOutcomes || null,
         whatICanDo || null, howToSupport || null,
         reviewFrequency || 'monthly', nextReview.toISOString().split('T')[0], staffId]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err: any) { console.error('Care plan CREATE error:', err?.message, err?.detail); next(err); }
  }
);

// PUT /api/care-plans/:id
router.put('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      const { aimsOutcomes, whatICanDo, howToSupport, reviewFrequency, updateNotes } = req.body;

      // Calculate next review
      const freqDays: Record<string, number> = {
        weekly: 7, fortnightly: 14, monthly: 30, eight_weekly: 56, yearly: 365
      };
      const freq = reviewFrequency || 'monthly';
      const days = freqDays[freq] || 30;
      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + days);

      const rows = await query(
        `UPDATE care_plans SET
          aims_outcomes = COALESCE($1, aims_outcomes),
          what_i_can_do = COALESCE($2, what_i_can_do),
          how_to_support = COALESCE($3, how_to_support),
          review_frequency = $4,
          last_review_date = CURRENT_DATE,
          next_review_date = $5,
          updated_at = NOW()
         WHERE id = $6 RETURNING *`,
        [aimsOutcomes, whatICanDo, howToSupport,
         freq, nextReview.toISOString().split('T')[0], req.params.id]
      );
      if (!rows.length) throw new AppError('Care plan not found', 404);

      // Log the update
      if (updateNotes) {
        await query(
          'INSERT INTO care_plan_updates (care_plan_id, update_notes, updated_by) VALUES ($1,$2,$3)',
          [req.params.id, updateNotes, staffId]
        );
      }

      res.json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// DELETE /api/care-plans/:id (soft delete)
router.delete('/:id', requireRole('home_manager', 'group_admin'),
  param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await query('UPDATE care_plans SET is_active = false WHERE id = $1', [req.params.id]);
      res.json({ success: true, message: 'Care plan archived' } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
