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

function fromToken(req: Request, field: string): string {
  const token = req.headers.authorization?.substring(7);
  if (token) { const d = jwt.decode(token) as any; return (req.staff as any)?.[field] || d?.[field] || ''; }
  return (req.staff as any)?.[field] || '';
}

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const suId = req.query.suId as string;
    const from = req.query.from as string;
    const to = req.query.to as string;
    if (suId) await assertResidentAccess(req, suId);

    let sql = `
      SELECT b.*,
             su.first_name || ' ' || su.last_name AS su_name,
             su.photo_url AS su_photo,
             s.first_name || ' ' || s.last_name AS given_by_name,
             w.first_name || ' ' || w.last_name AS witnessed_by_name
      FROM bath_charts b
      JOIN service_users su ON su.id = b.su_id
      LEFT JOIN staff s ON s.id = b.given_by
      LEFT JOIN staff w ON w.id = b.witnessed_by
      WHERE b.home_id = $1`;
    const params: any[] = [homeId];

    if (suId) { sql += ` AND b.su_id = $${params.length + 1}::uuid`; params.push(suId); }
    if (from) { sql += ` AND b.bath_date >= $${params.length + 1}`; params.push(from); }
    if (to) { sql += ` AND b.bath_date <= $${params.length + 1}`; params.push(to); }
    sql += ' ORDER BY b.bath_date DESC, b.bath_time DESC NULLS LAST';

    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// Summary: last bath per service user
router.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const rows = await query(`
      SELECT DISTINCT ON (b.su_id)
        b.su_id, b.bath_date, b.bath_type, b.bath_time,
        su.first_name || ' ' || su.last_name AS su_name,
        su.photo_url AS su_photo,
        su.room_number,
        CURRENT_DATE - b.bath_date AS days_since,
        s.first_name || ' ' || s.last_name AS given_by_name
      FROM bath_charts b
      JOIN service_users su ON su.id = b.su_id
      LEFT JOIN staff s ON s.id = b.given_by
      WHERE b.home_id = $1 AND su.status = 'live'
      ORDER BY b.su_id, b.bath_date DESC, b.bath_time DESC NULLS LAST`,
      [homeId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

router.post('/',
  [body('suId').isUUID(), body('bathDate').isDate(), body('bathType').notEmpty()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      const homeId = req.body.homeId || fromToken(req, 'homeId');
      const { suId, bathDate, bathTime, bathType, assistanceLevel, hairWashed, nailsCut, shaved, skinCondition, notes, witnessedBy } = req.body;
      const rows = await query(`
        INSERT INTO bath_charts (su_id, home_id, bath_date, bath_time, bath_type, assistance_level, hair_washed, nails_cut, shaved, skin_condition, notes, given_by, witnessed_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
        [suId, homeId, bathDate, bathTime || null, bathType, assistanceLevel || 'moderate',
         hairWashed || false, nailsCut || false, shaved || false,
         skinCondition || null, notes || null, staffId, witnessedBy || null]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.delete('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await query('DELETE FROM bath_charts WHERE id = $1', [req.params.id]);
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
