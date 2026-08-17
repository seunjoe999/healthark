import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';

const router = Router();
router.use(authenticate);

function fromToken(req: Request, field: string): string {
  const token = req.headers.authorization?.substring(7);
  if (token) { const d = jwt.decode(token) as any; return (req.staff as any)?.[field] || d?.[field] || ''; }
  return (req.staff as any)?.[field] || '';
}

// ── DBS Records ───────────────────────────────────────────────────────────────
router.get('/dbs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const role = fromToken(req, 'role');
    const myStaffId = fromToken(req, 'staffId');
    const isPrivileged = ['home_manager', 'group_admin', 'deputy_manager', 'admin', 'director', 'registered_manager', 'service_manager'].includes(role);
    const staffId = isPrivileged ? (req.query.staffId as string) : myStaffId;
    let sql = `SELECT d.*, s.first_name || ' ' || s.last_name AS staff_name, s.photo_url
               FROM staff_dbs d JOIN staff s ON s.id = d.staff_id
               WHERE d.home_id = $1`;
    const params: any[] = [homeId];
    if (staffId) { sql += ` AND d.staff_id = $2`; params.push(staffId); }
    sql += ' ORDER BY d.expiry_date ASC NULLS LAST';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

router.post('/dbs',
  [body('staffId').isUUID(), body('issueDate').isDate(), body('dbsType').notEmpty()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const createdBy = fromToken(req, 'staffId');
      const homeId = req.body.homeId || fromToken(req, 'homeId');
      const { staffId, dbsNumber, dbsType, issueDate, expiryDate, updateService, notes, documentUrl } = req.body;

      // Auto-calculate status
      let status = 'valid';
      if (expiryDate) {
        const expiry = new Date(expiryDate);
        const now = new Date();
        const daysLeft = Math.floor((expiry.getTime() - now.getTime()) / 86400000);
        if (daysLeft < 0) status = 'expired';
        else if (daysLeft < 60) status = 'expiring_soon';
      }

      const rows = await query(`
        INSERT INTO staff_dbs (staff_id, home_id, dbs_number, dbs_type, issue_date, expiry_date, update_service, status, notes, document_url, created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [staffId, homeId, dbsNumber || null, dbsType, issueDate, expiryDate || null, updateService || false, status, notes || null, documentUrl || null, createdBy]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.patch('/dbs/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { dbsNumber, dbsType, issueDate, expiryDate, updateService, notes, documentUrl } = req.body;
      let status = req.body.status || 'valid';
      if (expiryDate) {
        const expiry = new Date(expiryDate);
        const now = new Date();
        const daysLeft = Math.floor((expiry.getTime() - now.getTime()) / 86400000);
        if (daysLeft < 0) status = 'expired';
        else if (daysLeft < 60) status = 'expiring_soon';
      }
      await query(`
        UPDATE staff_dbs SET
          dbs_number = COALESCE($1, dbs_number),
          dbs_type = COALESCE($2::dbs_type, dbs_type),
          issue_date = COALESCE($3, issue_date),
          expiry_date = $4,
          update_service = COALESCE($5, update_service),
          status = $6::doc_status,
          notes = COALESCE($7, notes),
          document_url = COALESCE($8, document_url),
          updated_at = NOW()
        WHERE id = $9`,
        [dbsNumber || null, dbsType || null, issueDate || null, expiryDate || null,
         updateService, status, notes || null, documentUrl || null, req.params.id]
      );
      const updated = await query('SELECT * FROM staff_dbs WHERE id = $1', [req.params.id]);
      res.json({ success: true, data: updated[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// ── References ────────────────────────────────────────────────────────────────
router.get('/references', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const role = fromToken(req, 'role');
    const myStaffId = fromToken(req, 'staffId');
    const isPrivileged = ['home_manager', 'group_admin', 'deputy_manager', 'admin', 'director', 'registered_manager', 'service_manager'].includes(role);
    const staffId = isPrivileged ? (req.query.staffId as string) : myStaffId;
    let sql = `SELECT r.*, s.first_name || ' ' || s.last_name AS staff_name
               FROM staff_references r JOIN staff s ON s.id = r.staff_id
               WHERE r.home_id = $1`;
    const params: any[] = [homeId];
    if (staffId) { sql += ` AND r.staff_id = $2`; params.push(staffId); }
    sql += ' ORDER BY r.created_at DESC';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

router.post('/references',
  [body('staffId').isUUID(), body('refereeName').notEmpty()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = req.body.homeId || fromToken(req, 'homeId');
      const { staffId, refereeName, refereePosition, refereeCompany, refereeEmail, refereePhone, referenceType, receivedDate, status, notes, documentUrl } = req.body;
      const rows = await query(`
        INSERT INTO staff_references (staff_id, home_id, referee_name, referee_position, referee_company, referee_email, referee_phone, reference_type, received_date, status, notes, document_url)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [staffId, homeId, refereeName, refereePosition || null, refereeCompany || null, refereeEmail || null, refereePhone || null, referenceType || 'professional', receivedDate || null, status || 'pending', notes || null, documentUrl || null]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// ── Right to Work ─────────────────────────────────────────────────────────────
router.get('/right-to-work', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const role = fromToken(req, 'role');
    const myStaffId = fromToken(req, 'staffId');
    const isPrivileged = ['home_manager', 'group_admin', 'deputy_manager', 'admin', 'director', 'registered_manager', 'service_manager'].includes(role);
    const staffId = isPrivileged ? (req.query.staffId as string) : myStaffId;
    let sql = `SELECT r.*, s.first_name || ' ' || s.last_name AS staff_name
               FROM staff_right_to_work r JOIN staff s ON s.id = r.staff_id
               WHERE r.home_id = $1`;
    const params: any[] = [homeId];
    if (staffId) { sql += ` AND r.staff_id = $2`; params.push(staffId); }
    sql += ' ORDER BY r.expiry_date ASC NULLS LAST';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

router.post('/right-to-work',
  [body('staffId').isUUID(), body('documentType').notEmpty()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = req.body.homeId || fromToken(req, 'homeId');
      const { staffId, documentType, documentNumber, expiryDate, documentUrl } = req.body;
      let status = 'valid';
      if (expiryDate) {
        const daysLeft = Math.floor((new Date(expiryDate).getTime() - Date.now()) / 86400000);
        if (daysLeft < 0) status = 'expired';
        else if (daysLeft < 60) status = 'expiring_soon';
      }
      const rows = await query(`
        INSERT INTO staff_right_to_work (staff_id, home_id, document_type, document_number, expiry_date, status, document_url)
        VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [staffId, homeId, documentType, documentNumber || null, expiryDate || null, status, documentUrl || null]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// ── Summary for a staff member ────────────────────────────────────────────────
router.get('/summary/:staffId', param('staffId').matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
      const role = fromToken(req, 'role');
      const myStaffId = fromToken(req, 'staffId');
      const isPrivileged = ['home_manager', 'group_admin', 'deputy_manager', 'admin', 'director', 'registered_manager', 'service_manager'].includes(role);
      if (!isPrivileged && req.params.staffId !== myStaffId) {
        throw new AppError('Forbidden', 403);
      }
      const [dbs, references, rtw] = await Promise.all([
        query('SELECT * FROM staff_dbs WHERE staff_id = $1 AND home_id = $2 ORDER BY created_at DESC LIMIT 1', [req.params.staffId, homeId]).catch(() => []),
        query('SELECT * FROM staff_references WHERE staff_id = $1 AND home_id = $2 ORDER BY created_at DESC', [req.params.staffId, homeId]).catch(() => []),
        query('SELECT * FROM staff_right_to_work WHERE staff_id = $1 AND home_id = $2 ORDER BY created_at DESC', [req.params.staffId, homeId]).catch(() => []),
      ]);
      res.json({ success: true, data: { dbs: dbs[0] || null, references, rightToWork: rtw } } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// ── Compliance overview ───────────────────────────────────────────────────────
router.get('/compliance-overview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const role = fromToken(req, 'role');
    const isPrivileged = ['home_manager', 'group_admin', 'deputy_manager', 'admin', 'director', 'registered_manager', 'service_manager'].includes(role);
    if (!isPrivileged) {
      throw new AppError('Forbidden', 403);
    }
    const rows = await query(`
      SELECT
        s.id, s.first_name, s.last_name, s.photo_url, s.role,
        d.dbs_number, d.expiry_date AS dbs_expiry, d.status AS dbs_status,
        (SELECT COUNT(*) FROM staff_references sr WHERE sr.staff_id = s.id AND sr.home_id = $1 AND sr.status = 'valid')::int AS refs_received,
        (SELECT COUNT(*) FROM staff_right_to_work rw WHERE rw.staff_id = s.id AND rw.home_id = $1 AND rw.status = 'valid')::int AS rtw_docs
      FROM staff s
      LEFT JOIN staff_dbs d ON d.staff_id = s.id AND d.home_id = $1
      WHERE s.home_id = $1 AND s.is_active = TRUE
      ORDER BY s.first_name, s.last_name`,
      [homeId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

export default router;
