import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types';
import { randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';

const router = Router();

function nd(v: any): string | null { return v && String(v).trim() ? String(v).trim() : null; }

router.use(authenticate);

function getOrgId(req: Request): string {
  // Read directly from JWT token as fallback
  const token = req.headers.authorization?.substring(7);
  if (token) {
    const decoded = jwt.decode(token) as Record<string, string>;
    return req.staff?.organisationId || decoded?.organisationId || '';
  }
  return req.staff?.organisationId || '';
}

// GET /api/homes
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const staffId = req.staff?.staffId;
    const role = req.staff?.role;
    let organisationId = getOrgId(req);
    // If JWT is missing organisationId, look it up from the database
    if (!organisationId && staffId) {
      const adminRow = await query<any>('SELECT organisation_id FROM staff WHERE id=$1', [staffId]);
      organisationId = adminRow[0]?.organisation_id || '';
    }
    // Last resort: derive org from the staff member's home
    const homeId = req.staff?.homeId;
    if (!organisationId && (homeId || staffId)) {
      const src = homeId
        ? await query<any>('SELECT organisation_id FROM homes WHERE id=$1', [homeId])
        : await query<any>('SELECT h.organisation_id FROM homes h JOIN staff s ON s.home_id=h.id WHERE s.id=$1 LIMIT 1', [staffId]);
      organisationId = src[0]?.organisation_id || '';
    }

    console.log('HOMES: role=%s orgId=%s staffId=%s', role, organisationId, staffId);

    let rows;
    if (role === 'group_admin' || role === 'auditor') {
      rows = await query(
        `SELECT h.*,
                (SELECT COUNT(*) FROM service_users su WHERE su.home_id = h.id AND su.status = 'live') AS su_count,
                (SELECT COUNT(*) FROM staff s WHERE s.home_id = h.id AND s.is_active = true) AS staff_count
         FROM homes h
         WHERE h.organisation_id = $1
         ORDER BY h.name`,
        [organisationId]
      );
    } else {
      rows = await query(
        `SELECT h.*,
                (SELECT COUNT(*) FROM service_users su WHERE su.home_id = h.id AND su.status = 'live') AS su_count
         FROM homes h
         JOIN staff_home_access sha ON sha.home_id = h.id AND sha.staff_id = $1
         WHERE h.organisation_id = $2
         ORDER BY h.name`,
        [staffId, organisationId]
      );
    }

    console.log('HOMES: returned %d rows', rows.length);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/homes/:id
router.get('/:id', param('id').notEmpty(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organisationId = getOrgId(req);
      const rows = await query(
        'SELECT * FROM homes WHERE id = $1 AND organisation_id = $2',
        [req.params.id, organisationId]
      );
      if (!rows.length) throw new AppError('Home not found', 404);
      res.json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/homes
router.post('/',
  requireRole('group_admin'),
  [body('name').notEmpty().trim(), body('address1').notEmpty().trim(), body('postcode').notEmpty().trim()],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organisationId = getOrgId(req);
      const { name, cqcLocationId, address1, address2, address3,
              postcode, latitude, longitude, phone, email,
              managerName, geofenceRadius } = req.body;
      const qrToken = randomBytes(32).toString('hex');
      const rows = await query(
        `INSERT INTO homes (organisation_id, name, cqc_location_id, address1, address2,
                           address3, postcode, latitude, longitude, phone, email,
                           manager_name, geofence_radius, qr_token, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,true) RETURNING *`,
        [organisationId, name, cqcLocationId || null, address1,
         address2 || null, address3 || null, postcode,
         latitude || null, longitude || null, phone || null,
         email || null, managerName || null, geofenceRadius || 200, qrToken]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// PUT /api/homes/:id
router.put('/:id', requireRole('group_admin', 'home_manager'),
  [param('id').notEmpty()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organisationId = getOrgId(req);
      const { name, address1, address2, address3, postcode, phone,
              email, managerName, geofenceRadius, latitude, longitude } = req.body;
      const rows = await query(
        `UPDATE homes SET
          name = COALESCE($1, name), address1 = COALESCE($2, address1),
          address2 = COALESCE($3, address2), address3 = COALESCE($4, address3),
          postcode = COALESCE($5, postcode), phone = COALESCE($6, phone),
          email = COALESCE($7, email), manager_name = COALESCE($8, manager_name),
          geofence_radius = COALESCE($9, geofence_radius),
          latitude = COALESCE($10, latitude), longitude = COALESCE($11, longitude),
          updated_at = NOW()
         WHERE id = $12 AND organisation_id = $13 RETURNING *`,
        [name, address1, address2, address3, postcode, phone,
         email, managerName, geofenceRadius, latitude, longitude,
         req.params.id, organisationId]
      );
      if (!rows.length) throw new AppError('Home not found', 404);
      res.json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// GET /api/homes/:id/qr
router.get('/:id/qr', param('id').notEmpty(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organisationId = getOrgId(req);
      const rows = await query<{ qr_token: string; name: string; postcode: string }>(
        'SELECT qr_token, name, postcode FROM homes WHERE id = $1 AND organisation_id = $2',
        [req.params.id, organisationId]
      );
      if (!rows.length) throw new AppError('Home not found', 404);
      res.json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// GET /api/homes/:id/dashboard
router.get('/:id/dashboard', param('id').notEmpty(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = req.params.id;
      const today = new Date().toISOString().split('T')[0];

      const [suLive, staffActive, alertsUnresolved, carePlansOverdue, leaveRequests, recentClockIns, birthdays, alerts] =
        await Promise.all([
          query<{ count: string }>('SELECT COUNT(*) FROM service_users WHERE home_id = $1 AND status = $2', [homeId, 'live']),
          query<{ count: string }>('SELECT COUNT(*) FROM staff WHERE home_id = $1 AND is_active = true', [homeId]),
          query<{ count: string }>('SELECT COUNT(*) FROM business_alerts WHERE home_id = $1 AND is_resolved = false', [homeId]),
          query<{ count: string }>(`SELECT COUNT(*) FROM care_plans WHERE home_id = $1 AND is_active = true AND next_review_date < $2`, [homeId, today]),
          query<{ count: string }>('SELECT COUNT(*) FROM staff_leave WHERE home_id = $1 AND status = $2', [homeId, 'pending']),
          query(
            `SELECT s.first_name, s.last_name, s.photo_url, ce.event_time, ce.event_type, ce.punctuality
             FROM staff_clock_events ce JOIN staff s ON s.id = ce.staff_id
             WHERE ce.home_id = $1 AND DATE(ce.event_time) = $2
             ORDER BY ce.event_time DESC LIMIT 10`,
            [homeId, today]
          ),
          query(
            `SELECT first_name, last_name, date_of_birth, 'service_user' as type FROM service_users
             WHERE home_id = $1 AND status = 'live'
               AND TO_CHAR(date_of_birth, 'MM-DD') BETWEEN TO_CHAR(NOW(), 'MM-DD') AND TO_CHAR(NOW() + INTERVAL '7 days', 'MM-DD')
             UNION
             SELECT first_name, last_name, date_of_birth, 'staff' as type FROM staff
             WHERE home_id = $1 AND is_active = true
               AND TO_CHAR(date_of_birth, 'MM-DD') BETWEEN TO_CHAR(NOW(), 'MM-DD') AND TO_CHAR(NOW() + INTERVAL '7 days', 'MM-DD')`,
            [homeId]
          ),
          query(`SELECT * FROM business_alerts WHERE home_id = $1 AND is_resolved = false ORDER BY severity DESC, created_at DESC LIMIT 20`, [homeId]),
        ]);

      res.json({
        success: true,
        data: {
          stats: {
            suLive: parseInt(suLive[0]?.count || '0'),
            staffActive: parseInt(staffActive[0]?.count || '0'),
            alertsUnresolved: parseInt(alertsUnresolved[0]?.count || '0'),
            carePlansOverdue: parseInt(carePlansOverdue[0]?.count || '0'),
            leaveRequests: parseInt(leaveRequests[0]?.count || '0'),
          },
          recentClockIns,
          birthdays,
          alerts,
        }
      } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
