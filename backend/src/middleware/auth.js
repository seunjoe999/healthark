const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

// Verify JWT and attach staff to req
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { rows } = await query(
      `SELECT s.id, s.organisation_id, s.home_id, s.first_name, s.last_name,
              s.role, s.status, s.email, s.access_any_network
       FROM staff s WHERE s.id = $1 AND s.status = 'active'`,
      [decoded.staffId]
    );

    if (!rows.length) return res.status(401).json({ error: 'User not found or inactive' });

    req.staff = rows[0];
    req.staffId = rows[0].id;
    req.orgId = rows[0].organisation_id;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expired' });
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Role hierarchy
const ROLE_LEVELS = {
  care_staff: 1,
  senior_carer: 2,
  home_manager: 3,
  auditor: 3,
  group_admin: 5,
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.staff) return res.status(401).json({ error: 'Not authenticated' });
  if (roles.includes(req.staff.role)) return next();
  const minLevel = Math.min(...roles.map(r => ROLE_LEVELS[r] || 0));
  if (ROLE_LEVELS[req.staff.role] >= minLevel) return next();
  return res.status(403).json({ error: 'Insufficient permissions' });
};

// Verify staff can access a specific home
const requireHomeAccess = async (req, res, next) => {
  try {
    const homeId = req.params.homeId || req.body.homeId || req.query.homeId;
    if (!homeId) return next();

    const { staff } = req;

    // Group admin sees all homes in their org
    if (staff.role === 'group_admin') {
      const { rows } = await query(
        'SELECT id FROM homes WHERE id = $1 AND organisation_id = $2',
        [homeId, staff.organisation_id]
      );
      if (!rows.length) return res.status(403).json({ error: 'Home not in your organisation' });
      req.homeId = homeId;
      return next();
    }

    // Others need explicit access
    const { rows } = await query(
      'SELECT * FROM staff_home_access WHERE staff_id = $1 AND home_id = $2',
      [staff.id, homeId]
    );
    if (!rows.length) return res.status(403).json({ error: 'No access to this home' });
    req.homeAccess = rows[0];
    req.homeId = homeId;
    next();
  } catch (err) {
    next(err);
  }
};

// Audit log middleware
const auditLog = (action, tableName) => async (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = async (data) => {
    try {
      if (res.statusCode < 400 && req.staff) {
        await query(
          `INSERT INTO audit_log (home_id, staff_id, action, table_name, record_id, new_values, ip_address, user_agent)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            req.homeId || null,
            req.staffId,
            action,
            tableName,
            data?.id || data?.data?.id || null,
            JSON.stringify(data),
            req.ip,
            req.get('user-agent'),
          ]
        );
      }
    } catch (_) {}
    return originalJson(data);
  };
  next();
};

module.exports = { authenticate, requireRole, requireHomeAccess, auditLog };
