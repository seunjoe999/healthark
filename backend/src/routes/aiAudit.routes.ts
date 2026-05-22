import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';
import { GoogleGenerativeAI } from '@google/generative-ai';

function getGenAI() {
  const key = process.env.GEMINI_API_KEY || '';
  if (!key || key === 'placeholder') throw Object.assign(new Error('GEMINI_API_KEY not configured'), { isKeyMissing: true });
  return new GoogleGenerativeAI(key);
}

async function callAI(prompt: string): Promise<string> {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-1.5-flash' });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

const router = Router();

function nd(v: any): string | null { return v && String(v).trim() ? String(v).trim() : null; }

router.use(authenticate);

function fromToken(req: Request, field: string): string {
  const token = req.headers.authorization?.substring(7);
  if (token) { const d = jwt.decode(token) as any; return (req.staff as any)?.[field] || d?.[field] || ''; }
  return (req.staff as any)?.[field] || '';
}

// GET /api/audits — list audit reports
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const rows = await query(
      `SELECT ar.*, s.first_name || ' ' || s.last_name as generated_by_name
       FROM audit_reports ar LEFT JOIN staff s ON s.id = ar.generated_by
       WHERE ar.home_id = $1 ORDER BY ar.generated_at DESC LIMIT 50`,
      [homeId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/audits/generate — trigger AI audit
router.post('/generate',
  requireRole('home_manager', 'group_admin'),
  [body('auditType').notEmpty(), body('homeId').optional({ checkFalsy: true }).isUUID()],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      const homeId = req.body.homeId || fromToken(req, 'homeId');
      const { auditType, customName, periodFrom, periodTo } = req.body;

      const from = periodFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const to = periodTo || new Date().toISOString().split('T')[0];

      // Create pending audit record
      const auditRows = await query(
        `INSERT INTO audit_reports (home_id, audit_type, custom_name, period_from, period_to, generated_by, status)
         VALUES ($1,$2,$3,$4,$5,$6,'generating') RETURNING *`,
        [homeId, auditType, customName || null, from, to, staffId]
      );
      const auditId = (auditRows[0] as any).id;

      // Run AI analysis asynchronously
      generateAuditReport(auditId, homeId, auditType, from, to).catch(console.error);

      res.status(202).json({ success: true, data: { id: auditId, status: 'generating', message: 'Audit generation started. Check back in a moment.' } } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// GET /api/audits/:id — get specific audit
router.get('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query('SELECT * FROM audit_reports WHERE id = $1', [req.params.id]);
      if (!rows.length) throw new AppError('Audit not found', 404);
      res.json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// DELETE /api/audits/:id — delete audit (manager+)
router.delete('/:id', requireRole('home_manager', 'group_admin'), param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await query('DELETE FROM audit_reports WHERE id = $1', [req.params.id]);
      res.json({ success: true, message: 'Audit deleted' } as ApiResponse);
    } catch (err) { next(err); }
  }
);

async function generateAuditReport(auditId: string, homeId: string, auditType: string, from: string, to: string) {
  try {
    console.log('AUDIT START: homeId=', homeId, 'type=', auditType, 'from=', from, 'to=', to);
    // Gather data for the audit — run separately to identify failures
    let carePlans: any[] = [], incidents: any[] = [], dailyRecords: any[] = [];
    let fluidData: any[] = [], staffTraining: any[] = [], marRecords: any[] = [], missingRecords: any[] = [];
    try { carePlans = await query(`SELECT cp.plan_type, cp.last_review_date, cp.next_review_date, cp.is_active, su.first_name || ' ' || su.last_name as su_name FROM care_plans cp JOIN service_users su ON su.id = cp.su_id WHERE cp.home_id = $1 AND cp.is_active = true`, [homeId]); console.log('Q1 ok', carePlans.length); } catch(e: any) { console.error('Q1 failed:', e.message); }
    try { incidents = await query(`SELECT dr.notes as incident_type, false as manager_reviewed, dr.record_date, su.first_name || ' ' || su.last_name as su_name FROM daily_records dr JOIN service_users su ON su.id = dr.su_id WHERE dr.home_id = $1 AND dr.record_type = 'incident' AND dr.record_date BETWEEN $2 AND $3`, [homeId, from, to]); console.log('Q2 ok', incidents.length); } catch(e: any) { console.error('Q2 failed:', e.message); }
    try { dailyRecords = await query(`SELECT record_type, COUNT(*) as count FROM daily_records WHERE home_id = $1 AND record_date BETWEEN $2 AND $3 GROUP BY record_type ORDER BY count DESC`, [homeId, from, to]); console.log('Q3 ok', dailyRecords.length); } catch(e: any) { console.error('Q3 failed:', e.message); }
    try { fluidData = await query(`SELECT su.first_name || ' ' || su.last_name as su_name, SUM(COALESCE(dr.amount_ml,0)) as total_ml, dr.record_date FROM daily_records dr JOIN service_users su ON su.id = dr.su_id WHERE dr.home_id = $1 AND dr.record_type = 'fluid_intake' AND dr.record_date BETWEEN $2 AND $3 GROUP BY su.id, su.first_name, su.last_name, su.min_fluid_ml, dr.record_date HAVING SUM(COALESCE(dr.amount_ml,0)) < COALESCE(su.min_fluid_ml,1500)`, [homeId, from, to]); console.log('Q4 ok', fluidData.length); } catch(e: any) { console.error('Q4 failed:', e.message); }
    try { staffTraining = await query(`SELECT s.first_name || ' ' || s.last_name as staff_name, st.course_name, st.expiry_date FROM staff_training st JOIN staff s ON s.id = st.staff_id WHERE s.home_id = $1 AND st.expiry_date IS NOT NULL AND st.expiry_date < CURRENT_DATE + INTERVAL '60 days'`, [homeId]); console.log('Q5 ok', staffTraining.length); } catch(e: any) { console.error('Q5 failed:', e.message); }
    try { marRecords = await query(`SELECT COUNT(*) as total, COUNT(CASE WHEN given = true THEN 1 END) as given, COUNT(CASE WHEN refused = true THEN 1 END) as refused FROM mar_records WHERE home_id = $1 AND record_date BETWEEN $2 AND $3`, [homeId, from, to]); console.log('Q6 ok'); } catch(e: any) { console.error('Q6 failed:', e.message); marRecords = [{ total: 0, given: 0, refused: 0 }]; }
    try { missingRecords = await query(`SELECT su.first_name || ' ' || su.last_name as su_name FROM service_users su WHERE su.home_id = $1 AND su.status = 'live' AND NOT EXISTS (SELECT 1 FROM daily_records dr WHERE dr.su_id = su.id AND dr.record_date = CURRENT_DATE)`, [homeId]); console.log('Q7 ok', missingRecords.length); } catch(e: any) { console.error('Q7 failed:', e.message); }

    if (false) { // dead code to satisfy destructuring removal
    const [___a] = await Promise.all([
      query(`SELECT cp.plan_type, cp.last_review_date, cp.next_review_date, cp.is_active,
                    su.first_name || ' ' || su.last_name as su_name
             FROM care_plans cp JOIN service_users su ON su.id = cp.su_id
             WHERE cp.home_id = $1 AND cp.is_active = true`, [homeId]),
      query(`SELECT dr.notes as incident_type, false as manager_reviewed, dr.record_date,
                    su.first_name || ' ' || su.last_name as su_name
             FROM daily_records dr
             JOIN service_users su ON su.id = dr.su_id
             WHERE dr.home_id = $1 AND dr.record_type = 'incident'
             AND dr.record_date BETWEEN $2 AND $3`, [homeId, from, to]),
      query(`SELECT record_type, COUNT(*) as count FROM daily_records
             WHERE home_id = $1 AND record_date BETWEEN $2 AND $3
             GROUP BY record_type ORDER BY count DESC`, [homeId, from, to]),
      query(`SELECT su.first_name || ' ' || su.last_name as su_name,
                    SUM(CASE WHEN dr.amount_ml IS NOT NULL THEN dr.amount_ml ELSE 0 END) as total_ml,
                    dr.record_date,
                    CASE WHEN SUM(COALESCE(dr.amount_ml,0)) < COALESCE(su.min_fluid_ml,1500) THEN true ELSE false END as below_threshold
             FROM daily_records dr
             JOIN service_users su ON su.id = dr.su_id
             WHERE dr.home_id = $1 AND dr.record_type = 'fluid_intake'
             AND dr.record_date BETWEEN $2 AND $3
             GROUP BY su.id, su.first_name, su.last_name, su.min_fluid_ml, dr.record_date
             HAVING SUM(COALESCE(dr.amount_ml,0)) < COALESCE(su.min_fluid_ml,1500)`, [homeId, from, to]),
      query(`SELECT s.first_name || ' ' || s.last_name as staff_name, st.course_name, st.expiry_date
             FROM staff_training st JOIN staff s ON s.id = st.staff_id
             WHERE s.home_id = $1 AND st.expiry_date IS NOT NULL
             AND st.expiry_date < CURRENT_DATE + INTERVAL '60 days'`, [homeId]),
      query(`SELECT COUNT(*) as total,
                    COUNT(CASE WHEN given = true THEN 1 END) as given,
                    COUNT(CASE WHEN refused = true THEN 1 END) as refused,
                    COUNT(CASE WHEN given IS NULL AND refused = false THEN 1 END) as pending
             FROM mar_records WHERE home_id = $1 AND record_date BETWEEN $2 AND $3`, [homeId, from, to]),
      query(`SELECT su.first_name || ' ' || su.last_name as su_name
             FROM service_users su
             WHERE su.home_id = $1 AND su.status = 'live'
             AND NOT EXISTS (SELECT 1 FROM daily_records dr WHERE dr.su_id = su.id AND dr.record_date = CURRENT_DATE)`, [homeId]),
    ]); } // end dead code
    console.log('AUDIT: data gathered', { carePlans: (carePlans as any[]).length, incidents: (incidents as any[]).length, dailyRecords: (dailyRecords as any[]).length });
    // Build structured findings
    const overduePlans = (carePlans as any[]).filter(cp => cp.next_review_date && new Date(cp.next_review_date) < new Date());
    const unreviewedIncidents = (incidents as any[]).filter(i => !i.manager_reviewed);
    const fluidFlags = fluidData as any[];
    const expiringTraining = staffTraining as any[];
    console.log('AUDIT: building findings for type:', auditType);
    const marStats = (marRecords as any[])[0] || {};
    const todayMissing = missingRecords as any[];

    // Build report text
    const auditLabel = auditType.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
    let findings = `## ${auditLabel} Audit Report\n**Period:** ${from} to ${to}\n\n`;

    switch (auditType) {
      case 'care_plan':
        findings += `### Care Plan Review Compliance\n`;
        findings += `- Total active care plans: **${(carePlans as any[]).length}**\n`;
        findings += `- Overdue for review: **${overduePlans.length}**\n`;
        if (overduePlans.length > 0) {
          findings += `\n**Overdue plans:**\n`;
          overduePlans.forEach((cp: any) => findings += `- ${cp.su_name}: ${cp.plan_type} (due ${cp.next_review_date})\n`);
        }
        findings += overduePlans.length === 0 ? '\n✅ All care plans are current and within review dates.\n' : '\n⚠️ Action required: review overdue care plans immediately.\n';
        break;

      case 'documentation':
        const totalRecords = (dailyRecords as any[]).reduce((sum: number, r: any) => sum + parseInt(r.count), 0);
        findings += `### Documentation Audit\n`;
        findings += `- Total records logged in period: **${totalRecords}**\n`;
        findings += `- Residents with no record today: **${todayMissing.length}**\n\n`;
        findings += `**Record types logged:**\n`;
        (dailyRecords as any[]).forEach((r: any) => findings += `- ${r.record_type.replace(/_/g, ' ')}: ${r.count} records\n`);
        if (todayMissing.length > 0) {
          findings += `\n**Missing today's records:**\n`;
          todayMissing.forEach((su: any) => findings += `- ${su.su_name}\n`);
        }
        break;

      case 'medication':
      case 'mar_chart':
        findings += `### Medication Administration Records\n`;
        findings += `- Total MAR entries: **${marStats.total || 0}**\n`;
        findings += `- Given: **${marStats.given || 0}**\n`;
        findings += `- Refused: **${marStats.refused || 0}**\n`;
        findings += `- Pending/unsigned: **${marStats.pending || 0}**\n`;
        const compliance = marStats.total > 0 ? Math.round((parseInt(marStats.given || 0) / parseInt(marStats.total)) * 100) : 0;
        findings += `\n**Compliance rate: ${compliance}%**\n`;
        findings += compliance >= 95 ? '\n✅ MAR compliance is within acceptable range.\n' : '\n⚠️ MAR compliance is below 95% — review unsigned entries.\n';
        break;

      case 'incident_analysis':
        findings += `### Incident Analysis\n`;
        findings += `- Total incidents in period: **${(incidents as any[]).length}**\n`;
        findings += `- Not reviewed by management: **${unreviewedIncidents.length}**\n`;
        if (unreviewedIncidents.length > 0) {
          findings += `\n**Unreviewed incidents:**\n`;
          unreviewedIncidents.forEach((i: any) => findings += `- ${i.su_name}: ${i.incident_type} on ${i.record_date}\n`);
        }
        const byType: Record<string, number> = {};
        (incidents as any[]).forEach((i: any) => { byType[i.incident_type] = (byType[i.incident_type] || 0) + 1; });
        if (Object.keys(byType).length > 0) {
          findings += `\n**By type:**\n`;
          Object.entries(byType).forEach(([type, count]) => findings += `- ${type}: ${count}\n`);
        }
        break;

      case 'nutrition_hydration':
        findings += `### Nutrition & Hydration Audit\n`;
        findings += `- Fluid intake below threshold (in period): **${fluidFlags.length} instances**\n`;
        if (fluidFlags.length > 0) {
          findings += `\n**Below threshold instances:**\n`;
          fluidFlags.forEach((f: any) => findings += `- ${f.su_name}: ${f.total_ml}ml on ${f.record_date}\n`);
        }
        findings += fluidFlags.length === 0 ? '\n✅ All residents met their fluid intake targets.\n' : '\n⚠️ Action required: review fluid intake for affected residents.\n';
        break;

      case 'safeguarding':
        const safeguardingRows = await query(
          `SELECT sc.*, su.first_name || ' ' || su.last_name as su_name
           FROM safeguarding_concerns sc JOIN service_users su ON su.id = sc.su_id
           WHERE sc.home_id = $1 AND sc.incident_date BETWEEN $2 AND $3`,
          [homeId, from, to]
        );
        findings += `### Safeguarding Audit\n`;
        findings += `- Total concerns raised: **${(safeguardingRows as any[]).length}**\n`;
        findings += `- Not yet acknowledged: **${(safeguardingRows as any[]).filter((s: any) => !s.manager_ack).length}**\n`;
        (safeguardingRows as any[]).forEach((s: any) => {
          findings += `\n**${s.su_name}** (${s.incident_date})\n`;
          findings += `- ${s.overview?.substring(0, 100)}...\n`;
          findings += `- Status: ${s.manager_ack ? '✅ Acknowledged' : '⚠️ Pending acknowledgement'}\n`;
        });
        break;

      default:
        findings += `### ${auditLabel}\n`;
        findings += `- Total daily records in period: **${(dailyRecords as any[]).reduce((s: number, r: any) => s + parseInt(r.count), 0)}**\n`;
        findings += `- Active care plans: **${(carePlans as any[]).length}**\n`;
        findings += `- Overdue care plan reviews: **${overduePlans.length}**\n`;
        findings += `- Incidents: **${(incidents as any[]).length}**\n`;
        findings += `- Fluid below threshold: **${fluidFlags.length}**\n`;
        findings += `- Training expiring: **${expiringTraining.length}**\n`;
    }

    // Build recommendations
    let recommendations = '';
    if (overduePlans.length > 0) recommendations += `- Review and update ${overduePlans.length} overdue care plan(s) immediately\n`;
    if (unreviewedIncidents.length > 0) recommendations += `- Review and sign off ${unreviewedIncidents.length} unreviewed incident(s)\n`;
    if (fluidFlags.length > 0) recommendations += `- Investigate fluid intake for residents with below-threshold recordings\n`;
    if (expiringTraining.length > 0) recommendations += `- Arrange renewal for ${expiringTraining.length} expiring training certificate(s)\n`;
    if (!recommendations) recommendations = '- No immediate actions required. Continue monitoring.';

    console.log('AUDIT: findings built, saving...');
    const checksTotal = (carePlans as any[]).length + (incidents as any[]).length + (dailyRecords as any[]).length;
    const checksFailed = overduePlans.length + unreviewedIncidents.length + fluidFlags.length;

    await query(
      `UPDATE audit_reports SET
        status = 'completed', findings = $1, recommendations = $2, raw_report = $3,
        total_checks = $4, checks_passed = $5, checks_failed = $6, generated_at = NOW()
       WHERE id = $7`,
      [findings, recommendations, findings, checksTotal, checksTotal - checksFailed, checksFailed, auditId]
    );
  } catch (err: any) {
    console.error('Audit generation failed:', err?.message || err);
    console.error('Stack:', err?.stack);
    await query(`UPDATE audit_reports SET status = 'failed', findings = $1 WHERE id = $2`,
      [`Audit failed: ${err?.message || 'Unknown error'}`, auditId]);
  }
}

// POST /api/audits/:id/ai-action-plan — AI generates detailed action plan
router.post('/:id/ai-action-plan', requireRole('home_manager', 'group_admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query('SELECT * FROM audit_reports WHERE id = $1', [req.params.id]);
      if (!rows.length) throw new AppError('Audit not found', 404);
      const audit = rows[0] as any;

      if (!audit.recommendations) throw new AppError('No recommendations to process', 400);

      const prompt = `You are a care home compliance expert helping a UK care home create a detailed action plan from audit recommendations.

Audit type: ${audit.audit_type?.replace(/_/g, ' ')}
Audit period: ${audit.period_from} to ${audit.period_to}
Compliance score: ${audit.total_checks > 0 ? Math.round((audit.checks_passed / audit.total_checks) * 100) : 'N/A'}%

Recommendations from the audit:
${audit.recommendations}

Findings context:
${(audit.findings || '').substring(0, 1500)}

For each recommendation, create a specific, practical action plan item. Return a JSON array only (no markdown, no explanation) with this exact structure:
[
  {
    "recommendation": "brief version of the original recommendation",
    "action": "specific step-by-step action to take",
    "who": "who is responsible (e.g. Home Manager, Senior Carer, All Staff)",
    "priority": "high | medium | low",
    "deadline": "e.g. Within 24 hours | Within 1 week | Within 1 month",
    "expected_outcome": "what improvement this will achieve"
  }
]`;

      const raw = await callAI(prompt);
      let items: any[] = [];
      try {
        const match = raw.match(/\[[\s\S]*\]/);
        items = JSON.parse(match ? match[0] : raw);
      } catch {
        throw new AppError('AI returned unexpected format — please try again', 500);
      }

      res.json({ success: true, data: items } as ApiResponse);
    } catch (err: any) {
      if (err?.isKeyMissing || err?.status === 401 || err?.message?.includes('API key') || err?.message?.includes('GEMINI_API_KEY')) {
        return res.status(400).json({ success: false, error: 'AI API key not configured. Please set GEMINI_API_KEY in your backend/.env file. Get a free key at https://aistudio.google.com/app/apikey' } as ApiResponse);
      }
      next(err);
    }
  }
);

// POST /api/audits/:id/ai-compliance-fix — AI generates compliance improvement plan
router.post('/:id/ai-compliance-fix', requireRole('home_manager', 'group_admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query('SELECT * FROM audit_reports WHERE id = $1', [req.params.id]);
      if (!rows.length) throw new AppError('Audit not found', 404);
      const audit = rows[0] as any;

      const score = audit.total_checks > 0 ? Math.round((audit.checks_passed / audit.total_checks) * 100) : 0;

      const prompt = `You are a UK care home compliance expert. A care home has completed an audit and needs a targeted improvement plan to raise their compliance score.

Audit type: ${audit.audit_type?.replace(/_/g, ' ')}
Current compliance score: ${score}%
Total checks: ${audit.total_checks}
Passed: ${audit.checks_passed}
Failed: ${audit.checks_failed}

Audit findings:
${(audit.findings || '').substring(0, 2000)}

Create a compliance improvement plan. Return JSON only (no markdown) with this structure:
{
  "current_rating": "Outstanding | Good | Requires Improvement | Inadequate",
  "target_rating": "what rating is achievable",
  "projected_score": number (realistic target score percentage),
  "summary": "2-3 sentence executive summary of the situation",
  "immediate_actions": ["specific action string 1", "action string 2"],
  "short_term": ["action within 1-4 weeks string 1", "action string 2"],
  "long_term": ["action within 1-3 months string 1", "action string 2"],
  "cqc_notes": "brief note on CQC implications and what inspectors would look for"
}`;

      const raw = await callAI(prompt);
      let plan: any = {};
      try {
        const match = raw.match(/\{[\s\S]*\}/);
        plan = JSON.parse(match ? match[0] : raw);
      } catch {
        throw new AppError('AI returned unexpected format — please try again', 500);
      }

      res.json({ success: true, data: plan } as ApiResponse);
    } catch (err: any) {
      if (err?.isKeyMissing || err?.status === 401 || err?.message?.includes('API key') || err?.message?.includes('GEMINI_API_KEY')) {
        return res.status(400).json({ success: false, error: 'AI API key not configured. Please set GEMINI_API_KEY in your backend/.env file. Get a free key at https://aistudio.google.com/app/apikey' } as ApiResponse);
      }
      next(err);
    }
  }
);

export default router;
