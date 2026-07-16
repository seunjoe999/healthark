import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';

const router = Router();
router.use(authenticate);

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS weight_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    home_id UUID NOT NULL,
    su_id UUID NOT NULL,
    recorded_by UUID NOT NULL,
    record_date DATE NOT NULL DEFAULT CURRENT_DATE,
    weight_kg NUMERIC(5,2) NOT NULL,
    height_cm NUMERIC(5,1),
    bmi NUMERIC(4,1),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`;

let tableReady = false;
async function ensureTable() {
  if (!tableReady) { await query(CREATE_TABLE, []); tableReady = true; }
}

function tok(req: Request, field: string): string {
  const t = req.headers.authorization?.substring(7);
  if (t) { const d = jwt.decode(t) as any; return (req.staff as any)?.[field] || d?.[field] || ''; }
  return (req.staff as any)?.[field] || '';
}

// GET /api/weight-tracker?homeId=&suId=
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureTable();
    const homeId = tok(req, 'homeId');
    const { suId } = req.query as Record<string, string>;

    let sql = `
      SELECT wr.*, s.first_name || ' ' || s.last_name AS recorded_by_name,
             su.first_name || ' ' || su.last_name AS su_name
      FROM weight_records wr
      JOIN staff s ON s.id = wr.recorded_by
      JOIN service_users su ON su.id = wr.su_id
      WHERE wr.home_id = $1`;
    const params: unknown[] = [homeId];
    if (suId) { sql += ' AND wr.su_id = $2'; params.push(suId); }
    sql += ' ORDER BY wr.record_date DESC, wr.created_at DESC LIMIT 200';

    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/weight-tracker
router.post('/',
  [body('suId').isUUID(), body('weightKg').isFloat({ min: 1 })],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await ensureTable();
      const homeId = tok(req, 'homeId');
      const staffId = tok(req, 'staffId');
      const { suId, recordDate, weightKg, heightCm, notes } = req.body;

      let bmi: number | null = null;
      if (heightCm && parseFloat(heightCm) > 0) {
        const h = parseFloat(heightCm) / 100;
        bmi = Math.round((parseFloat(weightKg) / (h * h)) * 10) / 10;
      }

      const rows = await query(
        `INSERT INTO weight_records (home_id, su_id, recorded_by, record_date, weight_kg, height_cm, bmi, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [homeId, suId, staffId,
         recordDate || new Date().toISOString().slice(0, 10),
         parseFloat(weightKg),
         heightCm ? parseFloat(heightCm) : null,
         bmi,
         notes || null]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// DELETE /api/weight-tracker/:id
router.delete('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await query('DELETE FROM weight_records WHERE id=$1', [req.params.id]);
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
