
// Auto-geocode a UK postcode using postcodes.io (free, no API key)
async function geocodePostcode(postcode: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const clean = postcode.replace(/\s/g, '').toUpperCase();
    const res = await fetch(`https://api.postcodes.io/postcodes/${clean}`);
    const data = await res.json() as any;
    if (data.status === 200 && data.result) {
      return { lat: data.result.latitude, lng: data.result.longitude };
    }
  } catch {}
  return null;
}

import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';


// Auto-lookup UK postcode GPS coordinates
async function lookupPostcodeGPS(postcode: string): Promise<{ lat: number; lng: number } | null> {
  if (!postcode) return null;
  try {
    const clean = postcode.replace(/\s/g, '').toUpperCase();
    const res = await fetch(`https://api.postcodes.io/postcodes/${clean}`);
    const data = await res.json() as any;
    if (data.status === 200 && data.result) {
      return { lat: data.result.latitude, lng: data.result.longitude };
    }
  } catch {}
  return null;
}

const router = Router();

function nd(v: any): string | null { return v && String(v).trim() ? String(v).trim() : null; }

router.use(authenticate);

function getOrgId(req: Request): string {
  const token = req.headers.authorization?.substring(7);
  if (token) {
    const decoded = jwt.decode(token) as Record<string, string>;
    return req.staff?.organisationId || decoded?.organisationId || '';
  }
  return req.staff?.organisationId || '';
}

function getStaffId(req: Request): string {
  const token = req.headers.authorization?.substring(7);
  if (token) {
    const decoded = jwt.decode(token) as Record<string, string>;
    return req.staff?.staffId || decoded?.staffId || '';
  }
  return req.staff?.staffId || '';
}

function getRole(req: Request): string {
  const token = req.headers.authorization?.substring(7);
  if (token) {
    const decoded = jwt.decode(token) as Record<string, string>;
    return req.staff?.role || decoded?.role || '';
  }
  return req.staff?.role || '';
}

function getHomeId(req: Request): string {
  const token = req.headers.authorization?.substring(7);
  if (token) {
    const decoded = jwt.decode(token) as Record<string, string>;
    return req.staff?.homeId || decoded?.homeId || '';
  }
  return req.staff?.homeId || '';
}

// GET /api/service-users
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, search } = req.query as Record<string, string>;
    const homeId = req.query.homeId as string || getHomeId(req);
    const staffId = getStaffId(req);
    const role = getRole(req);

    if (!homeId) throw new AppError('homeId required', 400);

    let sql = `SELECT su.id, su.first_name, su.last_name, su.preferred_name,
                      su.date_of_birth, su.gender, su.photo_url, su.status,
                      su.emergency_rating, su.nhs_number, su.dnar, su.nil_by_mouth,
                      su.need_to_know, su.my_instructions,
                      su.admission_date, su.created_at,
                      h.name as home_name
               FROM service_users su
               JOIN homes h ON h.id = su.home_id
               WHERE su.home_id = $1`;
    const params: unknown[] = [homeId];
    let idx = 2;

    // Restricted roles only see residents they're assigned to
    if (['care_staff', 'team_leader'].includes(role) && staffId) {
      const assigned = await query<{ su_id: string }>(
        `SELECT DISTINCT su_id FROM staff_shifts
         WHERE staff_id = $1 AND su_id IS NOT NULL
         AND shift_date BETWEEN CURRENT_DATE - INTERVAL '90 days' AND CURRENT_DATE + INTERVAL '60 days'`,
        [staffId]
      );
      const ids = assigned.map((r: any) => r.su_id).filter(Boolean);
      if (ids.length > 0) {
        sql += ` AND su.id = ANY($${idx++})`;
        params.push(ids);
      } else {
        sql += ` AND 1=0`; // No assigned residents — show empty list
      }
    }

    if (status) { sql += ` AND su.status = $${idx++}`; params.push(status); }
    if (search) {
      sql += ` AND (su.first_name ILIKE $${idx} OR su.last_name ILIKE $${idx} OR su.preferred_name ILIKE $${idx})`;
      params.push(`%${search}%`); idx++;
    }
    sql += ' ORDER BY su.last_name, su.first_name';

    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/service-users/:id
router.get('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query(
        `SELECT su.*, h.name as home_name, h.postcode as home_postcode
         FROM service_users su JOIN homes h ON h.id = su.home_id
         WHERE su.id = $1`,
        [req.params.id]
      );
      if (!rows.length) throw new AppError('Service user not found', 404);
      const su = rows[0] as Record<string, unknown>;
      const role = getRole(req);
      if (role === 'care_staff') delete su.key_safe_code;
      res.json({ success: true, data: su } as ApiResponse);
    } catch (err) { next(err); }
  }
);

const MANAGER_ROLES = ['deputy_manager', 'home_manager', 'group_admin'];

// POST /api/service-users
router.post('/',
  [
    body('firstName').notEmpty().trim(),
    body('lastName').notEmpty().trim(),
    body('dateOfBirth').isDate(),
    body('homeId').isUUID(),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const role = getRole(req);
      if (!MANAGER_ROLES.includes(role)) {
        throw new AppError('Only managers can add service user details', 403);
      }
      const {
        homeId, firstName, lastName, preferredName, dateOfBirth, gender, pronouns,
        status, emergencyRating, nhsNumber, niNumber, dnar, dnarFormUrl,
        admissionDate, localAuthority, religion, ethnicity, maritalStatus,
        commsPrefs, lifeHistory, hobbies, dailyRoutine,
        heightCm, weightKg, medicalHistory, medAllergies,
        requiresOxygen, hasCatheter, hasPeg,
        foodAllergies, nilByMouth, specialDiet, fluidConsistency, minFluidMl, dietInstructions,
        address1, address2, address3, postcode, email, phone, keySafeCode,
        needToKnow, myInstructions,
      } = req.body;

      if (dnar === true && !dnarFormUrl) {
        throw new AppError('DNAR form upload is required when Do Not Resuscitate is selected', 400);
      }

      const rows = await query(
        `INSERT INTO service_users (
          home_id, first_name, last_name, preferred_name, date_of_birth,
          gender, pronouns, status, emergency_rating, nhs_number, ni_number,
          dnar, dnar_form_url, admission_date, local_authority,
          religion, ethnicity, marital_status, comms_prefs, life_history,
          hobbies, daily_routine, height_cm, weight_kg, medical_history,
          med_allergies, requires_oxygen, has_catheter, has_peg,
          food_allergies, nil_by_mouth, special_diet, fluid_consistency,
          min_fluid_ml, diet_instructions, address1, address2, address3,
          postcode, email, phone, key_safe_code, need_to_know, my_instructions
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
          $19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,
          $35,$36,$37,$38,$39,$40,$41,$42,$43,$44
        ) RETURNING *`,
        [
          homeId, firstName, lastName, preferredName || null, dateOfBirth,
          gender || null, pronouns || null, status || 'pre_admission',
          emergencyRating || 'low', nhsNumber || null, niNumber || null,
          dnar ?? null, dnarFormUrl || null, nd(admissionDate), localAuthority || null,
          religion || null, ethnicity || null, maritalStatus || null,
          commsPrefs || null, lifeHistory || null, hobbies || null, dailyRoutine || null,
          heightCm || null, weightKg || null, medicalHistory || null, medAllergies || null,
          requiresOxygen || false, hasCatheter || false, hasPeg || false,
          foodAllergies || null, nilByMouth || false, specialDiet || null,
          fluidConsistency || null, minFluidMl || 1500, dietInstructions || null,
          address1 || null, address2 || null, address3 || null,
          postcode || null, email || null, phone || null, keySafeCode || null,
          needToKnow || null, myInstructions || null,
        ]
      );
      // Auto-lookup postcode GPS for geofence
      if (postcode) {
        const gps = await lookupPostcodeGPS(postcode);
        if (gps) {
          await query('UPDATE service_users SET latitude=$1, longitude=$2 WHERE id=$3', [gps.lat, gps.lng, (rows[0] as any).id]);
        }
      }
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// PUT /api/service-users/:id
router.put('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const roleCheck = getRole(req);
      if (!MANAGER_ROLES.includes(roleCheck)) {
        throw new AppError('Only managers can edit service user details', 403);
      }
      // dnarFormUrl is optional — removed hard block to allow saving other fields

      const fieldMap: Record<string, string> = {
        firstName: 'first_name', lastName: 'last_name', preferredName: 'preferred_name',
        dateOfBirth: 'date_of_birth', gender: 'gender', pronouns: 'pronouns',
        status: 'status', emergencyRating: 'emergency_rating', nhsNumber: 'nhs_number',
        niNumber: 'ni_number', dnar: 'dnar', dnarFormUrl: 'dnar_form_url',
        gpName: 'gp_name', pharmacyName: 'pharmacy_name',
        annualHealthDate: 'annual_health_date', annualHealthNotes: 'annual_health_notes', annualHealthNa: 'annual_health_na',
        gpReviewDate: 'gp_review_date', gpReviewNotes: 'gp_review_notes', gpReviewNa: 'gp_review_na',
        mentalHealthDate: 'mental_health_date', mentalHealthNotes: 'mental_health_notes', mentalHealthNa: 'mental_health_na',
        dentistDate: 'dentist_date', dentistNotes: 'dentist_notes', dentistNa: 'dentist_na',
        admissionDate: 'admission_date', localAuthority: 'local_authority',
        religion: 'religion', ethnicity: 'ethnicity', maritalStatus: 'marital_status',
        commsPrefs: 'comms_prefs', lifeHistory: 'life_history', hobbies: 'hobbies',
        dailyRoutine: 'daily_routine', heightCm: 'height_cm', weightKg: 'weight_kg',
        medicalHistory: 'medical_history', medAllergies: 'med_allergies',
        requiresOxygen: 'requires_oxygen', hasCatheter: 'has_catheter', hasPeg: 'has_peg',
        foodAllergies: 'food_allergies', nilByMouth: 'nil_by_mouth', specialDiet: 'special_diet',
        fluidConsistency: 'fluid_consistency', minFluidMl: 'min_fluid_ml',
        dietInstructions: 'diet_instructions', address1: 'address1', address2: 'address2',
        address3: 'address3', postcode: 'postcode', email: 'email', phone: 'phone',
        keySafeCode: 'key_safe_code', needToKnow: 'need_to_know', myInstructions: 'my_instructions',
        genderAtBirth: 'gender_at_birth', sexuality: 'sexuality',
        carePlanLiveDate: 'care_plan_live_date', roomNumber: 'room_number',
        teamInvolvement: 'team_involvement', mcaCapacity: 'mca_capacity',
        dolsActive: 'dols_active', dolsStartDate: 'dols_start_date',
        dolsEndDate: 'dols_end_date', dolsNotes: 'dols_notes',
        cqcInformed: 'cqc_informed', hasLpa: 'has_lpa', lpaType: 'lpa_type',
        lpaAttorney: 'lpa_attorney', hasCopOrder: 'has_cop_order', copDetails: 'cop_details',
        banding: 'banding', personId: 'person_id',
        funeralNoted: 'funeral_noted', funeralDetails: 'funeral_details',
        funeralDirector: 'funeral_director',
        bathFrequency: 'bath_frequency', bathPreferredTime: 'bath_preferred_time',
        bathTeamSupport: 'bath_team_support', bathTypePref: 'bath_type_pref',
        bathDirections: 'bath_directions', bathPreferredProducts: 'bath_preferred_products',
        mealFrequency: 'meal_frequency', eatDirections: 'eat_directions',
        eatTeamPreference: 'eat_team_preference',
      };

      const updates: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      const numericFields = new Set(['heightCm', 'weightKg', 'minFluidMl']);
      const dateFields = new Set([
        'dateOfBirth', 'admissionDate', 'annualHealthDate', 'gpReviewDate',
        'mentalHealthDate', 'dentistDate', 'carePlanLiveDate',
        'dolsStartDate', 'dolsEndDate',
      ]);
      for (const [camel, snake] of Object.entries(fieldMap)) {
        if (req.body[camel] !== undefined) {
          updates.push(`${snake} = $${idx++}`);
          const v = req.body[camel];
          const emptyToNull = (v === '' || v === null) && (numericFields.has(camel) || dateFields.has(camel));
          values.push(emptyToNull ? null : v);
        }
      }

      if (!updates.length) throw new AppError('No fields to update', 400);
      updates.push('updated_at = NOW()');
      values.push(req.params.id);

      const rows = await query(
        `UPDATE service_users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
      );
      if (!rows.length) throw new AppError('Service user not found', 404);
      res.json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// ── Contacts ──────────────────────────────────────────────────────
router.get('/:id/contacts', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query(
        'SELECT * FROM su_contacts WHERE su_id = $1 ORDER BY display_order, created_at',
        [req.params.id]
      );
      res.json({ success: true, data: rows } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.post('/:id/contacts', param('id').isUUID(),
  [body('fullName').notEmpty()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { fullName, relationship, contactTag, phonePrimary, phoneSecondary,
              phoneHome, email, address1, address2, postcode, isPrimary, notes, displayOrder } = req.body;
      const rows = await query(
        `INSERT INTO su_contacts (su_id, full_name, relationship, contact_tag,
          phone_primary, phone_secondary, phone_home, email, address1, address2, postcode,
          is_primary, notes, display_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
        [req.params.id, fullName, relationship || null, contactTag || null,
         phonePrimary || null, phoneSecondary || null, phoneHome || null, email || null,
         address1 || null, address2 || null, postcode || null,
         isPrimary || false, notes || null, displayOrder || 0]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.put('/:id/contacts/:contactId',
  [param('id').isUUID(), param('contactId').isUUID()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { fullName, relationship, contactTag, phonePrimary, phoneSecondary,
              phoneHome, email, isPrimary, notes, displayOrder } = req.body;
      const rows = await query(
        `UPDATE su_contacts SET
          full_name=COALESCE($1,full_name), relationship=COALESCE($2,relationship),
          contact_tag=COALESCE($3,contact_tag), phone_primary=COALESCE($4,phone_primary),
          phone_secondary=COALESCE($5,phone_secondary), phone_home=COALESCE($6,phone_home),
          email=COALESCE($7,email), is_primary=COALESCE($8,is_primary),
          notes=COALESCE($9,notes), display_order=COALESCE($10,display_order)
         WHERE id=$11 AND su_id=$12 RETURNING *`,
        [fullName, relationship, contactTag, phonePrimary, phoneSecondary,
         phoneHome, email, isPrimary, notes, displayOrder, req.params.contactId, req.params.id]
      );
      if (!rows.length) throw new AppError('Contact not found', 404);
      res.json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.delete('/:id/contacts/:contactId',
  [param('id').isUUID(), param('contactId').isUUID()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await query('DELETE FROM su_contacts WHERE id=$1 AND su_id=$2',
        [req.params.contactId, req.params.id]);
      res.json({ success: true, message: 'Contact deleted' } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// ── Documents ─────────────────────────────────────────────────────
router.get('/:id/documents', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query(
        `SELECT sd.*, s.first_name || ' ' || s.last_name as uploaded_by_name
         FROM su_documents sd LEFT JOIN staff s ON s.id = sd.uploaded_by
         WHERE sd.su_id = $1 ORDER BY sd.created_at DESC`,
        [req.params.id]
      );
      res.json({ success: true, data: rows } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// ── Messages ──────────────────────────────────────────────────────
router.get('/:id/messages', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query(
        `SELECT m.*, s.first_name || ' ' || s.last_name as sender_name, s.photo_url as sender_photo
         FROM su_messages m JOIN staff s ON s.id = m.sender_id
         WHERE m.su_id = $1 ORDER BY m.created_at DESC LIMIT 50`,
        [req.params.id]
      );
      res.json({ success: true, data: rows } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.post('/:id/messages', param('id').isUUID(),
  [body('message').notEmpty()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const su = await query<{ home_id: string }>(
        'SELECT home_id FROM service_users WHERE id = $1', [req.params.id]
      );
      if (!su.length) throw new AppError('Service user not found', 404);
      const staffId = getStaffId(req);
      const rows = await query(
        `INSERT INTO su_messages (su_id, home_id, sender_id, message, message_type, attachment_url, attachment_caption)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [req.params.id, su[0].home_id, staffId,
         req.body.message, req.body.messageType || 'text',
         req.body.attachmentUrl || null, req.body.attachmentCaption || null]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);


// GET /api/service-users/:id/about-me
router.get('/:id/about-me', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query('SELECT * FROM su_about_me WHERE su_id=$1', [req.params.id]);
      res.json({ success: true, data: rows[0] || {} } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// PUT /api/service-users/:id/about-me
router.put('/:id/about-me', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { life_history, important_people, daily_routine, hobbies_interests,
              communication, likes_dislikes, beliefs_values, goals_wishes, support_needs } = req.body;
      await query(
        `INSERT INTO su_about_me (su_id, life_history, important_people, daily_routine, hobbies_interests,
           communication, likes_dislikes, beliefs_values, goals_wishes, support_needs, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
         ON CONFLICT (su_id) DO UPDATE SET
           life_history=$2, important_people=$3, daily_routine=$4, hobbies_interests=$5,
           communication=$6, likes_dislikes=$7, beliefs_values=$8, goals_wishes=$9,
           support_needs=$10, updated_at=NOW()`,
        [req.params.id, life_history||null, important_people||null, daily_routine||null,
         hobbies_interests||null, communication||null, likes_dislikes||null,
         beliefs_values||null, goals_wishes||null, support_needs||null]
      );
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
