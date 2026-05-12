import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth';
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

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const { from, to } = req.query as Record<string, string>;
    let sql = 'SELECT ce.*, s.first_name || \' \' || s.last_name as created_by_name FROM calendar_events ce LEFT JOIN staff s ON s.id = ce.created_by WHERE ce.home_id = $1';
    const params: unknown[] = [homeId];
    let idx = 2;
    if (from) { sql += ` AND ce.event_date >= $${idx++}`; params.push(from); }
    if (to) { sql += ` AND ce.event_date <= $${idx++}`; params.push(to); }
    sql += ' ORDER BY ce.event_date, ce.start_time';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

router.post('/', [body('title').notEmpty(), body('eventDate').isDate()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      const homeId = req.body.homeId || fromToken(req, 'homeId');
      const { title, eventType, eventDate, startTime, endTime, description, location, suId, allStaff } = req.body;
      const rows = await query(
        `INSERT INTO calendar_events (home_id, created_by, title, event_type, event_date, start_time, end_time, description, location, su_id, all_staff)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [homeId, staffId, title, eventType || 'other', eventDate,
         startTime || null, endTime || null, description || null,
         location || null, suId || null, allStaff || false]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.delete('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await query('DELETE FROM calendar_events WHERE id = $1', [req.params.id]);
      res.json({ success: true, message: 'Event deleted' } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
