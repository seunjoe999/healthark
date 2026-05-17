import { Router, Request, Response, NextFunction } from 'express';
import { param } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';

const router = Router();

function nd(v: any): string | null { return v && String(v).trim() ? String(v).trim() : null; }

router.use(authenticate);

function fromToken(req: Request, field: string): string {
  const token = req.headers.authorization?.substring(7);
  if (token) { const d = jwt.decode(token) as any; return d?.[field] || ''; }
  return '';
}

// GET /api/notifications
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const staffId = fromToken(req, 'staffId');
    const rows = await query(
      `SELECT * FROM notifications WHERE recipient_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [staffId]
    );
    const unread = rows.filter((r: any) => !r.is_read).length;
    res.json({ success: true, data: rows, unread } as ApiResponse);
  } catch (err) { next(err); }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await query('UPDATE notifications SET is_read=true, read_at=NOW() WHERE id=$1', [req.params.id]);
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// PUT /api/notifications/read-all
router.put('/read-all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const staffId = fromToken(req, 'staffId');
    await query('UPDATE notifications SET is_read=true, read_at=NOW() WHERE recipient_id=$1', [staffId]);
    res.json({ success: true } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/notifications/send — send to a specific staff member
router.post('/send', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = req.body.homeId || fromToken(req, 'homeId');
    const { recipientId, title, body: msgBody, type, link } = req.body;
    if (!recipientId || !title) throw new Error('recipientId and title are required');
    await query(
      'INSERT INTO notifications (recipient_id, home_id, title, body, type, link) VALUES ($1,$2,$3,$4,$5,$6)',
      [recipientId, homeId, title, msgBody || null, type || 'info', link || null]
    );
    res.status(201).json({ success: true } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/notifications/broadcast — send to all home staff
router.post('/broadcast', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = req.body.homeId || fromToken(req, 'homeId');
    const { title, body: msgBody, type, link } = req.body;
    const staffRows = await query<any>('SELECT id FROM staff WHERE home_id=$1 AND is_active=true', [homeId]);
    for (const s of staffRows) {
      await query(
        'INSERT INTO notifications (recipient_id, home_id, title, body, type, link) VALUES ($1,$2,$3,$4,$5,$6)',
        [s.id, homeId, title, msgBody || null, type || 'info', link || null]
      );
    }
    res.json({ success: true, message: `Sent to ${staffRows.length} staff` } as ApiResponse);
  } catch (err) { next(err); }
});

export default router;
