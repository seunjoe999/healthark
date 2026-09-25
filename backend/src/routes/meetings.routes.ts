import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import jwt from 'jsonwebtoken';
import { authenticate, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { ApiResponse } from '../types';
import { assertResidentAccess } from '../utils/residentAccess';
import { ukDateStr } from '../utils/ukTime';

// Shared "Meetings" record type — used for Resident Meeting (su_id set),
// Staff Meeting (staff_id set) and Management Meeting (home-wide, neither
// set). Same template/fields for all three, distinguished by meeting_type.

const router = Router();

const MANAGER_ROLES = ['home_manager', 'group_admin', 'deputy_manager', 'admin', 'director', 'registered_manager', 'service_manager'] as const;

router.use(authenticate);

function fromToken(req: Request, field: string): string {
  const token = req.headers.authorization?.substring(7);
  if (token) { const d = jwt.decode(token) as any; return (req.staff as any)?.[field] || d?.[field] || ''; }
  return (req.staff as any)?.[field] || '';
}

function nd(v: any): string | null { return v && String(v).trim() ? String(v).trim() : null; }

// ── Resident Meeting ─────────────────────────────────────────────
router.get('/su/:suId', param('suId').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await assertResidentAccess(req, req.params.suId);
      const rows = await query(
        `SELECT m.*, s.first_name || ' ' || s.last_name as created_by_name
         FROM meetings m LEFT JOIN staff s ON s.id = m.created_by
         WHERE m.meeting_type = 'resident' AND m.su_id = $1
         ORDER BY m.meeting_date DESC, m.created_at DESC`,
        [req.params.suId]
      );
      res.json({ success: true, data: rows } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.post('/su', [body('suId').isUUID(), body('conductedBy').notEmpty()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await assertResidentAccess(req, req.body.suId);
      const createdBy = fromToken(req, 'staffId');
      let homeId = fromToken(req, 'homeId');
      const { suId, conductedBy, meetingDate, attendees, serviceLocation, notes, actionPlan } = req.body;
      if (!homeId) {
        const suRows = await query<any>('SELECT home_id FROM service_users WHERE id=$1', [suId]);
        homeId = suRows[0]?.home_id || '';
      }
      const rows = await query(
        `INSERT INTO meetings (meeting_type, su_id, home_id, created_by, conducted_by, meeting_date,
          attendees, service_location, notes, action_plan)
         VALUES ('resident',$1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [suId, homeId, createdBy, conductedBy, meetingDate || ukDateStr(),
         attendees || null, serviceLocation || null, notes || null, actionPlan || null]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// ── Staff Meeting ────────────────────────────────────────────────
router.get('/staff/:staffId', param('staffId').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const role = fromToken(req, 'role');
      const myStaffId = fromToken(req, 'staffId');
      const isPrivileged = (MANAGER_ROLES as readonly string[]).includes(role);
      if (!isPrivileged && req.params.staffId !== myStaffId) {
        return res.status(403).json({ success: false, error: 'Forbidden' } as ApiResponse);
      }
      const rows = await query(
        `SELECT m.*, s.first_name || ' ' || s.last_name as created_by_name
         FROM meetings m LEFT JOIN staff s ON s.id = m.created_by
         WHERE m.meeting_type = 'staff' AND m.staff_id = $1
         ORDER BY m.meeting_date DESC, m.created_at DESC`,
        [req.params.staffId]
      );
      res.json({ success: true, data: rows } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.post('/staff', [body('staffId').isUUID(), body('conductedBy').notEmpty()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const createdBy = fromToken(req, 'staffId');
      let homeId = fromToken(req, 'homeId');
      const { staffId, conductedBy, meetingDate, attendees, serviceLocation, notes, actionPlan } = req.body;
      if (!homeId) {
        const staffRows = await query<any>('SELECT home_id FROM staff WHERE id=$1', [staffId]);
        homeId = staffRows[0]?.home_id || '';
      }
      const rows = await query(
        `INSERT INTO meetings (meeting_type, staff_id, home_id, created_by, conducted_by, meeting_date,
          attendees, service_location, notes, action_plan)
         VALUES ('staff',$1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [staffId, homeId, createdBy, conductedBy, meetingDate || ukDateStr(),
         attendees || null, serviceLocation || null, notes || null, actionPlan || null]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// ── Team Meeting ─────────────────────────────────────────────────
// Visible to any member of the team (not manager-only like Management
// Meeting) — staff explicitly asked to be able to see their own team's
// meeting minutes, not just have them recorded about them.
router.get('/team/:teamId', param('teamId').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const role = fromToken(req, 'role');
      const myStaffId = fromToken(req, 'staffId');
      const isPrivileged = (MANAGER_ROLES as readonly string[]).includes(role);
      if (!isPrivileged) {
        const memberRows = await query<any>('SELECT id FROM staff WHERE id = $1 AND team_id = $2', [myStaffId, req.params.teamId]);
        if (!memberRows.length) return res.status(403).json({ success: false, error: 'Forbidden' } as ApiResponse);
      }
      const rows = await query(
        `SELECT m.*, s.first_name || ' ' || s.last_name as created_by_name
         FROM meetings m LEFT JOIN staff s ON s.id = m.created_by
         WHERE m.meeting_type = 'team' AND m.team_id = $1
         ORDER BY m.meeting_date DESC, m.created_at DESC`,
        [req.params.teamId]
      );
      res.json({ success: true, data: rows } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.post('/team', requireRole(...MANAGER_ROLES), [body('teamId').isUUID(), body('conductedBy').notEmpty()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const createdBy = fromToken(req, 'staffId');
      let homeId = fromToken(req, 'homeId');
      const { teamId, conductedBy, meetingDate, attendees, serviceLocation, notes, actionPlan } = req.body;
      if (!homeId) {
        const teamRows = await query<any>('SELECT home_id FROM teams WHERE id=$1', [teamId]);
        homeId = teamRows[0]?.home_id || '';
      }
      const rows = await query(
        `INSERT INTO meetings (meeting_type, team_id, home_id, created_by, conducted_by, meeting_date,
          attendees, service_location, notes, action_plan)
         VALUES ('team',$1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [teamId, homeId, createdBy, conductedBy, meetingDate || ukDateStr(),
         attendees || null, serviceLocation || null, notes || null, actionPlan || null]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// ── Management Meeting (home-wide, not tied to a resident/staff record) ──
// Management-only — this covers whatever managers discuss home-wide
// (HR, safeguarding, disciplinary, etc.), so care staff must not be able
// to read or write it even by hitting the API directly.
router.get('/management', requireRole(...MANAGER_ROLES), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    if (!homeId) { res.json({ success: true, data: [] } as ApiResponse); return; }
    const rows = await query(
      `SELECT m.*, s.first_name || ' ' || s.last_name as created_by_name
       FROM meetings m LEFT JOIN staff s ON s.id = m.created_by
       WHERE m.meeting_type = 'management' AND m.home_id = $1
       ORDER BY m.meeting_date DESC, m.created_at DESC`,
      [homeId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

router.post('/management', requireRole(...MANAGER_ROLES), [body('homeId').isUUID(), body('conductedBy').notEmpty()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const createdBy = fromToken(req, 'staffId');
      const { homeId, conductedBy, meetingDate, attendees, serviceLocation, notes, actionPlan } = req.body;
      const rows = await query(
        `INSERT INTO meetings (meeting_type, home_id, created_by, conducted_by, meeting_date,
          attendees, service_location, notes, action_plan)
         VALUES ('management',$1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [homeId, createdBy, conductedBy, meetingDate || ukDateStr(),
         attendees || null, serviceLocation || null, notes || null, actionPlan || null]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// ── Team Meeting (home-wide whole-staff briefing — distinct from the
// internal-Team-linked 'team' type above, and open to all staff, not just
// managers: "available to both staff and the management") ───────────────
router.get('/team-briefing', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    if (!homeId) { res.json({ success: true, data: [] } as ApiResponse); return; }
    const rows = await query(
      `SELECT m.*, s.first_name || ' ' || s.last_name as created_by_name
       FROM meetings m LEFT JOIN staff s ON s.id = m.created_by
       WHERE m.meeting_type = 'team_briefing' AND m.home_id = $1
       ORDER BY m.meeting_date DESC, m.created_at DESC`,
      [homeId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

router.post('/team-briefing', [body('homeId').isUUID(), body('conductedBy').notEmpty()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const createdBy = fromToken(req, 'staffId');
      const { homeId, conductedBy, meetingDate, attendees, serviceLocation, notes, actionPlan } = req.body;
      const rows = await query(
        `INSERT INTO meetings (meeting_type, home_id, created_by, conducted_by, meeting_date,
          attendees, service_location, notes, action_plan)
         VALUES ('team_briefing',$1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [homeId, createdBy, conductedBy, meetingDate || ukDateStr(),
         attendees || null, serviceLocation || null, notes || null, actionPlan || null]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/meetings/:id/send-minutes — notify the ticked staff with this
// meeting's minutes, in-app only (matches how the rest of the app notifies
// staff of things — no email/SMS delivery here).
router.post('/:id/send-minutes', param('id').isUUID(), body('staffIds').isArray({ min: 1 }), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const meetingRows = await query<any>('SELECT * FROM meetings WHERE id = $1', [req.params.id]);
      const meeting = meetingRows[0];
      if (!meeting) { res.status(404).json({ success: false, error: 'Meeting not found' } as ApiResponse); return; }
      const staffIds: string[] = (req.body.staffIds || []).filter(Boolean);
      const dateStr = meeting.meeting_date ? new Date(meeting.meeting_date).toLocaleDateString('en-GB') : '';
      const title = `Team Meeting minutes: ${dateStr}`;
      const body = meeting.notes || meeting.action_plan || 'Minutes have been recorded for this team meeting.';
      for (const staffId of staffIds) {
        await query(
          `INSERT INTO notifications (recipient_id, home_id, title, body, type, link)
           VALUES ($1,$2,$3,$4,'meeting','/team-meeting')`,
          [staffId, meeting.home_id, title, body]
        ).catch(() => {});
      }
      res.json({ success: true, data: { sent: staffIds.length } } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// ── Sign-off (shared across all meeting types) ────────────────────
router.put('/:id/sign-off', param('id').isUUID(), body('signedOffBy').notEmpty(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { signedOffBy, signedOffDate } = req.body;
      const rows = await query(
        `UPDATE meetings SET signed_off = TRUE, signed_off_by = $1, signed_off_date = $2
         WHERE id = $3 RETURNING *`,
        [signedOffBy, nd(signedOffDate) || ukDateStr(), req.params.id]
      );
      if (!rows.length) { res.status(404).json({ success: false, error: 'Meeting not found' } as ApiResponse); return; }
      res.json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
