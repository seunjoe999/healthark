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

    const [records, medications, carePlans, riskAssessments] = await Promise.all([
      query<any>(
        `SELECT dr.record_type, dr.notes, dr.record_date, dr.shift, dr.created_at,
                s.first_name || ' ' || s.last_name as staff_name
         FROM daily_records dr
         LEFT JOIN staff s ON s.id = dr.created_by
         WHERE dr.su_id = $1 AND dr.record_date >= CURRENT_DATE - INTERVAL '14 days'
         ORDER BY dr.record_date DESC, dr.created_at DESC LIMIT 60`,
        [su.id]
      ),
      query<any>(
        `SELECT medication_name, dose, frequency, route, instructions, is_prn, prescribed_by
         FROM su_medications WHERE su_id = $1 AND is_active = true ORDER BY is_prn, medication_name`,
        [su.id]
      ),
      query<any>(
        `SELECT plan_type, custom_name, aims_outcomes, next_review_date, last_review_date
         FROM care_plans WHERE su_id = $1 AND is_active IS NOT FALSE
         ORDER BY plan_type`,
        [su.id]
      ),
      query<any>(
        `SELECT assessment_name, risk_level, review_date, updated_at
         FROM risk_assessments WHERE su_id = $1 AND is_active = true
         ORDER BY risk_level DESC, assessment_name`,
        [su.id]
      ),
    ]);

    res.json({
      success: true,
      data: { resident: su, records, medications, carePlans, riskAssessments }
    } as ApiResponse);
  } catch (err) { next(err); }
});

export default router;
