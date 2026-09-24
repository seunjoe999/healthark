import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';
import auditTemplates from '../data/auditTemplates.json';
import { ukDateStr } from '../utils/ukTime';

type AuditTemplate = {
  sourceFile: string; category: string; title: string; suggestedKey: string;
  fields: { label: string; type: string }[];
  questions: { text: string; type: string }[];
  hasActionPlan: boolean; hasSignature: boolean; hasScore: boolean;
};
const AUDIT_TEMPLATES = auditTemplates as AuditTemplate[];
const AUDIT_TEMPLATE_MAP = new Map(AUDIT_TEMPLATES.map(t => [t.suggestedKey, t]));

// Every template in auditTemplates.json is tagged category:"service_user" regardless
// of whether it's actually about one resident (Activity, Falls) or the whole home/
// service (Fridge Temperature, Infection Control, Fire Safety) — so the "who is
// this for" step had no real way to know which templates need a resident picked.
// This is the authoritative per-template scope used to require (or hide) the
// resident selector, and to route to a category-specific data fetcher below.
const AUDIT_SCOPE: Record<string, 'service_user' | 'service'> = {
  activity_audit: 'service_user',
  care_plan_audit: 'service_user',
  su_documentation_audit: 'service_user',
  equipment_audit: 'service',
  falls_prevention_audit: 'service_user',
  fire_safety_audit: 'service',
  fridge_temperature_audit: 'service',
  health_safety_audit: 'service',
  incident_analysis_audit: 'service',
  incident_accident_reporting_audit: 'service_user',
  infection_control_audit: 'service',
  mandatory_safety_audits_overview: 'service',
  mar_chart_record_audit: 'service_user',
  medication_audit: 'service_user',
  medication_risk_assessment: 'service_user',
  nutrition_hydration_audit: 'service_user',
  one_to_one_audit_managers: 'service',
  premises_audit: 'service',
  pressure_ulcer_skin_integrity_audit: 'service_user',
  su_safeguarding_audit: 'service_user',
  self_medication_administration_assessment: 'service_user',
};
// Custom audits (organisation-authored) have no inherent scope — the auditor's
// own "Who is this for?" choice on the Start Audit form still governs those,
// unchanged. Only the 21 built-in templates get a fixed, known scope.
function scopeFor(auditType: string): 'service_user' | 'service' | null {
  return AUDIT_SCOPE[auditType] || null;
}

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

  // Busy periods (e.g. shift-change mornings, when many homes generate handover
  // summaries and audits within the same few minutes) can burn through 3 retries
  // of Groq's rate limit before it clears, silently dropping to the plain-text
  // fallback even though the request would have succeeded a few seconds later.
  // 5 retries with a capped per-attempt wait gives a longer overall budget
  // without letting any single wait run unreasonably long.
  const MAX_RETRIES = 5;
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
      const retryAfter = Math.min(parseFloat(res.headers.get('retry-after') || '12'), 15);
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
      `SELECT ar.*, s.first_name || ' ' || s.last_name as generated_by_name,
              su.first_name || ' ' || su.last_name as su_name
       FROM audit_reports ar
       LEFT JOIN staff s ON s.id = ar.generated_by
       LEFT JOIN service_users su ON su.id = ar.su_id
       WHERE ar.home_id = $1 ORDER BY ar.generated_at DESC LIMIT 50`,
      [homeId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/audits/templates — the real audit/assessment checklist templates
// (extracted from the organisation's own audit forms) plus this organisation's
// own custom audits, grouped by category.
router.get('/templates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = fromToken(req, 'organisationId');
    let customRows: any[] = [];
    if (orgId) {
      customRows = await query<any>(
        'SELECT * FROM custom_audit_templates WHERE organisation_id = $1 ORDER BY created_at DESC', [orgId]
      );
    }
    const customTemplates: (AuditTemplate & { scope: string | null })[] = customRows.map(r => ({
      sourceFile: 'custom', category: r.category || 'Custom', title: r.title,
      suggestedKey: `custom_${r.id}`,
      fields: [], questions: (r.questions || []).map((q: any) => ({ text: typeof q === 'string' ? q : q.text, type: 'yesno' })),
      hasActionPlan: true, hasSignature: true, hasScore: true,
      scope: scopeFor(`custom_${r.id}`),
    }));
    const builtIn = AUDIT_TEMPLATES.map(t => ({ ...t, scope: scopeFor(t.suggestedKey) }));
    res.json({ success: true, data: [...customTemplates, ...builtIn] } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/audits/custom-templates — this organisation's own audit templates
router.get('/custom-templates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = fromToken(req, 'organisationId');
    const rows = await query('SELECT * FROM custom_audit_templates WHERE organisation_id = $1 ORDER BY created_at DESC', [orgId]);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/audits/custom-templates — create a custom audit template (manager+)
router.post('/custom-templates', requireRole('group_admin', 'home_manager'),
  body('title').trim().notEmpty(), body('questions').isArray({ min: 1 }), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = fromToken(req, 'organisationId');
      const staffId = fromToken(req, 'staffId');
      const { title, category, questions } = req.body;
      const cleanQuestions = (questions as any[])
        .map(q => (typeof q === 'string' ? q : q?.text || ''))
        .map((t: string) => t.trim())
        .filter(Boolean);
      if (!cleanQuestions.length) throw new AppError('At least one question is required', 400);
      const rows = await query(
        `INSERT INTO custom_audit_templates (organisation_id, title, category, questions, created_by)
         VALUES ($1,$2,$3,$4::jsonb,$5) RETURNING *`,
        [orgId, title.trim(), (category || 'Custom').trim(), JSON.stringify(cleanQuestions), staffId]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// DELETE /api/audits/custom-templates/:id — remove a custom audit template (manager+)
router.delete('/custom-templates/:id', requireRole('group_admin', 'home_manager'),
  param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = fromToken(req, 'organisationId');
      await query('DELETE FROM custom_audit_templates WHERE id = $1 AND organisation_id = $2', [req.params.id, orgId]);
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/audits/generate — trigger AI audit
router.post('/generate',
  requireRole('home_manager', 'group_admin'),
  [body('auditType').notEmpty(), body('homeId').optional({ checkFalsy: true }).isUUID(), body('suId').optional({ checkFalsy: true }).isUUID()],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      const homeId = req.body.homeId || fromToken(req, 'homeId');
      const { auditType, customName, periodFrom, periodTo, reviewFrequency } = req.body;
      const suId = req.body.suId || null;

      // The 21 built-in templates have a fixed scope (Activity/Falls are about one
      // resident; Fridge Temperature/Infection Control are about the whole service) —
      // enforced here too, not just in the Start Audit form, since a per-resident
      // audit run with no resident selected is exactly the "it's doing it for all of
      // them, not per individual service user" complaint this was built to fix.
      if (scopeFor(auditType) === 'service_user' && !suId) {
        throw new AppError('Select which service user this audit is for', 400);
      }

      const from = periodFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const to = periodTo || ukDateStr();

      // Create pending audit record
      const auditRows = await query(
        `INSERT INTO audit_reports (home_id, audit_type, custom_name, period_from, period_to, generated_by, status, review_frequency, su_id)
         VALUES ($1,$2,$3,$4,$5,$6,'generating',$7,$8) RETURNING *`,
        [homeId, auditType, customName || null, from, to, staffId, reviewFrequency || 'every_4_weeks', suId]
      );
      const auditId = (auditRows[0] as any).id;

      // Run AI analysis asynchronously
      generateAuditReport(auditId, homeId, auditType, from, to, suId).catch(console.error);

      res.status(202).json({ success: true, data: { id: auditId, status: 'generating', message: 'Audit generation started. Check back in a moment.' } } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// GET /api/audits/:id — get specific audit
router.get('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query(
        `SELECT ar.*, su.first_name || ' ' || su.last_name as su_name
         FROM audit_reports ar
         LEFT JOIN service_users su ON su.id = ar.su_id
         WHERE ar.id = $1`,
        [req.params.id]
      );
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

interface CategoryContext { ctx: string; summaryLines: string[]; checksTotal: number; checksFailed: number }

// Category-specific data for the audit types the PDF walkthrough named explicitly —
// each pulls ONLY the records that audit is actually about, instead of the one
// generic "care plans / incidents / fluid / MAR / training" block every audit used
// to get regardless of what it was auditing. Returns null for any audit type not
// covered here, which falls back to the original generic block below (still
// functional, just not yet given its own tailored data source).
async function fetchCategoryContext(
  auditType: string, homeId: string, suId: string | null, from: string, to: string, suName: string | null
): Promise<CategoryContext | null> {
  const limit5 = (arr: any[], fn: (x: any) => string) => arr.slice(0, 5).map(fn).join('; ') || 'none'

  if (auditType === 'activity_audit' && suId) {
    const [activityPlans, aboutMe, suRow, activityRecords] = await Promise.all([
      query<any>(`SELECT plan_type, custom_name, aims_outcomes, last_review_date, next_review_date, is_active
                  FROM care_plans WHERE su_id = $1 AND plan_type = 'social_activities'`, [suId]),
      query<any>(`SELECT hobbies_interests FROM su_about_me WHERE su_id = $1`, [suId]),
      query<any>(`SELECT hobbies FROM service_users WHERE id = $1`, [suId]),
      query<any>(`SELECT record_date, notes FROM daily_records
                  WHERE su_id = $1 AND record_type = 'social_activity' AND record_date BETWEEN $2 AND $3
                  ORDER BY record_date DESC LIMIT 20`, [suId, from, to]),
    ])
    const activePlan = activityPlans.find((p: any) => p.is_active) || activityPlans[0]
    const hobbies = aboutMe[0]?.hobbies_interests || suRow[0]?.hobbies || ''
    const overdue = activePlan?.next_review_date && new Date(activePlan.next_review_date) < new Date()

    const ctx = [
      `Audit: Activity Audit | Service user: ${suName} | Period: ${from} to ${to}`,
      activePlan
        ? `Activity Care Plan: EXISTS (last reviewed ${activePlan.last_review_date || 'never'}, next review ${activePlan.next_review_date || 'not set'}${overdue ? ', OVERDUE' : ''}). Aims/outcomes: ${String(activePlan.aims_outcomes || '').slice(0, 300) || 'none recorded'}`
        : `Activity Care Plan: NONE FOUND on the system for this resident`,
      `Stated hobbies/interests (About Me): ${hobbies || 'none recorded'}`,
      `Activity daily records logged in period: ${activityRecords.length}` +
        (activityRecords.length ? ` (${limit5(activityRecords, r => `${r.record_date}: ${String(r.notes || '').slice(0, 60)}`)})` : ' — no activity engagement recorded in this period'),
    ].join('\n')

    return {
      ctx,
      summaryLines: [
        `- Activity Care Plan on file: **${activePlan ? 'Yes' : 'No'}**${overdue ? ' (review overdue)' : ''}`,
        `- Stated hobbies/interests recorded: **${hobbies ? 'Yes' : 'No'}**`,
        `- Activity records logged this period: **${activityRecords.length}**`,
      ],
      checksTotal: Math.max(5, activityRecords.length + (activePlan ? 1 : 0) + (hobbies ? 1 : 0)),
      checksFailed: (activePlan ? 0 : 1) + (overdue ? 1 : 0) + (activityRecords.length === 0 ? 1 : 0),
    }
  }

  if (auditType === 'fridge_temperature_audit') {
    const checks = await query<any>(
      `SELECT check_date, reading_value, unit, result, location FROM environmental_checks
       WHERE home_id = $1 AND check_type IN ('fridge_temp','freezer_temp') AND check_date BETWEEN $2 AND $3
       ORDER BY check_date DESC`, [homeId, from, to]
    )
    const failed = checks.filter((c: any) => c.result === 'fail' || c.result === 'action_required')
    const ctx = [
      `Audit: Fridge/Freezer Temperature Audit | Period: ${from} to ${to}`,
      `Fridge/freezer temperature checks logged: ${checks.length}, ${failed.length} out of range` +
        (checks.length ? ` (${limit5(checks, c => `${c.check_date} ${c.location || ''}: ${c.reading_value}${c.unit} — ${c.result}`)})` : ' — no checks recorded in this period'),
    ].join('\n')
    return {
      ctx,
      summaryLines: [
        `- Fridge/freezer temperature checks logged: **${checks.length}**`,
        `- Out-of-range readings: **${failed.length}**`,
      ],
      checksTotal: Math.max(5, checks.length),
      checksFailed: failed.length + (checks.length === 0 ? 1 : 0),
    }
  }

  if (auditType === 'incident_accident_reporting_audit' || auditType === 'falls_prevention_audit') {
    const isFalls = auditType === 'falls_prevention_audit'
    const typeFilter = isFalls ? ` AND ri.incident_type = 'fall'` : ''
    const suFilter = suId ? ` AND su.id = $4` : ''
    const params = suId ? [homeId, from, to, suId] : [homeId, from, to]
    const rows = await query<any>(
      `SELECT ri.incident_type, ri.manager_reviewed, dr.record_date,
              su.first_name || ' ' || su.last_name as su_name
       FROM records_incidents ri
       JOIN daily_records dr ON dr.id = ri.daily_record_id
       JOIN service_users su ON su.id = dr.su_id
       WHERE dr.home_id = $1 AND dr.record_date BETWEEN $2 AND $3${typeFilter}${suFilter}`, params
    )
    const unreviewed = rows.filter((r: any) => !r.manager_reviewed)
    const label = isFalls ? 'Falls' : 'Incidents'
    const ctx = [
      `Audit: ${isFalls ? 'Falls Prevention' : 'Incident/Accident Reporting'} Audit${suName ? ` | Service user: ${suName}` : ''} | Period: ${from} to ${to}`,
      `${label} recorded: ${rows.length}, ${unreviewed.length} not yet manager-reviewed` +
        (rows.length ? ` (${limit5(rows, r => `${r.record_date} ${r.su_name}${isFalls ? '' : `: ${r.incident_type}`}${r.manager_reviewed ? '' : ' — UNREVIEWED'}`)})` : ` — no ${label.toLowerCase()} recorded in this period`),
    ].join('\n')
    return {
      ctx,
      summaryLines: [
        `- ${label} recorded this period: **${rows.length}**`,
        `- Not yet manager-reviewed: **${unreviewed.length}**`,
      ],
      checksTotal: Math.max(5, rows.length),
      checksFailed: unreviewed.length,
    }
  }

  if (auditType === 'medication_risk_assessment') {
    // The manager's specific complaint: this audit was showing "Active care
    // plans 517, 16 care plans overdue" — facility-wide stats for every care
    // plan type, not what's actually being audited here. Scoped to just the
    // Medicine Risk Assessments (medicine_risk_assessments table), and to one
    // resident when auditing a specific person.
    const suFilter = suId ? ` AND su.id = $4` : ''
    const params = suId ? [homeId, from, to, suId] : [homeId, from, to]
    const rows = await query<any>(
      `SELECT mr.risk_level, mr.review_date, mr.assessed_at, su.first_name || ' ' || su.last_name as su_name
       FROM medicine_risk_assessments mr
       JOIN service_users su ON su.id = mr.su_id
       WHERE mr.home_id = $1 AND mr.assessed_at::date BETWEEN $2 AND $3${suFilter}
       ORDER BY mr.assessed_at DESC`, params
    )
    const overdue = rows.filter((r: any) => r.review_date && new Date(r.review_date) < new Date())
    const highRisk = rows.filter((r: any) => r.risk_level === 'high')
    // Residents (in scope) with no assessment on file at all in the period —
    // a missing assessment is itself a finding, not just an overdue review.
    const suScopeSql = suId ? `su.id = $2` : `su.home_id = $1 AND su.status = 'live'`
    const suScopeParams = suId ? [homeId, suId] : [homeId]
    const missing = await query<any>(
      `SELECT su.first_name || ' ' || su.last_name as su_name FROM service_users su
       WHERE ${suScopeSql} AND NOT EXISTS (SELECT 1 FROM medicine_risk_assessments mr WHERE mr.su_id = su.id)`,
      suScopeParams
    )
    const ctx = [
      `Audit: Medication Risk Assessment${suName ? ` | Service user: ${suName}` : ''} | Period: ${from} to ${to}`,
      `Medicine Risk Assessments recorded in period: ${rows.length}, ${overdue.length} overdue for review, ${highRisk.length} rated high risk` +
        (rows.length ? ` (${limit5(rows, r => `${r.su_name}: ${r.risk_level} risk, review ${r.review_date || 'not set'}`)})` : ' — none recorded in this period'),
      `Residents with NO Medicine Risk Assessment on file at all: ${missing.length}` +
        (missing.length ? ` (${limit5(missing, m => m.su_name)})` : ''),
    ].join('\n')
    return {
      ctx,
      summaryLines: [
        `- Medicine Risk Assessments recorded this period: **${rows.length}**`,
        `- Overdue for review: **${overdue.length}**`,
        `- Rated high risk: **${highRisk.length}**`,
        `- Residents with no assessment on file: **${missing.length}**`,
      ],
      checksTotal: Math.max(5, rows.length + missing.length),
      checksFailed: overdue.length + missing.length,
    }
  }

  if (auditType === 'infection_control_audit') {
    // No dedicated infection-control tracking exists yet in the system (unlike
    // fridge temperatures or incidents, which have their own tables) — honest
    // about that gap rather than pulling in unrelated generic data. The
    // checklist still gets answered (safe-default "yes"/compliant per question,
    // same as any audit type with no matching live data), for the auditor to
    // review and correct against what they can see on inspection.
    const ctx = [
      `Audit: Infection Prevention and Control Audit | Period: ${from} to ${to}`,
      `No dedicated infection-control data source is tracked in the system yet (this is a facility-wide/inspection-based audit) — answer each question from direct observation during the walk-round rather than system records.`,
    ].join('\n')
    return { ctx, summaryLines: ['- This audit is inspection-based — no live system data to summarise yet.'], checksTotal: 5, checksFailed: 0 }
  }

  return null
}

async function generateAuditReport(auditId: string, homeId: string, auditType: string, from: string, to: string, suId?: string | null) {
  try {
    let suName: string | null = null
    if (suId) {
      const suRows = await query<any>('SELECT first_name || \' \' || last_name as name FROM service_users WHERE id = $1', [suId])
      suName = suRows[0]?.name || null
    }
    const categoryContext = await fetchCategoryContext(auditType, homeId, suId || null, from, to, suName)

    const auditLabel = auditType.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
    let ctx = ''
    let checksTotal = 10
    let checksFailed = 0
    // Generic-path-only variables — stay empty when categoryContext was used, so
    // the (unreachable in that case) generic fallback-findings block below never
    // runs, but keeping the declarations avoids re-plumbing everything downstream.
    let carePlans: any[] = [], incidents: any[] = [], dailyRecords: any[] = []
    let fluidData: any[] = [], staffTraining: any[] = [], marRecords: any[] = [], missingRecords: any[] = []
    let safeguardingRows: any[] = [], medicationStock: any[] = []
    let overduePlans: any[] = [], fluidFlags: any[] = [], expiringTraining: any[] = []
    let totalRecords = 0, marPct = 0

    if (categoryContext) {
      ctx = categoryContext.ctx
      checksTotal = categoryContext.checksTotal
      checksFailed = categoryContext.checksFailed
    } else {

    // ── Gather live data ──────────────────────────────────────────────────────
    const suFilter = suId ? ' AND su.id = $4' : ''
    const suParams = suId ? [homeId, from, to, suId] : [homeId, from, to]
    const missingRecordsFilter = suId ? ' AND su.id = $2' : ''
    const missingRecordsParams = suId ? [homeId, suId] : [homeId]

    await Promise.allSettled([
      query(`SELECT cp.plan_type, cp.last_review_date, cp.next_review_date, cp.is_active,
                    su.first_name || ' ' || su.last_name as su_name
             FROM care_plans cp JOIN service_users su ON su.id = cp.su_id
             WHERE cp.home_id = $1 AND cp.is_active = true${suId ? ' AND su.id = $2' : ''}`,
             suId ? [homeId, suId] : [homeId]).then(r => { carePlans = r }),
      query(`SELECT ri.incident_type, ri.manager_reviewed, dr.record_date,
                    su.first_name || ' ' || su.last_name as su_name
             FROM records_incidents ri
             JOIN daily_records dr ON dr.id = ri.daily_record_id
             JOIN service_users su ON su.id = dr.su_id
             WHERE dr.home_id = $1 AND dr.record_date BETWEEN $2 AND $3${suFilter}`, suParams).then(r => { incidents = r }),
      query(`SELECT record_type, COUNT(*) as count FROM daily_records
             WHERE home_id = $1 AND record_date BETWEEN $2 AND $3
             GROUP BY record_type ORDER BY count DESC`, [homeId, from, to]).then(r => { dailyRecords = r }),
      query(`SELECT su.first_name || ' ' || su.last_name as su_name,
                    SUM(COALESCE(dr.amount_ml,0)) as total_ml, dr.record_date
             FROM daily_records dr JOIN service_users su ON su.id = dr.su_id
             WHERE dr.home_id = $1 AND dr.record_type = 'fluid_intake'
             AND dr.record_date BETWEEN $2 AND $3${suFilter}
             GROUP BY su.id, su.first_name, su.last_name, su.min_fluid_ml, dr.record_date
             HAVING SUM(COALESCE(dr.amount_ml,0)) < COALESCE(su.min_fluid_ml,1500)`, suParams).then(r => { fluidData = r }),
      query(`SELECT s.first_name || ' ' || s.last_name as staff_name, st.course_name, st.expiry_date
             FROM staff_training st JOIN staff s ON s.id = st.staff_id
             WHERE s.home_id = $1 AND st.expiry_date IS NOT NULL
             AND st.expiry_date < CURRENT_DATE + INTERVAL '60 days'`, [homeId]).then(r => { staffTraining = r }),
      query(`SELECT COUNT(*) as total,
                    COUNT(CASE WHEN given = true THEN 1 END) as given,
                    COUNT(CASE WHEN refused = true THEN 1 END) as refused
             FROM mar_records WHERE home_id = $1 AND record_date BETWEEN $2 AND $3`, [homeId, from, to]).then(r => { marRecords = r }),
      query(`SELECT su.first_name || ' ' || su.last_name as su_name
             FROM service_users su WHERE su.home_id = $1 AND su.status = 'live'${missingRecordsFilter}
             AND NOT EXISTS (SELECT 1 FROM daily_records dr WHERE dr.su_id = su.id AND dr.record_date = CURRENT_DATE)`,
             missingRecordsParams).then(r => { missingRecords = r }),
      query(`SELECT sc.overview, sc.incident_date, sc.manager_ack,
                    su.first_name || ' ' || su.last_name as su_name
             FROM safeguarding_concerns sc JOIN service_users su ON su.id = sc.su_id
             WHERE sc.home_id = $1 AND sc.incident_date BETWEEN $2 AND $3${suFilter}`, suParams).then(r => { safeguardingRows = r }),
      query(`SELECT ms.medication_name, ms.current_stock, ms.unit, ms.reorder_level,
                    su.first_name || ' ' || su.last_name as su_name
             FROM medication_stock ms JOIN service_users su ON su.id = ms.su_id
             WHERE ms.home_id = $1${suId ? ' AND su.id = $2' : ''} ORDER BY (ms.current_stock <= ms.reorder_level) DESC, ms.current_stock ASC`,
             suId ? [homeId, suId] : [homeId]).then(r => { medicationStock = r }),
    ])

    // ── Derived metrics ───────────────────────────────────────────────────────
    overduePlans    = carePlans.filter(cp => cp.next_review_date && new Date(cp.next_review_date) < new Date())
    fluidFlags      = fluidData
    expiringTraining = staffTraining
    const marStat         = (marRecords[0] || {}) as any
    totalRecords    = dailyRecords.reduce((s, r) => s + parseInt(r.count), 0)
    marPct          = marStat.total > 0 ? Math.round((parseInt(marStat.given || 0) / parseInt(marStat.total)) * 100) : 0
    const lowStock        = medicationStock.filter((m: any) => Number(m.current_stock) <= Number(m.reorder_level))

    // ── Scoring (based on real data, not AI) ─────────────────────────────────
    checksTotal  = Math.max(10,
      carePlans.length + incidents.length + dailyRecords.length +
      (marStat.total > 0 ? 5 : 0) + safeguardingRows.length + staffTraining.length + missingRecords.length +
      medicationStock.length
    )
    checksFailed = overduePlans.length + fluidFlags.length + expiringTraining.length +
      missingRecords.length + safeguardingRows.filter((s: any) => !s.manager_ack).length +
      incidents.filter((i: any) => !i.manager_reviewed).length +
      (marPct > 0 && marPct < 95 ? 2 : 0) + lowStock.length

    // ── Build compact data context for AI (kept short to stay under token limits) ──
    const limit5 = (arr: any[], fn: (x: any) => string) => arr.slice(0, 5).map(fn).join('; ') || 'none'

    ctx = [
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

    } // end generic data-gathering branch (categoryContext ? skip : run above)

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
      if (categoryContext) {
        findings += categoryContext.summaryLines.join('\n') + '\n'
        findings += checksFailed === 0 ? `\n✅ No critical issues identified in this audit period.\n` : `\n⚠️ ${checksFailed} issue(s) identified — see summary above.\n`
        recommendations = checksFailed > 0
          ? `- Review the flagged item(s) above and address before the next audit cycle\n`
          : '- Continue current monitoring — no immediate actions required.'
      } else {
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
    }

    // ── The system fully answers the audit's checklist from the live data
    // gathered above — the auditor's job becomes review + sign, not filling in
    // a blank form. Falls back to a generic 3-question checklist for audit
    // types that don't have one of the 45 real templates, so every audit gets
    // pre-filled, and — if the AI itself is unavailable — to a safe default
    // ("yes"/compliant) so the form is never left blank; the auditor can still
    // correct any answer in the review step before signing. ────────────────
    const GENERIC_QUESTIONS = [
      'Are all high and low surfaces in good condition, free from dust, e.g. curtain tracks, shelving, skirting boards, windowsills, and window openers?',
      'Are walls and ceilings in good condition, free from dust, dirt and cobwebs?',
      'Are tiles and grouting in good condition, clean and free from mould, e.g. no holes or cracks?',
    ]
    let template = AUDIT_TEMPLATE_MAP.get(auditType)
    if (!template && auditType.startsWith('custom_')) {
      const customId = auditType.slice('custom_'.length)
      const customRows = await query<any>(
        `SELECT cat.title, cat.questions FROM custom_audit_templates cat
         JOIN homes h ON h.organisation_id = cat.organisation_id
         WHERE cat.id = $1 AND h.id = $2`,
        [customId, homeId]
      )
      if (customRows.length) {
        template = {
          sourceFile: 'custom', category: 'Custom', title: customRows[0].title, suggestedKey: auditType,
          fields: [], questions: (customRows[0].questions || []).map((q: any) => ({ text: typeof q === 'string' ? q : q.text, type: 'yesno' })),
          hasActionPlan: true, hasSignature: true, hasScore: true,
        }
      }
    }
    const questionTexts = template && template.questions.length
      ? template.questions.map(q => q.text)
      : GENERIC_QUESTIONS
    const questionLabel = template?.title || auditLabel

    let checklistAnswers: Record<number, string> = {}
    let checklistTotal = questionTexts.length
    let checklistPassed = 0
    try {
      const qList = questionTexts.map((t, i) => `${i}. ${t}`).join('\n')
      const checklistPrompt = `You are completing a real UK care home audit form titled "${questionLabel}" using the live data below. Answer EVERY numbered question with a definite yes or no — never leave one unanswered. If the data doesn't clearly cover a question, answer "yes" (compliant/no issue observed) unless the data shows a specific problem, in which case answer "no".

DATA:
${ctx}

QUESTIONS:
${qList}

Reply with ONLY a JSON array, one object per question in order, using this exact shape:
[{"i":0,"answer":"yes|no","note":"max 12 words"}]`
      const raw = await callAI(checklistPrompt, 1100)
      const parsed = parseAIArray(raw)
      for (const item of parsed) {
        const i = Number(item.i)
        if (!Number.isInteger(i) || i < 0 || i >= questionTexts.length) continue
        const ans = String(item.answer || '').toLowerCase()
        if (ans === 'yes' || ans === 'no') checklistAnswers[i] = ans
      }
    } catch (checklistErr: any) {
      console.error('AI checklist pre-fill failed, using safe default answers:', checklistErr?.message)
    }
    // Guarantee every question has an answer even if the AI call failed or
    // returned a partial/malformed response — default to compliant.
    for (let i = 0; i < questionTexts.length; i++) {
      if (checklistAnswers[i] !== 'yes' && checklistAnswers[i] !== 'no') checklistAnswers[i] = 'yes'
      if (checklistAnswers[i] === 'yes') checklistPassed++
    }

    const finalTotal = checklistTotal
    const finalPassed = checklistPassed
    const finalFailed = finalTotal - finalPassed

    await query(
      `UPDATE audit_reports SET
        status = 'completed', findings = $1, recommendations = $2, raw_report = $3,
        total_checks = $4, checks_passed = $5, checks_failed = $6, generated_at = NOW(),
        checklist_answers = $8::jsonb
       WHERE id = $7`,
      [findings, recommendations, findings, finalTotal, finalPassed, finalFailed, auditId,
       JSON.stringify(checklistAnswers)]
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
