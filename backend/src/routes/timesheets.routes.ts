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

// List timesheets (managers see all, staff see own)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const role = fromToken(req, 'role');
    const myStaffId = fromToken(req, 'staffId');
    const isPrivileged = ['home_manager', 'group_admin', 'deputy_manager', 'admin', 'director', 'registered_manager', 'service_manager'].includes(role);
    const staffId = isPrivileged ? (req.query.staffId as string) : myStaffId;
    const weekStart = req.query.weekStart as string;

    let sql = `
      SELECT t.*,
             s.first_name || ' ' || s.last_name AS staff_name,
             s.photo_url,
             s.role AS staff_role,
             a.first_name || ' ' || a.last_name AS approved_by_name
      FROM timesheets t
      JOIN staff s ON s.id = t.staff_id
      LEFT JOIN staff a ON a.id = t.approved_by
      WHERE t.home_id = $1`;
    const params: any[] = [homeId];

    if (staffId) {
      sql += ` AND t.staff_id = $${params.length + 1}`;
      params.push(staffId);
    }
    if (weekStart) { sql += ` AND t.week_start = $${params.length + 1}`; params.push(weekStart); }
    sql += ' ORDER BY t.week_start DESC';

    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// Generate timesheet from clock-in data for a staff member + week
router.post('/generate', requireRole('home_manager', 'group_admin', 'senior_carer'),
  [body('staffId').isUUID(), body('weekStart').isDate()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = req.body.homeId || fromToken(req, 'homeId');
      const { staffId, weekStart } = req.body;
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const weekEndStr = weekEnd.toISOString().split('T')[0];

      // Derive sessions from paired clock_in/clock_out events
      const sessions = await query(`
        WITH events AS (
          SELECT *,
            LEAD(event_time) OVER (PARTITION BY staff_id ORDER BY event_time) AS next_event_time,
            LEAD(event_type) OVER (PARTITION BY staff_id ORDER BY event_time) AS next_event_type
          FROM staff_clock_events
          WHERE staff_id = $1 AND home_id = $2
            AND DATE(event_time) BETWEEN $3 AND $4
        )
        SELECT
          id,
          event_time AS clock_in_time,
          next_event_time AS clock_out_time,
          EXTRACT(EPOCH FROM (next_event_time - event_time)) / 3600 AS hours_worked
        FROM events
        WHERE event_type = 'clock_in'
          AND next_event_type = 'clock_out'
          AND next_event_time IS NOT NULL
        ORDER BY clock_in_time`,
        [staffId, homeId, weekStart, weekEndStr]
      );

      const totalHours = sessions.reduce((sum: number, s: any) => sum + parseFloat(s.hours_worked || 0), 0);
      const regularHours = Math.min(totalHours, 40);
      const overtimeHours = Math.max(0, totalHours - 40);

      // Get staff hourly rate if stored
      const staffData = await query('SELECT * FROM staff WHERE id = $1', [staffId]);
      const hourlyRate = (staffData[0] as any)?.hourly_rate || null;
      const totalPay = hourlyRate ? regularHours * hourlyRate + overtimeHours * hourlyRate * 1.5 : null;

      // Upsert timesheet
      const ts = await query(`
        INSERT INTO timesheets (staff_id, home_id, week_start, week_end, total_hours, regular_hours, overtime_hours, hourly_rate, total_pay, status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending')
        ON CONFLICT (staff_id, week_start) DO UPDATE SET
          total_hours = EXCLUDED.total_hours, regular_hours = EXCLUDED.regular_hours,
          overtime_hours = EXCLUDED.overtime_hours, total_pay = EXCLUDED.total_pay,
          updated_at = NOW()
        RETURNING *`,
        [staffId, homeId, weekStart, weekEndStr, totalHours.toFixed(2), regularHours.toFixed(2), overtimeHours.toFixed(2), hourlyRate, totalPay]
      );

      // Insert entries — only clear previously auto-derived ones so manually
      // added entries (clockin_id IS NULL) survive a re-generate.
      if (sessions.length) {
        await query(`DELETE FROM timesheet_entries WHERE timesheet_id = $1 AND clockin_id IS NOT NULL`, [ts[0].id]);
        for (const s of sessions) {
          await query(`
            INSERT INTO timesheet_entries (timesheet_id, clockin_id, work_date, start_time, end_time, hours_worked)
            VALUES ($1,$2,$3,$4,$5,$6)`,
            [ts[0].id, s.id, new Date(s.clock_in_time as string).toISOString().split('T')[0],
             new Date(s.clock_in_time as string).toTimeString().substring(0, 5),
             new Date(s.clock_out_time as string).toTimeString().substring(0, 5),
             parseFloat(String(s.hours_worked || 0)).toFixed(2)]
          );
        }
      }

      res.json({ success: true, data: { timesheet: ts[0], entries: sessions.length } } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.get('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const [ts] = await query(`
        SELECT t.*, s.first_name || ' ' || s.last_name AS staff_name, s.photo_url, s.role AS staff_role
        FROM timesheets t JOIN staff s ON s.id = t.staff_id
        WHERE t.id = $1`, [req.params.id]);
      if (!ts) throw new AppError('Not found', 404);
      const role = fromToken(req, 'role');
      const myStaffId = fromToken(req, 'staffId');
      const isPrivileged = ['home_manager', 'group_admin', 'deputy_manager', 'admin', 'director', 'registered_manager', 'service_manager'].includes(role);
      if (!isPrivileged && (ts as any).staff_id !== myStaffId) {
        throw new AppError('Forbidden', 403);
      }
      const entries = await query('SELECT * FROM timesheet_entries WHERE timesheet_id = $1 ORDER BY work_date', [req.params.id]);
      res.json({ success: true, data: { ...ts, entries } } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.patch('/:id/approve', requireRole('home_manager', 'group_admin'),
  param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      await query(`
        UPDATE timesheets SET status = 'approved', approved_by = $1, approved_at = NOW(), updated_at = NOW()
        WHERE id = $2`, [staffId, req.params.id]);
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.patch('/:id/reject', requireRole('home_manager', 'group_admin'),
  param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { notes } = req.body;
      await query(`UPDATE timesheets SET status = 'rejected', notes = $1, updated_at = NOW() WHERE id = $2`, [notes || null, req.params.id]);
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// Add a manual timesheet entry (e.g. staff forgot to clock in/out) — recomputes totals.
router.post('/:id/entries', requireRole('home_manager', 'group_admin', 'deputy_manager', 'admin'),
  [param('id').isUUID(), body('workDate').isDate(), body('hoursWorked').isFloat({ min: 0, max: 24 })],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workDate, startTime, endTime, hoursWorked, notes } = req.body;
      const [ts] = await query('SELECT * FROM timesheets WHERE id = $1', [req.params.id]);
      if (!ts) throw new AppError('Timesheet not found', 404);

      await query(`
        INSERT INTO timesheet_entries (timesheet_id, clockin_id, work_date, start_time, end_time, hours_worked, notes)
        VALUES ($1, NULL, $2, $3, $4, $5, $6)`,
        [req.params.id, workDate, startTime || null, endTime || null, parseFloat(hoursWorked).toFixed(2), notes || null]
      );

      const [{ sum }] = await query<any>('SELECT COALESCE(SUM(hours_worked), 0) AS sum FROM timesheet_entries WHERE timesheet_id = $1', [req.params.id]);
      const totalHours = parseFloat(sum);
      const regularHours = Math.min(totalHours, 40);
      const overtimeHours = Math.max(0, totalHours - 40);
      const hourlyRate = (ts as any).hourly_rate;
      const totalPay = hourlyRate ? regularHours * hourlyRate + overtimeHours * hourlyRate * 1.5 : null;

      const updated = await query(`
        UPDATE timesheets SET total_hours = $1, regular_hours = $2, overtime_hours = $3, total_pay = $4, updated_at = NOW()
        WHERE id = $5 RETURNING *`,
        [totalHours.toFixed(2), regularHours.toFixed(2), overtimeHours.toFixed(2), totalPay, req.params.id]
      );

      const entries = await query('SELECT * FROM timesheet_entries WHERE timesheet_id = $1 ORDER BY work_date', [req.params.id]);
      res.status(201).json({ success: true, data: { ...updated[0], entries } } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// Delete a manual timesheet entry (auto-derived clock-in entries can't be deleted here — regenerate instead)
router.delete('/:id/entries/:entryId', requireRole('home_manager', 'group_admin', 'deputy_manager', 'admin'),
  [param('id').isUUID(), param('entryId').isUUID()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const [entry] = await query('SELECT * FROM timesheet_entries WHERE id = $1 AND timesheet_id = $2', [req.params.entryId, req.params.id]);
      if (!entry) throw new AppError('Entry not found', 404);
      if ((entry as any).clockin_id) throw new AppError('Cannot delete a clock-in-derived entry here — use Generate Timesheet to recompute instead', 400);

      await query('DELETE FROM timesheet_entries WHERE id = $1', [req.params.entryId]);

      const [ts] = await query('SELECT * FROM timesheets WHERE id = $1', [req.params.id]);
      const [{ sum }] = await query<any>('SELECT COALESCE(SUM(hours_worked), 0) AS sum FROM timesheet_entries WHERE timesheet_id = $1', [req.params.id]);
      const totalHours = parseFloat(sum);
      const regularHours = Math.min(totalHours, 40);
      const overtimeHours = Math.max(0, totalHours - 40);
      const hourlyRate = (ts as any)?.hourly_rate;
      const totalPay = hourlyRate ? regularHours * hourlyRate + overtimeHours * hourlyRate * 1.5 : null;

      await query(`
        UPDATE timesheets SET total_hours = $1, regular_hours = $2, overtime_hours = $3, total_pay = $4, updated_at = NOW()
        WHERE id = $5`,
        [totalHours.toFixed(2), regularHours.toFixed(2), overtimeHours.toFixed(2), totalPay, req.params.id]
      );
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// Summary stats for payroll overview
router.get('/stats/overview', requireRole('home_manager', 'group_admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
      const weekStart = req.query.weekStart as string;
      const rows = await query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
          COUNT(*) FILTER (WHERE status = 'approved') AS approved_count,
          SUM(total_hours) AS total_hours,
          SUM(total_pay) AS total_pay,
          SUM(overtime_hours) AS overtime_hours
        FROM timesheets
        WHERE home_id = $1 ${weekStart ? 'AND week_start = $2' : ''}`,
        weekStart ? [homeId, weekStart] : [homeId]
      );
      res.json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
