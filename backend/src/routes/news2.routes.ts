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

const init = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS news2_scores (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      su_id UUID NOT NULL,
      home_id UUID,
      assessed_by UUID,
      respiration_rate NUMERIC(5,1),
      spo2 NUMERIC(5,1),
      supplemental_o2 BOOLEAN DEFAULT false,
      systolic_bp INTEGER,
      pulse INTEGER,
      avpu CHAR(1),
      temperature NUMERIC(4,1),
      rr_score INTEGER DEFAULT 0,
      spo2_score INTEGER DEFAULT 0,
      o2_score INTEGER DEFAULT 0,
      sbp_score INTEGER DEFAULT 0,
      pulse_score INTEGER DEFAULT 0,
      avpu_score INTEGER DEFAULT 0,
      temp_score INTEGER DEFAULT 0,
      total_score INTEGER DEFAULT 0,
      response_level TEXT,
      notes TEXT,
      assessed_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
};
init().catch(() => {});

router.get('/:suId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await query<any>(
      `SELECT n.*, s.first_name || ' ' || s.last_name as assessed_by_name
       FROM news2_scores n LEFT JOIN staff s ON s.id = n.assessed_by
       WHERE n.su_id = $1 ORDER BY n.assessed_at DESC LIMIT 30`,
      [req.params.suId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const staffId = fromToken(req, 'staffId');
    const {
      suId, homeId,
      respirationRate, spo2, supplementalO2, systolicBp, pulse, avpu, temperature,
      rrScore, spo2Score, o2Score, sbpScore, pulseScore, avpuScore, tempScore,
      totalScore, responseLevel, notes, assessedBy,
    } = req.body;
    const rows = await query<any>(
      `INSERT INTO news2_scores
        (su_id, home_id, assessed_by, respiration_rate, spo2, supplemental_o2, systolic_bp, pulse, avpu, temperature,
         rr_score, spo2_score, o2_score, sbp_score, pulse_score, avpu_score, temp_score, total_score, response_level, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING *`,
      [suId, homeId || null, assessedBy || staffId || null,
       respirationRate || null, spo2 || null, supplementalO2 ?? false,
       systolicBp || null, pulse || null, avpu || null, temperature || null,
       rrScore ?? 0, spo2Score ?? 0, o2Score ?? 0, sbpScore ?? 0,
       pulseScore ?? 0, avpuScore ?? 0, tempScore ?? 0,
       totalScore ?? 0, responseLevel || null, notes || null]
    );
    res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
  } catch (err) { next(err); }
});

export default router;
