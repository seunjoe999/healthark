import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
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

// GET /api/social-activities?suId=&homeId=&from=&to=
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { suId, homeId, from, to } = req.query as Record<string, string>;
    if (suId) await assertResidentAccess(req, suId);
    const targetHomeId = homeId || fromToken(req, 'homeId');

    let sql = `SELECT sa.*,
                      su.first_name || ' ' || su.last_name as su_name,
                      s.first_name || ' ' || s.last_name as staff_name
               FROM social_activities sa
               JOIN service_users su ON su.id = sa.su_id
               LEFT JOIN staff s ON s.id = sa.staff_id
               WHERE sa.home_id = $1`;
    const params: unknown[] = [targetHomeId];
    let idx = 2;

    if (suId) { sql += ` AND sa.su_id = $${idx++}`; params.push(suId); }
    if (from) { sql += ` AND sa.activity_date >= $${idx++}`; params.push(from); }
    if (to)   { sql += ` AND sa.activity_date <= $${idx++}`; params.push(to); }
    sql += ' ORDER BY sa.activity_date DESC, sa.created_at DESC';

    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/social-activities
router.post('/', [
  body('suId').notEmpty(),
  body('title').notEmpty(),
  body('activityDate').isDate(),
], validateRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const staffId = fromToken(req, 'staffId');
    const homeId = req.body.homeId || fromToken(req, 'homeId');
    const { suId, title, activityDate, durationMins, location, participants, enjoyed, notes } = req.body;
    const rows = await query(
      `INSERT INTO social_activities (su_id, home_id, staff_id, title, activity_date, duration_mins, location, participants, enjoyed, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [suId, homeId, staffId, title, activityDate, durationMins || null, location || null, participants || null, enjoyed || null, notes || null]
    );
    res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
  } catch (err) { next(err); }
});

// PUT /api/social-activities/:id
router.put('/:id', param('id').isUUID(), validateRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, activityDate, durationMins, location, participants, enjoyed, notes } = req.body;
    const rows = await query(
      `UPDATE social_activities SET title=$1, activity_date=$2, duration_mins=$3, location=$4, participants=$5, enjoyed=$6, notes=$7
       WHERE id=$8 RETURNING *`,
      [title, activityDate, durationMins || null, location || null, participants || null, enjoyed || null, notes || null, req.params.id]
    );
    if (!rows.length) throw new AppError('Not found', 404);
    res.json({ success: true, data: rows[0] } as ApiResponse);
  } catch (err) { next(err); }
});

// DELETE /api/social-activities/:id
router.delete('/:id', param('id').isUUID(), validateRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await query('DELETE FROM social_activities WHERE id=$1', [req.params.id]);
    res.json({ success: true } as ApiResponse);
  } catch (err) { next(err); }
});

export default router;
