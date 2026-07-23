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

function tok(req: Request, field: string): string {
  const t = req.headers.authorization?.substring(7);
  if (t) { const d = jwt.decode(t) as any; return (req.staff as any)?.[field] || d?.[field] || ''; }
  return (req.staff as any)?.[field] || '';
}

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS peep_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    home_id UUID NOT NULL,
    su_id UUID NOT NULL,
    created_by UUID NOT NULL,
    review_date DATE,
    mobility_level TEXT NOT NULL CHECK (mobility_level IN ('independent','assisted_1','assisted_2','hoist','bedbound','wheelchair')),
    can_self_evacuate BOOLEAN DEFAULT false,
    evacuation_method TEXT NOT NULL,
    equipment_needed TEXT,
    number_of_staff_required INTEGER DEFAULT 1,
    assembly_point TEXT,
    special_considerations TEXT,
    known_to_fire_service BOOLEAN DEFAULT false,
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`;

router.use(async (_req, _res, next) => {
  try { await query(CREATE_TABLE, []); } catch (_) {}
  next();
});

// GET /api/peep?homeId=&suId=
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || tok(req, 'homeId');
    const { suId } = req.query as Record<string, string>;

    let sql = `
      SELECT pp.*,
             su.first_name || ' ' || su.last_name AS su_name,
             s.first_name || ' ' || s.last_name AS created_by_name
      FROM peep_plans pp
      JOIN service_users su ON su.id = pp.su_id
      JOIN staff s ON s.id = pp.created_by
      WHERE pp.home_id = $1`;
    const params: unknown[] = [homeId];
    if (suId) { sql += ' AND pp.su_id = $2'; params.push(suId); }
    sql += ' ORDER BY pp.updated_at DESC';

    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/peep/summary?homeId=
router.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || tok(req, 'homeId');

    // All active residents with their latest PEEP plan (if any)
    const rows = await query(
      `SELECT
         su.id AS su_id,
         su.first_name || ' ' || su.last_name AS su_name,
         su.date_of_birth,
         pp.id AS peep_id,
         pp.mobility_level,
         pp.evacuation_method,
         pp.number_of_staff_required,
         pp.assembly_point,
         pp.can_self_evacuate,
         pp.review_date,
         pp.is_active,
         pp.updated_at AS peep_updated_at
       FROM service_users su
       LEFT JOIN LATERAL (
         SELECT * FROM peep_plans
         WHERE su_id = su.id AND home_id = $1 AND is_active = true
         ORDER BY updated_at DESC LIMIT 1
       ) pp ON true
       WHERE su.home_id = $1 AND su.status = 'live'
       ORDER BY su.first_name, su.last_name`,
      [homeId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/peep/:id
router.get('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query(
        `SELECT pp.*,
                su.first_name || ' ' || su.last_name AS su_name,
                s.first_name || ' ' || s.last_name AS created_by_name
         FROM peep_plans pp
         JOIN service_users su ON su.id = pp.su_id
         JOIN staff s ON s.id = pp.created_by
         WHERE pp.id = $1`,
        [req.params.id]
      );
      if (!rows.length) throw new AppError('PEEP plan not found', 404);
      res.json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/peep
router.post('/',
  [body('suId').isUUID(), body('mobilityLevel').notEmpty(), body('evacuationMethod').notEmpty()],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = req.body.homeId || tok(req, 'homeId');
      const createdBy = tok(req, 'staffId');
      const {
        suId, reviewDate, mobilityLevel, canSelfEvacuate, evacuationMethod,
        equipmentNeeded, numberOfStaffRequired, assemblyPoint,
        specialConsiderations, knownToFireService,
      } = req.body;

      // Deactivate old plans for this resident
      await query(
        'UPDATE peep_plans SET is_active = false WHERE su_id = $1 AND home_id = $2',
        [suId, homeId]
      );

      const rows = await query(
        `INSERT INTO peep_plans (
           home_id, su_id, created_by, review_date, mobility_level,
           can_self_evacuate, evacuation_method, equipment_needed,
           number_of_staff_required, assembly_point, special_considerations,
           known_to_fire_service, is_active
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true)
         RETURNING *`,
        [
          homeId, suId, createdBy, reviewDate || null, mobilityLevel,
          canSelfEvacuate || false, evacuationMethod,
          equipmentNeeded || null, numberOfStaffRequired || 1,
          assemblyPoint || null, specialConsiderations || null,
          knownToFireService || false,
        ]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// PUT /api/peep/:id
router.put('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reviewedBy = tok(req, 'staffId');
      const homeId = tok(req, 'homeId');
      const {
        reviewDate, mobilityLevel, canSelfEvacuate, evacuationMethod,
        equipmentNeeded, numberOfStaffRequired, assemblyPoint,
        specialConsiderations, knownToFireService, isActive,
      } = req.body;

      const rows = await query(
        `UPDATE peep_plans SET
           review_date = COALESCE($1, review_date),
           mobility_level = COALESCE($2, mobility_level),
           can_self_evacuate = COALESCE($3, can_self_evacuate),
           evacuation_method = COALESCE($4, evacuation_method),
           equipment_needed = $5,
           number_of_staff_required = COALESCE($6, number_of_staff_required),
           assembly_point = $7,
           special_considerations = $8,
           known_to_fire_service = COALESCE($9, known_to_fire_service),
           is_active = COALESCE($10, is_active),
           reviewed_by = $11,
           reviewed_at = NOW(),
           updated_at = NOW()
         WHERE id = $12 AND home_id = $13
         RETURNING *`,
        [
          reviewDate || null, mobilityLevel || null,
          canSelfEvacuate != null ? canSelfEvacuate : null,
          evacuationMethod || null, equipmentNeeded || null,
          numberOfStaffRequired || null, assemblyPoint || null,
          specialConsiderations || null, knownToFireService != null ? knownToFireService : null,
          isActive != null ? isActive : null,
          reviewedBy, req.params.id, homeId,
        ]
      );
      if (!rows.length) throw new AppError('PEEP plan not found', 404);
      res.json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
