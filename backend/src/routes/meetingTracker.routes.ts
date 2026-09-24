import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';

const router = Router();
router.use(authenticate);

const MANAGE_ROLES = ['home_manager', 'group_admin', 'deputy_manager', 'admin', 'director', 'registered_manager', 'service_manager'] as const;

function fromToken(req: Request, field: string): string {
  const token = req.headers.authorization?.substring(7);
  if (token) { const d = jwt.decode(token) as any; return (req.staff as any)?.[field] || d?.[field] || ''; }
  return (req.staff as any)?.[field] || '';
}

// GET /api/meeting-tracker?homeId=
router.get('/', requireRole(...MANAGE_ROLES), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const rows = await query(
      `SELECT m.*, c.first_name || ' ' || c.last_name AS created_by_name
       FROM meeting_tracker m LEFT JOIN staff c ON c.id = m.created_by
       WHERE m.home_id = $1 ORDER BY m.meeting_date DESC, m.created_at DESC LIMIT 300`,
      [homeId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/meeting-tracker
router.post('/', requireRole(...MANAGE_ROLES),
  [body('meetingDate').isDate(), body('meetingType').notEmpty()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = req.body.homeId || fromToken(req, 'homeId');
      const createdBy = fromToken(req, 'staffId');
      const { meetingDate, meetingType, minutesTaker, followUp, actionPlan, status, notes } = req.body;
      const rows = await query(
        `INSERT INTO meeting_tracker (home_id, meeting_date, meeting_type, minutes_taker, follow_up, action_plan, status, notes, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [homeId, meetingDate, meetingType, minutesTaker || null, followUp || null, actionPlan || null, status || 'open', notes || null, createdBy]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// PATCH /api/meeting-tracker/:id — mainly for updating status/follow-up as things progress
router.patch('/:id', requireRole(...MANAGE_ROLES), param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { meetingDate, meetingType, minutesTaker, followUp, actionPlan, status, notes } = req.body;
      const fields: string[] = [];
      const values: unknown[] = [];
      const set = (col: string, val: unknown) => { fields.push(`${col} = $${fields.length + 1}`); values.push(val); };
      if (meetingDate !== undefined) set('meeting_date', meetingDate);
      if (meetingType !== undefined) set('meeting_type', meetingType);
      if (minutesTaker !== undefined) set('minutes_taker', minutesTaker || null);
      if (followUp !== undefined) set('follow_up', followUp || null);
      if (actionPlan !== undefined) set('action_plan', actionPlan || null);
      if (status !== undefined) set('status', status);
      if (notes !== undefined) set('notes', notes || null);
      if (!fields.length) return res.json({ success: true } as ApiResponse);
      values.push(req.params.id);
      const rows = await query(`UPDATE meeting_tracker SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`, values);
      res.json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// DELETE /api/meeting-tracker/:id
router.delete('/:id', requireRole('home_manager', 'group_admin', 'admin'), param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await query('DELETE FROM meeting_tracker WHERE id = $1', [req.params.id]);
      res.json({ success: true, message: 'Entry deleted' } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
