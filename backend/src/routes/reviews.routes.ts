import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { assertResidentAccess } from '../utils/residentAccess';

const router = Router();

function nd(v: any): string | null { return v && String(v).trim() ? String(v).trim() : null; }

router.use(authenticate);

function fromToken(req: Request, field: string): string {
  const token = req.headers.authorization?.substring(7);
  if (token) { const d = jwt.decode(token) as any; return (req.staff as any)?.[field] || d?.[field] || ''; }
  return (req.staff as any)?.[field] || '';
}

// GET /api/reviews?homeId=&dueSoon=7 — all SU reviews for a home (dashboard widget)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const dueSoon = parseInt(req.query.dueSoon as string) || 0;
    const role = fromToken(req, 'role');
    const myStaffId = fromToken(req, 'staffId');
    const isPrivileged = ['home_manager', 'group_admin', 'deputy_manager', 'admin'].includes(role);
    let assignedSuIds: string[] | null = null;
    if (!isPrivileged) {
      const assignments = await query<any>('SELECT su_id FROM staff_service_user_assignments WHERE staff_id = $1', [myStaffId]);
      assignedSuIds = assignments.map((a: any) => a.su_id);
      if (assignedSuIds.length === 0) { res.json({ success: true, data: [] } as ApiResponse); return; }
    }
    let sql = `SELECT r.*, s.first_name || ' ' || s.last_name as created_by_name,
                      su.first_name as su_first_name, su.last_name as su_last_name
               FROM su_reviews r
               LEFT JOIN staff s ON s.id = r.conducted_by
               LEFT JOIN service_users su ON su.id = r.su_id
               WHERE su.home_id = $1`;
    const params: unknown[] = [homeId];
    if (assignedSuIds) {
      sql += ` AND r.su_id = ANY($2)`;
      params.push(assignedSuIds);
    }
    if (dueSoon > 0) {
      sql += ` AND r.next_review_date <= NOW() + interval '${dueSoon} days'`;
    }
    sql += ' ORDER BY r.next_review_date ASC NULLS LAST LIMIT 100';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// ── Service User Reviews ─────────────────────────────────────────
router.get('/su/:suId', param('suId').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await assertResidentAccess(req, req.params.suId);
      const rows = await query(
        `SELECT r.*, s.first_name || ' ' || s.last_name as created_by_name
         FROM su_reviews r LEFT JOIN staff s ON s.id = r.conducted_by
         WHERE r.su_id = $1 ORDER BY r.review_date DESC`,
        [req.params.suId]
      );
      res.json({ success: true, data: rows } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.post('/su', [body('suId').isUUID(), body('summary').notEmpty(), body('reviewDate').notEmpty()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      let homeId = fromToken(req, 'homeId');
      const { suId, reviewType, reviewDate, summary, residentFeedback, familyFeedback,
              outcomes, nextReviewDate, attendees, monthlyProgress } = req.body;
      // Fall back to the SU's home_id if the token doesn't have one (e.g. group_admin)
      if (!homeId) {
        const suRows = await query<any>('SELECT home_id FROM service_users WHERE id=$1', [suId]);
        homeId = suRows[0]?.home_id || '';
      }
      const rows = await query(
        `INSERT INTO su_reviews (su_id, home_id, conducted_by, review_type, review_date, summary,
          resident_feedback, family_feedback, outcomes, next_review_date, attendees, monthly_progress)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [suId, homeId, staffId, reviewType || 'care_review', reviewDate, summary,
         residentFeedback || null, familyFeedback || null, outcomes || null,
         nd(nextReviewDate), attendees || null, monthlyProgress || null]
      );
      // If a next review date is set, create a task so staff see it in their daily record task list
      if (nd(nextReviewDate)) {
        try {
          const suRows = await query<any>('SELECT first_name, last_name FROM service_users WHERE id = $1', [suId]);
          const suName = suRows.length ? `${suRows[0].first_name} ${suRows[0].last_name}` : 'resident';
          await query(
            `INSERT INTO tasks (home_id, su_id, created_by, title, category, description, task_date, priority)
             VALUES ($1,$2,$3,$4,'general',$5,$6,'normal')`,
            [homeId, suId, staffId, `Review due: ${suName}`, `Follow-up ${reviewType || 'care'} review is due today`, nd(nextReviewDate)]
          );
        } catch (taskErr) { /* non-fatal */ }
      }
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// ── Staff Cautions ───────────────────────────────────────────────
router.get('/cautions/:staffId', param('staffId').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query(
        `SELECT sc.*, s.first_name || ' ' || s.last_name as created_by_name
         FROM staff_cautions sc LEFT JOIN staff s ON s.id = sc.created_by
         WHERE sc.staff_id = $1 ORDER BY sc.created_at DESC`,
        [req.params.staffId]
      );
      res.json({ success: true, data: rows } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.post('/cautions', [body('staffId').isUUID(), body('overview').notEmpty()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const createdBy = fromToken(req, 'staffId');
      const homeId = fromToken(req, 'homeId');
      const { staffId, cautionType, overview, strengths, weaknesses, actionPoints, reviewDate } = req.body;
      const rows = await query(
        `INSERT INTO staff_cautions (staff_id, home_id, created_by, caution_type, overview,
          strengths, weaknesses, action_points, review_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [staffId, homeId, createdBy, cautionType || 'verbal', overview,
         strengths || null, weaknesses || null, actionPoints || null, nd(reviewDate)]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// ── Staff Supervisions ───────────────────────────────────────────
router.get('/supervisions/:staffId', param('staffId').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query(
        `SELECT ss.*, s.first_name || ' ' || s.last_name as conducted_by_name
         FROM staff_supervisions ss LEFT JOIN staff s ON s.id = ss.conducted_by
         WHERE ss.staff_id = $1 ORDER BY ss.supervision_date DESC`,
        [req.params.staffId]
      );
      res.json({ success: true, data: rows } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.post('/supervisions', [body('staffId').isUUID(), body('supervisionDate').notEmpty()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const conductedBy = fromToken(req, 'staffId');
      const homeId = fromToken(req, 'homeId');
      const { staffId, supervisionType, supervisionDate, summary,
              actionPoints, nextDate } = req.body;
      const rows = await query(
        `INSERT INTO staff_supervisions (staff_id, home_id, conducted_by, supervision_type,
          supervision_date, summary, action_points, next_supervision_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [staffId, homeId, conductedBy, supervisionType || 'supervision', supervisionDate,
         summary || null, actionPoints || null, nd(nextDate)]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// ── MUST Score ───────────────────────────────────────────────────
router.get('/must/:suId', param('suId').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query(
        `SELECT ms.*, s.first_name || ' ' || s.last_name as assessed_by_name
         FROM must_scores ms LEFT JOIN staff s ON s.id = ms.assessed_by
         WHERE ms.su_id = $1 ORDER BY ms.created_at DESC LIMIT 10`,
        [req.params.suId]
      );
      res.json({ success: true, data: rows } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.post('/must', [body('suId').isUUID()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      const homeId = fromToken(req, 'homeId');
      const { suId, weightKg, heightCm, bmiScore, weightLossScore, acuteDiseaseScore,
              managementPlan, nextAssessment } = req.body;
      const bmi = heightCm ? Math.round((weightKg / Math.pow(heightCm / 100, 2)) * 10) / 10 : null;
      const totalScore = (bmiScore || 0) + (weightLossScore || 0) + (acuteDiseaseScore || 0);
      const riskLevel = totalScore === 0 ? 'low' : totalScore === 1 ? 'medium' : 'high';

      const rows = await query(
        `INSERT INTO must_scores (su_id, home_id, assessed_by, weight_kg, height_cm, bmi,
          bmi_score, weight_loss_score, acute_disease_score, total_score, risk_level,
          action_plan, next_assessment_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
        [suId, homeId, staffId, weightKg || null, heightCm || null, bmi,
         bmiScore || 0, weightLossScore || 0, acuteDiseaseScore || 0,
         totalScore, riskLevel, managementPlan || null, nextAssessment || null]
      );

      // Update SU weight and BMI
      if (weightKg) await query('UPDATE service_users SET weight_kg=$1, bmi=$2 WHERE id=$3', [weightKg, bmi, suId]);

      res.status(201).json({ success: true, data: { ...rows[0] as object, totalScore, riskLevel } } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// ── Password change ──────────────────────────────────────────────
router.put('/change-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const staffId = fromToken(req, 'staffId');
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) throw { status: 400, message: 'Both passwords required' };
    if (newPassword.length < 8) throw { status: 400, message: 'New password must be at least 8 characters' };

    const rows = await query<any>('SELECT password_hash FROM staff WHERE id = $1', [staffId]);
    if (!rows.length) throw { status: 404, message: 'Staff not found' };

    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) throw { status: 401, message: 'Current password is incorrect' };

    const newHash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE staff SET password_hash = $1 WHERE id = $2', [newHash, staffId]);

    res.json({ success: true, message: 'Password changed successfully' } as ApiResponse);
  } catch (err: any) {
    if (err.status) res.status(err.status).json({ success: false, error: err.message });
    else next(err);
  }
});

// ── Settings — home info ─────────────────────────────────────────
router.get('/settings/home', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = fromToken(req, 'homeId');
    const rows = await query('SELECT * FROM homes WHERE id = $1', [homeId]);
    res.json({ success: true, data: rows[0] || null } as ApiResponse);
  } catch (err) { next(err); }
});

router.put('/settings/home', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = fromToken(req, 'homeId');
    const { name, address1, postcode, phone, email, managerName, latitude, longitude, geofenceRadius,
            careType, cqcLocationId, cqcRating, totalBeds } = req.body;
    // Ensure optional columns exist
    await query(`ALTER TABLE homes ADD COLUMN IF NOT EXISTS care_type TEXT`).catch(() => {});
    await query(`ALTER TABLE homes ADD COLUMN IF NOT EXISTS cqc_rating TEXT`).catch(() => {});
    await query(`ALTER TABLE homes ADD COLUMN IF NOT EXISTS total_beds INTEGER DEFAULT 30`).catch(() => {});
    await query(
      `UPDATE homes SET name=COALESCE($1,name), address1=COALESCE($2,address1),
        postcode=COALESCE($3,postcode), phone=COALESCE($4,phone), email=COALESCE($5,email),
        manager_name=COALESCE($6,manager_name), latitude=COALESCE($7,latitude),
        longitude=COALESCE($8,longitude), geofence_radius=COALESCE($9,geofence_radius),
        care_type=COALESCE($11,care_type), cqc_location_id=COALESCE($12,cqc_location_id),
        cqc_rating=COALESCE($13,cqc_rating), total_beds=COALESCE($14,total_beds),
        updated_at=NOW() WHERE id=$10`,
      [name, address1, postcode, phone, email, managerName, latitude, longitude, geofenceRadius,
       homeId, careType || null, cqcLocationId || null, cqcRating || null, totalBeds ? Number(totalBeds) : null]
    );
    res.json({ success: true, message: 'Home settings updated' } as ApiResponse);
  } catch (err) { next(err); }
});


router.delete('/su/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try { await query('DELETE FROM su_reviews WHERE id=$1', [req.params.id]); res.json({ success: true } as ApiResponse); }
    catch (err) { next(err); }
  }
);
router.delete('/cautions/:id', requireRole('home_manager', 'group_admin'), param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try { await query('DELETE FROM staff_cautions WHERE id=$1', [req.params.id]); res.json({ success: true } as ApiResponse); }
    catch (err) { next(err); }
  }
);
router.delete('/supervisions/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try { await query('DELETE FROM staff_supervisions WHERE id=$1', [req.params.id]); res.json({ success: true } as ApiResponse); }
    catch (err) { next(err); }
  }
);
router.put('/su/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reviewType, reviewDate, summary, residentFeedback, familyFeedback, outcomes, nextReviewDate, attendees } = req.body;
      const nd = (d: any) => (d && String(d).trim()) ? d : null;
      await query(
        `UPDATE su_reviews SET review_type=$1, review_date=$2, summary=$3, resident_feedback=$4, family_feedback=$5, outcomes=$6, next_review_date=$7, attendees=$8 WHERE id=$9`,
        [reviewType||null, nd(reviewDate), summary||null, residentFeedback||null, familyFeedback||null, outcomes||null, nd(nextReviewDate), attendees||null, req.params.id]
      );
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
