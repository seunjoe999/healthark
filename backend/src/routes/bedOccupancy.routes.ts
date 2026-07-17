import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
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

async function ensureOverridesTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS room_status_overrides (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      home_id UUID NOT NULL,
      room_number TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'vacant',
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(home_id, room_number)
    )
  `);
}

// GET /api/bed-occupancy?homeId=
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || tok(req, 'homeId');

    let totalBeds = 30;
    try {
      const homeRows = await query(`SELECT total_beds FROM homes WHERE id = $1`, [homeId]);
      if (homeRows.length > 0 && (homeRows[0] as any).total_beds != null) {
        totalBeds = Number((homeRows[0] as any).total_beds);
      }
    } catch {}

    const residents = await query(
      `SELECT id, first_name || ' ' || last_name AS name,
              room_number, status, admission_date, funding_type, care_level
       FROM service_users
       WHERE home_id = $1 AND status = 'live'
       ORDER BY room_number NULLS LAST, last_name`,
      [homeId]
    );

    const occupied = residents.length;
    const vacant = Math.max(0, totalBeds - occupied);
    const occupancyRate = totalBeds > 0 ? Math.round((occupied / totalBeds) * 100) : 0;

    const occupiedRooms = new Set(
      residents.map((r: any) => r.room_number).filter(Boolean).map((rn: any) => String(rn).trim())
    );
    let vacantRooms: string[] = [];
    for (let i = 1; i <= totalBeds; i++) {
      const label = `Room ${i}`;
      if (!occupiedRooms.has(String(i)) && !occupiedRooms.has(label)) vacantRooms.push(label);
    }
    vacantRooms = vacantRooms.slice(0, vacant);

    const fundingRows = await query(
      `SELECT COALESCE(funding_type, 'other') AS funding_type, COUNT(*) AS count
       FROM service_users WHERE home_id = $1 AND status = 'live' GROUP BY funding_type`,
      [homeId]
    );
    const fundingBreakdown: Record<string, number> = {};
    for (const row of fundingRows as any[]) fundingBreakdown[row.funding_type] = Number(row.count);

    res.json({
      success: true,
      data: { totalBeds, occupied, vacant, occupancyRate, residents, vacantRooms, fundingBreakdown },
    } as ApiResponse);
  } catch (err) { next(err); }
});

// PUT /api/bed-occupancy/config — set total beds
router.put('/config', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = req.body.homeId || tok(req, 'homeId');
    const totalBeds = parseInt(req.body.totalBeds);
    if (!homeId) return res.status(400).json({ success: false, error: 'homeId required' } as ApiResponse);
    if (!totalBeds || totalBeds < 1 || totalBeds > 500) {
      return res.status(400).json({ success: false, error: 'totalBeds must be between 1 and 500' } as ApiResponse);
    }
    try { await query(`ALTER TABLE homes ADD COLUMN IF NOT EXISTS total_beds INTEGER DEFAULT 30`); } catch {}
    await query(`UPDATE homes SET total_beds = $1 WHERE id = $2`, [totalBeds, homeId]);
    res.json({ success: true, data: { totalBeds } } as ApiResponse);
  } catch (err) { next(err); }
});

// PUT /api/bed-occupancy/room — set room status override
router.put('/room', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = req.body.homeId || tok(req, 'homeId');
    const { roomNumber, status } = req.body;
    if (!homeId) return res.status(400).json({ success: false, error: 'homeId required' } as ApiResponse);
    if (!roomNumber) return res.status(400).json({ success: false, error: 'roomNumber required' } as ApiResponse);
    if (!['reserved', 'maintenance', 'vacant'].includes(status)) {
      return res.status(400).json({ success: false, error: 'status must be reserved, maintenance, or vacant' } as ApiResponse);
    }
    await ensureOverridesTable();
    if (status === 'vacant') {
      await query(`DELETE FROM room_status_overrides WHERE home_id = $1 AND room_number = $2`, [homeId, roomNumber]);
    } else {
      await query(
        `INSERT INTO room_status_overrides (home_id, room_number, status)
         VALUES ($1, $2, $3)
         ON CONFLICT (home_id, room_number) DO UPDATE SET status = EXCLUDED.status, updated_at = NOW()`,
        [homeId, roomNumber, status]
      );
    }
    res.json({ success: true, data: { roomNumber, status } } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/bed-occupancy/rooms?homeId=
router.get('/rooms', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || tok(req, 'homeId');

    let totalBeds = 30;
    try {
      const homeRows = await query(`SELECT total_beds FROM homes WHERE id = $1`, [homeId]);
      if (homeRows.length > 0 && (homeRows[0] as any).total_beds != null) {
        totalBeds = Number((homeRows[0] as any).total_beds);
      }
    } catch {}

    const residents = await query(
      `SELECT id, first_name || ' ' || last_name AS name,
              room_number, care_level, admission_date, funding_type
       FROM service_users WHERE home_id = $1 AND status = 'live'`,
      [homeId]
    );

    const occupiedMap: Record<string, any> = {};
    for (const r of residents as any[]) {
      if (r.room_number) occupiedMap[String(r.room_number).trim()] = r;
    }

    let overrides: Record<string, string> = {};
    try {
      await ensureOverridesTable();
      const overrideRows = await query(
        `SELECT room_number, status FROM room_status_overrides WHERE home_id = $1`, [homeId]
      );
      for (const row of overrideRows as any[]) overrides[row.room_number] = row.status;
    } catch {}

    const rooms: any[] = [];
    for (let i = 1; i <= totalBeds; i++) {
      const key = String(i);
      const label = `Room ${i}`;
      const resident = occupiedMap[key] || occupiedMap[label] || null;
      const override = overrides[label] || overrides[key];
      const status = resident ? 'occupied' : override || 'vacant';
      rooms.push({ roomNumber: label, status, resident: resident || null });
    }

    res.json({ success: true, data: rooms } as ApiResponse);
  } catch (err) { next(err); }
});

export default router;
