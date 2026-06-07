import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';

const router = Router();
router.use(authenticate);

function tok(req: Request, field: string): string {
  const t = req.headers.authorization?.substring(7);
  if (t) { const d = jwt.decode(t) as any; return (req.staff as any)?.[field] || d?.[field] || ''; }
  return (req.staff as any)?.[field] || '';
}

// GET /api/messages?type=inbox|sent
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const staffId = tok(req, 'staffId');
    const type = (req.query.type as string) || 'inbox';
    const filterCol = type === 'sent' ? 'm.sender_id' : 'm.recipient_id';
    const rows = await query(`
      SELECT m.*,
             COALESCE(s.first_name || ' ' || s.last_name, 'Deleted User') AS sender_name,
             COALESCE(r.first_name || ' ' || r.last_name, 'Deleted User') AS recipient_name
      FROM staff_messages m
      LEFT JOIN staff s ON s.id = m.sender_id
      LEFT JOIN staff r ON r.id = m.recipient_id
      WHERE ${filterCol} = $1
      ORDER BY m.created_at DESC
      LIMIT 100`, [staffId]);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/messages — send a message
router.post('/',
  [body('recipientId').isUUID(), body('message').notEmpty().withMessage('Message body is required')],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = tok(req, 'staffId');
      const homeId = tok(req, 'homeId');
      const { recipientId, subject, message } = req.body;
      const rows = await query(
        `INSERT INTO staff_messages (sender_id, recipient_id, home_id, subject, body, message)
         VALUES ($1, $2, $3, $4, $5, $5) RETURNING *`,
        [staffId, recipientId, homeId || null, subject || null, message]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// PUT /api/messages/:id/read
router.put('/:id/read', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = tok(req, 'staffId');
      await query(
        `UPDATE staff_messages SET is_read = true, read_at = NOW() WHERE id = $1 AND recipient_id = $2`,
        [req.params.id, staffId]
      );
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// DELETE /api/messages/:id
router.delete('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = tok(req, 'staffId');
      await query(
        `DELETE FROM staff_messages WHERE id = $1 AND (sender_id = $2 OR recipient_id = $2)`,
        [req.params.id, staffId]
      );
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
