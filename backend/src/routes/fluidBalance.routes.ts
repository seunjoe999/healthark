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
  CREATE TABLE IF NOT EXISTS fluid_balance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    home_id UUID NOT NULL,
    su_id UUID NOT NULL,
    recorded_by UUID NOT NULL,
    record_date DATE NOT NULL DEFAULT CURRENT_DATE,
    record_time TIME NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('input','output')),
    category TEXT NOT NULL,
    amount_ml INTEGER NOT NULL,
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

// GET /api/fluid-balance?homeId=&suId=&date=
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureTable();
    const homeId = tok(req, 'homeId');
    const { suId, date } = req.query as Record<string, string>;
    const targetDate = date || new Date().toISOString().slice(0, 10);

    let sql = `
      SELECT fb.*, s.first_name || ' ' || s.last_name AS recorded_by_name,
             su.first_name || ' ' || su.last_name AS su_name
      FROM fluid_balance fb
      JOIN staff s ON s.id = fb.recorded_by
      JOIN service_users su ON su.id = fb.su_id
      WHERE fb.home_id = $1`;
    const params: unknown[] = [homeId];
    let idx = 2;
    if (suId) { sql += ` AND fb.su_id = $${idx++}`; params.push(suId); }
    sql += ` AND fb.record_date = $${idx++}`; params.push(targetDate);
    sql += ' ORDER BY fb.record_time ASC';

    const rows = await query(sql, params);

    const totalInput = rows.filter((r: any) => r.type === 'input').reduce((acc: number, r: any) => acc + parseInt(r.amount_ml), 0);
    const totalOutput = rows.filter((r: any) => r.type === 'output').reduce((acc: number, r: any) => acc + parseInt(r.amount_ml), 0);
    const balance = totalInput - totalOutput;

    res.json({ success: true, data: rows, summary: { totalInput, totalOutput, balance } } as any);
  } catch (err) { next(err); }
});

// POST /api/fluid-balance
router.post('/',
  [body('suId').isUUID(), body('type').isIn(['input', 'output']), body('amountMl').isInt({ min: 1 })],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await ensureTable();
      const homeId = tok(req, 'homeId');
      const staffId = tok(req, 'staffId');
      const { suId, recordDate, recordTime, type, category, amountMl, notes } = req.body;
      const rows = await query(
        `INSERT INTO fluid_balance (home_id, su_id, recorded_by, record_date, record_time, type, category, amount_ml, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [homeId, suId, staffId,
         recordDate || new Date().toISOString().slice(0, 10),
         recordTime || new Date().toTimeString().slice(0, 5),
         type, category, amountMl, notes || null]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// DELETE /api/fluid-balance/:id
router.delete('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await query('DELETE FROM fluid_balance WHERE id=$1', [req.params.id]);
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
