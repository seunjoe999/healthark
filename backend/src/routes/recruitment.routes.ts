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

// GET /api/recruitment?homeId=
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const rows = await query(
      `SELECT * FROM recruitment_candidates WHERE home_id = $1 ORDER BY applied_date DESC, created_at DESC`,
      [homeId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/recruitment
router.post('/', [
  body('firstName').notEmpty(),
  body('lastName').notEmpty(),
  body('position').notEmpty(),
], validateRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = req.body.homeId || fromToken(req, 'homeId');
    const { firstName, lastName, email, phone, position, appliedDate, status, interviewDate, notes, dbsCheck, referenceCheck } = req.body;
    const rows = await query(
      `INSERT INTO recruitment_candidates (home_id, first_name, last_name, email, phone, position, applied_date, status, interview_date, notes, dbs_check, reference_check)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [homeId, firstName, lastName, email || null, phone || null, position, appliedDate || null, status || 'applied', interviewDate || null, notes || null, dbsCheck || null, referenceCheck || null]
    );
    res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
  } catch (err) { next(err); }
});

// PUT /api/recruitment/:id
router.put('/:id', param('id').isUUID(), validateRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { firstName, lastName, email, phone, position, appliedDate, status, interviewDate, notes, dbsCheck, referenceCheck } = req.body;
    const rows = await query(
      `UPDATE recruitment_candidates SET first_name=$1, last_name=$2, email=$3, phone=$4, position=$5, applied_date=$6, status=$7, interview_date=$8, notes=$9, dbs_check=$10, reference_check=$11, updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [firstName, lastName, email || null, phone || null, position, appliedDate || null, status, interviewDate || null, notes || null, dbsCheck || null, referenceCheck || null, req.params.id]
    );
    if (!rows.length) throw new AppError('Not found', 404);
    res.json({ success: true, data: rows[0] } as ApiResponse);
  } catch (err) { next(err); }
});

// DELETE /api/recruitment/:id
router.delete('/:id', param('id').isUUID(), validateRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await query('DELETE FROM recruitment_candidates WHERE id=$1', [req.params.id]);
    res.json({ success: true } as ApiResponse);
  } catch (err) { next(err); }
});

export default router;
