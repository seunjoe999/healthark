import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { query } from '../config/database';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';

const router = Router();
router.use(authenticate);

function fromToken(req: Request, field: string): string {
  const token = req.headers.authorization?.substring(7);
  if (token) { const d = jwt.decode(token) as any; return (req.staff as any)?.[field] || d?.[field] || ''; }
  return (req.staff as any)?.[field] || '';
}

const initWaterlow = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS waterlow_scores (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      su_id UUID NOT NULL,
      home_id UUID,
      assessed_by UUID,
      build_score INTEGER DEFAULT 0,
      skin_score INTEGER DEFAULT 0,
      sex_age_score INTEGER DEFAULT 0,
      malnutrition_score INTEGER DEFAULT 0,
      continence_score INTEGER DEFAULT 0,
      mobility_score INTEGER DEFAULT 0,
      tissue_risk_score INTEGER DEFAULT 0,
      neuro_risk_score INTEGER DEFAULT 0,
      surgery_risk_score INTEGER DEFAULT 0,
      med_risk_score INTEGER DEFAULT 0,
      tissue_risks JSONB DEFAULT '[]',
      neuro_risks JSONB DEFAULT '[]',
      surgery_risks JSONB DEFAULT '[]',
      med_risks JSONB DEFAULT '[]',
      total_score INTEGER DEFAULT 0,
      risk_level TEXT,
      notes TEXT,
      assessed_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
};
initWaterlow().catch(() => {});

const initRepositioning = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS repositioning_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      su_id UUID NOT NULL,
      home_id UUID,
      staff_id UUID,
      position TEXT NOT NULL,
      skin_integrity_ok BOOLEAN DEFAULT true,
      pain_free BOOLEAN DEFAULT true,
      notes TEXT,
      turned_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
};
initRepositioning().catch(() => {});

// ── Waterlow routes ───────────────────────────────────────────────
router.get('/waterlow/:suId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await query<any>(
      `SELECT w.*, s.first_name || ' ' || s.last_name as assessed_by_name
       FROM waterlow_scores w LEFT JOIN staff s ON s.id = w.assessed_by
       WHERE w.su_id = $1 ORDER BY w.assessed_at DESC LIMIT 20`,
      [req.params.suId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

router.post('/waterlow', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const staffId = fromToken(req, 'staffId');
    const {
      suId, homeId, buildScore, skinScore, sexAgeScore, malnutritionScore,
      continenceScore, mobilityScore, tissueRiskScore, neuroRiskScore,
      surgeryRiskScore, medRiskScore, tissueRisks, neuroRisks, surgeryRisks, medRisks,
      totalScore, riskLevel, notes, assessedBy,
    } = req.body;
    const rows = await query<any>(
      `INSERT INTO waterlow_scores
        (su_id, home_id, assessed_by, build_score, skin_score, sex_age_score, malnutrition_score,
         continence_score, mobility_score, tissue_risk_score, neuro_risk_score, surgery_risk_score,
         med_risk_score, tissue_risks, neuro_risks, surgery_risks, med_risks, total_score, risk_level, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING *`,
      [suId, homeId || null, assessedBy || staffId || null,
       buildScore ?? 0, skinScore ?? 0, sexAgeScore ?? 0, malnutritionScore ?? 0,
       continenceScore ?? 0, mobilityScore ?? 0, tissueRiskScore ?? 0, neuroRiskScore ?? 0,
       surgeryRiskScore ?? 0, medRiskScore ?? 0,
       JSON.stringify(tissueRisks || []), JSON.stringify(neuroRisks || []),
       JSON.stringify(surgeryRisks || []), JSON.stringify(medRisks || []),
       totalScore ?? 0, riskLevel || null, notes || null]
    );
    res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
  } catch (err) { next(err); }
});

// ── Repositioning routes ──────────────────────────────────────────
router.get('/repositioning/:suId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const rows = await query<any>(
      `SELECT r.*, s.first_name || ' ' || s.last_name as staff_name
       FROM repositioning_records r LEFT JOIN staff s ON s.id = r.staff_id
       WHERE r.su_id = $1 ORDER BY r.turned_at DESC LIMIT $2`,
      [req.params.suId, limit]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

router.post('/repositioning', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const staffId = fromToken(req, 'staffId');
    const { suId, homeId, position, skinIntegrityOk, painFree, notes } = req.body;
    const rows = await query<any>(
      `INSERT INTO repositioning_records (su_id, home_id, staff_id, position, skin_integrity_ok, pain_free, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [suId, homeId || null, staffId || null, position,
       skinIntegrityOk ?? true, painFree ?? true, notes || null]
    );
    res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
  } catch (err) { next(err); }
});

export default router;
