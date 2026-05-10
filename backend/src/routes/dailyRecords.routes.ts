import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query as qv } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query, transaction } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';

const router = Router();
router.use(authenticate);

function getStaffId(req: Request): string {
  const token = req.headers.authorization?.substring(7);
  if (token) { const d = jwt.decode(token) as any; return req.staff?.staffId || d?.staffId || ''; }
  return req.staff?.staffId || '';
}
function getHomeId(req: Request): string {
  const token = req.headers.authorization?.substring(7);
  if (token) { const d = jwt.decode(token) as any; return req.staff?.homeId || d?.homeId || ''; }
  return req.staff?.homeId || '';
}

// GET /api/daily-records?suId=xxx&date=2026-05-10
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { suId, date, recordType } = req.query as Record<string, string>;
    if (!suId) throw new AppError('suId required', 400);

    let sql = `SELECT dr.*, 
                      s.first_name || ' ' || s.last_name as staff_name,
                      s.photo_url as staff_photo
               FROM daily_records dr
               JOIN staff s ON s.id = dr.staff_id
               WHERE dr.su_id = $1`;
    const params: unknown[] = [suId];
    let idx = 2;

    if (date) { sql += ` AND dr.record_date = $${idx++}`; params.push(date); }
    if (recordType) { sql += ` AND dr.record_type = $${idx++}`; params.push(recordType); }
    sql += ' ORDER BY dr.recorded_at DESC';

    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/daily-records — create parent record + child detail
router.post('/', [
  body('suId').isUUID(),
  body('recordType').notEmpty(),
], validateRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const staffId = getStaffId(req);
    const homeId = req.body.homeId || getHomeId(req);
    const { suId, recordType, shift, notes } = req.body;

    const result = await transaction(async (client) => {
      // Create parent record
      const drRows = await client.query(
        `INSERT INTO daily_records (su_id, home_id, staff_id, record_type, shift, notes)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [suId, homeId, staffId, recordType, shift || null, notes || null]
      );
      const dr = drRows.rows[0];

      // Create child record based on type
      switch (recordType) {
        case 'food_drink': {
          const { entryType, mealType, description, amountEaten, volumeMl, assisted, refused } = req.body;
          await client.query(
            `INSERT INTO records_food_drink (daily_record_id, entry_type, meal_type, description, amount_eaten, volume_ml, assisted, refused, notes)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            [dr.id, entryType, mealType || null, description, amountEaten || null, volumeMl || null, assisted || false, refused || false, notes || null]
          );
          break;
        }
        case 'vitals_bp': {
          const { systolic, diastolic, pulse, bpPosition } = req.body;
          const outsideRange = systolic > 180 || systolic < 90 || diastolic > 110 || diastolic < 60;
          await client.query(
            `INSERT INTO records_vitals (daily_record_id, vital_type, systolic, diastolic, pulse, bp_position, outside_range)
             VALUES ($1,'bp',$2,$3,$4,$5,$6)`,
            [dr.id, systolic, diastolic, pulse || null, bpPosition || null, outsideRange]
          );
          if (outsideRange) {
            await client.query(
              `UPDATE daily_records SET flagged = true, flag_reason = 'Blood pressure outside safe range' WHERE id = $1`,
              [dr.id]
            );
          }
          break;
        }
        case 'vitals_temp': {
          const { tempCelsius, tempMethod } = req.body;
          const outside = tempCelsius < 35.0 || tempCelsius > 37.5;
          await client.query(
            `INSERT INTO records_vitals (daily_record_id, vital_type, temp_celsius, temp_method, outside_range)
             VALUES ($1,'temperature',$2,$3,$4)`,
            [dr.id, tempCelsius, tempMethod || null, outside]
          );
          if (outside) await client.query(`UPDATE daily_records SET flagged=true, flag_reason='Temperature outside safe range' WHERE id=$1`, [dr.id]);
          break;
        }
        case 'vitals_oxygen': {
          const { spo2Percent, supplementalO2, o2LitresMin } = req.body;
          const outside = spo2Percent < 94;
          await client.query(
            `INSERT INTO records_vitals (daily_record_id, vital_type, spo2_percent, supplemental_o2, o2_litres_min, outside_range)
             VALUES ($1,'oxygen',$2,$3,$4,$5)`,
            [dr.id, spo2Percent, supplementalO2 || false, o2LitresMin || null, outside]
          );
          if (outside) await client.query(`UPDATE daily_records SET flagged=true, flag_reason='Oxygen saturation below 94%' WHERE id=$1`, [dr.id]);
          break;
        }
        case 'vitals_weight': {
          const { weightKg, heightCm } = req.body;
          const bmi = heightCm ? Math.round((weightKg / Math.pow(heightCm / 100, 2)) * 10) / 10 : null;
          // Get previous weight
          const prevRows = await client.query(
            `SELECT rv.weight_kg FROM records_vitals rv JOIN daily_records dr2 ON dr2.id = rv.daily_record_id
             WHERE dr2.su_id = $1 AND rv.vital_type = 'weight' AND dr2.id != $2
             ORDER BY dr2.recorded_at DESC LIMIT 1`,
            [suId, dr.id]
          );
          const prevWeight = prevRows.rows[0]?.weight_kg || null;
          const changePercent = prevWeight ? Math.round(((weightKg - prevWeight) / prevWeight) * 1000) / 10 : null;
          await client.query(
            `INSERT INTO records_vitals (daily_record_id, vital_type, weight_kg, height_cm, bmi, prev_weight_kg, weight_change_pct)
             VALUES ($1,'weight',$2,$3,$4,$5,$6)`,
            [dr.id, weightKg, heightCm || null, bmi, prevWeight, changePercent]
          );
          // Update SU profile weight
          await client.query(`UPDATE service_users SET weight_kg=$1, bmi=$2 WHERE id=$3`, [weightKg, bmi, suId]);
          break;
        }
        case 'personal_care': {
          const { careTypes, assistanceLevel, continenceCare, continenceNotes, skinCondition } = req.body;
          await client.query(
            `INSERT INTO records_personal_care (daily_record_id, care_types, assistance_level, continence_care, continence_notes, skin_condition, notes)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [dr.id, careTypes || [], assistanceLevel || null, continenceCare || false, continenceNotes || null, skinCondition || null, notes || null]
          );
          break;
        }
        case 'bowel': {
          const { bristolType, frequencyToday, colour, consistencyNotes, laxativeGiven } = req.body;
          // Check days since last bowel movement
          const lastRows = await client.query(
            `SELECT dr2.record_date FROM records_bowel rb JOIN daily_records dr2 ON dr2.id = rb.daily_record_id
             WHERE dr2.su_id = $1 ORDER BY dr2.record_date DESC LIMIT 1`,
            [suId]
          );
          const daysSince = lastRows.rows[0]
            ? Math.floor((Date.now() - new Date(lastRows.rows[0].record_date).getTime()) / 86400000)
            : null;
          await client.query(
            `INSERT INTO records_bowel (daily_record_id, bristol_type, frequency_today, colour, consistency_notes, laxative_given, days_since_last)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [dr.id, bristolType || null, frequencyToday || 0, colour || null, consistencyNotes || null, laxativeGiven || false, daysSince]
          );
          break;
        }
        case 'behaviour': {
          const { mood, behaviourNoted, triggersNoted, actionTaken, escalated } = req.body;
          await client.query(
            `INSERT INTO records_behaviour (daily_record_id, mood, behaviour_noted, triggers_noted, action_taken, escalated)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [dr.id, mood || null, behaviourNoted || null, triggersNoted || null, actionTaken || null, escalated || false]
          );
          break;
        }
        case 'repositioning': {
          const { position, skinChecked, skinConcerns, nextDueAt } = req.body;
          await client.query(
            `INSERT INTO records_repositioning (daily_record_id, position, skin_checked, skin_concerns, next_due_at, notes)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [dr.id, position || null, skinChecked || false, skinConcerns || null, nextDueAt || null, notes || null]
          );
          break;
        }
        case 'oral_care': {
          const { careTypes, mouthCondition, hasDentures, dentureType } = req.body;
          await client.query(
            `INSERT INTO records_oral_care (daily_record_id, care_types, mouth_condition, has_dentures, denture_type, notes)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [dr.id, careTypes || [], mouthCondition || null, hasDentures ?? null, dentureType || null, notes || null]
          );
          break;
        }
        case 'communication': {
          const { modeUsed, topic, responseLevel } = req.body;
          await client.query(
            `INSERT INTO records_communication (daily_record_id, mode_used, topic, response_level, notes)
             VALUES ($1,$2,$3,$4,$5)`,
            [dr.id, modeUsed || null, topic || null, responseLevel || null, notes || null]
          );
          break;
        }
        case 'one_to_one': {
          const { topics, durationMins, engagement, followUp, followUpNotes } = req.body;
          await client.query(
            `INSERT INTO records_one_to_one (daily_record_id, topics, duration_mins, engagement, follow_up, follow_up_notes, notes)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [dr.id, topics || null, durationMins || null, engagement || null, followUp || false, followUpNotes || null, notes || null]
          );
          break;
        }
        case 'social_activity': {
          const { activityName, engagement, enjoyed } = req.body;
          await client.query(
            `INSERT INTO records_social_activity (daily_record_id, activity_name, engagement, enjoyed, notes)
             VALUES ($1,$2,$3,$4,$5)`,
            [dr.id, activityName || null, engagement || null, enjoyed || null, notes || null]
          );
          break;
        }
        case 'visit': {
          const { visitType, visitorName, relationship, location, timeArrived, timeLeft, suResponse } = req.body;
          await client.query(
            `INSERT INTO records_visits (daily_record_id, visit_type, visitor_name, relationship, location, time_arrived, time_left, su_response, notes)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            [dr.id, visitType || 'social', visitorName || null, relationship || null, location || null, timeArrived || null, timeLeft || null, suResponse || null, notes || null]
          );
          break;
        }
        case 'incident': {
          const { incidentType, location, incidentTime, description, injuries, injuryDetails,
                  medicalNeeded, medicalDetails, witnesses, immediateAction, reportedTo, safeguardingRef } = req.body;
          await client.query(
            `INSERT INTO records_incidents (daily_record_id, incident_type, location, incident_time, description,
              injuries, injury_details, medical_needed, medical_details, witnesses, immediate_action, reported_to, safeguarding_ref)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
            [dr.id, incidentType || null, location || null, incidentTime || new Date(), description,
             injuries || false, injuryDetails || null, medicalNeeded || false, medicalDetails || null,
             witnesses || null, immediateAction, reportedTo || null, safeguardingRef || false]
          );
          break;
        }
        case 'prn_medication': {
          const { medicationName, dose, reason, witnessedBy, outcomeNotes } = req.body;
          await client.query(
            `INSERT INTO records_prn_medication (daily_record_id, medication_name, dose, reason, administered_by, witnessed_by, outcome_notes)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [dr.id, medicationName, dose || null, reason, staffId, witnessedBy || null, outcomeNotes || null]
          );
          break;
        }
        case 'welfare_check': {
          const { checkType, suStatus, environmentOk, environmentNotes, actionTaken } = req.body;
          await client.query(
            `INSERT INTO records_welfare_check (daily_record_id, check_type, su_status, environment_ok, environment_notes, action_taken)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [dr.id, checkType || 'welfare', suStatus || null, environmentOk ?? true, environmentNotes || null, actionTaken || null]
          );
          break;
        }
        case 'handover': {
          const { shiftSummary, priorityFlags, outstandingActions } = req.body;
          await client.query(
            `INSERT INTO records_handover (daily_record_id, shift_summary, priority_flags, outstanding_actions)
             VALUES ($1,$2,$3,$4)`,
            [dr.id, shiftSummary || '', priorityFlags || [], outstandingActions || null]
          );
          break;
        }
        case 'general_support': {
          // notes field on parent record is sufficient
          break;
        }
      }

      return dr;
    });

    res.status(201).json({ success: true, data: result } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/daily-records/fluid-total?suId=xxx&date=2026-05-10
router.get('/fluid-total', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { suId, date } = req.query as Record<string, string>;
    if (!suId) throw new AppError('suId required', 400);
    const targetDate = date || new Date().toISOString().split('T')[0];
    const rows = await query(
      `SELECT total_ml, below_threshold FROM su_daily_fluid_totals WHERE su_id = $1 AND record_date = $2`,
      [suId, targetDate]
    );
    const su = await query<{ min_fluid_ml: number }>(
      'SELECT min_fluid_ml FROM service_users WHERE id = $1', [suId]
    );
    res.json({
      success: true,
      data: {
        totalMl: rows[0]?.total_ml || 0,
        belowThreshold: rows[0]?.below_threshold || false,
        minFluidMl: su[0]?.min_fluid_ml || 1500,
        date: targetDate,
      }
    } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/daily-records/:id/detail — get full record with child data
router.get('/:id/detail', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const drRows = await query(
        `SELECT dr.*, s.first_name || ' ' || s.last_name as staff_name
         FROM daily_records dr JOIN staff s ON s.id = dr.staff_id WHERE dr.id = $1`,
        [req.params.id]
      );
      if (!drRows.length) throw new AppError('Record not found', 404);
      const dr = drRows[0] as Record<string, unknown>;

      // Fetch child record
      const childTableMap: Record<string, string> = {
        food_drink: 'records_food_drink', vitals_bp: 'records_vitals',
        vitals_temp: 'records_vitals', vitals_oxygen: 'records_vitals',
        vitals_weight: 'records_vitals', personal_care: 'records_personal_care',
        bowel: 'records_bowel', behaviour: 'records_behaviour',
        repositioning: 'records_repositioning', oral_care: 'records_oral_care',
        communication: 'records_communication', one_to_one: 'records_one_to_one',
        social_activity: 'records_social_activity', visit: 'records_visits',
        incident: 'records_incidents', prn_medication: 'records_prn_medication',
        welfare_check: 'records_welfare_check', handover: 'records_handover',
      };

      const childTable = childTableMap[dr.record_type as string];
      if (childTable) {
        const childRows = await query(`SELECT * FROM ${childTable} WHERE daily_record_id = $1`, [req.params.id]);
        (dr as any).detail = childRows[0] || null;
      }

      res.json({ success: true, data: dr } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
