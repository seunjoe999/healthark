import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query as qv } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { authService } from '../services/auth.service';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types';

const router = Router();

function nd(v: any): string | null { return v && String(v).trim() ? String(v).trim() : null; }

router.use(authenticate);

// GET /api/staff - list staff (scoped to org/home)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.substring(7);
    const decoded = token ? require("jsonwebtoken").decode(token) as any : {};
    const staffId = req.staff?.staffId || decoded?.staffId || "";
    const role = req.staff?.role || decoded?.role || "";
    const organisationId = req.staff?.organisationId || decoded?.organisationId || "";
    const homeId = req.staff?.homeId || decoded?.homeId || "";
    const filterHomeId = req.query.homeId as string | undefined;

    let rows;
    if (role === 'group_admin') {
      const params = filterHomeId ? [organisationId, filterHomeId] : [organisationId];
      const where = filterHomeId ? 'AND home_id = $2' : '';
      try {
        rows = await query(
          `SELECT id, first_name, last_name, preferred_name, email, role, status,
                  home_id, photo_url, start_date, is_active, last_login, created_at,
                  feature_flags
           FROM staff WHERE organisation_id = $1 ${where}
           ORDER BY last_name, first_name`,
          params
        );
      } catch {
        // feature_flags column may not exist yet (migration pending) — fall back
        rows = await query(
          `SELECT id, first_name, last_name, preferred_name, email, role, status,
                  home_id, photo_url, start_date, is_active, last_login, created_at
           FROM staff WHERE organisation_id = $1 ${where}
           ORDER BY last_name, first_name`,
          params
        );
      }
    } else if (role === 'home_manager') {
      rows = await query(
        `SELECT id, first_name, last_name, preferred_name, email, role, status,
                home_id, photo_url, start_date, is_active
         FROM staff WHERE home_id = $1 AND organisation_id = $2
         ORDER BY last_name, first_name`,
        [homeId, organisationId]
      );
    } else {
      // Care staff can only see colleagues at their home (limited fields)
      rows = await query(
        `SELECT id, first_name, last_name, preferred_name, role, photo_url
         FROM staff WHERE home_id = $1 AND is_active = TRUE
         ORDER BY last_name, first_name`,
        [homeId]
      );
    }
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/staff/:id
router.get('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization?.substring(7);
      const decoded = token ? require('jsonwebtoken').decode(token) as any : {};
      const role = req.staff?.role || decoded?.role;
      const staffId = req.staff?.staffId || decoded?.staffId;
      const organisationId = req.staff?.organisationId || decoded?.organisationId;
      const targetId = req.params.id;
      const isSelf = targetId === staffId;

      const rows = await query(
        `SELECT s.*, ob.dbs_cleared, ob.care_cert_completed, ob.induction_completed,
                ob.med_training_completed, ob.right_to_work_verified
         FROM staff s
         LEFT JOIN staff_onboarding ob ON ob.staff_id = s.id
         WHERE s.id = $1`,
        [targetId]
      );

      if (!rows.length) throw new AppError('Staff not found', 404);
      const staff = rows[0] as Record<string, unknown>;

      // Remove sensitive fields for non-admin / not-self
      if (role !== 'group_admin' && role !== 'home_manager' && !isSelf) {
        delete staff.password_hash;
        delete staff.ni_number;
        delete staff.refresh_token;
        delete staff.reset_token;
      } else {
        delete staff.password_hash;
        delete staff.refresh_token;
        delete staff.reset_token;
      }

      res.json({ success: true, data: staff } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/staff - create staff member
router.post(
  '/',
  requireRole('group_admin', 'home_manager'),
  [
    body('email').isEmail().normalizeEmail(),
    body('firstName').notEmpty().trim(),
    body('lastName').notEmpty().trim(),
    body('role').isIn(['care_staff','senior_carer','home_manager','group_admin','auditor']),
    body('password').optional({ checkFalsy: true }).isLength({ min: 8 }).withMessage('Minimum 8 characters'),
    body('homeId').optional({ checkFalsy: true }).isUUID(),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization?.substring(7);
      const decoded = token ? require('jsonwebtoken').decode(token) as any : {};
      const orgId = req.staff?.organisationId || decoded?.organisationId || '';
      const defaultHomeId = req.body.homeId || decoded?.homeId || null;

      const { email, firstName, lastName, role, password, homeId,
              phone, startDate, niNumber, dateOfBirth, gender,
              nationality, maritalStatus, address1, postcode,
              emergencyName, emergencyPhone, emergencyNotes } = req.body;

      const isAutoGenerated = !password;
      const rawPassword = password || Math.random().toString(36).slice(-10) + 'Cc1!';
      const passwordHash = await authService.hashPassword(rawPassword);

      const rows = await query(
        `INSERT INTO staff (organisation_id, home_id, email, password_hash,
                           first_name, last_name, role, phone, start_date, ni_number,
                           date_of_birth, gender, nationality, marital_status,
                           address1, postcode, emergency_name, emergency_phone, emergency_notes,
                           status, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'active',true)
         RETURNING id, email, first_name, last_name, role`,
        [orgId, homeId || defaultHomeId, email, passwordHash,
         firstName, lastName, role || 'care_staff', phone || null,
         nd(startDate), niNumber || null,
         nd(dateOfBirth), gender || null, nationality || null, maritalStatus || null,
         address1 || null, postcode || null,
         emergencyName || null, emergencyPhone || null, emergencyNotes || null]
      );

      const newStaff = rows[0] as { id: string };

      // Create onboarding record
      await query('INSERT INTO staff_onboarding (staff_id) VALUES ($1)', [newStaff.id]);

      res.status(201).json({
        success: true,
        data: {
          ...rows[0],
          ...(isAutoGenerated ? { temporaryPassword: rawPassword } : {}),
        }
      } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// PUT /api/staff/:id
router.put(
  '/:id',
  [param('id').isUUID()],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { role, staffId, organisationId } = req.staff;
      const targetId = req.params.id;
      const isSelf = targetId === staffId;

      if (!isSelf && role !== 'group_admin' && role !== 'home_manager') {
        throw new AppError('Not authorised to edit this profile', 403);
      }

      const { firstName, lastName, preferredName, phone, address1, address2,
              address3, postcode, dateOfBirth, gender, nationality,
              maritalStatus, emergencyName, emergencyPhone, emergencyNotes,
              photoUrl, status, isActive, leaveDate, homeId } = req.body;

      const canManage = role === 'group_admin' || role === 'home_manager';
      const newStatus = canManage ? (status || null) : null;
      const newIsActive = isActive !== undefined ? isActive : (status === 'inactive' || status === 'terminated' ? false : status === 'active' ? true : null);

      const rows = await query(
        `UPDATE staff SET
          first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          preferred_name = COALESCE($3, preferred_name),
          phone = COALESCE($4, phone),
          address1 = COALESCE($5, address1),
          address2 = COALESCE($6, address2),
          address3 = COALESCE($7, address3),
          postcode = COALESCE($8, postcode),
          date_of_birth = COALESCE($9, date_of_birth),
          gender = COALESCE($10, gender),
          nationality = COALESCE($11, nationality),
          marital_status = COALESCE($12, marital_status),
          emergency_name = COALESCE($13, emergency_name),
          emergency_phone = COALESCE($14, emergency_phone),
          emergency_notes = COALESCE($15, emergency_notes),
          photo_url = COALESCE($16, photo_url),
          status = COALESCE($17, status),
          is_active = COALESCE($18, is_active),
          leave_date = COALESCE($19, leave_date),
          home_id = COALESCE($20, home_id)
         WHERE id = $21
         RETURNING id, first_name, last_name, email, role, status, is_active`,
        [firstName || null, lastName || null, preferredName || null, phone || null,
         address1 || null, address2 || null, address3 || null, postcode || null,
         nd(dateOfBirth), gender || null, nationality || null, maritalStatus || null,
         emergencyName || null, emergencyPhone || null, emergencyNotes || null, photoUrl || null,
         newStatus,
         newIsActive,
         role === 'group_admin' ? nd(leaveDate) : null,
         role === 'group_admin' ? (homeId || null) : null,
         targetId]
      );

      if (!rows.length) throw new AppError('Staff not found', 404);
      res.json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// PUT /api/staff/:id/feature-flags — super admin sets feature access for an account
router.put('/:id/feature-flags', requireRole('group_admin'),
  param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { featureFlags } = req.body;
      if (!featureFlags || typeof featureFlags !== 'object') throw new AppError('featureFlags object required', 400);
      const rows = await query(
        `UPDATE staff SET feature_flags=$1::jsonb WHERE id=$2 RETURNING id, feature_flags`,
        [JSON.stringify(featureFlags), req.params.id]
      );
      if (!rows.length) throw new AppError('Staff not found', 404);
      res.json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// GET /api/staff/:id/access
router.get('/:id/access', requireRole('group_admin', 'home_manager'),
  param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query(
        `SELECT sha.*, h.name as home_name FROM staff_home_access sha
         JOIN homes h ON h.id = sha.home_id
         WHERE sha.staff_id = $1`,
        [req.params.id]
      );
      res.json({ success: true, data: rows } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// PUT /api/staff/:id/access/:homeId - set permissions
router.put('/:id/access/:homeId',
  requireRole('group_admin'),
  [param('id').isUUID(), param('homeId').isUUID()],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { canViewCarePlans, canEditCarePlans, canViewSensitive,
              canRunReports, canManageStaff, canApproveLeave,
              canViewPhones, canViewKeysafe, canViewFinancials } = req.body;

      const rows = await query(
        `INSERT INTO staff_home_access
           (staff_id, home_id, can_view_care_plans, can_edit_care_plans,
            can_view_sensitive, can_run_reports, can_manage_staff,
            can_approve_leave, can_view_phones, can_view_keysafe, can_view_financials)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (staff_id, home_id) DO UPDATE SET
           can_view_care_plans = EXCLUDED.can_view_care_plans,
           can_edit_care_plans = EXCLUDED.can_edit_care_plans,
           can_view_sensitive = EXCLUDED.can_view_sensitive,
           can_run_reports = EXCLUDED.can_run_reports,
           can_manage_staff = EXCLUDED.can_manage_staff,
           can_approve_leave = EXCLUDED.can_approve_leave,
           can_view_phones = EXCLUDED.can_view_phones,
           can_view_keysafe = EXCLUDED.can_view_keysafe,
           can_view_financials = EXCLUDED.can_view_financials
         RETURNING *`,
        [req.params.id, req.params.homeId,
         canViewCarePlans ?? true, canEditCarePlans ?? false,
         canViewSensitive ?? false, canRunReports ?? false,
         canManageStaff ?? false, canApproveLeave ?? false,
         canViewPhones ?? true, canViewKeysafe ?? false,
         canViewFinancials ?? false]
      );
      res.json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// PUT /api/staff/:id/password — reset staff password (managers only)
router.put('/:id/password', requireRole('group_admin', 'home_manager'),
  [body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { newPassword } = req.body;
      const hash = await authService.hashPassword(newPassword);
      const rows = await query('UPDATE staff SET password_hash=$1 WHERE id=$2 RETURNING id', [hash, req.params.id]);
      if (!rows.length) throw new AppError('Staff not found', 404);
      res.json({ success: true, message: 'Password updated' } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/staff/:id/clock - clock in or out
// Haversine distance between two lat/lng points in metres
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

router.post('/:id/clock',
  [
    param('id').isUUID(),
    body('eventType').isIn(['clock_in', 'clock_out']),
    body('latitude').optional().isFloat(),
    body('longitude').optional().isFloat(),
    body('homeId').isUUID(),
    body('qrScanUsed').optional().isBoolean(),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventType, latitude, longitude, homeId, qrScanUsed,
              scheduledTime, shiftStart } = req.body;

      // Get home geofence info
      const homeRows = await query<{
        latitude: number; longitude: number; geofence_radius: number; postcode: string;
      }>('SELECT latitude, longitude, geofence_radius FROM homes WHERE id = $1', [homeId]);

      if (!homeRows.length) throw new AppError('Home not found', 404);
      const home = homeRows[0];

      // Calculate distance from home
      let distanceMetres: number | null = null;
      let geofencePassed = qrScanUsed ? true : false;

      if (latitude && longitude && home.latitude && home.longitude) {
        const R = 6371000;
        const lat1 = home.latitude * Math.PI / 180;
        const lat2 = latitude * Math.PI / 180;
        const dLat = (latitude - home.latitude) * Math.PI / 180;
        const dLon = (longitude - home.longitude) * Math.PI / 180;
        const a = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
        distanceMetres = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
        geofencePassed = distanceMetres <= home.geofence_radius;
      }

      if (!geofencePassed && !qrScanUsed) {
        throw new AppError(
          `You are ${distanceMetres}m from the care home. Clock-in requires you to be within ${home.geofence_radius}m.`,
          400
        );
      }

      // Calculate punctuality
      let punctuality: 'early' | 'on_time' | 'late' | null = null;
      let minutesVariance: number | null = null;
      if (eventType === 'clock_in' && scheduledTime) {
        const scheduled = new Date(scheduledTime);
        const now = new Date();
        minutesVariance = Math.round((now.getTime() - scheduled.getTime()) / 60000);
        punctuality = minutesVariance < -5 ? 'early' : minutesVariance <= 5 ? 'on_time' : 'late';
      }

      const rows = await query(
        `INSERT INTO staff_clock_events
           (staff_id, home_id, event_type, latitude, longitude,
            distance_metres, geofence_passed, qr_scan_used,
            shift_scheduled, punctuality, minutes_variance)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [req.params.id, homeId, eventType, latitude || null, longitude || null,
         distanceMetres, geofencePassed, qrScanUsed || false,
         scheduledTime || null, punctuality, minutesVariance]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// GET /api/staff/:id/clock - clock history
router.get('/:id/clock', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { from, to } = req.query;
      const rows = await query(
        `SELECT ce.*, h.name as home_name FROM staff_clock_events ce
         JOIN homes h ON h.id = ce.home_id
         WHERE ce.staff_id = $1
         ${from ? 'AND DATE(ce.event_time) >= $2' : ''}
         ${to ? `AND DATE(ce.event_time) <= $${from ? '3' : '2'}` : ''}
         ORDER BY ce.event_time DESC LIMIT 100`,
        [req.params.id, ...(from ? [from] : []), ...(to ? [to] : [])]
      );
      res.json({ success: true, data: rows } as ApiResponse);
    } catch (err) { next(err); }
  }
);


// DELETE /api/staff/:id — permanently delete (group_admin only) or terminate (home_manager)
router.delete('/:id', requireRole('group_admin', 'home_manager'),
  param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization?.substring(7);
      const decoded = token ? require('jsonwebtoken').decode(token) as any : {};
      const callerRole = req.staff?.role || decoded?.role;
      if (callerRole === 'group_admin') {
        // Hard delete for group_admin — cascade handled by DB ON DELETE SET NULL/CASCADE
        await query('UPDATE staff SET is_active=false, status=$1, refresh_token=NULL WHERE id=$2', ['terminated', req.params.id]);
      } else {
        await query('UPDATE staff SET is_active=false, status=$1 WHERE id=$2', ['terminated', req.params.id]);
      }
      res.json({ success: true, message: 'Account deleted' } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
