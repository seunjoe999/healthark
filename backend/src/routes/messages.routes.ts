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

// Soft-delete columns — a delete used to be a hard DELETE, so a message
// removed by mistake was gone for good with no "Deleted Items" to recover
// it from. Each side (sender/recipient) gets its own deleted flag since
// deleting your own copy of a message shouldn't remove it from the other
// person's inbox/sent view.
async function ensureSchema() {
  await query(`ALTER TABLE staff_messages ADD COLUMN IF NOT EXISTS deleted_by_sender_at TIMESTAMPTZ`, []);
  await query(`ALTER TABLE staff_messages ADD COLUMN IF NOT EXISTS deleted_by_recipient_at TIMESTAMPTZ`, []);
}
router.use(async (_req, _res, next) => { try { await ensureSchema(); } catch (_) {} next(); });

// GET /api/messages?type=inbox|sent|deleted
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const staffId = req.staff.staffId || tok(req, 'staffId');
    const type = (req.query.type as string) || 'inbox';
    if (type === 'deleted') {
      const rows = await query(`
        SELECT m.*,
               COALESCE(s.first_name || ' ' || s.last_name, 'Deleted User') AS sender_name,
               COALESCE(r.first_name || ' ' || r.last_name, 'Deleted User') AS recipient_name,
               CASE WHEN m.sender_id = $1 THEN 'sent' ELSE 'inbox' END AS deleted_from
        FROM staff_messages m
        LEFT JOIN staff s ON s.id = m.sender_id
        LEFT JOIN staff r ON r.id = m.recipient_id
        WHERE (m.sender_id = $1 AND m.deleted_by_sender_at IS NOT NULL)
           OR (m.recipient_id = $1 AND m.deleted_by_recipient_at IS NOT NULL)
        ORDER BY GREATEST(COALESCE(m.deleted_by_sender_at, 'epoch'), COALESCE(m.deleted_by_recipient_at, 'epoch')) DESC
        LIMIT 100`, [staffId]);
      res.json({ success: true, data: rows } as ApiResponse);
      return;
    }
    const filterCol = type === 'sent' ? 'm.sender_id' : 'm.recipient_id';
    const deletedCol = type === 'sent' ? 'm.deleted_by_sender_at' : 'm.deleted_by_recipient_at';
    const rows = await query(`
      SELECT m.*,
             COALESCE(s.first_name || ' ' || s.last_name, 'Deleted User') AS sender_name,
             COALESCE(r.first_name || ' ' || r.last_name, 'Deleted User') AS recipient_name
      FROM staff_messages m
      LEFT JOIN staff s ON s.id = m.sender_id
      LEFT JOIN staff r ON r.id = m.recipient_id
      WHERE ${filterCol} = $1 AND ${deletedCol} IS NULL
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
      const { recipientId, subject, message, attachmentUrl, attachmentName } = req.body;
      const rows = await query(
        `INSERT INTO staff_messages (sender_id, recipient_id, home_id, subject, body, message, attachment_url, attachment_name)
         VALUES ($1, $2, $3, $4, $5, $5, $6, $7) RETURNING *`,
        [staffId, recipientId, homeId || null, subject || null, message, attachmentUrl || null, attachmentName || null]
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

// DELETE /api/messages/:id — soft delete: moves it to the caller's own
// "Deleted Items" instead of removing the row outright, so a mistaken
// delete can be restored.
router.delete('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = tok(req, 'staffId');
      await query(
        `UPDATE staff_messages SET
           deleted_by_sender_at = CASE WHEN sender_id = $2 THEN NOW() ELSE deleted_by_sender_at END,
           deleted_by_recipient_at = CASE WHEN recipient_id = $2 THEN NOW() ELSE deleted_by_recipient_at END
         WHERE id = $1 AND (sender_id = $2 OR recipient_id = $2)`,
        [req.params.id, staffId]
      );
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// PUT /api/messages/:id/restore — undo a soft delete for the caller's own side.
router.put('/:id/restore', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = tok(req, 'staffId');
      await query(
        `UPDATE staff_messages SET
           deleted_by_sender_at = CASE WHEN sender_id = $2 THEN NULL ELSE deleted_by_sender_at END,
           deleted_by_recipient_at = CASE WHEN recipient_id = $2 THEN NULL ELSE deleted_by_recipient_at END
         WHERE id = $1 AND (sender_id = $2 OR recipient_id = $2)`,
        [req.params.id, staffId]
      );
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
