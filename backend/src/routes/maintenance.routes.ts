import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';

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
    const status = req.query.status as string;
    const priority = req.query.priority as string;
    let sql = `
      SELECT m.*,
             r.first_name || ' ' || r.last_name AS reported_by_name,
             a.first_name || ' ' || a.last_name AS assigned_to_name,
             res.first_name || ' ' || res.last_name AS resolved_by_name
      FROM maintenance_logs m
      LEFT JOIN staff r ON r.id = m.reported_by
      LEFT JOIN staff a ON a.id = m.assigned_to
      LEFT JOIN staff res ON res.id = m.resolved_by
      WHERE m.home_id = $1`;
    const params: any[] = [homeId];
    if (status) { sql += ` AND m.status = $${params.length + 1}`; params.push(status); }
    if (priority) { sql += ` AND m.priority = $${params.length + 1}`; params.push(priority); }
    sql += ' ORDER BY CASE m.priority WHEN \'urgent\' THEN 1 WHEN \'high\' THEN 2 WHEN \'medium\' THEN 3 ELSE 4 END, m.created_at DESC';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const rows = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'open') AS open_count,
        COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_count,
        COUNT(*) FILTER (WHERE status = 'resolved') AS resolved_count,
        COUNT(*) FILTER (WHERE priority = 'urgent' AND status NOT IN ('resolved','closed')) AS urgent_count
      FROM maintenance_logs WHERE home_id = $1`, [homeId]);
    res.json({ success: true, data: rows[0] } as ApiResponse);
  } catch (err) { next(err); }
});

router.post('/',
  [body('title').notEmpty(), body('category').notEmpty()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      const homeId = req.body.homeId || fromToken(req, 'homeId');
      const { title, description, category, priority, location, photoUrl } = req.body;
      const rows = await query(`
        INSERT INTO maintenance_logs (home_id, title, description, category, priority, location, reported_by, photo_url)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [homeId, title, description || null, category, priority || 'medium', location || null, staffId, photoUrl || null]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.patch('/:id',
  param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      const { status, priority, assignedTo, resolutionNotes, title, description, category, location } = req.body;
      const existing = await query('SELECT * FROM maintenance_logs WHERE id = $1', [req.params.id]);
      if (!existing.length) throw new AppError('Not found', 404);

      const resolvedAt = status === 'resolved' ? 'NOW()' : 'resolved_at';
      const resolvedBy = status === 'resolved' ? `'${staffId}'` : 'resolved_by';

      await query(`
        UPDATE maintenance_logs SET
          title = COALESCE($1, title),
          description = COALESCE($2, description),
          category = COALESCE($3::maintenance_category, category),
          priority = COALESCE($4::maintenance_priority, priority),
          status = COALESCE($5::maintenance_status, status),
          location = COALESCE($6, location),
          assigned_to = COALESCE($7::uuid, assigned_to),
          resolution_notes = COALESCE($8, resolution_notes),
          resolved_by = CASE WHEN $5 = 'resolved' THEN $9::uuid ELSE resolved_by END,
          resolved_at = CASE WHEN $5 = 'resolved' THEN NOW() ELSE resolved_at END,
          updated_at = NOW()
        WHERE id = $10`,
        [title || null, description || null, category || null, priority || null,
         status || null, location || null, assignedTo || null, resolutionNotes || null,
         staffId, req.params.id]
      );
      const updated = await query('SELECT * FROM maintenance_logs WHERE id = $1', [req.params.id]);
      res.json({ success: true, data: updated[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.delete('/:id', requireRole('home_manager', 'group_admin'),
  param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await query('DELETE FROM maintenance_logs WHERE id = $1', [req.params.id]);
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// ── Maintenance Contacts ───────────────────────────────────────────
router.get('/contacts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const rows = await query(
      'SELECT * FROM maintenance_contacts WHERE home_id = $1 ORDER BY name',
      [homeId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

router.post('/contacts',
  requireRole('home_manager', 'group_admin', 'deputy_manager', 'admin'),
  [body('name').notEmpty().withMessage('Name is required')], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      const homeId = req.body.homeId || fromToken(req, 'homeId');
      const { name, role, company, email, phone, notes } = req.body;
      const rows = await query(
        `INSERT INTO maintenance_contacts (home_id, name, role, company, email, phone, notes, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [homeId, name, role || null, company || null, email || null, phone || null, notes || null, staffId]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.delete('/contacts/:id',
  requireRole('home_manager', 'group_admin', 'deputy_manager', 'admin'),
  param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await query('DELETE FROM maintenance_contacts WHERE id = $1', [req.params.id]);
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
