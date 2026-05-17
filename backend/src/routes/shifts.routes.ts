import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';

const router = Router();

function nd(v: any): string | null { return v && String(v).trim() ? String(v).trim() : null; }

router.use(authenticate);

function fromToken(req: Request, field: string): string {
  const token = req.headers.authorization?.substring(7);
  if (token) { const d = jwt.decode(token) as any; return d?.[field] || ''; }
  return '';
}

// GET /api/shifts?homeId=&date=&week=
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const date = req.query.date as string;
    const weekStart = req.query.weekStart as string;

    let sql = `SELECT sh.*, 
      s.first_name || ' ' || s.last_name as staff_name, s.role as staff_role, s.photo_url as staff_photo,
      su.first_name || ' ' || su.last_name as su_name
      FROM staff_shifts sh
      JOIN staff s ON s.id = sh.staff_id
      LEFT JOIN service_users su ON su.id = sh.su_id
      WHERE sh.home_id = $1`;
    const params: unknown[] = [homeId];

    if (date) { sql += ` AND sh.shift_date = $${params.length+1}`; params.push(date); }
    else if (weekStart) {
      sql += ` AND sh.shift_date >= $${params.length+1} AND sh.shift_date < $${params.length+1}::date + interval '7 days'`;
      params.push(weekStart);
    }
    sql += ' ORDER BY sh.shift_date, sh.start_time';

    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/shifts
router.post('/', [body('staffId').isUUID(), body('shiftDate').isDate(), body('startTime').notEmpty(), body('endTime').notEmpty()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = req.body.homeId || fromToken(req, 'homeId');
      const createdBy = fromToken(req, 'staffId');
      const { staffId, suId, shiftDate, startTime, endTime, shiftType, notes } = req.body;
      const rows = await query(
        `INSERT INTO staff_shifts (home_id, staff_id, su_id, shift_date, start_time, end_time, shift_type, notes, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [homeId, staffId, suId || null, shiftDate, startTime, endTime, shiftType || 'regular', notes || null, createdBy]
      );
      // Create notification for staff member
      await query(
        `INSERT INTO notifications (recipient_id, home_id, title, body, type, link)
         VALUES ($1,$2,$3,$4,'shift','/staff')`,
        [staffId, homeId, 'New shift assigned', `You have been assigned a shift on ${shiftDate} from ${startTime} to ${endTime}`]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// DELETE /api/shifts/:id
router.delete('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await query('DELETE FROM staff_shifts WHERE id = $1', [req.params.id]);
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/shifts/auto-schedule — fill empty shifts for a week by rotating care staff
router.post('/auto-schedule',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = req.body.homeId || fromToken(req, 'homeId');
      const { weekStart } = req.body; // 'YYYY-MM-DD' Monday

      if (!weekStart) {
        return res.status(400).json({ success: false, error: 'weekStart is required' } as ApiResponse);
      }

      // Get active care staff for this home
      const staffRows = await query<any>(
        `SELECT id, first_name, last_name, role FROM staff
         WHERE home_id = $1 AND status = 'active'
         AND role IN ('care_staff', 'senior_carer')
         ORDER BY role DESC, first_name`,
        [homeId]
      );

      if (!staffRows.length) {
        return res.status(400).json({ success: false, error: 'No active care staff found' } as ApiResponse);
      }

      const shiftTypes = ['early', 'late', 'night'];
      const shiftTimes: Record<string, { start: string; end: string }> = {
        early: { start: '07:00', end: '14:00' },
        late:  { start: '14:00', end: '22:00' },
        night: { start: '22:00', end: '07:00' },
      };

      // Track how many days each staff member has been scheduled this week
      const staffDayCount: Record<string, number> = {};
      staffRows.forEach((s: any) => { staffDayCount[s.id] = 0; });

      // Pre-load existing week shifts to initialise day counts
      const existingWeek = await query<any>(
        `SELECT staff_id, shift_date, shift_type FROM staff_shifts
         WHERE home_id = $1 AND shift_date >= $2 AND shift_date < $2::date + interval '7 days'`,
        [homeId, weekStart]
      );
      existingWeek.forEach((e: any) => {
        if (staffDayCount[e.staff_id] !== undefined) staffDayCount[e.staff_id]++;
      });

      let created = 0;
      const errors: string[] = [];

      for (let day = 0; day < 7; day++) {
        const date = new Date(weekStart);
        date.setUTCDate(date.getUTCDate() + day);
        const dateStr = date.toISOString().split('T')[0];

        // What already exists for this day
        const existing = await query<any>(
          'SELECT staff_id, shift_type FROM staff_shifts WHERE home_id = $1 AND shift_date = $2',
          [homeId, dateStr]
        );
        const existingStaffIds = new Set(existing.map((e: any) => e.staff_id));
        const existingTypes   = new Set(existing.map((e: any) => e.shift_type));

        for (const shiftType of shiftTypes) {
          if (existingTypes.has(shiftType)) continue; // shift type already covered today

          // Pick available staff: not already on this day, under 5-day limit
          const available = staffRows.filter(
            (s: any) => !existingStaffIds.has(s.id) && staffDayCount[s.id] < 5
          );
          if (!available.length) continue;

          // Rotate through available staff using the day index so coverage is spread
          const staff = available[day % available.length];
          const times = shiftTimes[shiftType];

          try {
            const inserted = await query<any>(
              `INSERT INTO staff_shifts (home_id, staff_id, shift_date, start_time, end_time, shift_type)
               VALUES ($1, $2, $3, $4, $5, $6)
               ON CONFLICT DO NOTHING
               RETURNING id`,
              [homeId, staff.id, dateStr, times.start, times.end, shiftType]
            );
            if (inserted.length > 0) {
              created++;
              existingStaffIds.add(staff.id);
              staffDayCount[staff.id] = (staffDayCount[staff.id] || 0) + 1;
            }
          } catch (e: any) {
            errors.push(`${dateStr} ${shiftType}: ${e.message}`);
          }
        }
      }

      res.json({ success: true, data: { created, errors } } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
