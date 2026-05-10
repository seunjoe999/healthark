const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { query, withTransaction } = require('../config/db');
const { authenticate, requireRole, requireHomeAccess } = require('../middleware/auth');
const QRCode = require('qrcode');

// All routes require auth
router.use(authenticate);

// ── GET /api/staff  (list — admin/manager only) ─────────────────────────────
router.get('/', requireRole('home_manager', 'group_admin'), async (req, res) => {
  const { homeId, status, role, search } = req.query;

  let sql = `
    SELECT s.id, s.first_name, s.last_name, s.preferred_name, s.email,
           s.role, s.status, s.phone, s.photo_url, s.start_date, s.home_id,
           h.name as home_name,
           s.holiday_hours_total, s.holiday_hours_used,
           s.last_login, s.created_at
    FROM staff s
    LEFT JOIN homes h ON h.id = s.home_id
    WHERE s.organisation_id = $1
  `;
  const params = [req.orgId];
  let idx = 2;

  if (req.staff.role === 'home_manager' && !homeId) {
    sql += ` AND s.home_id = $${idx++}`;
    params.push(req.staff.home_id);
  } else if (homeId) {
    sql += ` AND s.home_id = $${idx++}`;
    params.push(homeId);
  }
  if (status) { sql += ` AND s.status = $${idx++}`; params.push(status); }
  if (role)   { sql += ` AND s.role = $${idx++}`;   params.push(role); }
  if (search) {
    sql += ` AND (s.first_name ILIKE $${idx} OR s.last_name ILIKE $${idx} OR s.email ILIKE $${idx})`;
    params.push(`%${search}%`); idx++;
  }

  sql += ' ORDER BY s.last_name, s.first_name';
  const { rows } = await query(sql, params);
  res.json(rows);
});

// ── GET /api/staff/:id ──────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const isSelf = id === req.staffId;
  const isManager = ['home_manager','group_admin'].includes(req.staff.role);
  if (!isSelf && !isManager) return res.status(403).json({ error: 'Forbidden' });

  const { rows } = await query(
    `SELECT s.*, h.name as home_name
     FROM staff s LEFT JOIN homes h ON h.id = s.home_id
     WHERE s.id = $1 AND s.organisation_id = $2`,
    [id, req.orgId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Staff not found' });

  const staff = rows[0];
  delete staff.password_hash;
  delete staff.ni_number_encrypted;

  // Fetch onboarding
  const { rows: onboarding } = await query(
    'SELECT * FROM staff_onboarding WHERE staff_id = $1', [id]
  );
  // Fetch training
  const { rows: training } = await query(
    'SELECT * FROM staff_training WHERE staff_id = $1 ORDER BY completed_date DESC', [id]
  );
  // Fetch home access
  const { rows: homeAccess } = await query(
    `SELECT sha.*, h.name as home_name FROM staff_home_access sha
     JOIN homes h ON h.id = sha.home_id WHERE sha.staff_id = $1`, [id]
  );

  res.json({ ...staff, onboarding: onboarding[0] || null, training, homeAccess });
});

// ── POST /api/staff  (create new staff member) ─────────────────────────────
router.post('/', requireRole('home_manager','group_admin'), [
  body('email').isEmail().normalizeEmail(),
  body('firstName').notEmpty(),
  body('lastName').notEmpty(),
  body('role').isIn(['care_staff','senior_carer','home_manager','group_admin','auditor']),
  body('password').isLength({ min: 8 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const {
    email, password, firstName, lastName, preferredName, role,
    homeId, phone, startDate, dateOfBirth, gender, nationality,
    maritalStatus, addressLine1, addressLine2, addressLine3, postcode,
    emergencyContactName, emergencyContactPhone, accessAnyNetwork,
  } = req.body;

  // Ensure home belongs to org
  if (homeId) {
    const { rows: h } = await query(
      'SELECT id FROM homes WHERE id = $1 AND organisation_id = $2', [homeId, req.orgId]
    );
    if (!h.length) return res.status(400).json({ error: 'Invalid home' });
  }

  const hash = await bcrypt.hash(password, 12);

  const result = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO staff (organisation_id, home_id, email, password_hash,
        first_name, last_name, preferred_name, role, phone, start_date,
        date_of_birth, gender, nationality, marital_status,
        address_line1, address_line2, address_line3, postcode,
        emergency_contact_name, emergency_contact_phone, access_any_network)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
       RETURNING id, first_name, last_name, email, role`,
      [req.orgId, homeId || null, email, hash, firstName, lastName,
       preferredName || null, role, phone || null, startDate || null,
       dateOfBirth || null, gender || null, nationality || null,
       maritalStatus || null, addressLine1 || null, addressLine2 || null,
       addressLine3 || null, postcode || null, emergencyContactName || null,
       emergencyContactPhone || null, accessAnyNetwork !== false]
    );

    const staffId = rows[0].id;

    // Create onboarding record
    await client.query(
      'INSERT INTO staff_onboarding (staff_id) VALUES ($1)', [staffId]
    );

    // Auto-grant home access if homeId provided
    if (homeId) {
      await client.query(
        `INSERT INTO staff_home_access (staff_id, home_id) VALUES ($1, $2)
         ON CONFLICT (staff_id, home_id) DO NOTHING`, [staffId, homeId]
      );
    }

    return rows[0];
  });

  res.status(201).json(result);
});

// ── PATCH /api/staff/:id  (update profile) ─────────────────────────────────
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const isSelf = id === req.staffId;
  const isManager = ['home_manager','group_admin'].includes(req.staff.role);
  if (!isSelf && !isManager) return res.status(403).json({ error: 'Forbidden' });

  const allowed = [
    'first_name','last_name','preferred_name','phone',
    'address_line1','address_line2','address_line3','postcode',
    'date_of_birth','gender','nationality','marital_status',
    'emergency_contact_name','emergency_contact_phone','emergency_contact_notes',
    'photo_url',
  ];
  // Managers can also update these
  if (isManager) allowed.push('role','status','home_id','start_date','leave_date',
    'holiday_hours_total','access_any_network');

  const updates = {};
  const body = req.body;
  for (const [k, v] of Object.entries(body)) {
    // Convert camelCase to snake_case
    const snake = k.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);
    if (allowed.includes(snake)) updates[snake] = v;
  }

  if (!Object.keys(updates).length) return res.status(400).json({ error: 'No valid fields to update' });

  const sets = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(', ');
  const vals = Object.values(updates);

  const { rows } = await query(
    `UPDATE staff SET ${sets}, updated_at = NOW() WHERE id = $1 AND organisation_id = $${vals.length + 2}
     RETURNING id, first_name, last_name, email, role, status`,
    [id, ...vals, req.orgId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Staff not found' });
  res.json(rows[0]);
});

// ── Onboarding ──────────────────────────────────────────────────────────────
router.patch('/:id/onboarding', requireRole('home_manager','group_admin'), async (req, res) => {
  const { id } = req.params;
  const fields = req.body;
  const allowed = [
    'application_received','application_date','interview_completed','interview_date','interview_notes',
    'dbs_submitted_date','dbs_cleared','dbs_cleared_date','dbs_certificate_url',
    'references_received','references_date','references_evidence_url',
    'care_certificate_completed','care_certificate_date','induction_completed','induction_date',
    'medication_training_completed','medication_training_date','right_to_work_verified',
    'right_to_work_doc_url','system_training_completed','system_training_date',
  ];
  const updates = {};
  for (const [k, v] of Object.entries(fields)) {
    const snake = k.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);
    if (allowed.includes(snake)) updates[snake] = v;
  }
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'No valid fields' });

  const sets = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(', ');
  const { rows } = await query(
    `UPDATE staff_onboarding SET ${sets}, updated_at = NOW()
     WHERE staff_id = $1 RETURNING *`,
    [id, ...Object.values(updates)]
  );
  res.json(rows[0]);
});

// ── Training ────────────────────────────────────────────────────────────────
router.post('/:id/training', requireRole('home_manager','group_admin'), [
  body('courseName').notEmpty(),
  body('completedDate').isISO8601(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { courseName, completedDate, durationHours, certificateUrl, expiryDate } = req.body;
  const { rows } = await query(
    `INSERT INTO staff_training (staff_id, home_id, course_name, completed_date, duration_hours, certificate_url, expiry_date, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [req.params.id, req.staff.home_id, courseName, completedDate,
     durationHours || null, certificateUrl || null, expiryDate || null, req.staffId]
  );
  res.status(201).json(rows[0]);
});

router.get('/:id/training', async (req, res) => {
  const { rows } = await query(
    'SELECT * FROM staff_training WHERE staff_id = $1 ORDER BY completed_date DESC',
    [req.params.id]
  );
  res.json(rows);
});

// ── Leave ────────────────────────────────────────────────────────────────────
router.get('/:id/leave', async (req, res) => {
  const { rows } = await query(
    'SELECT * FROM staff_leave WHERE staff_id = $1 ORDER BY created_at DESC',
    [req.params.id]
  );
  res.json(rows);
});

router.post('/:id/leave', [
  body('leaveType').isIn(['annual','sick','unauthorised','maternity','paternity','compassionate','other']),
  body('startDate').isISO8601(),
  body('endDate').isISO8601(),
  body('hoursRequested').isFloat({ min: 0 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const isSelf = req.params.id === req.staffId;
  const isManager = ['home_manager','group_admin'].includes(req.staff.role);
  if (!isSelf && !isManager) return res.status(403).json({ error: 'Forbidden' });

  const { leaveType, startDate, endDate, hoursRequested, reason } = req.body;

  // Check balance for annual leave
  if (leaveType === 'annual') {
    const { rows: s } = await query(
      'SELECT holiday_hours_total, holiday_hours_used FROM staff WHERE id = $1',
      [req.params.id]
    );
    const remaining = s[0].holiday_hours_total - s[0].holiday_hours_used;
    if (hoursRequested > remaining) {
      return res.status(400).json({ error: `Insufficient leave balance. Remaining: ${remaining}h` });
    }
  }

  const { rows } = await query(
    `INSERT INTO staff_leave (staff_id, home_id, leave_type, start_date, end_date, hours_requested, reason)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [req.params.id, req.staff.home_id, leaveType, startDate, endDate, hoursRequested, reason || null]
  );
  res.status(201).json(rows[0]);
});

// Approve / decline leave
router.patch('/leave/:leaveId/decision', requireRole('home_manager','group_admin'), async (req, res) => {
  const { decision, declinedReason } = req.body;
  if (!['approved','declined'].includes(decision)) return res.status(400).json({ error: 'Invalid decision' });

  const { rows: leave } = await query('SELECT * FROM staff_leave WHERE id = $1', [req.params.leaveId]);
  if (!leave.length) return res.status(404).json({ error: 'Leave request not found' });

  const result = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `UPDATE staff_leave SET status = $1, approved_by = $2, approved_at = NOW(), declined_reason = $3
       WHERE id = $4 RETURNING *`,
      [decision, req.staffId, declinedReason || null, req.params.leaveId]
    );

    // Auto-deduct hours if annual leave approved
    if (decision === 'approved' && leave[0].leave_type === 'annual') {
      await client.query(
        'UPDATE staff SET holiday_hours_used = holiday_hours_used + $1 WHERE id = $2',
        [leave[0].hours_requested, leave[0].staff_id]
      );
    }

    return rows[0];
  });

  res.json(result);
});

// ── Clock events ─────────────────────────────────────────────────────────────
router.post('/clock', async (req, res) => {
  const { homeId, eventType, latitude, longitude, qrScan, scheduledStart } = req.body;
  if (!['clock_in','clock_out'].includes(eventType)) return res.status(400).json({ error: 'Invalid event type' });

  // Geofence check
  let geofencePassed = false;
  let distanceMetres = null;

  if (latitude && longitude) {
    const { rows: home } = await query(
      'SELECT latitude, longitude, geofence_radius_metres FROM homes WHERE id = $1',
      [homeId]
    );
    if (home.length && home[0].latitude) {
      const geolib = require('geolib');
      distanceMetres = Math.round(geolib.getDistance(
        { latitude, longitude },
        { latitude: home[0].latitude, longitude: home[0].longitude }
      ));
      geofencePassed = distanceMetres <= home[0].geofence_radius_metres;
    }
  }

  if (qrScan) geofencePassed = true; // QR scan overrides GPS

  if (!geofencePassed && !qrScan) {
    return res.status(400).json({
      error: 'You are too far from the care home to clock in.',
      distanceMetres,
    });
  }

  // Calculate punctuality
  let punctuality = null;
  let minutesVariance = null;
  if (scheduledStart && eventType === 'clock_in') {
    const diff = Math.round((Date.now() - new Date(scheduledStart).getTime()) / 60000);
    minutesVariance = diff;
    punctuality = diff < -5 ? 'early' : diff <= 5 ? 'on_time' : 'late';
  }

  const { rows } = await query(
    `INSERT INTO staff_clock_events
     (staff_id, home_id, event_type, latitude, longitude, distance_metres,
      geofence_passed, qr_scan, scheduled_start, punctuality, minutes_variance)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [req.staffId, homeId, eventType, latitude || null, longitude || null,
     distanceMetres, geofencePassed, qrScan || false,
     scheduledStart || null, punctuality, minutesVariance]
  );
  res.status(201).json(rows[0]);
});

router.get('/:id/clock-events', requireRole('home_manager','group_admin'), async (req, res) => {
  const { startDate, endDate } = req.query;
  const { rows } = await query(
    `SELECT ce.*, h.name as home_name
     FROM staff_clock_events ce
     JOIN homes h ON h.id = ce.home_id
     WHERE ce.staff_id = $1
       AND ($2::date IS NULL OR ce.ts::date >= $2)
       AND ($3::date IS NULL OR ce.ts::date <= $3)
     ORDER BY ce.ts DESC`,
    [req.params.id, startDate || null, endDate || null]
  );
  res.json(rows);
});

// ── Cautions ──────────────────────────────────────────────────────────────
router.post('/:id/cautions', requireRole('home_manager','group_admin'), async (req, res) => {
  const { overview, strengths, weaknesses, actionPoints, cautionDate } = req.body;
  const { rows } = await query(
    `INSERT INTO staff_cautions (staff_id, home_id, issued_by, overview, strengths, weaknesses, action_points, caution_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [req.params.id, req.staff.home_id, req.staffId, overview, strengths || null,
     weaknesses || null, actionPoints || null, cautionDate || new Date()]
  );
  res.status(201).json(rows[0]);
});

router.get('/:id/cautions', requireRole('home_manager','group_admin'), async (req, res) => {
  const { rows } = await query(
    `SELECT c.*, s.first_name || ' ' || s.last_name as issued_by_name
     FROM staff_cautions c JOIN staff s ON s.id = c.issued_by
     WHERE c.staff_id = $1 ORDER BY c.caution_date DESC`, [req.params.id]
  );
  res.json(rows);
});

// ── Absences ──────────────────────────────────────────────────────────────
router.post('/:id/absences', requireRole('home_manager','group_admin'), async (req, res) => {
  const { absenceType, absenceStart, absenceEnd } = req.body;
  const { rows } = await query(
    `INSERT INTO staff_absences (staff_id, home_id, absence_type, absence_start, absence_end, created_by)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [req.params.id, req.staff.home_id, absenceType, absenceStart, absenceEnd || null, req.staffId]
  );
  res.status(201).json(rows[0]);
});

// ── Assessments ───────────────────────────────────────────────────────────
router.post('/:id/assessments', requireRole('home_manager','group_admin'), [
  body('assessmentType').notEmpty(),
  body('assessmentDate').isISO8601(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { assessmentType, customName, assessmentDate, outcome, recommendations, nextDueDate, documentUrl } = req.body;
  const { rows } = await query(
    `INSERT INTO staff_assessments (staff_id, home_id, conducted_by, assessment_type, custom_name, assessment_date, outcome, recommendations, next_due_date, document_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [req.params.id, req.staff.home_id, req.staffId, assessmentType, customName || null,
     assessmentDate, outcome || null, recommendations || null, nextDueDate || null, documentUrl || null]
  );
  res.status(201).json(rows[0]);
});

router.get('/:id/assessments', async (req, res) => {
  const isSelf = req.params.id === req.staffId;
  const isManager = ['home_manager','group_admin'].includes(req.staff.role);
  if (!isSelf && !isManager) return res.status(403).json({ error: 'Forbidden' });
  const { rows } = await query(
    `SELECT sa.*, s.first_name || ' ' || s.last_name as conducted_by_name
     FROM staff_assessments sa JOIN staff s ON s.id = sa.conducted_by
     WHERE sa.staff_id = $1 ORDER BY sa.assessment_date DESC`, [req.params.id]
  );
  res.json(rows);
});

// ── Home access config ─────────────────────────────────────────────────────
router.put('/:id/home-access/:homeId', requireRole('group_admin'), async (req, res) => {
  const { id, homeId } = req.params;
  const perms = req.body;
  const { rows } = await query(
    `INSERT INTO staff_home_access (staff_id, home_id,
       can_view_care_plans, can_edit_care_plans, can_view_sensitive_notes,
       can_run_reports, can_manage_staff, can_approve_leave,
       can_view_phone_numbers, can_view_keysafe)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (staff_id, home_id) DO UPDATE SET
       can_view_care_plans = $3, can_edit_care_plans = $4,
       can_view_sensitive_notes = $5, can_run_reports = $6,
       can_manage_staff = $7, can_approve_leave = $8,
       can_view_phone_numbers = $9, can_view_keysafe = $10
     RETURNING *`,
    [id, homeId,
     perms.canViewCarePlans ?? true, perms.canEditCarePlans ?? false,
     perms.canViewSensitiveNotes ?? false, perms.canRunReports ?? false,
     perms.canManageStaff ?? false, perms.canApproveLeave ?? false,
     perms.canViewPhoneNumbers ?? true, perms.canViewKeysafe ?? false]
  );
  res.json(rows[0]);
});

module.exports = router;
