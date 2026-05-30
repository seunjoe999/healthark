import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';

const router = Router();
router.use(authenticate);

function decoded(req: Request): any {
  const t = req.headers.authorization?.substring(7);
  return t ? jwt.decode(t) as any : {};
}
function tok(req: Request, field: string): string {
  const d = decoded(req);
  return (req.staff as any)?.[field] || d?.[field] || '';
}

// GET /api/performance — list all reviews
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const role = tok(req, 'role');
    const orgId = tok(req, 'organisationId');
    const homeId = (req.query.homeId as string) || tok(req, 'homeId');
    const { staffId: filterStaff } = req.query as Record<string, string>;

    let sql: string;
    const params: unknown[] = [];

    if (role === 'group_admin' && !homeId) {
      sql = `SELECT pm.*, s.first_name || ' ' || s.last_name AS staff_name, s.role AS staff_role,
                    a.first_name || ' ' || a.last_name AS assessed_by_name
             FROM staff_performance pm
             LEFT JOIN staff s ON s.id = pm.staff_id AND s.organisation_id = $1
             LEFT JOIN staff a ON a.id = pm.assessed_by`;
      params.push(orgId);
      if (filterStaff) { sql += ` WHERE pm.staff_id = $2`; params.push(filterStaff); }
    } else {
      sql = `SELECT pm.*, s.first_name || ' ' || s.last_name AS staff_name, s.role AS staff_role,
                    a.first_name || ' ' || a.last_name AS assessed_by_name
             FROM staff_performance pm
             LEFT JOIN staff s ON s.id = pm.staff_id
             LEFT JOIN staff a ON a.id = pm.assessed_by
             WHERE pm.home_id = $1`;
      params.push(homeId);
      if (filterStaff) { sql += ` AND pm.staff_id = $2`; params.push(filterStaff); }
    }
    sql += ' ORDER BY pm.created_at DESC LIMIT 200';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/performance/matrix — latest review per staff member (the matrix view)
router.get('/matrix', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const role = tok(req, 'role');
    const orgId = tok(req, 'organisationId');
    const homeId = (req.query.homeId as string) || tok(req, 'homeId');

    let rows;
    if (role === 'group_admin' && !homeId) {
      rows = await query(`
        SELECT DISTINCT ON (s.id)
               s.id AS staff_id, s.first_name || ' ' || s.last_name AS staff_name,
               s.role, s.job_title, s.home_id,
               pm.id AS review_id, pm.period, pm.overall_score, pm.risk_rating,
               pm.training_compliance, pm.supervision_completed,
               pm.punctuality_score, pm.care_quality_score, pm.created_at,
               (SELECT COUNT(*) FROM assessments a WHERE a.subject_id = s.id AND a.category = 'staff') AS assessment_count,
               (SELECT a2.score_pct FROM assessments a2 WHERE a2.subject_id = s.id AND a2.category = 'staff' ORDER BY a2.assessment_date DESC LIMIT 1) AS latest_assessment_score,
               (SELECT a3.assessment_date FROM assessments a3 WHERE a3.subject_id = s.id AND a3.category = 'staff' ORDER BY a3.assessment_date DESC LIMIT 1) AS latest_assessment_date
        FROM staff s
        LEFT JOIN staff_performance pm ON pm.staff_id = s.id
        WHERE s.organisation_id = $1 AND s.is_active = TRUE
        ORDER BY s.id, pm.created_at DESC NULLS LAST`, [orgId]);
    } else {
      rows = await query(`
        SELECT DISTINCT ON (s.id)
               s.id AS staff_id, s.first_name || ' ' || s.last_name AS staff_name,
               s.role, s.job_title,
               pm.id AS review_id, pm.period, pm.overall_score, pm.risk_rating,
               pm.training_compliance, pm.supervision_completed,
               pm.punctuality_score, pm.care_quality_score, pm.created_at,
               (SELECT COUNT(*) FROM assessments a WHERE a.subject_id = s.id AND a.category = 'staff') AS assessment_count,
               (SELECT a2.score_pct FROM assessments a2 WHERE a2.subject_id = s.id AND a2.category = 'staff' ORDER BY a2.assessment_date DESC LIMIT 1) AS latest_assessment_score,
               (SELECT a3.assessment_date FROM assessments a3 WHERE a3.subject_id = s.id AND a3.category = 'staff' ORDER BY a3.assessment_date DESC LIMIT 1) AS latest_assessment_date
        FROM staff s
        LEFT JOIN staff_performance pm ON pm.staff_id = s.id AND pm.home_id = $1
        WHERE s.home_id = $1 AND s.is_active = TRUE
        ORDER BY s.id, pm.created_at DESC NULLS LAST`, [homeId]);
    }
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/performance
router.post('/', [
  body('staffId').isUUID(),
  body('period').notEmpty(),
], validateRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.body.homeId as string) || tok(req, 'homeId');
    const assessedBy = tok(req, 'staffId');
    const {
      staffId, period,
      trainingCompliance, supervisionCompleted, supervisionsDue, supervisionsDone,
      incidentsReported, punctualityScore, attitudeScore, careQualityScore,
      documentationScore, teamworkScore, overallScore, riskRating,
      strengths, areasImprovement, actionPlan, notes,
    } = req.body;
    const rows = await query(
      `INSERT INTO staff_performance
         (home_id, staff_id, assessed_by, period,
          training_compliance, supervision_completed, supervisions_due, supervisions_done,
          incidents_reported, punctuality_score, attitude_score, care_quality_score,
          documentation_score, teamwork_score, overall_score, risk_rating,
          strengths, areas_improvement, action_plan, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING *`,
      [homeId, staffId, assessedBy, period,
       trainingCompliance ?? null, supervisionCompleted ?? false,
       supervisionsDue ?? null, supervisionsDone ?? null,
       incidentsReported ?? 0,
       punctualityScore ?? null, attitudeScore ?? null, careQualityScore ?? null,
       documentationScore ?? null, teamworkScore ?? null, overallScore ?? null,
       riskRating || 'low',
       strengths || null, areasImprovement || null, actionPlan || null, notes || null]
    );
    res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
  } catch (err) { next(err); }
});

// DELETE /api/performance/:id
router.delete('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await query('DELETE FROM staff_performance WHERE id=$1', [req.params.id]);
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/performance/auto-generate — auto-generate performance records from real data
router.post('/auto-generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const role = tok(req, 'role');
    const orgId = tok(req, 'organisationId');
    const homeId = (req.body.homeId as string) || tok(req, 'homeId');
    const assessedBy = tok(req, 'staffId');
    // Use an exact timestamp for the period so every generation creates a BRAND NEW distinct record
    const period = 'Auto-' + new Date().getTime().toString();

    // Get all active staff for this home
    let staffRows: any[];
    if (role === 'group_admin' && !homeId) {
      staffRows = await query(
        `SELECT id, home_id FROM staff WHERE organisation_id = $1 AND is_active = TRUE`, [orgId]
      );
    } else {
      staffRows = await query(
        `SELECT id, home_id FROM staff WHERE home_id = $1 AND is_active = TRUE`, [homeId]
      );
    }

    const ninety_days_ago = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];
    let created = 0;

    for (const s of staffRows) {
      const staffHomeId = homeId || s.home_id;

      // Training compliance: count non-expired trainings
      const trainingRows = await query<any>(
        `SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE expiry_date IS NULL OR expiry_date > CURRENT_DATE) as valid
         FROM staff_training WHERE staff_id = $1`, [s.id]
      );
      const total = parseInt(trainingRows[0]?.total || '0');
      const valid = parseInt(trainingRows[0]?.valid || '0');
      const trainingCompliance = total === 0 ? 50 : Math.round((valid / total) * 100);

      // DBS check — is there a valid one?
      const dbsRows = await query<any>(
        `SELECT expiry_date FROM staff_dbs WHERE staff_id = $1 AND (expiry_date IS NULL OR expiry_date > CURRENT_DATE) LIMIT 1`,
        [s.id]
      );
      const dbsValid = dbsRows.length > 0;

      // Incidents in last 90 days where this staff member recorded the record
      const incidentRows = await query<any>(
        `SELECT COUNT(*) as cnt FROM records_incidents ri
         JOIN daily_records dr ON dr.id = ri.daily_record_id
         WHERE dr.staff_id = $1 AND dr.record_date >= $2`, [s.id, ninety_days_ago]
      );
      const incidentCount = parseInt(incidentRows[0]?.cnt || '0');

      // Clock-in punctuality (last 90 days — count total vs on-time)
      const clockRows = await query<any>(
        `SELECT COUNT(*) as total,
                COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM event_time) < 8 OR
                  (EXTRACT(HOUR FROM event_time) = 8 AND EXTRACT(MINUTE FROM event_time) <= 10)) as on_time
         FROM staff_clock_events
         WHERE staff_id = $1 AND event_type = 'clock_in' AND event_time >= NOW() - INTERVAL '90 days'`,
        [s.id]
      );
      const totalClocks = parseInt(clockRows[0]?.total || '0');
      const onTime = parseInt(clockRows[0]?.on_time || '0');
      const punctualityPct = totalClocks === 0 ? 80 : Math.round((onTime / totalClocks) * 100);
      // Map 0-100 percentage to 1-5 rating scale for DB check constraint
      const punctualityScore = Math.min(5, Math.max(1, Math.round(punctualityPct / 20)));

      // Calculate overall score (weighted, 0-100)
      const dbsScore = dbsValid ? 100 : 0;
      const incidentPenalty = Math.min(incidentCount * 5, 40);
      const overallScore = Math.round(
        trainingCompliance * 0.30 +
        punctualityPct * 0.40 +
        dbsScore * 0.30 -
        incidentPenalty
      );
      const clampedScore = Math.max(0, Math.min(100, overallScore));
      const riskRating = clampedScore >= 80 ? 'low' : clampedScore >= 60 ? 'medium' : 'high';

      // Upsert: insert or update if same period exists for this staff
      // Fallback staffHomeId if missing
      const fallbackHomeId = staffHomeId || '00000000-0000-0000-0000-000000000000'; // Or handle better, but avoid null constraint violation

      const existing = await query<any>(
        `SELECT id FROM staff_performance WHERE staff_id = $1 AND period = $2 AND (home_id = $3 OR home_id IS NULL)`,
        [s.id, period, staffHomeId]
      );
      if (existing.length > 0) {
        await query(
          `UPDATE staff_performance SET
             training_compliance = $1, punctuality_score = $2, incidents_reported = $3,
             overall_score = $4, risk_rating = $5, assessed_by = $6
           WHERE id = $7`,
          [trainingCompliance, punctualityScore, incidentCount, clampedScore, riskRating, assessedBy || null, existing[0].id]
        );
        created++; // Count updates as created so UI reflects it did work
      } else {
        await query(
          `INSERT INTO staff_performance
             (home_id, staff_id, assessed_by, period, training_compliance, punctuality_score,
              incidents_reported, overall_score, risk_rating, supervision_completed)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,FALSE)`,
          [staffHomeId, s.id, assessedBy || null, period, trainingCompliance, punctualityScore,
           incidentCount, clampedScore, riskRating]
        );
        created++;
      }
    }

    res.json({ success: true, data: { staffProcessed: staffRows.length, created } } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/performance/shift-matrix — cross-reference of staff × homes with shift counts
router.get('/shift-matrix', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const role = tok(req, 'role');
    const orgId = tok(req, 'organisationId');
    const homeId = (req.query.homeId as string) || tok(req, 'homeId');

    let staffRows: any[];
    let homeRows: any[];
    let shiftRows: any[];

    if (role === 'group_admin' && !homeId) {
      // Group admin: all homes in org
      homeRows = await query(
        `SELECT id, name FROM homes WHERE organisation_id = $1 ORDER BY name`, [orgId]
      );
      staffRows = await query(
        `SELECT DISTINCT s.id, s.first_name || ' ' || s.last_name AS name, s.role
         FROM staff s
         WHERE s.organisation_id = $1 AND s.is_active = TRUE
         ORDER BY s.first_name, s.last_name`, [orgId]
      );
      shiftRows = await query(
        `SELECT ss.staff_id, ss.home_id, COUNT(*) as shift_count
         FROM staff_shifts ss
         JOIN staff s ON s.id = ss.staff_id
         WHERE s.organisation_id = $1 AND ss.staff_id IS NOT NULL
         GROUP BY ss.staff_id, ss.home_id`, [orgId]
      );
    } else {
      // Single home: staff from this home vs all homes in org
      const homeOrg = await query<any>(`SELECT organisation_id FROM homes WHERE id = $1`, [homeId]);
      const orgIdForHome = homeOrg[0]?.organisation_id || orgId;
      homeRows = await query(
        `SELECT id, name FROM homes WHERE organisation_id = $1 ORDER BY name`, [orgIdForHome]
      );
      staffRows = await query(
        `SELECT DISTINCT s.id, s.first_name || ' ' || s.last_name AS name, s.role
         FROM staff s
         WHERE s.home_id = $1 AND s.is_active = TRUE
         ORDER BY s.first_name, s.last_name`, [homeId]
      );
      shiftRows = await query(
        `SELECT ss.staff_id, ss.home_id, COUNT(*) as shift_count
         FROM staff_shifts ss
         WHERE ss.staff_id = ANY(SELECT id FROM staff WHERE home_id = $1 AND is_active = TRUE) AND ss.staff_id IS NOT NULL
         GROUP BY ss.staff_id, ss.home_id`, [homeId]
      );
    }

    // Build shift map: staffId -> homeId -> count
    const shiftMap: Record<string, Record<string, number>> = {};
    for (const r of shiftRows as any[]) {
      if (!shiftMap[r.staff_id]) shiftMap[r.staff_id] = {};
      shiftMap[r.staff_id][r.home_id] = parseInt(r.shift_count);
    }

    res.json({ success: true, data: { staff: staffRows, homes: homeRows, shiftMap } } as ApiResponse);
  } catch (err) { next(err); }
});

export default router;
