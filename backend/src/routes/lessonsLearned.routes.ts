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

function fromToken(req: Request, field: string): string {
  const token = req.headers.authorization?.substring(7);
  if (token) { const d = jwt.decode(token) as any; return (req.staff as any)?.[field] || d?.[field] || ''; }
  return (req.staff as any)?.[field] || '';
}

async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS lessons_learned (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      home_id UUID NOT NULL,
      created_by UUID NOT NULL,
      source_type TEXT NOT NULL CHECK (source_type IN ('incident','complaint','near_miss','audit','inspection','staff_feedback','other')),
      source_reference TEXT,
      date_of_event DATE NOT NULL,
      title TEXT NOT NULL,
      what_happened TEXT NOT NULL,
      root_cause TEXT,
      lesson TEXT NOT NULL,
      action_taken TEXT NOT NULL,
      action_owner TEXT,
      action_due_date DATE,
      action_completed BOOLEAN DEFAULT false,
      action_completed_date DATE,
      shared_with_team BOOLEAN DEFAULT false,
      shared_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `, []);
}

router.use(async (_req, _res, next) => {
  try { await ensureTable(); } catch (_) {}
  next();
});

// GET /api/lessons-learned
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const sourceType = req.query.sourceType as string;
    let sql = `
      SELECT ll.*, s.first_name || ' ' || s.last_name AS created_by_name
      FROM lessons_learned ll
      LEFT JOIN staff s ON s.id = ll.created_by
      WHERE ll.home_id = $1`;
    const params: any[] = [homeId];
    if (sourceType) { sql += ` AND ll.source_type = $${params.length + 1}`; params.push(sourceType); }
    sql += ' ORDER BY ll.date_of_event DESC';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/lessons-learned/stats
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const rows = await query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE action_completed = false) AS actions_pending,
        COUNT(*) FILTER (WHERE action_completed = false AND action_due_date < CURRENT_DATE) AS actions_overdue,
        COUNT(*) FILTER (WHERE shared_with_team = true) AS shared_count
      FROM lessons_learned
      WHERE home_id = $1
    `, [homeId]);
    res.json({ success: true, data: rows[0] } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/lessons-learned
router.post('/',
  [body('title').notEmpty().withMessage('Title is required'),
   body('sourceType').notEmpty().withMessage('Source type is required'),
   body('dateOfEvent').notEmpty().withMessage('Date of event is required'),
   body('whatHappened').notEmpty().withMessage('What happened is required'),
   body('lesson').notEmpty().withMessage('Lesson is required'),
   body('actionTaken').notEmpty().withMessage('Action taken is required')],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const createdBy = fromToken(req, 'staffId');
      const homeId = req.body.homeId || fromToken(req, 'homeId');
      const {
        sourceType, sourceReference, dateOfEvent, title, whatHappened,
        rootCause, lesson, actionTaken, actionOwner, actionDueDate
      } = req.body;
      const rows = await query(`
        INSERT INTO lessons_learned (
          home_id, created_by, source_type, source_reference, date_of_event,
          title, what_happened, root_cause, lesson, action_taken,
          action_owner, action_due_date
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        RETURNING *`,
        [homeId, createdBy, sourceType, sourceReference || null, dateOfEvent,
         title, whatHappened, rootCause || null, lesson, actionTaken,
         actionOwner || null, actionDueDate || null]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// PUT /api/lessons-learned/:id
router.put('/:id',
  param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = fromToken(req, 'homeId');
      const existing = await query('SELECT * FROM lessons_learned WHERE id = $1 AND home_id = $2', [req.params.id, homeId]);
      if (!existing.length) throw new AppError('Not found', 404);
      const {
        title, sourceType, sourceReference, dateOfEvent, whatHappened, rootCause,
        lesson, actionTaken, actionOwner, actionDueDate,
        actionCompleted, sharedWithTeam
      } = req.body;

      const now = new Date().toISOString();
      const completedDate = actionCompleted ? now : null;
      const sharedAt = sharedWithTeam ? (existing[0].shared_at || now) : null;

      const rows = await query(`
        UPDATE lessons_learned SET
          title = COALESCE($1, title),
          source_type = COALESCE($2, source_type),
          source_reference = COALESCE($3, source_reference),
          date_of_event = COALESCE($4, date_of_event),
          what_happened = COALESCE($5, what_happened),
          root_cause = COALESCE($6, root_cause),
          lesson = COALESCE($7, lesson),
          action_taken = COALESCE($8, action_taken),
          action_owner = COALESCE($9, action_owner),
          action_due_date = COALESCE($10, action_due_date),
          action_completed = COALESCE($11, action_completed),
          action_completed_date = CASE WHEN $11 = true THEN NOW() ELSE action_completed_date END,
          shared_with_team = COALESCE($12, shared_with_team),
          shared_at = CASE WHEN $12 = true AND shared_at IS NULL THEN NOW() ELSE shared_at END
        WHERE id = $13 AND home_id = $14
        RETURNING *`,
        [title || null, sourceType || null, sourceReference || null, dateOfEvent || null,
         whatHappened || null, rootCause || null, lesson || null, actionTaken || null,
         actionOwner || null, actionDueDate || null,
         actionCompleted ?? null, sharedWithTeam ?? null,
         req.params.id, homeId]
      );
      res.json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
