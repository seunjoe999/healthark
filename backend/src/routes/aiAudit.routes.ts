import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';
async function callAI(prompt: string): Promise<string> {
  const key = process.env.GROQ_API_KEY || '';
  if (!key || key === 'placeholder') throw Object.assign(new Error('GROQ_API_KEY not configured'), { isKeyMissing: true });

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.3,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as any;
    throw Object.assign(new Error(err?.error?.message || `Groq API error ${res.status}`), { isKeyMissing: res.status === 401 });
  }
  const data = await res.json() as any;
  return data.choices?.[0]?.message?.content || '';
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
    // ── Gather live data ──────────────────────────────────────────────────────
    let carePlans: any[] = [], incidents: any[] = [], dailyRecords: any[] = []
    let fluidData: any[] = [], staffTraining: any[] = [], marRecords: any[] = [], missingRecords: any[] = []
    let safeguardingRows: any[] = []

    await Promise.allSettled([
      query(`SELECT cp.plan_type, cp.last_review_date, cp.next_review_date, cp.is_active,
                    su.first_name || ' ' || su.last_name as su_name
             FROM care_plans cp JOIN service_users su ON su.id = cp.su_id
             WHERE cp.home_id = $1 AND cp.is_active = true`, [homeId]).then(r => { carePlans = r }),
      query(`SELECT dr.notes as incident_type, false as manager_reviewed, dr.record_date,
                    su.first_name || ' ' || su.last_name as su_name
             FROM daily_records dr JOIN service_users su ON su.id = dr.su_id
             WHERE dr.home_id = $1 AND dr.record_type = 'incident'
             AND dr.record_date BETWEEN $2 AND $3`, [homeId, from, to]).then(r => { incidents = r }),
      query(`SELECT record_type, COUNT(*) as count FROM daily_records
             WHERE home_id = $1 AND record_date BETWEEN $2 AND $3
             GROUP BY record_type ORDER BY count DESC`, [homeId, from, to]).then(r => { dailyRecords = r }),
      query(`SELECT su.first_name || ' ' || su.last_name as su_name,
                    SUM(COALESCE(dr.amount_ml,0)) as total_ml, dr.record_date
             FROM daily_records dr JOIN service_users su ON su.id = dr.su_id
             WHERE dr.home_id = $1 AND dr.record_type = 'fluid_intake'
             AND dr.record_date BETWEEN $2 AND $3
             GROUP BY su.id, su.first_name, su.last_name, su.min_fluid_ml, dr.record_date
             HAVING SUM(COALESCE(dr.amount_ml,0)) < COALESCE(su.min_fluid_ml,1500)`, [homeId, from, to]).then(r => { fluidData = r }),
      query(`SELECT s.first_name || ' ' || s.last_name as staff_name, st.course_name, st.expiry_date
             FROM staff_training st JOIN staff s ON s.id = st.staff_id
             WHERE s.home_id = $1 AND st.expiry_date IS NOT NULL
             AND st.expiry_date < CURRENT_DATE + INTERVAL '60 days'`, [homeId]).then(r => { staffTraining = r }),
      query(`SELECT COUNT(*) as total,
                    COUNT(CASE WHEN given = true THEN 1 END) as given,
                    COUNT(CASE WHEN refused = true THEN 1 END) as refused
             FROM mar_records WHERE home_id = $1 AND record_date BETWEEN $2 AND $3`, [homeId, from, to]).then(r => { marRecords = r }),
      query(`SELECT su.first_name || ' ' || su.last_name as su_name
             FROM service_users su WHERE su.home_id = $1 AND su.status = 'live'
             AND NOT EXISTS (SELECT 1 FROM daily_records dr WHERE dr.su_id = su.id AND dr.record_date = CURRENT_DATE)`, [homeId]).then(r => { missingRecords = r }),
      query(`SELECT sc.overview, sc.incident_date, sc.manager_ack,
                    su.first_name || ' ' || su.last_name as su_name
             FROM safeguarding_concerns sc JOIN service_users su ON su.id = sc.su_id
             WHERE sc.home_id = $1 AND sc.incident_date BETWEEN $2 AND $3`, [homeId, from, to]).then(r => { safeguardingRows = r }),
    ])

    // ── Derived metrics ───────────────────────────────────────────────────────
    const overduePlans    = carePlans.filter(cp => cp.next_review_date && new Date(cp.next_review_date) < new Date())
    const fluidFlags      = fluidData
    const expiringTraining = staffTraining
    const marStat         = (marRecords[0] || {}) as any
    const totalRecords    = dailyRecords.reduce((s, r) => s + parseInt(r.count), 0)
    const marPct          = marStat.total > 0 ? Math.round((parseInt(marStat.given || 0) / parseInt(marStat.total)) * 100) : 0
    const auditLabel      = auditType.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())

    // ── Scoring (based on real data, not AI) ─────────────────────────────────
    const checksTotal  = Math.max(10,
      carePlans.length + incidents.length + dailyRecords.length +
      (marStat.total > 0 ? 5 : 0) + safeguardingRows.length + staffTraining.length + missingRecords.length
    )
    const checksFailed = overduePlans.length + fluidFlags.length + expiringTraining.length +
      missingRecords.length + safeguardingRows.filter((s: any) => !s.manager_ack).length +
      (marPct > 0 && marPct < 95 ? 2 : 0)

    // ── Build data context for AI ─────────────────────────────────────────────
    const ctx = `
AUDIT TYPE: ${auditLabel}
PERIOD: ${from} to ${to}

CARE PLANS: ${carePlans.length} active, ${overduePlans.length} overdue
${overduePlans.map((cp: any) => `  - ${cp.su_name}: ${cp.plan_type} plan (due ${cp.next_review_date})`).join('\n')}

DAILY RECORDS: ${totalRecords} total records logged
${dailyRecords.map((r: any) => `  - ${r.record_type.replace(/_/g,' ')}: ${r.count} records`).join('\n')}

RESIDENTS WITH NO RECORD TODAY: ${missingRecords.length}
${missingRecords.map((s: any) => `  - ${s.su_name}`).join('\n')}

INCIDENTS: ${incidents.length}
${incidents.map((i: any) => `  - ${i.su_name}: ${String(i.incident_type).substring(0,80)} on ${i.record_date}`).join('\n')}

FLUID INTAKE BELOW THRESHOLD: ${fluidFlags.length} instances
${fluidFlags.map((f: any) => `  - ${f.su_name}: ${f.total_ml}ml on ${f.record_date}`).join('\n')}

MAR (MEDICATION): ${marStat.total || 0} entries — ${marStat.given || 0} given (${marPct}%), ${marStat.refused || 0} refused

STAFF TRAINING EXPIRING (<60 days): ${expiringTraining.length}
${expiringTraining.map((t: any) => `  - ${t.staff_name}: ${t.course_name} expires ${t.expiry_date}`).join('\n')}

SAFEGUARDING CONCERNS: ${safeguardingRows.length}
${safeguardingRows.map((s: any) => `  - ${s.su_name}: ${String(s.overview||'').substring(0,80)} (${s.manager_ack ? 'acknowledged' : 'PENDING'})`).join('\n')}
`.trim()

    // ── AI prompt ─────────────────────────────────────────────────────────────
    const prompt = `You are a senior UK care home compliance inspector writing a formal ${auditLabel} audit report for CQC purposes.

${ctx}

Write a comprehensive, professional audit report. Use EXACTLY this format:

## ${auditLabel} Audit Report

### Executive Summary
[3-4 sentences: overall compliance status, key strengths, key concerns, CQC rating implication]

### Detailed Findings

#### Care Planning & Reviews
[Use ✅ for each compliant item, ⚠️ for concerns, ❌ for critical failures — be specific with names/dates from the data]

#### Daily Care & Documentation
[Assess the volume and types of records, missing records, continuity of care]

#### Medication Management
[Assess MAR compliance rate and any concerns]

#### Nutrition & Hydration
[Assess fluid intake records and any residents below threshold]

#### Staff Training & Competency
[Assess expiring training and implications]

#### Safeguarding
[Assess any concerns, acknowledgement status]

### Summary of Key Risks
[List the top 3-5 risks as bullet points with ⚠️ or ❌]

### Good Practice Identified
[List 2-4 things the home is doing well with ✅]

## RECOMMENDATIONS
- [Specific actionable recommendation 1 — reference actual data]
- [Specific actionable recommendation 2]
- [Specific actionable recommendation 3]
- [Add more as needed — max 8]
[Each recommendation must be specific, measurable, and directly tied to the data above. Include CQC regulation reference where relevant (e.g. Regulation 9, 12, 17).]

Be thorough, professional, and constructive. Use British English. Total: 500-700 words.`

    // ── Call AI ────────────────────────────────────────────────────────────────
    let findings = ''
    let recommendations = ''

    try {
      const aiText = await callAI(prompt)
      // Split findings from recommendations at the ## RECOMMENDATIONS marker
      const recIdx = aiText.search(/##\s*RECOMMENDATIONS?\s*\n/i)
      if (recIdx !== -1) {
        findings = aiText.substring(0, recIdx).trim()
        recommendations = aiText.substring(recIdx).replace(/##\s*RECOMMENDATIONS?\s*\n/i, '').trim()
      } else {
        findings = aiText
        recommendations = ''
      }
    } catch (aiErr: any) {
      console.error('AI audit generation failed, using fallback:', aiErr?.message)
      // Fallback template when AI is unavailable
      findings = `## ${auditLabel} Audit Report\n**Period:** ${from} to ${to}\n\n`
      findings += `### Summary\n`
      findings += `- Active care plans: **${carePlans.length}** (${overduePlans.length} overdue)\n`
      findings += `- Daily records logged: **${totalRecords}**\n`
      findings += `- Incidents: **${incidents.length}**\n`
      findings += `- Fluid below threshold: **${fluidFlags.length}**\n`
      findings += `- MAR compliance: **${marPct}%**\n`
      findings += `- Training expiring: **${expiringTraining.length}**\n`
      if (overduePlans.length === 0 && fluidFlags.length === 0) {
        findings += `\n✅ No critical issues identified in this audit period.\n`
      } else {
        if (overduePlans.length > 0) findings += `\n⚠️ ${overduePlans.length} care plan(s) are overdue for review.\n`
        if (fluidFlags.length > 0) findings += `\n⚠️ ${fluidFlags.length} fluid intake recording(s) below threshold.\n`
        if (marPct > 0 && marPct < 95) findings += `\n⚠️ MAR compliance rate ${marPct}% is below the 95% target.\n`
      }
      if (overduePlans.length > 0) recommendations += `- Review and update ${overduePlans.length} overdue care plan(s) immediately\n`
      if (fluidFlags.length > 0) recommendations += `- Investigate and address fluid intake below threshold\n`
      if (expiringTraining.length > 0) recommendations += `- Arrange renewal for ${expiringTraining.length} expiring training certificate(s)\n`
      if (!recommendations) recommendations = '- Continue current monitoring — no immediate actions required.'
    }

    await query(
      `UPDATE audit_reports SET
        status = 'completed', findings = $1, recommendations = $2, raw_report = $3,
        total_checks = $4, checks_passed = $5, checks_failed = $6, generated_at = NOW()
       WHERE id = $7`,
      [findings, recommendations, findings, checksTotal, Math.max(0, checksTotal - checksFailed), checksFailed, auditId]
    )
    console.log('AUDIT COMPLETE:', auditId, `score=${checksTotal - checksFailed}/${checksTotal}`)
  } catch (err: any) {
    console.error('Audit generation failed:', err?.message || err)
    await query(`UPDATE audit_reports SET status = 'failed', findings = $1 WHERE id = $2`,
      [`Audit failed: ${err?.message || 'Unknown error'}`, auditId])
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
      if (err?.isKeyMissing || err?.message?.includes('GROQ_API_KEY')) {
        return res.status(400).json({ success: false, error: 'AI not configured. Set GROQ_API_KEY in backend/.env — get a free key at https://console.groq.com' } as ApiResponse);
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

      const currentRating = score >= 90 ? 'Outstanding' : score >= 75 ? 'Good' : score >= 60 ? 'Requires Improvement' : 'Inadequate'

      const prompt = `You are a senior UK care home compliance consultant. A care home's AI audit has identified issues and they need a precise, actionable improvement plan to raise their compliance score from ${score}% to at least 85%.

AUDIT DATA:
- Audit type: ${audit.audit_type?.replace(/_/g, ' ')}
- Period: ${audit.period_from} to ${audit.period_to}
- Current score: ${score}% (${currentRating})
- Total checks: ${audit.total_checks} | Passed: ${audit.checks_passed} | Failed: ${audit.checks_failed}

AUDIT FINDINGS (what was found):
${(audit.findings || '').substring(0, 2000)}

CURRENT RECOMMENDATIONS:
${(audit.recommendations || '').substring(0, 800)}

Your task: Create a SPECIFIC, TARGETED improvement plan that will genuinely raise their compliance. Each action must directly address a real finding above. Do not give generic advice.

Return valid JSON only (no markdown, no code fences) with this exact structure:
{
  "current_rating": "${currentRating}",
  "target_rating": "Good or Outstanding — be realistic based on the data",
  "projected_score": <number between ${Math.min(score + 15, 95)} and 95>,
  "summary": "2-3 sentences: what the main problems are and how the plan will fix them — be specific to the actual findings",
  "immediate_actions": [
    "Specific action referencing real data from the findings — do within 24-48 hours",
    "Another specific action"
  ],
  "short_term": [
    "Specific action to complete within 1-4 weeks",
    "Another specific action"
  ],
  "long_term": [
    "Systemic change to implement within 1-3 months",
    "Another systemic change"
  ],
  "cqc_notes": "What a CQC inspector would specifically look for when they visit based on these findings — reference relevant Regulations (9, 10, 12, 17 etc)"
}

Each array must have 2-4 items. All items must be specific to the actual findings, not generic advice.`;

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
      if (err?.isKeyMissing || err?.message?.includes('GROQ_API_KEY')) {
        return res.status(400).json({ success: false, error: 'AI not configured. Set GROQ_API_KEY in backend/.env — get a free key at https://console.groq.com' } as ApiResponse);
      }
      next(err);
    }
  }
);

export default router;
