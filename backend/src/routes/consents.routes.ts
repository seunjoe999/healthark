import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
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

// GET /api/consents?suId=&homeId=
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const suId = req.query.suId as string;
    const homeId = (req.query.homeId as string) || tok(req, 'homeId');
    if (!suId) { res.json({ success: true, data: [] } as ApiResponse); return; }
    await assertResidentAccess(req, suId);
    const rows = await query(
      `SELECT c.*,
              COALESCE(s.first_name || ' ' || s.last_name, 'Unknown') AS created_by_name
       FROM su_consents c
       LEFT JOIN staff s ON s.id = c.created_by
       WHERE c.su_id = $1 AND c.home_id = $2
       ORDER BY c.consent_type`,
      [suId, homeId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/consents — upsert (one record per su+type)
router.post('/',
  [body('suId').isUUID(), body('consentType').notEmpty()],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = tok(req, 'staffId');
      const homeId = req.body.homeId || tok(req, 'homeId');
      const {
        suId, consentType, hasCapacity, capacityNotes, consentGiven,
        consentMethod, bestInterestDecision, decisionMaker,
        reviewDate, notes, suSignedBy, suSignedDate, staffSignedBy, staffSignedDate,
      } = req.body;

      const rows = await query(
        `INSERT INTO su_consents
           (su_id, home_id, consent_type, has_capacity, capacity_notes, consent_given,
            consent_method, best_interest_decision, decision_maker,
            review_date, notes, created_by,
            su_signed_by, su_signed_date, staff_signed_by, staff_signed_date, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW())
         ON CONFLICT (su_id, consent_type) DO UPDATE SET
           has_capacity = EXCLUDED.has_capacity,
           capacity_notes = EXCLUDED.capacity_notes,
           consent_given = EXCLUDED.consent_given,
           consent_method = EXCLUDED.consent_method,
           best_interest_decision = EXCLUDED.best_interest_decision,
           decision_maker = EXCLUDED.decision_maker,
           review_date = EXCLUDED.review_date,
           notes = EXCLUDED.notes,
           su_signed_by = EXCLUDED.su_signed_by,
           su_signed_date = EXCLUDED.su_signed_date,
           staff_signed_by = EXCLUDED.staff_signed_by,
           staff_signed_date = EXCLUDED.staff_signed_date,
           updated_at = NOW()
         RETURNING *`,
        [
          suId, homeId, consentType,
          hasCapacity || 'yes', capacityNotes || null,
          consentGiven ?? false, consentMethod || null,
          bestInterestDecision || null, decisionMaker || null,
          reviewDate || null, notes || null, staffId || null,
          suSignedBy || null, suSignedDate || null,
          staffSignedBy || null, staffSignedDate || null,
        ]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// DELETE /api/consents/:id
router.delete('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await query('DELETE FROM su_consents WHERE id = $1', [req.params.id]);
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
