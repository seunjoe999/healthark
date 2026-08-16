import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';

const router = Router();

function fromToken(req: Request, field: string): string {
  const token = req.headers.authorization?.substring(7);
  if (token) { const d = jwt.decode(token) as any; return (req.staff as any)?.[field] || d?.[field] || ''; }
  return (req.staff as any)?.[field] || '';
}

router.use(authenticate);

// GET /api/training-types — list custom training sections/courses for this organisation
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = fromToken(req, 'organisationId');
    const rows = await query('SELECT * FROM training_types WHERE organisation_id = $1 ORDER BY name', [orgId]);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/training-types — admin adds a new training section/course
router.post('/', requireRole('group_admin', 'home_manager'),
  body('name').trim().notEmpty(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = fromToken(req, 'organisationId');
      const { name } = req.body;
      const rows = await query(
        `INSERT INTO training_types (organisation_id, name) VALUES ($1,$2)
         ON CONFLICT (organisation_id, name) DO NOTHING RETURNING *`,
        [orgId, name]
      );
      if (!rows.length) throw new AppError('A training section with that name already exists', 409);
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// DELETE /api/training-types/:id — admin removes a training section
router.delete('/:id', requireRole('group_admin', 'home_manager'), param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = fromToken(req, 'organisationId');
      await query('DELETE FROM training_types WHERE id = $1 AND organisation_id = $2', [req.params.id, orgId]);
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
