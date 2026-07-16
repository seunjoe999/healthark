import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';

// ── Groq AI caller (same pattern as aiAudit.routes.ts) ───────────────────────
async function callAI(prompt: string, maxTokens = 900): Promise<string> {
  const key = process.env.GROQ_API_KEY || '';
  if (!key || key === 'placeholder') {
    throw Object.assign(new Error('GROQ_API_KEY not configured'), { isKeyMissing: true });
  }

  const MAX_RETRIES = 3;
  let lastErr: any;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.3,
      }),
    });

    if (res.status === 429) {
      const retryAfter = parseFloat(res.headers.get('retry-after') || '12');
      const waitMs = Math.ceil(retryAfter * 1000) + 500;
      console.log(`Groq rate limit hit, waiting ${waitMs}ms before retry ${attempt + 1}/${MAX_RETRIES}`);
      await new Promise(r => setTimeout(r, waitMs));
      lastErr = new Error('Groq rate limit — retrying');
      continue;
    }

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as any;
      throw Object.assign(
        new Error(err?.error?.message || `Groq API error ${res.status}`),
        { isKeyMissing: res.status === 401 },
      );
    }

    const data = (await res.json()) as any;
    return data.choices?.[0]?.message?.content || '';
  }

  throw lastErr || new Error('Groq rate limit exceeded after retries — please wait a moment and try again');
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function fromToken(req: Request, field: string): string {
  const token = req.headers.authorization?.substring(7);
  if (token) {
    const d = jwt.decode(token) as any;
    return (req.staff as any)?.[field] || d?.[field] || '';
  }
  return (req.staff as any)?.[field] || '';
}

function handleAIError(err: any, res: Response, next: NextFunction) {
  if (err?.isKeyMissing || err?.message?.includes('GROQ_API_KEY')) {
    return res.status(400).json({
      success: false,
      error: 'AI not configured. Set GROQ_API_KEY in backend/.env — get a free key at https://console.groq.com',
    } as ApiResponse);
  }
  return next(err);
}

const router = Router();
router.use(authenticate);

// ── 1. POST /api/ai/handover-summary ─────────────────────────────────────────
router.post(
  '/handover-summary',
  [
    body('homeId').optional({ checkFalsy: true }).isUUID(),
    body('shiftDate').optional({ checkFalsy: true }).isISO8601(),
    body('shiftType').optional().isIn(['day', 'night', 'all']),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = req.body.homeId || fromToken(req, 'homeId');
      if (!homeId) throw new AppError('homeId is required', 400);

      const shiftDate: string =
        req.body.shiftDate || new Date().toISOString().split('T')[0];
      const shiftType: string = req.body.shiftType || 'all';

      // Hours window: day = last 12h of daytime, night = last 12h overnight, all = last 24h
      const hoursBack = 8;

      // Aggregate data in parallel
      let activeResidents: any[] = [];
      let dailyRows: any[] = [];
      let marRows: any[] = [];
      let incidents: any[] = [];
      let fluidConcerns: any[] = [];
      let missingRecords: any[] = [];

      await Promise.allSettled([
        query(
          `SELECT id, first_name || ' ' || last_name AS name
           FROM service_users
           WHERE home_id = $1 AND status = 'live'
           ORDER BY last_name`,
          [homeId],
        ).then(r => { activeResidents = r; }),

        query(
          `SELECT dr.record_type, dr.notes, dr.amount_ml,
                  su.first_name || ' ' || su.last_name AS su_name
           FROM daily_records dr
           JOIN service_users su ON su.id = dr.su_id
           WHERE dr.home_id = $1
             AND dr.created_at >= NOW() - INTERVAL '${hoursBack} hours'
           ORDER BY dr.created_at DESC
           LIMIT 100`,
          [homeId],
        ).then(r => { dailyRows = r; }),

        query(
          `SELECT COUNT(*) AS total,
                  COUNT(CASE WHEN given = true THEN 1 END) AS given,
                  COUNT(CASE WHEN refused = true THEN 1 END) AS refused,
                  COUNT(CASE WHEN omitted = true THEN 1 END) AS omitted
           FROM mar_records
           WHERE home_id = $1 AND record_date = $2`,
          [homeId, shiftDate],
        ).then(r => { marRows = r; }),

        query(
          `SELECT ri.incident_type, ri.description,
                  su.first_name || ' ' || su.last_name AS su_name,
                  dr.created_at
           FROM records_incidents ri
           JOIN daily_records dr ON dr.id = ri.daily_record_id
           JOIN service_users su ON su.id = dr.su_id
           WHERE dr.home_id = $1
             AND dr.created_at >= NOW() - INTERVAL '${hoursBack} hours'
           ORDER BY dr.created_at DESC`,
          [homeId],
        ).then(r => { incidents = r; }),

        query(
          `SELECT su.first_name || ' ' || su.last_name AS su_name,
                  SUM(COALESCE(dr.amount_ml, 0)) AS total_ml,
                  su.min_fluid_ml
           FROM daily_records dr
           JOIN service_users su ON su.id = dr.su_id
           WHERE dr.home_id = $1
             AND dr.record_type = 'fluid_intake'
             AND dr.record_date = $2
           GROUP BY su.id, su.first_name, su.last_name, su.min_fluid_ml
           HAVING SUM(COALESCE(dr.amount_ml, 0)) < COALESCE(su.min_fluid_ml, 1500)`,
          [homeId, shiftDate],
        ).then(r => { fluidConcerns = r; }),

        query(
          `SELECT su.first_name || ' ' || su.last_name AS su_name
           FROM service_users su
           WHERE su.home_id = $1 AND su.status = 'live'
             AND NOT EXISTS (
               SELECT 1 FROM daily_records dr
               WHERE dr.su_id = su.id AND dr.record_date = $2
             )`,
          [homeId, shiftDate],
        ).then(r => { missingRecords = r; }),
      ]);

      const mar = (marRows[0] || {}) as any;
      const medsGiven = parseInt(mar.given || '0');
      const medsRefused = parseInt(mar.refused || '0');
      const medsTotal = parseInt(mar.total || '0');

      // Stats object (always returned even if AI fails)
      const stats = {
        residents: activeResidents.length,
        medicationsGiven: medsGiven,
        incidents: incidents.length,
        concerns: fluidConcerns.length + missingRecords.length,
      };

      // Build compact context for AI
      const limit = (arr: any[], fn: (x: any) => string, n = 5) =>
        arr.slice(0, n).map(fn).join('; ') || 'none';

      const ctx = [
        `Shift: ${shiftType} | Date: ${shiftDate} | Last ${hoursBack}h`,
        `Active residents: ${activeResidents.length}`,
        `Daily records logged: ${dailyRows.length} entries`,
        `MAR: ${medsTotal} due, ${medsGiven} given, ${medsRefused} refused, ${mar.omitted || 0} omitted`,
        `Incidents (last ${hoursBack}h): ${incidents.length}` +
          (incidents.length
            ? ` — ${limit(incidents, i => `${i.su_name}: ${String(i.incident_type).replace(/_/g, ' ')}`)}`
            : ''),
        `Fluid below threshold today: ${fluidConcerns.length}` +
          (fluidConcerns.length
            ? ` — ${limit(fluidConcerns, f => `${f.su_name} (${f.total_ml}ml vs ${f.min_fluid_ml || 1500}ml target)`)}`
            : ''),
        `Residents with no records today: ${missingRecords.length}` +
          (missingRecords.length ? ` — ${limit(missingRecords, r => r.su_name)}` : ''),
      ].join('\n');

      const prompt = `You are a UK care home senior carer writing a shift handover brief. Be concise and professional.

SHIFT DATA:
${ctx}

Write a bulleted handover summary covering:
• Residents seen and general status
• Medications administered / refused / concerns
• Incidents or accidents this shift
• Fluid intake concerns
• Any missing records or follow-up needed

Use clear British English. Plain bullet points only — no markdown headers. Max 250 words.`;

      let summary: string;
      try {
        summary = await callAI(prompt, 500);
        if (!summary.trim()) throw new Error('Empty AI response');
      } catch (aiErr: any) {
        console.error('Handover AI failed, using fallback:', aiErr?.message);
        summary = [
          `• ${activeResidents.length} residents currently active on this shift (${shiftType}, ${shiftDate}).`,
          `• Medications: ${medsGiven} administered, ${medsRefused} refused out of ${medsTotal} scheduled.`,
          incidents.length
            ? `• ${incidents.length} incident(s) recorded this shift: ${limit(incidents, i => `${i.su_name} — ${String(i.incident_type).replace(/_/g, ' ')}`)}.`
            : '• No incidents recorded this shift.',
          fluidConcerns.length
            ? `• Fluid intake concern(s): ${limit(fluidConcerns, f => `${f.su_name} (${f.total_ml}ml)`)} — below recommended minimum.`
            : '• No fluid intake concerns noted.',
          missingRecords.length
            ? `• Missing daily records for: ${limit(missingRecords, r => r.su_name)} — please ensure entries are completed before end of shift.`
            : '• All active residents have at least one record for today.',
        ].join('\n');
      }

      res.json({ success: true, data: { summary, stats } } as ApiResponse);
    } catch (err: any) {
      return handleAIError(err, res, next);
    }
  },
);

// ── 2. POST /api/ai/medication-check ─────────────────────────────────────────
router.post(
  '/medication-check',
  [
    body('suId').isUUID().withMessage('suId must be a valid UUID'),
    body('medicationName').notEmpty().withMessage('medicationName is required'),
    body('dose').notEmpty().withMessage('dose is required'),
    body('route').notEmpty().withMessage('route is required'),
    body('instructions').optional({ checkFalsy: true }).isString(),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { suId, medicationName, dose, route, instructions } = req.body;

      // Fetch resident profile + current medications in parallel
      let suRows: any[] = [];
      let activeMeds: any[] = [];

      await Promise.all([
        query(
          `SELECT first_name || ' ' || last_name AS name,
                  date_of_birth, allergies, medical_history, notes
           FROM service_users WHERE id = $1`,
          [suId],
        ).then(r => { suRows = r; }),

        query(
          `SELECT medication_name, dose, route, frequency, instructions, start_date
           FROM su_medications
           WHERE su_id = $1 AND is_active = true
           ORDER BY medication_name`,
          [suId],
        ).then(r => { activeMeds = r; }),
      ]);

      if (!suRows.length) throw new AppError('Resident not found', 404);
      const su = suRows[0] as any;

      const medList =
        activeMeds.length
          ? activeMeds
              .map(m => `${m.medication_name} ${m.dose} (${m.route}) — ${m.frequency}`)
              .join('; ')
          : 'No current medications on record';

      const prompt = `You are a UK care home clinical pharmacist reviewer. Check for interactions or concerns.

RESIDENT: ${su.name}
ALLERGIES: ${su.allergies || 'None recorded'}
MEDICAL HISTORY: ${(su.medical_history || 'Not recorded').substring(0, 200)}

PROPOSED MEDICATION: ${medicationName} ${dose} via ${route}
INSTRUCTIONS: ${instructions || 'Standard administration'}

CURRENT ACTIVE MEDICATIONS:
${medList}

Assess: drug interactions, allergy conflicts, dose concerns, administration route suitability.

Respond in this exact JSON format (no markdown):
{"hasAlert":true/false,"severity":"low|medium|high","message":"One sentence summary","details":["specific concern 1","specific concern 2"]}

If no concerns, set hasAlert to false, severity to "low", and details to [].`;

      let result: { hasAlert: boolean; severity: string; message: string; details: string[] };

      try {
        const raw = await callAI(prompt, 400);
        const cleaned = raw.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '').trim();
        const parsed = JSON.parse(cleaned.match(/\{[\s\S]*\}/)?.[0] || cleaned);
        result = {
          hasAlert: Boolean(parsed.hasAlert),
          severity: ['low', 'medium', 'high'].includes(parsed.severity) ? parsed.severity : 'low',
          message: String(parsed.message || 'Review completed.'),
          details: Array.isArray(parsed.details) ? parsed.details.map(String) : [],
        };
      } catch (aiErr: any) {
        console.error('Medication check AI failed:', aiErr?.message);
        // Safe fallback — flag for manual review
        result = {
          hasAlert: true,
          severity: 'low',
          message: 'Automated interaction check unavailable — please verify manually with prescribing clinician.',
          details: [
            `Proposed: ${medicationName} ${dose} via ${route}`,
            `Resident allergies: ${su.allergies || 'None recorded'}`,
            `Current medications: ${activeMeds.length} active`,
          ],
        };
      }

      res.json({ success: true, data: result } as ApiResponse);
    } catch (err: any) {
      return handleAIError(err, res, next);
    }
  },
);

// ── 3. POST /api/ai/draft-incident ────────────────────────────────────────────
router.post(
  '/draft-incident',
  [
    body('suId').isUUID().withMessage('suId must be a valid UUID'),
    body('staffNote').notEmpty().withMessage('staffNote is required'),
    body('incidentType').notEmpty().withMessage('incidentType is required'),
    body('incidentDate').optional({ checkFalsy: true }).isISO8601(),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { suId, staffNote, incidentType, incidentDate } = req.body;
      const staffId = fromToken(req, 'staffId');
      const dateStr: string = incidentDate || new Date().toISOString().split('T')[0];

      const suRows = await query(
        `SELECT first_name || ' ' || last_name AS name, date_of_birth, room_number
         FROM service_users WHERE id = $1`,
        [suId],
      );
      if (!suRows.length) throw new AppError('Resident not found', 404);
      const su = suRows[0] as any;

      const incidentLabel = String(incidentType).replace(/_/g, ' ');

      const prompt = `You are a UK care home senior manager writing a formal incident report. Expand the staff note into a structured report.

RESIDENT: ${su.name}${su.room_number ? ` (Room ${su.room_number})` : ''}
DATE OF INCIDENT: ${dateStr}
INCIDENT TYPE: ${incidentLabel}
STAFF NOTE (informal): "${staffNote}"

Write a formal UK care home incident report with these sections:
1. INCIDENT DETAILS — Date, time (if mentioned), location, type
2. DESCRIPTION — What happened, factual and objective, third person
3. IMMEDIATE ACTIONS TAKEN — Care given, who was notified
4. WITNESSES / PERSONS PRESENT — Note if unknown
5. INJURIES / CONSEQUENCES — Physical and emotional impact
6. FOLLOW-UP REQUIRED — Next steps, referrals, monitoring

Use formal British English. Objective, factual tone. Do not speculate beyond the staff note. Max 350 words.`;

      let draftReport: string;

      try {
        draftReport = await callAI(prompt, 600);
        if (!draftReport.trim()) throw new Error('Empty AI response');
      } catch (aiErr: any) {
        console.error('Draft incident AI failed:', aiErr?.message);
        draftReport = [
          `INCIDENT REPORT`,
          ``,
          `RESIDENT: ${su.name}`,
          `DATE OF INCIDENT: ${dateStr}`,
          `INCIDENT TYPE: ${incidentLabel}`,
          ``,
          `1. INCIDENT DETAILS`,
          `Date: ${dateStr}. Type: ${incidentLabel}.`,
          ``,
          `2. DESCRIPTION`,
          `${staffNote}`,
          ``,
          `3. IMMEDIATE ACTIONS TAKEN`,
          `[To be completed by reporting staff member]`,
          ``,
          `4. WITNESSES / PERSONS PRESENT`,
          `[To be completed by reporting staff member]`,
          ``,
          `5. INJURIES / CONSEQUENCES`,
          `[To be completed by reporting staff member]`,
          ``,
          `6. FOLLOW-UP REQUIRED`,
          `[Manager to complete — review within 24 hours]`,
        ].join('\n');
      }

      res.json({ success: true, data: { draftReport } } as ApiResponse);
    } catch (err: any) {
      return handleAIError(err, res, next);
    }
  },
);

// ── 4. GET /api/ai/resident-risk/:suId ───────────────────────────────────────
router.get(
  '/resident-risk/:suId',
  [param('suId').isUUID().withMessage('suId must be a valid UUID')],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { suId } = req.params;

      // Gather 30-day risk indicators in parallel
      let suRows: any[] = [];
      let incidentCount: any[] = [];
      let missedRecords: any[] = [];
      let refusedMeds: any[] = [];
      let safeguarding: any[] = [];
      let seizures: any[] = [];
      let observations: any[] = [];

      await Promise.allSettled([
        query(
          `SELECT first_name || ' ' || last_name AS name, date_of_birth,
                  risk_level, allergies, medical_history, dnr_status
           FROM service_users WHERE id = $1`,
          [suId],
        ).then(r => { suRows = r; }),

        query(
          `SELECT COUNT(*) AS total,
                  COUNT(CASE WHEN ri.incident_type ILIKE '%fall%' THEN 1 END) AS falls,
                  COUNT(CASE WHEN ri.incident_type ILIKE '%aggress%' THEN 1 END) AS aggression
           FROM records_incidents ri
           JOIN daily_records dr ON dr.id = ri.daily_record_id
           WHERE dr.su_id = $1
             AND dr.record_date >= CURRENT_DATE - INTERVAL '30 days'`,
          [suId],
        ).then(r => { incidentCount = r; }),

        query(
          `SELECT COUNT(*) AS missed_days
           FROM generate_series(
             CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE - INTERVAL '1 day', '1 day'::interval
           ) AS d(day)
           WHERE NOT EXISTS (
             SELECT 1 FROM daily_records dr
             WHERE dr.su_id = $1 AND dr.record_date = d.day::date
           )`,
          [suId],
        ).then(r => { missedRecords = r; }),

        query(
          `SELECT COUNT(*) AS refused_count
           FROM mar_records
           WHERE su_id = $1
             AND refused = true
             AND record_date >= CURRENT_DATE - INTERVAL '30 days'`,
          [suId],
        ).then(r => { refusedMeds = r; }),

        query(
          `SELECT COUNT(*) AS concerns,
                  COUNT(CASE WHEN manager_ack = false OR manager_ack IS NULL THEN 1 END) AS unacknowledged
           FROM safeguarding_concerns
           WHERE su_id = $1
             AND incident_date >= CURRENT_DATE - INTERVAL '30 days'`,
          [suId],
        ).then(r => { safeguarding = r; }),

        query(
          `SELECT COUNT(*) AS seizure_count
           FROM seizure_records
           WHERE su_id = $1
             AND seizure_date >= CURRENT_DATE - INTERVAL '30 days'`,
          [suId],
        ).then(r => { seizures = r; }).catch(() => { seizures = [{ seizure_count: 0 }]; }),

        query(
          `SELECT observation_type, severity, notes, observed_at
           FROM observations
           WHERE su_id = $1
             AND observed_at >= NOW() - INTERVAL '30 days'
             AND severity IN ('high', 'critical')
           ORDER BY observed_at DESC
           LIMIT 5`,
          [suId],
        ).then(r => { observations = r; }).catch(() => { observations = []; }),
      ]);

      if (!suRows.length) throw new AppError('Resident not found', 404);
      const su = suRows[0] as any;

      const inc = (incidentCount[0] || {}) as any;
      const missed = parseInt((missedRecords[0] as any)?.missed_days || '0');
      const refused = parseInt((refusedMeds[0] as any)?.refused_count || '0');
      const sg = (safeguarding[0] || {}) as any;
      const sz = parseInt((seizures[0] as any)?.seizure_count || '0');
      const totalIncidents = parseInt(inc.total || '0');
      const falls = parseInt(inc.falls || '0');
      const aggression = parseInt(inc.aggression || '0');

      const ctx = [
        `Resident: ${su.name} | Existing risk level: ${su.risk_level || 'not set'}`,
        `Allergies: ${su.allergies || 'none recorded'}`,
        `Last 30 days:`,
        `  Incidents: ${totalIncidents} total (${falls} falls, ${aggression} aggression-related)`,
        `  Days with missing records: ${missed}/30`,
        `  Medication refusals: ${refused}`,
        `  Safeguarding concerns: ${parseInt(sg.concerns || '0')} (${parseInt(sg.unacknowledged || '0')} unacknowledged)`,
        `  Seizures: ${sz}`,
        observations.length
          ? `  High/critical observations: ${observations.map(o => `${o.observation_type} (${o.severity})`).join(', ')}`
          : '  No high/critical observations',
      ].join('\n');

      const prompt = `You are a UK care home risk assessment specialist. Assess this resident's current risk level.

${ctx}

Provide a risk assessment in this exact JSON format (no markdown):
{"riskLevel":"low|medium|high|critical","score":0-100,"factors":["factor 1","factor 2","factor 3"],"recommendations":["recommendation 1","recommendation 2","recommendation 3"]}

Score 0-100 where: 0-25=low, 26-50=medium, 51-75=high, 76-100=critical.
Factors: list the specific risk drivers from the data. Recommendations: actionable care steps.
Maximum 4 items each. Use formal British English.`;

      let riskResult: {
        riskLevel: string;
        score: number;
        factors: string[];
        recommendations: string[];
      };

      try {
        const raw = await callAI(prompt, 500);
        const cleaned = raw.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '').trim();
        const parsed = JSON.parse(cleaned.match(/\{[\s\S]*\}/)?.[0] || cleaned);
        const validLevels = ['low', 'medium', 'high', 'critical'];
        riskResult = {
          riskLevel: validLevels.includes(parsed.riskLevel) ? parsed.riskLevel : 'medium',
          score: Math.min(100, Math.max(0, parseInt(parsed.score) || 0)),
          factors: Array.isArray(parsed.factors) ? parsed.factors.map(String).slice(0, 4) : [],
          recommendations: Array.isArray(parsed.recommendations)
            ? parsed.recommendations.map(String).slice(0, 4)
            : [],
        };
      } catch (aiErr: any) {
        console.error('Resident risk AI failed, using rule-based fallback:', aiErr?.message);

        // Rule-based scoring fallback
        let score = 0;
        const factors: string[] = [];
        const recommendations: string[] = [];

        if (totalIncidents >= 5) { score += 25; factors.push(`${totalIncidents} incidents in last 30 days`); }
        else if (totalIncidents >= 2) { score += 15; factors.push(`${totalIncidents} incidents in last 30 days`); }
        if (falls >= 2) { score += 20; factors.push(`${falls} falls recorded`); recommendations.push('Review falls risk assessment and implement bed/chair sensor if appropriate'); }
        if (missed >= 10) { score += 15; factors.push(`${missed} days with missing daily records`); recommendations.push('Ensure daily records are completed by all shifts'); }
        if (refused >= 5) { score += 15; factors.push(`${refused} medication refusals`); recommendations.push('Refer to GP to review medication regime and administration method'); }
        if (parseInt(sg.concerns || '0') > 0) { score += 20; factors.push('Active safeguarding concerns'); recommendations.push('Ensure all safeguarding concerns are acknowledged and actioned'); }
        if (sz >= 2) { score += 20; factors.push(`${sz} seizures in 30 days`); recommendations.push('Inform GP and review seizure care plan and rescue medication'); }

        const riskLevel = score >= 76 ? 'critical' : score >= 51 ? 'high' : score >= 26 ? 'medium' : 'low';
        if (!recommendations.length) recommendations.push('Continue current care plan and monitoring');

        riskResult = { riskLevel, score, factors, recommendations };
      }

      res.json({ success: true, data: riskResult } as ApiResponse);
    } catch (err: any) {
      return handleAIError(err, res, next);
    }
  },
);

// ── 5. POST /api/ai/format-note ───────────────────────────────────────────────
router.post(
  '/format-note',
  [
    body('rawText').notEmpty().withMessage('rawText is required'),
    body('noteType')
      .optional()
      .isIn(['daily_record', 'incident', 'care_plan', 'general'])
      .withMessage('noteType must be daily_record, incident, care_plan, or general'),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { rawText, noteType = 'general' } = req.body;

      const noteLabels: Record<string, string> = {
        daily_record: 'daily care record',
        incident: 'incident report entry',
        care_plan: 'care plan note',
        general: 'general care note',
      };

      const noteLabel = noteLabels[noteType] || 'care note';

      const contextHints: Record<string, string> = {
        daily_record: 'Include: what was observed, care provided, resident response, any concerns.',
        incident: 'Include: what happened, when, where, who was involved, immediate response.',
        care_plan: 'Include: current needs, care approach, goals, review indicators.',
        general: 'Ensure clinical clarity, factual tone, and professional language.',
      };

      const prompt = `You are a UK care home clinical documentation specialist. Reformat the raw staff note into professional clinical language suitable for a ${noteLabel}.

RAW NOTE:
"${rawText.substring(0, 600)}"

INSTRUCTIONS:
- Preserve all factual content — do not add or remove clinical facts
- Convert shorthand, abbreviations, and informal language to formal British English
- Use third person, objective tone
- ${contextHints[noteType] || contextHints.general}
- Correct grammar and spelling
- Max 200 words
- Return only the formatted note — no preamble or explanation`;

      let formatted: string;

      try {
        formatted = await callAI(prompt, 400);
        if (!formatted.trim()) throw new Error('Empty AI response');
        // Strip any AI preamble that snuck in
        formatted = formatted
          .replace(/^(here['']s|formatted note[:\s]*|clinical note[:\s]*)/i, '')
          .trim();
      } catch (aiErr: any) {
        console.error('Format note AI failed:', aiErr?.message);
        // Return cleaned-up version of the original as fallback
        formatted = rawText
          .trim()
          .replace(/\s{2,}/g, ' ')
          .replace(/([.!?])\s*([a-z])/g, (_: string, p: string, c: string) => `${p} ${c.toUpperCase()}`);
      }

      res.json({ success: true, data: { formatted } } as ApiResponse);
    } catch (err: any) {
      return handleAIError(err, res, next);
    }
  },
);

// ── 6. POST /api/ai/find-replacement ─────────────────────────────────────────
router.post(
  '/find-replacement',
  [
    body('homeId').optional({ checkFalsy: true }).isUUID(),
    body('shiftDate').notEmpty().withMessage('shiftDate is required'),
    body('shiftType').isIn(['early', 'late', 'night']).withMessage('shiftType must be early, late, or night'),
    body('absentStaffId').isUUID().withMessage('absentStaffId must be a valid UUID'),
    body('reason').notEmpty().withMessage('reason is required'),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = req.body.homeId || fromToken(req, 'homeId');
      if (!homeId) throw new AppError('homeId is required', 400);

      const { shiftDate, shiftType, absentStaffId, reason } = req.body;

      // 1. Look up absent staff member
      const absentRows = await query(
        `SELECT first_name || ' ' || last_name AS name, role
         FROM staff WHERE id = $1`,
        [absentStaffId],
      );
      if (!absentRows.length) throw new AppError('Absent staff member not found', 404);
      const absent = absentRows[0] as any;

      // 2. Query off-duty staff for that home
      const candidateRows = await query(
        `SELECT id, first_name || ' ' || last_name AS name, role, phone, email
         FROM staff
         WHERE home_id = $1
           AND id != $2
           AND status = 'active'
         ORDER BY last_name`,
        [homeId, absentStaffId],
      );

      if (!candidateRows.length) {
        return res.json({
          success: true,
          data: {
            absent: { name: absent.name, role: absent.role },
            replacements: [],
            aiSummary: 'No available staff found for this home.',
          },
        } as ApiResponse);
      }

      // 3. For each candidate: check shifts this week and training
      const weekAgo = new Date(shiftDate);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split('T')[0];

      const enriched = await Promise.all(
        (candidateRows as any[]).map(async (staff) => {
          let shiftsThisWeek = 0;
          let hasTraining = true;

          await Promise.allSettled([
            query(
              `SELECT COUNT(*) AS cnt
               FROM clockin_events
               WHERE staff_id = $1
                 AND DATE(clock_in_time) >= $2
                 AND DATE(clock_in_time) <= $3`,
              [staff.id, weekAgoStr, shiftDate],
            ).then(r => { shiftsThisWeek = parseInt((r[0] as any)?.cnt || '0'); }),

            query(
              `SELECT COUNT(*) AS cnt
               FROM staff_training
               WHERE staff_id = $1
                 AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)`,
              [staff.id],
            ).then(r => { hasTraining = parseInt((r[0] as any)?.cnt || '0') > 0; }),
          ]);

          return {
            staffId: staff.id,
            name: staff.name,
            role: staff.role,
            phone: staff.phone || null,
            shiftsThisWeek,
            overtimeRisk: shiftsThisWeek > 5 ? 'high' : shiftsThisWeek >= 4 ? 'medium' : 'low',
            hasTraining,
            aiReason: '',
            recommended: false,
          };
        }),
      );

      // Sort by fewest shifts (fallback order)
      enriched.sort((a, b) => a.shiftsThisWeek - b.shiftsThisWeek);

      // 4. Call AI to rank and explain
      let aiSummary = '';
      try {
        const staffCtx = enriched
          .slice(0, 10)
          .map(
            (s, i) =>
              `${i + 1}. ${s.name} (${(s.role || '').replace(/_/g, ' ')}) — ${s.shiftsThisWeek} shifts this week, overtime risk: ${s.overtimeRisk}, training current: ${s.hasTraining}`,
          )
          .join('\n');

        const prompt = `You are a UK care home manager finding emergency cover for an absent staff member.

ABSENT STAFF: ${absent.name} (${(absent.role || '').replace(/_/g, ' ')})
SHIFT: ${shiftType} shift on ${shiftDate}
REASON FOR ABSENCE: ${reason}

AVAILABLE OFF-DUTY STAFF:
${staffCtx}

Rank these staff members for cover suitability. For each, provide a brief one-sentence reason.
Respond in this exact JSON format (no markdown, no preamble):
{"summary":"Brief 1-2 sentence overall summary","rankings":[{"index":1,"reason":"one sentence","recommended":true},{"index":2,"reason":"one sentence","recommended":false}]}

Index matches the staff list numbers above. Recommended=true for top 1-2 picks only. Consider overtime risk and training currency.`;

        const raw = await callAI(prompt, 600);
        const cleaned = raw.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '').trim();
        const parsed = JSON.parse(cleaned.match(/\{[\s\S]*\}/)?.[0] || cleaned);

        aiSummary = String(parsed.summary || '');

        if (Array.isArray(parsed.rankings)) {
          for (const ranking of parsed.rankings) {
            const idx = (ranking.index as number) - 1;
            if (idx >= 0 && idx < enriched.length) {
              enriched[idx].aiReason = String(ranking.reason || '');
              enriched[idx].recommended = Boolean(ranking.recommended);
            }
          }
        }
      } catch (aiErr: any) {
        console.error('Find replacement AI failed, using fallback:', aiErr?.message);
        aiSummary = `${enriched.length} staff available for cover. Listed by fewest shifts this week to minimise overtime risk.`;
        enriched.forEach((s, i) => {
          s.aiReason = s.shiftsThisWeek > 5
            ? `High overtime risk — has worked ${s.shiftsThisWeek} shifts this week.`
            : `Has worked ${s.shiftsThisWeek} shifts this week — ${s.overtimeRisk} overtime risk.`;
          s.recommended = i < 2 && s.overtimeRisk !== 'high';
        });
      }

      res.json({
        success: true,
        data: {
          absent: { name: absent.name, role: absent.role },
          replacements: enriched,
          aiSummary,
        },
      } as ApiResponse);
    } catch (err: any) {
      return handleAIError(err, res, next);
    }
  },
);

// ── 7. POST /api/ai/notify-replacement ───────────────────────────────────────
router.post(
  '/notify-replacement',
  [
    body('staffId').isUUID().withMessage('staffId must be a valid UUID'),
    body('shiftDate').notEmpty().withMessage('shiftDate is required'),
    body('shiftType').notEmpty().withMessage('shiftType is required'),
    body('message').notEmpty().withMessage('message is required'),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { staffId, shiftDate, shiftType, message } = req.body;
      const homeId = req.body.homeId || fromToken(req, 'homeId');

      // Look up staff phone/email
      const staffRows = await query(
        `SELECT first_name || ' ' || last_name AS name, phone, email, home_id
         FROM staff WHERE id = $1`,
        [staffId],
      );
      if (!staffRows.length) throw new AppError('Staff member not found', 404);
      const staff = staffRows[0] as any;
      const effectiveHomeId = homeId || staff.home_id;

      // Insert notification
      await query(
        `INSERT INTO notifications (recipient_id, home_id, title, body, type)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          staffId,
          effectiveHomeId,
          'Shift Cover Request',
          message || `You have been asked to cover the ${shiftType} shift on ${shiftDate}.`,
          'shift_cover',
        ],
      );

      res.json({
        success: true,
        data: { message: 'Notification sent', staffName: staff.name },
      } as ApiResponse);
    } catch (err: any) {
      return handleAIError(err, res, next);
    }
  },
);

export default router;

