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

// GET /api/review-types — list custom review types added by this organisation
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = fromToken(req, 'organisationId');
    const rows = await query('SELECT * FROM review_types WHERE organisation_id = $1 ORDER BY label', [orgId]);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/review-types — admin adds a custom review type
router.post('/', requireRole('group_admin', 'home_manager'),
  body('label').trim().notEmpty(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = fromToken(req, 'organisationId');
      const { label } = req.body;
      const value = String(label).toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      const rows = await query(
        `INSERT INTO review_types (organisation_id, value, label) VALUES ($1,$2,$3)
         ON CONFLICT (organisation_id, value) DO NOTHING RETURNING *`,
        [orgId, value, label]
      );
      if (!rows.length) throw new AppError('A review type with that name already exists', 409);
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// DELETE /api/review-types/:id — admin removes a custom review type
router.delete('/:id', requireRole('group_admin', 'home_manager'), param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = fromToken(req, 'organisationId');
      await query('DELETE FROM review_types WHERE id = $1 AND organisation_id = $2', [req.params.id, orgId]);
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
