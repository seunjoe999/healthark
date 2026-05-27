import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';

const router = Router();
router.use(authenticate);

function tok(req: Request, field: string): string {
  const t = req.headers.authorization?.substring(7);
  if (t) { const d = jwt.decode(t) as any; return (req.staff as any)?.[field] || d?.[field] || ''; }
  return (req.staff as any)?.[field] || '';
}

// GET /api/medicine-risk — all assessments for the home
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = tok(req, 'homeId');
    const { suId } = req.query as Record<string, string>;
    let sql = `
      SELECT mr.*, s.first_name || ' ' || s.last_name AS assessed_by_name,
             su.first_name || ' ' || su.last_name AS su_name
      FROM medicine_risk_assessments mr
      JOIN staff s ON s.id = mr.assessed_by
      JOIN service_users su ON su.id = mr.su_id
      WHERE mr.home_id = $1`;
    const params: unknown[] = [homeId];
    if (suId) { sql += ` AND mr.su_id = $2`; params.push(suId); }
    sql += ' ORDER BY mr.assessed_at DESC LIMIT 200';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/medicine-risk/latest — latest assessment per service user
router.get('/latest', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = tok(req, 'homeId');
    const rows = await query(`
      SELECT DISTINCT ON (su.id)
             mr.*,
             su.id AS su_id, su.first_name || ' ' || su.last_name AS su_name, su.room_number
      FROM service_users su
      LEFT JOIN medicine_risk_assessments mr ON mr.su_id = su.id AND mr.home_id = $1
      WHERE su.home_id = $1 AND su.status = 'live'
      ORDER BY su.id, mr.assessed_at DESC NULLS LAST`, [homeId]);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/medicine-risk
router.post('/', [body('suId').isUUID()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = tok(req, 'homeId');
      const staffId = tok(req, 'staffId');
      const {
        suId, selfMedicate, selfMedicateNotes, swallowingRisk, swallowingNotes,
        covertMeds, covertNotes, prnProtocol, prnNotes, crushingRequired, crushingNotes,
        administrationRoute, knownAllergies, storageLocation,
        riskLevel, riskNotes, reviewDate,
      } = req.body;
      const rows = await query(
        `INSERT INTO medicine_risk_assessments
           (home_id, su_id, assessed_by, self_medicate, self_medicate_notes,
            swallowing_risk, swallowing_notes, covert_meds, covert_notes,
            prn_protocol, prn_notes, crushing_required, crushing_notes,
            administration_route, known_allergies, storage_location,
            risk_level, risk_notes, review_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`,
        [homeId, suId, staffId,
         selfMedicate ?? false, selfMedicateNotes || null,
         swallowingRisk || 'none', swallowingNotes || null,
         covertMeds ?? false, covertNotes || null,
         prnProtocol ?? false, prnNotes || null,
         crushingRequired ?? false, crushingNotes || null,
         administrationRoute || 'oral', knownAllergies || null,
         storageLocation || null, riskLevel || 'low',
         riskNotes || null, reviewDate || null]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// DELETE /api/medicine-risk/:id
router.delete('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await query('DELETE FROM medicine_risk_assessments WHERE id=$1', [req.params.id]);
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
