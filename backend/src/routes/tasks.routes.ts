import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';
import { RESTRICTED_ROLES, getAssignedSuIds } from '../utils/residentAccess';

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
    const role = fromToken(req, 'role');
    const isPrivileged = ['home_manager', 'group_admin', 'deputy_manager', 'admin', 'director', 'registered_manager', 'service_manager'].includes(role);
    const staffId = fromToken(req, 'staffId');
    // Role-restriction (assigned_role) and team-restriction (visible_team_ids)
    // are alternative, independent ways to scope a task ("Or restrict by role
    // instead" in the UI) — a task should be visible if EITHER one includes
    // the viewer, not only if both happen to. Filtering assigned_role at the
    // SQL level (as this used to) meant a task scoped to a team the viewer
    // is on could still be hidden from them if assigned_role wasn't blank,
    // which is how a task can silently vanish for one specific staff member
    // while everyone else on their team sees it fine. So: fetch every task
    // for the home/date range unfiltered, then apply one combined OR check.
    const sql = `SELECT t.*, su.first_name || ' ' || su.last_name as su_name,
              s.first_name || ' ' || s.last_name as completed_by_name,
              a.first_name || ' ' || a.last_name as assigned_staff_name
       FROM tasks t
       LEFT JOIN service_users su ON su.id = t.su_id
       LEFT JOIN staff s ON s.id = t.completed_by
       LEFT JOIN staff a ON a.id = t.assigned_staff_id
       WHERE t.home_id = $1 AND (t.task_date = $2 OR (t.task_date < $2 AND t.status != 'completed'))
       ORDER BY t.due_time, t.priority DESC`;
    let rows = await query<any>(sql, [homeId, date]);

    if (!isPrivileged) {
      let myTeamId: string | null = null;
      if (staffId) {
        const staffRows = await query<any>('SELECT team_id FROM staff WHERE id = $1', [staffId]);
        myTeamId = staffRows[0]?.team_id || null;
      }
      rows = rows.filter(t => {
        if (t.assigned_staff_id) return t.assigned_staff_id === staffId;
        const hasRoleTarget = !!t.assigned_role;
        const hasTeamTarget = !!(t.visible_team_ids && t.visible_team_ids.length > 0);
        if (!hasRoleTarget && !hasTeamTarget) return true; // general/all-staff task
        if (hasRoleTarget && t.assigned_role === role) return true;
        if (hasTeamTarget && myTeamId && t.visible_team_ids.includes(myTeamId)) return true;
        return false;
      });
    }

    // Restricted roles only see tasks tied to their own assigned residents (tasks
    // with no resident attached, i.e. general/home-wide tasks, remain visible) —
    // unless the task was assigned directly to them, which always shows.
    if (RESTRICTED_ROLES.includes(role) && staffId) {
      const assignedSuIds = await getAssignedSuIds(staffId);
      rows = rows.filter(t => t.assigned_staff_id === staffId || !t.su_id || assignedSuIds.includes(t.su_id));
    }

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
      const { title, category, description, frequency, dueTime, assignedRole, priority, suId, pictureUrl, visibleTeamIds } = req.body;
      const rows = await query(
        `INSERT INTO task_templates (home_id, title, category, description, frequency, due_time,
          assigned_role, priority, su_id, picture_url, visible_team_ids)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [homeId, title, category, description || null, frequency || 'daily',
         dueTime || null, assignedRole || null, priority || 'normal', suId || null, pictureUrl || null,
         Array.isArray(visibleTeamIds) && visibleTeamIds.length ? visibleTeamIds : null]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// Roles allowed to create tasks — management/senior staff who plan the day,
// not the general care-staff pool who only view and complete tasks.
// (Matches the StaffRole union; 'director'/'registered_manager'/'service_manager'
// used for privilege checks elsewhere in this codebase aren't part of that type.)

const TASK_CREATOR_ROLES = ['home_manager', 'group_admin', 'deputy_manager', 'admin', 'director', 'registered_manager', 'service_manager', 'senior_carer', 'team_leader'];

// POST /api/tasks — create a one-off (or recurring) task.
// Any authenticated staff member may create a 'follow_up' (flagging something
// for a colleague to check on a given day) — everything else stays restricted
// to management/senior roles who plan the day.
router.post('/', (req: Request, res: Response, next: NextFunction) => {
  if (req.body.category === 'follow_up') { next(); return; }
  requireRole(...TASK_CREATOR_ROLES as any)(req, res, next);
}, [body('title').notEmpty()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = req.body.homeId || fromToken(req, 'homeId');
      const createdBy = fromToken(req, 'staffId');
      const { title, category, description, taskDate, dueTime, priority, suId, assignedRole, pictureUrl, assignedStaffId, visibleTeamIds, frequency } = req.body;
      const teamIds = Array.isArray(visibleTeamIds) && visibleTeamIds.length ? visibleTeamIds : null;
      const rows = await query(
        `INSERT INTO tasks (home_id, su_id, created_by, title, category, description,
          task_date, due_time, priority, assigned_role, picture_url, assigned_staff_id, visible_team_ids)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
        [homeId, suId || null, createdBy, title, category || 'general',
         description || null, taskDate || new Date().toISOString().split('T')[0],
         dueTime || null, priority || 'normal', assignedRole || null, pictureUrl || null, assignedStaffId || null,
         teamIds]
      );
      // A "one-off" task was only ever tied to a single task_date, so it silently
      // stopped showing up the next day — every task created without an explicit
      // recurrence looked "disappeared". When a frequency is picked, also save a
      // task_templates row so /generate-daily keeps recreating it going forward.
      if (frequency && frequency !== 'once') {
        await query(
          `INSERT INTO task_templates (home_id, title, category, description, frequency, due_time,
            assigned_role, priority, su_id, picture_url, visible_team_ids)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [homeId, title, category || 'general', description || null, frequency,
           dueTime || null, assignedRole || null, priority || 'normal', suId || null, pictureUrl || null, teamIds]
        );
      }
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
          `INSERT INTO tasks (home_id, su_id, title, category, description, task_date, due_time, priority, assigned_role, status, visible_team_ids)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending',$10)`,
          [homeId, tmpl.su_id || null, tmpl.title, tmpl.category || 'general',
           tmpl.description || null, today, tmpl.due_time || null,
           tmpl.priority || 'normal', tmpl.assigned_role || null, tmpl.visible_team_ids || null]
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
      const { title, category, description, frequency, dueTime, assignedRole, priority, pictureUrl, visibleTeamIds } = req.body;
      await query(
        `UPDATE task_templates SET title=$1, category=$2, description=$3, frequency=$4, due_time=$5, assigned_role=$6, priority=$7, picture_url=COALESCE($9, picture_url), visible_team_ids=$10 WHERE id=$8`,
        [title, category, description||null, frequency, dueTime||null, assignedRole||null, priority, req.params.id, pictureUrl || null,
         Array.isArray(visibleTeamIds) && visibleTeamIds.length ? visibleTeamIds : null]
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
