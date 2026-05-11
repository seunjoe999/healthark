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
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const rows = await query(
      'SELECT * FROM ppe_inventory WHERE home_id = $1 ORDER BY item_name, item_variant',
      [homeId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

router.post('/', requireRole('home_manager', 'group_admin'),
  [body('itemName').notEmpty()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = req.body.homeId || fromToken(req, 'homeId');
      const { itemName, itemVariant, currentStock, minStock, unit } = req.body;
      const rows = await query(
        `INSERT INTO ppe_inventory (home_id, item_name, item_variant, current_stock, min_stock, unit)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [homeId, itemName, itemVariant || null, currentStock || 0, minStock || 10, unit || 'units']
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.post('/:id/transaction', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      const homeId = fromToken(req, 'homeId');
      const { transactionType, quantity, notes } = req.body;
      const item = await query<{ current_stock: number; min_stock: number; home_id: string }>(
        'SELECT current_stock, min_stock, home_id FROM ppe_inventory WHERE id = $1', [req.params.id]
      );
      if (!item.length) throw new AppError('Item not found', 404);

      const newStock = transactionType === 'in'
        ? item[0].current_stock + quantity
        : item[0].current_stock - quantity;

      if (newStock < 0) throw new AppError('Insufficient stock', 400);

      await query(`UPDATE ppe_inventory SET current_stock = $1, updated_at = NOW() WHERE id = $2`, [newStock, req.params.id]);
      await query(
        `INSERT INTO ppe_transactions (item_id, home_id, transaction_type, quantity, staff_id, notes)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [req.params.id, homeId, transactionType, quantity, staffId, notes || null]
      );

      // Alert if below minimum
      if (newStock <= item[0].min_stock) {
        await query(
          `INSERT INTO business_alerts (home_id, alert_type, severity, title, description)
           VALUES ($1,'stock_low','warning','PPE stock low',$2)`,
          [item[0].home_id, `Stock has fallen to ${newStock} units — below minimum of ${item[0].min_stock}`]
        );
      }

      res.json({ success: true, data: { newStock } } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.get('/:id/transactions', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query(
        `SELECT pt.*, s.first_name || ' ' || s.last_name as staff_name
         FROM ppe_transactions pt LEFT JOIN staff s ON s.id = pt.staff_id
         WHERE pt.item_id = $1 ORDER BY pt.created_at DESC LIMIT 50`,
        [req.params.id]
      );
      res.json({ success: true, data: rows } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
