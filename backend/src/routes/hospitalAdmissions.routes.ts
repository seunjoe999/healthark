import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types/index';
import jwt from 'jsonwebtoken';

const router = Router();
router.use(authenticate);

function fromToken(req: Request, field: string): string {
  const token = req.headers.authorization?.substring(7);
  if (token) { const d = jwt.decode(token) as any; return (req.staff as any)?.[field] || d?.[field] || ''; }
  return (req.staff as any)?.[field] || '';
}

// Ensure table exists
async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS hospital_admissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      home_id UUID NOT NULL,
      su_id UUID NOT NULL,
      logged_by UUID NOT NULL,
      hospital_name TEXT NOT NULL,
      ward TEXT,
      admission_date DATE NOT NULL,
      admission_reason TEXT NOT NULL,
      admission_type TEXT NOT NULL CHECK (admission_type IN ('emergency','planned','day_case')),
      discharge_date DATE,
      discharge_destination TEXT CHECK (discharge_destination IN ('home','care_home','other_hospital','deceased') OR discharge_destination IS NULL),
      outcome_notes TEXT,
      follow_up_required BOOLEAN DEFAULT false,
      follow_up_notes TEXT,
      status TEXT DEFAULT 'admitted' CHECK (status IN ('admitted','discharged')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `, []);
}

router.use(async (_req, _res, next) => {
  try { await ensureTable(); } catch (_) {}
  next();
});

// GET /api/hospital-admissions
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const { suId, status } = req.query;

    let sql = `
      SELECT
        ha.*,
        su.first_name || ' ' || su.last_name AS resident_name,
        su.photo_url AS resident_photo,
        s.first_name || ' ' || s.last_name AS logged_by_name
      FROM hospital_admissions ha
      LEFT JOIN service_users su ON su.id = ha.su_id
      LEFT JOIN staff s ON s.id = ha.logged_by
      WHERE ha.home_id = $1
    `;
    const params: any[] = [homeId];

    if (suId) { params.push(suId); sql += ` AND ha.su_id = $${params.length}`; }
    if (status) { params.push(status); sql += ` AND ha.status = $${params.length}`; }

    sql += ' ORDER BY ha.admission_date DESC, ha.created_at DESC';

    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/hospital-admissions/stats
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');

    const rows = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'admitted') AS current_inpatients,
        COUNT(*) FILTER (WHERE status = 'discharged'
          AND date_trunc('month', discharge_date) = date_trunc('month', CURRENT_DATE)) AS discharged_this_month,
        COUNT(*) FILTER (WHERE admission_type = 'planned' AND status = 'admitted') AS planned_admissions,
        ROUND(AVG(
          CASE WHEN discharge_date IS NOT NULL
            THEN discharge_date - admission_date
          ELSE CURRENT_DATE - admission_date END
        )::numeric, 1) AS avg_length_of_stay
      FROM hospital_admissions
      WHERE home_id = $1
    `, [homeId]);

    res.json({ success: true, data: rows[0] } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/hospital-admissions
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const loggedBy = fromToken(req, 'staffId');
    const homeId = req.body.homeId || fromToken(req, 'homeId');
    const {
      suId, hospitalName, ward, admissionDate, admissionReason,
      admissionType, followUpRequired, followUpNotes
    } = req.body;

    if (!suId) throw new AppError('suId is required', 400);
    if (!hospitalName) throw new AppError('hospitalName is required', 400);
    if (!admissionDate) throw new AppError('admissionDate is required', 400);
    if (!admissionReason) throw new AppError('admissionReason is required', 400);
    if (!admissionType) throw new AppError('admissionType is required', 400);

    const rows = await query(`
      INSERT INTO hospital_admissions
        (home_id, su_id, logged_by, hospital_name, ward, admission_date, admission_reason,
         admission_type, follow_up_required, follow_up_notes, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'admitted')
      RETURNING *
    `, [
      homeId, suId, loggedBy, hospitalName, ward || null,
      admissionDate, admissionReason, admissionType,
      followUpRequired || false, followUpNotes || null
    ]);

    res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
  } catch (err) { next(err); }
});

// PUT /api/hospital-admissions/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = fromToken(req, 'homeId');
    const {
      dischargeDate, dischargeDestination, outcomeNotes,
      followUpRequired, followUpNotes, status,
      hospitalName, ward, admissionDate, admissionReason, admissionType
    } = req.body;

    const sets: string[] = [];
    const params: any[] = [];

    if (dischargeDate !== undefined) { params.push(dischargeDate); sets.push(`discharge_date = $${params.length}`); }
    if (dischargeDestination !== undefined) { params.push(dischargeDestination); sets.push(`discharge_destination = $${params.length}`); }
    if (outcomeNotes !== undefined) { params.push(outcomeNotes); sets.push(`outcome_notes = $${params.length}`); }
    if (followUpRequired !== undefined) { params.push(followUpRequired); sets.push(`follow_up_required = $${params.length}`); }
    if (followUpNotes !== undefined) { params.push(followUpNotes); sets.push(`follow_up_notes = $${params.length}`); }
    if (status !== undefined) { params.push(status); sets.push(`status = $${params.length}`); }
    if (hospitalName !== undefined) { params.push(hospitalName); sets.push(`hospital_name = $${params.length}`); }
    if (ward !== undefined) { params.push(ward); sets.push(`ward = $${params.length}`); }
    if (admissionDate !== undefined) { params.push(admissionDate); sets.push(`admission_date = $${params.length}`); }
    if (admissionReason !== undefined) { params.push(admissionReason); sets.push(`admission_reason = $${params.length}`); }
    if (admissionType !== undefined) { params.push(admissionType); sets.push(`admission_type = $${params.length}`); }

    if (sets.length === 0) { res.json({ success: true }); return; }

    sets.push(`updated_at = NOW()`);
    params.push(req.params.id);
    params.push(homeId);

    const rows = await query(
      `UPDATE hospital_admissions SET ${sets.join(', ')} WHERE id = $${params.length - 1} AND home_id = $${params.length} RETURNING *`,
      params
    );

    if (!rows.length) throw new AppError('Admission not found', 404);
    res.json({ success: true, data: rows[0] } as ApiResponse);
  } catch (err) { next(err); }
});

export default router;
