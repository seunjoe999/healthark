import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';
import { assertResidentAccess, getAssignedSuIds, getRole, getStaffId, RESTRICTED_ROLES } from '../utils/residentAccess';

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
    if (suId) await assertResidentAccess(req, suId);
    let sql = `
      SELECT mr.*, s.first_name || ' ' || s.last_name AS assessed_by_name,
             su.first_name || ' ' || su.last_name AS su_name
      FROM medicine_risk_assessments mr
      JOIN staff s ON s.id = mr.assessed_by
      JOIN service_users su ON su.id = mr.su_id
      WHERE mr.home_id = $1`;
    const params: unknown[] = [homeId];
    if (suId) { sql += ` AND mr.su_id = $2`; params.push(suId); }
    else if (RESTRICTED_ROLES.includes(getRole(req))) {
      const ids = await getAssignedSuIds(getStaffId(req));
      if (!ids.length) return res.json({ success: true, data: [] } as ApiResponse);
      params.push(ids); sql += ` AND mr.su_id = ANY($${params.length})`;
    }
    sql += ' ORDER BY mr.assessed_at DESC LIMIT 200';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/medicine-risk/latest — latest full assessment per service user
router.get('/latest', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = tok(req, 'homeId');
    const params: unknown[] = [homeId];
    let residentFilter = '';
    if (RESTRICTED_ROLES.includes(getRole(req))) {
      const ids = await getAssignedSuIds(getStaffId(req));
      if (!ids.length) return res.json({ success: true, data: [] } as ApiResponse);
      params.push(ids); residentFilter = ` AND su.id = ANY($${params.length})`;
    }
    const rows = await query(`
      SELECT DISTINCT ON (su.id)
             su.id AS su_id, su.first_name || ' ' || su.last_name AS su_name, su.room_number,
             mr.*
      FROM service_users su
      LEFT JOIN medicine_risk_assessments mr ON mr.su_id = su.id AND mr.home_id = $1
      WHERE su.home_id = $1 AND su.status = 'live'${residentFilter}
      ORDER BY su.id, mr.assessed_at DESC NULLS LAST`, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/medicine-risk/:id — single assessment plus its update-tracking history
router.get('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query(
        `SELECT mr.*, s.first_name || ' ' || s.last_name AS assessed_by_name,
                su.first_name || ' ' || su.last_name AS su_name
         FROM medicine_risk_assessments mr
         JOIN staff s ON s.id = mr.assessed_by
         JOIN service_users su ON su.id = mr.su_id
         WHERE mr.id = $1`,
        [req.params.id]
      );
      if (!rows.length) { res.status(404).json({ success: false, error: 'Assessment not found' }); return; }
      const updates = await query(
        `SELECT mru.*, s.first_name || ' ' || s.last_name as updated_by_name
         FROM medicine_risk_updates mru JOIN staff s ON s.id = mru.updated_by
         WHERE mru.risk_id = $1 ORDER BY mru.created_at DESC`,
        [req.params.id]
      );
      res.json({ success: true, data: { ...rows[0] as object, updates } } as ApiResponse);
    } catch (err) { next(err); }
  }
);

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
        riskLevel, riskNotes, reviewDate, triggers, protectiveFactors, attachmentNotes,
        controlledMeds, controlledNotes, controlledWitness, controlledWitnessSig,
        documentUrl, documentName, signedOffBy, signedOffDate, staffSignature,
        reviewFrequency, riskDescription, riskBeforeIntervention, whoIsAtRisk,
        isHistorical, whatCouldHappen,
      } = req.body;
      const rows = await query(
        `INSERT INTO medicine_risk_assessments
           (home_id, su_id, assessed_by, self_medicate, self_medicate_notes,
            swallowing_risk, swallowing_notes, covert_meds, covert_notes,
            prn_protocol, prn_notes, crushing_required, crushing_notes,
            administration_route, known_allergies, storage_location,
            risk_level, risk_notes, review_date, triggers, protective_factors, attachment_notes,
            controlled_meds, controlled_notes, controlled_witness, controlled_witness_sig,
            document_url, document_name, signed_off_by, signed_off_date, staff_signature,
            review_frequency, risk_description, risk_before_intervention, who_is_at_risk,
            is_historical, what_could_happen)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37) RETURNING *`,
        [homeId, suId, staffId,
         selfMedicate ?? false, selfMedicateNotes || null,
         swallowingRisk || 'none', swallowingNotes || null,
         covertMeds ?? false, covertNotes || null,
         prnProtocol ?? false, prnNotes || null,
         crushingRequired ?? false, crushingNotes || null,
         administrationRoute || 'oral', knownAllergies || null,
         storageLocation || null, riskLevel || 'low',
         riskNotes || null, reviewDate || null,
         triggers || null, protectiveFactors || null, attachmentNotes || null,
         controlledMeds ?? false, controlledNotes || null,
         controlledWitness || null, controlledWitnessSig || null,
         documentUrl || null, documentName || null,
         signedOffBy || null, signedOffDate || null, staffSignature || null,
         reviewFrequency || null, riskDescription || null, riskBeforeIntervention || null,
         whoIsAtRisk || null, isHistorical ?? false, whatCouldHappen || null]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// PUT /api/medicine-risk/:id — update existing assessment
router.put('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = tok(req, 'staffId');
      const {
        selfMedicate, selfMedicateNotes, swallowingRisk, swallowingNotes,
        covertMeds, covertNotes, prnProtocol, prnNotes, crushingRequired, crushingNotes,
        administrationRoute, knownAllergies, storageLocation,
        riskLevel, riskNotes, reviewDate, triggers, protectiveFactors, attachmentNotes,
        controlledMeds, controlledNotes, controlledWitness, controlledWitnessSig,
        documentUrl, documentName, signedOffBy, signedOffDate, staffSignature,
        reviewFrequency, riskDescription, riskBeforeIntervention, whoIsAtRisk,
        isHistorical, whatCouldHappen, updateNotes,
      } = req.body;
      // COALESCE every optional column against its existing value so a
      // lightweight partial update (e.g. Record Update — riskLevel + notes
      // only) never wipes out the rest of the assessment.
      const rows = await query(
        `UPDATE medicine_risk_assessments SET
           assessed_by = $1,
           self_medicate = COALESCE($2, self_medicate), self_medicate_notes = COALESCE($3, self_medicate_notes),
           swallowing_risk = COALESCE($4, swallowing_risk), swallowing_notes = COALESCE($5, swallowing_notes),
           covert_meds = COALESCE($6, covert_meds), covert_notes = COALESCE($7, covert_notes),
           prn_protocol = COALESCE($8, prn_protocol), prn_notes = COALESCE($9, prn_notes),
           crushing_required = COALESCE($10, crushing_required), crushing_notes = COALESCE($11, crushing_notes),
           administration_route = COALESCE($12, administration_route), known_allergies = COALESCE($13, known_allergies),
           storage_location = COALESCE($14, storage_location),
           risk_level = COALESCE($15, risk_level), risk_notes = COALESCE($16, risk_notes), review_date = COALESCE($17, review_date),
           triggers = COALESCE($18, triggers), protective_factors = COALESCE($19, protective_factors),
           attachment_notes = COALESCE($20, attachment_notes),
           controlled_meds = COALESCE($22, controlled_meds), controlled_notes = COALESCE($23, controlled_notes),
           controlled_witness = COALESCE($24, controlled_witness), controlled_witness_sig = COALESCE($25, controlled_witness_sig),
           document_url = COALESCE($26, document_url), document_name = COALESCE($27, document_name),
           signed_off_by = COALESCE($28, signed_off_by), signed_off_date = COALESCE($29, signed_off_date),
           staff_signature = COALESCE($30, staff_signature),
           review_frequency = COALESCE($31, review_frequency), risk_description = COALESCE($32, risk_description),
           risk_before_intervention = COALESCE($33, risk_before_intervention),
           who_is_at_risk = COALESCE($34, who_is_at_risk), is_historical = COALESCE($35, is_historical),
           what_could_happen = COALESCE($36, what_could_happen),
           assessed_at = NOW()
         WHERE id = $21 RETURNING *`,
        [staffId,
         selfMedicate ?? null, selfMedicateNotes ?? null,
         swallowingRisk ?? null, swallowingNotes ?? null,
         covertMeds ?? null, covertNotes ?? null,
         prnProtocol ?? null, prnNotes ?? null,
         crushingRequired ?? null, crushingNotes ?? null,
         administrationRoute ?? null, knownAllergies ?? null,
         storageLocation ?? null, riskLevel ?? null,
         riskNotes ?? null, reviewDate ?? null,
         triggers ?? null, protectiveFactors ?? null, attachmentNotes ?? null,
         req.params.id,
         controlledMeds ?? null, controlledNotes ?? null,
         controlledWitness ?? null, controlledWitnessSig ?? null,
         documentUrl ?? null, documentName ?? null,
         signedOffBy ?? null, signedOffDate ?? null, staffSignature ?? null,
         reviewFrequency ?? null, riskDescription ?? null, riskBeforeIntervention ?? null,
         whoIsAtRisk ?? null, isHistorical ?? null, whatCouldHappen ?? null]
      );

      if (updateNotes) {
        await query(
          'INSERT INTO medicine_risk_updates (risk_id, update_notes, new_risk_level, updated_by) VALUES ($1,$2,$3,$4)',
          [req.params.id, updateNotes, riskLevel || null, staffId]
        );
      }

      res.json({ success: true, data: rows[0] } as ApiResponse);
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
