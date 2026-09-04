import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import jwt from 'jsonwebtoken';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { ApiResponse } from '../types';
import { assertResidentAccess } from '../utils/residentAccess';

// Shared "Meetings" record type — used for Resident Meeting (su_id set),
// Staff Meeting (staff_id set) and Management Meeting (home-wide, neither
// set). Same template/fields for all three, distinguished by meeting_type.

const router = Router();

const MANAGER_ROLES = ['home_manager', 'group_admin', 'deputy_manager', 'admin', 'director', 'registered_manager', 'service_manager'];

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
        [suId, homeId, createdBy, conductedBy, meetingDate || new Date().toISOString().split('T')[0],
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
      const isPrivileged = MANAGER_ROLES.includes(role);
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
        [staffId, homeId, createdBy, conductedBy, meetingDate || new Date().toISOString().split('T')[0],
         attendees || null, serviceLocation || null, notes || null, actionPlan || null]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// ── Management Meeting (home-wide, not tied to a resident/staff record) ──
router.get('/management', async (req: Request, res: Response, next: NextFunction) => {
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

router.post('/management', [body('homeId').isUUID(), body('conductedBy').notEmpty()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const createdBy = fromToken(req, 'staffId');
      const { homeId, conductedBy, meetingDate, attendees, serviceLocation, notes, actionPlan } = req.body;
      const rows = await query(
        `INSERT INTO meetings (meeting_type, home_id, created_by, conducted_by, meeting_date,
          attendees, service_location, notes, action_plan)
         VALUES ('management',$1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [homeId, createdBy, conductedBy, meetingDate || new Date().toISOString().split('T')[0],
         attendees || null, serviceLocation || null, notes || null, actionPlan || null]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
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
        [signedOffBy, nd(signedOffDate) || new Date().toISOString().split('T')[0], req.params.id]
      );
      if (!rows.length) { res.status(404).json({ success: false, error: 'Meeting not found' } as ApiResponse); return; }
      res.json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
