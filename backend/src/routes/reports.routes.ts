import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { query } from '../config/database';
import { ApiResponse } from '../types';
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
    const toDate = to || new Date().toISOString().split('T')[0];

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
      [homeId, from || new Date().toISOString().split('T')[0], to || new Date().toISOString().split('T')[0]]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// Medication stock report — home-wide, or filtered to a single resident (suId)
router.get('/medication-stock', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const { suId } = req.query as Record<string, string>;
    let sql = `SELECT ms.*, su.first_name || ' ' || su.last_name as su_name,
                      s.first_name || ' ' || s.last_name as last_updated_by_name
               FROM medication_stock ms
               JOIN service_users su ON su.id = ms.su_id
               LEFT JOIN staff s ON s.id = ms.last_updated_by
               WHERE ms.home_id = $1`;
    const params: unknown[] = [homeId];
    if (suId) { sql += ` AND ms.su_id = $2`; params.push(suId); }
    sql += ' ORDER BY (ms.current_stock <= ms.reorder_level) DESC, su_name, ms.medication_name';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// Calendar / appointments report
router.get('/calendar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const { suId, from, to } = req.query as Record<string, string>;
    const fromDate = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = to || new Date().toISOString().split('T')[0];
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
      from ? [homeId, from, to || new Date().toISOString().split('T')[0]] : [homeId]
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
    const toDate = to || new Date().toISOString().split('T')[0];

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
        model: 'llama3-8b-8192',
        messages: [
          { role: 'system', content: 'You are a care home quality assurance manager. Analyse incident reports and provide actionable insights. Be concise, professional, and focus on patterns, risk factors, and recommendations. Format your response with clear sections: Summary, Key Patterns, Risk Factors, and Recommendations.' },
          { role: 'user', content: `Analyse these ${rows.length} incidents from ${fromDate} to ${toDate}:\n\n${summary}\n\nProvide a professional analysis with actionable recommendations for care quality improvement.` }
        ],
        max_tokens: 1000,
        temperature: 0.3
      })
    });

    const groqData = await groqRes.json() as any;
    const analysis = groqData?.choices?.[0]?.message?.content || 'Analysis could not be generated.';

    res.json({ success: true, data: { analysis, incidents: rows, count: rows.length, period: { from: fromDate, to: toDate } } });
  } catch (err) { next(err); }
});

export default router;
