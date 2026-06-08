import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';
import { assertResidentAccess } from '../utils/residentAccess';

const router = Router();

function nd(v: any): string | null { return v && String(v).trim() ? String(v).trim() : null; }

router.use(authenticate);

function fromToken(req: Request, field: string): string {
  const token = req.headers.authorization?.substring(7);
  if (token) { const d = jwt.decode(token) as any; return (req.staff as any)?.[field] || d?.[field] || ''; }
  return (req.staff as any)?.[field] || '';
}

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { suId, homeId } = req.query as Record<string, string>;
    if (suId) await assertResidentAccess(req, suId);
    const targetHomeId = homeId || fromToken(req, 'homeId');
    let sql = `SELECT ra.*, su.first_name || ' ' || su.last_name as su_name
               FROM risk_assessments ra JOIN service_users su ON su.id = ra.su_id
               WHERE ra.is_active = true`;
    const params: unknown[] = [];
    let idx = 1;
    if (suId) { sql += ` AND ra.su_id = $${idx++}`; params.push(suId); }
    else { sql += ` AND ra.home_id = $${idx++}`; params.push(targetHomeId); }
    sql += ' ORDER BY ra.created_at DESC';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

router.get('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query(
        `SELECT ra.*, su.first_name || ' ' || su.last_name as su_name
         FROM risk_assessments ra JOIN service_users su ON su.id = ra.su_id WHERE ra.id = $1`,
        [req.params.id]
      );
      if (!rows.length) throw new AppError('Risk assessment not found', 404);
      const updates = await query(
        `SELECT rau.*, s.first_name || ' ' || s.last_name as updated_by_name
         FROM risk_assessment_updates rau JOIN staff s ON s.id = rau.updated_by
         WHERE rau.risk_id = $1 ORDER BY rau.created_at DESC`,
        [req.params.id]
      );
      res.json({ success: true, data: { ...rows[0] as object, updates } } as ApiResponse);
    } catch (err) { next(err); }
  }
);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.post('/',
  [body('assessmentName').notEmpty().withMessage('assessmentName is required')],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      const homeId = req.body.homeId || fromToken(req, 'homeId');
      const { suId, assessmentName, description, riskLevel, currentRiskLevel,
              whoIsAtRisk, isHistorical, whatCouldHappen, triggers,
              protectiveFactors, managementPlan, reviewFrequency,
              historicalContext, riskRating,
              riskBeforeIntervention, riskScore, riskRatingOption,
              evaluationOfRisk, riskAcceptable, riskAfterControls } = req.body;

      if (!suId || typeof suId !== 'string' || !UUID_RE.test(suId.trim())) {
        res.status(400).json({ success: false, error: 'suId must be a valid UUID' }); return;
      }
      const trimmedSuId = suId.trim();

      const freqDays: Record<string, number> = { weekly: 7, fortnightly: 14, monthly: 30, eight_weekly: 56, yearly: 365 };
      const days = freqDays[reviewFrequency || 'monthly'] || 30;
      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + days);

      const rows = await query(
        `INSERT INTO risk_assessments (su_id, home_id, assessment_name, description, risk_level,
          current_risk_level, who_is_at_risk, is_historical, what_could_happen, triggers,
          protective_factors, management_plan, review_frequency, next_review_date, created_by,
          historical_context, risk_rating,
          risk_before_intervention, risk_score, risk_rating_option,
          evaluation_of_risk, risk_acceptable, risk_after_controls)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23) RETURNING *`,
        [trimmedSuId, homeId, assessmentName, description || null, riskLevel || 'low',
         currentRiskLevel || riskLevel || 'low', whoIsAtRisk || null,
         isHistorical || false, whatCouldHappen || null, triggers || null,
         protectiveFactors || null, managementPlan || null,
         reviewFrequency || 'monthly', nextReview.toISOString().split('T')[0], staffId,
         historicalContext || null, riskRating || currentRiskLevel || riskLevel || 'low',
         riskBeforeIntervention || null, riskScore ?? null, riskRatingOption || null,
         evaluationOfRisk || null, riskAcceptable || null, riskAfterControls || null]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.put('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      const { description, currentRiskLevel, managementPlan, updateNotes,
              triggers, protectiveFactors, reviewFrequency,
              historicalContext, riskRating,
              riskBeforeIntervention, riskScore, riskRatingOption,
              evaluationOfRisk, riskAcceptable, riskAfterControls,
              signedOff, signedOffBy, signedOffDate } = req.body;
      const freqDays: Record<string, number> = { weekly: 7, fortnightly: 14, monthly: 30, eight_weekly: 56, yearly: 365 };
      const freq = reviewFrequency || 'monthly';
      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + (freqDays[freq] || 30));

      await query(
        `UPDATE risk_assessments SET
          description                = COALESCE($1,  description),
          current_risk_level         = COALESCE($2,  current_risk_level),
          management_plan            = COALESCE($3,  management_plan),
          triggers                   = COALESCE($4,  triggers),
          protective_factors         = COALESCE($5,  protective_factors),
          review_frequency           = $6,
          last_review_date           = CURRENT_DATE,
          next_review_date           = $7,
          reviewed_by                = $8,
          updated_at                 = NOW(),
          historical_context         = COALESCE($10, historical_context),
          risk_rating                = COALESCE($11, risk_rating),
          risk_before_intervention   = COALESCE($12, risk_before_intervention),
          risk_score                 = COALESCE($13, risk_score),
          risk_rating_option         = COALESCE($14, risk_rating_option),
          evaluation_of_risk         = COALESCE($15, evaluation_of_risk),
          risk_acceptable            = COALESCE($16, risk_acceptable),
          risk_after_controls        = COALESCE($17, risk_after_controls),
          signed_off                 = COALESCE($18, signed_off),
          signed_off_by              = COALESCE($19, signed_off_by),
          signed_off_date            = COALESCE($20, signed_off_date)
         WHERE id = $9`,
        [description, currentRiskLevel, managementPlan, triggers, protectiveFactors,
         freq, nextReview.toISOString().split('T')[0], staffId, req.params.id,
         historicalContext ?? null, riskRating ?? null,
         riskBeforeIntervention ?? null, riskScore ?? null, riskRatingOption ?? null,
         evaluationOfRisk ?? null, riskAcceptable ?? null, riskAfterControls ?? null,
         signedOff ?? null, signedOffBy ?? null, nd(signedOffDate)]
      );

      if (updateNotes) {
        await query(
          'INSERT INTO risk_assessment_updates (risk_id, update_notes, new_risk_level, updated_by) VALUES ($1,$2,$3,$4)',
          [req.params.id, updateNotes, currentRiskLevel || null, staffId]
        );
      }
      res.json({ success: true, message: 'Risk assessment updated' } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.delete('/:id', requireRole('home_manager', 'group_admin'),
  param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await query('UPDATE risk_assessments SET is_active = false WHERE id = $1', [req.params.id]);
      res.json({ success: true, message: 'Risk assessment archived' } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
