import { Router, Request, Response, NextFunction } from 'express';
import { param } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';
import { assertResidentAccess } from '../utils/residentAccess';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();
router.use(authenticate);

function fromToken(req: Request, field: string): string {
  const token = req.headers.authorization?.substring(7);
  if (token) { const d = jwt.decode(token) as any; return (req.staff as any)?.[field] || d?.[field] || ''; }
  return (req.staff as any)?.[field] || '';
}

// GET /api/incidents — list incidents from records_incidents joined with daily_records
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const { start_date, end_date, incident_type, search, suId } = req.query;
    if (suId) await assertResidentAccess(req, suId as string);

    let sql = `
      SELECT
        ri.id, ri.daily_record_id, ri.incident_type, ri.location, ri.description,
        ri.injuries, ri.injury_details, ri.medical_needed, ri.medical_details,
        ri.witnesses, ri.immediate_action, ri.cqc_notified, ri.family_notified,
        ri.manager_reviewed, ri.manager_reviewed_at,
        ri.emotion, ri.review_notes, ri.signature, ri.updated_at,
        dr.id as daily_record_id,
        dr.home_id,
        dr.su_id,
        dr.record_date,
        dr.created_at,
        dr.staff_id,
        su.first_name || ' ' || su.last_name as resident_name,
        s.first_name  || ' ' || s.last_name  as recorded_by_name
      FROM records_incidents ri
      JOIN daily_records dr ON dr.id = ri.daily_record_id
      LEFT JOIN service_users su ON su.id = dr.su_id
      LEFT JOIN staff s ON s.id = dr.staff_id
      WHERE dr.home_id = $1
    `;
    const params: any[] = [homeId];

    if (suId) {
      params.push(suId);
      sql += ` AND dr.su_id = $${params.length}`;
    }
    if (start_date) {
      params.push(start_date);
      sql += ` AND dr.record_date >= $${params.length}`;
    }
    if (end_date) {
      params.push(end_date);
      sql += ` AND dr.record_date <= $${params.length}`;
    }
    if (incident_type) {
      params.push(incident_type);
      sql += ` AND ri.incident_type = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (su.first_name || ' ' || su.last_name) ILIKE $${params.length}`;
    }

    sql += ' ORDER BY dr.created_at DESC';

    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/incidents/stats
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');

    const totalRows = await query(
      `SELECT COUNT(*) as total
       FROM records_incidents ri
       JOIN daily_records dr ON dr.id = ri.daily_record_id
       WHERE dr.home_id = $1
         AND date_trunc('month', dr.created_at) = date_trunc('month', NOW())`,
      [homeId]
    );

    const byTypeRows = await query(
      `SELECT ri.incident_type, COUNT(*) as count
       FROM records_incidents ri
       JOIN daily_records dr ON dr.id = ri.daily_record_id
       WHERE dr.home_id = $1
       GROUP BY ri.incident_type
       ORDER BY count DESC`,
      [homeId]
    );

    const trendRows = await query(
      `SELECT date_trunc('month', dr.created_at) as month, COUNT(*) as count
       FROM records_incidents ri
       JOIN daily_records dr ON dr.id = ri.daily_record_id
       WHERE dr.home_id = $1
         AND dr.created_at >= NOW() - INTERVAL '6 months'
       GROUP BY month ORDER BY month ASC`,
      [homeId]
    );

    res.json({
      success: true,
      data: {
        totalThisMonth: parseInt((totalRows[0] as any)?.total || '0'),
        byType: byTypeRows,
        trend: trendRows,
      }
    } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/incidents/:id/ai-analysis — AI-powered incident analysis
router.post('/:id/ai-analysis', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query(`
        SELECT ri.*, dr.record_date, dr.su_id,
               su.first_name || ' ' || su.last_name as resident_name,
               s.first_name  || ' ' || s.last_name  as recorded_by_name
        FROM records_incidents ri
        JOIN daily_records dr ON dr.id = ri.daily_record_id
        LEFT JOIN service_users su ON su.id = dr.su_id
        LEFT JOIN staff s  ON s.id  = dr.staff_id
        WHERE ri.id = $1
      `, [req.params.id]);
      if (!rows.length) throw new AppError('Incident not found', 404);
      const inc = rows[0] as any;

      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const prompt = `You are a care home quality and safety analyst. Analyse this incident report and provide a structured professional report with the following sections:

**1. Root Cause Analysis**
What were the underlying causes of this incident?

**2. Contributing Factors**
What circumstances or conditions contributed to this incident occurring?

**3. Evaluation of Immediate Actions**
Were the immediate actions taken appropriate and sufficient?

**4. Recommended Follow-up Actions**
What specific steps should be taken in the next 24–72 hours?

**5. Prevention Strategies**
How can this type of incident be prevented in future?

**6. Risk Level Assessment**
Is this incident indicative of a wider systemic issue?

Incident details:
- Type: ${inc.incident_type || 'unknown'}
- Resident: ${inc.resident_name || 'unknown'}
- Date: ${inc.record_date || 'unknown'}
- Description: ${inc.description || 'none provided'}
- Location: ${inc.location || 'not recorded'}
- Injuries sustained: ${inc.injuries ? `Yes — ${inc.injury_details || 'details not provided'}` : 'No'}
- Medical attention: ${inc.medical_needed ? `Yes — ${inc.medical_details || 'details not provided'}` : 'No'}
- Immediate action taken: ${inc.immediate_action || 'none recorded'}
- Witnesses: ${inc.witnesses || 'none recorded'}
- CQC notified: ${inc.cqc_notified ? 'Yes' : 'No'}
- Family notified: ${inc.family_notified ? 'Yes' : 'No'}

Provide a clear, concise, professional analysis.`;

      const message = await client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
      });
      const analysis = (message.content[0] as any).text as string;
      res.json({ success: true, data: { analysis } } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/incidents — create a standalone incident (creates daily_record + records_incidents)
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const staffId = fromToken(req, 'staffId');
    const homeId = req.body.homeId || fromToken(req, 'homeId');
    const { suId, incidentType, description, location, incidentDate, injuries, injuryDetails,
            immediateAction, witnesses, medicalNeeded, medicalDetails, cqcNotified, familyNotified } = req.body;
    if (!suId) throw new AppError('suId required', 400);
    if (!homeId) throw new AppError('homeId required', 400);
    if (!staffId) throw new AppError('staffId not found in token', 401);
    const recordDate = incidentDate || new Date().toISOString().split('T')[0];
    const drRow = await query<{ id: string }>(
      `INSERT INTO daily_records (su_id, home_id, staff_id, record_type, record_date, notes)
       VALUES ($1,$2,$3,'incident',$4,$5) RETURNING id`,
      [suId, homeId, staffId, recordDate, description || '']
    );
    const drId = (drRow[0] as any).id;
    const incRow = await query(
      `INSERT INTO records_incidents (daily_record_id, incident_type, location, description,
         injuries, injury_details, medical_needed, medical_details, witnesses, immediate_action,
         cqc_notified, family_notified)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [drId, incidentType || 'other', location || null, description || '',
       injuries || false, injuryDetails || null, medicalNeeded || false, medicalDetails || null,
       witnesses || null, immediateAction || null, cqcNotified || false, familyNotified || false]
    );
    res.status(201).json({ success: true, data: incRow[0] } as ApiResponse);
  } catch (err) { next(err); }
});

// PUT /api/incidents/:id — update incident fields (description, emotion, immediate_action)
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const staffId = fromToken(req, 'staffId');
    const { description, emotion, immediateAction } = req.body;
    const sets: string[] = [];
    const params: any[] = [];
    if (description !== undefined) { params.push(description); sets.push(`description = $${params.length}`); }
    if (emotion !== undefined) { params.push(emotion); sets.push(`emotion = $${params.length}`); }
    if (immediateAction !== undefined) { params.push(immediateAction); sets.push(`immediate_action = $${params.length}`); }
    sets.push(`updated_at = NOW()`);
    params.push(req.params.id);
    if (sets.length === 1) { res.json({ success: true }); return; }
    await query(`UPDATE records_incidents SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
    res.json({ success: true } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/incidents/:id/review-note — append a timestamped review note (managers/team leaders)
router.post('/:id/review-note', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const staffId = fromToken(req, 'staffId');
    const { note } = req.body;
    if (!note?.trim()) throw new AppError('Note text is required', 400);
    const staffRows = await query<any>('SELECT first_name, last_name FROM staff WHERE id = $1', [staffId]);
    const authorName = staffRows.length ? `${staffRows[0].first_name} ${staffRows[0].last_name}` : 'Unknown';
    const entry = { text: note.trim(), author: authorName, timestamp: new Date().toISOString() };
    await query(
      `UPDATE records_incidents SET review_notes = review_notes || $1::jsonb, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify([entry]), req.params.id]
    );
    res.json({ success: true, data: entry } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/incidents/:id/signature — record a digital signature
router.post('/:id/signature', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const staffId = fromToken(req, 'staffId');
    const staffRows = await query<any>('SELECT first_name, last_name, role FROM staff WHERE id = $1', [staffId]);
    const s = staffRows[0];
    const sig = { name: `${s.first_name} ${s.last_name}`, role: s.role, timestamp: new Date().toISOString() };
    await query(
      `UPDATE records_incidents SET signature = $1::jsonb, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(sig), req.params.id]
    );
    res.json({ success: true, data: sig } as ApiResponse);
  } catch (err) { next(err); }
});

// DELETE /api/incidents/:id — delete an incident record (managers and admins only)
router.delete('/:id', requireRole('home_manager', 'group_admin', 'deputy_manager', 'admin'), param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Deletes the records_incidents row; the parent daily_record is kept for audit
      const rows = await query<{ daily_record_id: string }>(
        'DELETE FROM records_incidents WHERE id = $1 RETURNING daily_record_id', [req.params.id]
      );
      if (!rows.length) {
        // Try deleting by daily_record_id in case client sends the daily_record id
        await query('DELETE FROM records_incidents WHERE daily_record_id = $1', [req.params.id]);
      }
      res.json({ success: true, message: 'Incident deleted' } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
