import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';

const router = Router();

function nd(v: any): string | null { return v && String(v).trim() ? String(v).trim() : null; }

router.use(authenticate);

function fromToken(req: Request, field: string): string {
  const token = req.headers.authorization?.substring(7);
  if (token) { const d = jwt.decode(token) as any; return (req.staff as any)?.[field] || d?.[field] || ''; }
  return (req.staff as any)?.[field] || '';
}

// GET /api/care-plans?suId=xxx or ?homeId=xxx
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { suId, homeId } = req.query as Record<string, string>;
    const targetHomeId = homeId || fromToken(req, 'homeId');

    let sql = `SELECT cp.*,
                      su.first_name || ' ' || su.last_name as su_name,
                      s.first_name || ' ' || s.last_name as created_by_name
               FROM care_plans cp
               JOIN service_users su ON su.id = cp.su_id
               LEFT JOIN staff s ON s.id = cp.created_by
               WHERE cp.is_active IS NOT FALSE`;
    const params: unknown[] = [];
    let idx = 1;

    if (suId) { sql += ` AND cp.su_id = $${idx++}`; params.push(suId); }
    else { sql += ` AND cp.home_id = $${idx++}`; params.push(targetHomeId); }
    sql += ' ORDER BY cp.plan_type, cp.created_at DESC';

    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/care-plans/:id
router.get('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query(
        `SELECT cp.*, su.first_name || ' ' || su.last_name as su_name,
                s.first_name || ' ' || s.last_name as created_by_name
         FROM care_plans cp
         JOIN service_users su ON su.id = cp.su_id
         LEFT JOIN staff s ON s.id = cp.created_by
         WHERE cp.id = $1`,
        [req.params.id]
      );
      if (!rows.length) throw new AppError('Care plan not found', 404);

      const updates = await query(
        `SELECT cpu.*, s.first_name || ' ' || s.last_name as updated_by_name
         FROM care_plan_updates cpu JOIN staff s ON s.id = cpu.updated_by
         WHERE cpu.care_plan_id = $1 ORDER BY cpu.created_at DESC`,
        [req.params.id]
      );

      res.json({ success: true, data: { ...rows[0] as object, updates } } as ApiResponse);
    } catch (err) { next(err); }
  }
);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST /api/care-plans
router.post('/',
  [body('planType').notEmpty().withMessage('planType is required')],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      const homeId = req.body.homeId || fromToken(req, 'homeId');
      const { suId, planType, customName, aimsOutcomes, whatICanDo, howToSupport,
              reviewFrequency, attachmentsNotes,
              medicationSupportLevel, managesOwnMeds, levelOfSupport, supportTypes,
              dateMedicationReview, regularMedications, prnMedications, otcMedications,
              prnProtocol, prnList, indicationForUse } = req.body;

      if (!suId || typeof suId !== 'string' || !UUID_RE.test(suId.trim())) {
        res.status(400).json({ success: false, error: 'suId must be a valid UUID' }); return;
      }
      if (!planType) throw new AppError('planType is required', 400);
      if (!homeId) throw new AppError('homeId is required', 400);

      const trimmedSuId = suId.trim();
      // Verify the service user exists
      const suCheck = await query('SELECT id FROM service_users WHERE id = $1 AND home_id = $2', [trimmedSuId, homeId]);
      if (suCheck.length === 0) throw new AppError('Service user not found', 404);

      // Calculate next review date
      const freqDays: Record<string, number> = {
        weekly: 7, fortnightly: 14, monthly: 30, eight_weekly: 56, yearly: 365
      };
      const days = freqDays[reviewFrequency || 'monthly'] || 30;
      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + days);

      const rows = await query(
        `INSERT INTO care_plans (su_id, home_id, plan_type, custom_name, aims_outcomes,
          what_i_can_do, how_to_support, review_frequency, last_review_date, next_review_date, created_by, is_active,
          medication_support_level, manages_own_meds, level_of_support, support_types,
          date_medication_review, regular_medications, prn_medications, otc_medications,
          prn_protocol, prn_list, indication_for_use, attachments_notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,CURRENT_DATE,$9,$10,true,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22) RETURNING *`,
        [trimmedSuId, homeId, planType, customName || null, aimsOutcomes || null,
         whatICanDo || null, howToSupport || null,
         reviewFrequency || 'monthly', nextReview.toISOString().split('T')[0], staffId,
         medicationSupportLevel || null, managesOwnMeds ?? false, levelOfSupport || null,
         supportTypes || null, nd(dateMedicationReview),
         regularMedications || null, prnMedications || null, otcMedications || null,
         prnProtocol || null, prnList || null, indicationForUse || null,
         attachmentsNotes || null]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err: any) { console.error('Care plan CREATE error:', err?.message, err?.detail); next(err); }
  }
);

// PUT /api/care-plans/:id
router.put('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      const { aimsOutcomes, whatICanDo, howToSupport, outcomeAchieved,
              reviewFrequency, updateNotes, attachmentsNotes, suSignOff, staffSignOff,
              suSignedBy, suSignedDate, staffSignedBy, staffSignedDate,
              consentNotes, consentGiven, consentDate,
              suSignatureDataurl, staffSignatureDataurl,
              medicationSupportLevel, managesOwnMeds, levelOfSupport, supportTypes,
              dateMedicationReview, regularMedications, prnMedications, otcMedications,
              prnProtocol, prnList, indicationForUse } = req.body;

      // Calculate next review
      const freqDays: Record<string, number> = {
        weekly: 7, fortnightly: 14, monthly: 30, eight_weekly: 56, yearly: 365
      };
      const freq = reviewFrequency || 'monthly';
      const days = freqDays[freq] || 30;
      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + days);

      const rows = await query(
        `UPDATE care_plans SET
          aims_outcomes            = COALESCE($1, aims_outcomes),
          what_i_can_do            = COALESCE($2, what_i_can_do),
          how_to_support           = COALESCE($3, how_to_support),
          outcome_achieved         = COALESCE($4, outcome_achieved),
          review_frequency         = $5,
          last_review_date         = CURRENT_DATE,
          next_review_date         = $6,
          reviewed_by              = $7,
          updated_at               = NOW(),
          medication_support_level = COALESCE($9,  medication_support_level),
          manages_own_meds         = COALESCE($10, manages_own_meds),
          level_of_support         = COALESCE($11, level_of_support),
          support_types            = COALESCE($12, support_types),
          date_medication_review   = COALESCE($13, date_medication_review),
          regular_medications      = COALESCE($14, regular_medications),
          prn_medications          = COALESCE($15, prn_medications),
          otc_medications          = COALESCE($16, otc_medications),
          prn_protocol             = COALESCE($17, prn_protocol),
          prn_list                 = COALESCE($18, prn_list),
          indication_for_use       = COALESCE($19, indication_for_use),
          attachments_notes        = COALESCE($20, attachments_notes),
          su_sign_off              = COALESCE($21, su_sign_off),
          staff_sign_off           = COALESCE($22, staff_sign_off),
          su_signed_by             = COALESCE($23, su_signed_by),
          su_signed_date           = COALESCE($24, su_signed_date),
          staff_signed_by          = COALESCE($25, staff_signed_by),
          staff_signed_date        = COALESCE($26, staff_signed_date),
          consent_notes            = COALESCE($27, consent_notes),
          consent_given            = COALESCE($28, consent_given),
          consent_date             = COALESCE($29, consent_date),
          su_signature_dataurl     = COALESCE($30, su_signature_dataurl),
          staff_signature_dataurl  = COALESCE($31, staff_signature_dataurl)
         WHERE id = $8 RETURNING *`,
        [aimsOutcomes, whatICanDo, howToSupport, outcomeAchieved || null,
         freq, nextReview.toISOString().split('T')[0], staffId, req.params.id,
         medicationSupportLevel ?? null, managesOwnMeds ?? null, levelOfSupport ?? null,
         supportTypes ?? null, nd(dateMedicationReview),
         regularMedications ?? null, prnMedications ?? null, otcMedications ?? null,
         prnProtocol ?? null, prnList ?? null, indicationForUse ?? null,
         attachmentsNotes ?? null, suSignOff ?? null, staffSignOff ?? null,
         suSignedBy ?? null, nd(suSignedDate), staffSignedBy ?? null, nd(staffSignedDate),
         consentNotes ?? null, consentGiven ?? null, nd(consentDate),
         suSignatureDataurl ?? null, staffSignatureDataurl ?? null]
      );
      if (!rows.length) throw new AppError('Care plan not found', 404);

      // Log the update
      if (updateNotes) {
        await query(
          'INSERT INTO care_plan_updates (care_plan_id, update_notes, updated_by) VALUES ($1,$2,$3)',
          [req.params.id, updateNotes, staffId]
        );
      }

      res.json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/care-plans/:id/read — track that a staff member read this plan
router.post('/:id/read', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      if (!staffId) { res.json({ success: true }); return; }
      await query(
        `INSERT INTO care_plan_reads (plan_id, staff_id) VALUES ($1, $2)`,
        [req.params.id, staffId]
      );
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// GET /api/care-plans/:id/reads — recent reads for a plan
router.get('/:id/reads', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query(
        `SELECT cpr.read_at, s.first_name || ' ' || s.last_name as staff_name
         FROM care_plan_reads cpr
         JOIN staff s ON s.id = cpr.staff_id
         WHERE cpr.plan_id = $1
         ORDER BY cpr.read_at DESC LIMIT 20`,
        [req.params.id]
      );
      res.json({ success: true, data: rows } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// GET /api/care-plans/reads-summary?homeId=xxx  — admin: who read which plan
router.get('/reads-summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const rows = await query(
      `SELECT cp.id as plan_id, cp.plan_type, cp.custom_name,
              su.first_name || ' ' || su.last_name as su_name,
              COUNT(cpr.id) as total_reads,
              MAX(cpr.read_at) as last_read_at,
              STRING_AGG(DISTINCT s.first_name || ' ' || s.last_name, ', ') as readers
       FROM care_plans cp
       JOIN service_users su ON su.id = cp.su_id
       LEFT JOIN care_plan_reads cpr ON cpr.plan_id = cp.id
       LEFT JOIN staff s ON s.id = cpr.staff_id
       WHERE cp.home_id = $1 AND cp.is_active IS NOT FALSE
       GROUP BY cp.id, su.first_name, su.last_name
       ORDER BY su.last_name, cp.plan_type`,
      [homeId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// DELETE /api/care-plans/:id (soft delete)
router.delete('/:id', requireRole('home_manager', 'group_admin'),
  param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await query('UPDATE care_plans SET is_active = false WHERE id = $1', [req.params.id]);
      res.json({ success: true, message: 'Care plan archived' } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
