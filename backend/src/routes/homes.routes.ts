import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types';
import { randomBytes } from 'crypto';

const router = Router();
router.use(authenticate);

// GET /api/homes - list homes accessible to this staff member
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { staffId, role, organisationId } = req.staff;
    let rows;
    if (role === 'group_admin' || role === 'auditor') {
      rows = await query(
        `SELECT h.*, COUNT(DISTINCT su.id) AS su_count, COUNT(DISTINCT s.id) AS staff_count
         FROM homes h
         LEFT JOIN service_users su ON su.home_id = h.id AND su.status = 'live'
         LEFT JOIN staff s ON s.home_id = h.id AND s.is_active = TRUE
         WHERE h.organisation_id = $1 AND h.is_active = TRUE
         GROUP BY h.id ORDER BY h.name`,
        [organisationId]
      );
    } else {
      rows = await query(
        `SELECT h.*, COUNT(DISTINCT su.id) AS su_count
         FROM homes h
         LEFT JOIN service_users su ON su.home_id = h.id AND su.status = 'live'
         JOIN staff_home_access sha ON sha.home_id = h.id AND sha.staff_id = $1
         WHERE h.organisation_id = $2 AND h.is_active = TRUE
         GROUP BY h.id ORDER BY h.name`,
        [staffId, organisationId]
      );
    }
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/homes/:id
router.get('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query(
        'SELECT * FROM homes WHERE id = $1 AND organisation_id = $2',
        [req.params.id, req.staff.organisationId]
      );
      if (!rows.length) throw new AppError('Home not found', 404);
      res.json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/homes - create new home (group_admin only)
router.post(
  '/',
  requireRole('group_admin'),
  [
    body('name').notEmpty().trim(),
    body('address1').notEmpty().trim(),
    body('postcode').notEmpty().trim().toUpperCase(),
    body('geofenceRadius').optional().isInt({ min: 50, max: 1000 }),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, cqcLocationId, address1, address2, address3,
              postcode, latitude, longitude, phone, email,
              managerName, geofenceRadius } = req.body;

      const qrToken = randomBytes(32).toString('hex');
      const rows = await query(
        `INSERT INTO homes (organisation_id, name, cqc_location_id, address1, address2,
                           address3, postcode, latitude, longitude, phone, email,
                           manager_name, geofence_radius, qr_token)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         RETURNING *`,
        [req.staff.organisationId, name, cqcLocationId || null, address1,
         address2 || null, address3 || null, postcode,
         latitude || null, longitude || null, phone || null,
         email || null, managerName || null,
         geofenceRadius || 200, qrToken]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// PUT /api/homes/:id
router.put(
  '/:id',
  requireRole('group_admin', 'home_manager'),
  [param('id').isUUID(), body('name').optional().notEmpty()],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, address1, address2, address3, postcode, phone,
              email, managerName, geofenceRadius, latitude, longitude } = req.body;

      const rows = await query(
        `UPDATE homes SET
          name = COALESCE($1, name),
          address1 = COALESCE($2, address1),
          address2 = COALESCE($3, address2),
          address3 = COALESCE($4, address3),
          postcode = COALESCE($5, postcode),
          phone = COALESCE($6, phone),
          email = COALESCE($7, email),
          manager_name = COALESCE($8, manager_name),
          geofence_radius = COALESCE($9, geofence_radius),
          latitude = COALESCE($10, latitude),
          longitude = COALESCE($11, longitude),
          updated_at = NOW()
         WHERE id = $12 AND organisation_id = $13
         RETURNING *`,
        [name, address1, address2, address3, postcode, phone,
         email, managerName, geofenceRadius, latitude, longitude,
         req.params.id, req.staff.organisationId]
      );
      if (!rows.length) throw new AppError('Home not found', 404);
      res.json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// GET /api/homes/:id/qr - get home QR code token
router.get('/:id/qr', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query<{ qr_token: string; name: string; postcode: string }>(
        'SELECT qr_token, name, postcode FROM homes WHERE id = $1 AND organisation_id = $2',
        [req.params.id, req.staff.organisationId]
      );
      if (!rows.length) throw new AppError('Home not found', 404);
      res.json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// GET /api/homes/:id/dashboard - admin dashboard data for a home
router.get('/:id/dashboard', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = req.params.id;
      const today = new Date().toISOString().split('T')[0];

      const [suLive, staffActive, alertsUnresolved, carePlansOverdue, leaveRequests, recentClockIns] = await Promise.all([
        query<{ count: string }>('SELECT COUNT(*) FROM service_users WHERE home_id = $1 AND status = $2', [homeId, 'live']),
        query<{ count: string }>('SELECT COUNT(*) FROM staff WHERE home_id = $1 AND is_active = TRUE', [homeId]),
        query<{ count: string }>('SELECT COUNT(*) FROM business_alerts WHERE home_id = $1 AND is_resolved = FALSE', [homeId]),
        query<{ count: string }>(
          `SELECT COUNT(*) FROM care_plans WHERE home_id = $1 AND is_active = TRUE AND next_review_date < $2`,
          [homeId, today]
        ),
        query<{ count: string }>('SELECT COUNT(*) FROM staff_leave WHERE home_id = $1 AND status = $2', [homeId, 'pending']),
        query(
          `SELECT s.first_name, s.last_name, s.photo_url, ce.event_time, ce.event_type, ce.punctuality
           FROM staff_clock_events ce JOIN staff s ON s.id = ce.staff_id
           WHERE ce.home_id = $1 AND DATE(ce.event_time) = $2
           ORDER BY ce.event_time DESC LIMIT 20`,
          [homeId, today]
        ),
      ]);

      // Upcoming birthdays (next 7 days) — staff and SUs
      const birthdays = await query(
        `SELECT first_name, last_name, date_of_birth, 'service_user' as type FROM service_users
         WHERE home_id = $1 AND status = 'live'
           AND TO_CHAR(date_of_birth, 'MM-DD') BETWEEN TO_CHAR(NOW(), 'MM-DD') AND TO_CHAR(NOW() + INTERVAL '7 days', 'MM-DD')
         UNION
         SELECT first_name, last_name, date_of_birth, 'staff' as type FROM staff
         WHERE home_id = $1 AND is_active = TRUE
           AND TO_CHAR(date_of_birth, 'MM-DD') BETWEEN TO_CHAR(NOW(), 'MM-DD') AND TO_CHAR(NOW() + INTERVAL '7 days', 'MM-DD')
         ORDER BY TO_CHAR(date_of_birth, 'MM-DD')`,
        [homeId]
      );

      // Unresolved business alerts
      const alerts = await query(
        `SELECT * FROM business_alerts WHERE home_id = $1 AND is_resolved = FALSE
         ORDER BY severity DESC, created_at DESC LIMIT 20`,
        [homeId]
      );

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
