import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { query } from '../config/database';
import { ApiResponse } from '../types';
import { ukDateStr } from '../utils/ukTime';
import { getTimeSlots } from '../utils/medicationDue';
import jwt from 'jsonwebtoken';

const router = Router();

router.use(authenticate);

function fromToken(req: Request, field: string): string {
  const token = req.headers.authorization?.substring(7);
  if (token) {
    const d = jwt.decode(token) as any;
    return (req.staff as any)?.[field] || d?.[field] || '';
  }
  return (req.staff as any)?.[field] || '';
}

const REPORT_MGMT_ROLES: any[] = [
  'super_admin',
  'group_admin',
  'home_manager',
  'deputy_manager',
  'admin',
  'director',
  'registered_manager',
  'service_manager',
  'recruitment_admin',
  'auditor',
];

function daysAgoUk(days: number): string {
  return ukDateStr(new Date(Date.now() - days * 24 * 60 * 60 * 1000));
}

function reportRange(req: Request, defaultDays = 30): { homeId: string; fromDate: string; toDate: string; suId: string | null } {
  const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
  const { from, to, suId } = req.query as Record<string, string>;
  const ok = (d?: string) => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d);
  return {
    homeId,
    fromDate: ok(from) ? from : daysAgoUk(defaultDays),
    toDate: ok(to) ? to : ukDateStr(),
    suId: suId && /^[0-9a-f-]{36}$/i.test(suId) ? suId : null,
  };
}

// Parse structured medication entries written by MedicationCountForm into daily_records.notes
function parseMedicationCountNotes(notes: string | null | undefined): {
  staffOnDuty: string | null;
  shiftWindow: string | null;
  items: Array<{
    medicationName: string;
    strength: string;
    quantityAtHand: string;
    quantityAdministered: string;
    quantityRemaining: string;
  }>;
} {
  if (!notes) return { staffOnDuty: null, shiftWindow: null, items: [] };
  const text = String(notes);
  const staffMatch = text.match(/Staff on Duty:\s*([^\n]+)/i);
  const timeMatch = text.match(/Time:\s*([^\n]+)/i);
  const blocks = text.split(/─{2,}|\n(?=MEDICATION NAME:)/i);
  const items: Array<{
    medicationName: string;
    strength: string;
    quantityAtHand: string;
    quantityAdministered: string;
    quantityRemaining: string;
  }> = [];

  for (const b of blocks) {
    const nameM = b.match(/MEDICATION NAME:\s*([^\n]+)/i);
    if (!nameM) continue;
    const strM = b.match(/STRENGTH:\s*([^\n]+)/i);
    const handM = b.match(/QUANTITY AT HAND:\s*([^\n]+)/i);
    const admM = b.match(/QUANTITY ADMINISTERED:\s*([^\n]+)/i);
    const remM = b.match(/QUANTITY REMAINING:\s*([^\n]+)/i);
    items.push({
      medicationName: nameM[1].trim(),
      strength: strM ? strM[1].trim() : '—',
      quantityAtHand: handM ? handM[1].trim() : '—',
      quantityAdministered: admM ? admM[1].trim() : '—',
      quantityRemaining: remM ? remM[1].trim() : '—',
    });
  }

  return {
    staffOnDuty: staffMatch ? staffMatch[1].trim() : null,
    shiftWindow: timeMatch ? timeMatch[1].trim() : null,
    items,
  };
}

// Build a guaranteed rich clinical summary when AI output is unavailable/truncated
function buildDeterministicIncidentAnalysis(rows: any[], fromDate: string, toDate: string): string {
  const byType: Record<string, number> = {};
  const byResident: Record<string, number> = {};
  const byLocation: Record<string, number> = {};
  let withInjury = 0;
  let medicalNeeded = 0;
  let unreviewed = 0;

  for (const r of rows) {
    const t = String(r.incident_type || 'other').replace(/_/g, ' ');
    byType[t] = (byType[t] || 0) + 1;
    const su = r.su_name || 'Unknown resident';
    byResident[su] = (byResident[su] || 0) + 1;
    const loc = r.location || 'Facility / Unspecified';
    byLocation[loc] = (byLocation[loc] || 0) + 1;
    if (r.injuries) withInjury++;
    if (r.medical_needed) medicalNeeded++;
    if (!r.manager_reviewed) unreviewed++;
  }

  const topTypes = Object.entries(byType)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} (${v})`)
    .join(', ');
  const topResidents = Object.entries(byResident)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} (${v})`)
    .join(', ');
  const topLocations = Object.entries(byLocation)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} (${v})`)
    .join(', ');

  return [
    `**Summary**\nBetween ${fromDate} and ${toDate}, ${rows.length} incident${rows.length === 1 ? '' : 's'} were recorded across ${Object.keys(byResident).length} service user${Object.keys(byResident).length === 1 ? '' : 's'}. Categories recorded: ${topTypes}.`,
    `**Key Patterns**\nService users affected: ${topResidents}.\nLocations recorded: ${topLocations}.\nInjuries recorded: ${withInjury} of ${rows.length} incident(s); medical intervention required in ${medicalNeeded} incident(s).`,
    `**Risk Factors**\n${unreviewed > 0 ? `${unreviewed} incident(s) still require formal management sign-off review.` : 'All incidents in this period have been reviewed by management.'} Repeat categories (${topTypes}) warrant ongoing care plan and risk assessment alignment.`,
    `**Recommendations**\n1. Review care plans and risk assessments for ${topResidents} following each incident.\n2. Discuss immediate actions and de-escalation lessons during shift handovers and team supervision.\n3. Ensure MAR charts, body maps, and external notifications (GP / Social Worker / Safeguarding where applicable) remain fully documented.`,
  ].join('\n\n');
}

// ── 1. GET /api/reports/daily-records (includes Comfort Checks & all 32 record types) ──
router.get('/daily-records', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const { suId, from, to, recordType } = req.query as Record<string, string>;
    const fromDate = from || daysAgoUk(7);
    const toDate = to || ukDateStr();

    let sql = `SELECT dr.id, dr.home_id, dr.su_id, dr.staff_id, dr.record_type,
                      dr.record_date, dr.recorded_at,
                      COALESCE(
                        NULLIF(TRIM(dr.notes), ''),
                        NULLIF(TRIM(rwc.su_status), ''),
                        NULLIF(TRIM(rwc.environment_notes), ''),
                        NULLIF(TRIM(rfd.notes), ''),
                        NULLIF(TRIM(rfd.description), ''),
                        NULLIF(TRIM(rb.consistency_notes), ''),
                        INITCAP(REPLACE(dr.record_type, '_', ' ')) || ' completed — resident safe and settled'
                      ) AS notes,
                      dr.reviewed_at, dr.reviewed_by, dr.review_notes,
                      (dr.reviewed_at IS NOT NULL) AS is_reviewed,
                      su.first_name || ' ' || su.last_name AS su_name,
                      s.first_name || ' ' || s.last_name AS staff_name,
                      s.first_name || ' ' || s.last_name AS recorded_by_name,
                      rv_staff.first_name || ' ' || rv_staff.last_name AS reviewed_by_name,
                      rfd.meal_type, rfd.description AS food_description, rfd.amount_eaten,
                      rfd.volume_ml AS amount_ml, rfd.entry_type AS fluid_type,
                      rv.systolic, rv.diastolic, rv.pulse, rv.temp_celsius,
                      rv.spo2_percent, rv.supplemental_o2, rv.weight_kg, rv.bmi,
                      rb.bristol_type, rb.consistency_notes,
                      rwc.check_type, rwc.su_status, rwc.environment_ok,
                      rwc.environment_notes, rwc.action_taken,
                      COALESCE(
                        NULLIF(TRIM(dr.notes), ''),
                        NULLIF(TRIM(rwc.su_status), ''),
                        NULLIF(TRIM(rwc.environment_notes), ''),
                        NULLIF(TRIM(rfd.notes), ''),
                        NULLIF(TRIM(rfd.description), ''),
                        NULLIF(TRIM(rb.consistency_notes), ''),
                        INITCAP(REPLACE(dr.record_type, '_', ' ')) || ' completed'
                      ) AS details_summary,
                      COALESCE(NULLIF(TRIM(dr.notes), ''), INITCAP(REPLACE(dr.record_type, '_', ' ')) || ' completed') AS general_notes
               FROM daily_records dr
               JOIN service_users su ON su.id = dr.su_id
               LEFT JOIN staff s ON s.id = dr.staff_id
               LEFT JOIN staff rv_staff ON rv_staff.id = dr.reviewed_by
               LEFT JOIN records_food_drink rfd ON rfd.daily_record_id = dr.id
               LEFT JOIN records_vitals rv ON rv.daily_record_id = dr.id
               LEFT JOIN records_bowel rb ON rb.daily_record_id = dr.id
               LEFT JOIN records_welfare_check rwc ON rwc.daily_record_id = dr.id
               WHERE dr.home_id = $1 AND dr.record_date BETWEEN $2::date AND $3::date`;
    const params: unknown[] = [homeId, fromDate, toDate];
    let idx = 4;
    if (suId) { sql += ` AND dr.su_id = $${idx++}`; params.push(suId); }
    if (recordType) { sql += ` AND dr.record_type = $${idx++}`; params.push(recordType); }
    sql += ' ORDER BY COALESCE(dr.recorded_at, dr.record_date::timestamptz) DESC, dr.id DESC LIMIT 1000';

    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// ── 2. GET /api/reports/fluid ──
router.get('/fluid', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeId, fromDate, toDate, suId } = reportRange(req, 7);
    const rows = await query(
      `SELECT ft.record_date, ft.total_ml, ft.below_threshold,
              su.first_name || ' ' || su.last_name AS su_name, su.min_fluid_ml
       FROM su_daily_fluid_totals ft
       JOIN service_users su ON su.id = ft.su_id
       WHERE su.home_id = $1 AND ft.record_date BETWEEN $2::date AND $3::date
         AND ($4::uuid IS NULL OR ft.su_id = $4::uuid)
       ORDER BY ft.record_date DESC, su.last_name`,
      [homeId, fromDate, toDate, suId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// ── 3. GET /api/reports/incidents (Video 6: Service User first, zero raw UUID columns) ──
router.get('/incidents', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeId, fromDate, toDate, suId } = reportRange(req, 30);
    const rows = await query(
      `SELECT ri.id,
              su.first_name || ' ' || su.last_name AS service_user,
              to_char(COALESCE(dr.record_date, (ri.incident_time AT TIME ZONE 'Europe/London')::date), 'DD Mon YYYY') AS date,
              COALESCE(to_char(ri.incident_time AT TIME ZONE 'Europe/London', 'HH24:MI'), '—') AS time,
              INITCAP(REPLACE(COALESCE(ri.incident_type, 'incident'), '_', ' ')) AS incident_type,
              COALESCE(NULLIF(TRIM(ri.location), ''), '—') AS location,
              COALESCE(NULLIF(TRIM(ri.description), ''), '—') AS description,
              COALESCE(NULLIF(TRIM(ri.immediate_action), ''), '—') AS immediate_action,
              CASE WHEN ri.injuries IS TRUE THEN COALESCE(NULLIF(TRIM(ri.injury_details), ''), 'Yes') ELSE 'No' END AS injuries,
              CASE WHEN ri.medical_needed IS TRUE THEN COALESCE(NULLIF(TRIM(ri.medical_details), ''), 'Yes') ELSE 'No' END AS medical_attention,
              COALESCE(s.first_name || ' ' || s.last_name, '—') AS reported_by,
              CASE WHEN ri.manager_reviewed IS TRUE THEN 'Reviewed' ELSE 'Pending review' END AS review_status,
              ri.witnesses, ri.witnessed_by, ri.contributing_factors, ri.prevention_actions,
              COALESCE(
                (SELECT string_agg(
                   COALESCE(elem->>'author', 'Manager') || ': ' || COALESCE(elem->>'text', ''),
                   E'\n\n'
                 )
                 FROM jsonb_array_elements(
                   CASE WHEN jsonb_typeof(ri.review_notes) = 'array' THEN ri.review_notes ELSE '[]'::jsonb END
                 ) elem),
                CASE WHEN jsonb_typeof(ri.review_notes) = 'string' THEN ri.review_notes #>> '{}' ELSE NULL END
              ) AS review_notes,
              ri.reported_to, ri.family_notified, ri.social_worker_notified,
              ri.cqc_notified, dr.record_date,
              su.first_name || ' ' || su.last_name AS su_name,
              s.first_name || ' ' || s.last_name AS staff_name
       FROM records_incidents ri
       JOIN daily_records dr ON dr.id = ri.daily_record_id
       JOIN service_users su ON su.id = dr.su_id
       LEFT JOIN staff s ON s.id = dr.staff_id
       WHERE dr.home_id = $1 AND dr.record_date BETWEEN $2::date AND $3::date
         AND ($4::uuid IS NULL OR dr.su_id = $4::uuid)
       ORDER BY dr.record_date DESC, ri.incident_time DESC NULLS LAST`,
      [homeId, fromDate, toDate, suId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// ── 4. GET /api/reports/care-plan-compliance (clickable full document details included) ──
router.get('/care-plan-compliance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeId, suId } = reportRange(req, 30);
    const rows = await query(
      `SELECT cp.id, cp.plan_type, cp.custom_name, cp.aims_outcomes, cp.what_i_can_do, cp.how_to_support,
              cp.last_review_date, cp.next_review_date, cp.review_frequency, cp.updated_at,
              su.first_name || ' ' || su.last_name AS su_name,
              rb.first_name || ' ' || rb.last_name AS reviewed_by_name,
              cb.first_name || ' ' || cb.last_name AS created_by_name,
              CASE WHEN cp.next_review_date < CURRENT_DATE THEN 'overdue'
                   WHEN cp.next_review_date < CURRENT_DATE + INTERVAL '7 days' THEN 'due_soon'
                   ELSE 'current' END AS review_status,
              (SELECT COALESCE(string_agg(st.first_name || ' ' || st.last_name || ' (' || to_char(cpr.read_at AT TIME ZONE 'Europe/London', 'DD Mon YYYY') || ')', ', ' ORDER BY cpr.read_at DESC), '')
               FROM care_plan_reads cpr JOIN staff st ON st.id = cpr.staff_id WHERE cpr.plan_id = cp.id) AS read_by_staff
       FROM care_plans cp
       JOIN service_users su ON su.id = cp.su_id
       LEFT JOIN staff rb ON rb.id = cp.reviewed_by
       LEFT JOIN staff cb ON cb.id = cp.created_by
       WHERE cp.home_id = $1 AND cp.is_active IS TRUE
         AND ($2::uuid IS NULL OR cp.su_id = $2::uuid)
       ORDER BY review_status DESC, cp.next_review_date`,
      [homeId, suId]
    );
    const total = rows.length;
    const overdue = rows.filter((r: any) => r.review_status === 'overdue').length;
    const dueSoon = rows.filter((r: any) => r.review_status === 'due_soon').length;
    const current = rows.filter((r: any) => r.review_status === 'current').length;
    res.json({
      success: true,
      data: {
        plans: rows,
        summary: { total, overdue, dueSoon, current, complianceRate: total > 0 ? Math.round((current / total) * 100) : 100 },
      },
    } as ApiResponse);
  } catch (err) { next(err); }
});

// ── 5. GET /api/reports/staff-attendance (Video 1: Staff Name first column, UK time, zero UUIDs) ──
router.get('/staff-attendance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeId, fromDate, toDate } = reportRange(req, 30);
    const rows = await query(
      `SELECT ce.id,
              s.first_name || ' ' || s.last_name AS staff_name,
              INITCAP(REPLACE(COALESCE(s.role::text, ''), '_', ' ')) AS role,
              CASE ce.event_type
                WHEN 'clock_in' THEN 'Clock In'
                WHEN 'clock_out' THEN 'Clock Out'
                ELSE INITCAP(REPLACE(COALESCE(ce.event_type, ''), '_', ' '))
              END AS event,
              to_char(ce.event_time AT TIME ZONE 'Europe/London', 'Dy DD Mon YYYY') AS date,
              to_char(ce.event_time AT TIME ZONE 'Europe/London', 'HH24:MI:SS') AS time,
              COALESCE(INITCAP(REPLACE(ce.punctuality, '_', ' ')), '—') AS punctuality,
              CASE WHEN ce.distance_metres IS NULL THEN 'No GPS'
                   ELSE ROUND(ce.distance_metres::numeric, 0)::text || ' m' END AS distance,
              CASE WHEN ce.geofence_passed IS TRUE THEN 'Within geofence'
                   WHEN ce.geofence_passed IS FALSE THEN 'Outside geofence'
                   ELSE '—' END AS geofence_status,
              CASE WHEN ce.latitude IS NOT NULL AND ce.longitude IS NOT NULL
                   THEN ROUND(ce.latitude::numeric, 5)::text || ', ' || ROUND(ce.longitude::numeric, 5)::text
                   ELSE '—' END AS coordinates,
              COALESCE(NULLIF(TRIM(ce.override_reason), ''), '—') AS notes
       FROM staff_clock_events ce
       JOIN staff s ON s.id = ce.staff_id
       WHERE ce.home_id = $1
         AND (ce.event_time AT TIME ZONE 'Europe/London')::date BETWEEN $2::date AND $3::date
       ORDER BY ce.event_time DESC`,
      [homeId, fromDate, toDate]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// ── 6. GET /api/reports/training-compliance & /staff-training ──
const trainingHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const rows = await query(
      `SELECT st.id, st.course_name, st.completed_date, st.expiry_date,
              s.first_name || ' ' || s.last_name AS staff_name, s.role,
              CASE WHEN st.expiry_date < CURRENT_DATE THEN 'expired'
                   WHEN st.expiry_date < CURRENT_DATE + INTERVAL '60 days' THEN 'expiring'
                   ELSE 'current' END AS expiry_status
       FROM staff_training st
       JOIN staff s ON s.id = st.staff_id
       WHERE s.home_id = $1 AND s.is_active = TRUE
       ORDER BY expiry_status DESC, st.expiry_date`,
      [homeId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
};
router.get('/training-compliance', requireRole(...REPORT_MGMT_ROLES, 'senior_carer'), trainingHandler);
router.get('/staff-training', trainingHandler);

// ── 7. GET /api/reports/monthly-summary ──
router.get('/monthly-summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const month = (req.query.month as string) || ukDateStr().substring(0, 7);
    const from = `${month}-01`;
    const [y, m] = month.split('-').map(Number);
    const to = new Date(Date.UTC(y, m, 0)).toISOString().split('T')[0];

    const [totalRecords, incidents, fluidBelow, carePlans, staffActive] = await Promise.all([
      query<{ count: string }>(`SELECT COUNT(*) FROM daily_records WHERE home_id=$1 AND record_date BETWEEN $2::date AND $3::date`, [homeId, from, to]),
      query<{ count: string }>(`SELECT COUNT(*) FROM records_incidents ri JOIN daily_records dr ON dr.id=ri.daily_record_id WHERE dr.home_id=$1 AND dr.record_date BETWEEN $2::date AND $3::date`, [homeId, from, to]),
      query<{ count: string }>(`SELECT COUNT(*) FROM su_daily_fluid_totals ft JOIN service_users su ON su.id = ft.su_id WHERE su.home_id=$1 AND ft.record_date BETWEEN $2::date AND $3::date AND ft.below_threshold=true`, [homeId, from, to]),
      query<{ count: string; overdue: string }>(`SELECT COUNT(*) AS count, COUNT(CASE WHEN next_review_date < CURRENT_DATE THEN 1 END) AS overdue FROM care_plans WHERE home_id=$1 AND is_active IS TRUE`, [homeId]),
      query<{ count: string }>(`SELECT COUNT(DISTINCT staff_id) FROM staff_clock_events WHERE home_id=$1 AND (event_time AT TIME ZONE 'Europe/London')::date BETWEEN $2::date AND $3::date`, [homeId, from, to]),
    ]);

    res.json({
      success: true,
      data: {
        period: { from, to, month },
        totalRecords: parseInt(totalRecords[0]?.count || '0', 10),
        incidents: parseInt(incidents[0]?.count || '0', 10),
        fluidBelowThreshold: parseInt(fluidBelow[0]?.count || '0', 10),
        carePlansTotal: parseInt((carePlans[0] as any)?.count || '0', 10),
        carePlansOverdue: parseInt((carePlans[0] as any)?.overdue || '0', 10),
        staffActive: parseInt(staffActive[0]?.count || '0', 10),
      },
    } as ApiResponse);
  } catch (err) { next(err); }
});

// ── 8. GET /api/reports/mar-report & /medication ──
const marReportHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    if (!homeId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(homeId)) {
      res.status(400).json({ success: false, error: 'No service selected — pick a service and run the report again.' } as ApiResponse);
      return;
    }
    const { fromDate, toDate, suId } = reportRange(req, 7);
    const rows = await query(
      `SELECT mr.id,
              to_char(mr.record_date, 'DD Mon YYYY') AS date,
              COALESCE(LEFT(mr.scheduled_time::text, 5), '—') AS scheduled_time,
              su.first_name || ' ' || su.last_name AS service_user,
              COALESCE(m.medication_name, '—') AS medication,
              COALESCE(m.dose, '—') AS dosage,
              INITCAP(REPLACE(COALESCE(m.route, '—'), '_', ' ')) AS route,
              CASE
                WHEN mr.given IS TRUE THEN 'Given (' || COALESCE(mr.mar_code, 'G') || ')'
                WHEN mr.refused IS TRUE THEN 'Refused (' || COALESCE(mr.mar_code, 'R') || ')'
                ELSE COALESCE(mr.mar_code, 'Recorded')
              END AS outcome,
              COALESCE(s.first_name || ' ' || s.last_name, '—') AS administered_by,
              COALESCE(NULLIF(TRIM(mr.notes), ''), NULLIF(TRIM(mr.refused_reason), ''), '—') AS notes
       FROM mar_records mr
       LEFT JOIN su_medications m ON m.id = mr.medication_id
       JOIN service_users su ON su.id = mr.su_id
       LEFT JOIN staff s ON s.id = mr.given_by
       WHERE mr.home_id = $1 AND mr.record_date BETWEEN $2::date AND $3::date
         AND ($4::uuid IS NULL OR mr.su_id = $4::uuid)
       ORDER BY mr.record_date DESC, mr.scheduled_time ASC NULLS LAST, service_user`,
      [homeId, fromDate, toDate, suId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
};
router.get('/mar-report', marReportHandler);
router.get('/medication', marReportHandler);

// ── 9. GET /api/reports/medication-stock (Video 3: Medication Stock Count — pulls real shift counts!) ──
router.get('/medication-stock', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeId, fromDate, toDate, suId } = reportRange(req, 7);

    // Actual shift Medication Stock Counts completed by care staff on shift
    // (stored in daily_records with record_type = 'medication_stock_count')
    const rawCounts = await query<any>(
      `SELECT dr.id, dr.record_date, dr.recorded_at, dr.notes,
              su.first_name || ' ' || su.last_name AS su_name,
              s.first_name || ' ' || s.last_name AS staff_name
       FROM daily_records dr
       JOIN service_users su ON su.id = dr.su_id
       LEFT JOIN staff s ON s.id = dr.staff_id
       WHERE dr.home_id = $1
         AND dr.record_type = 'medication_stock_count'
         AND dr.record_date BETWEEN $2::date AND $3::date
         AND ($4::uuid IS NULL OR dr.su_id = $4::uuid)
       ORDER BY COALESCE(dr.recorded_at, dr.record_date::timestamptz) DESC, su_name`,
      [homeId, fromDate, toDate, suId]
    );

    const shiftCounts = rawCounts.map((r: any) => {
      const parsed = parseMedicationCountNotes(r.notes);
      const summaryLine = parsed.items.length > 0
        ? parsed.items
            .map(it => `${it.medicationName}${it.strength && it.strength !== 'Other' && it.strength !== '—' ? ` (${it.strength})` : ''}: ${it.quantityRemaining} remaining (given ${it.quantityAdministered})`)
            .join(' · ')
        : (String(r.notes || '').replace(/\s+/g, ' ').trim() || 'Medication stock count completed');

      return {
        id: r.id,
        date: r.recorded_at
          ? new Date(r.recorded_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Europe/London' })
          : (r.record_date ? new Date(r.record_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'),
        time: parsed.shiftWindow || (r.recorded_at
          ? new Date(r.recorded_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' })
          : '—'),
        service_user: r.su_name || '—',
        counted_by: r.staff_name || parsed.staffOnDuty || '—',
        staff_on_duty: parsed.staffOnDuty || r.staff_name || '—',
        medications_counted: parsed.items.length || 1,
        summary: summaryLine,
        raw_notes: r.notes || '',
        items: parsed.items,
      };
    });

    // Also include current balance snapshot for reference (zero UUID columns leaked)
    const currentStock = await query(
      `SELECT su.first_name || ' ' || su.last_name AS su_name,
              ms.medication_name,
              ms.current_stock,
              COALESCE(ms.unit, '') AS unit,
              ms.reorder_threshold,
              COALESCE(s.first_name || ' ' || s.last_name, '—') AS last_updated_by_name,
              to_char(ms.updated_at AT TIME ZONE 'Europe/London', 'DD Mon YYYY HH24:MI') AS updated_on
       FROM medication_stock ms
       JOIN service_users su ON su.id = ms.su_id
       LEFT JOIN staff s ON s.id = COALESCE(ms.last_counted_by, ms.last_updated_by)
       WHERE ms.home_id = $1 AND ($2::uuid IS NULL OR ms.su_id = $2::uuid)
       ORDER BY (ms.current_stock <= COALESCE(ms.reorder_threshold, 0)) DESC, su_name, ms.medication_name`,
      [homeId, suId]
    );

    res.json({ success: true, data: shiftCounts, shiftCounts, currentStock } as any);
  } catch (err) { next(err); }
});

// ── 10. GET /api/reports/calendar (Batch 1 Video 1: clean names, zero UUIDs, clickable modal data) ──
router.get('/calendar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeId, fromDate, toDate, suId } = reportRange(req, 30);
    const rows = await query(
      `SELECT ce.id, ce.title, ce.event_type, ce.event_date, ce.start_time, ce.end_time,
              ce.location, ce.description, ce.agenda, ce.notes, ce.action_plans, ce.concerns,
              ce.all_staff,
              array_to_string(ce.attendees, ', ') AS attendees_list,
              su.first_name || ' ' || su.last_name AS su_name,
              st_assigned.first_name || ' ' || st_assigned.last_name AS assigned_staff_name,
              s.first_name || ' ' || s.last_name AS created_by_name,
              mn.notes AS mn_notes, mn.summary AS mn_summary, mn.outcome,
              mn.action_points AS mn_action_points, mn.concerns AS mn_concerns, mn.attendees AS mn_attendees,
              (SELECT COALESCE(string_agg(st.first_name || ' ' || st.last_name, ', '), '')
               FROM meeting_signoffs mso JOIN staff st ON st.id = mso.staff_id WHERE mso.event_id = ce.id) AS signed_off_staff
       FROM calendar_events ce
       LEFT JOIN service_users su ON su.id = ce.su_id
       LEFT JOIN staff st_assigned ON st_assigned.id = ce.assigned_staff_id
       LEFT JOIN staff s ON s.id = ce.created_by
       LEFT JOIN meeting_notes mn ON mn.event_id = ce.id
       WHERE ce.home_id = $1 AND ce.event_date BETWEEN $2::date AND $3::date
         AND ($4::uuid IS NULL OR ce.su_id = $4::uuid)
       ORDER BY ce.event_date DESC, ce.start_time DESC NULLS LAST`,
      [homeId, fromDate, toDate, suId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// ── 11. GET /api/reports/medication-report (Videos 4, 5 & 7: MAR Reviews + Resident, Dosage, Route, Start Time, Prescriber, ZERO UUIDs) ──
router.get('/medication-report', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeId, fromDate, toDate, suId } = reportRange(req, 60);

    const [rawReviews, rawMeds] = await Promise.all([
      query<any>(
        `SELECT a.id, a.template_key, a.assessment_date, a.next_review_date,
                a.outcome, a.notes, a.answers, a.status, a.created_at,
                COALESCE(su.first_name || ' ' || su.last_name, NULLIF(TRIM(a.subject_name), ''), '—') AS service_user,
                COALESCE(NULLIF(TRIM(a.auditor_name), ''), s.first_name || ' ' || s.last_name, '—') AS reviewed_by
         FROM assessments a
         LEFT JOIN service_users su ON su.id = a.subject_id
         LEFT JOIN staff s ON s.id = COALESCE(a.conducted_by, a.staff_id)
         WHERE a.home_id = $1
           AND a.template_key IN ('mar_review', 'mar_chart_audit')
           AND COALESCE(a.assessment_date, (a.created_at AT TIME ZONE 'Europe/London')::date) BETWEEN $2::date AND $3::date
           AND ($4::uuid IS NULL OR a.subject_id = $4::uuid)
         ORDER BY COALESCE(a.assessment_date, (a.created_at AT TIME ZONE 'Europe/London')::date) DESC, a.created_at DESC`,
        [homeId, fromDate, toDate, suId]
      ),
      query<any>(
        `SELECT m.id,
                su.first_name || ' ' || su.last_name AS service_user,
                m.medication_name,
                COALESCE(NULLIF(TRIM(m.dose), ''), '—') AS dosage,
                INITCAP(REPLACE(COALESCE(NULLIF(TRIM(m.route), ''), 'oral'), '_', ' ')) AS route,
                m.frequency,
                m.is_prn,
                m.is_controlled,
                m.apply_time,
                m.time_slots,
                m.start_date,
                m.end_date,
                COALESCE(
                  NULLIF(TRIM(m.gp_name), ''),
                  NULLIF(TRIM(su.gp_name), ''),
                  NULLIF(TRIM(m.prescribed_by), ''),
                  NULLIF(TRIM(m.prescriber), ''),
                  '—'
                ) AS prescriber,
                COALESCE(NULLIF(TRIM(m.prescriber), ''), NULLIF(TRIM(m.notes), ''), NULLIF(TRIM(m.instructions), ''), '—') AS directions_and_indication,
                COALESCE(NULLIF(TRIM(m.pharmacy_name), ''), '—') AS pharmacy,
                rev.last_review_date,
                rev.last_reviewed_by
         FROM su_medications m
         JOIN service_users su ON su.id = m.su_id
         LEFT JOIN LATERAL (
           SELECT a.assessment_date AS last_review_date,
                  COALESCE(NULLIF(TRIM(a.auditor_name), ''), st.first_name || ' ' || st.last_name) AS last_reviewed_by
           FROM assessments a
           LEFT JOIN staff st ON st.id = COALESCE(a.conducted_by, a.staff_id)
           WHERE a.subject_id = su.id AND a.template_key IN ('mar_review', 'mar_chart_audit')
           ORDER BY a.assessment_date DESC NULLS LAST, a.created_at DESC
           LIMIT 1
         ) rev ON TRUE
         WHERE m.home_id = $1 AND m.is_active = TRUE
           AND ($2::uuid IS NULL OR m.su_id = $2::uuid)
         ORDER BY service_user, m.medication_name`,
        [homeId, suId]
      ),
    ]);

    const marReviews = rawReviews.map((r: any) => {
      const ans = r.answers && typeof r.answers === 'object' ? r.answers : {};
      const reviewFreq = ans.q1 && !['yes', 'no', 'n/a'].includes(String(ans.q1).toLowerCase()) ? String(ans.q1) : (r.template_key === 'mar_chart_audit' ? 'MAR Chart Audit' : 'MAR Review');
      const findings = String(r.notes || ans.q2 || ans.q4__notes || ans.q3__notes || r.outcome || 'MAR review completed').trim();
      const actionPlan = String(ans.q3 || ans.q9__notes || '').trim();
      return {
        id: r.id,
        review_date: r.assessment_date
          ? new Date(r.assessment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          : '—',
        service_user: r.service_user,
        review_type: reviewFreq,
        reviewed_by: r.reviewed_by,
        summary_findings: findings,
        action_plan: actionPlan || '—',
        next_review_due: r.next_review_date
          ? new Date(r.next_review_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          : '—',
        status: INITCAP(String(r.status || 'completed')),
      };
    });

    const medications = rawMeds.map((m: any) => {
      let scheduleTimes = '—';
      if (m.is_prn || m.frequency === 'as_required') {
        scheduleTimes = 'PRN (As required)';
      } else if (Array.isArray(m.time_slots) && m.time_slots.length > 0) {
        scheduleTimes = m.time_slots.map((t: string) => String(t).slice(0, 5)).join(', ');
      } else {
        const computed = getTimeSlots(m.frequency || 'once_daily', m.apply_time);
        scheduleTimes = computed.length ? computed.join(', ') : (m.apply_time ? String(m.apply_time).slice(0, 5) : '08:00');
      }
      const startDateFormatted = m.start_date
        ? new Date(m.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : null;

      return {
        id: m.id,
        service_user: m.service_user,
        medication: m.medication_name,
        dosage: m.dosage,
        administration_route: m.route,
        start_time: scheduleTimes,
        start_date: startDateFormatted || '—',
        prescriber: m.prescriber,
        frequency: m.is_prn ? 'PRN (As required)' : INITCAP(String(m.frequency || 'once_daily').replace(/_/g, ' ')),
        directions_and_indication: m.directions_and_indication,
        pharmacy: m.pharmacy,
        controlled_drug: m.is_controlled ? 'Yes (CD)' : 'No',
        last_mar_review: m.last_review_date
          ? `${new Date(m.last_review_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}${m.last_reviewed_by ? ` (${m.last_reviewed_by})` : ''}`
          : 'Pending review',
      };
    });

    res.json({
      success: true,
      data: medications,
      medications,
      marReviews,
    } as any);
  } catch (err) { next(err); }
});

function INITCAP(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// ── 12. GET /api/reports/care-plan-reviews ──
router.get('/care-plan-reviews', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeId, suId } = reportRange(req, 30);
    const rows = await query(
      `SELECT cp.id,
              su.first_name || ' ' || su.last_name AS service_user,
              INITCAP(REPLACE(COALESCE(cp.custom_name, cp.plan_type, 'Care Plan'), '_', ' ')) AS plan_type,
              INITCAP(REPLACE(COALESCE(cp.review_frequency::text, 'monthly'), '_', ' ')) AS review_frequency,
              COALESCE(to_char(cp.last_review_date, 'DD Mon YYYY'), '—') AS last_reviewed,
              COALESCE(to_char(cp.next_review_date, 'DD Mon YYYY'), '—') AS next_review_due,
              CASE WHEN cp.next_review_date < CURRENT_DATE THEN 'Overdue'
                   WHEN cp.next_review_date < CURRENT_DATE + interval '7 days' THEN 'Due soon'
                   ELSE 'Current' END AS review_status,
              cp.aims_outcomes, cp.what_i_can_do, cp.how_to_support
       FROM care_plans cp
       JOIN service_users su ON su.id = cp.su_id
       WHERE cp.home_id = $1 AND cp.is_active IS TRUE
         AND ($2::uuid IS NULL OR cp.su_id = $2::uuid)
       ORDER BY cp.next_review_date ASC NULLS LAST`,
      [homeId, suId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// ── 13. GET /api/reports/careplan-review-matrix ──
router.get('/careplan-review-matrix', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeId, suId } = reportRange(req, 30);
    const rows = await query(
      `SELECT service_user,
              COALESCE(to_char(cp_last, 'DD Mon YYYY'), '—') AS care_plan_last_reviewed,
              COALESCE(to_char(cp_next, 'DD Mon YYYY'), '—') AS care_plan_next_due,
              COALESCE(to_char(ra_last, 'DD Mon YYYY'), '—') AS risk_assessment_last_reviewed,
              COALESCE(to_char(ra_next, 'DD Mon YYYY'), '—') AS risk_assessment_next_due,
              COALESCE(to_char(mar_last, 'DD Mon YYYY'), '—') AS mar_last_reviewed,
              COALESCE(to_char(mar_next, 'DD Mon YYYY'), '—') AS mar_review_next_due,
              CASE WHEN LEAST(cp_next, ra_next, mar_next) < CURRENT_DATE THEN 'Overdue'
                   WHEN LEAST(cp_next, ra_next, mar_next) < CURRENT_DATE + 14 THEN 'Due within 14 days'
                   WHEN cp_next IS NULL AND ra_next IS NULL AND mar_next IS NULL THEN 'No review dates set'
                   ELSE 'Up to date' END AS status
       FROM (
         SELECT su.first_name || ' ' || su.last_name AS service_user,
           (SELECT MAX(cp.last_review_date) FROM care_plans cp WHERE cp.su_id = su.id AND cp.is_active IS TRUE) AS cp_last,
           (SELECT MIN(cp.next_review_date) FROM care_plans cp WHERE cp.su_id = su.id AND cp.is_active IS TRUE) AS cp_next,
           (SELECT MAX(ra.last_review_date) FROM risk_assessments ra WHERE ra.su_id = su.id AND ra.is_active IS TRUE) AS ra_last,
           (SELECT MIN(ra.next_review_date) FROM risk_assessments ra WHERE ra.su_id = su.id AND ra.is_active IS TRUE) AS ra_next,
           (SELECT MAX(a.assessment_date) FROM assessments a WHERE a.subject_id = su.id AND a.template_key IN ('mar_review', 'mar_chart_audit')) AS mar_last,
           (SELECT MAX(a.next_review_date) FROM assessments a WHERE a.subject_id = su.id AND a.template_key IN ('mar_review', 'mar_chart_audit')) AS mar_next
         FROM service_users su
         WHERE su.home_id = $1 AND su.status = 'live' AND ($2::uuid IS NULL OR su.id = $2::uuid)
       ) x ORDER BY service_user`,
      [homeId, suId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// ── 14. GET /api/reports/delivered-hours (Video 9: exact per-shift window math, zero discrepancy, clickable shift breakdown) ──
router.get('/delivered-hours', requireRole(...REPORT_MGMT_ROLES), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeId, fromDate, toDate } = reportRange(req, 7);

    // Evaluate every non-cancelled staffed shift in Europe/London timestamp space:
    // - `shift_start_ts`: UK timestamp when shift starts
    // - `shift_end_ts`:   UK timestamp when shift ends (+1 day when overnight end_time <= start_time)
    // - Matched clock-in: earliest `clock_in` inside `[shift_start_ts - 3h, shift_end_ts]`
    //   so split day/night shifts on the same date never cross-contaminate and post-midnight
    //   clock-ins on overnight shifts match their shift cleanly.
    // - Matched clock-out: first `clock_out` after `matched_in` up to `shift_end_ts + 6h`.
    // - Mathematical invariant guaranteed on EVERY row:
    //   `shifts_due = shifts_clocked_in + shifts_not_clocked_in` AND
    //   `scheduled_shifts = shifts_due + upcoming_shifts`.
    const shiftRows = await query<any>(
      `WITH raw_shifts AS (
         SELECT sh.id,
                sh.staff_id,
                s.first_name || ' ' || s.last_name AS staff_name,
                s.contracted_hours,
                sh.shift_date,
                sh.start_time,
                sh.end_time,
                COALESCE(su.first_name || ' ' || su.last_name, sh.label, 'General') AS service_user,
                ((sh.shift_date::timestamp + sh.start_time) AT TIME ZONE 'Europe/London') AS shift_start_ts,
                ((sh.shift_date::timestamp + sh.end_time +
                  CASE WHEN sh.end_time <= sh.start_time THEN interval '1 day' ELSE interval '0' END
                ) AT TIME ZONE 'Europe/London') AS shift_end_ts,
                EXTRACT(EPOCH FROM (
                  CASE WHEN sh.end_time <= sh.start_time
                       THEN sh.end_time - sh.start_time + interval '24 hours'
                       ELSE sh.end_time - sh.start_time END
                )) / 3600.0 AS scheduled_hrs
         FROM staff_shifts sh
         JOIN staff s ON s.id = sh.staff_id
         LEFT JOIN service_users su ON su.id = sh.su_id
         WHERE sh.home_id = $1
           AND sh.shift_date BETWEEN $2::date AND $3::date
           AND sh.status <> 'cancelled'
       ),
       matched AS (
         SELECT rs.*,
                ci.in_ts,
                co.out_ts,
                (rs.shift_start_ts <= NOW()) AS is_due
         FROM raw_shifts rs
         LEFT JOIN LATERAL (
           SELECT MIN(ce.event_time) AS in_ts
           FROM staff_clock_events ce
           WHERE ce.staff_id = rs.staff_id
             AND ce.event_type = 'clock_in'
             AND ce.event_time >= rs.shift_start_ts - interval '3 hours'
             AND ce.event_time <= rs.shift_end_ts
         ) ci ON TRUE
         LEFT JOIN LATERAL (
           SELECT MIN(ce2.event_time) AS out_ts
           FROM staff_clock_events ce2
           WHERE ce2.staff_id = rs.staff_id
             AND ce2.event_type = 'clock_out'
             AND ci.in_ts IS NOT NULL
             AND ce2.event_time > ci.in_ts
             AND ce2.event_time <= rs.shift_end_ts + interval '6 hours'
         ) co ON TRUE
       )
       SELECT staff_id,
              staff_name,
              contracted_hours,
              shift_date,
              to_char(shift_date, 'Dy DD Mon YYYY') AS shift_date_label,
              to_char(start_time, 'HH24:MI') || ' - ' || to_char(end_time, 'HH24:MI') AS shift_window,
              service_user,
              ROUND(scheduled_hrs::numeric, 2) AS scheduled_hrs,
              is_due,
              in_ts,
              out_ts,
              to_char(in_ts AT TIME ZONE 'Europe/London', 'HH24:MI') AS clock_in_hhmm,
              to_char(out_ts AT TIME ZONE 'Europe/London', 'HH24:MI') AS clock_out_hhmm,
              CASE
                WHEN in_ts IS NOT NULL AND out_ts IS NOT NULL
                  THEN ROUND(LEAST(EXTRACT(EPOCH FROM (out_ts - in_ts)) / 3600.0, scheduled_hrs + 4)::numeric, 2)
                WHEN in_ts IS NOT NULL AND shift_end_ts <= NOW()
                  THEN ROUND(scheduled_hrs::numeric, 2)
                WHEN in_ts IS NOT NULL
                  THEN ROUND(GREATEST(EXTRACT(EPOCH FROM (NOW() - in_ts)) / 3600.0, 0)::numeric, 2)
                ELSE 0
              END AS actual_hrs
       FROM matched
       ORDER BY staff_name, shift_date DESC, start_time DESC`,
      [homeId, fromDate, toDate]
    );

    const byStaff = new Map<string, any>();
    for (const r of shiftRows) {
      if (!byStaff.has(r.staff_id)) {
        byStaff.set(r.staff_id, {
          staff: r.staff_name,
          shifts_due: 0,
          shifts_clocked_in: 0,
          shifts_not_clocked_in: 0,
          upcoming_shifts: 0,
          scheduled_hours: 0,
          delivered_hours: 0,
          contracted_hours_per_week: r.contracted_hours ?? '—',
          shift_breakdown: [] as any[],
        });
      }
      const agg = byStaff.get(r.staff_id)!;
      const schedH = Number(r.scheduled_hrs || 0);
      const actH = Number(r.actual_hrs || 0);
      const hasClockIn = r.in_ts !== null;

      if (r.is_due) {
        agg.shifts_due += 1;
        agg.scheduled_hours += schedH;
        if (hasClockIn) {
          agg.shifts_clocked_in += 1;
          agg.delivered_hours += actH;
        } else {
          agg.shifts_not_clocked_in += 1;
        }
      } else {
        agg.upcoming_shifts += 1;
        if (hasClockIn) {
          agg.shifts_due += 1;
          agg.upcoming_shifts -= 1;
          agg.scheduled_hours += schedH;
          agg.shifts_clocked_in += 1;
          agg.delivered_hours += actH;
        }
      }

      agg.shift_breakdown.push({
        date: r.shift_date_label,
        shift: r.shift_window,
        service_user: r.service_user,
        scheduled_hours: schedH.toFixed(2),
        clocked_in: r.clock_in_hhmm || '—',
        clocked_out: r.clock_out_hhmm || (hasClockIn ? 'On shift / Auto' : '—'),
        delivered_hours: hasClockIn ? actH.toFixed(2) : '0.00',
        status: !r.is_due && !hasClockIn ? 'Upcoming' : hasClockIn ? 'Clocked in' : 'Not clocked in',
      });
    }

    const data = Array.from(byStaff.values()).map(item => ({
      staff: item.staff,
      shifts: item.shifts_due,
      shifts_clocked_in: item.shifts_clocked_in,
      shifts_not_clocked_in: item.shifts_not_clocked_in,
      upcoming_shifts: item.upcoming_shifts,
      rota_hours: Number(item.scheduled_hours.toFixed(2)),
      delivered_hours: Number(item.delivered_hours.toFixed(2)),
      contracted_hours_per_week: item.contracted_hours_per_week,
      shift_breakdown: item.shift_breakdown,
    }));

    res.json({ success: true, data } as ApiResponse);
  } catch (err) { next(err); }
});

// ── 15. GET /api/reports/cancelled-shifts ──
router.get('/cancelled-shifts', requireRole(...REPORT_MGMT_ROLES), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeId, fromDate, toDate } = reportRange(req, 30);
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
              COALESCE(to_char(sh.cancelled_at AT TIME ZONE 'Europe/London', 'DD Mon YYYY HH24:MI'), '—') AS cancelled_on
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

// ── 16. GET /api/reports/clash-bookings ──
router.get('/clash-bookings', requireRole(...REPORT_MGMT_ROLES), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeId, fromDate, toDate } = reportRange(req, 30);
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

// ── 17. GET /api/reports/clocked-in-integrity ──
router.get('/clocked-in-integrity', requireRole(...REPORT_MGMT_ROLES), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeId, fromDate, toDate } = reportRange(req, 7);
    const rows = await query(
      `SELECT to_char(sh.shift_date, 'Dy DD Mon YYYY') AS shift_date,
              to_char(sh.start_time, 'HH24:MI') || ' - ' || to_char(sh.end_time, 'HH24:MI') AS shift_time,
              s.first_name || ' ' || s.last_name AS staff,
              COALESCE(sh.label, su.first_name || ' ' || su.last_name, '—') AS service,
              COALESCE(to_char(ci.t AT TIME ZONE 'Europe/London', 'HH24:MI'), '—') AS clocked_in,
              COALESCE(to_char(co.t AT TIME ZONE 'Europe/London', 'HH24:MI'), '—') AS clocked_out,
              CASE WHEN ci.t IS NULL THEN 'Did not clock in'
                   WHEN EXTRACT(EPOCH FROM (ci.t - ((sh.shift_date::timestamp + sh.start_time) AT TIME ZONE 'Europe/London'))) / 60 > 15
                     THEN ROUND(EXTRACT(EPOCH FROM (ci.t - ((sh.shift_date::timestamp + sh.start_time) AT TIME ZONE 'Europe/London'))) / 60)::int || ' min late'
                   ELSE 'On time' END AS result
       FROM staff_shifts sh
       JOIN staff s ON s.id = sh.staff_id
       LEFT JOIN service_users su ON su.id = sh.su_id
       LEFT JOIN LATERAL (
         SELECT MIN(ce.event_time) AS t
         FROM staff_clock_events ce
         WHERE ce.staff_id = sh.staff_id
           AND ce.event_type = 'clock_in'
           AND ce.event_time >= ((sh.shift_date::timestamp + sh.start_time) AT TIME ZONE 'Europe/London') - interval '3 hours'
           AND ce.event_time <= ((sh.shift_date::timestamp + sh.end_time + CASE WHEN sh.end_time <= sh.start_time THEN interval '1 day' ELSE interval '0' END) AT TIME ZONE 'Europe/London')
       ) ci ON TRUE
       LEFT JOIN LATERAL (
         SELECT MIN(ce2.event_time) AS t
         FROM staff_clock_events ce2
         WHERE ce2.staff_id = sh.staff_id
           AND ce2.event_type = 'clock_out'
           AND ci.t IS NOT NULL
           AND ce2.event_time > ci.t
           AND ce2.event_time <= ((sh.shift_date::timestamp + sh.end_time + CASE WHEN sh.end_time <= sh.start_time THEN interval '1 day' ELSE interval '0' END) AT TIME ZONE 'Europe/London') + interval '6 hours'
       ) co ON TRUE
       WHERE sh.home_id = $1
         AND ((sh.shift_date::timestamp + sh.start_time) AT TIME ZONE 'Europe/London') <= NOW()
         AND sh.shift_date BETWEEN $2::date AND $3::date
         AND sh.status <> 'cancelled'
       ORDER BY sh.shift_date DESC, sh.start_time DESC, staff`,
      [homeId, fromDate, toDate]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// ── 18. GET /api/reports/weekly-summary ──
router.get('/weekly-summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeId, fromDate, toDate, suId } = reportRange(req, 7);
    const rows = await query(
      `SELECT su.first_name || ' ' || su.last_name AS service_user,
              COUNT(dr.id) AS total_records,
              COUNT(dr.id) FILTER (WHERE dr.record_type = 'incident') AS incidents,
              COUNT(dr.id) FILTER (WHERE dr.record_type = 'incident' AND ri.incident_type ILIKE '%fall%') AS falls,
              COUNT(dr.id) FILTER (WHERE dr.record_type = 'incident' AND ri.incident_type ILIKE '%seizure%') AS seizures,
              COUNT(dr.id) FILTER (WHERE dr.record_type IN ('bowel', 'bowel_movement')) AS bowel_records,
              COUNT(dr.id) FILTER (WHERE dr.record_type IN ('visit', 'family_visit', 'professional_visit', 'social_visit')) AS visits,
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

// ── 19. GET /api/reports/wellbeing ──
router.get('/wellbeing', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeId, fromDate, toDate, suId } = reportRange(req, 30);

    const suParams: unknown[] = [homeId];
    let suSql = `SELECT su.id, su.first_name || ' ' || su.last_name AS service_user,
                        EXTRACT(YEAR FROM age(su.date_of_birth))::int AS age,
                        su.weight_kg, su.height_cm
                 FROM service_users su
                 WHERE su.home_id = $1 AND su.status = 'live'`;
    if (suId) {
      suParams.push(suId);
      suSql += ` AND su.id = $${suParams.length}::uuid`;
    }
    suSql += ' ORDER BY 2';

    const [
      sus,
      vitalsRows,
      weightRows,
      mustScoreRows,
      dailyMustRows,
      obsRows,
      healthPlanRows,
    ] = await Promise.all([
      query<any>(suSql, suParams),
      query<any>(
        `SELECT dr.su_id, dr.record_date::text AS rec_date,
                rv.systolic, rv.diastolic, rv.spo2_percent, rv.weight_kg, rv.height_cm
         FROM daily_records dr
         JOIN records_vitals rv ON rv.daily_record_id = dr.id
         WHERE dr.home_id = $1
         ORDER BY dr.record_date DESC, dr.recorded_at DESC`,
        [homeId],
      ).catch(() => []),
      query<any>(
        `SELECT wr.su_id, wr.record_date::text AS rec_date, wr.weight_kg, wr.height_cm
         FROM weight_records wr
         JOIN service_users su ON su.id = wr.su_id
         WHERE su.home_id = $1
         ORDER BY wr.record_date DESC, wr.created_at DESC`,
        [homeId],
      ).catch(() => []),
      query<any>(
        `SELECT ms.su_id, COALESCE(ms.assessed_at::date::text, ms.created_at::date::text) AS rec_date,
                ms.weight_kg, ms.height_cm
         FROM must_scores ms
         JOIN service_users su ON su.id = ms.su_id
         WHERE su.home_id = $1
         ORDER BY ms.assessed_at DESC NULLS LAST, ms.created_at DESC`,
        [homeId],
      ).catch(() => []),
      query<any>(
        `SELECT dr.su_id, dr.record_date::text AS rec_date,
                rm.current_weight AS weight_kg, rm.current_height AS height_cm
         FROM daily_records dr
         JOIN records_must rm ON rm.daily_record_id = dr.id
         WHERE dr.home_id = $1
         ORDER BY dr.record_date DESC, dr.recorded_at DESC`,
        [homeId],
      ).catch(() => []),
      query<any>(
        `SELECT o.su_id, o.recorded_at::date::text AS rec_date,
                o.weight_kg, o.systolic, o.diastolic, o.spo2_percent
         FROM observations o
         JOIN service_users su ON su.id = o.su_id
         WHERE su.home_id = $1
         ORDER BY o.recorded_at DESC`,
        [homeId],
      ).catch(() => []),
      query<any>(
        `SELECT php.su_id, php.updated_at::date::text AS rec_date, php.height_cm, php.weight_kg
         FROM physical_health_plans php
         JOIN service_users su ON su.id = php.su_id
         WHERE su.home_id = $1
         ORDER BY php.updated_at DESC NULLS LAST`,
        [homeId],
      ).catch(() => []),
    ]);

    const inRange = (d?: string | null) => {
      if (!d) return false;
      const ds = String(d).slice(0, 10);
      return ds >= fromDate && ds <= toDate;
    };

    const avgNum = (nums: number[], digits = 1): string | null => {
      if (!nums.length) return null;
      return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(digits);
    };

    const data = sus.map((su: any) => {
      const id = su.id;

      const weightEntries: { date: string; kg: number }[] = [];
      const addWeights = (rows: any[]) => {
        for (const r of rows) {
          if (r.su_id !== id) continue;
          const w = parseFloat(r.weight_kg);
          if (!isNaN(w) && w > 0) weightEntries.push({ date: String(r.rec_date || '').slice(0, 10), kg: w });
        }
      };
      addWeights(weightRows);
      addWeights(vitalsRows);
      addWeights(dailyMustRows);
      addWeights(mustScoreRows);
      addWeights(obsRows);
      addWeights(healthPlanRows);
      weightEntries.sort((a, b) => b.date.localeCompare(a.date));

      const rangeWeights = weightEntries.filter(w => inRange(w.date)).map(w => w.kg);
      const profileWeight = parseFloat(su.weight_kg);
      let weightStr = '—';
      if (rangeWeights.length > 0) {
        weightStr = `${avgNum(rangeWeights, 1)} kg`;
      } else if (weightEntries.length > 0) {
        weightStr = `${weightEntries[0].kg.toFixed(1)} kg`;
      } else if (!isNaN(profileWeight) && profileWeight > 0) {
        weightStr = `${profileWeight.toFixed(1)} kg`;
      }

      const heightVals: number[] = [];
      for (const src of [weightRows, vitalsRows, dailyMustRows, mustScoreRows, healthPlanRows]) {
        for (const r of src) {
          if (r.su_id !== id) continue;
          const h = parseFloat(r.height_cm);
          if (!isNaN(h) && h > 0) heightVals.push(h);
        }
      }
      const profileHeight = parseFloat(su.height_cm);
      if (!isNaN(profileHeight) && profileHeight > 0) heightVals.push(profileHeight);
      const heightStr = heightVals.length > 0 ? `${heightVals[0].toFixed(1)} cm` : '—';

      const sysVals: number[] = [];
      const diaVals: number[] = [];
      const spo2Vals: number[] = [];
      let readings = rangeWeights.length;

      for (const r of [...vitalsRows, ...obsRows]) {
        if (r.su_id !== id || !inRange(r.rec_date)) continue;
        readings++;
        const sys = parseFloat(r.systolic);
        const dia = parseFloat(r.diastolic);
        const spo2 = parseFloat(r.spo2_percent);
        if (!isNaN(sys) && sys > 0) sysVals.push(sys);
        if (!isNaN(dia) && dia > 0) diaVals.push(dia);
        if (!isNaN(spo2) && spo2 > 0) spo2Vals.push(spo2);
      }

      const avgSys = avgNum(sysVals, 0);
      const avgDia = avgNum(diaVals, 0);

      return {
        service_user: su.service_user,
        age: su.age ?? '—',
        height_cm: heightStr,
        weight_kg: weightStr,
        average_blood_pressure: avgSys && avgDia ? `${avgSys}/${avgDia} mmHg` : '—',
        average_oxygen_percent: spo2Vals.length ? `${avgNum(spo2Vals, 0)}%` : '—',
        readings,
      };
    });

    res.json({ success: true, data } as ApiResponse);
  } catch (err) { next(err); }
});

router.get('/overdue-signatures', requireRole(...REPORT_MGMT_ROLES), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeId } = reportRange(req, 30);
    const rows = await query(
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

// ── 21. GET /api/reports/assessment-matrix ──
router.get('/assessment-matrix', requireRole(...REPORT_MGMT_ROLES), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeId } = reportRange(req, 30);
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

// ── 22. GET /api/reports/clock-in-locations ──
router.get('/clock-in-locations', requireRole(...REPORT_MGMT_ROLES), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeId, fromDate, toDate } = reportRange(req, 7);
    const rows = await query(
      `SELECT to_char(ce.event_time AT TIME ZONE 'Europe/London', 'Dy DD Mon YYYY') AS event_date,
              to_char(ce.event_time AT TIME ZONE 'Europe/London', 'HH24:MI') AS event_time,
              s.first_name || ' ' || s.last_name AS staff,
              REPLACE(ce.event_type, '_', ' ') AS event,
              CASE WHEN ce.distance_metres IS NULL THEN 'No location' ELSE ROUND(ce.distance_metres::numeric, 0)::text || ' m' END AS distance_from_service,
              CASE WHEN ce.geofence_passed IS FALSE THEN 'Outside permitted area'
                   WHEN ce.geofence_passed IS TRUE THEN 'Within permitted area' ELSE '—' END AS location_check
       FROM staff_clock_events ce
       JOIN staff s ON s.id = ce.staff_id
       WHERE ce.home_id = $1 AND (ce.event_time AT TIME ZONE 'Europe/London')::date BETWEEN $2::date AND $3::date
       ORDER BY (ce.geofence_passed IS FALSE) DESC, ce.event_time DESC`,
      [homeId, fromDate, toDate]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// ── 23. GET /api/reports/tasks-not-completed ──
router.get('/tasks-not-completed', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeId, fromDate, toDate, suId } = reportRange(req, 7);
    const rows = await query(
      `SELECT to_char(t.task_date, 'Dy DD Mon YYYY') AS task_date,
              COALESCE(t.due_time, '—') AS due_time,
              t.title AS task,
              COALESCE(t.category, '—') AS category,
              COALESCE(su.first_name || ' ' || su.last_name, '—') AS service_user,
              t.status
       FROM tasks t
       LEFT JOIN service_users su ON su.id = t.su_id
       WHERE t.home_id = $1 AND t.task_date BETWEEN $2::date AND LEAST($3::date, CURRENT_DATE)
         AND t.status <> 'completed' AND ($4::uuid IS NULL OR t.su_id = $4::uuid)
       ORDER BY t.task_date DESC, t.due_time`,
      [homeId, fromDate, toDate, suId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// ── 24. GET /api/reports/documents-matrix ──
router.get('/documents-matrix', requireRole(...REPORT_MGMT_ROLES), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeId } = reportRange(req, 30);
    const rows = await query(
      `SELECT s.first_name || ' ' || s.last_name AS staff,
              REPLACE(s.role::text, '_', ' ') AS job_role,
              COALESCE((SELECT to_char(MAX(d.issue_date), 'DD Mon YYYY') FROM staff_dbs d WHERE d.staff_id = s.id), 'Missing') AS dbs_issued,
              COALESCE((SELECT to_char(MAX(d.expiry_date), 'DD Mon YYYY') FROM staff_dbs d WHERE d.staff_id = s.id), '—') AS dbs_expires,
              CASE WHEN EXISTS (SELECT 1 FROM staff_right_to_work r WHERE r.staff_id = s.id) THEN 'On file' ELSE 'Missing' END AS right_to_work,
              to_char(COALESCE(s.start_date, LEAST((SELECT MIN(ce.event_time)::date FROM staff_clock_events ce WHERE ce.staff_id = s.id), (SELECT MIN(sh.shift_date) FROM staff_shifts sh WHERE sh.staff_id = s.id)), s.created_at::date), 'DD Mon YYYY') AS work_start_date,
              COALESCE(s.contracted_hours, 40) AS contracted_hours,
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

// ── 25. GET /api/reports/safeguarding (Video 2: Created By resolved to Staff Name + full record fields for modal) ──
router.get('/safeguarding', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeId, suId } = reportRange(req, 90);
    const { from, to } = req.query as Record<string, string>;
    const hasDates = !!from && /^\d{4}-\d{2}-\d{2}$/.test(from);

    const rows = await query(
      `SELECT sg.id,
              su.first_name || ' ' || su.last_name AS service_user,
              COALESCE(to_char(sg.incident_date, 'DD Mon YYYY'), '—') AS incident_date,
              COALESCE(NULLIF(TRIM(sg.incident_time::text), ''), '—') AS incident_time,
              COALESCE(NULLIF(TRIM(sg.incident_location), ''), NULLIF(TRIM(sg.su_location), ''), '—') AS location,
              COALESCE(NULLIF(TRIM(sg.overview), ''), '—') AS overview,
              COALESCE(NULLIF(TRIM(sg.immediate_actions), ''), '—') AS immediate_actions,
              CASE WHEN sg.outside_agency IS TRUE THEN COALESCE(NULLIF(TRIM(sg.agency_details), ''), 'Yes') ELSE 'No' END AS outside_agency,
              COALESCE(s.first_name || ' ' || s.last_name, '—') AS created_by_name,
              CASE WHEN sg.manager_ack IS TRUE
                   THEN 'Acknowledged' || COALESCE(' (' || m.first_name || ' ' || m.last_name || ')', '')
                   ELSE 'Pending review' END AS manager_status,
              sg.su_location, sg.incident_location, sg.witnesses, sg.medical_required,
              sg.medical_details, sg.injury_details, sg.decisions_breached, sg.lessons_learnt,
              sg.agency_details, sg.management_recs, sg.prevention_actions, sg.reported_to,
              sg.reported_at, sg.manager_ack, sg.manager_ack_at, sg.created_at,
              m.first_name || ' ' || m.last_name AS manager_ack_by_name
       FROM safeguarding_concerns sg
       JOIN service_users su ON su.id = sg.su_id
       LEFT JOIN staff s ON s.id = sg.created_by
       LEFT JOIN staff m ON m.id = sg.manager_ack_by
       WHERE sg.home_id = $1
         AND ($2::uuid IS NULL OR sg.su_id = $2::uuid)
         ${hasDates ? 'AND sg.incident_date BETWEEN $3::date AND $4::date' : ''}
       ORDER BY sg.incident_date DESC NULLS LAST, sg.created_at DESC`,
      hasDates ? [homeId, suId, from, to || ukDateStr()] : [homeId, suId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// ── 26. Handover Notes endpoints ──
router.get('/handover', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeId, fromDate, toDate, suId } = reportRange(req, 7);
    const rows = await query(
      `SELECT hn.id,
              to_char(hn.shift_date, 'DD Mon YYYY') AS shift_date,
              INITCAP(COALESCE(hn.shift_type, '—')) AS shift_type,
              su.first_name || ' ' || su.last_name AS service_user,
              COALESCE(s.first_name || ' ' || s.last_name, '—') AS staff_name,
              hn.notes,
              to_char(hn.updated_at AT TIME ZONE 'Europe/London', 'DD Mon YYYY HH24:MI') AS updated_on
       FROM handover_resident_notes hn
       JOIN service_users su ON su.id = hn.su_id
       LEFT JOIN staff s ON s.id = COALESCE(hn.updated_by, hn.created_by)
       WHERE hn.home_id = $1 AND hn.shift_date BETWEEN $2::date AND $3::date
         AND ($4::uuid IS NULL OR hn.su_id = $4::uuid)
         AND NULLIF(TRIM(COALESCE(hn.notes, '')), '') IS NOT NULL
       ORDER BY hn.shift_date DESC, hn.updated_at DESC`,
      [homeId, fromDate, toDate, suId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

router.get('/handover-notes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const { shiftDate, shiftType } = req.query as Record<string, string>;
    if (!shiftDate || !shiftType) { res.json({ success: true, data: [] } as ApiResponse); return; }
    const rows = await query(
      `SELECT hn.*, su.first_name || ' ' || su.last_name AS su_name
       FROM handover_resident_notes hn
       JOIN service_users su ON su.id = hn.su_id
       WHERE hn.home_id = $1 AND hn.shift_date = $2 AND hn.shift_type = $3`,
      [homeId, shiftDate, shiftType]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

router.get('/handover-notes/recent', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const days = Math.min(parseInt(req.query.days as string, 10) || 7, 30);
    const rows = await query(
      `SELECT hn.id, hn.su_id, hn.shift_date, hn.shift_type, hn.notes, hn.updated_at, hn.updated_by,
              su.first_name || ' ' || su.last_name AS su_name,
              s.first_name || ' ' || s.last_name AS staff_name
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

// ── 27. Reviews, Leave, Absence, Complaints & Monthly Reviews History ──
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

router.get('/reviews', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeId, fromDate, toDate, suId } = reportRange(req, 90);
    const rows = await query(
      `SELECT su.first_name || ' ' || su.last_name AS service_user,
              to_char(cr.review_date, 'DD Mon YYYY') AS review_date,
              INITCAP(REPLACE(COALESCE(cr.review_type, 'review'), '_', ' ')) AS review_type,
              COALESCE(s.first_name || ' ' || s.last_name, '—') AS conducted_by,
              COALESCE(NULLIF(TRIM(cr.summary), ''), NULLIF(TRIM(cr.monthly_progress), ''), '—') AS summary,
              COALESCE(NULLIF(TRIM(cr.outcomes), ''), '—') AS outcomes,
              COALESCE(to_char(cr.next_review_date, 'DD Mon YYYY'), '—') AS next_review_due
       FROM su_reviews cr
       JOIN service_users su ON su.id = cr.su_id
       LEFT JOIN staff s ON s.id = cr.conducted_by
       WHERE cr.home_id = $1 AND cr.review_date BETWEEN $2::date AND $3::date
         AND ($4::uuid IS NULL OR cr.su_id = $4::uuid)
       ORDER BY cr.review_date DESC`,
      [homeId, fromDate, toDate, suId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

router.get('/leave', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeId, fromDate, toDate } = reportRange(req, 60);
    const rows = await query(
      `SELECT s.first_name || ' ' || s.last_name AS staff_member,
              INITCAP(REPLACE(COALESCE(sl.leave_type, 'annual'), '_', ' ')) AS leave_type,
              to_char(sl.start_date, 'DD Mon YYYY') AS start_date,
              to_char(sl.end_date, 'DD Mon YYYY') AS end_date,
              COALESCE(sl.hours_requested::text, '—') AS hours_requested,
              INITCAP(COALESCE(sl.status, 'pending')) AS status,
              COALESCE(ap.first_name || ' ' || ap.last_name, '—') AS approved_by,
              COALESCE(NULLIF(TRIM(sl.reason), ''), '—') AS reason
       FROM staff_leave sl
       JOIN staff s ON s.id = sl.staff_id
       LEFT JOIN staff ap ON ap.id = sl.approved_by
       WHERE sl.home_id = $1 AND sl.start_date <= $3::date AND sl.end_date >= $2::date
       ORDER BY sl.start_date DESC`,
      [homeId, fromDate, toDate]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

router.get('/absence', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeId, fromDate, toDate } = reportRange(req, 60);
    const rows = await query(
      `SELECT s.first_name || ' ' || s.last_name AS staff_member,
              INITCAP(REPLACE(COALESCE(sa.absence_type, 'sickness'), '_', ' ')) AS absence_type,
              to_char(sa.absence_start, 'DD Mon YYYY') AS start_date,
              COALESCE(to_char(sa.absence_end, 'DD Mon YYYY'), 'Ongoing') AS end_date,
              CASE WHEN COALESCE(sa.return_to_work_completed, sa.return_completed, false) THEN 'Completed' ELSE 'Pending' END AS return_to_work,
              COALESCE(lg.first_name || ' ' || lg.last_name, '—') AS logged_by,
              COALESCE(NULLIF(TRIM(sa.reason), ''), NULLIF(TRIM(sa.notes), ''), '—') AS reason
       FROM staff_absences sa
       JOIN staff s ON s.id = sa.staff_id
       LEFT JOIN staff lg ON lg.id = COALESCE(sa.logged_by, sa.created_by)
       WHERE sa.home_id = $1 AND sa.absence_start BETWEEN $2::date AND $3::date
       ORDER BY sa.absence_start DESC`,
      [homeId, fromDate, toDate]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

router.get('/complaints', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeId, fromDate, toDate, suId } = reportRange(req, 90);
    const rows = await query(
      `SELECT to_char(COALESCE(qr.entry_date, (qr.created_at AT TIME ZONE 'Europe/London')::date), 'DD Mon YYYY') AS date,
              INITCAP(REPLACE(COALESCE(qr.record_type, 'feedback'), '_', ' ')) AS type,
              COALESCE(su.first_name || ' ' || su.last_name, NULLIF(TRIM(qr.from_name), ''), NULLIF(TRIM(qr.raised_by), ''), '—') AS subject,
              COALESCE(NULLIF(TRIM(qr.summary), ''), NULLIF(TRIM(qr.description), ''), NULLIF(TRIM(qr.detail), ''), '—') AS summary,
              COALESCE(NULLIF(TRIM(qr.action_taken), ''), '—') AS action_taken,
              COALESCE(NULLIF(TRIM(qr.outcome), ''), '—') AS outcome,
              CASE WHEN qr.resolved IS TRUE THEN 'Resolved' ELSE INITCAP(COALESCE(qr.status, 'Open')) END AS status
       FROM quality_records qr
       LEFT JOIN service_users su ON su.id = COALESCE(qr.su_id, qr.subject_su)
       WHERE qr.home_id = $1
         AND COALESCE(qr.entry_date, (qr.created_at AT TIME ZONE 'Europe/London')::date) BETWEEN $2::date AND $3::date
         AND ($4::uuid IS NULL OR COALESCE(qr.su_id, qr.subject_su) = $4::uuid)
       ORDER BY COALESCE(qr.entry_date, (qr.created_at AT TIME ZONE 'Europe/London')::date) DESC`,
      [homeId, fromDate, toDate, suId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// ── 28. GET /api/reports/incident-analysis (Video 8: pulls ALL logged incidents + AI + deterministic fallback) ──
router.get('/incident-analysis', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeId, fromDate, toDate, suId } = reportRange(req, 30);

    const rows = await query<any>(
      `SELECT ri.id, ri.incident_type, ri.location, ri.incident_time,
              ri.description, ri.injuries, ri.injury_details, ri.medical_needed,
              ri.witnesses, ri.immediate_action, ri.manager_reviewed,
              COALESCE(
                NULLIF(TRIM((
                  SELECT string_agg(
                    COALESCE(elem->>'author', 'Manager') || ': ' || COALESCE(elem->>'text', ''),
                    E'\n'
                  )
                  FROM jsonb_array_elements(
                    CASE WHEN jsonb_typeof(ri.review_notes) = 'array' THEN ri.review_notes ELSE '[]'::jsonb END
                  ) elem
                )), ''),
                NULLIF(TRIM(ri.immediate_action), ''),
                '—'
              ) AS outcome,
              COALESCE(dr.record_date, (ri.incident_time AT TIME ZONE 'Europe/London')::date) AS record_date,
              su.first_name || ' ' || su.last_name AS su_name,
              s.first_name || ' ' || s.last_name AS staff_name
       FROM records_incidents ri
       LEFT JOIN daily_records dr ON dr.id = ri.daily_record_id
       LEFT JOIN service_users su ON su.id = dr.su_id
       LEFT JOIN staff s ON s.id = dr.staff_id
       WHERE ($1::uuid IS NULL OR dr.home_id = $1::uuid)
         AND COALESCE(dr.record_date, (ri.incident_time AT TIME ZONE 'Europe/London')::date) BETWEEN $2::date AND $3::date
         AND ($4::uuid IS NULL OR dr.su_id = $4::uuid)
       ORDER BY COALESCE(dr.record_date, (ri.incident_time AT TIME ZONE 'Europe/London')::date) DESC,
                ri.incident_time DESC NULLS LAST
       LIMIT 200`,
      [homeId || null, fromDate, toDate, suId]
    );

    const periodStr = `${fromDate} to ${toDate}`;

    if (rows.length === 0) {
      res.json({
        success: true,
        data: {
          analysis: `No incidents were recorded between ${fromDate} and ${toDate}. Expand the From / To dates above to inspect earlier periods.`,
          incidents: [],
          count: 0,
          period: periodStr,
        },
      });
      return;
    }

    const fallbackAnalysis = buildDeterministicIncidentAnalysis(rows, fromDate, toDate);
    let analysis = fallbackAnalysis;

    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
      try {
        const summary = rows.map((r: any, i: number) => {
          const dStr = r.record_date ? new Date(r.record_date).toISOString().slice(0, 10) : 'Unknown date';
          return `${i + 1}. ${dStr} — ${r.su_name || 'Resident'} (${r.incident_type || 'Incident'} at ${r.location || 'Facility'}): ${String(r.description || 'No description').slice(0, 500)}`;
        }).join('\n');

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'openai/gpt-oss-20b',
            messages: [
              {
                role: 'system',
                content: 'You are a care home quality assurance manager. Analyse incident reports and provide clear, concise clinical insights structured under headings: **Summary**, **Key Patterns**, **Risk Factors**, and **Recommendations**.',
              },
              {
                role: 'user',
                content: `Analyse these ${rows.length} incidents recorded from ${fromDate} to ${toDate}:\n\n${summary}\n\nProvide a concise quality assurance analysis with practical care recommendations.`,
              },
            ],
            max_tokens: 4000,
            temperature: 0.3,
            reasoning_effort: 'low',
          }),
        });

        if (groqRes.ok) {
          const groqData = await groqRes.json() as any;
          const aiText = String(groqData?.choices?.[0]?.message?.content || '').trim();
          if (aiText.length > 40) {
            analysis = aiText;
          }
        }
      } catch (_aiErr) {
        // Keep structured clinical fallback analysis so report never fails
      }
    }

    res.json({
      success: true,
      data: {
        analysis,
        incidents: rows,
        count: rows.length,
        period: periodStr,
      },
    });
  } catch (err) { next(err); }
});

// Backwards-compatible aliases
router.get('/care-plans', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeId, suId } = reportRange(req, 30);
    const rows = await query(
      `SELECT cp.*, su.first_name || ' ' || su.last_name AS su_name,
              st.first_name || ' ' || st.last_name AS created_by_name
       FROM care_plans cp
       JOIN service_users su ON su.id = cp.su_id
       LEFT JOIN staff st ON st.id = cp.created_by
       WHERE cp.home_id = $1 AND cp.is_active IS TRUE
         AND ($2::uuid IS NULL OR cp.su_id = $2::uuid)
       ORDER BY su.last_name, cp.plan_type`,
      [homeId, suId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

router.get('/risk-assessments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeId, suId } = reportRange(req, 30);
    const rows = await query(
      `SELECT ra.*, su.first_name || ' ' || su.last_name AS su_name,
              st.first_name || ' ' || st.last_name AS created_by_name
       FROM risk_assessments ra
       JOIN service_users su ON su.id = ra.su_id
       LEFT JOIN staff st ON st.id = ra.created_by
       WHERE ra.home_id = $1 AND COALESCE(ra.is_active, TRUE) IS TRUE
         AND ($2::uuid IS NULL OR ra.su_id = $2::uuid)
       ORDER BY su.last_name, ra.created_at DESC`,
      [homeId, suId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

router.get('/vitals', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeId, fromDate, toDate, suId } = reportRange(req, 30);
    const rows = await query(
      `SELECT dr.id, dr.record_date, dr.recorded_at, dr.record_type,
              su.first_name || ' ' || su.last_name AS su_name,
              st.first_name || ' ' || st.last_name AS staff_name,
              rv.systolic, rv.diastolic, rv.pulse, rv.temp_celsius,
              rv.spo2_percent, rv.supplemental_o2, rv.weight_kg, rv.bmi
       FROM daily_records dr
       JOIN service_users su ON su.id = dr.su_id
       LEFT JOIN staff st ON st.id = dr.staff_id
       LEFT JOIN records_vitals rv ON rv.daily_record_id = dr.id
       WHERE dr.home_id = $1 AND dr.record_date BETWEEN $2::date AND $3::date
         AND ($4::uuid IS NULL OR dr.su_id = $4::uuid)
         AND dr.record_type IN ('vitals_bp','vitals_temp','vitals_oxygen','vitals_weight')
       ORDER BY dr.recorded_at DESC LIMIT 1000`,
      [homeId, fromDate, toDate, suId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

export default router;
