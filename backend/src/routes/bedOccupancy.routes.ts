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

// GET /api/bed-occupancy?homeId=
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || tok(req, 'homeId');

    // Get total beds from homes table (with fallback)
    let totalBeds = 30;
    try {
      const homeRows = await query(
        `SELECT total_beds FROM homes WHERE id = $1`,
        [homeId]
      );
      if (homeRows.length > 0 && homeRows[0].total_beds != null) {
        totalBeds = Number(homeRows[0].total_beds);
      }
    } catch {
      // column may not exist — use fallback
    }

    // Get active residents
    const residents = await query(
      `SELECT id, first_name || ' ' || last_name AS name,
              room_number, status, admission_date, funding_type,
              care_level
       FROM service_users
       WHERE home_id = $1 AND status = 'live'
       ORDER BY room_number NULLS LAST, last_name`,
      [homeId]
    );

    const occupied = residents.length;
    const vacant = Math.max(0, totalBeds - occupied);
    const occupancyRate = totalBeds > 0 ? Math.round((occupied / totalBeds) * 100) : 0;

    // Derive vacant room numbers by comparing all rooms 1..totalBeds against occupied
    const occupiedRooms = new Set(
      residents
        .map((r: any) => r.room_number)
        .filter(Boolean)
        .map((rn: any) => String(rn).trim())
    );

    // Try rooms table first, else derive
    let vacantRooms: string[] = [];
    try {
      const roomRows = await query(
        `SELECT room_number FROM rooms WHERE home_id = $1 AND status = 'vacant' ORDER BY room_number`,
        [homeId]
      );
      vacantRooms = roomRows.map((r: any) => String(r.room_number));
    } catch {
      // rooms table doesn't exist — derive from sequential numbering
      for (let i = 1; i <= totalBeds; i++) {
        const label = `Room ${i}`;
        if (!occupiedRooms.has(String(i)) && !occupiedRooms.has(label)) {
          vacantRooms.push(label);
        }
      }
      // limit to expected vacancy count
      vacantRooms = vacantRooms.slice(0, vacant);
    }

    // Funding breakdown
    const fundingRows = await query(
      `SELECT COALESCE(funding_type, 'other') AS funding_type, COUNT(*) AS count
       FROM service_users
       WHERE home_id = $1 AND status = 'active'
       GROUP BY funding_type`,
      [homeId]
    );
    const fundingBreakdown: Record<string, number> = {};
    for (const row of fundingRows as any[]) {
      fundingBreakdown[row.funding_type] = Number(row.count);
    }

    res.json({
      success: true,
      data: {
        totalBeds,
        occupied,
        vacant,
        occupancyRate,
        residents,
        vacantRooms,
        fundingBreakdown,
      },
    } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/bed-occupancy/rooms?homeId=
router.get('/rooms', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || tok(req, 'homeId');

    // Get total beds
    let totalBeds = 30;
    try {
      const homeRows = await query(`SELECT total_beds FROM homes WHERE id = $1`, [homeId]);
      if (homeRows.length > 0 && homeRows[0].total_beds != null) {
        totalBeds = Number(homeRows[0].total_beds);
      }
    } catch {}

    // Get occupied rooms
    const residents = await query(
      `SELECT id, first_name || ' ' || last_name AS name,
              room_number, care_level, admission_date, funding_type
       FROM service_users
       WHERE home_id = $1 AND status = 'live'`,
      [homeId]
    );

    const occupiedMap: Record<string, any> = {};
    for (const r of residents) {
      if (r.room_number) occupiedMap[String(r.room_number).trim()] = r;
    }

    const rooms: any[] = [];
    for (let i = 1; i <= totalBeds; i++) {
      const key = String(i);
      const label = `Room ${i}`;
      const resident = occupiedMap[key] || occupiedMap[label] || null;
      rooms.push({
        roomNumber: label,
        status: resident ? 'occupied' : 'vacant',
        resident: resident || null,
      });
    }

    res.json({ success: true, data: rooms } as ApiResponse);
  } catch (err) { next(err); }
});

export default router;
