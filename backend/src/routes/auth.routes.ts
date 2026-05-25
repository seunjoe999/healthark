import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validateRequest } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types';

const router = Router();

function nd(v: any): string | null { return v && String(v).trim() ? String(v).trim() : null; }


const signAccess = (payload: object) =>
  jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: (process.env.JWT_EXPIRES_IN || '8h') as any });
const signRefresh = (payload: object) =>
  jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '30d') as any });

// POST /api/auth/login
router.post('/login',
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const rows = await query<any>(
        `SELECT id, email, password_hash, first_name, last_name, role,
                home_id, organisation_id, status, is_active, photo_url, feature_flags
         FROM staff WHERE email = $1`,
        [email]
      );
      if (!rows.length) throw new AppError('Invalid email or password', 401);
      const staff = rows[0];
      if (!staff.is_active || staff.status === 'terminated')
        throw new AppError('Account is inactive. Contact your administrator.', 401);
      const valid = await bcrypt.compare(password, staff.password_hash);
      if (!valid) throw new AppError('Invalid email or password', 401);

      const payload = {
        staffId: staff.id, organisationId: staff.organisation_id,
        homeId: staff.home_id, role: staff.role, email: staff.email,
      };
      const accessToken = signAccess(payload);
      const refreshToken = signRefresh(payload);
      await query('UPDATE staff SET refresh_token=$1, last_login=NOW() WHERE id=$2', [refreshToken, staff.id]);
      await query(
        `INSERT INTO audit_log (staff_id, home_id, action, ip_address)
         VALUES ($1,$2,'login',$3)`,
        [staff.id, staff.home_id, req.ip]
      );

      res.json({
        success: true,
        data: {
          accessToken, refreshToken,
          staff: {
            id: staff.id, email: staff.email,
            firstName: staff.first_name, lastName: staff.last_name,
            role: staff.role, homeId: staff.home_id,
            organisationId: staff.organisation_id, photoUrl: staff.photo_url,
            featureFlags: staff.feature_flags || {},
          },
        },
      } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/auth/register — staff self-registration (creates pending account)
router.post('/register',
  [
    body('firstName').notEmpty().trim(),
    body('lastName').notEmpty().trim(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('phone').optional(),
    body('registrationCode').notEmpty(),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { firstName, lastName, email, password, phone, registrationCode } = req.body;

      // Validate registration code matches an active home
      const homeRows = await query<any>(
        `SELECT h.id, h.organisation_id, h.name FROM homes h
         JOIN organisations o ON o.id = h.organisation_id
         WHERE h.qr_token = $1 AND h.is_active = true`,
        [registrationCode]
      );
      if (!homeRows.length) throw new AppError('Invalid registration code. Contact your manager.', 400);
      const home = homeRows[0];

      // Check email not already registered
      const existing = await query('SELECT id FROM staff WHERE email = $1', [email]);
      if (existing.length) throw new AppError('An account with this email already exists.', 400);

      const passwordHash = await bcrypt.hash(password, 12);

      // Create staff with pending status — admin must activate
      const staffRows = await query<any>(
        `INSERT INTO staff (
          organisation_id, home_id, email, password_hash,
          first_name, last_name, phone, role, status, is_active
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,'care_staff','pending',false)
        RETURNING id, email, first_name, last_name, role, status`,
        [home.organisation_id, home.id, email, passwordHash, firstName, lastName, phone || null]
      );
      const newStaff = staffRows[0];

      // Create onboarding record
      await query('INSERT INTO staff_onboarding (staff_id) VALUES ($1) ON CONFLICT DO NOTHING', [newStaff.id]);

      // Create alert for manager
      await query(
        `INSERT INTO business_alerts (home_id, alert_type, severity, title, description)
         VALUES ($1,'new_staff_registration','info','New staff registration pending approval',$2)`,
        [home.id, `${firstName} ${lastName} (${email}) has registered and is awaiting account approval.`]
      );

      res.status(201).json({
        success: true,
        message: 'Registration submitted. Your manager will activate your account shortly.',
        data: { name: `${firstName} ${lastName}`, homeName: home.name },
      } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// GET /api/auth/setup-status — check if first-time setup is needed
router.get('/setup-status', async (_req, res, next) => {
  try {
    const orgs = await query('SELECT id FROM organisations LIMIT 1');
    res.json({ success: true, data: { needsSetup: orgs.length === 0 } });
  } catch (err) { next(err); }
});

// POST /api/auth/setup — create first organisation, home, and admin (only works on empty DB)
router.post('/setup',
  [
    body('orgName').notEmpty().trim().withMessage('Organisation name is required'),
    body('homeName').notEmpty().trim().withMessage('Care home name is required'),
    body('firstName').notEmpty().trim(),
    body('lastName').notEmpty().trim(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await query('SELECT id FROM organisations LIMIT 1');
      if (existing.length) {
        res.status(403).json({ success: false, error: 'Setup has already been completed. Please log in.' });
        return;
      }
      const { orgName, homeName, firstName, lastName, email, password, homeAddress, homeCity, homePostcode } = req.body;
      const passwordHash = await bcrypt.hash(password, 12);
      const qrToken = Math.random().toString(36).substring(2, 10).toUpperCase();

      const orgRows = await query<any>(
        'INSERT INTO organisations (name) VALUES ($1) RETURNING id',
        [orgName]
      );
      const orgId = orgRows[0].id;

      const homeRows = await query<any>(
        `INSERT INTO homes (organisation_id, name, address1, city, postcode, qr_token, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,true) RETURNING id`,
        [orgId, homeName, homeAddress || null, homeCity || null, homePostcode || null, qrToken]
      );
      const homeId = homeRows[0].id;

      await query(
        `INSERT INTO staff (organisation_id, home_id, email, password_hash, first_name, last_name, role, status, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,'group_admin','active',true)`,
        [orgId, homeId, email, passwordHash, firstName, lastName]
      );

      res.status(201).json({
        success: true,
        message: 'Setup complete! You can now log in with your credentials.',
        data: { email },
      } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/auth/logout
router.post('/logout', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.substring(7);
    const decoded = token ? jwt.decode(token) as any : {};
    const staffId = decoded?.staffId;
    if (staffId) await query('UPDATE staff SET refresh_token=NULL WHERE id=$1', [staffId]);
    res.json({ success: true, message: 'Logged out' } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.substring(7);
    const decoded = token ? jwt.decode(token) as any : {};
    const staffId = decoded?.staffId || (req.staff as any)?.staffId;
    const rows = await query<any>(
      'SELECT id, email, first_name, last_name, role, home_id, organisation_id, photo_url, feature_flags FROM staff WHERE id=$1',
      [staffId]
    );
    if (!rows.length) throw new AppError('Staff not found', 404);
    const s = rows[0];
    res.json({ success: true, data: {
      id: s.id, email: s.email,
      firstName: s.first_name, lastName: s.last_name,
      role: s.role, homeId: s.home_id,
      organisationId: s.organisation_id, photoUrl: s.photo_url,
      featureFlags: s.feature_flags || {},
    }} as ApiResponse);
  } catch (err) { next(err); }
});

// PUT /api/auth/activate/:staffId — manager activates pending staff
router.put('/activate/:staffId', authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization?.substring(7);
      const decoded = token ? jwt.decode(token) as any : {};
      const role = decoded?.role;
      if (!['home_manager', 'group_admin'].includes(role))
        throw new AppError('Only managers can activate staff accounts', 403);
      await query(
        `UPDATE staff SET status='active', is_active=true WHERE id=$1`,
        [req.params.staffId]
      );
      res.json({ success: true, message: 'Staff account activated' } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
