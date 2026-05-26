import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query as dbQuery } from '../config/database';
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

// GET /api/invoicing?homeId=xxx&status=pending
router.get('/', validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = req.query.homeId as string;
      const status = (req.query.status as string) || 'all';
      const whereClause = status === 'all' ? 'WHERE i.home_id = $1' : 'WHERE i.home_id = $1 AND i.status = $2';
      const params = status === 'all' ? [homeId] : [homeId, status];
      const rows = await dbQuery(
        `SELECT i.*, su.first_name, su.last_name, su.id as su_id FROM invoices i
         JOIN service_users su ON su.id = i.su_id
         ${whereClause} ORDER BY i.month_date DESC`,
        params
      );
      res.json({ success: true, data: rows } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// GET /api/invoicing/:id
router.get('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await dbQuery(
        'SELECT i.*, su.first_name, su.last_name FROM invoices i JOIN service_users su ON su.id = i.su_id WHERE i.id = $1',
        [req.params.id]
      );
      if (!rows.length) { return next(new AppError('Invoice not found', 404)); }
      res.json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/invoicing — create invoice
router.post('/', [
  body('homeId').isUUID(),
  body('suId').isUUID(),
  body('monthDate').notEmpty(),
  body('commissionedHours').optional().isNumeric(),
  body('invoiceAmount').isNumeric(),
], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      const { homeId, suId, commissionedHours, hourlyRate, invoiceAmount, notes } = req.body;
      // <input type="month"> sends YYYY-MM; PostgreSQL DATE needs YYYY-MM-DD
      const rawDate = req.body.monthDate as string;
      const monthDate = /^\d{4}-\d{2}$/.test(rawDate) ? `${rawDate}-01` : rawDate;
      const rows = await dbQuery(
        `INSERT INTO invoices (home_id, su_id, month_date, commissioned_hours, hourly_rate, invoice_amount, notes, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [homeId, suId, monthDate, commissionedHours || null, hourlyRate || null, invoiceAmount, notes || null, staffId]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// PATCH /api/invoicing/:id — update invoice
router.patch('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, commissionedHours, invoiceAmount, notes } = req.body;
      const updates: Record<string, any> = {};
      if (status !== undefined) updates.status = status;
      if (commissionedHours !== undefined) updates.commissioned_hours = commissionedHours;
      if (invoiceAmount !== undefined) updates.invoice_amount = invoiceAmount;
      if (notes !== undefined) updates.notes = notes;
      
      if (!Object.keys(updates).length) { 
        return res.status(400).json({ success: false, error: 'No fields to update' }); 
      }
      
      const setClauses = Object.entries(updates).map(([k], i) => `${k}=$${i + 1}`).join(', ');
      const vals = Object.values(updates);
      const rows = await dbQuery(`UPDATE invoices SET ${setClauses}, updated_at=NOW() WHERE id=$${vals.length + 1} RETURNING *`, [...vals, req.params.id]);
      res.json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// DELETE /api/invoicing/:id
router.delete('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await dbQuery('DELETE FROM invoices WHERE id = $1', [req.params.id]);
      res.json({ success: true, message: 'Invoice deleted' } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/invoicing/generate-monthly — auto-generate monthly invoices
router.post('/generate-monthly', validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      const homeId = req.body.homeId as string;
      const monthDate = req.body.monthDate as string;
      
      // Get all active service users and their commissioned hours for the month
      const users = await dbQuery(
        `SELECT DISTINCT su.id, su.first_name, su.last_name FROM service_users su WHERE su.home_id = $1 AND su.status = 'live'`,
        [homeId]
      );
      
      // For each user, calculate hours from shifts table
      const invoices = [];
      for (const user of users as any[]) {
        const hours = await dbQuery(
          `SELECT SUM(EXTRACT(EPOCH FROM (end_time - start_time))/3600) as total_hours 
           FROM shifts WHERE su_id = $1 AND DATE_TRUNC('month', shift_date) = DATE_TRUNC('month', $2::timestamp)`,
          [user.id, monthDate]
        );
        
        const totalHours = parseFloat(String(hours[0]?.total_hours ?? 0));
        if (totalHours > 0) {
          const invoiceAmount = totalHours * 15; // Default £15/hour, can be customized
          const result = await dbQuery(
            `INSERT INTO invoices (home_id, su_id, month_date, commissioned_hours, invoice_amount, created_by)
             VALUES ($1, $2, $3, $4, $5, $6) 
             ON CONFLICT (home_id, su_id, month_date) DO UPDATE SET commissioned_hours=$4, invoice_amount=$5
             RETURNING *`,
            [homeId, user.id, monthDate, totalHours, invoiceAmount, staffId]
          );
          invoices.push(result[0]);
        }
      }
      
      res.status(201).json({ success: true, data: invoices, message: `Generated ${invoices.length} invoices` } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
