import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';

const router = Router();
router.use(authenticate);

function tok(req: Request, field: string): string {
  const t = req.headers.authorization?.substring(7);
  if (t) { const d = jwt.decode(t) as any; return (req.staff as any)?.[field] || d?.[field] || ''; }
  return (req.staff as any)?.[field] || '';
}

async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS visitor_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      home_id UUID NOT NULL,
      su_id UUID,
      visitor_name TEXT NOT NULL,
      visitor_relationship TEXT,
      visitor_phone TEXT,
      sign_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      sign_out_time TIMESTAMPTZ,
      purpose TEXT DEFAULT 'social_visit' CHECK (purpose IN ('social_visit','professional','contractor','delivery','other')),
      vehicle_reg TEXT,
      notes TEXT,
      signed_in_by UUID NOT NULL,
      signed_out_by UUID,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

// GET /api/visitor-log?homeId=&date=&suId=
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureTable();
    const homeId = (req.query.homeId as string) || tok(req, 'homeId');
    const { date, suId } = req.query as Record<string, string>;

    const targetDate = date || new Date().toISOString().slice(0, 10);

    let sql = `
      SELECT vl.*,
             su.first_name || ' ' || su.last_name AS resident_name,
             s.first_name || ' ' || s.last_name AS signed_in_by_name,
             so.first_name || ' ' || so.last_name AS signed_out_by_name
      FROM visitor_log vl
      LEFT JOIN service_users su ON su.id = vl.su_id
      LEFT JOIN staff s ON s.id = vl.signed_in_by
      LEFT JOIN staff so ON so.id = vl.signed_out_by
      WHERE vl.home_id = $1
        AND DATE(vl.sign_in_time) = $2
    `;
    const params: any[] = [homeId, targetDate];
    let idx = 3;

    if (suId) { sql += ` AND vl.su_id = $${idx++}`; params.push(suId); }
    sql += ` ORDER BY vl.sign_in_time DESC`;

    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/visitor-log/currently-in?homeId=
router.get('/currently-in', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureTable();
    const homeId = (req.query.homeId as string) || tok(req, 'homeId');

    const rows = await query(
      `SELECT vl.*,
              su.first_name || ' ' || su.last_name AS resident_name,
              s.first_name || ' ' || s.last_name AS signed_in_by_name
       FROM visitor_log vl
       LEFT JOIN service_users su ON su.id = vl.su_id
       LEFT JOIN staff s ON s.id = vl.signed_in_by
       WHERE vl.home_id = $1
         AND vl.sign_out_time IS NULL
       ORDER BY vl.sign_in_time ASC`,
      [homeId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/visitor-log — sign in visitor
router.post('/', [
  body('visitorName').notEmpty().withMessage('Visitor name is required'),
], validateRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureTable();
    const homeId = tok(req, 'homeId');
    const staffId = tok(req, 'staffId');
    const {
      suId, visitorName, visitorRelationship, visitorPhone,
      signInTime, purpose, vehicleReg, notes,
    } = req.body;

    const rows = await query(
      `INSERT INTO visitor_log
         (home_id, su_id, visitor_name, visitor_relationship, visitor_phone,
          sign_in_time, purpose, vehicle_reg, notes, signed_in_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        homeId, suId || null, visitorName,
        visitorRelationship || null, visitorPhone || null,
        signInTime || new Date().toISOString(),
        purpose || 'social_visit', vehicleReg || null, notes || null, staffId,
      ]
    );
    res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
  } catch (err) { next(err); }
});

// PUT /api/visitor-log/:id/signout — record sign-out time
router.put('/:id/signout', [
  param('id').isUUID(),
], validateRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureTable();
    const homeId = tok(req, 'homeId');
    const staffId = tok(req, 'staffId');
    const { signOutTime } = req.body;

    const rows = await query(
      `UPDATE visitor_log
       SET sign_out_time = $1, signed_out_by = $2
       WHERE id = $3 AND home_id = $4
       RETURNING *`,
      [signOutTime || new Date().toISOString(), staffId, req.params.id, homeId]
    );
    if (!rows.length) {
      res.status(404).json({ success: false, error: 'Not found' } as ApiResponse);
      return;
    }
    res.json({ success: true, data: rows[0] } as ApiResponse);
  } catch (err) { next(err); }
});

export default router;
