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

// GET /api/uniform-stock?homeId=
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const rows = await query(
      `SELECT u.*, r.first_name || ' ' || r.last_name AS recorded_by_name
       FROM uniform_log u LEFT JOIN staff r ON r.id = u.recorded_by
       WHERE u.home_id = $1 ORDER BY u.log_date DESC, u.created_at DESC LIMIT 300`,
      [homeId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/uniform-stock
router.post('/', [
  body('staffName').notEmpty(), body('logDate').isDate(), body('logType').isIn(['collection', 'return']),
], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = req.body.homeId || fromToken(req, 'homeId');
      const recordedBy = fromToken(req, 'staffId');
      const {
        staffId, staffName, logType, itemDescription, logDate, logTime, notes,
        staffSignature, managerSignature, managerName,
      } = req.body;
      const rows = await query(
        `INSERT INTO uniform_log (home_id, staff_id, staff_name, log_type, item_description, log_date, log_time, notes,
           staff_signature, manager_signature, manager_name, recorded_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [homeId, staffId || null, staffName, logType, itemDescription || null, logDate, logTime || null, notes || null,
         staffSignature || null, managerSignature || null, managerName || null, recordedBy]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// DELETE /api/uniform-stock/:id
router.delete('/:id', requireRole('home_manager', 'group_admin', 'deputy_manager', 'admin'), param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await query('DELETE FROM uniform_log WHERE id = $1', [req.params.id]);
      res.json({ success: true, message: 'Entry deleted' } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
