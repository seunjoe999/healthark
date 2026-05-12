import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';

const router = Router();

function fromToken(req: Request, field: string): string {
  const token = req.headers.authorization?.substring(7);
  if (token) { const d = jwt.decode(token) as any; return (req.staff as any)?.[field] || d?.[field] || ''; }
  return '';
}

// Haversine distance in metres
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// GET /api/clockin/qr/:token — validate QR code, return SU info (no auth needed — public page)
router.get('/qr/:token', param('token').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query<any>(
        `SELECT su.id, su.first_name, su.last_name, su.latitude, su.longitude,
                su.geofence_radius, su.address1, su.postcode,
                h.name as home_name, h.id as home_id
         FROM service_users su JOIN homes h ON h.id = su.home_id
         WHERE su.qr_token = $1 AND su.status = 'live'`,
        [req.params.token]
      );
      if (!rows.length) throw new AppError('Invalid or expired QR code', 404);
      const su = rows[0];
      res.json({
        success: true,
        data: {
          suId: su.id,
          name: `${su.first_name} ${su.last_name}`,
          homeName: su.home_name,
          homeId: su.home_id,
          address: [su.address1, su.postcode].filter(Boolean).join(', '),
          hasLocation: !!(su.latitude && su.longitude),
          geofenceRadius: su.geofence_radius || 200,
        }
      } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/clockin/qr — staff clocks in via QR code (requires auth)
router.post('/qr', authenticate,
  [body('suId').isUUID(), body('staffLat').isNumeric(), body('staffLng').isNumeric()],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      const { suId, staffLat, staffLng, eventType } = req.body;

      // Get SU location
      const suRows = await query<any>(
        'SELECT latitude, longitude, geofence_radius, first_name, last_name, home_id FROM service_users WHERE id = $1',
        [suId]
      );
      if (!suRows.length) throw new AppError('Service user not found', 404);
      const su = suRows[0];

      let geofencePassed = true;
      let distanceMetres: number | null = null;
      let geofenceNote = '';

      if (su.latitude && su.longitude) {
        distanceMetres = Math.round(haversine(staffLat, staffLng, parseFloat(su.latitude), parseFloat(su.longitude)));
        const radius = su.geofence_radius || 200;
        geofencePassed = distanceMetres <= radius;

        if (!geofencePassed) {
          geofenceNote = `${distanceMetres}m from ${su.first_name}'s location (limit: ${radius}m)`;
        }
      }

      if (!geofencePassed) {
        return res.status(403).json({
          success: false,
          error: `You are too far away to clock in. You are ${distanceMetres}m from the service user's location. You must be within ${su.geofence_radius || 200}m.`,
          distanceMetres,
          geofencePassed: false,
        });
      }

      // Get staff shift start time for punctuality
      const staffRows = await query<any>('SELECT shift_start_time FROM staff WHERE id = $1', [staffId]);
      const shiftStart = staffRows[0]?.shift_start_time;
      let punctuality = 'on_time';
      if (shiftStart) {
        const now = new Date();
        const [h, m] = shiftStart.split(':').map(Number);
        const shift = new Date(now); shift.setHours(h, m, 0, 0);
        const diffMins = (now.getTime() - shift.getTime()) / 60000;
        punctuality = diffMins < -5 ? 'early' : diffMins > 10 ? 'late' : 'on_time';
      }

      // Record the clock event
      const rows = await query(
        `INSERT INTO staff_clock_events
           (staff_id, home_id, su_id, event_type, event_time, geofence_passed,
            geofence_distance, punctuality, notes)
         VALUES ($1,$2,$3,$4,NOW(),$5,$6,$7,$8) RETURNING *`,
        [staffId, su.home_id, suId, eventType || 'clock_in',
         geofencePassed, distanceMetres, punctuality,
         geofenceNote || null]
      );

      res.status(201).json({
        success: true,
        data: {
          ...(rows[0] as object),
          geofencePassed,
          distanceMetres,
          punctuality,
          suName: `${su.first_name} ${su.last_name}`,
        }
      } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// GET /api/clockin/generate/:suId — get/refresh QR token for a SU
router.get('/generate/:suId', authenticate, param('suId').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query<any>(
        `SELECT su.qr_token, su.first_name, su.last_name, su.latitude, su.longitude
         FROM service_users su WHERE su.id = $1`,
        [req.params.suId]
      );
      if (!rows.length) throw new AppError('Service user not found', 404);
      const su = rows[0];
      const qrUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/clockin/${su.qr_token}`;
      res.json({ success: true, data: { qrToken: su.qr_token, qrUrl, hasLocation: !!(su.latitude && su.longitude) } } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// PUT /api/clockin/location/:suId — set GPS for service user address
router.put('/location/:suId', authenticate, param('suId').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { latitude, longitude, geofenceRadius } = req.body;
      await query(
        'UPDATE service_users SET latitude=$1, longitude=$2, geofence_radius=$3 WHERE id=$4',
        [latitude, longitude, geofenceRadius || 200, req.params.suId]
      );
      res.json({ success: true, message: 'Location updated' } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
