import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { query } from '../config/database';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';

const router = Router();
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
    const toDate = to || new Date().toISOString().split('T')[0];

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
    sql += ' ORDER BY dr.recorded_at DESC LIMIT 500';

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
    const toDate = to || new Date().toISOString().split('T')[0];

    const rows = await query(
      `SELECT ft.*, su.first_name || ' ' || su.last_name as su_name, su.min_fluid_ml
       FROM su_daily_fluid_totals ft JOIN service_users su ON su.id = ft.su_id
       WHERE ft.home_id = $1 AND ft.record_date BETWEEN $2 AND $3
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
    const toDate = to || new Date().toISOString().split('T')[0];

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
       WHERE cp.home_id = $1 AND cp.is_active = true
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
    const toDate = to || new Date().toISOString().split('T')[0];
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
router.get('/training-compliance', async (req: Request, res: Response, next: NextFunction) => {
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
      query<{ count: string }>(`SELECT COUNT(*) FROM su_daily_fluid_totals WHERE home_id=$1 AND record_date BETWEEN $2 AND $3 AND below_threshold=true`, [homeId, from, to]),
      query<{ count: string; overdue: string }>(`SELECT COUNT(*) as count, COUNT(CASE WHEN next_review_date < CURRENT_DATE THEN 1 END) as overdue FROM care_plans WHERE home_id=$1 AND is_active=true`, [homeId]),
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

export default router;
