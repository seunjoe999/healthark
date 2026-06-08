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

// GET /api/seizures
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = tok(req, 'homeId');
    const { suId, from, to } = req.query as Record<string, string>;
    if (suId) await assertResidentAccess(req, suId);
    let sql = `
      SELECT sz.*, s.first_name || ' ' || s.last_name AS recorded_by_name,
             su.first_name || ' ' || su.last_name AS su_name
      FROM seizure_logs sz
      JOIN staff s ON s.id = sz.recorded_by
      JOIN service_users su ON su.id = sz.su_id
      WHERE sz.home_id = $1`;
    const params: unknown[] = [homeId];
    let idx = 2;
    if (suId) { sql += ` AND sz.su_id = $${idx++}`; params.push(suId); }
    if (from) { sql += ` AND sz.seizure_at >= $${idx++}`; params.push(from); }
    if (to)   { sql += ` AND sz.seizure_at <= $${idx++}`; params.push(to + 'T23:59:59'); }
    sql += ' ORDER BY sz.seizure_at DESC LIMIT 100';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/seizures/stats
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = tok(req, 'homeId');
    const { suId, days = '30' } = req.query as Record<string, string>;
    let sql = `
      SELECT sz.seizure_type, COUNT(*) AS count,
             AVG(sz.duration_seconds) AS avg_duration_secs
      FROM seizure_logs sz
      WHERE sz.home_id = $1 AND sz.seizure_at >= NOW() - INTERVAL '${parseInt(days)} days'`;
    const params: unknown[] = [homeId];
    if (suId) { sql += ' AND sz.su_id = $2'; params.push(suId); }
    sql += ' GROUP BY sz.seizure_type ORDER BY count DESC';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/seizures
router.post('/', [body('suId').isUUID()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = tok(req, 'homeId');
      const staffId = tok(req, 'staffId');
      const { suId, seizureAt, seizureType, durationSeconds, description, recoveryTime, postIctal, action, notifiedGP, notifiedFamily, notes } = req.body;
      const rows = await query(
        `INSERT INTO seizure_logs (home_id, su_id, recorded_by, seizure_at, seizure_type,
           duration_seconds, description, recovery_time_mins, post_ictal, action_taken,
           notified_gp, notified_family, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
        [homeId, suId, staffId, seizureAt || new Date().toISOString(), seizureType || 'unclassified',
         durationSeconds || null, description || null, recoveryTime || null, postIctal || null,
         action || null, notifiedGP || false, notifiedFamily || false, notes || null]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// DELETE /api/seizures/:id
router.delete('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await query('DELETE FROM seizure_logs WHERE id=$1', [req.params.id]);
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
