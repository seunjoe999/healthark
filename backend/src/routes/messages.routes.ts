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

// GET /api/messages?type=inbox|sent|deleted — one conversation-aware list.
// limit caps each person's own slice; conversation=true returns the whole
// back-and-forth with one other person (both directions, oldest first) so the
// inbox can read like a chat thread instead of two separate one-way lists.
// search filters name/subject/body, so a conversation or message is findable.
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const staffId = req.staff.staffId || tok(req, 'staffId');
    const type = (req.query.type as string) || 'inbox';
    const search = String(req.query.search || '').trim();
    const searchSql = search
      ? `AND (COALESCE(s.first_name || ' ' || s.last_name, '') ILIKE $2
           OR COALESCE(r.first_name || ' ' || r.last_name, '') ILIKE $2
           OR COALESCE(m.subject, '') ILIKE $2
           OR COALESCE(m.body, '') ILIKE $2
           OR COALESCE(m.message, '') ILIKE $2)`
      : '';
    const searchParams = search ? [`%${search}%`] : [];
    if (type === 'conversation') {
      const otherId = String(req.query.with || '');
      if (!otherId) { res.status(400).json({ success: false, error: 'Choose a conversation first' } as ApiResponse); return; }
      const limit = Math.min(Math.max(parseInt(String(req.query.limit || '200'), 10) || 200, 1), 500);
      // $1 = me, $2 = the other person, $3 = search (only when searching).
      // Placeholders are positional, so the search placeholder number depends
      // on whether a search term was sent.
      const rows = await query(`
        SELECT m.*,
               COALESCE(s.first_name || ' ' || s.last_name, 'Deleted User') AS sender_name,
               COALESCE(r.first_name || ' ' || r.last_name, 'Deleted User') AS recipient_name
        FROM staff_messages m
        LEFT JOIN staff s ON s.id = m.sender_id
        LEFT JOIN staff r ON r.id = m.recipient_id
        WHERE ((m.sender_id = $1 AND m.recipient_id = $2 AND m.deleted_by_sender_at IS NULL)
            OR (m.sender_id = $2 AND m.recipient_id = $1 AND m.deleted_by_recipient_at IS NULL))
          ${search ? `AND (COALESCE(m.subject, '') ILIKE $3 OR COALESCE(m.body, '') ILIKE $3 OR COALESCE(m.message, '') ILIKE $3)` : ''}
        ORDER BY m.created_at ASC
        LIMIT ${limit}`, search ? [staffId, otherId, searchParams[0]] : [staffId, otherId]);
      res.json({ success: true, data: rows } as ApiResponse);
      return;
    }
    if (type === 'threads') {
      // One row per person: whoever they are, the latest message either way,
      // the full history count, and how many of those are still unread — the
      // WhatsApp-style conversation list. Deleted-both-sides messages never
      // surface; a thread where one side deleted still shows from the other.
      const rows = await query(`
        SELECT
          CASE WHEN m.sender_id = $1 THEN m.recipient_id ELSE m.sender_id END AS other_id,
          COALESCE(o.first_name || ' ' || o.last_name, 'Deleted User') AS other_name,
          MAX(m.created_at) AS last_at,
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE m.recipient_id = $1 AND (m.is_read IS NOT TRUE)) AS unread,
          (array_agg(m.subject ORDER BY m.created_at DESC))[1] AS last_subject,
          (array_agg(COALESCE(m.body, m.message) ORDER BY m.created_at DESC))[1] AS last_snippet,
          (array_agg(m.sender_id ORDER BY m.created_at DESC))[1] AS last_sender_id
        FROM staff_messages m
        LEFT JOIN staff o ON o.id = CASE WHEN m.sender_id = $1 THEN m.recipient_id ELSE m.sender_id END
        WHERE (m.sender_id = $1 AND m.deleted_by_sender_at IS NULL)
           OR (m.recipient_id = $1 AND m.deleted_by_recipient_at IS NULL)
        GROUP BY 1, 2
        ORDER BY last_at DESC
        LIMIT 200`, [staffId]);
      // A thread whose every message this viewer deleted on their own side has
      // no live rows for them — the query above already excludes those, since
      // each side's deleted flag filters its own direction. Threads the other
      // person deleted still show (their delete doesn't remove your copy).
      let out = rows;
      if (search) {
        const q = search.toLowerCase();
        out = rows.filter((t: any) =>
          String(t.other_name || '').toLowerCase().includes(q) ||
          String(t.last_subject || '').toLowerCase().includes(q) ||
          String(t.last_snippet || '').toLowerCase().includes(q));
      }
      res.json({ success: true, data: out } as ApiResponse);
      return;
    }
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
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '100'), 10) || 100, 1), 500);
    const rows = await query(`
      SELECT m.*,
             COALESCE(s.first_name || ' ' || s.last_name, 'Deleted User') AS sender_name,
             COALESCE(r.first_name || ' ' || r.last_name, 'Deleted User') AS recipient_name
      FROM staff_messages m
      LEFT JOIN staff s ON s.id = m.sender_id
      LEFT JOIN staff r ON r.id = m.recipient_id
      WHERE ${filterCol} = $1 AND ${deletedCol} IS NULL
      ${searchSql}
      ORDER BY m.created_at DESC
      LIMIT ${limit}`, search ? [staffId, searchParams[0]] : [staffId]);
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
