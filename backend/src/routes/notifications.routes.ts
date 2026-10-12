import { Router, Request, Response, NextFunction } from 'express';
import { param } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth';
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
    const staffId = req.staff.staffId;
    if (!staffId) { res.json({ success: true, data: [], unread: 0 } as ApiResponse); return; }
    const rows = await query(
      `SELECT * FROM notifications WHERE recipient_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [staffId]
    );
    const unread = rows.filter((r: any) => !r.is_read).length;
    res.json({ success: true, data: rows, unread } as ApiResponse);
  } catch (err) { next(err); }
});

// PUT /api/notifications/read-all  — must be before /:id/read to avoid UUID param shadowing
router.put('/read-all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const staffId = req.staff.staffId;
    if (!staffId) { res.json({ success: true } as ApiResponse); return; }
    await query('UPDATE notifications SET is_read=true, read_at=NOW() WHERE recipient_id=$1', [staffId]);
    res.json({ success: true } as ApiResponse);
  } catch (err) { next(err); }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = req.staff.staffId;
      await query('UPDATE notifications SET is_read=true, read_at=NOW() WHERE id=$1 AND recipient_id=$2', [req.params.id, staffId]);
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/notifications/send — send to a specific staff member
router.post('/send', requireRole('home_manager', 'group_admin', 'deputy_manager', 'admin', 'senior_carer', 'team_leader'), async (req: Request, res: Response, next: NextFunction) => {
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

// DELETE /api/notifications/clear-all — delete every notification in the
// caller's own inbox. Must be registered before /:id below (same ordering
// reason as /read-all above) or Express tries to match "clear-all" as a
// UUID :id first. Staff had no way to clear their own notification list —
// the only delete route that existed required home_manager/group_admin and
// didn't even check the notification belonged to the caller.
router.delete('/clear-all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const staffId = req.staff.staffId;
    if (!staffId) { res.json({ success: true, data: { count: 0 } } as ApiResponse); return; }
    const rows = await query<any>('DELETE FROM notifications WHERE recipient_id = $1 RETURNING id', [staffId]);
    res.json({ success: true, data: { count: rows.length } } as ApiResponse);
  } catch (err) { next(err); }
});

// DELETE /api/notifications/bulk — delete a chosen set of the caller's own
// notifications (the "highlight several, delete" flow).
router.delete('/bulk', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const staffId = req.staff.staffId;
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter((id: any) => typeof id === 'string') : [];
    if (!staffId || !ids.length) { res.json({ success: true, data: { count: 0 } } as ApiResponse); return; }
    const rows = await query<any>('DELETE FROM notifications WHERE recipient_id = $1 AND id = ANY($2) RETURNING id', [staffId, ids]);
    res.json({ success: true, data: { count: rows.length } } as ApiResponse);
  } catch (err) { next(err); }
});

// DELETE /api/notifications/:id — delete one of the caller's own
// notifications. Any authenticated staff member may delete their own
// (it's their own inbox, not an admin-gated resource); scoped to
// recipient_id so nobody can delete someone else's by guessing an id.
router.delete('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = req.staff.staffId;
      await query('DELETE FROM notifications WHERE id = $1 AND recipient_id = $2', [req.params.id, staffId]);
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/notifications/broadcast — send to all home staff
router.post('/broadcast', requireRole('home_manager', 'group_admin', 'deputy_manager', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
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
