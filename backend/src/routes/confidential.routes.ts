import { Router, Request, Response, NextFunction } from 'express';
import { param } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { ApiResponse } from '../types';

const router = Router();
router.use(authenticate);

const MANAGEMENT: string[] = ['group_admin', 'home_manager', 'deputy_manager', 'admin'];
const isMgmt = (req: Request) => MANAGEMENT.includes(req.staff?.role);

// POST /api/confidential — create a record
// Staff can create service_user records; management only for staff records
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeId, subjectType, subjectId, title, content, documentUrl, documentName, signatureData, signedBy } = req.body;

    if (!homeId || !subjectType || !subjectId || !title) {
      res.status(400).json({ success: false, error: 'homeId, subjectType, subjectId, and title are required' } as ApiResponse);
      return;
    }

    if (!['service_user', 'staff'].includes(subjectType)) {
      res.status(400).json({ success: false, error: 'subjectType must be service_user or staff' } as ApiResponse);
      return;
    }

    if (subjectType === 'staff' && !isMgmt(req)) {
      res.status(403).json({ success: false, error: 'Only management can create staff confidential records' } as ApiResponse);
      return;
    }

    const rows = await query(
      `INSERT INTO confidential_info
         (home_id, subject_type, subject_id, title, content, document_url, document_name, signature_data, signed_by, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [homeId, subjectType, subjectId, title, content || null, documentUrl || null, documentName || null, signatureData || null, signedBy || null, req.staff.staffId]
    );

    res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
  } catch (err) {
    next(err);
  }
});

// GET /api/confidential — list all records for home (management only)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isMgmt(req)) {
      res.status(403).json({ success: false, error: 'Access denied' } as ApiResponse);
      return;
    }

    const homeId = (req.query.homeId as string) || req.staff.homeId;
    const subjectType = req.query.subjectType as string | undefined;

    let sql = `
      SELECT ci.*,
             s.first_name || ' ' || s.last_name AS created_by_name,
             CASE
               WHEN ci.subject_type = 'service_user' THEN
                 (SELECT su.first_name || ' ' || su.last_name FROM service_users su WHERE su.id = ci.subject_id)
               WHEN ci.subject_type = 'staff' THEN
                 (SELECT st.first_name || ' ' || st.last_name FROM staff st WHERE st.id = ci.subject_id)
             END AS subject_name
      FROM confidential_info ci
      LEFT JOIN staff s ON s.id = ci.created_by
      WHERE ci.home_id = $1
    `;
    const params: unknown[] = [homeId];

    if (subjectType) {
      params.push(subjectType);
      sql += ` AND ci.subject_type = $${params.length}`;
    }

    sql += ' ORDER BY ci.created_at DESC';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) {
    next(err);
  }
});

// GET /api/confidential/su/:suId — records for a specific service user (management only)
router.get('/su/:suId', param('suId').isUUID(), validateRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isMgmt(req)) {
      res.status(403).json({ success: false, error: 'Access denied' } as ApiResponse);
      return;
    }
    const rows = await query(
      `SELECT ci.*, s.first_name || ' ' || s.last_name AS created_by_name
       FROM confidential_info ci
       LEFT JOIN staff s ON s.id = ci.created_by
       WHERE ci.subject_id = $1 AND ci.subject_type = 'service_user'
       ORDER BY ci.created_at DESC`,
      [req.params.suId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) {
    next(err);
  }
});

// GET /api/confidential/staff/:staffId — records for a specific staff member (management only)
router.get('/staff/:staffId', param('staffId').isUUID(), validateRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isMgmt(req)) {
      res.status(403).json({ success: false, error: 'Access denied' } as ApiResponse);
      return;
    }
    const rows = await query(
      `SELECT ci.*, s.first_name || ' ' || s.last_name AS created_by_name
       FROM confidential_info ci
       LEFT JOIN staff s ON s.id = ci.created_by
       WHERE ci.subject_id = $1 AND ci.subject_type = 'staff'
       ORDER BY ci.created_at DESC`,
      [req.params.staffId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/confidential/:id — management only
router.delete('/:id', param('id').isUUID(), validateRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isMgmt(req)) {
      res.status(403).json({ success: false, error: 'Access denied' } as ApiResponse);
      return;
    }
    await query('DELETE FROM confidential_info WHERE id = $1', [req.params.id]);
    res.json({ success: true } as ApiResponse);
  } catch (err) {
    next(err);
  }
});

export default router;
