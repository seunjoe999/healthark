import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth';
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

// GET /api/physical-health-plans?homeId=
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const rows = await query(
      `SELECT p.*, su.first_name || ' ' || su.last_name AS su_name
       FROM physical_health_plans p
       JOIN service_users su ON su.id = p.su_id
       WHERE p.home_id = $1
       ORDER BY su.last_name, su.first_name`,
      [homeId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/physical-health-plans/:id
router.get('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
      const rows = await query(
        `SELECT p.*, su.first_name || ' ' || su.last_name AS su_name
         FROM physical_health_plans p
         JOIN service_users su ON su.id = p.su_id
         WHERE p.id = $1 AND p.home_id = $2`,
        [req.params.id, homeId]
      );
      if (!rows.length) return next(new AppError('Not found', 404));
      res.json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// GET /api/physical-health-plans/by-su/:suId
router.get('/by-su/:suId', param('suId').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query(
        'SELECT * FROM physical_health_plans WHERE su_id = $1 ORDER BY created_at DESC',
        [req.params.suId]
      );
      res.json({ success: true, data: rows } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/physical-health-plans
router.post('/',
  [body('homeId').isUUID(), body('suId').isUUID()],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      const {
        homeId, suId, heightCm, weightKg, bmi, bloodPressure, pulse, temperatureC,
        oxygenSat, conditions, allergies, currentMeds, gpName, gpPhone,
        hospitalNumber, nhsNumber, lastGpReview, nextReviewDate, notes,
      } = req.body;
      const rows = await query(
        `INSERT INTO physical_health_plans
         (home_id, su_id, created_by, height_cm, weight_kg, bmi, blood_pressure, pulse, temperature_c,
          oxygen_sat, conditions, allergies, current_meds, gp_name, gp_phone,
          hospital_number, nhs_number, last_gp_review, next_review_date, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
         RETURNING *`,
        [homeId, suId, staffId, heightCm||null, weightKg||null, bmi||null,
         bloodPressure||null, pulse||null, temperatureC||null, oxygenSat||null,
         conditions||null, allergies||null, currentMeds||null, gpName||null, gpPhone||null,
         hospitalNumber||null, nhsNumber||null, lastGpReview||null, nextReviewDate||null, notes||null]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// PATCH /api/physical-health-plans/:id
// Care staff can add/complete a resident health check while on shift, but once
// they clock off it becomes read-only to them (legal/audit-trail requirement).
router.patch('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      const role = fromToken(req, 'role');
      if (role === 'care_staff') {
        const lastEvent = await query<any>(
          `SELECT event_type FROM staff_clock_events WHERE staff_id = $1 ORDER BY event_time DESC LIMIT 1`,
          [staffId]
        );
        if (lastEvent[0]?.event_type !== 'clock_in') {
          throw new AppError('You can only edit a resident health check while clocked in to your shift.', 403);
        }
      }
      const {
        heightCm, weightKg, bmi, bloodPressure, pulse, temperatureC,
        oxygenSat, conditions, allergies, currentMeds, gpName, gpPhone,
        hospitalNumber, nhsNumber, lastGpReview, nextReviewDate, notes,
      } = req.body;
      const rows = await query(
        `UPDATE physical_health_plans SET
         reviewed_by=$1, height_cm=$2, weight_kg=$3, bmi=$4, blood_pressure=$5,
         pulse=$6, temperature_c=$7, oxygen_sat=$8, conditions=$9, allergies=$10,
         current_meds=$11, gp_name=$12, gp_phone=$13, hospital_number=$14, nhs_number=$15,
         last_gp_review=$16, next_review_date=$17, notes=$18, updated_at=NOW()
         WHERE id=$19 RETURNING *`,
        [staffId, heightCm||null, weightKg||null, bmi||null, bloodPressure||null,
         pulse||null, temperatureC||null, oxygenSat||null, conditions||null, allergies||null,
         currentMeds||null, gpName||null, gpPhone||null, hospitalNumber||null, nhsNumber||null,
         lastGpReview||null, nextReviewDate||null, notes||null, req.params.id]
      );
      if (!rows.length) return next(new AppError('Not found', 404));
      res.json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
