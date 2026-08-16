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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    if (!homeId || !UUID_RE.test(homeId)) { res.json({ success: true, data: [] } as ApiResponse); return; }
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
      if (!homeId || !UUID_RE.test(homeId)) throw new AppError('No care home selected for this event', 400);
      const { title, eventType, eventDate, startTime, endTime, description, location, suId, allStaff } = req.body;
      // start_time is NOT NULL in the DB. If the client didn't pass an explicit
      // startTime (e.g. an all-day / date-only event), derive it from eventDate
      // so the insert doesn't violate the not-null constraint.
      const startTs = startTime || (eventDate ? `${eventDate}T09:00:00` : new Date().toISOString());
      const rows = await query(
        `INSERT INTO calendar_events (home_id, created_by, title, event_type, event_date, start_time, end_time, description, location, su_id, all_staff)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [homeId, staffId, title, eventType || 'other', eventDate,
         startTs, endTime || null, description || null,
         location || null, suId || null, allStaff || false]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.delete('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = fromToken(req, 'homeId');
      await query('DELETE FROM calendar_events WHERE id = $1 AND home_id = $2', [req.params.id, homeId]);
      res.json({ success: true, message: 'Event deleted' } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// GET /api/calendar/:id/notes — get meeting notes
router.get('/:id/notes', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query(
        `SELECT mn.*, s.first_name || ' ' || s.last_name as created_by_name
         FROM meeting_notes mn LEFT JOIN staff s ON s.id = mn.created_by
         WHERE mn.event_id = $1 ORDER BY mn.created_at DESC`,
        [req.params.id]
      );
      const signoffs = await query(
        `SELECT ms.*, s.first_name || ' ' || s.last_name as staff_name
         FROM meeting_signoffs ms JOIN staff s ON s.id = ms.staff_id
         WHERE ms.event_id = $1`,
        [req.params.id]
      );
      res.json({ success: true, data: { notes: rows, signoffs } } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/calendar/:id/notes — add/update meeting notes
router.post('/:id/notes', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      const { notes, actionPoints, concerns, attendees, outcome, summary } = req.body;
      const rows = await query(
        `INSERT INTO meeting_notes (event_id, created_by, notes, action_points, concerns, attendees, outcome, summary)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (event_id) DO UPDATE SET
           notes=$3, action_points=$4, concerns=$5, attendees=$6, outcome=$7, summary=$8, updated_at=NOW()
         RETURNING *`,
        [req.params.id, staffId, notes || null, actionPoints || null, concerns || null, attendees || null, outcome || null, summary || null]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/calendar/:id/signoff — staff signs off on meeting notes
router.post('/:id/signoff', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      await query(
        `INSERT INTO meeting_signoffs (event_id, staff_id, signed_at)
         VALUES ($1,$2,NOW()) ON CONFLICT (event_id, staff_id) DO NOTHING`,
        [req.params.id, staffId]
      );
      res.json({ success: true, message: 'Signed off' } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
