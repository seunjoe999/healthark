import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';

const router = Router();

function nd(v: any): string | null { return v && String(v).trim() ? String(v).trim() : null; }

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


// POST /api/tasks/generate-daily — generate today's tasks from templates (called by scheduler)
router.post('/generate-daily', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = req.body.homeId || fromToken(req, 'homeId');
    const today = new Date().toISOString().split('T')[0];
    const dayOfWeek = new Date().getDay(); // 0=Sun, 1=Mon...
    
    // Get active templates
    const templates = await query(
      `SELECT * FROM task_templates WHERE home_id = $1 AND is_active = true`,
      [homeId]
    );
    
    let created = 0;
    for (const tmpl of templates as any[]) {
      // Check if task already exists for today
      const existing = await query(
        `SELECT id FROM tasks WHERE home_id=$1 AND task_date=$2 AND title=$3`,
        [homeId, today, tmpl.title]
      );
      if (existing.length > 0) continue;
      
      // Check frequency
      const freq = tmpl.frequency || 'daily';
      let shouldCreate = false;
      if (freq === 'daily') shouldCreate = true;
      else if (freq === 'weekly' && dayOfWeek === 1) shouldCreate = true; // Monday
      else if (freq === 'weekdays' && dayOfWeek >= 1 && dayOfWeek <= 5) shouldCreate = true;
      else if (freq === 'weekends' && (dayOfWeek === 0 || dayOfWeek === 6)) shouldCreate = true;
      
      if (shouldCreate) {
        await query(
          `INSERT INTO tasks (home_id, su_id, title, category, description, task_date, due_time, priority, assigned_role, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending')`,
          [homeId, tmpl.su_id || null, tmpl.title, tmpl.category || 'general',
           tmpl.description || null, today, tmpl.due_time || null,
           tmpl.priority || 'normal', tmpl.assigned_role || null]
        );
        created++;
      }
    }
    res.json({ success: true, message: `${created} tasks generated for today` } as ApiResponse);
  } catch (err) { next(err); }
});


// DELETE /api/tasks/templates/:id — soft-delete a template
router.delete('/templates/:id', requireRole('home_manager', 'group_admin'), param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await query('UPDATE task_templates SET is_active=false WHERE id=$1', [req.params.id]);
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// PUT /api/tasks/templates/:id — update a template
router.put('/templates/:id', requireRole('home_manager', 'group_admin'), param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { title, category, description, frequency, dueTime, assignedRole, priority } = req.body;
      await query(
        `UPDATE task_templates SET title=$1, category=$2, description=$3, frequency=$4, due_time=$5, assigned_role=$6, priority=$7 WHERE id=$8`,
        [title, category, description||null, frequency, dueTime||null, assignedRole||null, priority, req.params.id]
      );
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.delete('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = fromToken(req, 'homeId');
      await query('DELETE FROM tasks WHERE id=$1 AND home_id=$2', [req.params.id, homeId]);
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
