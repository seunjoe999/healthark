import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';

const router = Router();
router.use(authenticate);

function fromToken(req: Request, field: string): string {
  const token = req.headers.authorization?.substring(7);
  if (token) { const d = jwt.decode(token) as any; return (req.staff as any)?.[field] || d?.[field] || ''; }
  return (req.staff as any)?.[field] || '';
}

// GET /api/finance-tracking?homeId=&suId= — open to all staff (not just managers), so
// care staff logging a resident's spending can also see the running record they're
// adding to; deletion stays manager-only below.
router.get('/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
      const { suId } = req.query as Record<string, string>;
      let sql = `SELECT f.*, su.first_name || ' ' || su.last_name AS su_name,
                        c.first_name || ' ' || c.last_name AS created_by_name
                 FROM finance_tracking f
                 LEFT JOIN service_users su ON su.id = f.su_id
                 LEFT JOIN staff c ON c.id = f.created_by
                 WHERE f.home_id = $1`;
      const params: unknown[] = [homeId];
      if (suId) { sql += ` AND f.su_id = $2`; params.push(suId); }
      sql += ' ORDER BY f.payment_date DESC, f.created_at DESC LIMIT 300';
      const rows = await query(sql, params);
      res.json({ success: true, data: rows } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/finance-tracking — open to all staff, same reasoning as GET above.
router.post('/',
  [body('paymentType').notEmpty(), body('paymentDate').isDate(), body('amount').isFloat({ min: 0 })], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = req.body.homeId || fromToken(req, 'homeId');
      const createdBy = fromToken(req, 'staffId');
      const { suId, weekOfPayment, paymentType, amount, paymentDate, staffOnShift, notes } = req.body;
      const rows = await query(
        `INSERT INTO finance_tracking (home_id, su_id, week_of_payment, payment_type, amount, payment_date, staff_on_shift, notes, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [homeId, suId || null, weekOfPayment || null, paymentType, amount, paymentDate, staffOnShift || null, notes || null, createdBy]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// DELETE /api/finance-tracking/:id
router.delete('/:id', requireRole('home_manager', 'group_admin', 'admin'), param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await query('DELETE FROM finance_tracking WHERE id = $1', [req.params.id]);
      res.json({ success: true, message: 'Entry deleted' } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
