import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../config/database';
import { authenticate } from '../middleware/auth';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';

const router = Router();

router.use(authenticate);

function fromToken(req: Request, field: string): string {
  const token = req.headers.authorization?.substring(7);
  if (token) { const d = jwt.decode(token) as any; return (req.staff as any)?.[field] || d?.[field] || ''; }
  return (req.staff as any)?.[field] || '';
}

const init = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS external_contacts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      home_id UUID NOT NULL,
      name VARCHAR(200) NOT NULL,
      organisation VARCHAR(200),
      role VARCHAR(100) NOT NULL,
      category VARCHAR(50) NOT NULL DEFAULT 'professional',
      phone VARCHAR(50),
      email VARCHAR(200),
      address TEXT,
      notes TEXT,
      is_active BOOLEAN DEFAULT true,
      created_by UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`ALTER TABLE external_contacts ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`);
};
router.use(async (_req, _res, next) => {
  try { await init(); } catch (_) {}
  next();
});

// GET all contacts
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const { category, search } = req.query;
    let sql = `SELECT * FROM external_contacts WHERE home_id = $1 AND is_active = true`;
    const params: any[] = [homeId];
    if (category) { params.push(category); sql += ` AND category = $${params.length}`; }
    if (search) { params.push(`%${search}%`); sql += ` AND (name ILIKE $${params.length} OR organisation ILIKE $${params.length} OR role ILIKE $${params.length})`; }
    sql += ' ORDER BY category, name';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// POST create
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = req.body.homeId || fromToken(req, 'homeId');
    const createdBy = fromToken(req, 'staffId');
    const { name, organisation, role, category, phone, email, address, notes } = req.body;
    const rows = await query(
      `INSERT INTO external_contacts (home_id, name, organisation, role, category, phone, email, address, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [homeId, name, organisation, role, category || 'professional', phone || null, email || null, address || null, notes || null, createdBy]
    );
    res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
  } catch (err) { next(err); }
});

// PUT update
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = fromToken(req, 'homeId');
    const { name, organisation, role, category, phone, email, address, notes, is_active } = req.body;
    const rows = await query(
      `UPDATE external_contacts SET name=$1, organisation=$2, role=$3, category=$4, phone=$5, email=$6,
       address=$7, notes=$8, is_active=$9, updated_at=NOW()
       WHERE id=$10 AND home_id=$11 RETURNING *`,
      [name, organisation, role, category, phone || null, email || null, address || null, notes || null, is_active ?? true, req.params.id, homeId]
    );
    if (!rows.length) { res.status(404).json({ success: false, error: 'Not found' } as ApiResponse); return; }
    res.json({ success: true, data: rows[0] } as ApiResponse);
  } catch (err) { next(err); }
});

// DELETE (soft delete)
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = fromToken(req, 'homeId');
    await query(`UPDATE external_contacts SET is_active=false WHERE id=$1 AND home_id=$2`, [req.params.id, homeId]);
    res.json({ success: true } as ApiResponse);
  } catch (err) { next(err); }
});

export default router;
