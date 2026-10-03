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
// Was returning every team_briefing meeting in the home to anyone who could
// reach this page, regardless of which team/service it was actually for —
// confirmed live (owner logged in as a staff member not on the relevant team
// and could read full meeting minutes for a different service). This "team
// briefing" type had no team linkage at all, unlike the proper per-team
// `meeting_type = 'team'` records (already correctly scoped via /team/:teamId
// below). Reusing the same team_id column: a briefing created with a team
// selected is now only visible to that team (plus management); existing
// legacy rows and any briefing created with no team selected have team_id
// NULL and stay visible to everyone, same as a general/all-staff notice.
router.get('/team-briefing', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    if (!homeId) { res.json({ success: true, data: [] } as ApiResponse); return; }
    const role = fromToken(req, 'role');
    const staffId = fromToken(req, 'staffId');
    const isPrivileged = (MANAGER_ROLES as readonly string[]).includes(role);
    let myTeamId: string | null = null;
    if (!isPrivileged && staffId) {
      const staffRows = await query<any>('SELECT team_id FROM staff WHERE id = $1', [staffId]);
      myTeamId = staffRows[0]?.team_id || null;
    }
    // Reiterated as a critical privacy issue a second time (owner found a care
    // staff member reading another service's minutes) — the "no team selected
    // = visible to everyone" fallback below was exactly that loophole: minutes
    // left without a team attached (whether by oversight or intentionally) broadcast
    // to all staff in the home. Non-privileged staff now only ever see a meeting
    // whose team_id exactly matches their own; a meeting with no team is
    // management-only until explicitly assigned to one (see the matching copy
    // change in MeetingsSection.tsx's team picker).
    const rows = await query(
      `SELECT m.*, s.first_name || ' ' || s.last_name as created_by_name, t.name as team_name
       FROM meetings m LEFT JOIN staff s ON s.id = m.created_by
       LEFT JOIN teams t ON t.id = m.team_id
       WHERE m.meeting_type = 'team_briefing' AND m.home_id = $1
         AND ($2 OR (m.team_id IS NOT NULL AND m.team_id = $3::uuid))
       ORDER BY m.meeting_date DESC, m.created_at DESC`,
      [homeId, isPrivileged, myTeamId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

router.post('/team-briefing', [body('homeId').isUUID(), body('conductedBy').notEmpty()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const createdBy = fromToken(req, 'staffId');
      const { homeId, conductedBy, meetingDate, attendees, serviceLocation, notes, actionPlan, teamId } = req.body;
      const rows = await query(
        `INSERT INTO meetings (meeting_type, home_id, created_by, conducted_by, meeting_date,
          attendees, service_location, notes, action_plan, team_id)
         VALUES ('team_briefing',$1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [homeId, createdBy, conductedBy, meetingDate || ukDateStr(),
         attendees || null, serviceLocation || null, notes || null, actionPlan || null, teamId || null]
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

// ── Edit / Delete (shared across all meeting types) ───────────────
// Same authors as the rest of this feature: management-tier roles, or
// whoever originally created the record — a senior carer who logged a
// resident meeting should be able to fix a typo in it without needing
// a manager to do it for them.
async function canEditMeeting(req: Request, id: string): Promise<boolean> {
  const role = fromToken(req, 'role');
  if ((MANAGER_ROLES as readonly string[]).includes(role)) return true;
  const staffId = fromToken(req, 'staffId');
  const rows = await query<any>('SELECT created_by FROM meetings WHERE id = $1', [id]);
  return !!rows.length && rows[0].created_by === staffId;
}

router.put('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!(await canEditMeeting(req, req.params.id))) {
        return res.status(403).json({ success: false, error: 'You can only edit a meeting you created' } as ApiResponse);
      }
      const { conductedBy, meetingDate, attendees, serviceLocation, notes, actionPlan, teamId } = req.body;
      const rows = await query(
        `UPDATE meetings SET
           conducted_by = COALESCE($1, conducted_by),
           meeting_date = COALESCE($2, meeting_date),
           attendees = $3, service_location = $4, notes = $5, action_plan = $6,
           team_id = CASE WHEN $8 THEN $9::uuid ELSE team_id END
         WHERE id = $7 RETURNING *`,
        [nd(conductedBy), nd(meetingDate), nd(attendees), nd(serviceLocation), nd(notes), nd(actionPlan), req.params.id,
         teamId !== undefined, teamId || null]
      );
      if (!rows.length) { res.status(404).json({ success: false, error: 'Meeting not found' } as ApiResponse); return; }
      res.json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.delete('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!(await canEditMeeting(req, req.params.id))) {
        return res.status(403).json({ success: false, error: 'You can only delete a meeting you created' } as ApiResponse);
      }
      const rows = await query('DELETE FROM meetings WHERE id = $1 RETURNING id', [req.params.id]);
      if (!rows.length) { res.status(404).json({ success: false, error: 'Meeting not found' } as ApiResponse); return; }
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
