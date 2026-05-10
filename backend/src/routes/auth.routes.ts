import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { authService } from '../services/auth.service';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { ApiResponse } from '../types';

const router = Router();

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password, req.ip);
      res.json({ success: true, data: result } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/auth/refresh
router.post(
  '/refresh',
  [body('refreshToken').notEmpty()],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tokens = await authService.refreshTokens(req.body.refreshToken);
      res.json({ success: true, data: tokens } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/auth/logout
router.post('/logout', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await authService.logout(req.staff.staffId, req.staff.homeId);
    res.json({ success: true, message: 'Logged out successfully' } as ApiResponse);
  } catch (err) { next(err); }
});

// PUT /api/auth/change-password
router.put(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 10 }).withMessage('Minimum 10 characters'),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authService.changePassword(
        req.staff.staffId,
        req.body.currentPassword,
        req.body.newPassword
      );
      res.json({ success: true, message: 'Password updated' } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// GET /api/auth/me
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await (await import('../config/database')).query<{
      id: string; first_name: string; last_name: string; email: string;
      role: string; home_id: string; organisation_id: string;
      photo_url: string; last_login: string; leave_hours_total: number;
      leave_hours_used: number;
    }>(
      `SELECT id, first_name, last_name, email, role, home_id,
              organisation_id, photo_url, last_login,
              leave_hours_total, leave_hours_used
       FROM staff WHERE id = $1`,
      [req.staff.staffId]
    );
    if (!rows.length) { res.status(404).json({ success: false, error: 'Not found' }); return; }
    res.json({ success: true, data: rows[0] } as ApiResponse);
  } catch (err) { next(err); }
});

export default router;
