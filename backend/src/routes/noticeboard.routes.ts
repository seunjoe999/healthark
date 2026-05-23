import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';

const router = Router();
router.use(authenticate);

function tok(req: Request, field: string): string {
  const t = req.headers.authorization?.substring(7);
  if (t) { const d = jwt.decode(t) as any; return (req.staff as any)?.[field] || d?.[field] || ''; }
  return (req.staff as any)?.[field] || '';
}

// GET /api/noticeboard
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = tok(req, 'homeId');
    const staffId = tok(req, 'staffId');
    const { category } = req.query as Record<string, string>;
    let sql = `
      SELECT n.*, s.first_name || ' ' || s.last_name AS posted_by_name,
             (SELECT COUNT(*) FROM noticeboard_reads nr WHERE nr.notice_id = n.id AND nr.staff_id = $2)::int > 0 AS is_read
      FROM noticeboard n
      JOIN staff s ON s.id = n.created_by
      WHERE n.home_id = $1 AND (n.expires_at IS NULL OR n.expires_at > NOW())`;
    const params: unknown[] = [homeId, staffId];
    let idx = 3;
    if (category) { sql += ` AND n.category = $${idx++}`; params.push(category); }
    sql += ' ORDER BY n.is_pinned DESC, n.created_at DESC LIMIT 100';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/noticeboard
router.post('/', [body('title').notEmpty().trim()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = tok(req, 'homeId');
      const staffId = tok(req, 'staffId');
      const { title, body: content, category, isPinned, expiresAt, targetRole } = req.body;
      const rows = await query(
        `INSERT INTO noticeboard (home_id, created_by, title, body, category, is_pinned, expires_at, target_role)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [homeId, staffId, title, content || null, category || 'general', isPinned || false, expiresAt || null, targetRole || null]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// PATCH /api/noticeboard/:id/read
router.patch('/:id/read', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = tok(req, 'staffId');
      await query(
        `INSERT INTO noticeboard_reads (notice_id, staff_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [req.params.id, staffId]
      );
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// DELETE /api/noticeboard/:id
router.delete('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = tok(req, 'homeId');
      const staffId = tok(req, 'staffId');
      const role = tok(req, 'role');
      const rows = await query('SELECT * FROM noticeboard WHERE id=$1 AND home_id=$2', [req.params.id, homeId]);
      if (!rows.length) throw new AppError('Not found', 404);
      const notice = rows[0] as any;
      if (notice.created_by !== staffId && !['home_manager','group_admin'].includes(role)) {
        throw new AppError('Forbidden', 403);
      }
      await query('DELETE FROM noticeboard WHERE id=$1', [req.params.id]);
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
