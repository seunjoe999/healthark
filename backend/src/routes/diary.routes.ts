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

// GET /api/diary — list entries, optionally filtered by suId
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = tok(req, 'homeId');
    const { suId, from, to } = req.query as Record<string, string>;
    if (suId) await assertResidentAccess(req, suId);
    let sql = `
      SELECT d.*, s.first_name || ' ' || s.last_name AS recorded_by_name,
             su.first_name || ' ' || su.last_name AS su_name
      FROM resident_diary d
      JOIN staff s ON s.id = d.recorded_by
      JOIN service_users su ON su.id = d.su_id
      WHERE d.home_id = $1`;
    const params: unknown[] = [homeId];
    let idx = 2;
    if (suId) { sql += ` AND d.su_id = $${idx++}`; params.push(suId); }
    if (from) { sql += ` AND d.diary_date >= $${idx++}`; params.push(from); }
    if (to)   { sql += ` AND d.diary_date <= $${idx++}`; params.push(to); }
    sql += ' ORDER BY d.diary_date DESC, d.created_at DESC LIMIT 200';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/diary/summary — latest entry per service user
router.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = tok(req, 'homeId');
    const rows = await query(`
      SELECT DISTINCT ON (su.id)
             su.id AS su_id, su.first_name || ' ' || su.last_name AS su_name, su.room_number,
             d.diary_date, d.mood, d.activities, d.food_appetite, d.sleep_quality,
             d.personal_care_done, d.notes, d.created_at
      FROM service_users su
      LEFT JOIN resident_diary d ON d.su_id = su.id AND d.home_id = $1
      WHERE su.home_id = $1 AND su.status = 'live'
      ORDER BY su.id, d.diary_date DESC NULLS LAST`, [homeId]);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/diary
router.post('/', [
  body('suId').isUUID(),
  body('diaryDate').notEmpty(),
  body('mood').notEmpty(),
], validateRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = tok(req, 'homeId');
    const staffId = tok(req, 'staffId');
    const { suId, diaryDate, mood, moodNotes, activities, foodAppetite, fluidIntake,
            sleepQuality, personalCareDone, notes } = req.body;
    const rows = await query(
      `INSERT INTO resident_diary
         (home_id, su_id, recorded_by, diary_date, mood, mood_notes, activities,
          food_appetite, fluid_intake, sleep_quality, personal_care_done, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [homeId, suId, staffId, diaryDate, mood, moodNotes || null, activities || null,
       foodAppetite || null, fluidIntake || null, sleepQuality || null,
       personalCareDone ?? false, notes || null]
    );
    res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
  } catch (err) { next(err); }
});

// DELETE /api/diary/:id
router.delete('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = tok(req, 'homeId');
      await query('DELETE FROM resident_diary WHERE id=$1 AND home_id=$2', [req.params.id, homeId]);
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
