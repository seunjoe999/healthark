import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';
import { sendPushToStaff } from '../services/push.service';
import { ukDateStr } from '../utils/ukTime';

const router = Router();

router.use(authenticate);

function fromToken(req: Request, field: string): string {
  const token = req.headers.authorization?.substring(7);
  if (token) { const d = jwt.decode(token) as any; return d?.[field] || ''; }
  return '';
}

// Roles allowed to create/edit/delete rota shifts — matches the frontend's
// canManage gate in Rota.tsx. Every write endpoint in this file previously
// had no role check at all, so any authenticated staff member could hit
// these directly (devtools/curl) to create, edit, delete or bulk-reassign
// any shift regardless of what the UI showed them.
const MANAGE_ROLES = ['home_manager', 'group_admin', 'senior_carer', 'deputy_manager', 'admin'] as const;

// Roles allowed to see/set wage & charge rates and funder billing details — these
// are financial fields and must stay hidden from ordinary care staff.
const FINANCIAL_ROLES = ['home_manager', 'group_admin', 'deputy_manager', 'admin'];
const FINANCIAL_FIELDS = ['funder_name', 'funder_cost_notes', 'wage_rate', 'charge_rate', 'charge_bank_holiday_rate'];

function isFinancialRole(role: string): boolean {
  return role === 'super_admin' || FINANCIAL_ROLES.includes(role);
}

function stripFinancials<T extends Record<string, any>>(row: T, role: string): T {
  if (isFinancialRole(role)) return row;
  const clone: any = { ...row };
  for (const f of FINANCIAL_FIELDS) delete clone[f];
  return clone;
}

const SHIFT_STATUSES = ['unfilled', 'filled', 'cancelled', 'on_hold', 'completed'];
const SHIFT_RELATIONS = ['shadow', 'double_up'];

export async function generateFromTemplate(tmpl: any, homeId: string, weeks = 12): Promise<number> {
  // Bulk-generate instead of one DB round-trip per calendar day — with the
  // "ongoing" default (52 weeks, daily) the old day-by-day loop meant up to
  // ~700 sequential awaited queries in a single request, routinely exceeding
  // the frontend's 15s timeout. The browser would show an error and the user
  // would assume nothing saved, while the server kept writing in the
  // background — including THIS week's shifts, just arriving late/silently.
  // tmpl.start_date comes back from `RETURNING *` as a native JS Date object
  // (pg's default DATE parser), not a string — string-concatenating it here
  // used to silently produce "Invalid Date" and generate zero shifts.
  const startDateStr = typeof tmpl.start_date === 'string'
    ? tmpl.start_date.split('T')[0]
    : tmpl.start_date.toISOString().split('T')[0];
  const startDate = new Date(startDateStr + 'T00:00:00Z');
  const dowList: number[] = Array.isArray(tmpl.days_of_week) ? tmpl.days_of_week.map(Number) : [Number(tmpl.days_of_week)];

  // A template's own end_date (its "stop date") caps generation regardless of the
  // weeks-ahead window below — previously ignored entirely, so a shift given a
  // specific stop date kept generating occurrences past it for as long as the
  // ongoing/non-ongoing weeks window allowed.
  const endDateStr = tmpl.end_date
    ? (typeof tmpl.end_date === 'string' ? tmpl.end_date.split('T')[0] : tmpl.end_date.toISOString().split('T')[0])
    : null;

  const dateStrs: string[] = [];
  const cur = new Date(startDate);
  for (let i = 0; i <= weeks * 7; i++) {
    const dow = cur.getUTCDay();
    const dateStr = cur.toISOString().split('T')[0];
    if (endDateStr && dateStr > endDateStr) break;
    const dayMatches = tmpl.recurrence === 'daily' || dowList.includes(dow);
    if (dayMatches) {
      let ok = true;
      if (tmpl.recurrence === 'biweekly' || tmpl.recurrence === 'every_other_week') {
        const weeksSince = Math.floor((cur.getTime() - startDate.getTime()) / (7 * 86400000));
        if (weeksSince % 2 !== 0) ok = false;
      }
      if (ok) dateStrs.push(dateStr);
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  if (!dateStrs.length) return 0;

  // One bulk existence check for every candidate date, instead of one query per date.
  // Scoped to THIS template only (tmpl.id is always freshly generated moments before
  // this call, so it can never already have shifts unless this function genuinely ran
  // for it twice). Previously this matched ANY existing shift for the same staff/
  // resident/date/time regardless of which template it came from — so a resident who
  // already had one rota entry at, say, 08:00-20:00 would silently get ZERO shifts
  // generated for a second, unrelated service at that same time (a "Create Rota for
  // Service" submission that reported success but created nothing), and likewise a
  // staff member already scheduled at a given time elsewhere would block a new
  // recurring shift from ever being generated for them.
  const existing = await query<any>(
    `SELECT shift_date::text FROM staff_shifts WHERE template_id=$1 AND shift_date = ANY($2::date[]) AND start_time=$3::time`,
    [tmpl.id, dateStrs, tmpl.start_time]
  );
  const existingSet = new Set(existing.map((r: any) => r.shift_date));
  const toInsert = dateStrs.filter(d => !existingSet.has(d));
  if (!toInsert.length) return 0;

  // One bulk multi-row INSERT for every remaining date.
  const cols = [
    'home_id', 'label', 'staff_id', 'su_id', 'su_ids', 'shift_date', 'start_time', 'end_time', 'shift_type', 'break_minutes', 'template_id',
    'notes_for_carers', 'notes_for_managers', 'is_standby', 'status', 'total_staff_required',
    'funder_name', 'funder_cost_notes', 'wage_rate', 'charge_rate', 'charge_bank_holiday_rate',
    'time_critical', 'shift_run',
  ];
  const params: any[] = [];
  const valueRows: string[] = [];
  for (const dateStr of toInsert) {
    const row = [
      homeId, tmpl.label || null, tmpl.staff_id || null, tmpl.su_id || null,
      Array.isArray(tmpl.su_ids) && tmpl.su_ids.length ? tmpl.su_ids : null, dateStr,
      tmpl.start_time, tmpl.end_time, tmpl.shift_type || 'regular',
      tmpl.break_minutes || 0, tmpl.id,
      tmpl.notes_for_carers || null, tmpl.notes_for_managers || null,
      tmpl.is_standby || false,
      tmpl.staff_id ? 'filled' : 'unfilled', tmpl.staff_count || 1,
      tmpl.funder_name || null, tmpl.funder_cost_notes || null,
      tmpl.wage_rate || null, tmpl.charge_rate || null, tmpl.charge_bank_holiday_rate || null,
      tmpl.time_critical || false, tmpl.shift_run || null,
    ];
    const placeholders = row.map((_, i) => `$${params.length + i + 1}`).join(',');
    valueRows.push(`(${placeholders})`);
    params.push(...row);
  }
  await query(
    `INSERT INTO staff_shifts (${cols.join(', ')}) VALUES ${valueRows.join(', ')}`,
    params
  );
  return toInsert.length;
}

// GET /api/shifts/service-labels?homeId= — every distinct service name ever used
// at this home, independent of which week/day is currently being viewed. The
// Rota's "Services" filter used to derive its list from only the shifts loaded
// for the visible date range, so navigating to a week with no service-shifts
// scheduled made the filter (and the whole Services list) look empty/broken,
// even though services existed on other weeks.
router.get('/service-labels', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    // Deactivated templates (deleted via Manage Services) must not leak their
    // label back into this suggestion list — without the is_active filter, a
    // service someone already deleted (e.g. a duplicate "Kennedy Road") kept
    // reappearing as a selectable "existing service" forever, even though it
    // had zero real shifts and never showed up in Manage Services itself.
    const rows = await query<{ label: string }>(
      `SELECT DISTINCT label FROM staff_shifts WHERE home_id = $1 AND label IS NOT NULL AND label != ''
       UNION
       SELECT DISTINCT label FROM shift_templates WHERE home_id = $1 AND label IS NOT NULL AND label != '' AND is_active = true
       ORDER BY label`,
      [homeId]
    );
    res.json({ success: true, data: rows.map((r: any) => r.label) } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/shifts/service-labels-detail?homeId= — same distinct labels as
// above, but with a shift count each, for the "Manage Services" cleanup
// panel — lets a manager see they've accidentally created "Kennedy" four
// times over and delete the duplicates, instead of hunting down and
// removing dozens of individual shift tiles one at a time.
router.get('/service-labels-detail', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const rows = await query<any>(
      `SELECT label, COUNT(*) as shift_count,
              COUNT(*) FILTER (WHERE shift_date >= CURRENT_DATE) as future_count
       FROM staff_shifts
       WHERE home_id = $1 AND label IS NOT NULL AND label != ''
       GROUP BY label ORDER BY label`,
      [homeId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// DELETE /api/shifts/service-label/:label?homeId= — deletes every shift AND
// recurring template for this exact service label at this home, so a
// manager can remove a whole accidentally-duplicated service in one action
// instead of clicking through every individual shift.
router.delete('/service-label/:label', requireRole(...MANAGE_ROLES), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const label = decodeURIComponent(req.params.label);
    const shiftsDeleted = await query<any>(
      `DELETE FROM staff_shifts WHERE home_id = $1 AND label = $2 RETURNING id`,
      [homeId, label]
    );
    await query(`UPDATE shift_templates SET is_active = FALSE WHERE home_id = $1 AND label = $2`, [homeId, label]);
    res.json({ success: true, data: { deleted: shiftsDeleted.length } } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/shifts?homeId=&weekStart=&date=
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const date = req.query.date as string;
    const weekStart = req.query.weekStart as string;
    const role = fromToken(req, 'role');
    const myStaffId = fromToken(req, 'staffId');

    const PRIVILEGED_ROLES = ['home_manager', 'group_admin', 'deputy_manager', 'admin', 'team_leader',
      'supervisor', 'service_manager', 'registered_manager', 'director', 'auditor', 'senior_carer'];
    const isPrivileged = PRIVILEGED_ROLES.includes(role);

    // Non-privileged staff (care_staff) only see shifts on days they themselves
    // are scheduled — i.e. who else is working alongside them — not the entire
    // home's rota. senior_carer is privileged here to match the frontend, which
    // already lets them create and edit shifts for the whole team.
    let restrictDates: string[] | null = null;
    if (!isPrivileged) {
      let myDatesSql = `SELECT DISTINCT shift_date FROM staff_shifts WHERE home_id = $1 AND staff_id = $2`;
      const myDatesParams: unknown[] = [homeId, myStaffId];
      if (date) { myDatesSql += ` AND shift_date = $3`; myDatesParams.push(date); }
      else if (weekStart) {
        myDatesSql += ` AND shift_date >= $3 AND shift_date < $3::date + interval '7 days'`;
        myDatesParams.push(weekStart);
      }
      const myShifts = await query<any>(myDatesSql, myDatesParams);
      restrictDates = myShifts.map((r: any) => r.shift_date);
      if (restrictDates.length === 0) {
        return res.json({ success: true, data: [] } as ApiResponse);
      }
    }

    // Team leaders only see shifts belonging to their own team's staff (plus
    // still-unfilled shifts, so they can help fill them) — not the whole
    // home's rota. Team is resolved via teams.leader_staff_id first, falling
    // back to their own staff.team_id if they're a member rather than leader.
    let teamStaffIds: string[] | null = null;
    if (role === 'team_leader') {
      const teamRows = await query<any>('SELECT id FROM teams WHERE leader_staff_id = $1 LIMIT 1', [myStaffId]);
      let teamId = teamRows[0]?.id as string | undefined;
      if (!teamId) {
        const own = await query<any>('SELECT team_id FROM staff WHERE id = $1', [myStaffId]);
        teamId = own[0]?.team_id || undefined;
      }
      if (teamId) {
        const members = await query<any>('SELECT id FROM staff WHERE team_id = $1', [teamId]);
        teamStaffIds = members.map((m: any) => m.id);
      }
    }

    let sql = `SELECT sh.*,
      s.first_name || ' ' || s.last_name as staff_name, s.role as staff_role, s.photo_url as staff_photo,
      su.first_name || ' ' || su.last_name as su_name,
      (SELECT string_agg(su2.first_name || ' ' || su2.last_name, ', ' ORDER BY su2.first_name)
       FROM service_users su2 WHERE su2.id = ANY(COALESCE(sh.su_ids, ARRAY[sh.su_id]))) as su_names,
      (SELECT MIN(ce.event_time) FROM staff_clock_events ce
       WHERE ce.staff_id = sh.staff_id AND ce.event_type = 'clock_in' AND ce.event_time::date = sh.shift_date) as clock_in_time,
      (SELECT MAX(ce.event_time) FROM staff_clock_events ce
       WHERE ce.staff_id = sh.staff_id AND ce.event_type = 'clock_out' AND ce.event_time::date = sh.shift_date) as clock_out_time
      FROM staff_shifts sh
      LEFT JOIN staff s ON s.id = sh.staff_id
      LEFT JOIN service_users su ON su.id = sh.su_id
      WHERE sh.home_id = $1`;
    const params: unknown[] = [homeId];

    if (teamStaffIds) {
      sql += ` AND (sh.staff_id = ANY($${params.length+1}) OR sh.staff_id IS NULL)`;
      params.push(teamStaffIds);
    }
    if (date) { sql += ` AND sh.shift_date = $${params.length+1}`; params.push(date); }
    else if (weekStart) {
      sql += ` AND sh.shift_date >= $${params.length+1} AND sh.shift_date < $${params.length+1}::date + interval '7 days'`;
      params.push(weekStart);
    }
    if (restrictDates) {
      sql += ` AND sh.shift_date = ANY($${params.length+1})`;
      params.push(restrictDates);
    }
    sql += ' ORDER BY sh.shift_date, sh.start_time';

    const rows = await query<any>(sql, params);
    res.json({ success: true, data: rows.map((r: any) => stripFinancials(r, role)) } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/shifts
router.post('/', requireRole(...MANAGE_ROLES), [body('staffId').isUUID(), body('shiftDate').isDate(), body('startTime').notEmpty(), body('endTime').notEmpty()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = req.body.homeId || fromToken(req, 'homeId');
      const createdBy = fromToken(req, 'staffId');
      const role = fromToken(req, 'role');
      const { staffId, suId, shiftDate, startTime, endTime, shiftType, notes } = req.body;
      const financial = isFinancialRole(role) ? req.body : {};
      const rows = await query(
        `INSERT INTO staff_shifts (
           home_id, staff_id, su_id, shift_date, start_time, end_time, shift_type, notes, created_by,
           status, funder_name, funder_cost_notes, wage_rate, charge_rate, charge_bank_holiday_rate,
           time_critical, shift_run, total_staff_required
         )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
        [homeId, staffId, suId || null, shiftDate, startTime, endTime, shiftType || 'regular', notes || null, createdBy,
         staffId ? 'filled' : 'unfilled',
         financial.funderName || null, financial.funderCostNotes || null,
         financial.wageRate || null, financial.chargeRate || null, financial.chargeBankHolidayRate || null,
         !!req.body.timeCritical, req.body.shiftRun || null, parseInt(req.body.totalStaffRequired) || 1]
      );
      if (staffId) {
        const body = `You have been assigned a shift on ${shiftDate} from ${startTime} to ${endTime}`;
        await query(
          `INSERT INTO notifications (recipient_id, home_id, title, body, type, link)
           VALUES ($1,$2,$3,$4,'shift','/rota')`,
          [staffId, homeId, 'New shift assigned', body]
        );
        sendPushToStaff(staffId, { title: 'New shift assigned', body, url: '/rota' }).catch(() => {});
      }
      res.status(201).json({ success: true, data: stripFinancials(rows[0] as any, role) } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/shifts/copy-week — copy all shifts from previous week to current week
router.post('/copy-week', requireRole(...MANAGE_ROLES), async (req: Request, res: Response, next: NextFunction) => {
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
          `INSERT INTO staff_shifts (home_id, staff_id, su_id, shift_date, start_time, end_time, shift_type, notes, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING RETURNING id`,
          [homeId, s.staff_id, s.su_id, d.toISOString().split('T')[0], s.start_time, s.end_time, s.shift_type, s.notes,
           s.staff_id ? 'filled' : 'unfilled']
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
router.post('/leave', requireRole(...MANAGE_ROLES), async (req: Request, res: Response, next: NextFunction) => {
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
router.delete('/leave/:id', requireRole(...MANAGE_ROLES), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = fromToken(req, 'homeId');
    await query('DELETE FROM staff_leave WHERE id = $1 AND home_id = $2', [req.params.id, homeId]);
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
router.put('/swaps/:id', requireRole(...MANAGE_ROLES), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, responseNotes } = req.body;
    // Ensure column exists
    await query(`ALTER TABLE shift_swap_requests ADD COLUMN IF NOT EXISTS target_agreed BOOLEAN DEFAULT NULL`).catch(() => {});
    const rows = await query(
      `UPDATE shift_swap_requests SET status=$1, response_notes=$2, updated_at=NOW() WHERE id=$3 RETURNING *`,
      [status, responseNotes || null, req.params.id]
    );
    if (status === 'approved') {
      // Do the actual shift swap in DB. For an "open" request (no specific
      // target_staff_id was picked), this releases the shift back to unfilled
      // so it can be assigned to whoever actually covers it — there's no
      // specific person to hand it straight to.
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
router.post('/service-shift', requireRole(...MANAGE_ROLES), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = req.body.homeId || fromToken(req, 'homeId');
    const createdBy = fromToken(req, 'staffId');
    const role = fromToken(req, 'role');
    const {
      label,
      suId, suIds, startDate, isOngoing, endDate, recurrence, daysOfWeek,
      startTime, endTime, shiftType, totalStaffRequired, staffIds,
      notesForCarers, notesForManagers, isStandby, standbyWorkDetails,
      breakMins, weeks: weeksParam,
      funderName, funderCostNotes, wageRate, chargeRate, chargeBankHolidayRate,
      timeCritical, shiftRun,
    } = req.body;
    const financial = isFinancialRole(role)
      ? { funderName, funderCostNotes, wageRate, chargeRate, chargeBankHolidayRate }
      : {} as any;

    if (!startTime || !endTime) return res.status(400).json({ success: false, error: 'startTime and endTime required' } as any);

    const WEEKS = isOngoing ? 52 : (parseInt(weeksParam) || 12);
    // One row/line generated per required staff slot, not one row carrying a "requires
    // N" count with a single staff_id column — a column can only ever hold one person,
    // so "shift size 2" with only 1 (or 0) staff explicitly picked used to leave no
    // second row for anyone else to ever be assigned into, silently capping the shift
    // at whoever filled the first slot. Explicitly-picked staff fill the first rows;
    // any remaining required slots are generated unfilled, ready for Bulk Assign or a
    // direct pick later — matching how RoundSys generates one rota line per person.
    const explicitStaffIds: string[] = Array.isArray(staffIds) ? staffIds.filter(Boolean) : [];
    const requiredSlots = Math.max(parseInt(totalStaffRequired) || 1, explicitStaffIds.length, 1);
    const staffToCreate: (string | null)[] = explicitStaffIds.length > 0
      ? [...explicitStaffIds, ...Array(requiredSlots - explicitStaffIds.length).fill(null)]
      : Array(requiredSlots).fill(null);
    const templates: any[] = [];
    let totalGenerated = 0;

    // Several residents sharing one staff requirement (e.g. 2 residents in the same
    // house, 1 staff required) must produce ONE shift line per staff slot, not one
    // per resident — su_id stays the first resident (existing filters/display), su_ids
    // carries the full set so the tile can show everyone it covers.
    const allSuIds: string[] = Array.isArray(suIds) && suIds.length ? suIds : (suId ? [suId] : []);
    const primarySuId = allSuIds[0] || null;

    const effectiveDays = recurrence === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : (daysOfWeek || [1]);

    for (const staffId of staffToCreate) {
      const rows = await query<any>(
        `INSERT INTO shift_templates
          (home_id, label, staff_id, su_id, su_ids, shift_type, start_time, end_time, break_minutes,
           recurrence, days_of_week, start_date, staff_count, is_ongoing,
           notes_for_carers, notes_for_managers, created_by, end_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
        [homeId, label || null, staffId || null, primarySuId, allSuIds.length ? allSuIds : null, shiftType || 'regular', startTime, endTime, parseInt(breakMins) || 0,
         recurrence || 'daily', effectiveDays,
         startDate || ukDateStr(),
         // 1, not the original totalStaffRequired — each row generated here is now its
         // OWN slot (see staffToCreate above), so "how many staff does this row need"
         // is always 1; the original required count only decided how many rows to make.
         1, isOngoing || false,
         notesForCarers || null, notesForManagers || null, createdBy,
         // Ongoing shifts ignore any stop date entirely (that's what "ongoing" means);
         // only a non-ongoing shift's chosen end date is persisted.
         isOngoing ? null : (endDate || null)]
      );
      const tmpl = {
        ...rows[0], is_standby: isStandby || false, standby_work_details: standbyWorkDetails || null,
        funder_name: financial.funderName || null, funder_cost_notes: financial.funderCostNotes || null,
        wage_rate: financial.wageRate || null, charge_rate: financial.chargeRate || null,
        charge_bank_holiday_rate: financial.chargeBankHolidayRate || null,
        time_critical: !!timeCritical, shift_run: shiftRun || null,
      };
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
router.post('/templates', requireRole(...MANAGE_ROLES), async (req: Request, res: Response, next: NextFunction) => {
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
       startDate || ukDateStr(),
       staffCount || 1, createdBy]
    );
    const tmpl = rows[0] as any;
    const generated = await generateFromTemplate(tmpl, homeId, tmpl.is_ongoing ? 52 : 12);
    res.status(201).json({ success: true, data: { template: tmpl, generated } } as ApiResponse);
  } catch (err) { next(err); }
});

// DELETE /api/shifts/templates/:id — remove template + future generated shifts
router.delete('/templates/:id', requireRole(...MANAGE_ROLES), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const today = ukDateStr();
    await query(`DELETE FROM staff_shifts WHERE template_id=$1 AND shift_date >= $2`, [req.params.id, today]);
    await query(`UPDATE shift_templates SET is_active=FALSE WHERE id=$1`, [req.params.id]);
    res.json({ success: true } as ApiResponse);
  } catch (err) { next(err); }
});

// PUT /api/shifts/:id — general shift edit (staff assignment, times, size, financial fields, etc.)
router.put('/:id', requireRole(...MANAGE_ROLES), param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const role = fromToken(req, 'role');
      const existing = await query<any>('SELECT * FROM staff_shifts WHERE id = $1', [req.params.id]);
      if (!existing[0]) return res.status(404).json({ success: false, error: 'Shift not found' } as ApiResponse);

      const {
        staffId, suId, shiftDate, startTime, endTime, shiftType, totalStaffRequired,
        notesForCarers, notesForManagers, status, label,
        funderName, funderCostNotes, wageRate, chargeRate, chargeBankHolidayRate,
        timeCritical, shiftRun, applyToFuture,
      } = req.body;

      const fields: string[] = [];
      const values: unknown[] = [];
      const set = (col: string, val: unknown) => { fields.push(`${col} = $${fields.length + 1}`); values.push(val); };

      if (staffId !== undefined) {
        set('staff_id', staffId || null);
        // Auto-flip status when staff is (un)assigned, unless caller explicitly set a status this call.
        if (status === undefined) set('status', staffId ? 'filled' : 'unfilled');
      }
      if (suId !== undefined) set('su_id', suId || null);
      if (shiftDate !== undefined) set('shift_date', shiftDate);
      if (startTime !== undefined) set('start_time', startTime);
      if (endTime !== undefined) set('end_time', endTime);
      if (shiftType !== undefined) set('shift_type', shiftType);
      if (totalStaffRequired !== undefined) set('total_staff_required', parseInt(totalStaffRequired) || 1);
      // Lets a manager reclassify an existing shift between "Individual" (no label,
      // shows the resident's own name) and "Service" (labelled, shows the shared
      // service name) after the fact, instead of having to delete and recreate it
      // through "Create Rota for Service" just to fix a mis-created entry.
      if (label !== undefined) set('label', label || null);
      if (notesForCarers !== undefined) set('notes_for_carers', notesForCarers || null);
      if (notesForManagers !== undefined) set('notes_for_managers', notesForManagers || null);
      if (status !== undefined) {
        if (!SHIFT_STATUSES.includes(status)) return res.status(400).json({ success: false, error: 'Invalid status' } as ApiResponse);
        set('status', status);
      }
      if (timeCritical !== undefined) set('time_critical', !!timeCritical);
      if (shiftRun !== undefined) set('shift_run', shiftRun || null);

      if (isFinancialRole(role)) {
        if (funderName !== undefined) set('funder_name', funderName || null);
        if (funderCostNotes !== undefined) set('funder_cost_notes', funderCostNotes || null);
        if (wageRate !== undefined) set('wage_rate', wageRate || null);
        if (chargeRate !== undefined) set('charge_rate', chargeRate || null);
        if (chargeBankHolidayRate !== undefined) set('charge_bank_holiday_rate', chargeBankHolidayRate || null);
      }

      if (fields.length === 0) return res.json({ success: true, data: stripFinancials(existing[0], role) } as ApiResponse);

      values.push(req.params.id);
      const rows = await query<any>(
        `UPDATE staff_shifts SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
        values
      );
      const updated = rows[0];
      // shift_date comes back from pg as a JS Date object, not a string — interpolating
      // it directly produces the full "Fri Dec 25 2026 00:00:00 GMT+0000 (...)" toString().
      const fmtDate = (d: unknown) => (d instanceof Date ? d.toISOString().split('T')[0] : String(d).split('T')[0]);

      // "Apply changes to future shifts" — cascades a start/end time change to every
      // later occurrence of the same recurring shift, instead of the manager having
      // to open and edit each future date by hand. Only the time fields carry over;
      // date, staff assignment, status etc. stay whatever each individual occurrence
      // already has. Only applies to shifts generated from a template — a one-off
      // shift has no "future occurrences" to cascade to.
      if (applyToFuture && updated.template_id && (startTime !== undefined || endTime !== undefined)) {
        const futureFields: string[] = [];
        const futureValues: unknown[] = [];
        const setFuture = (col: string, val: unknown) => { futureFields.push(`${col} = $${futureFields.length + 1}`); futureValues.push(val); };
        if (startTime !== undefined) setFuture('start_time', startTime);
        if (endTime !== undefined) setFuture('end_time', endTime);
        futureValues.push(updated.template_id, updated.id, fmtDate(updated.shift_date));
        await query(
          `UPDATE staff_shifts SET ${futureFields.join(', ')}, updated_at = NOW()
           WHERE template_id = $${futureValues.length - 2} AND id != $${futureValues.length - 1} AND shift_date > $${futureValues.length}`,
          futureValues
        );
        // Keep the template itself in sync too, so shifts generated from it later
        // (e.g. extending the date range) use the new time, not the old one.
        const templateFields: string[] = [];
        const templateValues: unknown[] = [];
        const setTemplate = (col: string, val: unknown) => { templateFields.push(`${col} = $${templateFields.length + 1}`); templateValues.push(val); };
        if (startTime !== undefined) setTemplate('start_time', startTime);
        if (endTime !== undefined) setTemplate('end_time', endTime);
        templateValues.push(updated.template_id);
        await query(`UPDATE shift_templates SET ${templateFields.join(', ')} WHERE id = $${templateValues.length}`, templateValues)
          .catch(() => {});
      }

      // Tell the affected staff member(s) their rota has changed — a swapped
      // date/time, a status change (e.g. cancelled), or being (un)assigned
      // altogether all mean the shift on their rota no longer looks like it
      // did when they last checked.
      const oldStaffId = existing[0].staff_id;
      const newStaffId = updated.staff_id;
      const timeChanged = shiftDate !== undefined || startTime !== undefined || endTime !== undefined;
      const statusChanged = status !== undefined && status !== existing[0].status;
      if (oldStaffId && oldStaffId !== newStaffId) {
        const removedBody = `Your shift on ${fmtDate(existing[0].shift_date)} has been reassigned to someone else.`;
        await query(
          `INSERT INTO notifications (recipient_id, home_id, title, body, type, link) VALUES ($1,$2,$3,$4,'shift','/rota')`,
          [oldStaffId, updated.home_id, 'Rota updated', removedBody]
        ).catch(() => {});
        sendPushToStaff(oldStaffId, { title: 'Rota updated', body: removedBody, url: '/rota' }).catch(() => {});
      }
      if (newStaffId && (newStaffId !== oldStaffId || timeChanged || statusChanged)) {
        const body = newStaffId !== oldStaffId
          ? `You've been assigned a shift on ${fmtDate(updated.shift_date)} from ${updated.start_time} to ${updated.end_time}.`
          : statusChanged
            ? `Your shift on ${fmtDate(updated.shift_date)} is now marked ${updated.status.replace('_', ' ')}.`
            : `Your shift has changed — now ${fmtDate(updated.shift_date)} from ${updated.start_time} to ${updated.end_time}.`;
        await query(
          `INSERT INTO notifications (recipient_id, home_id, title, body, type, link) VALUES ($1,$2,$3,$4,'shift','/rota')`,
          [newStaffId, updated.home_id, 'Rota updated', body]
        ).catch(() => {});
        sendPushToStaff(newStaffId, { title: 'Rota updated', body, url: '/rota' }).catch(() => {});
      }

      res.json({ success: true, data: stripFinancials(updated, role) } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// PUT /api/shifts/:id/status — quick status change (Filled / Cancelled / On Hold / Completed)
router.put('/:id/status', requireRole(...MANAGE_ROLES), param('id').isUUID(), body('status').isIn(SHIFT_STATUSES), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const role = fromToken(req, 'role');
      const rows = await query<any>(
        `UPDATE staff_shifts SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [req.body.status, req.params.id]
      );
      if (!rows[0]) return res.status(404).json({ success: false, error: 'Shift not found' } as ApiResponse);
      res.json({ success: true, data: stripFinancials(rows[0], role) } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/shifts/bulk-assign-pattern — allocate one staff member to every unfilled shift
// matching a recurring pattern (specific days of the week, optionally fortnightly, day/night,
// within a date range) instead of requiring staff be picked one-by-one or at shift-creation
// time (which used to force the same person onto every day of the rota).
//
// Day/night is matched off the shift's actual start_time, NOT the shift_type label — shifts
// created via "Create Rota for Service" all default shift_type to 'regular' unless the manager
// explicitly changes the dropdown, so two rota entries (an 08:00 day slot and a 20:00 night
// slot) commonly end up with the identical shift_type. Filtering by that label made "Day only"
// silently match the night shifts too. Time-of-day is always accurate regardless of the label.
// Night = starts 20:00–05:59; Day = starts 06:00–19:59.

router.post('/bulk-assign-pattern', requireRole(...MANAGE_ROLES), [
  body('staffId').isUUID(),
  // Required — left optional this used to silently match every resident's shifts
  // in the date range, not just the one the manager meant to allocate for.
  body('suId').isUUID(),
  body('startDate').isDate(),
  body('endDate').isDate(),
  // Monthly mode matches by day-of-month (derived from startDate) instead of days of
  // the week, so daysOfWeek isn't meaningful there — only require it otherwise.
  body('daysOfWeek').if((_, { req }) => !req.body.monthly).isArray({ min: 1 }),
], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = req.body.homeId || fromToken(req, 'homeId');
      const { staffId, suId, startDate, endDate, daysOfWeek, fortnightly, monthly, dayOrNight, onlyUnfilled } = req.body;

      const candidates = await query<any>(
        `SELECT id, shift_date FROM staff_shifts
         WHERE home_id = $1 AND shift_date BETWEEN $2 AND $3
           AND (
             ($8 AND EXTRACT(DAY FROM shift_date)::int = EXTRACT(DAY FROM $2::date)::int)
             OR (NOT $8 AND EXTRACT(DOW FROM shift_date)::int = ANY($4::int[]))
           )
           AND ($5::uuid IS NULL OR su_id = $5)
           AND (
             $6::text IS NULL
             OR ($6 = 'day'   AND start_time >= '06:00'::time AND start_time < '20:00'::time)
             OR ($6 = 'night' AND (start_time >= '20:00'::time OR start_time < '06:00'::time))
           )
           AND (NOT $7 OR staff_id IS NULL)
         ORDER BY shift_date`,
        [homeId, startDate, endDate, (daysOfWeek || []).map((d: any) => parseInt(d)),
         suId || null, dayOrNight === 'day' || dayOrNight === 'night' ? dayOrNight : null, onlyUnfilled !== false,
         !!monthly]
      );

      // Fortnightly: keep only shifts in the same alternating week as startDate.
      const startWeekIndex = Math.floor((new Date(startDate).getTime()) / (7 * 24 * 3600 * 1000));
      const matched = fortnightly
        ? candidates.filter(c => {
            const weekIndex = Math.floor(new Date(c.shift_date).getTime() / (7 * 24 * 3600 * 1000));
            return (weekIndex - startWeekIndex) % 2 === 0;
          })
        : candidates;

      if (matched.length === 0) {
        return res.json({ success: true, data: { assigned: 0 } } as ApiResponse);
      }

      const ids = matched.map(m => m.id);
      await query(
        `UPDATE staff_shifts SET staff_id = $1, status = 'filled', updated_at = NOW() WHERE id = ANY($2::uuid[])`,
        [staffId, ids]
      );

      sendPushToStaff(staffId, {
        title: 'Rota updated',
        body: `You've been assigned ${ids.length} new shift${ids.length !== 1 ? 's' : ''} on the rota.`,
        url: '/rota',
      }).catch(() => {});

      res.json({ success: true, data: { assigned: ids.length } } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/shifts/bulk-unassign — remove a staff member from all of their current and
// future shifts (today onwards; past shifts are left alone as a historical record),
// optionally narrowed to one resident. This un-fills the shift (staff_id -> NULL,
// status -> 'unfilled') rather than deleting it, so the rota slot still exists and
// needs covering — the counterpart to "Bulk Assign Staff to Shifts".
router.post('/bulk-unassign', requireRole(...MANAGE_ROLES), [
  body('staffId').isUUID(),
], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = req.body.homeId || fromToken(req, 'homeId');
      const { staffId, suId } = req.body;
      const today = ukDateStr();

      const rows = await query<any>(
        `UPDATE staff_shifts SET staff_id = NULL, status = 'unfilled', updated_at = NOW()
         WHERE home_id = $1 AND staff_id = $2 AND shift_date >= $3
           AND ($4::uuid IS NULL OR su_id = $4)
         RETURNING id`,
        [homeId, staffId, today, suId || null]
      );

      res.json({ success: true, data: { unassigned: rows.length } } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/shifts/bulk-delete-pattern — remove every shift matching a recurring pattern
// (specific days of the week, optionally fortnightly, day/night, staff and/or resident,
// within a date range) instead of requiring each one be selected and deleted by hand.
router.post('/bulk-delete-pattern', requireRole(...MANAGE_ROLES), [
  body('startDate').isDate(),
  body('endDate').isDate(),
  body('daysOfWeek').isArray({ min: 1 }),
], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = req.body.homeId || fromToken(req, 'homeId');
      const { staffId, suId, startDate, endDate, daysOfWeek, fortnightly, dayOrNight } = req.body;

      const candidates = await query<any>(
        `SELECT id, shift_date FROM staff_shifts
         WHERE home_id = $1 AND shift_date BETWEEN $2 AND $3
           AND EXTRACT(DOW FROM shift_date)::int = ANY($4::int[])
           AND ($5::uuid IS NULL OR staff_id = $5)
           AND ($6::uuid IS NULL OR su_id = $6)
           AND (
             $7::text IS NULL
             OR ($7 = 'day'   AND start_time >= '06:00'::time AND start_time < '20:00'::time)
             OR ($7 = 'night' AND (start_time >= '20:00'::time OR start_time < '06:00'::time))
           )
         ORDER BY shift_date`,
        [homeId, startDate, endDate, daysOfWeek.map((d: any) => parseInt(d)),
         staffId || null, suId || null, dayOrNight === 'day' || dayOrNight === 'night' ? dayOrNight : null]
      );

      const startWeekIndex = Math.floor((new Date(startDate).getTime()) / (7 * 24 * 3600 * 1000));
      const matched = fortnightly
        ? candidates.filter(c => {
            const weekIndex = Math.floor(new Date(c.shift_date).getTime() / (7 * 24 * 3600 * 1000));
            return (weekIndex - startWeekIndex) % 2 === 0;
          })
        : candidates;

      if (matched.length === 0) {
        return res.json({ success: true, data: { deleted: 0 } } as ApiResponse);
      }

      const ids = matched.map(m => m.id);
      await query(`DELETE FROM staff_shifts WHERE id = ANY($1::uuid[])`, [ids]);

      res.json({ success: true, data: { deleted: ids.length } } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/shifts/:id/link — create a shadow or double-up shift linked to an existing shift.
// Copies the parent's date / service user / times by default; caller may override staffId/notes.
router.post('/:id/link', requireRole(...MANAGE_ROLES), param('id').isUUID(), body('relation').isIn(SHIFT_RELATIONS), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const role = fromToken(req, 'role');
      const createdBy = fromToken(req, 'staffId');
      const parentRows = await query<any>('SELECT * FROM staff_shifts WHERE id = $1', [req.params.id]);
      const parent = parentRows[0];
      if (!parent) return res.status(404).json({ success: false, error: 'Parent shift not found' } as ApiResponse);

      const { relation, staffId, startTime, endTime, notesForCarers } = req.body;

      const rows = await query<any>(
        `INSERT INTO staff_shifts (
           home_id, staff_id, su_id, shift_date, start_time, end_time, shift_type,
           notes_for_carers, notes_for_managers, is_standby, status, total_staff_required,
           parent_shift_id, shift_relation, created_by
         )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
        [parent.home_id, staffId || null, parent.su_id, parent.shift_date,
         startTime || parent.start_time, endTime || parent.end_time, parent.shift_type,
         notesForCarers !== undefined ? (notesForCarers || null) : parent.notes_for_carers,
         parent.notes_for_managers, parent.is_standby,
         staffId ? 'filled' : 'unfilled', 1,
         parent.id, relation, createdBy]
      );
      res.status(201).json({ success: true, data: stripFinancials(rows[0], role) } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// DELETE /api/shifts/:id
router.delete('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await query<any>('SELECT staff_id, home_id, shift_date FROM staff_shifts WHERE id = $1', [req.params.id]);
      await query('DELETE FROM staff_shifts WHERE id = $1', [req.params.id]);
      if (existing[0]?.staff_id) {
        const shiftDateStr = existing[0].shift_date instanceof Date
          ? existing[0].shift_date.toISOString().split('T')[0]
          : String(existing[0].shift_date).split('T')[0];
        const body = `Your shift on ${shiftDateStr} has been removed from the rota.`;
        await query(
          `INSERT INTO notifications (recipient_id, home_id, title, body, type, link) VALUES ($1,$2,$3,$4,'shift','/rota')`,
          [existing[0].staff_id, existing[0].home_id, 'Rota updated', body]
        ).catch(() => {});
        sendPushToStaff(existing[0].staff_id, { title: 'Rota updated', body, url: '/rota' }).catch(() => {});
      }
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/shifts/auto-schedule
router.post('/auto-schedule', requireRole(...MANAGE_ROLES), async (req: Request, res: Response, next: NextFunction) => {
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
