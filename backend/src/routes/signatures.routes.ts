import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { query } from '../config/database';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';

const router = Router();

router.use(authenticate);

function fromToken(req: Request, field: string): string {
  const token = req.headers.authorization?.substring(7);
  if (token) { const d = jwt.decode(token) as any; return d?.[field] || ''; }
  return '';
}

// Ensure the table exists (idempotent)
async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS handover_signatures (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      home_id UUID NOT NULL REFERENCES homes(id),
      shift_date DATE NOT NULL,
      shift_type VARCHAR(10) NOT NULL,
      role VARCHAR(20) NOT NULL CHECK (role IN ('outgoing', 'incoming')),
      staff_id UUID NOT NULL REFERENCES staff(id),
      signature_data TEXT NOT NULL,
      signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (home_id, shift_date, shift_type, role)
    )
  `, []);
}
ensureTable().catch(err => console.error('handover_signatures table init failed:', err));

// POST /api/signatures/handover — save a signature
router.post('/handover', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = req.body.homeId || fromToken(req, 'homeId');
    const staffId = req.body.staffId || fromToken(req, 'staffId');
    const { shiftDate, shiftType, role, signatureData } = req.body;

    if (!shiftDate || !shiftType || !role || !signatureData) {
      return res.status(400).json({ success: false, error: 'shiftDate, shiftType, role and signatureData are required' } as ApiResponse);
    }

    // Upsert: one signature per role per shift
    const rows = await query<any>(
      `INSERT INTO handover_signatures (home_id, staff_id, shift_date, shift_type, role, signature_data)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (home_id, shift_date, shift_type, role)
       DO UPDATE SET signature_data = EXCLUDED.signature_data, staff_id = EXCLUDED.staff_id, signed_at = NOW()
       RETURNING *`,
      [homeId, staffId, shiftDate, shiftType, role, signatureData]
    );

    res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/signatures/handover?homeId=&shiftDate=&shiftType=
router.get('/handover', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const { shiftDate, shiftType } = req.query as Record<string, string>;

    if (!shiftDate || !shiftType) {
      return res.status(400).json({ success: false, error: 'shiftDate and shiftType are required' } as ApiResponse);
    }

    const rows = await query<any>(
      `SELECT hs.*, s.first_name || ' ' || s.last_name as staff_name
       FROM handover_signatures hs
       JOIN staff s ON s.id = hs.staff_id
       WHERE hs.home_id = $1 AND hs.shift_date = $2 AND hs.shift_type = $3`,
      [homeId, shiftDate, shiftType]
    );

    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

export default router;
