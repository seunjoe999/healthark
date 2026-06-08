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

// GET /api/bowel-chart
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = tok(req, 'homeId');
    const { suId, from, to } = req.query as Record<string, string>;
    if (suId) await assertResidentAccess(req, suId);
    let sql = `
      SELECT b.*, s.first_name || ' ' || s.last_name AS recorded_by_name,
             su.first_name || ' ' || su.last_name AS su_name
      FROM bowel_charts b
      JOIN staff s ON s.id = b.recorded_by
      JOIN service_users su ON su.id = b.su_id
      WHERE b.home_id = $1`;
    const params: unknown[] = [homeId];
    let idx = 2;
    if (suId) { sql += ` AND b.su_id = $${idx++}`; params.push(suId); }
    if (from) { sql += ` AND b.recorded_at >= $${idx++}`; params.push(from); }
    if (to)   { sql += ` AND b.recorded_at <= $${idx++}`; params.push(to + 'T23:59:59'); }
    sql += ' ORDER BY b.recorded_at DESC LIMIT 200';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/bowel-chart/summary
router.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = tok(req, 'homeId');
    const { days = '7' } = req.query as Record<string, string>;
    const rows = await query(`
      SELECT su.id AS su_id, su.first_name || ' ' || su.last_name AS su_name, su.room_number,
             COUNT(b.id) AS total_in_period,
             MAX(b.recorded_at) AS last_recorded_at,
             (SELECT b2.bristol_type FROM bowel_charts b2 WHERE b2.su_id = su.id ORDER BY b2.recorded_at DESC LIMIT 1) AS last_bristol_type
      FROM service_users su
      LEFT JOIN bowel_charts b ON b.su_id = su.id AND b.recorded_at >= NOW() - INTERVAL '${parseInt(days)} days'
      WHERE su.home_id = $1 AND su.status = 'live'
      GROUP BY su.id, su.first_name, su.last_name, su.room_number
      ORDER BY su.last_name`, [homeId]);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/bowel-chart
router.post('/', [body('suId').isUUID(), body('bristolType').isInt({ min: 1, max: 7 })], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = tok(req, 'homeId');
      const staffId = tok(req, 'staffId');
      const { suId, bristolType, recordedAt, amount, colour, consistency, blood, mucus, notes } = req.body;
      const rows = await query(
        `INSERT INTO bowel_charts (home_id, su_id, recorded_by, bristol_type, recorded_at,
           amount, colour, consistency, blood_present, mucus_present, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [homeId, suId, staffId, bristolType, recordedAt || new Date().toISOString(),
         amount || null, colour || null, consistency || null,
         blood || false, mucus || false, notes || null]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// DELETE /api/bowel-chart/:id
router.delete('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await query('DELETE FROM bowel_charts WHERE id=$1', [req.params.id]);
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
