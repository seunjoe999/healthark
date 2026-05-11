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

// GET /api/tasks — list tasks for today
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const rows = await query(
      `SELECT t.*, su.first_name || ' ' || su.last_name as su_name,
              s.first_name || ' ' || s.last_name as completed_by_name
       FROM tasks t
       LEFT JOIN service_users su ON su.id = t.su_id
       LEFT JOIN staff s ON s.id = t.completed_by
       WHERE t.home_id = $1 AND t.task_date = $2
       ORDER BY t.due_time, t.priority DESC`,
      [homeId, date]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/tasks/templates — list task templates (set up by admin)
router.get('/templates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const rows = await query(
      'SELECT * FROM task_templates WHERE home_id = $1 AND is_active = true ORDER BY category, title',
      [homeId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/tasks/templates — admin creates task template
router.post('/templates', requireRole('home_manager', 'group_admin'),
  [body('title').notEmpty(), body('category').notEmpty()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = req.body.homeId || fromToken(req, 'homeId');
      const { title, category, description, frequency, dueTime, assignedRole, priority, suId } = req.body;
      const rows = await query(
        `INSERT INTO task_templates (home_id, title, category, description, frequency, due_time,
          assigned_role, priority, su_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [homeId, title, category, description || null, frequency || 'daily',
         dueTime || null, assignedRole || null, priority || 'normal', suId || null]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/tasks — create a one-off task
router.post('/', [body('title').notEmpty()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = req.body.homeId || fromToken(req, 'homeId');
      const createdBy = fromToken(req, 'staffId');
      const { title, category, description, taskDate, dueTime, priority, suId, assignedRole } = req.body;
      const rows = await query(
        `INSERT INTO tasks (home_id, su_id, created_by, title, category, description,
          task_date, due_time, priority, assigned_role)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [homeId, suId || null, createdBy, title, category || 'general',
         description || null, taskDate || new Date().toISOString().split('T')[0],
         dueTime || null, priority || 'normal', assignedRole || null]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// PUT /api/tasks/:id/complete — mark task done
router.put('/:id/complete', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      await query(
        `UPDATE tasks SET status='completed', completed_by=$1, completed_at=NOW(), completion_notes=$2 WHERE id=$3`,
        [staffId, req.body.notes || null, req.params.id]
      );
      res.json({ success: true, message: 'Task completed' } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
