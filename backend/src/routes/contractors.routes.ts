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

// Ensure table exists
async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS contractors (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      home_id UUID NOT NULL,
      company_name TEXT NOT NULL,
      contact_name TEXT,
      contact_phone TEXT,
      contact_email TEXT,
      service_type TEXT NOT NULL,
      insurance_expiry DATE,
      dbs_required BOOLEAN DEFAULT false,
      dbs_expiry DATE,
      gas_safe_number TEXT,
      electrician_number TEXT,
      contract_start DATE,
      contract_end DATE,
      last_visit_date DATE,
      next_scheduled_visit DATE,
      notes TEXT,
      status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','expired')),
      added_by UUID NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `, []);
}

router.use(async (_req, _res, next) => {
  try { await ensureTable(); } catch (_) {}
  next();
});

// GET /api/contractors
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const status = req.query.status as string;
    const serviceType = req.query.serviceType as string;
    let sql = `SELECT c.*, s.first_name || ' ' || s.last_name AS added_by_name
               FROM contractors c
               LEFT JOIN staff s ON s.id = c.added_by
               WHERE c.home_id = $1`;
    const params: any[] = [homeId];
    if (status) { sql += ` AND c.status = $${params.length + 1}`; params.push(status); }
    if (serviceType) { sql += ` AND c.service_type = $${params.length + 1}`; params.push(serviceType); }
    sql += ' ORDER BY c.company_name ASC';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/contractors/expiring
router.get('/expiring', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const rows = await query(`
      SELECT * FROM contractors
      WHERE home_id = $1
        AND status = 'active'
        AND (
          (insurance_expiry IS NOT NULL AND insurance_expiry <= CURRENT_DATE + INTERVAL '30 days' AND insurance_expiry >= CURRENT_DATE)
          OR
          (dbs_required = true AND dbs_expiry IS NOT NULL AND dbs_expiry <= CURRENT_DATE + INTERVAL '30 days' AND dbs_expiry >= CURRENT_DATE)
          OR
          (insurance_expiry < CURRENT_DATE)
          OR
          (dbs_required = true AND dbs_expiry < CURRENT_DATE)
        )
      ORDER BY LEAST(
        COALESCE(insurance_expiry, '9999-12-31'),
        COALESCE(dbs_expiry, '9999-12-31')
      ) ASC
    `, [homeId]);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/contractors
router.post('/',
  [body('companyName').notEmpty().withMessage('Company name is required'),
   body('serviceType').notEmpty().withMessage('Service type is required')],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const addedBy = fromToken(req, 'staffId');
      const homeId = req.body.homeId || fromToken(req, 'homeId');
      const {
        companyName, contactName, contactPhone, contactEmail, serviceType,
        insuranceExpiry, dbsRequired, dbsExpiry, gasSafeNumber, electricianNumber,
        contractStart, contractEnd, lastVisitDate, nextScheduledVisit, notes, status
      } = req.body;
      const rows = await query(`
        INSERT INTO contractors (
          home_id, company_name, contact_name, contact_phone, contact_email,
          service_type, insurance_expiry, dbs_required, dbs_expiry,
          gas_safe_number, electrician_number, contract_start, contract_end,
          last_visit_date, next_scheduled_visit, notes, status, added_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
        RETURNING *`,
        [homeId, companyName, contactName || null, contactPhone || null, contactEmail || null,
         serviceType, insuranceExpiry || null, dbsRequired || false, dbsExpiry || null,
         gasSafeNumber || null, electricianNumber || null, contractStart || null, contractEnd || null,
         lastVisitDate || null, nextScheduledVisit || null, notes || null, status || 'active', addedBy]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// PUT /api/contractors/:id
router.put('/:id',
  param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await query('SELECT * FROM contractors WHERE id = $1', [req.params.id]);
      if (!existing.length) throw new AppError('Not found', 404);
      const {
        companyName, contactName, contactPhone, contactEmail, serviceType,
        insuranceExpiry, dbsRequired, dbsExpiry, gasSafeNumber, electricianNumber,
        contractStart, contractEnd, lastVisitDate, nextScheduledVisit, notes, status
      } = req.body;
      const rows = await query(`
        UPDATE contractors SET
          company_name = COALESCE($1, company_name),
          contact_name = $2,
          contact_phone = $3,
          contact_email = $4,
          service_type = COALESCE($5, service_type),
          insurance_expiry = $6,
          dbs_required = COALESCE($7, dbs_required),
          dbs_expiry = $8,
          gas_safe_number = $9,
          electrician_number = $10,
          contract_start = $11,
          contract_end = $12,
          last_visit_date = $13,
          next_scheduled_visit = $14,
          notes = $15,
          status = COALESCE($16, status)
        WHERE id = $17
        RETURNING *`,
        [companyName || null, contactName || null, contactPhone || null, contactEmail || null,
         serviceType || null, insuranceExpiry || null, dbsRequired ?? null, dbsExpiry || null,
         gasSafeNumber || null, electricianNumber || null, contractStart || null, contractEnd || null,
         lastVisitDate || null, nextScheduledVisit || null, notes || null, status || null,
         req.params.id]
      );
      res.json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// DELETE /api/contractors/:id
router.delete('/:id',
  requireRole('home_manager', 'group_admin', 'deputy_manager', 'admin'),
  param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await query('DELETE FROM contractors WHERE id = $1', [req.params.id]);
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
