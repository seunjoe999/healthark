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
             JOIN staff s ON s.id = pm.staff_id AND s.organisation_id = $1
             JOIN staff a ON a.id = pm.assessed_by`;
      params.push(orgId);
      if (filterStaff) { sql += ` WHERE pm.staff_id = $2`; params.push(filterStaff); }
    } else {
      sql = `SELECT pm.*, s.first_name || ' ' || s.last_name AS staff_name, s.role AS staff_role,
                    a.first_name || ' ' || a.last_name AS assessed_by_name
             FROM staff_performance pm
             JOIN staff s ON s.id = pm.staff_id
             JOIN staff a ON a.id = pm.assessed_by
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
               pm.punctuality_score, pm.care_quality_score, pm.created_at
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
               pm.punctuality_score, pm.care_quality_score, pm.created_at
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

export default router;
