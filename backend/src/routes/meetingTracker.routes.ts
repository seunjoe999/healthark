import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';

const router = Router();
router.use(authenticate);

function fromToken(req: Request, field: string): string {
  const token = req.headers.authorization?.substring(7);
  if (token) { const d = jwt.decode(token) as any; return (req.staff as any)?.[field] || d?.[field] || ''; }
  return (req.staff as any)?.[field] || '';
}

const MANAGE: any[] = ['home_manager', 'group_admin', 'deputy_manager', 'admin', 'recruitment_admin', 'director', 'registered_manager', 'service_manager', 'super_admin'];

router.get('/', requireRole(...MANAGE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
      const { from, to, meetingType, status, search } = req.query as Record<string, string>;

      const params: unknown[] = [homeId];
      let sql = `SELECT m.*, s.first_name || ' ' || s.last_name AS created_by_name
                 FROM meeting_tracker m
                 LEFT JOIN staff s ON s.id = m.created_by
                 WHERE m.home_id = $1`;

      if (from) {
        params.push(from);
        sql += ` AND m.meeting_date >= $${params.length}::date`;
      }
      if (to) {
        params.push(to);
        sql += ` AND m.meeting_date <= $${params.length}::date`;
      }
      if (meetingType && meetingType !== 'all') {
        params.push(meetingType);
        sql += ` AND m.meeting_type = $${params.length}`;
      }
      if (status && status !== 'all') {
        params.push(status);
        sql += ` AND m.status = $${params.length}`;
      }
      if (search && search.trim()) {
        params.push(`%${search.trim().toLowerCase()}%`);
        const p = `$${params.length}`;
        sql += ` AND (LOWER(COALESCE(m.notes, '')) LIKE ${p}
                   OR LOWER(COALESCE(m.follow_up, '')) LIKE ${p}
                   OR LOWER(COALESCE(m.action_plan, '')) LIKE ${p}
                   OR LOWER(COALESCE(m.minutes_taker, '')) LIKE ${p}
                   OR LOWER(COALESCE(m.meeting_type, '')) LIKE ${p})`;
      }

      sql += ' ORDER BY m.meeting_date DESC, m.created_at DESC LIMIT 500';
      const rows = await query(sql, params);
      res.json({ success: true, data: rows } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.post('/', requireRole(...MANAGE),
  [body('meetingDate').isDate()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = req.body.homeId || fromToken(req, 'homeId');
      const createdBy = fromToken(req, 'staffId');
      const { meetingDate, meetingType, minutesTaker, followUp, actionPlan, status, notes } = req.body;
      const rows = await query(
        `INSERT INTO meeting_tracker (home_id, meeting_date, meeting_type, minutes_taker, follow_up, action_plan, status, notes, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [homeId, meetingDate, meetingType || 'other', minutesTaker || null, followUp || null, actionPlan || null, status || 'open', notes || null, createdBy]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.patch('/:id', requireRole(...MANAGE), param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const map: Record<string, string> = {
        meetingDate: 'meeting_date', meetingType: 'meeting_type', minutesTaker: 'minutes_taker',
        followUp: 'follow_up', actionPlan: 'action_plan', status: 'status', notes: 'notes',
      };
      const sets: string[] = []; const vals: unknown[] = [];
      for (const [k, col] of Object.entries(map)) {
        if (req.body[k] !== undefined) { vals.push(req.body[k]); sets.push(`${col} = $${vals.length}`); }
      }
      if (!sets.length) throw new AppError('Nothing to update', 400);
      vals.push(req.params.id);
      const rows = await query(`UPDATE meeting_tracker SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING *`, vals);
      res.json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

const DELETE_ROLES: any[] = ['home_manager', 'group_admin', 'admin', 'recruitment_admin', 'director', 'registered_manager', 'service_manager', 'super_admin'];

router.delete('/:id', requireRole(...DELETE_ROLES), param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await query('DELETE FROM meeting_tracker WHERE id = $1', [req.params.id]);
      res.json({ success: true, message: 'Meeting deleted' } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
