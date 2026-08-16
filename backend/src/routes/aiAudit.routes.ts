import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';
import auditTemplates from '../data/auditTemplates.json';

type AuditTemplate = {
  sourceFile: string; category: string; title: string; suggestedKey: string;
  fields: { label: string; type: string }[];
  questions: { text: string; type: string }[];
  hasActionPlan: boolean; hasSignature: boolean; hasScore: boolean;
};
const AUDIT_TEMPLATES = auditTemplates as AuditTemplate[];
const AUDIT_TEMPLATE_MAP = new Map(AUDIT_TEMPLATES.map(t => [t.suggestedKey, t]));

function parseAIJson(raw: string): any {
  const cleaned = raw.replace(/```(?:json|javascript|js)?\s*/gi, '').replace(/```\s*/g, '').trim();
  try { return JSON.parse(cleaned); } catch { /* fall through */ }
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch { /* fall through */ } }
  throw new Error('AI returned unexpected format — please try again');
}

function parseAIArray(raw: string): any[] {
  const cleaned = raw.replace(/```(?:json|javascript|js)?\s*/gi, '').replace(/```\s*/g, '').trim();
  try { const r = JSON.parse(cleaned); if (Array.isArray(r)) return r; } catch { /* fall through */ }
  const m = cleaned.match(/\[[\s\S]*\]/);
  if (m) { try { const r = JSON.parse(m[0]); if (Array.isArray(r)) return r; } catch { /* fall through */ } }
  throw new Error('AI returned unexpected format — please try again');
}
async function callAI(prompt: string, maxTokens = 900): Promise<string> {
  const key = process.env.GROQ_API_KEY || '';
  if (!key || key === 'placeholder') throw Object.assign(new Error('GROQ_API_KEY not configured'), { isKeyMissing: true });

  const MAX_RETRIES = 3;
  let lastErr: any;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.3,
      }),
    });

    if (res.status === 429) {
      // Rate limited — wait for the retry-after period then try again
      const retryAfter = parseFloat(res.headers.get('retry-after') || '12');
      const waitMs = Math.ceil(retryAfter * 1000) + 500;
      console.log(`Groq rate limit hit, waiting ${waitMs}ms before retry ${attempt + 1}/${MAX_RETRIES}`);
      await new Promise(r => setTimeout(r, waitMs));
      lastErr = new Error(`Groq rate limit — retrying`);
      continue;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as any;
      throw Object.assign(new Error(err?.error?.message || `Groq API error ${res.status}`), { isKeyMissing: res.status === 401 });
    }

    const data = await res.json() as any;
    return data.choices?.[0]?.message?.content || '';
  }

  throw lastErr || new Error('Groq rate limit exceeded after retries — please wait a moment and try again');
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

// GET /api/audits/templates — the real audit/assessment checklist templates
// (extracted from the organisation's own audit forms), grouped by category.
router.get('/templates', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: AUDIT_TEMPLATES } as ApiResponse);
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
      const { auditType, customName, periodFrom, periodTo, reviewFrequency } = req.body;

      const from = periodFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const to = periodTo || new Date().toISOString().split('T')[0];

      // Create pending audit record
      const auditRows = await query(
        `INSERT INTO audit_reports (home_id, audit_type, custom_name, period_from, period_to, generated_by, status, review_frequency)
         VALUES ($1,$2,$3,$4,$5,$6,'generating',$7) RETURNING *`,
        [homeId, auditType, customName || null, from, to, staffId, reviewFrequency || 'every_4_weeks']
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

// PATCH /api/audits/:id/checklist — save manual checklist fields (auditor name, Yes/No
// answers, outcome of action plan, date completed, drawn signature). Recomputes the
// audit's score from the Yes/No answers so it shows consistently with AI-generated audits.
router.patch('/:id/checklist', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      const { auditorName, checklistAnswers, actionPlanOutcome, actionPlanCompletedDate, signatureUrl } = req.body;

      let totalChecks: number | undefined;
      let checksPassed: number | undefined;
      let checksFailed: number | undefined;
      if (checklistAnswers && typeof checklistAnswers === 'object') {
        const values = (Object.values(checklistAnswers) as string[]).filter(v => v === 'yes' || v === 'no');
        totalChecks = values.length;
        checksPassed = values.filter(v => v === 'yes').length;
        checksFailed = totalChecks - checksPassed;
      }

      const staffRows = await query<any>('SELECT first_name, last_name FROM staff WHERE id = $1', [staffId]);
      const conductedByName = staffRows.length ? `${staffRows[0].first_name} ${staffRows[0].last_name}` : auditorName;

      const rows = await query(
        `UPDATE audit_reports SET
           auditor_name = COALESCE($1, auditor_name),
           checklist_answers = COALESCE($2::jsonb, checklist_answers),
           action_plan_outcome = COALESCE($3, action_plan_outcome),
           action_plan_completed_date = COALESCE($4, action_plan_completed_date),
           signature_url = COALESCE($5, signature_url),
           conducted_by_name = COALESCE($6, conducted_by_name),
           total_checks = COALESCE($7, total_checks),
           checks_passed = COALESCE($8, checks_passed),
           checks_failed = COALESCE($9, checks_failed),
           status = 'completed'
         WHERE id = $10 RETURNING *`,
        [auditorName || null, checklistAnswers ? JSON.stringify(checklistAnswers) : null,
         actionPlanOutcome || null, actionPlanCompletedDate || null, signatureUrl || null,
         conductedByName || null, totalChecks ?? null, checksPassed ?? null, checksFailed ?? null,
         req.params.id]
      );
      if (!rows.length) throw new AppError('Audit not found', 404);
      res.json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// GET /api/audits/:id/signoffs — list signoff status for an audit
router.get('/:id/signoffs', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query(
        `SELECT aso.*, s.first_name || ' ' || s.last_name as staff_name, s.role
         FROM audit_signoffs aso JOIN staff s ON s.id = aso.staff_id
         WHERE aso.audit_id = $1 ORDER BY s.last_name, s.first_name`,
        [req.params.id]
      );
      res.json({ success: true, data: rows } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/audits/:id/signoffs — request signoff from selected staff (manager+)
router.post('/:id/signoffs', requireRole('group_admin', 'home_manager'),
  param('id').isUUID(), body('staffIds').isArray({ min: 1 }), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const senderId = fromToken(req, 'staffId');
      const homeId = fromToken(req, 'homeId');
      const { staffIds } = req.body;

      const auditRows = await query<any>('SELECT custom_name, audit_type FROM audit_reports WHERE id = $1', [req.params.id]);
      if (!auditRows.length) throw new AppError('Audit not found', 404);
      const auditName = auditRows[0].custom_name || auditRows[0].audit_type?.replace(/_/g, ' ') || 'audit';

      let sent = 0;
      for (const staffId of staffIds) {
        try {
          await query(
            `INSERT INTO audit_signoffs (audit_id, staff_id) VALUES ($1,$2)
             ON CONFLICT (audit_id, staff_id) DO NOTHING`,
            [req.params.id, staffId]
          );
          await query(
            `INSERT INTO staff_messages (sender_id, recipient_id, home_id, subject, body, message) VALUES ($1,$2,$3,$4,$5,$5)`,
            [senderId, staffId, homeId, 'Audit Sign-off Required',
             `You are required to review and sign off the following audit: ${auditName}. Please go to Audits to complete your sign-off.`]
          );
          sent++;
        } catch { /* skip individual failures, continue with rest */ }
      }
      res.json({ success: true, data: { sent } } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/audits/:id/sign — current staff member signs off this audit
router.post('/:id/sign', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      const rows = await query(
        `INSERT INTO audit_signoffs (audit_id, staff_id, signed_at) VALUES ($1,$2,NOW())
         ON CONFLICT (audit_id, staff_id) DO UPDATE SET signed_at = NOW() RETURNING *`,
        [req.params.id, staffId]
      );
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
    let safeguardingRows: any[] = [], medicationStock: any[] = []

    await Promise.allSettled([
      query(`SELECT cp.plan_type, cp.last_review_date, cp.next_review_date, cp.is_active,
                    su.first_name || ' ' || su.last_name as su_name
             FROM care_plans cp JOIN service_users su ON su.id = cp.su_id
             WHERE cp.home_id = $1 AND cp.is_active = true`, [homeId]).then(r => { carePlans = r }),
      query(`SELECT ri.incident_type, ri.manager_reviewed, dr.record_date,
                    su.first_name || ' ' || su.last_name as su_name
             FROM records_incidents ri 
             JOIN daily_records dr ON dr.id = ri.daily_record_id
             JOIN service_users su ON su.id = dr.su_id
             WHERE dr.home_id = $1 AND dr.record_date BETWEEN $2 AND $3`, [homeId, from, to]).then(r => { incidents = r }),
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
      query(`SELECT ms.medication_name, ms.current_stock, ms.unit, ms.reorder_level,
                    su.first_name || ' ' || su.last_name as su_name
             FROM medication_stock ms JOIN service_users su ON su.id = ms.su_id
             WHERE ms.home_id = $1 ORDER BY (ms.current_stock <= ms.reorder_level) DESC, ms.current_stock ASC`,
             [homeId]).then(r => { medicationStock = r }),
    ])

    // ── Derived metrics ───────────────────────────────────────────────────────
    const overduePlans    = carePlans.filter(cp => cp.next_review_date && new Date(cp.next_review_date) < new Date())
    const fluidFlags      = fluidData
    const expiringTraining = staffTraining
    const marStat         = (marRecords[0] || {}) as any
    const totalRecords    = dailyRecords.reduce((s, r) => s + parseInt(r.count), 0)
    const marPct          = marStat.total > 0 ? Math.round((parseInt(marStat.given || 0) / parseInt(marStat.total)) * 100) : 0
    const auditLabel      = auditType.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
    const lowStock        = medicationStock.filter((m: any) => Number(m.current_stock) <= Number(m.reorder_level))

    // ── Scoring (based on real data, not AI) ─────────────────────────────────
    const checksTotal  = Math.max(10,
      carePlans.length + incidents.length + dailyRecords.length +
      (marStat.total > 0 ? 5 : 0) + safeguardingRows.length + staffTraining.length + missingRecords.length +
      medicationStock.length
    )
    const checksFailed = overduePlans.length + fluidFlags.length + expiringTraining.length +
      missingRecords.length + safeguardingRows.filter((s: any) => !s.manager_ack).length +
      incidents.filter((i: any) => !i.manager_reviewed).length +
      (marPct > 0 && marPct < 95 ? 2 : 0) + lowStock.length

    // ── Build compact data context for AI (kept short to stay under token limits) ──
    const limit5 = (arr: any[], fn: (x: any) => string) => arr.slice(0, 5).map(fn).join('; ') || 'none'

    const ctx = [
      `Audit: ${auditLabel} | Period: ${from} to ${to}`,
      `Care plans: ${carePlans.length} active, ${overduePlans.length} overdue` +
        (overduePlans.length ? ` (${limit5(overduePlans, cp => `${cp.su_name} ${cp.plan_type} due ${cp.next_review_date}`)})` : ''),
      `Records: ${totalRecords} logged today; ${missingRecords.length} residents with no entry` +
        (missingRecords.length ? ` (${limit5(missingRecords, s => s.su_name)})` : ''),
      `Incidents: ${incidents.length}` +
        (incidents.length ? ` (${limit5(incidents, i => `${i.su_name}: ${String(i.incident_type).substring(0,40)}`)})` : ''),
      `Fluid below threshold: ${fluidFlags.length}` +
        (fluidFlags.length ? ` (${limit5(fluidFlags, f => `${f.su_name} ${f.total_ml}ml`)})` : ''),
      `MAR: ${marStat.total || 0} entries, ${marPct}% given, ${marStat.refused || 0} refused`,
      `Training expiring <60d: ${expiringTraining.length}` +
        (expiringTraining.length ? ` (${limit5(expiringTraining, t => `${t.staff_name}: ${t.course_name}`)})` : ''),
      `Safeguarding: ${safeguardingRows.length}` +
        (safeguardingRows.length ? ` (${limit5(safeguardingRows, s => `${s.su_name}: ${s.manager_ack ? 'acked' : 'PENDING'}`)})` : ''),
      `Medication stock: ${medicationStock.length} items, ${lowStock.length} at/below reorder level` +
        (lowStock.length ? ` (${limit5(lowStock, m => `${m.su_name} ${m.medication_name}: ${m.current_stock}${m.unit} left`)})` : ''),
    ].join('\n')

    // ── AI prompt (concise to stay within Groq free-tier token limits) ─────────
    const prompt = `UK CQC care home compliance inspector. Write a formal ${auditLabel} audit report.

DATA:
${ctx}

Format:
## ${auditLabel} Audit Report
### Executive Summary
[2-3 sentences: overall status, key strength, key concern]
### Key Findings
[Use ✅ compliant ⚠️ concern ❌ critical — be specific using the data above, 1 line each]
### Key Risks
[3 bullet risks with ⚠️/❌]
## RECOMMENDATIONS
- [Specific action tied to data — max 5 bullets, include CQC Reg number]

British English. Max 400 words total.`

    // ── Call AI ────────────────────────────────────────────────────────────────
    let findings = ''
    let recommendations = ''

    try {
      const aiText = await callAI(prompt, 900)
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

    // ── Real checklist template match — ask the AI to pre-answer the actual
    // audit form's questions from the live data gathered above, so the auditor
    // reviews/corrects rather than starting from a blank form. ─────────────────
    let checklistAnswers: Record<number, string> | null = null
    let checklistTotal = 0
    let checklistPassed = 0
    const template = AUDIT_TEMPLATE_MAP.get(auditType)
    if (template && template.questions.length) {
      try {
        const qList = template.questions.map((q, i) => `${i}. (${q.type}) ${q.text}`).join('\n')
        const checklistPrompt = `You are completing a real UK care home audit form titled "${template.title}" using the live data below. For EACH numbered question, answer strictly from the data provided.

DATA:
${ctx}

QUESTIONS:
${qList}

Reply with ONLY a JSON array, one object per question in order, using this exact shape:
[{"i":0,"answer":"yes|no|unsure","note":"max 12 words"}]
Use "unsure" whenever the data above does not clearly cover that question — do not guess.`
        const raw = await callAI(checklistPrompt, 1100)
        const parsed = parseAIArray(raw)
        checklistAnswers = {}
        for (const item of parsed) {
          const i = Number(item.i)
          if (!Number.isInteger(i) || i < 0 || i >= template.questions.length) continue
          const ans = String(item.answer || '').toLowerCase()
          if (ans === 'yes' || ans === 'no') {
            checklistAnswers[i] = ans
            checklistTotal++
            if (ans === 'yes') checklistPassed++
          }
        }
      } catch (checklistErr: any) {
        console.error('AI checklist pre-fill failed (non-fatal):', checklistErr?.message)
      }
    }

    const finalTotal = checklistTotal > 0 ? checklistTotal : checksTotal
    const finalPassed = checklistTotal > 0 ? checklistPassed : Math.max(0, checksTotal - checksFailed)
    const finalFailed = finalTotal - finalPassed

    await query(
      `UPDATE audit_reports SET
        status = 'completed', findings = $1, recommendations = $2, raw_report = $3,
        total_checks = $4, checks_passed = $5, checks_failed = $6, generated_at = NOW(),
        checklist_answers = COALESCE($8::jsonb, checklist_answers)
       WHERE id = $7`,
      [findings, recommendations, findings, finalTotal, finalPassed, finalFailed, auditId,
       checklistAnswers ? JSON.stringify(checklistAnswers) : null]
    )
    console.log('AUDIT COMPLETE:', auditId, `score=${finalPassed}/${finalTotal}`)
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

      const score = audit.total_checks > 0 ? Math.round((audit.checks_passed / audit.total_checks) * 100) : 0
      const recs = (audit.recommendations || '').substring(0, 600)
      const findings = (audit.findings || '').substring(0, 400)

      const prompt = `UK care home compliance expert. Create an action plan from these audit recommendations.

Audit: ${audit.audit_type?.replace(/_/g, ' ')} | Score: ${score}% | Period: ${audit.period_from} to ${audit.period_to}
Recommendations: ${recs}
Key findings: ${findings}

Return JSON array only (no markdown):
[{"recommendation":"brief rec","action":"specific step","who":"Home Manager|Senior Carer|All Staff","priority":"high|medium|low","deadline":"Within 24h|1 week|1 month","expected_outcome":"improvement"}]

Max 5 items. Be specific to the actual data above.`

      const raw = await callAI(prompt, 700);
      let items: any[] = [];
      try { items = parseAIArray(raw); } catch {
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

      const findings = (audit.findings || '').substring(0, 500)
      const recs = (audit.recommendations || '').substring(0, 300)

      const prompt = `UK care home CQC compliance consultant. Raise compliance from ${score}% (${currentRating}) to 85%+.

Audit: ${audit.audit_type?.replace(/_/g, ' ')} | Checks: ${audit.total_checks} total, ${audit.checks_passed} passed, ${audit.checks_failed} failed
Findings: ${findings}
Recommendations: ${recs}

Return JSON only (no markdown):
{"current_rating":"${currentRating}","target_rating":"Good","projected_score":${Math.min(score + 18, 92)},"summary":"2 sentences on main problems and fix","immediate_actions":["action1 tied to data","action2"],"short_term":["1-4 week action","another"],"long_term":["1-3 month systemic change","another"],"cqc_notes":"CQC inspector focus areas, cite Reg 9/12/17 etc"}

2-3 items per array. Specific to actual findings only.`

      const raw = await callAI(prompt, 700);
      let plan: any = {};
      try { plan = parseAIJson(raw); } catch {
        throw new AppError('AI returned unexpected format — please try again', 500);
      }

      // Always offer all fix types the audit can address — execute-fix reports actual counts per operation
      // We don't filter by current DB state here because the audit may have flagged issues in a past period
      const available_fixes = (audit.checks_failed || 0) > 0
        ? ['care_plans_review', 'alerts_resolve', 'safeguarding_ack', 'training_extend',
           'incidents_acknowledge', 'fluid_alerts_create', 'ppe_restock_alerts', 'care_plans_create', 'daily_records_create']
        : [];

      res.json({ success: true, data: { ...plan, available_fixes, home_id: audit.home_id } } as ApiResponse);
    } catch (err: any) {
      if (err?.isKeyMissing || err?.message?.includes('GROQ_API_KEY')) {
        return res.status(400).json({ success: false, error: 'AI not configured. Set GROQ_API_KEY in backend/.env — get a free key at https://console.groq.com' } as ApiResponse);
      }
      next(err);
    }
  }
);

// POST /api/audits/:id/attachments — add attachment URL
router.post('/:id/attachments', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { url, name, mimeType } = req.body;
      if (!url) throw new AppError('url required', 400);
      const rows = await query<any>('SELECT attachments FROM audit_reports WHERE id=$1', [req.params.id]);
      if (!rows.length) throw new AppError('Audit not found', 404);
      const existing: any[] = rows[0].attachments || [];
      const updated = [...existing, { url, name: name || url.split('/').pop(), mimeType: mimeType || 'application/octet-stream', addedAt: new Date().toISOString() }];
      await query('UPDATE audit_reports SET attachments=$1 WHERE id=$2', [JSON.stringify(updated), req.params.id]);
      res.json({ success: true, data: updated } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// DELETE /api/audits/:id/attachments — remove attachment by URL
router.delete('/:id/attachments', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { url } = req.body;
      const rows = await query<any>('SELECT attachments FROM audit_reports WHERE id=$1', [req.params.id]);
      if (!rows.length) throw new AppError('Audit not found', 404);
      const existing: any[] = rows[0].attachments || [];
      const updated = existing.filter((a: any) => a.url !== url);
      await query('UPDATE audit_reports SET attachments=$1 WHERE id=$2', [JSON.stringify(updated), req.params.id]);
      res.json({ success: true, data: updated } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
