import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth';
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

// GET /api/cqc-notifications/?homeId=xxx&status=pending
router.get('/', validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = req.query.homeId as string;
      const status = (req.query.status as string) || 'pending';
      const rows = await query(
        `SELECT cqc.*, su.first_name, su.last_name, s.first_name || ' ' || s.last_name as notified_by_name
         FROM cqc_notifications cqc
         LEFT JOIN service_users su ON su.id = cqc.su_id
         LEFT JOIN staff s ON s.id = cqc.notified_by
         WHERE cqc.home_id = $1 AND cqc.status = $2
         ORDER BY cqc.notification_date DESC`,
        [homeId, status]
      );
      res.json({ success: true, data: rows } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// GET /api/cqc-notifications/:id
router.get('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query(
        `SELECT cqc.*, su.first_name, su.last_name, s.first_name || ' ' || s.last_name as notified_by_name
         FROM cqc_notifications cqc
         LEFT JOIN service_users su ON su.id = cqc.su_id
         LEFT JOIN staff s ON s.id = cqc.notified_by
         WHERE cqc.id = $1`,
        [req.params.id]
      );
      if (!rows.length) { return next(new AppError('CQC notification not found', 404)); }
      res.json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/cqc-notifications — create CQC notification
router.post('/', [
  body('homeId').isUUID(),
  body('suId').optional().isUUID(),
  body('notificationType').notEmpty(),
  body('details').notEmpty(),
], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      const { homeId, suId, notificationType, details, attachmentUrl } = req.body;
      const rows = await query(
        `INSERT INTO cqc_notifications (home_id, su_id, notification_type, details, notified_by, attachment_url, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING *`,
        [homeId, suId || null, notificationType, details, staffId, attachmentUrl || null]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// PATCH /api/cqc-notifications/:id — update CQC notification status
router.patch('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, details, attachmentUrl } = req.body;
      const updates: string[] = [];
      const vals: any[] = [];
      if (status !== undefined) { updates.push(`status=$${updates.length + 1}`); vals.push(status); }
      if (details !== undefined) { updates.push(`details=$${updates.length + 1}`); vals.push(details); }
      if (attachmentUrl !== undefined) { updates.push(`attachment_url=$${updates.length + 1}`); vals.push(attachmentUrl); }
      
      if (!updates.length) { 
        return res.status(400).json({ success: false, error: 'No fields to update' }); 
      }
      
      vals.push(req.params.id);
      const rows = await query(`UPDATE cqc_notifications SET ${updates.join(', ')} WHERE id=$${vals.length} RETURNING *`, vals);
      res.json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// DELETE /api/cqc-notifications/:id
router.delete('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await query('DELETE FROM cqc_notifications WHERE id = $1', [req.params.id]);
      res.json({ success: true, message: 'CQC notification deleted' } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
