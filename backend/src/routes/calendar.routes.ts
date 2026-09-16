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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Management plans the calendar (appointments, reviews, inspections, training) —
// care staff view it but don't add to it, same convention used for task creation.
const CALENDAR_MANAGE_ROLES = ['home_manager', 'group_admin', 'deputy_manager', 'admin', 'director', 'registered_manager', 'service_manager'] as const;

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    if (!homeId || !UUID_RE.test(homeId)) { res.json({ success: true, data: [] } as ApiResponse); return; }
    const { from, to, audience } = req.query as Record<string, string>;
    let sql = `SELECT ce.*, s.first_name || ' ' || s.last_name as created_by_name,
      su.first_name || ' ' || su.last_name as su_name,
      a.first_name || ' ' || a.last_name as assigned_staff_name
      FROM calendar_events ce
      LEFT JOIN staff s ON s.id = ce.created_by
      LEFT JOIN service_users su ON su.id = ce.su_id
      LEFT JOIN staff a ON a.id = ce.assigned_staff_id
      WHERE ce.home_id = $1`;
    const params: unknown[] = [homeId];
    let idx = 2;
    if (from) { sql += ` AND ce.event_date >= $${idx++}`; params.push(from); }
    if (to) { sql += ` AND ce.event_date <= $${idx++}`; params.push(to); }
    // Two separate calendars share one table: a resident-linked row (su_id set)
    // is a service-user appointment/review/inspection; a row with no su_id is
    // a staff-only event (training, meetings) and belongs on the staff calendar,
    // never mixed into the resident one.
    if (audience === 'resident') sql += ` AND ce.su_id IS NOT NULL`;
    else if (audience === 'staff') sql += ` AND ce.su_id IS NULL`;
    sql += ' ORDER BY ce.event_date, ce.start_time';
    let rows = await query<any>(sql, params);

    // A staff-only event booked for one specific staff member or one or more
    // teams is private to them (plus management, who plan the calendar and
    // need to see everything on it) — same "visible to" convention as tasks.
    const role = fromToken(req, 'role');
    const staffId = fromToken(req, 'staffId');
    const isPrivileged = (CALENDAR_MANAGE_ROLES as readonly string[]).includes(role);
    if (!isPrivileged) {
      let myTeamId: string | null = null;
      if (staffId) {
        const staffRows = await query<any>('SELECT team_id FROM staff WHERE id = $1', [staffId]);
        myTeamId = staffRows[0]?.team_id || null;
      }
      rows = rows.filter(ev => {
        if (ev.su_id) return true; // resident-linked events aren't staff-scoped
        if (ev.created_by === staffId) return true;
        if (ev.assigned_staff_id) return ev.assigned_staff_id === staffId;
        const hasTeamTarget = !!(ev.visible_team_ids && ev.visible_team_ids.length > 0);
        if (!hasTeamTarget) return true; // general/all-staff event
        return !!(myTeamId && ev.visible_team_ids.includes(myTeamId));
      });
    }
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

router.post('/', [body('title').notEmpty(), body('eventDate').isDate()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      const homeId = req.body.homeId || fromToken(req, 'homeId');
      if (!homeId || !UUID_RE.test(homeId)) throw new AppError('No care home selected for this event', 400);
      const { title, eventType, eventDate, startTime, endTime, description, location, suId, allStaff, assignedStaffId, visibleTeamIds } = req.body;
      // Any staff member can book a resident's own appointment, and any staff
      // member can now also add their own entry to the staff calendar (e.g.
      // their own training booking) — only deleting stays management-only.
      // start_time/end_time are TIMESTAMPTZ, but the client only sends a bare
      // "HH:mm" (from <input type="time">) plus the date separately — combine
      // them into a real timestamp so Postgres doesn't reject the insert.
      // start_time is also NOT NULL, so fall back to 09:00 when no time is given.
      const isTimeOnly = (v: string) => /^\d{2}:\d{2}(:\d{2})?$/.test(v || '');
      const startTs = isTimeOnly(startTime) ? `${eventDate}T${startTime}` : (startTime || `${eventDate}T09:00:00`);
      const endTs = isTimeOnly(endTime) ? `${eventDate}T${endTime}` : (endTime || null);
      const rows = await query(
        `INSERT INTO calendar_events (home_id, created_by, title, event_type, event_date, start_time, end_time, description, location, su_id, all_staff, assigned_staff_id, visible_team_ids)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
        [homeId, staffId, title, eventType || 'other', eventDate,
         startTs, endTs, description || null,
         location || null, suId || null, allStaff || false,
         assignedStaffId || null, (visibleTeamIds && visibleTeamIds.length > 0) ? visibleTeamIds : null]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.delete('/:id', requireRole(...CALENDAR_MANAGE_ROLES), param('id').isUUID(), validateRequest,
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
