import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';
import { assertResidentAccess } from '../utils/residentAccess';

const router = Router();
router.use(authenticate);

function tok(req: Request, field: string): string {
  const t = req.headers.authorization?.substring(7);
  if (t) { const d = jwt.decode(t) as any; return (req.staff as any)?.[field] || d?.[field] || ''; }
  return (req.staff as any)?.[field] || '';
}

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS wound_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    home_id UUID NOT NULL,
    su_id UUID NOT NULL,
    assessed_by UUID NOT NULL,
    assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    wound_location TEXT NOT NULL,
    wound_type TEXT NOT NULL CHECK (wound_type IN ('pressure_ulcer','surgical','leg_ulcer','diabetic','traumatic','other')),
    stage TEXT CHECK (stage IN ('1','2','3','4','unstageable','deep_tissue','none')),
    size_length_cm NUMERIC(5,1),
    size_width_cm NUMERIC(5,1),
    size_depth_cm NUMERIC(5,1),
    wound_bed TEXT,
    exudate_amount TEXT CHECK (exudate_amount IN ('none','low','moderate','high')),
    exudate_type TEXT,
    surrounding_skin TEXT,
    dressing_used TEXT,
    dressing_frequency TEXT,
    pain_score INTEGER CHECK (pain_score BETWEEN 0 AND 10),
    healing_status TEXT CHECK (healing_status IN ('improving','static','deteriorating','healed')),
    notes TEXT,
    next_review_date DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active','healed','closed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;

// Ensure table exists on module load
query(CREATE_TABLE, []).catch(console.error);

// GET /api/wound-care?homeId=&suId=&status=
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || tok(req, 'homeId');
    const { suId, status } = req.query as Record<string, string>;
    if (suId) await assertResidentAccess(req, suId);

    let sql = `
      SELECT wa.*,
             su.first_name || ' ' || su.last_name AS su_name,
             s.first_name || ' ' || s.last_name AS assessed_by_name
      FROM wound_assessments wa
      JOIN service_users su ON su.id = wa.su_id
      JOIN staff s ON s.id = wa.assessed_by
      WHERE wa.home_id = $1`;
    const params: unknown[] = [homeId];
    let idx = 2;
    if (suId)   { sql += ` AND wa.su_id = $${idx++}`;    params.push(suId); }
    if (status) { sql += ` AND wa.status = $${idx++}`;   params.push(status); }
    sql += ' ORDER BY wa.assessment_date DESC, wa.created_at DESC LIMIT 200';

    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/wound-care/:id
router.get('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query(
        `SELECT wa.*,
                su.first_name || ' ' || su.last_name AS su_name,
                s.first_name || ' ' || s.last_name AS assessed_by_name
         FROM wound_assessments wa
         JOIN service_users su ON su.id = wa.su_id
         JOIN staff s ON s.id = wa.assessed_by
         WHERE wa.id = $1`,
        [req.params.id]
      );
      if (!rows.length) throw new AppError('Wound assessment not found', 404);
      res.json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/wound-care
router.post('/',
  [body('suId').isUUID(), body('woundLocation').notEmpty(), body('woundType').notEmpty()],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = req.body.homeId || tok(req, 'homeId');
      const assessedBy = tok(req, 'staffId');
      const {
        suId, assessmentDate, woundLocation, woundType, stage,
        sizeLengthCm, sizeWidthCm, sizeDepthCm, woundBed,
        exudateAmount, exudateType, surroundingSkin, dressingUsed,
        dressingFrequency, painScore, healingStatus, notes,
        nextReviewDate, status,
      } = req.body;

      const rows = await query(
        `INSERT INTO wound_assessments (
           home_id, su_id, assessed_by, assessment_date, wound_location, wound_type, stage,
           size_length_cm, size_width_cm, size_depth_cm, wound_bed,
           exudate_amount, exudate_type, surrounding_skin, dressing_used,
           dressing_frequency, pain_score, healing_status, notes,
           next_review_date, status
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
         RETURNING *`,
        [
          homeId, suId, assessedBy,
          assessmentDate || new Date().toISOString().slice(0, 10),
          woundLocation, woundType, stage || null,
          sizeLengthCm || null, sizeWidthCm || null, sizeDepthCm || null,
          woundBed || null, exudateAmount || null, exudateType || null,
          surroundingSkin || null, dressingUsed || null, dressingFrequency || null,
          painScore != null ? parseInt(painScore) : null,
          healingStatus || null, notes || null,
          nextReviewDate || null, status || 'active',
        ]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// PUT /api/wound-care/:id
router.put('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        assessmentDate, woundLocation, woundType, stage,
        sizeLengthCm, sizeWidthCm, sizeDepthCm, woundBed,
        exudateAmount, exudateType, surroundingSkin, dressingUsed,
        dressingFrequency, painScore, healingStatus, notes,
        nextReviewDate, status,
      } = req.body;

      const rows = await query(
        `UPDATE wound_assessments SET
           assessment_date = COALESCE($1, assessment_date),
           wound_location = COALESCE($2, wound_location),
           wound_type = COALESCE($3, wound_type),
           stage = $4,
           size_length_cm = $5, size_width_cm = $6, size_depth_cm = $7,
           wound_bed = $8, exudate_amount = $9, exudate_type = $10,
           surrounding_skin = $11, dressing_used = $12, dressing_frequency = $13,
           pain_score = $14, healing_status = $15, notes = $16,
           next_review_date = $17, status = COALESCE($18, status)
         WHERE id = $19
         RETURNING *`,
        [
          assessmentDate || null, woundLocation || null, woundType || null,
          stage || null,
          sizeLengthCm || null, sizeWidthCm || null, sizeDepthCm || null,
          woundBed || null, exudateAmount || null, exudateType || null,
          surroundingSkin || null, dressingUsed || null, dressingFrequency || null,
          painScore != null ? parseInt(painScore) : null,
          healingStatus || null, notes || null, nextReviewDate || null,
          status || null, req.params.id,
        ]
      );
      if (!rows.length) throw new AppError('Wound assessment not found', 404);
      res.json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
