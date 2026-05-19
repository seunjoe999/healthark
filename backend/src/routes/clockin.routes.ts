import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';
import https from 'https';

const router = Router();

function fromToken(req: Request, field: string): string {
  const token = req.headers.authorization?.substring(7);
  if (token) { const d = jwt.decode(token) as any; return (req.staff as any)?.[field] || d?.[field] || ''; }
  return '';
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function geocodePostcode(postcode: string): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    const clean = postcode.replace(/\s+/g, '');
    https.get(`https://api.postcodes.io/postcodes/${encodeURIComponent(clean)}`, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.status === 200 && json.result) {
            resolve({ latitude: json.result.latitude, longitude: json.result.longitude });
          } else {
            resolve(null);
          }
        } catch { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

// International geocoding via OpenStreetMap Nominatim (works worldwide)
function geocodeAddress(address: string): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    https.get(url, { headers: { 'User-Agent': 'HealthArk-CareManagement/1.0' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.length > 0) {
            resolve({ latitude: parseFloat(json[0].lat), longitude: parseFloat(json[0].lon) });
          } else {
            resolve(null);
          }
        } catch { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

// ── Home-based clock-in (new) ──────────────────────────────────────

// GET /api/clockin/home/:token — public, get home info by home qr_token
router.get('/home/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await query<any>(
      `SELECT h.id, h.name, h.qr_token FROM homes h WHERE h.qr_token = $1`,
      [req.params.token]
    );
    if (!rows.length) throw new AppError('Invalid QR code', 404);
    const home = rows[0];
    const postcodes = await query<any>(
      'SELECT id, postcode, label, latitude, longitude FROM home_postcodes WHERE home_id = $1',
      [home.id]
    );
    res.json({
      success: true,
      data: {
        homeId: home.id,
        homeName: home.name,
        hasPostcodes: postcodes.length > 0,
        geofenceRadius: 200,
      }
    } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/clockin/event — staff clocks in/out with GPS, checked against home postcodes
router.post('/event', authenticate,
  [body('homeId').isUUID(), body('staffLat').isNumeric(), body('staffLng').isNumeric()],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      const { homeId, staffLat, staffLng, eventType } = req.body;

      // Reject if GPS accuracy is too poor
      const gpsAccuracy = parseFloat(req.body.accuracy) || null;
      if (gpsAccuracy !== null && gpsAccuracy > 300) {
        return res.status(403).json({
          success: false,
          error: `GPS signal too weak (±${Math.round(gpsAccuracy)}m accuracy). Please use a mobile device or move outdoors.`,
          geofencePassed: false,
        });
      }

      // Build list of all valid check points: home address + any extra postcodes
      const homeRows = await query<any>(
        'SELECT address1, postcode, latitude, longitude, geofence_radius FROM homes WHERE id = $1',
        [homeId]
      );
      const home = homeRows[0];

      const extraPostcodes = await query<any>(
        'SELECT postcode, label, latitude, longitude, radius FROM home_postcodes WHERE home_id = $1',
        [homeId]
      );

      // Primary point = home's own geocoded address
      const checkPoints: { lat: number; lng: number; label: string; radius: number }[] = [];
      if (home?.latitude && home?.longitude) {
        const label = [home.address1, home.postcode].filter(Boolean).join(', ');
        checkPoints.push({ lat: parseFloat(home.latitude), lng: parseFloat(home.longitude), label, radius: home.geofence_radius || 200 });
      }
      // Additional points = extra postcodes configured in Clock-In Admin
      for (const pc of extraPostcodes) {
        if (pc.latitude && pc.longitude) {
          checkPoints.push({ lat: parseFloat(pc.latitude), lng: parseFloat(pc.longitude), label: pc.label || pc.postcode, radius: pc.radius || 200 });
        }
      }

      let geofencePassed = false;
      let closestDistance: number | null = null;
      let closestLabel = '';

      // Clock-out is never geofence-blocked — staff can be anywhere when ending a shift
      if (eventType === 'clock_out') {
        geofencePassed = true;
      } else if (checkPoints.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'No verified location has been set up for this care home. Ask your manager to set the address in Clock-In Management.',
          geofencePassed: false,
        });
      } else {
        for (const pt of checkPoints) {
          const dist = Math.round(haversine(staffLat, staffLng, pt.lat, pt.lng));
          if (closestDistance === null || dist < closestDistance) {
            closestDistance = dist;
            closestLabel = pt.label;
          }
          if (dist <= pt.radius) { geofencePassed = true; break; }
        }

        if (!geofencePassed) {
          return res.status(403).json({
            success: false,
            error: `You are too far from the care home. You are ${closestDistance}m from ${closestLabel} (must be within ${checkPoints[0]?.radius || 200}m).`,
            distanceMetres: closestDistance,
            geofencePassed: false,
          });
        }
      }

      const staffRows = await query<any>('SELECT first_name, last_name, role FROM staff WHERE id = $1', [staffId]);
      const staffRole = staffRows[0]?.role;
      if (staffRole === 'home_manager' || staffRole === 'group_admin') {
        return res.status(403).json({ success: false, error: 'Managers and admins cannot clock in via QR.' });
      }
      const punctuality = 'on_time';

      const rows = await query(
        `INSERT INTO staff_clock_events
           (staff_id, home_id, event_type, event_time, geofence_passed, distance_metres, punctuality)
         VALUES ($1,$2,$3,NOW(),$4,$5,$6) RETURNING *`,
        [staffId, homeId, eventType || 'clock_in', geofencePassed, closestDistance, punctuality]
      );

      res.status(201).json({
        success: true,
        data: {
          ...(rows[0] as object),
          geofencePassed,
          distanceMetres: closestDistance,
          punctuality,
          staffName: staffRows[0] ? `${staffRows[0].first_name} ${staffRows[0].last_name}` : '',
        }
      } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// GET /api/clockin/analytics — clock-in analytics for a home and date range
router.get('/analytics', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const startDate = (req.query.startDate as string) || new Date().toISOString().split('T')[0];
    const endDate = (req.query.endDate as string) || new Date().toISOString().split('T')[0];

    // Total events + clock-ins + unique staff
    const summaryRows = await query<any>(
      `SELECT
         COUNT(*) as total_events,
         COUNT(*) FILTER (WHERE event_type = 'clock_in') as total_clock_ins,
         COUNT(DISTINCT staff_id) as unique_staff
       FROM staff_clock_events
       WHERE home_id = $1 AND event_time::date BETWEEN $2 AND $3`,
      [homeId, startDate, endDate]
    );

    // By staff
    const byStaffRows = await query<any>(
      `SELECT ce.staff_id,
         s.first_name || ' ' || s.last_name as staff_name,
         COUNT(*) FILTER (WHERE ce.event_type='clock_in') as clock_ins,
         COUNT(*) FILTER (WHERE ce.event_type='clock_out') as clock_outs,
         COUNT(*) as total_events,
         MAX(ce.event_time) as last_event
       FROM staff_clock_events ce
       JOIN staff s ON s.id = ce.staff_id
       WHERE ce.home_id = $1 AND ce.event_time::date BETWEEN $2 AND $3
       GROUP BY ce.staff_id, s.first_name, s.last_name
       ORDER BY total_events DESC`,
      [homeId, startDate, endDate]
    );

    // By day
    const byDayRows = await query<any>(
      `SELECT
         event_time::date as date,
         COUNT(*) FILTER (WHERE event_type='clock_in') as clock_ins,
         COUNT(*) FILTER (WHERE event_type='clock_out') as clock_outs
       FROM staff_clock_events
       WHERE home_id = $1 AND event_time::date BETWEEN $2 AND $3
       GROUP BY event_time::date
       ORDER BY date ASC`,
      [homeId, startDate, endDate]
    );

    // Late arrivals — clock_in after 08:00
    const lateRows = await query<any>(
      `SELECT ce.staff_id,
         s.first_name || ' ' || s.last_name as staff_name,
         ce.event_time,
         EXTRACT(HOUR FROM ce.event_time)::int as hour,
         EXTRACT(MINUTE FROM ce.event_time)::int as minute
       FROM staff_clock_events ce
       JOIN staff s ON s.id = ce.staff_id
       WHERE ce.home_id = $1
         AND ce.event_type = 'clock_in'
         AND ce.event_time::date BETWEEN $2 AND $3
         AND EXTRACT(HOUR FROM ce.event_time) >= 8
         AND (EXTRACT(HOUR FROM ce.event_time) > 8 OR EXTRACT(MINUTE FROM ce.event_time) > 0)
       ORDER BY ce.event_time DESC`,
      [homeId, startDate, endDate]
    );

    // Staff in home who have NO clock events in range
    const neverClockedInRows = await query<any>(
      `SELECT s.id as staff_id, s.first_name || ' ' || s.last_name as staff_name, s.role
       FROM staff s
       WHERE s.home_id = $1
         AND s.status = 'active'
         AND s.role NOT IN ('home_manager', 'group_admin')
         AND s.id NOT IN (
           SELECT DISTINCT staff_id
           FROM staff_clock_events
           WHERE home_id = $1 AND event_time::date BETWEEN $2 AND $3
         )`,
      [homeId, startDate, endDate]
    );

    const summary = summaryRows[0] || {};

    res.json({
      success: true,
      data: {
        totalEvents: parseInt(summary.total_events || '0'),
        totalClockIns: parseInt(summary.total_clock_ins || '0'),
        uniqueStaff: parseInt(summary.unique_staff || '0'),
        byStaff: byStaffRows,
        byDay: byDayRows,
        lateArrivals: lateRows,
        neverClockedIn: neverClockedInRows,
      }
    } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/clockin/postcodes/:homeId — list postcodes for a home
router.get('/postcodes/:homeId', authenticate, param('homeId').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query<any>(
        'SELECT * FROM home_postcodes WHERE home_id = $1 ORDER BY created_at ASC',
        [req.params.homeId]
      );
      res.json({ success: true, data: rows } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/clockin/postcodes — add postcode (auto-geocodes via postcodes.io)
router.post('/postcodes', authenticate,
  [body('homeId').isUUID(), body('postcode').notEmpty()],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { homeId, postcode, label, radius } = req.body;
      const coords = await geocodePostcode(postcode);
      const rows = await query(
        `INSERT INTO home_postcodes (home_id, postcode, label, latitude, longitude, radius)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (home_id, postcode) DO UPDATE SET label = EXCLUDED.label, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, radius = EXCLUDED.radius
         RETURNING *`,
        [homeId, postcode.trim().toUpperCase(), label || null, coords?.latitude || null, coords?.longitude || null, parseInt(radius) || 200]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// DELETE /api/clockin/postcodes/:id — remove a postcode
router.delete('/postcodes/:id', authenticate, param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await query('DELETE FROM home_postcodes WHERE id = $1', [req.params.id]);
      res.json({ success: true, message: 'Postcode removed' } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// GET /api/clockin/home-qr/:homeId — get home QR URL + token + address info
router.get('/home-qr/:homeId', authenticate, param('homeId').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query<any>(
        'SELECT id, name, qr_token, address1, address2, address3, postcode, latitude, longitude, geofence_radius FROM homes WHERE id = $1',
        [req.params.homeId]
      );
      if (!rows.length) throw new AppError('Home not found', 404);
      let home = rows[0];
      // Auto-generate qr_token if missing
      if (!home.qr_token) {
        const crypto = require('crypto');
        const newToken = crypto.randomBytes(16).toString('hex');
        await query('UPDATE homes SET qr_token = $1 WHERE id = $2', [newToken, req.params.homeId]);
        home = { ...home, qr_token: newToken };
      }
      const base = process.env.FRONTEND_URL || 'http://localhost:3000';
      const qrUrl = `${base}/clockin/home/${home.qr_token}`;
      res.json({
        success: true,
        data: {
          homeId: home.id,
          homeName: home.name,
          qrToken: home.qr_token,
          qrUrl,
          address1: home.address1,
          address2: home.address2,
          address3: home.address3,
          postcode: home.postcode,
          latitude: home.latitude,
          longitude: home.longitude,
          geofenceRadius: home.geofence_radius || 200,
          isGeocoded: !!(home.latitude && home.longitude),
        }
      } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/clockin/geocode-home/:homeId — geocode home address (UK postcode or international)
router.post('/geocode-home/:homeId', authenticate, param('homeId').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query<any>('SELECT address1, address2, address3, postcode FROM homes WHERE id = $1', [req.params.homeId]);
      if (!rows.length) throw new AppError('Home not found', 404);
      const { address1, address2, address3, postcode } = rows[0];
      if (!postcode && !address1) throw new AppError('Home has no address set', 400);

      // Try UK postcode first
      let coords = postcode ? await geocodePostcode(postcode) : null;

      // Fall back to full address via Nominatim (international)
      if (!coords) {
        const fullAddress = [address1, address2, address3, postcode].filter(Boolean).join(', ');
        coords = await geocodeAddress(fullAddress);
      }

      if (!coords) throw new AppError('Could not geocode this address. Please enter coordinates manually.', 422);

      await query('UPDATE homes SET latitude = $1, longitude = $2 WHERE id = $3', [coords.latitude, coords.longitude, req.params.homeId]);
      res.json({ success: true, data: { latitude: coords.latitude, longitude: coords.longitude } } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// PUT /api/clockin/home-location/:homeId — manually set coordinates
router.put('/home-location/:homeId', authenticate, param('homeId').isUUID(),
  [body('latitude').isFloat({ min: -90, max: 90 }), body('longitude').isFloat({ min: -180, max: 180 })],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { latitude, longitude } = req.body;
      await query('UPDATE homes SET latitude = $1, longitude = $2 WHERE id = $3', [latitude, longitude, req.params.homeId]);
      res.json({ success: true, data: { latitude, longitude } } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// ── Legacy per-SU routes (kept for backward compatibility) ─────────

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
          suId: su.id, name: `${su.first_name} ${su.last_name}`,
          homeName: su.home_name, homeId: su.home_id,
          address: [su.address1, su.postcode].filter(Boolean).join(', '),
          hasLocation: !!(su.latitude && su.longitude),
          geofenceRadius: su.geofence_radius || 200,
        }
      } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.get('/generate/:suId', authenticate, param('suId').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query<any>('SELECT qr_token, first_name, last_name, latitude, longitude FROM service_users WHERE id = $1', [req.params.suId]);
      if (!rows.length) throw new AppError('Service user not found', 404);
      const su = rows[0];
      const qrUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/clockin/${su.qr_token}`;
      res.json({ success: true, data: { qrToken: su.qr_token, qrUrl, hasLocation: !!(su.latitude && su.longitude) } } as ApiResponse);
    } catch (err) { next(err); }
  }
);


router.post('/generate-qr', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeId } = req.body;
    const crypto = require('crypto');
    const token = crypto.randomBytes(16).toString('hex');
    await query('UPDATE homes SET qr_token=$1 WHERE id=$2', [token, homeId]);
    res.json({ success: true, data: { token } } as ApiResponse);
  } catch (err) { next(err); }
});

export default router;
