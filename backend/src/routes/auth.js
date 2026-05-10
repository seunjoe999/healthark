const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');

const signAccess = (staffId) =>
  jwt.sign({ staffId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });

const signRefresh = (staffId) =>
  jwt.sign({ staffId }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;

  const { rows } = await query(
    `SELECT s.*, o.name as org_name
     FROM staff s
     JOIN organisations o ON o.id = s.organisation_id
     WHERE s.email = $1`,
    [email]
  );

  if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

  const staff = rows[0];
  if (staff.status !== 'active') return res.status(401).json({ error: 'Account inactive. Contact your manager.' });

  const valid = await bcrypt.compare(password, staff.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  // Update last login
  await query('UPDATE staff SET last_login = NOW() WHERE id = $1', [staff.id]);

  // Get home access list
  const { rows: homeAccess } = await query(
    `SELECT sha.*, h.name as home_name, h.postcode
     FROM staff_home_access sha
     JOIN homes h ON h.id = sha.home_id
     WHERE sha.staff_id = $1`,
    [staff.id]
  );

  // Get assigned home info if set
  let homeInfo = null;
  if (staff.home_id) {
    const { rows: h } = await query('SELECT id, name, postcode FROM homes WHERE id = $1', [staff.home_id]);
    homeInfo = h[0] || null;
  }

  const accessToken = signAccess(staff.id);
  const refreshToken = signRefresh(staff.id);

  res.json({
    accessToken,
    refreshToken,
    staff: {
      id: staff.id,
      firstName: staff.first_name,
      lastName: staff.last_name,
      preferredName: staff.preferred_name,
      email: staff.email,
      role: staff.role,
      photoUrl: staff.photo_url,
      organisationId: staff.organisation_id,
      orgName: staff.org_name,
      homeId: staff.home_id,
      home: homeInfo,
      homeAccess,
    },
  });
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const { rows } = await query(
      "SELECT id, status FROM staff WHERE id = $1 AND status = 'active'",
      [decoded.staffId]
    );
    if (!rows.length) return res.status(401).json({ error: 'User not found' });
    res.json({ accessToken: signAccess(decoded.staffId) });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  const { rows } = await query(
    `SELECT s.id, s.first_name, s.last_name, s.preferred_name, s.email, s.role,
            s.photo_url, s.organisation_id, s.home_id, s.status, s.last_login,
            o.name as org_name
     FROM staff s JOIN organisations o ON o.id = s.organisation_id
     WHERE s.id = $1`,
    [req.staffId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { currentPassword, newPassword } = req.body;
  const { rows } = await query('SELECT password_hash FROM staff WHERE id = $1', [req.staffId]);
  const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!valid) return res.status(400).json({ error: 'Current password incorrect' });

  const hash = await bcrypt.hash(newPassword, 12);
  await query('UPDATE staff SET password_hash = $1 WHERE id = $2', [hash, req.staffId]);
  res.json({ message: 'Password updated' });
});

module.exports = router;
