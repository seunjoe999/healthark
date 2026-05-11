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
    const orgId = fromToken(req, 'organisationId');
    const staffId = fromToken(req, 'staffId');
    const rows = await query(
      `SELECT p.*, s.first_name || ' ' || s.last_name as uploaded_by_name,
              EXISTS(SELECT 1 FROM policy_sign_offs pso WHERE pso.policy_id = p.id AND pso.staff_id = $1) as signed_by_me
       FROM policies p LEFT JOIN staff s ON s.id = p.uploaded_by
       WHERE p.organisation_id = $2 ORDER BY p.created_at DESC`,
      [staffId, orgId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

router.post('/',
  requireRole('group_admin', 'home_manager'),
  [body('title').notEmpty(), body('documentUrl').notEmpty()],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      const orgId = fromToken(req, 'organisationId');
      const { title, version, documentUrl, effectiveDate, reviewDate, requiresSign, homeId } = req.body;
      const rows = await query(
        `INSERT INTO policies (organisation_id, home_id, title, version, document_url, effective_date, review_date, uploaded_by, requires_sign)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [orgId, homeId || null, title, version || '1.0', documentUrl,
         effectiveDate || new Date().toISOString().split('T')[0],
         reviewDate || null, staffId, requiresSign ?? true]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.post('/:id/sign', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      await query(
        'INSERT INTO policy_sign_offs (policy_id, staff_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [req.params.id, staffId]
      );
      res.json({ success: true, message: 'Policy signed' } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.get('/:id/sign-offs', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query(
        `SELECT pso.*, s.first_name || ' ' || s.last_name as staff_name, s.role
         FROM policy_sign_offs pso JOIN staff s ON s.id = pso.staff_id
         WHERE pso.policy_id = $1 ORDER BY pso.signed_at DESC`,
        [req.params.id]
      );
      res.json({ success: true, data: rows } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
