import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
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

function score(compliant: number, total: number): number {
  if (total === 0) return 100;
  return Math.round((compliant / total) * 100);
}

// GET /api/compliance/dashboard?homeId=
router.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
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

    // --- Incidents last 30 days (records_incidents joined to daily_records) ---
    const incidentRows = await query<{ total: string; falls: string; med_errors: string }>(
      `SELECT
         COUNT(*) as total,
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
    // Safeguarding: no open unacknowledged = 100, each unacknowledged case reduces score
    const safeguardingScore = openCases === 0 ? 100 : Math.max(0, 100 - (unacknowledged * 25) - ((openCases - unacknowledged) * 10));

    const inc = incidentRows[0] || { total: '0', falls: '0', med_errors: '0' };
    const incidentTotal = parseInt(inc.total, 10);
    const incidentScore = Math.max(0, 100 - incidentTotal * 5);

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
    const alertScore = Math.max(0, 100 - alertUnresolved * 10);

    const auditTotal = parseInt((auditRows[0] || { total: '0' }).total, 10);
    const auditScore = Math.min(100, Math.round((auditTotal / 3) * 100));

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
            : `${openCases} open concern${openCases !== 1 ? 's' : ''} (${unacknowledged} unacknowledged)`,
        },
        incidents: {
          score: incidentScore,
          total: incidentTotal,
          falls: parseInt(inc.falls, 10),
          medErrors: parseInt(inc.med_errors, 10),
          label: 'Incidents (30 days)',
          metric: incidentTotal === 0
            ? 'No incidents reported'
            : `${incidentTotal} incident${incidentTotal !== 1 ? 's' : ''} — ${inc.falls} fall${parseInt(inc.falls, 10) !== 1 ? 's' : ''}, ${inc.med_errors} med error${parseInt(inc.med_errors, 10) !== 1 ? 's' : ''}`,
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
      `  - ${v.label}: ${v.score}% — ${v.metric}`
    ).join('\n');

    const prompt = `You are a senior UK care home CQC compliance consultant. A care home has the following live compliance scores:

OVERALL COMPLIANCE: ${overallScore}% (${currentRating})

AREA BREAKDOWN:
${ctx}

Create a targeted improvement plan to raise their overall compliance to at least 85% (CQC "Good" standard). Every action must directly address one of the area scores above.

Return valid JSON only — no markdown, no code fences:
{
  "summary": "2-3 sentences: what the main problems are and what the plan will achieve — be specific to the data",
  "projected_score": <realistic number between ${Math.min(overallScore + 12, 95)} and 95>,
  "immediate_actions": [
    "Specific action referencing actual area data — do within 24-48 hours",
    "Another specific action"
  ],
  "short_term": [
    "Specific action to complete within 1-4 weeks — reference an area score",
    "Another specific action"
  ],
  "long_term": [
    "Systemic improvement within 1-3 months — reference an area",
    "Another systemic change"
  ],
  "cqc_notes": "What a CQC inspector would look for when visiting — reference specific Regulations (9, 10, 12, 17, 18 etc) tied to the lowest scoring areas"
}

Each array must have 2-4 items. Be specific, not generic.`;

    const fetchRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500,
        temperature: 0.3,
      }),
    });
    if (!fetchRes.ok) {
      const errData = await fetchRes.json().catch(() => ({})) as any;
      throw new Error(errData?.error?.message || `Groq API error ${fetchRes.status}`);
    }
    const fetchData = await fetchRes.json() as any;
    const raw: string = fetchData.choices?.[0]?.message?.content || '';
    let plan: any = {};
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      plan = JSON.parse(match ? match[0] : raw);
    } catch { throw new Error('AI returned unexpected format — please try again'); }

    res.json({ success: true, data: plan } as ApiResponse);
  } catch (err) { next(err); }
});

export default router;
