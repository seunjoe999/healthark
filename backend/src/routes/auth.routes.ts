import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validateRequest } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types';
import { addSseClient, removeSseClient } from '../services/sse.service';

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
      // Base query — only columns guaranteed to exist in all schema versions
      const rows = await query<any>(
        `SELECT id, email, password_hash, first_name, last_name, role,
                home_id, status, is_active
         FROM staff WHERE email = $1`,
        [email]
      );
      // Fetch optional columns separately so missing columns don't break login
      let extraCols: any = {};
      try {
        const extra = await query<any>(
          `SELECT organisation_id, photo_url, feature_flags FROM staff WHERE email = $1`, [email]
        );
        if (extra.length) extraCols = extra[0];
      } catch { /* columns may not exist yet */ }
      if (!rows.length) throw new AppError('Invalid email or password', 401);
      const staff = rows[0];
      if (!staff.is_active || staff.status === 'terminated' || staff.status === 'pending')
        throw new AppError('Account is inactive. Contact your administrator.', 401);
      // Guard against null/missing password_hash (e.g. externally-created accounts)
      if (!staff.password_hash) throw new AppError('Invalid email or password', 401);
      const valid = await bcrypt.compare(password, staff.password_hash);
      if (!valid) throw new AppError('Invalid email or password', 401);

      const payload = {
        staffId: staff.id, organisationId: extraCols.organisation_id ?? null,
        homeId: staff.home_id, role: staff.role, email: staff.email,
      };
      const accessToken = signAccess(payload);
      const refreshToken = signRefresh(payload);
      // Non-critical: persist refresh token and audit log — don't fail login if these columns/tables missing
      try {
        await query('UPDATE staff SET refresh_token=$1, last_login=NOW() WHERE id=$2', [refreshToken, staff.id]);
      } catch {
        try { await query('UPDATE staff SET refresh_token=$1 WHERE id=$2', [refreshToken, staff.id]); } catch {}
      }
      try {
        await query(
          `INSERT INTO audit_log (staff_id, home_id, action, ip_address) VALUES ($1,$2,'login',$3)`,
          [staff.id, staff.home_id, req.ip]
        );
      } catch {}

      // Merge role-level access rights with per-user overrides (same as /me endpoint)
      let loginRoleFlags: Record<string, boolean> = {};
      if (staff.home_id) {
        try {
          const rf = await query<any>(
            'SELECT feature_flags FROM role_access_rights WHERE home_id=$1 AND role=$2',
            [staff.home_id, staff.role]
          );
          if (rf.length) loginRoleFlags = rf[0].feature_flags || {};
        } catch {}
      }
      const loginMergedFlags = { ...loginRoleFlags, ...(extraCols.feature_flags || {}) };
      res.json({
        success: true,
        data: {
          accessToken, refreshToken,
          staff: {
            id: staff.id, email: staff.email,
            firstName: staff.first_name, lastName: staff.last_name,
            role: staff.role, homeId: staff.home_id,
            organisationId: extraCols.organisation_id ?? null,
            photoUrl: extraCols.photo_url ?? null,
            featureFlags: loginMergedFlags,
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

// GET /api/auth/db-check — diagnostic: count staff and admins (no auth required, temp endpoint)
router.get('/db-check', async (_req, res, next) => {
  try {
    const orgs = await query('SELECT COUNT(*) as count FROM organisations');
    const staffTotal = await query('SELECT COUNT(*) as count FROM staff');
    const admins = await query("SELECT COUNT(*) as count FROM staff WHERE role IN ('group_admin','home_manager') AND is_active = true");
    res.json({ success: true, data: {
      organisations: Number(orgs[0]?.count || 0),
      staffTotal: Number(staffTotal[0]?.count || 0),
      activeAdmins: Number(admins[0]?.count || 0),
    }});
  } catch (err) { next(err); }
});

// POST /api/auth/recover-admin — creates a group_admin ONLY if zero active admins exist
router.post('/recover-admin',
  [body('email').isEmail().normalizeEmail(), body('password').isLength({ min: 8 }), body('firstName').notEmpty(), body('lastName').notEmpty()],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const admins = await query("SELECT id FROM staff WHERE role IN ('group_admin','home_manager') AND is_active = true LIMIT 1");
      if (admins.length > 0) {
        res.status(403).json({ success: false, error: 'Admin accounts already exist. This endpoint is disabled.' });
        return;
      }
      const { email, password, firstName, lastName } = req.body;
      const org = await query<any>('SELECT id FROM organisations LIMIT 1');
      if (!org.length) { res.status(400).json({ success: false, error: 'No organisation found.' }); return; }
      const home = await query<any>('SELECT id FROM homes WHERE organisation_id=$1 LIMIT 1', [org[0].id]);
      if (!home.length) { res.status(400).json({ success: false, error: 'No home found.' }); return; }
      const hash = await bcrypt.hash(password, 12);
      await query(
        `INSERT INTO staff (organisation_id, home_id, email, password_hash, first_name, last_name, role, status, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,'group_admin','active',true)
         ON CONFLICT (email) DO UPDATE SET password_hash=$4, status='active', is_active=true, role='group_admin'`,
        [org[0].id, home[0].id, email, hash, firstName, lastName]
      );
      res.json({ success: true, message: 'Admin account created. You can now log in.' });
    } catch (err) { next(err); }
  }
);

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
    let rows: any[];
    try {
      rows = await query<any>(
        'SELECT id, email, first_name, last_name, role, home_id, organisation_id, photo_url, feature_flags FROM staff WHERE id=$1',
        [staffId]
      );
    } catch {
      rows = await query<any>(
        'SELECT id, email, first_name, last_name, role, home_id, organisation_id, photo_url FROM staff WHERE id=$1',
        [staffId]
      );
    }
    if (!rows.length) throw new AppError('Staff not found', 404);
    const s = rows[0];
    // Merge role-level access rights with per-user overrides
    let roleFlags: Record<string, boolean> = {};
    if (s.home_id) {
      try {
        const rf = await query<any>(
          'SELECT feature_flags FROM role_access_rights WHERE home_id=$1 AND role=$2',
          [s.home_id, s.role]
        );
        if (rf.length) roleFlags = rf[0].feature_flags || {};
      } catch {}
    }
    const mergedFlags = { ...roleFlags, ...(s.feature_flags || {}) };
    res.json({ success: true, data: {
      id: s.id, email: s.email,
      firstName: s.first_name, lastName: s.last_name,
      role: s.role, homeId: s.home_id,
      organisationId: s.organisation_id, photoUrl: s.photo_url,
      featureFlags: mergedFlags,
    }} as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/auth/events?token=xxx — SSE stream; pushes 'access-refresh' when role rights change
// EventSource cannot send Authorization headers, so token is passed as query param
router.get('/events', (req: Request, res: Response) => {
  const token = (req.query.token as string) || req.headers.authorization?.substring(7) || '';
  let homeId = '';
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    homeId = decoded?.homeId || '';
  } catch {
    res.status(401).end();
    return;
  }
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  res.write('event: connected\ndata: ok\n\n');
  const heartbeat = setInterval(() => {
    try { res.write(': ping\n\n'); } catch { clearInterval(heartbeat); }
  }, 25000);
  addSseClient(homeId, res);
  req.on('close', () => { removeSseClient(homeId, res); clearInterval(heartbeat); });
});

// PUT /api/auth/activate/:staffId — manager activates pending staff
router.put('/activate/:staffId', authenticate,
  param('staffId').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { role, homeId, organisationId } = req.staff;
      if (!['home_manager', 'group_admin'].includes(role))
        throw new AppError('Only managers can activate staff accounts', 403);

      // Ensure the target staff belongs to the manager's organisation (and home for home_manager)
      const scopeQuery = role === 'group_admin'
        ? 'SELECT id FROM staff WHERE id=$1 AND organisation_id=$2'
        : 'SELECT id FROM staff WHERE id=$1 AND home_id=$2';
      const scopeParam = role === 'group_admin' ? organisationId : homeId;
      const scopeRows = await query(scopeQuery, [req.params.staffId, scopeParam]);
      if (!scopeRows.length) throw new AppError('Staff member not found in your organisation', 403);

      await query(
        `UPDATE staff SET status='active', is_active=true WHERE id=$1`,
        [req.params.staffId]
      );
      res.json({ success: true, message: 'Staff account activated' } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
