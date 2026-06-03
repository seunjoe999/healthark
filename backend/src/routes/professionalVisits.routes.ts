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

// GET /api/professional-visits
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = tok(req, 'homeId');
    const { suId, type, from, to } = req.query as Record<string, string>;
    let sql = `
      SELECT pv.*, s.first_name || ' ' || s.last_name AS recorded_by_name,
             su.first_name || ' ' || su.last_name AS su_name
      FROM professional_visits pv
      JOIN staff s ON s.id = pv.recorded_by
      JOIN service_users su ON su.id = pv.su_id
      WHERE pv.home_id = $1`;
    const params: unknown[] = [homeId];
    let idx = 2;
    if (suId) { sql += ` AND pv.su_id = $${idx++}`; params.push(suId); }
    if (type) { sql += ` AND pv.professional_type = $${idx++}`; params.push(type); }
    if (from) { sql += ` AND pv.visit_date >= $${idx++}`; params.push(from); }
    if (to)   { sql += ` AND pv.visit_date <= $${idx++}`; params.push(to); }
    sql += ' ORDER BY pv.visit_date DESC LIMIT 200';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/professional-visits/upcoming — follow-ups due within 30 days
router.get('/upcoming', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = tok(req, 'homeId');
    const rows = await query(`
      SELECT pv.*, su.first_name || ' ' || su.last_name AS su_name
      FROM professional_visits pv
      JOIN service_users su ON su.id = pv.su_id
      WHERE pv.home_id = $1
        AND pv.follow_up_date IS NOT NULL
        AND pv.follow_up_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
        AND pv.follow_up_done = FALSE
      ORDER BY pv.follow_up_date ASC`, [homeId]);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/professional-visits
router.post('/', [
  body('suId').isUUID(),
  body('visitDate').notEmpty(),
  body('professionalType').notEmpty(),
], validateRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = tok(req, 'homeId');
    const staffId = tok(req, 'staffId');
    const { suId, visitDate, professionalType, professionalName, organisation,
            reason, outcome, instructionsLeft, followUpDate, followUpNotes } = req.body;
    const rows = await query(
      `INSERT INTO professional_visits
         (home_id, su_id, recorded_by, visit_date, professional_type, professional_name,
          organisation, reason, outcome, instructions_left, follow_up_date, follow_up_notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [homeId, suId, staffId, visitDate, professionalType,
       professionalName || null, organisation || null, reason || null,
       outcome || null, instructionsLeft || null,
       followUpDate || null, followUpNotes || null]
    );
    res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
  } catch (err) { next(err); }
});

// PATCH /api/professional-visits/:id — update outcome, instructions, follow-up
router.patch('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { outcome, instructionsLeft, followUpDate, followUpNotes, followUpDone } = req.body;
      await query(
        `UPDATE professional_visits
         SET outcome=$1, instructions_left=$2, follow_up_date=$3, follow_up_notes=$4,
             follow_up_done=COALESCE($5, follow_up_done)
         WHERE id=$6`,
        [outcome ?? null, instructionsLeft ?? null, followUpDate || null, followUpNotes ?? null, followUpDone ?? null, req.params.id]
      );
      const rows = await query('SELECT * FROM professional_visits WHERE id=$1', [req.params.id]);
      res.json({ success: true, data: (rows as any[])[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// PATCH /api/professional-visits/:id/follow-up-done
router.patch('/:id/follow-up-done', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await query('UPDATE professional_visits SET follow_up_done=TRUE WHERE id=$1', [req.params.id]);
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// DELETE /api/professional-visits/:id
router.delete('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await query('DELETE FROM professional_visits WHERE id=$1', [req.params.id]);
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
