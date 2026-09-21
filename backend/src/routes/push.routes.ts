import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { ApiResponse } from '../types';
import { getVapidPublicKey } from '../services/push.service';

const router = Router();

// GET /api/push/vapid-public-key — PUBLIC, needed before the client can subscribe.
router.get('/vapid-public-key', (_req: Request, res: Response) => {
  res.json({ success: true, data: { publicKey: getVapidPublicKey() } } as ApiResponse);
});

router.use(authenticate);

// POST /api/push/subscribe — save (or refresh) this device's push subscription
// against the logged-in staff member. Upserted by endpoint so re-subscribing
// (e.g. after clearing site data) doesn't create duplicate rows.
router.post('/subscribe', [
  body('endpoint').isURL(),
  body('keys.p256dh').notEmpty(),
  body('keys.auth').notEmpty(),
], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = req.staff.staffId;
      const { endpoint, keys } = req.body;
      await query(
        `INSERT INTO push_subscriptions (staff_id, endpoint, p256dh, auth)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (endpoint) DO UPDATE SET staff_id = $1, p256dh = $3, auth = $4, updated_at = NOW()`,
        [staffId, endpoint, keys.p256dh, keys.auth]
      );
      res.status(201).json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/push/unsubscribe
router.post('/unsubscribe', body('endpoint').isURL(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await query('DELETE FROM push_subscriptions WHERE endpoint = $1', [req.body.endpoint]);
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
