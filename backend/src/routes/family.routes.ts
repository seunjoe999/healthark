import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types';

const router = Router();

router.get('/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await query<any>(
      `SELECT su.id, su.first_name, su.last_name, su.preferred_name,
              su.date_of_birth, su.photo_url, su.admission_date,
              su.nhs_number, su.gender, su.status,
              su.dnar, su.nil_by_mouth, su.emergency_rating,
              su.medical_history, su.med_allergies, su.food_allergies,
              su.requires_oxygen, su.has_catheter, su.has_peg,
              su.special_diet, su.fluid_consistency, su.min_fluid_ml, su.diet_instructions,
              su.height_cm, su.weight_kg,
              su.need_to_know, su.my_instructions,
              su.hobbies, su.daily_routine,
              h.name as home_name, h.phone as home_phone, h.address1 as home_address
       FROM service_users su
       JOIN homes h ON h.id = su.home_id
       WHERE su.qr_token = $1 OR su.id::text = $1`,
      [req.params.token]
    );
    if (!rows.length) throw new AppError('Resident not found', 404);
    const su = rows[0];

    // Date range: default 90 days, override via ?days= query param
    const days = Math.min(parseInt(req.query.days as string) || 90, 365);
    const allTime = req.query.all === 'true';

    const dateFilter = allTime ? '' : `AND dr.record_date >= CURRENT_DATE - INTERVAL '${days} days'`;

    const [records, medications, carePlans, riskAssessments, incidents, weightRecords, careReviews] = await Promise.all([
      query<any>(
        `SELECT dr.id, dr.record_type, dr.notes, dr.record_date, dr.shift,
                s.first_name || ' ' || s.last_name as staff_name
         FROM daily_records dr
         LEFT JOIN staff s ON s.id = dr.staff_id
         WHERE dr.su_id = $1 ${dateFilter}
         ORDER BY dr.record_date DESC, dr.id DESC LIMIT 200`,
        [su.id]
      ),
      query<any>(
        `SELECT medication_name, dose, frequency, route, notes AS instructions, is_prn,
                prescriber AS prescribed_by, start_date, end_date, is_active
         FROM su_medications WHERE su_id = $1
         ORDER BY is_active DESC, is_prn, medication_name`,
        [su.id]
      ).catch(() => []),
      query<any>(
        `SELECT plan_type, custom_name, aims_outcomes, how_to_support,
                next_review_date, last_review_date, is_active, updated_at
         FROM care_plans WHERE su_id = $1
         ORDER BY is_active DESC, plan_type`,
        [su.id]
      ),
      query<any>(
        `SELECT assessment_name, risk_level, description, management_plan,
                next_review_date AS review_date, updated_at, is_active
         FROM risk_assessments WHERE su_id = $1
         ORDER BY is_active DESC, risk_level DESC, assessment_name`,
        [su.id]
      ).catch(() => []),
      query<any>(
        `SELECT i.id, i.incident_type, i.description, i.outcome, i.severity,
                i.incident_date, i.location, i.follow_up_required,
                s.first_name || ' ' || s.last_name as reported_by
         FROM incidents i
         LEFT JOIN staff s ON s.id = i.staff_id
         WHERE i.su_id = $1
         ORDER BY i.incident_date DESC LIMIT 50`,
        [su.id]
      ).catch(() => []),
      query<any>(
        `SELECT weight_kg, measured_at, notes,
                s.first_name || ' ' || s.last_name as recorded_by
         FROM weight_records wr
         LEFT JOIN staff s ON s.id = wr.staff_id
         WHERE wr.su_id = $1
         ORDER BY wr.measured_at DESC LIMIT 24`,
        [su.id]
      ).catch(() => []),
      query<any>(
        `SELECT review_type, review_date, summary, outcome, next_review_date,
                s.first_name || ' ' || s.last_name as reviewed_by
         FROM care_reviews cr
         LEFT JOIN staff s ON s.id = cr.staff_id
         WHERE cr.su_id = $1
         ORDER BY cr.review_date DESC LIMIT 20`,
        [su.id]
      ).catch(() => []),
    ]);

    res.json({
      success: true,
      data: { resident: su, records, medications, carePlans, riskAssessments, incidents, weightRecords, careReviews }
    } as ApiResponse);
  } catch (err) { next(err); }
});

export default router;
