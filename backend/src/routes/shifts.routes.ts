import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
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

async function generateFromTemplate(tmpl: any, homeId: string, weeks = 12): Promise<number> {
  const startDate = new Date(tmpl.start_date + 'T00:00:00Z');
  const endDate = new Date(startDate);
  endDate.setUTCDate(endDate.getUTCDate() + weeks * 7);
  const dowList: number[] = Array.isArray(tmpl.days_of_week) ? tmpl.days_of_week.map(Number) : [Number(tmpl.days_of_week)];
  let generated = 0;
  const cur = new Date(startDate);
  while (cur <= endDate) {
    const dow = cur.getUTCDay();
    const dayMatches = tmpl.recurrence === 'daily' || dowList.includes(dow);
    if (dayMatches) {
      let ok = true;
      if (tmpl.recurrence === 'biweekly' || tmpl.recurrence === 'every_other_week') {
        const weeksSince = Math.floor((cur.getTime() - startDate.getTime()) / (7 * 86400000));
        if (weeksSince % 2 !== 0) ok = false;
      }
      if (ok) {
        const dateStr = cur.toISOString().split('T')[0];
        let exists: any[];
        if (tmpl.staff_id) {
          exists = await query<any>(
            `SELECT id FROM staff_shifts WHERE staff_id=$1 AND shift_date=$2 AND start_time=$3::time LIMIT 1`,
            [tmpl.staff_id, dateStr, tmpl.start_time]
          );
        } else {
          exists = await query<any>(
            `SELECT id FROM staff_shifts WHERE su_id=$1 AND shift_date=$2 AND start_time=$3::time AND staff_id IS NULL LIMIT 1`,
            [tmpl.su_id, dateStr, tmpl.start_time]
          );
        }
        if (!exists.length) {
          try {
            await query(
              `INSERT INTO staff_shifts (home_id, staff_id, su_id, shift_date, start_time, end_time, shift_type, break_minutes, template_id, notes_for_carers, notes_for_managers, is_standby)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
              [homeId, tmpl.staff_id || null, tmpl.su_id || null, dateStr,
               tmpl.start_time, tmpl.end_time, tmpl.shift_type || 'regular',
               tmpl.break_minutes || 0, tmpl.id,
               tmpl.notes_for_carers || null, tmpl.notes_for_managers || null,
               tmpl.is_standby || false]
            );
            generated++;
          } catch {}
        }
      }
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return generated;
}

// GET /api/shifts?homeId=&weekStart=&date=
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const date = req.query.date as string;
    const weekStart = req.query.weekStart as string;

    let sql = `SELECT sh.*,
      s.first_name || ' ' || s.last_name as staff_name, s.role as staff_role, s.photo_url as staff_photo,
      su.first_name || ' ' || su.last_name as su_name
      FROM staff_shifts sh
      LEFT JOIN staff s ON s.id = sh.staff_id
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
      await query(
        `INSERT INTO notifications (recipient_id, home_id, title, body, type, link)
         VALUES ($1,$2,$3,$4,'shift','/rota')`,
        [staffId, homeId, 'New shift assigned', `You have been assigned a shift on ${shiftDate} from ${startTime} to ${endTime}`]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/shifts/copy-week — copy all shifts from previous week to current week
router.post('/copy-week', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = req.body.homeId || fromToken(req, 'homeId');
    const { weekStart } = req.body;
    if (!weekStart) return res.status(400).json({ success: false, error: 'weekStart required' } as ApiResponse);

    const prevDate = new Date(weekStart);
    prevDate.setUTCDate(prevDate.getUTCDate() - 7);
    const prevWeek = prevDate.toISOString().split('T')[0];

    const prevShifts = await query<any>(
      `SELECT * FROM staff_shifts WHERE home_id = $1 AND shift_date >= $2 AND shift_date < $2::date + interval '7 days'`,
      [homeId, prevWeek]
    );

    let copied = 0;
    for (const s of prevShifts) {
      const d = new Date(s.shift_date);
      d.setUTCDate(d.getUTCDate() + 7);
      try {
        const ins = await query(
          `INSERT INTO staff_shifts (home_id, staff_id, su_id, shift_date, start_time, end_time, shift_type, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING RETURNING id`,
          [homeId, s.staff_id, s.su_id, d.toISOString().split('T')[0], s.start_time, s.end_time, s.shift_type, s.notes]
        );
        if ((ins as any[]).length > 0) copied++;
      } catch {}
    }
    res.json({ success: true, data: { copied } } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/shifts/leave?homeId=&weekStart=
router.get('/leave', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const weekStart = req.query.weekStart as string;
    let sql = `SELECT sl.*, s.first_name || ' ' || s.last_name as staff_name
               FROM staff_leave sl JOIN staff s ON s.id = sl.staff_id
               WHERE sl.home_id = $1`;
    const params: unknown[] = [homeId];
    if (weekStart) {
      sql += ` AND sl.start_date < $2::date + interval '7 days' AND sl.end_date >= $2::date`;
      params.push(weekStart);
    }
    sql += ' ORDER BY sl.start_date, s.last_name';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/shifts/leave
router.post('/leave', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = req.body.homeId || fromToken(req, 'homeId');
    const createdBy = fromToken(req, 'staffId');
    const { staffId, leaveDate, startDate, endDate, leaveType, notes } = req.body;
    const sd = startDate || leaveDate;
    const ed = endDate || leaveDate;
    if (!staffId || !sd) return res.status(400).json({ success: false, error: 'staffId and startDate required' } as ApiResponse);
    const rows = await query(
      `INSERT INTO staff_leave (home_id, staff_id, start_date, end_date, leave_type, reason)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [homeId, staffId, sd, ed, leaveType || 'annual', notes || null]
    );
    // Auto-remove any shifts for this staff in the leave range
    await query(
      `DELETE FROM staff_shifts WHERE staff_id = $1 AND shift_date >= $2 AND shift_date <= $3`,
      [staffId, sd, ed]
    );
    res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
  } catch (err) { next(err); }
});

// DELETE /api/shifts/leave/:id
router.delete('/leave/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await query('DELETE FROM staff_leave WHERE id = $1', [req.params.id]);
    res.json({ success: true } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/shifts/swaps?homeId= (also add target_agreed column if missing)
router.get('/swaps', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const staffId = fromToken(req, 'staffId');
    await query(`ALTER TABLE shift_swap_requests ADD COLUMN IF NOT EXISTS target_agreed BOOLEAN DEFAULT NULL`).catch(() => {});
    await query(`ALTER TABLE shift_swap_requests ADD COLUMN IF NOT EXISTS target_notes TEXT`).catch(() => {});
    const rows = await query(
      `SELECT ssr.*,
              sh.shift_date, sh.start_time, sh.end_time, sh.shift_type,
              rs.first_name || ' ' || rs.last_name as requesting_name,
              ts.first_name || ' ' || ts.last_name as target_name
       FROM shift_swap_requests ssr
       JOIN staff_shifts sh ON sh.id = ssr.shift_id
       JOIN staff rs ON rs.id = ssr.requesting_staff_id
       LEFT JOIN staff ts ON ts.id = ssr.target_staff_id
       WHERE ssr.home_id = $1 AND ssr.status IN ('pending','pending_manager')
       ORDER BY ssr.created_at DESC`,
      [homeId]
    );
    // Mark which rows are directed at the current user (their inbox)
    const enriched = rows.map((r: any) => ({
      ...r,
      is_my_inbox: r.target_staff_id === staffId && r.target_agreed == null,
    }));
    res.json({ success: true, data: enriched } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/shifts/swaps
router.post('/swaps', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = req.body.homeId || fromToken(req, 'homeId');
    const requestingStaffId = fromToken(req, 'staffId');
    const { shiftId, targetStaffId, notes } = req.body;
    if (!shiftId) return res.status(400).json({ success: false, error: 'shiftId required' } as ApiResponse);
    const rows = await query(
      `INSERT INTO shift_swap_requests (home_id, shift_id, requesting_staff_id, target_staff_id, notes)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [homeId, shiftId, requestingStaffId, targetStaffId || null, notes || null]
    );
    // Notify home managers
    const managers = await query<any>(`SELECT id FROM staff WHERE home_id=$1 AND role='home_manager' LIMIT 5`, [homeId]);
    for (const m of managers) {
      await query(
        `INSERT INTO notifications (recipient_id, home_id, title, body, type, link) VALUES ($1,$2,$3,$4,'shift','/rota')`,
        [m.id, homeId, 'Shift swap requested', 'A staff member has requested a shift swap — please review on the rota.']
      ).catch(() => {});
    }
    res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
  } catch (err) { next(err); }
});

// PUT /api/shifts/swaps/:id — manager approve or reject
router.put('/swaps/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, responseNotes } = req.body;
    // Ensure column exists
    await query(`ALTER TABLE shift_swap_requests ADD COLUMN IF NOT EXISTS target_agreed BOOLEAN DEFAULT NULL`).catch(() => {});
    const rows = await query(
      `UPDATE shift_swap_requests SET status=$1, response_notes=$2, updated_at=NOW() WHERE id=$3 RETURNING *`,
      [status, responseNotes || null, req.params.id]
    );
    if (status === 'approved') {
      // Do the actual shift swap in DB
      const swap = rows[0];
      if (swap) {
        await query(
          `UPDATE staff_shifts SET staff_id = $1 WHERE id = $2`,
          [swap.target_staff_id, swap.shift_id]
        ).catch(() => {});
      }
    }
    res.json({ success: true, data: rows[0] } as ApiResponse);
  } catch (err) { next(err); }
});

// PUT /api/shifts/swaps/:id/agree — target staff agrees or declines
router.put('/swaps/:id/agree', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const staffId = fromToken(req, 'staffId');
    const { agreed, notes } = req.body;
    await query(`ALTER TABLE shift_swap_requests ADD COLUMN IF NOT EXISTS target_agreed BOOLEAN DEFAULT NULL`).catch(() => {});
    await query(`ALTER TABLE shift_swap_requests ADD COLUMN IF NOT EXISTS target_notes TEXT`).catch(() => {});
    // Only the target staff can agree/decline
    const existing = await query<any>(`SELECT * FROM shift_swap_requests WHERE id=$1`, [req.params.id]);
    if (!existing[0]) return res.status(404).json({ success: false, error: 'Swap not found' });
    if (existing[0].target_staff_id && existing[0].target_staff_id !== staffId) {
      return res.status(403).json({ success: false, error: 'Not authorised' });
    }
    const newStatus = agreed ? 'pending_manager' : 'declined';
    const rows = await query(
      `UPDATE shift_swap_requests SET target_agreed=$1, target_notes=$2, status=$3, updated_at=NOW() WHERE id=$4 RETURNING *`,
      [agreed, notes || null, newStatus, req.params.id]
    );
    // If agreed, notify managers
    if (agreed) {
      const managers = await query<any>(`SELECT id FROM staff WHERE home_id=$1 AND role IN ('home_manager','deputy_manager') LIMIT 5`, [existing[0].home_id]);
      for (const m of managers) {
        await query(
          `INSERT INTO notifications (recipient_id, home_id, title, body, type, link) VALUES ($1,$2,$3,$4,'shift','/rota')`,
          [m.id, existing[0].home_id, 'Shift swap agreed', 'Both staff members have agreed to a shift swap — please review and approve.']
        ).catch(() => {});
      }
    }
    res.json({ success: true, data: rows[0] } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/shifts/templates?homeId=
router.get('/templates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const rows = await query(
      `SELECT st.*, s.first_name || ' ' || s.last_name as staff_name,
              su.first_name || ' ' || su.last_name as su_name
       FROM shift_templates st
       LEFT JOIN staff s ON s.id = st.staff_id
       LEFT JOIN service_users su ON su.id = st.su_id
       WHERE st.home_id = $1 AND st.is_active = TRUE
       ORDER BY st.created_at DESC`,
      [homeId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/shifts/service-shift — create service-user-centric recurring shift with staff allocation
router.post('/service-shift', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = req.body.homeId || fromToken(req, 'homeId');
    const createdBy = fromToken(req, 'staffId');
    const {
      suId, startDate, isOngoing, endDate, recurrence, daysOfWeek,
      startTime, endTime, shiftType, totalStaffRequired, staffIds,
      notesForCarers, notesForManagers, isStandby, standbyWorkDetails,
      breakMins, weeks: weeksParam,
    } = req.body;

    if (!startTime || !endTime) return res.status(400).json({ success: false, error: 'startTime and endTime required' } as any);

    const WEEKS = isOngoing ? 52 : (parseInt(weeksParam) || 12);
    const staffToCreate: (string | null)[] = staffIds && staffIds.length > 0 ? staffIds : [null];
    const templates: any[] = [];
    let totalGenerated = 0;

    const effectiveDays = recurrence === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : (daysOfWeek || [1]);

    for (const staffId of staffToCreate) {
      const rows = await query<any>(
        `INSERT INTO shift_templates
          (home_id, staff_id, su_id, shift_type, start_time, end_time, break_minutes,
           recurrence, days_of_week, start_date, staff_count, is_ongoing,
           notes_for_carers, notes_for_managers, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
        [homeId, staffId || null, suId, shiftType || 'regular', startTime, endTime, parseInt(breakMins) || 0,
         recurrence || 'daily', effectiveDays,
         startDate || new Date().toISOString().split('T')[0],
         totalStaffRequired || 1, isOngoing || false,
         notesForCarers || null, notesForManagers || null, createdBy]
      );
      const tmpl = { ...rows[0], is_standby: isStandby || false, standby_work_details: standbyWorkDetails || null };
      templates.push(tmpl);
      const gen = await generateFromTemplate(tmpl, homeId, WEEKS);
      totalGenerated += gen;
    }

    if (staffIds && staffIds.length > 0) {
      for (const staffId of staffIds) {
        await query(
          `INSERT INTO notifications (recipient_id, home_id, title, body, type, link)
           VALUES ($1,$2,$3,$4,'shift','/rota')`,
          [staffId, homeId, 'New recurring shift assigned',
           `You have been assigned a recurring shift starting ${startDate} from ${startTime} to ${endTime}`]
        ).catch(() => {});
      }
    }

    res.status(201).json({ success: true, data: { templates, generated: totalGenerated } } as any);
  } catch (err) { next(err); }
});

// POST /api/shifts/templates — create recurring schedule + generate shifts
router.post('/templates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = req.body.homeId || fromToken(req, 'homeId');
    const createdBy = fromToken(req, 'staffId');
    const { staffId, suId, shiftType, startTime, endTime, breakMinutes, recurrence, daysOfWeek, startDate, staffCount, label } = req.body;
    if (!startTime || !endTime) return res.status(400).json({ success: false, error: 'startTime and endTime required' } as ApiResponse);

    const rows = await query(
      `INSERT INTO shift_templates (home_id, label, staff_id, su_id, shift_type, start_time, end_time, break_minutes, recurrence, days_of_week, start_date, staff_count, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [homeId, label || null, staffId || null, suId || null, shiftType || 'regular',
       startTime, endTime, breakMinutes || 0, recurrence || 'weekly',
       daysOfWeek && daysOfWeek.length ? daysOfWeek : [1],
       startDate || new Date().toISOString().split('T')[0],
       staffCount || 1, createdBy]
    );
    const tmpl = rows[0] as any;
    const generated = await generateFromTemplate(tmpl, homeId, tmpl.is_ongoing ? 52 : 12);
    res.status(201).json({ success: true, data: { template: tmpl, generated } } as ApiResponse);
  } catch (err) { next(err); }
});

// DELETE /api/shifts/templates/:id — remove template + future generated shifts
router.delete('/templates/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    await query(`DELETE FROM staff_shifts WHERE template_id=$1 AND shift_date >= $2`, [req.params.id, today]);
    await query(`UPDATE shift_templates SET is_active=FALSE WHERE id=$1`, [req.params.id]);
    res.json({ success: true } as ApiResponse);
  } catch (err) { next(err); }
});

// DELETE /api/shifts/:id
router.delete('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await query('DELETE FROM staff_shifts WHERE id = $1', [req.params.id]);
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/shifts/auto-schedule
router.post('/auto-schedule', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = req.body.homeId || fromToken(req, 'homeId');
    const { weekStart } = req.body;
    if (!weekStart) return res.status(400).json({ success: false, error: 'weekStart is required' } as ApiResponse);

    const staffRows = await query<any>(
      `SELECT id, first_name, last_name, role FROM staff
       WHERE home_id = $1 AND status = 'active'
       AND role IN ('care_staff', 'senior_carer')
       ORDER BY role DESC, first_name`,
      [homeId]
    );
    if (!staffRows.length) return res.status(400).json({ success: false, error: 'No active care staff found' } as ApiResponse);

    const shiftTypes = ['early', 'late', 'night'];
    const shiftTimes: Record<string, { start: string; end: string }> = {
      early: { start: '07:00', end: '14:00' },
      late:  { start: '14:00', end: '22:00' },
      night: { start: '22:00', end: '07:00' },
    };

    const staffDayCount: Record<string, number> = {};
    staffRows.forEach((s: any) => { staffDayCount[s.id] = 0; });

    const existingWeek = await query<any>(
      `SELECT staff_id FROM staff_shifts WHERE home_id=$1 AND shift_date >= $2 AND shift_date < $2::date + interval '7 days'`,
      [homeId, weekStart]
    );
    existingWeek.forEach((e: any) => { if (staffDayCount[e.staff_id] !== undefined) staffDayCount[e.staff_id]++; });

    let created = 0;
    const errors: string[] = [];

    for (let day = 0; day < 7; day++) {
      const date = new Date(weekStart);
      date.setUTCDate(date.getUTCDate() + day);
      const dateStr = date.toISOString().split('T')[0];

      const existing = await query<any>('SELECT staff_id, shift_type FROM staff_shifts WHERE home_id=$1 AND shift_date=$2', [homeId, dateStr]);
      const existingStaffIds = new Set(existing.map((e: any) => e.staff_id));
      const existingTypes   = new Set(existing.map((e: any) => e.shift_type));

      for (const shiftType of shiftTypes) {
        if (existingTypes.has(shiftType)) continue;
        const available = staffRows.filter((s: any) => !existingStaffIds.has(s.id) && staffDayCount[s.id] < 5);
        if (!available.length) continue;
        const staff = available[day % available.length];
        const times = shiftTimes[shiftType];
        try {
          const ins = await query<any>(
            `INSERT INTO staff_shifts (home_id, staff_id, shift_date, start_time, end_time, shift_type) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING RETURNING id`,
            [homeId, staff.id, dateStr, times.start, times.end, shiftType]
          );
          if (ins.length > 0) { created++; existingStaffIds.add(staff.id); staffDayCount[staff.id]++; }
        } catch (e: any) { errors.push(`${dateStr} ${shiftType}: ${e.message}`); }
      }
    }
    res.json({ success: true, data: { created, errors } } as ApiResponse);
  } catch (err) { next(err); }
});

export default router;
