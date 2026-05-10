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

// ── Leave management ──────────────────────────────────────────────
router.get('/leave', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const staffId = fromToken(req, 'staffId');
    const role = fromToken(req, 'role');
    let rows;
    if (role === 'group_admin' || role === 'home_manager') {
      rows = await query(
        `SELECT sl.*, s.first_name || ' ' || s.last_name as staff_name, s.photo_url
         FROM staff_leave sl JOIN staff s ON s.id = sl.staff_id
         WHERE sl.home_id = $1 ORDER BY sl.created_at DESC`,
        [homeId]
      );
    } else {
      rows = await query(
        `SELECT * FROM staff_leave WHERE staff_id = $1 ORDER BY created_at DESC`, [staffId]
      );
    }
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

router.post('/leave',
  [body('leaveType').notEmpty(), body('startDate').isDate(), body('endDate').isDate(), body('hoursRequested').isNumeric()],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      const homeId = req.body.homeId || fromToken(req, 'homeId');
      const { leaveType, startDate, endDate, hoursRequested, reason } = req.body;
      const rows = await query(
        `INSERT INTO staff_leave (staff_id, home_id, leave_type, start_date, end_date, hours_requested, reason)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [staffId, homeId, leaveType, startDate, endDate, hoursRequested, reason || null]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.put('/leave/:id/approve', requireRole('home_manager', 'group_admin'),
  param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      const { action, declineReason } = req.body; // action: 'approve' | 'decline'
      const leaveRows = await query<{ staff_id: string; hours_requested: number }>(
        'SELECT staff_id, hours_requested FROM staff_leave WHERE id = $1', [req.params.id]
      );
      if (!leaveRows.length) throw new AppError('Leave request not found', 404);

      const status = action === 'approve' ? 'approved' : 'declined';
      await query(
        `UPDATE staff_leave SET status=$1, approved_by=$2, approved_at=NOW(), decline_reason=$3 WHERE id=$4`,
        [status, staffId, declineReason || null, req.params.id]
      );

      // Auto-deduct hours when approved
      if (action === 'approve') {
        await query(
          'UPDATE staff SET leave_hours_used = leave_hours_used + $1 WHERE id = $2',
          [leaveRows[0].hours_requested, leaveRows[0].staff_id]
        );
      }
      res.json({ success: true, message: `Leave ${status}` } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// ── Training ──────────────────────────────────────────────────────
router.get('/training/:staffId', param('staffId').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query(
        'SELECT * FROM staff_training WHERE staff_id = $1 ORDER BY completed_date DESC',
        [req.params.staffId]
      );
      res.json({ success: true, data: rows } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.post('/training',
  [body('staffId').isUUID(), body('courseName').notEmpty(), body('completedDate').isDate()],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const createdBy = fromToken(req, 'staffId');
      const { staffId, courseName, completedDate, durationHours, expiryDate, certificateUrl } = req.body;
      const rows = await query(
        `INSERT INTO staff_training (staff_id, course_name, completed_date, duration_hours, expiry_date, certificate_url, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [staffId, courseName, completedDate, durationHours || null, expiryDate || null, certificateUrl || null, createdBy]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// ── Absences ──────────────────────────────────────────────────────
router.get('/absences/:staffId', param('staffId').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query(
        'SELECT * FROM staff_absences WHERE staff_id = $1 ORDER BY absence_start DESC',
        [req.params.staffId]
      );
      res.json({ success: true, data: rows } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.post('/absences',
  [body('staffId').isUUID(), body('absenceType').notEmpty(), body('absenceStart').notEmpty()],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const createdBy = fromToken(req, 'staffId');
      const homeId = req.body.homeId || fromToken(req, 'homeId');
      const { staffId, absenceType, absenceStart, notifiedAt } = req.body;
      const rows = await query(
        `INSERT INTO staff_absences (staff_id, home_id, absence_type, notified_at, absence_start, created_by)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [staffId, homeId, absenceType, notifiedAt || new Date(), absenceStart, createdBy]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// ── Onboarding ────────────────────────────────────────────────────
router.get('/onboarding/:staffId', param('staffId').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query('SELECT * FROM staff_onboarding WHERE staff_id = $1', [req.params.staffId]);
      res.json({ success: true, data: rows[0] || null } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.put('/onboarding/:staffId', param('staffId').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const fields = ['application_received','application_date','interview_completed','interview_date',
        'interview_notes','dbs_submitted_date','dbs_cleared','dbs_cleared_date','dbs_certificate_url',
        'references_received','references_date','care_cert_completed','care_cert_date',
        'induction_completed','induction_date','med_training_completed','med_training_date',
        'right_to_work_verified','system_training_completed','system_training_date'];
      const camelToSnake = (s: string) => s.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);
      const updates: string[] = [];
      const values: unknown[] = [];
      let idx = 1;
      for (const field of fields) {
        const camel = field.replace(/_([a-z])/g, (_: string, l: string) => l.toUpperCase());
        if (req.body[camel] !== undefined) { updates.push(`${field} = $${idx++}`); values.push(req.body[camel]); }
      }
      if (!updates.length) throw new AppError('No fields to update', 400);
      updates.push('updated_at = NOW()');
      values.push(req.params.staffId);
      await query(`UPDATE staff_onboarding SET ${updates.join(', ')} WHERE staff_id = $${idx}`, values);
      res.json({ success: true, message: 'Onboarding updated' } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// ── Assessments ───────────────────────────────────────────────────
router.get('/assessments/:staffId', param('staffId').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query(
        `SELECT sa.*, s.first_name || ' ' || s.last_name as conducted_by_name
         FROM staff_assessments sa JOIN staff s ON s.id = sa.conducted_by
         WHERE sa.staff_id = $1 ORDER BY sa.assessment_date DESC`,
        [req.params.staffId]
      );
      res.json({ success: true, data: rows } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.post('/assessments',
  [body('staffId').isUUID(), body('assessmentType').notEmpty(), body('assessmentDate').isDate()],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const conductedBy = fromToken(req, 'staffId');
      const homeId = req.body.homeId || fromToken(req, 'homeId');
      const { staffId, assessmentType, customName, assessmentDate, outcome, recommendations, nextDueDate } = req.body;
      const rows = await query(
        `INSERT INTO staff_assessments (staff_id, conducted_by, home_id, assessment_type, custom_name, assessment_date, outcome, recommendations, next_due_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [staffId, conductedBy, homeId, assessmentType, customName || null, assessmentDate, outcome || null, recommendations || null, nextDueDate || null]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
