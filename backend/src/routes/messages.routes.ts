import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';

const router = Router();

function nd(v: any): string | null { return v && String(v).trim() ? String(v).trim() : null; }

router.use(authenticate);

function fromToken(req: Request, field: string): string {
  const token = req.headers.authorization?.substring(7);
  if (token) { const d = jwt.decode(token) as any; return (req.staff as any)?.[field] || d?.[field] || ''; }
  return (req.staff as any)?.[field] || '';
}

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const staffId = fromToken(req, 'staffId');
    const type = (req.query.type as string) || 'inbox';
    let rows;
    if (type === 'sent') {
      rows = await query(
        `SELECT m.id, m.sender_id, m.recipient_id, m.home_id, m.subject, m.message, m.is_read, m.read_at, m.created_at,
                s.first_name || ' ' || s.last_name as recipient_name
         FROM staff_messages m LEFT JOIN staff s ON s.id = m.recipient_id
         WHERE m.sender_id = $1 ORDER BY m.created_at DESC LIMIT 100`,
        [staffId]
      );
    } else {
      rows = await query(
        `SELECT m.id, m.sender_id, m.recipient_id, m.home_id, m.subject, m.message, m.is_read, m.read_at, m.created_at,
                s.first_name || ' ' || s.last_name as sender_name
         FROM staff_messages m LEFT JOIN staff s ON s.id = m.sender_id
         WHERE m.recipient_id = $1 ORDER BY m.created_at DESC LIMIT 100`,
        [staffId]
      );
    }
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

router.post('/', [body('recipientId').isUUID(), body('message').notEmpty()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      const homeId = fromToken(req, 'homeId');
      const { recipientId, subject, message } = req.body;
      const rows = await query(
        `INSERT INTO staff_messages (sender_id, recipient_id, home_id, subject, message)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [staffId, recipientId, homeId || null, subject || null, message]
      );
      // Also send in-app notification to recipient
      try {
        await query(
          `INSERT INTO notifications (recipient_id, home_id, title, body, type, link)
           VALUES ($1,$2,$3,$4,'info','/messages')`,
          [recipientId, homeId || null,
           `New message from ${(rows[0] as any).sender_name || 'a colleague'}`,
           (message as string).substring(0, 120)]
        );
      } catch {}
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.put('/:id/read', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await query('UPDATE staff_messages SET is_read = true, read_at = NOW() WHERE id = $1', [req.params.id]);
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.delete('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      await query('DELETE FROM staff_messages WHERE id = $1 AND (sender_id = $2 OR recipient_id = $2)', [req.params.id, staffId]);
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
