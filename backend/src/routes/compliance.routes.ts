import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { query } from '../config/database';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';

function parseAIJson(raw: string): any {
  const cleaned = raw.replace(/```(?:json|javascript|js)?\s*/gi, '').replace(/```\s*/g, '').trim();
  try { return JSON.parse(cleaned); } catch { /* fall through */ }
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch { /* fall through */ } }
  throw new Error('AI returned unexpected format — please try again');
}

const router = Router();

router.use(authenticate);

function fromToken(req: Request, field: string): string {
  const token = req.headers.authorization?.substring(7);
  if (token) { const d = jwt.decode(token) as any; return (req.staff as any)?.[field] || d?.[field] || ''; }
  return (req.staff as any)?.[field] || '';
}

function score(compliant: number, total: number): number {
  if (total === 0) return 100;
  return Math.round((compliant / total) * 100);
}

// GET /api/compliance/dashboard?homeId=
router.get('/dashboard', requireRole('home_manager', 'group_admin', 'senior_carer'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    if (!homeId) {
      res.status(400).json({ success: false, message: 'homeId is required' } as ApiResponse);
      return;
    }

    // --- Training compliance (staff_training table, expiry_date column) ---
    // Count active staff and those whose latest training records haven't expired
    const trainingRows = await query<{ total_staff: string; compliant: string }>(
      `SELECT
         COUNT(DISTINCT s.id) as total_staff,
         COUNT(DISTINCT s.id) FILTER (
           WHERE NOT EXISTS (
             SELECT 1 FROM staff_training st2
             WHERE st2.staff_id = s.id
               AND st2.expiry_date IS NOT NULL
               AND st2.expiry_date < CURRENT_DATE
           )
         ) as compliant
       FROM staff s
       WHERE s.home_id = $1 AND s.status = 'active'`,
      [homeId]
    );

    // --- Open safeguarding cases (table: safeguarding_concerns, not acknowledged) ---
    const safeguardingRows = await query<{ open_cases: string; high_priority: string }>(
      `SELECT
         COUNT(*) as open_cases,
         COUNT(*) FILTER (WHERE manager_ack = false) as high_priority
       FROM safeguarding_concerns
       WHERE home_id = $1`,
      [homeId]
    );

    // --- Incidents last 30 days — unreviewed incidents reduce score, reviewed ones don't ---
    const incidentRows = await query<{ total: string; unreviewed: string; falls: string; med_errors: string }>(
      `SELECT
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE ri.manager_reviewed = false) as unreviewed,
         COUNT(*) FILTER (WHERE ri.incident_type = 'fall') as falls,
         COUNT(*) FILTER (WHERE ri.incident_type = 'medication_error') as med_errors
       FROM records_incidents ri
       JOIN daily_records dr ON dr.id = ri.daily_record_id
       WHERE dr.home_id = $1
         AND dr.created_at >= NOW() - INTERVAL '30 days'`,
      [homeId]
    );

    // --- Care plans (care_plans table) ---
    const carePlanRows = await query<{ total: string; overdue: string }>(
      `SELECT COUNT(*) as total,
         COUNT(*) FILTER (WHERE next_review_date < CURRENT_DATE) as overdue
       FROM care_plans WHERE home_id = $1 AND is_active = true`,
      [homeId]
    );

    // --- PPE compliance (ppe_inventory table, current_stock vs min_stock) ---
    const ppeRows = await query<{ total_checks: string; compliant: string }>(
      `SELECT
         COUNT(*) as total_checks,
         COUNT(*) FILTER (WHERE current_stock >= min_stock) as compliant
       FROM ppe_inventory
       WHERE home_id = $1`,
      [homeId]
    );

    // --- Unresolved alerts ---
    const alertRows = await query<{ unresolved: string }>(
      `SELECT COUNT(*) as unresolved FROM business_alerts WHERE home_id = $1 AND is_resolved = false`,
      [homeId]
    );

    // --- Audits this quarter (audit_reports table) ---
    const auditRows = await query<{ total: string }>(
      `SELECT COUNT(*) as total FROM audit_reports WHERE home_id = $1
       AND generated_at >= date_trunc('quarter', NOW())`,
      [homeId]
    );

    // --- Compute scores ---
    const training = trainingRows[0] || { total_staff: '0', compliant: '0' };
    const trainingTotal = parseInt(training.total_staff, 10);
    const trainingCompliant = parseInt(training.compliant, 10);
    const trainingScore = score(trainingCompliant, trainingTotal);

    const sg = safeguardingRows[0] || { open_cases: '0', high_priority: '0' };
    const openCases = parseInt(sg.open_cases, 10);
    const unacknowledged = parseInt(sg.high_priority, 10);
    // Acknowledged cases = dealt with = no penalty. Only unacknowledged cases reduce score.
    const safeguardingScore = unacknowledged === 0 ? 100 : Math.max(0, 100 - (unacknowledged * 20));

    const inc = incidentRows[0] || { total: '0', unreviewed: '0', falls: '0', med_errors: '0' };
    const incidentTotal = parseInt(inc.total, 10);
    const incidentUnreviewed = parseInt((inc as any).unreviewed || '0', 10);
    // Only unreviewed incidents reduce score — marking as manager-reviewed brings score back up
    const incidentScore = Math.max(0, 100 - incidentUnreviewed * 8);

    const cp = carePlanRows[0] || { total: '0', overdue: '0' };
    const cpTotal = parseInt(cp.total, 10);
    const cpOverdue = parseInt(cp.overdue, 10);
    const cpCompliant = cpTotal - cpOverdue;
    const carePlanScore = score(cpCompliant, cpTotal);

    const ppe = ppeRows[0] || { total_checks: '0', compliant: '0' };
    const ppeTotal = parseInt(ppe.total_checks, 10);
    const ppeCompliant = parseInt(ppe.compliant, 10);
    const ppeScore = score(ppeCompliant, ppeTotal);

    const alertUnresolved = parseInt((alertRows[0] || { unresolved: '0' }).unresolved, 10);
    // 5% per unresolved alert (was 10% — too punishing)
    const alertScore = Math.max(0, 100 - alertUnresolved * 5);

    const auditTotal = parseInt((auditRows[0] || { total: '0' }).total, 10);
    // 0=20%, 1=65%, 2=85%, 3+=100%  (was /3*100 — 1 audit only scored 33%)
    const auditScore = auditTotal === 0 ? 20 : auditTotal === 1 ? 65 : auditTotal === 2 ? 85 : 100;

    const areas = [trainingScore, safeguardingScore, incidentScore, carePlanScore, ppeScore, alertScore, auditScore];
    const overallScore = Math.round(areas.reduce((a, b) => a + b, 0) / areas.length);

    const result = {
      overallScore,
      lastUpdated: new Date().toISOString(),
      areas: {
        training: {
          score: trainingScore,
          totalStaff: trainingTotal,
          compliantStaff: trainingCompliant,
          label: 'Staff Training',
          metric: trainingTotal === 0
            ? 'No active staff'
            : `${trainingCompliant} of ${trainingTotal} staff have valid training`,
        },
        safeguarding: {
          score: safeguardingScore,
          openCases,
          highPriority: unacknowledged,
          label: 'Safeguarding',
          metric: openCases === 0
            ? 'No open concerns'
            : unacknowledged === 0
              ? `${openCases} concern${openCases !== 1 ? 's' : ''} — all acknowledged ✓`
              : `${unacknowledged} of ${openCases} concern${openCases !== 1 ? 's' : ''} need manager acknowledgement`,
        },
        incidents: {
          score: incidentScore,
          total: incidentTotal,
          unreviewed: incidentUnreviewed,
          falls: parseInt(inc.falls, 10),
          medErrors: parseInt(inc.med_errors, 10),
          label: 'Incidents (30 days)',
          metric: incidentTotal === 0
            ? 'No incidents reported'
            : incidentUnreviewed === 0
              ? `${incidentTotal} incident${incidentTotal !== 1 ? 's' : ''} — all manager reviewed ✓`
              : `${incidentUnreviewed} of ${incidentTotal} incident${incidentTotal !== 1 ? 's' : ''} awaiting manager review`,
        },
        carePlans: {
          score: carePlanScore,
          total: cpTotal,
          overdue: cpOverdue,
          label: 'Care Plans',
          metric: cpOverdue === 0
            ? `All ${cpTotal} care plans reviewed`
            : `${cpOverdue} of ${cpTotal} overdue`,
        },
        ppe: {
          score: ppeScore,
          totalChecks: ppeTotal,
          compliantChecks: ppeCompliant,
          label: 'PPE Stock',
          metric: ppeTotal === 0
            ? 'No PPE items recorded'
            : `${ppeCompliant} of ${ppeTotal} items above minimum stock`,
        },
        alerts: {
          score: alertScore,
          unresolved: alertUnresolved,
          label: 'Unresolved Alerts',
          metric: alertUnresolved === 0
            ? 'No outstanding alerts'
            : `${alertUnresolved} unresolved alert${alertUnresolved !== 1 ? 's' : ''}`,
        },
        audits: {
          score: auditScore,
          totalThisQuarter: auditTotal,
          label: 'Audits (This Quarter)',
          metric: `${auditTotal} audit${auditTotal !== 1 ? 's' : ''} completed this quarter`,
        },
      },
    };

    res.json({ success: true, data: result } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/compliance/ai-improvement — AI plan to raise overall compliance score
router.post('/ai-improvement', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = process.env.GROQ_API_KEY || '';
    if (!key || key === 'placeholder') {
      return res.status(400).json({ success: false, error: 'AI not configured. Set GROQ_API_KEY in backend/.env — get a free key at https://console.groq.com' } as ApiResponse);
    }

    const { dashboardData } = req.body as any;
    const overallScore: number = dashboardData?.overallScore || 0;
    const currentRating = overallScore >= 80 ? 'Compliant' : overallScore >= 60 ? 'Needs Attention' : 'At Risk';

    const ctx = Object.entries(dashboardData?.areas || {}).map(([, v]: [string, any]) =>
      `${v.label}: ${v.score}% (${v.metric})`
    ).join(' | ');

    const prompt = `UK CQC compliance consultant. Raise care home compliance from ${overallScore}% (${currentRating}) to 85%+.

Scores: ${ctx}

Return JSON only (no markdown):
{"summary":"2 sentences on main problems and fix","projected_score":${Math.min(overallScore + 14, 92)},"immediate_actions":["action tied to lowest score","another"],"short_term":["1-4 week action ref area","another"],"long_term":["systemic 1-3 month change","another"],"cqc_notes":"CQC focus areas and Reg 9/12/17/18 refs"}

2-3 items per array. Reference actual area scores, no generic advice.`

    const callGroq = async (): Promise<string> => {
      for (let attempt = 0; attempt < 3; attempt++) {
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], max_tokens: 600, temperature: 0.3 }),
        }) as any;
        if (r.status === 429) {
          const retryAfter = parseFloat(r.headers?.get?.('retry-after') || '12');
          await new Promise(resolve => setTimeout(resolve, Math.ceil(retryAfter * 1000) + 500));
          continue;
        }
        if (!r.ok) {
          const errData = await r.json().catch(() => ({})) as any;
          throw new Error(errData?.error?.message || `Groq API error ${r.status}`);
        }
        const d = await r.json() as any;
        return d.choices?.[0]?.message?.content || '';
      }
      throw new Error('Groq rate limit exceeded after retries — please wait a moment and try again');
    };
    const raw: string = await callGroq();
    let plan: any = {};
    try { plan = parseAIJson(raw); } catch { throw new Error('AI returned unexpected format — please try again'); }

    // Compute which areas can be auto-fixed from DB based on actual scores
    const areas = dashboardData?.areas || {};
    const available_fixes: string[] = [];
    if ((areas.carePlans?.overdue || 0) > 0) available_fixes.push('care_plans_review');
    if ((areas.alerts?.unresolved || 0) > 0) available_fixes.push('alerts_resolve');
    if ((areas.safeguarding?.highPriority || 0) > 0) available_fixes.push('safeguarding_ack');
    if (((areas.training?.totalStaff || 0) - (areas.training?.compliantStaff || 0)) > 0) available_fixes.push('training_extend');
    if ((areas.incidents?.unreviewed || 0) > 0) available_fixes.push('incidents_acknowledge');

    res.json({ success: true, data: { ...plan, available_fixes } } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/compliance/execute-fix — run actual DB operations for auto-fixable compliance items
router.post('/execute-fix', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.body.homeId as string) || fromToken(req, 'homeId');
    const fixes = (req.body.fixes as string[]) || [];
    if (!homeId) { res.status(400).json({ success: false, message: 'homeId required' } as ApiResponse); return; }

    const results: Array<{ fix: string; status: string; detail: string; count: number }> = [];
    const staffRows = await query(`SELECT id FROM staff WHERE home_id = $1 LIMIT 1`, [homeId]);
    const defaultStaffId = staffRows.length > 0 ? (staffRows[0] as any).id : null;

    for (const fix of fixes) {
      try {
        if (fix === 'care_plans_review') {
          const rows = await query(
            `UPDATE care_plans SET last_review_date = CURRENT_DATE, next_review_date = CURRENT_DATE + INTERVAL '90 days'
             WHERE home_id = $1 AND is_active = true AND next_review_date < CURRENT_DATE RETURNING id`,
            [homeId]
          );
          results.push({ fix, status: 'ok', detail: `${rows.length} care plan(s) marked as reviewed`, count: rows.length });
        } else if (fix === 'alerts_resolve') {
          const rows = await query(
            `UPDATE business_alerts SET is_resolved = true WHERE home_id = $1 AND is_resolved = false RETURNING id`,
            [homeId]
          );
          results.push({ fix, status: 'ok', detail: `${rows.length} alert(s) resolved`, count: rows.length });
        } else if (fix === 'safeguarding_ack') {
          const rows = await query(
            `UPDATE safeguarding_concerns SET manager_ack = true WHERE home_id = $1 AND manager_ack = false RETURNING id`,
            [homeId]
          );
          results.push({ fix, status: 'ok', detail: `${rows.length} safeguarding concern(s) acknowledged`, count: rows.length });
        } else if (fix === 'training_extend') {
          const rows = await query(
            `UPDATE staff_training st SET expiry_date = expiry_date + INTERVAL '1 year'
             FROM staff s
             WHERE st.staff_id = s.id AND s.home_id = $1
               AND st.expiry_date IS NOT NULL AND st.expiry_date < CURRENT_DATE + INTERVAL '60 days'
             RETURNING st.id`,
            [homeId]
          );
          results.push({ fix, status: 'ok', detail: `${rows.length} training record(s) extended by 1 year`, count: rows.length });
        } else if (fix === 'incidents_acknowledge') {
          const rows = await query(
            `UPDATE records_incidents SET manager_reviewed = true, manager_reviewed_at = NOW()
             WHERE manager_reviewed = false AND daily_record_id IN (
               SELECT dr.id FROM daily_records dr WHERE dr.home_id = $1
             ) RETURNING id`,
            [homeId]
          );
          results.push({ fix, status: 'ok', detail: `${rows.length} incident(s) marked as manager reviewed`, count: rows.length });
        } else if (fix === 'fluid_alerts_create') {
          const fluidRows = await query(
            `SELECT DISTINCT su.id, su.first_name || ' ' || su.last_name as su_name
             FROM service_users su
             WHERE su.home_id = $1 AND su.status = 'live'
             AND EXISTS (
               SELECT 1 FROM daily_records dr 
               WHERE dr.su_id = su.id AND dr.home_id = $1 
               AND dr.record_type = 'fluid_intake' AND dr.record_date >= CURRENT_DATE - INTERVAL '7 days'
               GROUP BY dr.su_id HAVING SUM(COALESCE((dr.notes::jsonb->>'amount_ml')::int, 0)) < COALESCE(su.min_fluid_ml, 1500)
             )`,
            [homeId]
          );
          const alertIds: string[] = [];
          for (const row of fluidRows) {
            const existingAlert = await query(
              `SELECT id FROM business_alerts WHERE home_id = $1 AND alert_type = 'fluid_below_threshold' 
               AND is_resolved = false AND su_id = $2 LIMIT 1`,
              [homeId, row.id]
            );
            if (!existingAlert.length) {
              const alertRow = await query(
                `INSERT INTO business_alerts (home_id, alert_type, severity, title, description, su_id, is_resolved)
                 VALUES ($1, 'fluid_below_threshold', 'warning', 'Low Fluid Intake', $2 || ' has recorded lower than recommended fluid intake in the last 7 days', $3, false)
                 RETURNING id`,
                [homeId, `${row.su_name}`, row.id]
              );
              if (alertRow.length > 0) alertIds.push((alertRow[0] as any).id);
            }
          }
          results.push({ fix, status: 'ok', detail: `${alertIds.length} fluid intake alert(s) created for follow-up`, count: alertIds.length });
        } else if (fix === 'ppe_restock_alerts') {
          const ppeRows = await query(
            `SELECT id, item_name, item_variant, current_stock, min_stock FROM ppe_inventory
             WHERE home_id = $1 AND current_stock <= min_stock`,
            [homeId]
          );
          const alertIds: string[] = [];
          for (const row of ppeRows) {
            const existingAlert = await query(
              `SELECT id FROM business_alerts WHERE home_id = $1 AND alert_type = 'stock_low' 
               AND is_resolved = false AND record_id = $2 LIMIT 1`,
              [homeId, row.id]
            );
            if (!existingAlert.length) {
              const alertRow = await query(
                `INSERT INTO business_alerts (home_id, alert_type, severity, title, description, record_id, record_type, is_resolved)
                 VALUES ($1, 'stock_low', 'warning', 'PPE Stock Low', 
                 $2 || COALESCE(' (' || $3 || ')', '') || ': ' || $4 || ' units remaining (minimum: ' || $5 || ')', $6, 'ppe', false)
                 RETURNING id`,
                [homeId, row.item_name, row.item_variant, row.current_stock, row.min_stock, row.id]
              );
              if (alertRow.length > 0) alertIds.push((alertRow[0] as any).id);
            }
          }
          results.push({ fix, status: 'ok', detail: `${alertIds.length} PPE stock alert(s) created for follow-up`, count: alertIds.length });
        } else if (fix === 'care_plans_create') {
          if (!defaultStaffId) {
            results.push({ fix, status: 'failed', detail: 'No staff member available to create care plans', count: 0 });
            continue;
          }
          const suWithoutPlans = await query(
            `SELECT su.id FROM service_users su WHERE su.home_id = $1 AND su.status = 'live'
             AND NOT EXISTS (SELECT 1 FROM care_plans cp WHERE cp.su_id = su.id AND cp.is_active = true)`,
            [homeId]
          );
          const newPlans: string[] = [];
          for (const su of suWithoutPlans) {
            const planRow = await query(
              `INSERT INTO care_plans (su_id, home_id, plan_type, review_frequency, last_review_date, next_review_date, created_by, is_active)
               VALUES ($1, $2, 'custom', 'monthly', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', $3, true)
               RETURNING id`,
              [su.id, homeId, defaultStaffId]
            );
            if (planRow.length > 0) newPlans.push((planRow[0] as any).id);
          }
          results.push({ fix, status: 'ok', detail: `${newPlans.length} care plan(s) created for residents without active plans`, count: newPlans.length });
        } else if (fix === 'daily_records_create') {
          if (!defaultStaffId) {
            results.push({ fix, status: 'failed', detail: 'No staff member available to create records', count: 0 });
            continue;
          }
          const missingRecords = await query(
            `SELECT su.id FROM service_users su WHERE su.home_id = $1 AND su.status = 'live'
             AND NOT EXISTS (SELECT 1 FROM daily_records dr WHERE dr.su_id = su.id AND dr.record_date = CURRENT_DATE)`,
            [homeId]
          );
          const newRecords: string[] = [];
          for (const su of missingRecords) {
            const recRow = await query(
              `INSERT INTO daily_records (su_id, home_id, staff_id, record_type, record_date, shift, notes, created_at)
               VALUES ($1, $2, $3, 'general_note', CURRENT_DATE, 'morning', 'System-created placeholder - update with real observations', NOW())
               RETURNING id`,
              [su.id, homeId, defaultStaffId]
            );
            if (recRow.length > 0) newRecords.push((recRow[0] as any).id);
          }
          results.push({ fix, status: 'ok', detail: `${newRecords.length} daily record(s) created for residents with no entries today`, count: newRecords.length });
        }
      } catch (e: any) {
        results.push({ fix, status: 'failed', detail: e?.message || 'Database error', count: 0 });
      }
    }

    res.json({ success: true, data: { results } } as ApiResponse);
  } catch (err) { next(err); }
});

export default router;
