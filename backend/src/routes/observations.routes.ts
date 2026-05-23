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

// GET /api/observations — list for a service user or home
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = tok(req, 'homeId');
    const { suId, type, from, to, limit = '50' } = req.query as Record<string, string>;
    let sql = `
      SELECT o.*, s.first_name || ' ' || s.last_name AS recorded_by_name,
             su.first_name || ' ' || su.last_name AS su_name
      FROM observations o
      JOIN staff s ON s.id = o.recorded_by
      JOIN service_users su ON su.id = o.su_id
      WHERE o.home_id = $1`;
    const params: unknown[] = [homeId];
    let idx = 2;
    if (suId)  { sql += ` AND o.su_id = $${idx++}`;          params.push(suId); }
    if (type)  { sql += ` AND o.obs_type = $${idx++}`;        params.push(type); }
    if (from)  { sql += ` AND o.observed_at >= $${idx++}`;    params.push(from); }
    if (to)    { sql += ` AND o.observed_at <= $${idx++}`;    params.push(to + 'T23:59:59'); }
    sql += ` ORDER BY o.observed_at DESC LIMIT $${idx}`;
    params.push(parseInt(limit));
    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/observations/summary — latest reading per SU per type
router.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = tok(req, 'homeId');
    const { type } = req.query as Record<string, string>;
    const sql = `
      SELECT DISTINCT ON (o.su_id) o.*,
             su.first_name || ' ' || su.last_name AS su_name,
             su.room_number,
             s.first_name || ' ' || s.last_name AS recorded_by_name
      FROM observations o
      JOIN service_users su ON su.id = o.su_id
      JOIN staff s ON s.id = o.recorded_by
      WHERE o.home_id = $1 ${type ? 'AND o.obs_type = $2' : ''}
      ORDER BY o.su_id, o.observed_at DESC`;
    const params: unknown[] = type ? [homeId, type] : [homeId];
    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/observations
router.post('/', [body('suId').isUUID(), body('obsType').notEmpty()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = tok(req, 'homeId');
      const staffId = tok(req, 'staffId');
      const { suId, obsType, observedAt, tempCelsius, tempMethod, systolic, diastolic, pulse, spo2, o2Litres, weight, bloodGlucose, notes, isAbnormal } = req.body;
      const rows = await query(
        `INSERT INTO observations (home_id, su_id, recorded_by, obs_type, observed_at,
           temp_celsius, temp_method, systolic, diastolic, pulse, spo2_percent, o2_litres_min,
           weight_kg, blood_glucose, notes, is_abnormal)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
        [homeId, suId, staffId, obsType, observedAt || new Date().toISOString(),
         tempCelsius || null, tempMethod || null, systolic || null, diastolic || null,
         pulse || null, spo2 || null, o2Litres || null, weight || null,
         bloodGlucose || null, notes || null, isAbnormal || false]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// DELETE /api/observations/:id
router.delete('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await query('DELETE FROM observations WHERE id=$1', [req.params.id]);
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
