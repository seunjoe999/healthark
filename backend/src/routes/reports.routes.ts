import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { query } from '../config/database';
import { ApiResponse } from '../types';
import { ukDateStr } from '../utils/ukTime';
import jwt from 'jsonwebtoken';

const router = Router();

function nd(v: any): string | null { return v && String(v).trim() ? String(v).trim() : null; }

router.use(authenticate);

function fromToken(req: Request, field: string): string {
  const token = req.headers.authorization?.substring(7);
  if (token) { const d = jwt.decode(token) as any; return (req.staff as any)?.[field] || d?.[field] || ''; }
  return (req.staff as any)?.[field] || '';
}

// GET /api/reports/daily-records
router.get('/daily-records', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const { suId, from, to, recordType } = req.query as Record<string, string>;
    const fromDate = from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = to || ukDateStr();

    let sql = `SELECT dr.*, su.first_name || ' ' || su.last_name as su_name,
                      s.first_name || ' ' || s.last_name as staff_name
               FROM daily_records dr
               JOIN service_users su ON su.id = dr.su_id
               JOIN staff s ON s.id = dr.staff_id
               WHERE dr.home_id = $1 AND dr.record_date BETWEEN $2 AND $3`;
    const params: unknown[] = [homeId, fromDate, toDate];
    let idx = 4;
    if (suId) { sql += ` AND dr.su_id = $${idx++}`; params.push(suId); }
    if (recordType) { sql += ` AND dr.record_type = $${idx++}`; params.push(recordType); }
    sql += ' ORDER BY dr.record_date DESC, dr.id DESC LIMIT 500';

    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/reports/fluid
router.get('/fluid', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const { from, to } = req.query as Record<string, string>;
    const fromDate = from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = to || ukDateStr();

    const rows = await query(
      `SELECT ft.*, su.first_name || ' ' || su.last_name as su_name, su.min_fluid_ml
       FROM su_daily_fluid_totals ft JOIN service_users su ON su.id = ft.su_id
       WHERE su.home_id = $1 AND ft.record_date BETWEEN $2 AND $3
       ORDER BY ft.record_date DESC, su.last_name`,
      [homeId, fromDate, toDate]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/reports/incidents
router.get('/incidents', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const { from, to } = req.query as Record<string, string>;
    const fromDate = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = to || ukDateStr();

    const rows = await query(
      `SELECT ri.*, dr.record_date, su.first_name || ' ' || su.last_name as su_name,
              s.first_name || ' ' || s.last_name as staff_name
       FROM records_incidents ri
       JOIN daily_records dr ON dr.id = ri.daily_record_id
       JOIN service_users su ON su.id = dr.su_id
       JOIN staff s ON s.id = dr.staff_id
       WHERE dr.home_id = $1 AND dr.record_date BETWEEN $2 AND $3
       ORDER BY dr.record_date DESC`,
      [homeId, fromDate, toDate]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/reports/care-plan-compliance
router.get('/care-plan-compliance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const rows = await query(
      `SELECT cp.plan_type, cp.last_review_date, cp.next_review_date, cp.review_frequency,
              su.first_name || ' ' || su.last_name as su_name,
              CASE WHEN cp.next_review_date < CURRENT_DATE THEN 'overdue'
                   WHEN cp.next_review_date < CURRENT_DATE + INTERVAL '7 days' THEN 'due_soon'
                   ELSE 'current' END as review_status
       FROM care_plans cp JOIN service_users su ON su.id = cp.su_id
       WHERE cp.home_id = $1 AND cp.is_active IS NOT FALSE
       ORDER BY review_status DESC, cp.next_review_date`,
      [homeId]
    );
    const total = rows.length;
    const overdue = rows.filter((r: any) => r.review_status === 'overdue').length;
    const dueSoon = rows.filter((r: any) => r.review_status === 'due_soon').length;
    const current = rows.filter((r: any) => r.review_status === 'current').length;
    res.json({ success: true, data: { plans: rows, summary: { total, overdue, dueSoon, current, complianceRate: total > 0 ? Math.round((current / total) * 100) : 100 } } } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/reports/staff-attendance
router.get('/staff-attendance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const { from, to } = req.query as Record<string, string>;
    const fromDate = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = to || ukDateStr();
    const rows = await query(
      `SELECT ce.*, s.first_name || ' ' || s.last_name as staff_name, s.role
       FROM staff_clock_events ce JOIN staff s ON s.id = ce.staff_id
       WHERE ce.home_id = $1 AND DATE(ce.event_time) BETWEEN $2 AND $3
       ORDER BY ce.event_time DESC`,
      [homeId, fromDate, toDate]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/reports/training-compliance
router.get('/training-compliance', requireRole('home_manager', 'group_admin', 'senior_carer'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const rows = await query(
      `SELECT st.*, s.first_name || ' ' || s.last_name as staff_name, s.role,
              CASE WHEN st.expiry_date < CURRENT_DATE THEN 'expired'
                   WHEN st.expiry_date < CURRENT_DATE + INTERVAL '60 days' THEN 'expiring'
                   ELSE 'current' END as expiry_status
       FROM staff_training st JOIN staff s ON s.id = st.staff_id
       WHERE s.home_id = $1 ORDER BY expiry_status DESC, st.expiry_date`,
      [homeId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/reports/monthly-summary
router.get('/monthly-summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const month = (req.query.month as string) || new Date().toISOString().substring(0, 7);
    const from = `${month}-01`;
    const to = new Date(new Date(from).getFullYear(), new Date(from).getMonth() + 1, 0).toISOString().split('T')[0];

    const [totalRecords, incidents, fluidBelow, carePlans, staffActive] = await Promise.all([
      query<{ count: string }>(`SELECT COUNT(*) FROM daily_records WHERE home_id=$1 AND record_date BETWEEN $2 AND $3`, [homeId, from, to]),
      query<{ count: string }>(`SELECT COUNT(*) FROM records_incidents ri JOIN daily_records dr ON dr.id=ri.daily_record_id WHERE dr.home_id=$1 AND dr.record_date BETWEEN $2 AND $3`, [homeId, from, to]),
      query<{ count: string }>(`SELECT COUNT(*) FROM su_daily_fluid_totals ft JOIN service_users su ON su.id = ft.su_id WHERE su.home_id=$1 AND ft.record_date BETWEEN $2 AND $3 AND ft.below_threshold=true`, [homeId, from, to]),
      query<{ count: string; overdue: string }>(`SELECT COUNT(*) as count, COUNT(CASE WHEN next_review_date < CURRENT_DATE THEN 1 END) as overdue FROM care_plans WHERE home_id=$1 AND is_active IS NOT FALSE`, [homeId]),
      query<{ count: string }>(`SELECT COUNT(DISTINCT staff_id) FROM staff_clock_events WHERE home_id=$1 AND DATE(event_time) BETWEEN $2 AND $3`, [homeId, from, to]),
    ]);

    res.json({
      success: true,
      data: {
        period: { from, to, month },
        totalRecords: parseInt(totalRecords[0]?.count || '0'),
        incidents: parseInt(incidents[0]?.count || '0'),
        fluidBelowThreshold: parseInt(fluidBelow[0]?.count || '0'),
        carePlansTotal: parseInt((carePlans[0] as any)?.count || '0'),
        carePlansOverdue: parseInt((carePlans[0] as any)?.overdue || '0'),
        staffActive: parseInt(staffActive[0]?.count || '0'),
      }
    } as ApiResponse);
  } catch (err) { next(err); }
});


// MAR report
router.get('/mar-report', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    // home_id is a UUID — an empty/malformed value (e.g. a page that never
    // resolved a home) used to reach the query and throw a cast error, which
    // surfaced as a generic failed/blank report instead of a clear message.
    if (!homeId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(homeId)) {
      res.status(400).json({ success: false, error: 'No service selected — pick a service and run the report again.' } as ApiResponse);
      return;
    }
    const { from, to } = req.query as Record<string, string>;
    const rows = await query(
      `SELECT mr.id, mr.su_id, mr.home_id,
              m.medication_name, m.dose, m.route,
              mr.record_date, mr.given, mr.refused, mr.refused_reason,
              mr.notes, mr.scheduled_time, mr.mar_code,
              su.first_name || ' ' || su.last_name as su_name,
              s.first_name || ' ' || s.last_name as given_by_name
       FROM mar_records mr
       LEFT JOIN su_medications m ON m.id = mr.medication_id
       JOIN service_users su ON su.id = mr.su_id
       LEFT JOIN staff s ON s.id = mr.given_by
       WHERE mr.home_id = $1 AND mr.record_date BETWEEN $2 AND $3
       ORDER BY mr.record_date DESC, su_name`,
      [homeId, from || ukDateStr(), to || ukDateStr()]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// Medication stock report — home-wide, or filtered to a single resident (suId)
router.get('/medication-stock', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const { suId, from, to } = req.query as Record<string, string>;

    // Audit trail: every stock movement (received/administered/disposed/correction)
    // in the date range, so a manager can check what was added in, how much was
    // administered, and reconcile it against what's physically left.
    let logSql = `SELECT msl.created_at, msl.adjustment_type, msl.quantity_change,
                         msl.quantity_before, msl.quantity_after, msl.notes,
                         ms.medication_name, ms.unit, ms.current_stock,
                         su.first_name || ' ' || su.last_name as su_name,
                         s.first_name || ' ' || s.last_name as adjusted_by_name
                  FROM medication_stock_log msl
                  JOIN medication_stock ms ON ms.id = msl.stock_id
                  JOIN service_users su ON su.id = ms.su_id
                  LEFT JOIN staff s ON s.id = msl.adjusted_by
                  WHERE ms.home_id = $1`;
    const logParams: unknown[] = [homeId];
    if (suId) { logSql += ` AND ms.su_id = $${logParams.length + 1}`; logParams.push(suId); }
    if (from) { logSql += ` AND msl.created_at >= $${logParams.length + 1}`; logParams.push(from); }
    if (to) { logSql += ` AND msl.created_at < $${logParams.length + 1}::date + interval '1 day'`; logParams.push(to); }
    logSql += ' ORDER BY su_name, ms.medication_name, msl.created_at DESC';
    const movements = await query(logSql, logParams);

    // Current snapshot, so "what's left" is visible even for medications with no movement in range.
    let stockSql = `SELECT ms.*, su.first_name || ' ' || su.last_name as su_name,
                      s.first_name || ' ' || s.last_name as last_updated_by_name
               FROM medication_stock ms
               JOIN service_users su ON su.id = ms.su_id
               LEFT JOIN staff s ON s.id = ms.last_updated_by
               WHERE ms.home_id = $1`;
    const stockParams: unknown[] = [homeId];
    if (suId) { stockSql += ` AND ms.su_id = $2`; stockParams.push(suId); }
    stockSql += ' ORDER BY (ms.current_stock <= ms.reorder_level) DESC, su_name, ms.medication_name';
    const currentStock = await query(stockSql, stockParams);

    res.json({ success: true, data: movements, currentStock } as ApiResponse);
  } catch (err) { next(err); }
});

// Calendar / appointments report
router.get('/calendar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const { suId, from, to } = req.query as Record<string, string>;
    const fromDate = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = to || ukDateStr();
    let sql = `SELECT ce.*, su.first_name || ' ' || su.last_name as su_name,
                      s.first_name || ' ' || s.last_name as created_by_name
               FROM calendar_events ce
               LEFT JOIN service_users su ON su.id = ce.su_id
               LEFT JOIN staff s ON s.id = ce.created_by
               WHERE ce.home_id = $1 AND ce.event_date BETWEEN $2 AND $3`;
    const params: unknown[] = [homeId, fromDate, toDate];
    if (suId) { sql += ` AND ce.su_id = $4`; params.push(suId); }
    sql += ' ORDER BY ce.event_date DESC, ce.start_time DESC';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// Medication report
router.get('/medication-report', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const rows = await query(
      `SELECT m.*, su.first_name || ' ' || su.last_name as su_name
       FROM su_medications m JOIN service_users su ON su.id = m.su_id
       WHERE m.home_id = $1 AND m.is_active = true ORDER BY su_name, m.medication_name`,
      [homeId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// Care plan reviews report
router.get('/care-plan-reviews', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const rows = await query(
      `SELECT cp.*, su.first_name || ' ' || su.last_name as su_name,
              CASE WHEN cp.next_review_date < CURRENT_DATE THEN 'overdue'
                   WHEN cp.next_review_date < CURRENT_DATE + interval '7 days' THEN 'due_soon'
                   ELSE 'current' END as review_status
       FROM care_plans cp JOIN service_users su ON su.id = cp.su_id
       WHERE cp.home_id = $1 ORDER BY cp.next_review_date ASC NULLS LAST`,
      [homeId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// ── Management reports ────────────────────────────────────────────
// Each returns flat rows with plain-English column names; the Reports page
// renders them as-is, so the SELECT column order is the on-screen order.
const REPORT_MGMT_ROLES: any[] = ['home_manager', 'group_admin', 'deputy_manager', 'admin', 'director', 'registered_manager', 'service_manager'];
function reportRange(req: Request): { homeId: string; fromDate: string; toDate: string; suId: string | null } {
  const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
  const { from, to, suId } = req.query as Record<string, string>;
  const ok = (d?: string) => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d);
  return {
    homeId,
    fromDate: ok(from) ? from : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    toDate: ok(to) ? to : ukDateStr(),
    suId: suId && /^[0-9a-f-]{36}$/i.test(suId) ? suId : null,
  };
}

// Care plan / risk assessment / MAR review dates for every live service user in one grid.
router.get('/careplan-review-matrix', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeId, suId } = reportRange(req);
    const rows = await query(
      `SELECT service_user,
              to_char(cp_last, 'DD Mon YYYY') AS care_plan_last_reviewed,
              to_char(cp_next, 'DD Mon YYYY') AS care_plan_next_due,
              to_char(ra_last, 'DD Mon YYYY') AS risk_assessment_last_reviewed,
              to_char(ra_next, 'DD Mon YYYY') AS risk_assessment_next_due,
              to_char(mar_last, 'DD Mon YYYY') AS mar_last_reviewed,
              to_char(mar_next, 'DD Mon YYYY') AS mar_review_next_due,
              CASE WHEN LEAST(cp_next, ra_next, mar_next) < CURRENT_DATE THEN 'Overdue'
                   WHEN LEAST(cp_next, ra_next, mar_next) < CURRENT_DATE + 14 THEN 'Due within 14 days'
                   WHEN cp_next IS NULL AND ra_next IS NULL AND mar_next IS NULL THEN 'No review dates set'
                   ELSE 'Up to date' END AS status
       FROM (
         SELECT su.first_name || ' ' || su.last_name AS service_user,
           (SELECT MAX(cp.last_review_date) FROM care_plans cp WHERE cp.su_id = su.id) AS cp_last,
           (SELECT MIN(cp.next_review_date) FROM care_plans cp WHERE cp.su_id = su.id) AS cp_next,
           (SELECT MAX(ra.last_review_date) FROM risk_assessments ra WHERE ra.su_id = su.id) AS ra_last,
           (SELECT MIN(ra.next_review_date) FROM risk_assessments ra WHERE ra.su_id = su.id) AS ra_next,
           (SELECT MAX(a.assessment_date) FROM assessments a WHERE a.subject_id = su.id AND a.template_key = 'mar_review') AS mar_last,
           (SELECT MAX(a.next_review_date) FROM assessments a WHERE a.subject_id = su.id AND a.template_key = 'mar_review') AS mar_next
         FROM service_users su
         WHERE su.home_id = $1 AND su.status = 'live' AND ($2::uuid IS NULL OR su.id = $2::uuid)
       ) x ORDER BY service_user`,
      [homeId, suId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// Hours each staff member was rota'd for in the period, and how many of those shifts they clocked in to.
router.get('/delivered-hours', requireRole(...REPORT_MGMT_ROLES), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeId, fromDate, toDate } = reportRange(req);
    const rows = await query(
      `SELECT s.first_name || ' ' || s.last_name AS staff,
              COUNT(*) AS shifts,
              ROUND(SUM(EXTRACT(EPOCH FROM (CASE WHEN sh.end_time <= sh.start_time
                    THEN sh.end_time - sh.start_time + interval '24 hours'
                    ELSE sh.end_time - sh.start_time END)) / 3600)::numeric, 2) AS rota_hours,
              COUNT(*) FILTER (WHERE EXISTS (
                SELECT 1 FROM staff_clock_events ce WHERE ce.staff_id = sh.staff_id AND ce.event_type = 'clock_in'
                  AND (ce.event_time AT TIME ZONE 'Europe/London')::date = sh.shift_date)) AS shifts_clocked_in,
              COUNT(*) FILTER (WHERE sh.shift_date < CURRENT_DATE AND NOT EXISTS (
                SELECT 1 FROM staff_clock_events ce WHERE ce.staff_id = sh.staff_id AND ce.event_type = 'clock_in'
                  AND (ce.event_time AT TIME ZONE 'Europe/London')::date = sh.shift_date)) AS shifts_not_clocked_in,
              s.contracted_hours AS contracted_hours_per_week
       FROM staff_shifts sh JOIN staff s ON s.id = sh.staff_id
       WHERE sh.home_id = $1 AND sh.shift_date BETWEEN $2::date AND $3::date AND sh.status <> 'cancelled'
       GROUP BY s.id, s.first_name, s.last_name, s.contracted_hours
       ORDER BY 1`,
      [homeId, fromDate, toDate]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// Shifts cancelled in the period, with the recorded reason.
router.get('/cancelled-shifts', requireRole(...REPORT_MGMT_ROLES), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeId, fromDate, toDate } = reportRange(req);
    const rows = await query(
      `SELECT to_char(sh.shift_date, 'Dy DD Mon YYYY') AS shift_date,
              to_char(sh.start_time, 'HH24:MI') || ' - ' || to_char(sh.end_time, 'HH24:MI') AS shift_time,
              ROUND((EXTRACT(EPOCH FROM (CASE WHEN sh.end_time <= sh.start_time
                    THEN sh.end_time - sh.start_time + interval '24 hours'
                    ELSE sh.end_time - sh.start_time END)) / 3600)::numeric, 2) AS total_hours,
              COALESCE(sh.label, su.first_name || ' ' || su.last_name, '—') AS service,
              COALESCE(s.first_name || ' ' || s.last_name, 'Unfilled') AS staff,
              COALESCE(sh.cancel_reason, 'No reason recorded') AS reason,
              CASE WHEN sh.cancel_billable IS TRUE THEN 'Yes' WHEN sh.cancel_billable IS FALSE THEN 'No' ELSE '—' END AS billable,
              COALESCE(cb.first_name || ' ' || cb.last_name, '—') AS cancelled_by,
              to_char(sh.cancelled_at AT TIME ZONE 'Europe/London', 'DD Mon YYYY HH24:MI') AS cancelled_on
       FROM staff_shifts sh
       LEFT JOIN staff s ON s.id = sh.staff_id
       LEFT JOIN staff cb ON cb.id = sh.cancelled_by
       LEFT JOIN service_users su ON su.id = sh.su_id
       WHERE sh.home_id = $1 AND sh.status = 'cancelled' AND sh.shift_date BETWEEN $2::date AND $3::date
       ORDER BY sh.shift_date DESC, sh.start_time`,
      [homeId, fromDate, toDate]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// Bookings a manager confirmed even though the staff member was already on another shift.
router.get('/clash-bookings', requireRole(...REPORT_MGMT_ROLES), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeId, fromDate, toDate } = reportRange(req);
    const rows = await query(
      `SELECT to_char(c.created_at AT TIME ZONE 'Europe/London', 'DD Mon YYYY HH24:MI') AS booked_at,
              COALESCE(b.first_name || ' ' || b.last_name, '—') AS assigned_by,
              COALESCE(s.first_name || ' ' || s.last_name, '—') AS staff,
              to_char(c.shift_date, 'Dy DD Mon YYYY') || ' ' || c.start_time || ' - ' || c.end_time AS shift,
              c.details AS clashed_with
       FROM shift_clash_log c
       LEFT JOIN staff s ON s.id = c.staff_id
       LEFT JOIN staff b ON b.id = c.assigned_by
       WHERE c.home_id = $1 AND (c.created_at AT TIME ZONE 'Europe/London')::date BETWEEN $2::date AND $3::date
       ORDER BY c.created_at DESC`,
      [homeId, fromDate, toDate]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// Scheduled start vs actual clock-in for every staffed shift in the period.
router.get('/clocked-in-integrity', requireRole(...REPORT_MGMT_ROLES), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeId, fromDate, toDate } = reportRange(req);
    const rows = await query(
      `SELECT to_char(sh.shift_date, 'Dy DD Mon YYYY') AS shift_date,
              to_char(sh.start_time, 'HH24:MI') || ' - ' || to_char(sh.end_time, 'HH24:MI') AS shift_time,
              s.first_name || ' ' || s.last_name AS staff,
              COALESCE(sh.label, su.first_name || ' ' || su.last_name, '—') AS service,
              to_char(ci.t, 'HH24:MI') AS clocked_in,
              to_char(co.t, 'HH24:MI') AS clocked_out,
              CASE WHEN ci.t IS NULL THEN 'Did not clock in'
                   WHEN EXTRACT(EPOCH FROM (ci.t - (sh.shift_date + sh.start_time))) / 60 > 15
                     THEN ROUND(EXTRACT(EPOCH FROM (ci.t - (sh.shift_date + sh.start_time))) / 60)::int || ' min late'
                   ELSE 'On time' END AS result
       FROM staff_shifts sh
       JOIN staff s ON s.id = sh.staff_id
       LEFT JOIN service_users su ON su.id = sh.su_id
       LEFT JOIN LATERAL (SELECT MIN(ce.event_time AT TIME ZONE 'Europe/London') AS t FROM staff_clock_events ce
                          WHERE ce.staff_id = sh.staff_id AND ce.event_type = 'clock_in'
                            AND (ce.event_time AT TIME ZONE 'Europe/London')::date = sh.shift_date) ci ON TRUE
       LEFT JOIN LATERAL (SELECT MAX(ce.event_time AT TIME ZONE 'Europe/London') AS t FROM staff_clock_events ce
                          WHERE ce.staff_id = sh.staff_id AND ce.event_type = 'clock_out'
                            AND (ce.event_time AT TIME ZONE 'Europe/London')::date = sh.shift_date) co ON TRUE
       WHERE sh.home_id = $1 AND sh.shift_date BETWEEN $2::date AND LEAST($3::date, CURRENT_DATE)
         AND sh.status <> 'cancelled'
       ORDER BY sh.shift_date DESC, sh.start_time, staff`,
      [homeId, fromDate, toDate]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// Per service user: what was recorded in the period (incidents, falls, bowel, visits, PRN...).
router.get('/weekly-summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeId, fromDate, toDate, suId } = reportRange(req);
    const rows = await query(
      `SELECT su.first_name || ' ' || su.last_name AS service_user,
              COUNT(dr.id) AS total_records,
              COUNT(dr.id) FILTER (WHERE dr.record_type = 'incident') AS incidents,
              COUNT(dr.id) FILTER (WHERE dr.record_type = 'incident' AND ri.incident_type ILIKE '%fall%') AS falls,
              COUNT(dr.id) FILTER (WHERE dr.record_type = 'incident' AND ri.incident_type ILIKE '%seizure%') AS seizures,
              COUNT(dr.id) FILTER (WHERE dr.record_type IN ('bowel', 'bowel_movement')) AS bowel_records,
              COUNT(dr.id) FILTER (WHERE dr.record_type = 'visit') AS visits,
              COUNT(dr.id) FILTER (WHERE dr.record_type = 'prn_medication') AS prn_given
       FROM service_users su
       LEFT JOIN daily_records dr ON dr.su_id = su.id AND dr.record_date BETWEEN $2::date AND $3::date
       LEFT JOIN records_incidents ri ON ri.daily_record_id = dr.id
       WHERE su.home_id = $1 AND su.status = 'live' AND ($4::uuid IS NULL OR su.id = $4::uuid)
       GROUP BY su.id, su.first_name, su.last_name
       ORDER BY 1`,
      [homeId, fromDate, toDate, suId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// Average observations per service user over the period.
router.get('/wellbeing', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeId, fromDate, toDate, suId } = reportRange(req);
    const rows = await query(
      `SELECT su.first_name || ' ' || su.last_name AS service_user,
              EXTRACT(YEAR FROM age(su.date_of_birth))::int AS age,
              ROUND(AVG(v.weight_kg)::numeric, 1) AS average_weight_kg,
              ROUND(AVG(v.systolic)::numeric, 0) || '/' || ROUND(AVG(v.diastolic)::numeric, 0) AS average_blood_pressure,
              ROUND(AVG(v.pulse)::numeric, 0) AS average_pulse,
              ROUND(AVG(v.temp_celsius)::numeric, 1) AS average_temperature,
              ROUND(AVG(v.spo2_percent)::numeric, 0) AS average_oxygen_percent,
              COUNT(v.id) AS readings
       FROM service_users su
       LEFT JOIN daily_records dr ON dr.su_id = su.id AND dr.record_date BETWEEN $2::date AND $3::date
       LEFT JOIN records_vitals v ON v.daily_record_id = dr.id
       WHERE su.home_id = $1 AND su.status = 'live' AND ($4::uuid IS NULL OR su.id = $4::uuid)
       GROUP BY su.id, su.first_name, su.last_name, su.date_of_birth
       ORDER BY 1`,
      [homeId, fromDate, toDate, suId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// Policies sent to staff for signature that are still unsigned.
router.get('/overdue-signatures', requireRole(...REPORT_MGMT_ROLES), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeId } = reportRange(req);
    const rows = await query(
      // One row per staff member. Listing every unsigned policy separately gave
      // thousands of rows (each staff member x each policy), which no one can act on.
      `SELECT s.first_name || ' ' || s.last_name AS staff,
              REPLACE(s.role::text, '_', ' ') AS job_role,
              COUNT(*) AS policies_not_signed,
              (SELECT COUNT(*) FROM policy_sign_offs d WHERE d.staff_id = s.id AND d.signed_at IS NOT NULL) AS policies_signed,
              COALESCE(to_char(MIN(pso.sent_at) AT TIME ZONE 'Europe/London', 'DD Mon YYYY'), '—') AS oldest_sent_on,
              CASE WHEN MIN(pso.sent_at) IS NULL THEN '—'
                   ELSE (CURRENT_DATE - (MIN(pso.sent_at) AT TIME ZONE 'Europe/London')::date)::text || ' days' END AS longest_waiting,
              LEFT(string_agg(p.title, '; ' ORDER BY p.title), 300) AS documents
       FROM policy_sign_offs pso
       JOIN staff s ON s.id = pso.staff_id
       JOIN policies p ON p.id = pso.policy_id
       WHERE pso.signed_at IS NULL AND s.home_id = $1 AND s.is_active = TRUE
       GROUP BY s.id, s.first_name, s.last_name, s.role
       ORDER BY COUNT(*) DESC, staff`,
      [homeId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// One row per active staff member: how many staff assessments are on file and when the next is due.
router.get('/assessment-matrix', requireRole(...REPORT_MGMT_ROLES), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeId } = reportRange(req);
    const rows = await query(
      `SELECT s.first_name || ' ' || s.last_name AS staff,
              REPLACE(s.role::text, '_', ' ') AS job_role,
              COUNT(a.id) AS assessments_on_file,
              COALESCE(to_char(MAX(a.assessment_date), 'DD Mon YYYY'), 'None') AS last_assessment,
              COALESCE(to_char(MIN(a.next_review_date) FILTER (WHERE a.next_review_date >= CURRENT_DATE), 'DD Mon YYYY'), '—') AS next_review_due,
              COUNT(a.id) FILTER (WHERE a.next_review_date < CURRENT_DATE) AS reviews_overdue,
              COUNT(a.id) FILTER (WHERE a.staff_signature IS NULL) AS awaiting_staff_signature
       FROM staff s
       LEFT JOIN assessments a ON a.subject_id = s.id AND a.category = 'staff'
       WHERE s.home_id = $1 AND s.is_active = TRUE
       GROUP BY s.id, s.first_name, s.last_name, s.role
       ORDER BY 1`,
      [homeId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// Where staff were when they clocked in/out, against the permitted distance.
router.get('/clock-in-locations', requireRole(...REPORT_MGMT_ROLES), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeId, fromDate, toDate } = reportRange(req);
    const rows = await query(
      `SELECT to_char(ce.event_time AT TIME ZONE 'Europe/London', 'Dy DD Mon YYYY') AS event_date,
              to_char(ce.event_time AT TIME ZONE 'Europe/London', 'HH24:MI') AS event_time,
              s.first_name || ' ' || s.last_name AS staff,
              REPLACE(ce.event_type, '_', ' ') AS event,
              CASE WHEN ce.distance_metres IS NULL THEN 'No location' ELSE ce.distance_metres::text || ' m' END AS distance_from_service,
              CASE WHEN ce.geofence_passed IS FALSE THEN 'Outside permitted area'
                   WHEN ce.geofence_passed IS TRUE THEN 'Within permitted area' ELSE '—' END AS location_check
       FROM staff_clock_events ce JOIN staff s ON s.id = ce.staff_id
       WHERE ce.home_id = $1 AND (ce.event_time AT TIME ZONE 'Europe/London')::date BETWEEN $2::date AND $3::date
       ORDER BY (ce.geofence_passed IS FALSE) DESC, ce.event_time DESC`,
      [homeId, fromDate, toDate]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// Tasks that were due in the period and never completed.
router.get('/tasks-not-completed', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeId, fromDate, toDate, suId } = reportRange(req);
    const rows = await query(
      `SELECT to_char(t.task_date, 'Dy DD Mon YYYY') AS task_date,
              COALESCE(t.due_time, '—') AS due_time,
              t.title AS task,
              COALESCE(t.category, '—') AS category,
              COALESCE(su.first_name || ' ' || su.last_name, '—') AS service_user,
              t.status
       FROM tasks t LEFT JOIN service_users su ON su.id = t.su_id
       WHERE t.home_id = $1 AND t.task_date BETWEEN $2::date AND LEAST($3::date, CURRENT_DATE)
         AND t.status <> 'completed' AND ($4::uuid IS NULL OR t.su_id = $4::uuid)
       ORDER BY t.task_date DESC, t.due_time`,
      [homeId, fromDate, toDate, suId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// One row per active staff member: which compliance documents are on file.
router.get('/documents-matrix', requireRole(...REPORT_MGMT_ROLES), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeId } = reportRange(req);
    const rows = await query(
      `SELECT s.first_name || ' ' || s.last_name AS staff,
              REPLACE(s.role::text, '_', ' ') AS job_role,
              s.contracted_hours AS contracted_hours,
              COALESCE((SELECT to_char(MAX(d.issue_date), 'DD Mon YYYY') FROM staff_dbs d WHERE d.staff_id = s.id), 'Missing') AS dbs_issued,
              COALESCE((SELECT to_char(MAX(d.expiry_date), 'DD Mon YYYY') FROM staff_dbs d WHERE d.staff_id = s.id), '—') AS dbs_expires,
              CASE WHEN EXISTS (SELECT 1 FROM staff_right_to_work r WHERE r.staff_id = s.id) THEN 'On file' ELSE 'Missing' END AS right_to_work,
              (SELECT COUNT(*) FROM staff_references r WHERE r.staff_id = s.id) AS references_on_file,
              (SELECT COUNT(*) FROM staff_training t WHERE t.staff_id = s.id) AS training_records
       FROM staff s
       WHERE s.home_id = $1 AND s.is_active = TRUE
       ORDER BY 1`,
      [homeId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// Safeguarding report
router.get('/safeguarding', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const { from, to } = req.query as Record<string, string>;
    const rows = await query(
      `SELECT sg.*, su.first_name || ' ' || su.last_name as su_name
       FROM safeguarding_concerns sg
       JOIN service_users su ON su.id = sg.su_id
       WHERE sg.home_id = $1
       ${from ? "AND sg.incident_date >= $2 AND sg.incident_date <= $3" : ""}
       ORDER BY sg.incident_date DESC`,
      from ? [homeId, from, to || ukDateStr()] : [homeId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/reports/handover-notes?homeId=&shiftDate=&shiftType=
router.get('/handover-notes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const { shiftDate, shiftType } = req.query as Record<string, string>;
    if (!shiftDate || !shiftType) { res.json({ success: true, data: [] } as ApiResponse); return; }
    const rows = await query(
      `SELECT hn.*, su.first_name || ' ' || su.last_name as su_name
       FROM handover_resident_notes hn
       JOIN service_users su ON su.id = hn.su_id
       WHERE hn.home_id = $1 AND hn.shift_date = $2 AND hn.shift_type = $3`,
      [homeId, shiftDate, shiftType]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/reports/handover-notes/recent?homeId=&days=7
// Returns all handover notes from the last N days, grouped by date+shift+staff
router.get('/handover-notes/recent', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const days = Math.min(parseInt(req.query.days as string) || 7, 30);
    const rows = await query(
      `SELECT hn.id, hn.su_id, hn.shift_date, hn.shift_type, hn.notes, hn.updated_at, hn.updated_by,
              su.first_name || ' ' || su.last_name as su_name,
              s.first_name || ' ' || s.last_name as staff_name
       FROM handover_resident_notes hn
       JOIN service_users su ON su.id = hn.su_id
       LEFT JOIN staff s ON s.id = hn.updated_by
       WHERE hn.home_id = $1
         AND hn.shift_date >= (CURRENT_DATE - INTERVAL '1 day' * $2)
         AND COALESCE(NULLIF(TRIM(hn.notes), ''), NULL) IS NOT NULL
       ORDER BY hn.shift_date DESC,
                CASE hn.shift_type WHEN 'night' THEN 1 WHEN 'late' THEN 2 WHEN 'early' THEN 3 ELSE 4 END,
                hn.updated_at DESC`,
      [homeId, days]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// PUT /api/reports/handover-notes/:suId — upsert note for a specific resident
router.put('/handover-notes/:suId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.body.homeId as string) || fromToken(req, 'homeId');
    const staffId = fromToken(req, 'staffId');
    const { suId } = req.params;
    const { shiftDate, shiftType, notes } = req.body;
    if (!shiftDate || !shiftType) { res.status(400).json({ success: false, error: 'shiftDate and shiftType required' }); return; }
    const rows = await query(
      `INSERT INTO handover_resident_notes (home_id, su_id, shift_date, shift_type, notes, created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$6)
       ON CONFLICT (home_id, su_id, shift_date, shift_type)
       DO UPDATE SET notes = $5, updated_by = $6, updated_at = NOW()
       RETURNING *`,
      [homeId, suId, shiftDate, shiftType, notes || null, staffId]
    );
    res.json({ success: true, data: rows[0] } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/reports/monthly-reviews-history — history of all care reviews grouped by month
router.get('/monthly-reviews-history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const rows = await query(
      `SELECT cr.*,
              su.first_name || ' ' || su.last_name AS su_name,
              s.first_name || ' ' || s.last_name AS reviewed_by_name,
              TO_CHAR(DATE_TRUNC('month', cr.review_date), 'Mon YYYY') AS review_month,
              DATE_TRUNC('month', cr.review_date) AS month_start
       FROM su_reviews cr
       JOIN service_users su ON su.id = cr.su_id
       LEFT JOIN staff s ON s.id = cr.conducted_by
       WHERE cr.home_id = $1
       ORDER BY cr.review_date DESC`,
      [homeId]
    );
    // Group by month
    const byMonth: Record<string, any> = {};
    for (const r of rows as any[]) {
      const key = r.review_month;
      if (!byMonth[key]) byMonth[key] = { month: key, monthStart: r.month_start, reviews: [] };
      byMonth[key].reviews.push(r);
    }
    const months = Object.values(byMonth).sort((a: any, b: any) =>
      new Date(b.monthStart).getTime() - new Date(a.monthStart).getTime()
    );
    res.json({ success: true, data: { months, total: (rows as any[]).length } } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/reports/incident-analysis — AI-powered incident analysis using GROQ
router.get('/incident-analysis', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const { from, to } = req.query as Record<string, string>;
    const fromDate = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = to || ukDateStr();

    const rows = await query(
      `SELECT ri.incident_type, ri.description, ri.body_map_data, ri.witnesses,
              ri.immediate_action, ri.manager_reviewed, dr.record_date,
              su.first_name || ' ' || su.last_name as su_name
       FROM records_incidents ri
       JOIN daily_records dr ON dr.id = ri.daily_record_id
       JOIN service_users su ON su.id = dr.su_id
       WHERE dr.home_id = $1 AND dr.record_date BETWEEN $2 AND $3
       ORDER BY dr.record_date DESC LIMIT 100`,
      [homeId, fromDate, toDate]
    );

    if (rows.length === 0) {
      res.json({ success: true, data: { analysis: 'No incidents found in this date range.', incidents: [] } });
      return;
    }

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      res.json({ success: true, data: { analysis: 'AI analysis unavailable (API key not configured). Found ' + rows.length + ' incident(s) in this period.', incidents: rows } });
      return;
    }

    const summary = rows.map((r: any, i: number) =>
      `${i + 1}. ${r.record_date} — ${r.su_name}: ${r.incident_type || 'Incident'} — ${r.description || 'No description'}`
    ).join('\n');

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [
          { role: 'system', content: 'You are a care home quality assurance manager. Analyse incident reports and provide actionable insights. Be concise, professional, and focus on patterns, risk factors, and recommendations. Format your response with clear sections: Summary, Key Patterns, Risk Factors, and Recommendations.' },
          { role: 'user', content: `Analyse these ${rows.length} incidents from ${fromDate} to ${toDate}:\n\n${summary}\n\nProvide a professional analysis with actionable recommendations for care quality improvement.` }
        ],
        max_tokens: 1500,
        temperature: 0.3,
        reasoning_effort: 'low'
      })
    });

    const groqData = await groqRes.json() as any;
    const analysis = groqData?.choices?.[0]?.message?.content || 'Analysis could not be generated.';

    res.json({ success: true, data: { analysis, incidents: rows, count: rows.length, period: { from: fromDate, to: toDate } } });
  } catch (err) { next(err); }
});

export default router;
