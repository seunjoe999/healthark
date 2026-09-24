import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query as dbQuery } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';
import { sendEmail, invoiceEmail } from '../services/email.service';

const router = Router();

function fromToken(req: Request, field: string): string {
  const token = req.headers.authorization?.substring(7);
  if (token) { const d = jwt.decode(token) as any; return (req.staff as any)?.[field] || d?.[field] || ''; }
  return (req.staff as any)?.[field] || '';
}

router.use(authenticate);
// Invoicing is financial data — restricted to admin/super_admin only, not the
// broader home_manager/group_admin set that could see it before.
router.use(requireRole('admin', 'super_admin'));

// GET /api/invoicing?homeId=xxx&status=pending
router.get('/', validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
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
  body('homeId').notEmpty(),
  body('suId').notEmpty(),
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

// POST /api/invoicing/:id/send — email the invoice out to one or more recipients
// (e.g. the funder/local authority) before it's marked approved/paid.
router.post('/:id/send', [
  param('id').isUUID(),
  body('emails').isArray({ min: 1 }),
  body('emails.*').isEmail(),
], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      const emails: string[] = req.body.emails;
      const rows = await dbQuery<any>(
        `SELECT i.*, su.first_name, su.last_name, h.name as home_name,
                h.address1, h.address2, h.address3, h.postcode, h.phone, h.email as home_email
         FROM invoices i
         JOIN service_users su ON su.id = i.su_id
         JOIN homes h ON h.id = i.home_id
         WHERE i.id = $1`,
        [req.params.id]
      );
      if (!rows.length) throw new AppError('Invoice not found', 404);
      const invoice = rows[0];

      const result = await sendEmail({
        to: emails.join(','),
        subject: `Invoice — ${invoice.first_name} ${invoice.last_name} — ${new Date(invoice.month_date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`,
        html: invoiceEmail(invoice, {
          name: invoice.home_name,
          address1: invoice.address1, address2: invoice.address2, address3: invoice.address3,
          postcode: invoice.postcode, phone: invoice.phone, email: invoice.home_email,
        }),
      });
      if (!result.ok) throw new AppError(result.error || 'Failed to send invoice email', 502);

      const updated = await dbQuery(
        `UPDATE invoices SET sent_to = $1, sent_at = NOW(), sent_by = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
        [emails.join(', '), staffId, req.params.id]
      );
      res.json({ success: true, data: updated[0], message: `Invoice sent to ${emails.join(', ')}` } as ApiResponse);
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

      // For each user, calculate hours AND amount from each shift's own charge_rate —
      // a flat £15/hr for every resident regardless of their actual commissioned
      // rate produced wrong invoice totals for anyone not on exactly that rate.
      const invoices = [];
      for (const user of users as any[]) {
        const hours = await dbQuery(
          `SELECT
             SUM(EXTRACT(EPOCH FROM (end_time - start_time))/3600) as total_hours,
             SUM(EXTRACT(EPOCH FROM (end_time - start_time))/3600 * COALESCE(charge_rate, 0)) as total_amount
           FROM staff_shifts WHERE su_id = $1 AND DATE_TRUNC('month', shift_date) = DATE_TRUNC('month', $2::timestamp)`,
          [user.id, monthDate]
        );

        const totalHours = parseFloat(String(hours[0]?.total_hours ?? 0));
        const totalAmount = parseFloat(String(hours[0]?.total_amount ?? 0));
        if (totalHours > 0) {
          const invoiceAmount = totalAmount > 0 ? totalAmount : totalHours * 15; // fall back to £15/hr only if no charge_rate was ever set on any shift
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
