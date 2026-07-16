import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { query } from '../config/database';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';

const router = Router();
router.use(authenticate);
router.use(requireRole('home_manager', 'group_admin', 'admin', 'deputy_manager'));

function fromToken(req: Request, field: string): string {
  const token = req.headers.authorization?.substring(7);
  if (token) { const d = jwt.decode(token) as any; return (req.staff as any)?.[field] || d?.[field] || ''; }
  return (req.staff as any)?.[field] || '';
}

// POST /api/seed/all  — insert test data into all new tables
router.post('/all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = req.body.homeId || fromToken(req, 'homeId');
    const staffId = fromToken(req, 'staffId');

    if (!homeId) {
      res.status(400).json({ success: false, error: 'homeId is required (pass in body or be logged in to a home)' } as ApiResponse);
      return;
    }

    // Pick a real service user from this home to use as suId (or null if none)
    const suRows = await query<{ id: string }>(
      `SELECT id FROM service_users WHERE home_id = $1 AND status = 'live' LIMIT 1`,
      [homeId]
    );
    const suId: string | null = suRows[0]?.id || null;

    const inserted: Record<string, number> = {};

    // ── fluid_balance ─────────────────────────────────────────────────────────
    if (suId) {
      await query(`
        CREATE TABLE IF NOT EXISTS fluid_balance (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          home_id UUID NOT NULL, su_id UUID NOT NULL, recorded_by UUID NOT NULL,
          record_date DATE NOT NULL DEFAULT CURRENT_DATE, record_time TIME NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('input','output')), category TEXT NOT NULL,
          amount_ml INTEGER NOT NULL, notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
        )`, []);
      await query(`
        INSERT INTO fluid_balance (home_id, su_id, recorded_by, record_date, record_time, type, category, amount_ml, notes)
        VALUES
          ($1,$2,$3,CURRENT_DATE,'08:00','input','Water',200,'Morning water'),
          ($1,$2,$3,CURRENT_DATE,'10:00','input','Tea',150,'Morning tea'),
          ($1,$2,$3,CURRENT_DATE,'09:30','output','Urine',300,'Routine')
      `, [homeId, suId, staffId]);
      inserted.fluid_balance = 3;
    }

    // ── weight_records ────────────────────────────────────────────────────────
    if (suId) {
      await query(`
        CREATE TABLE IF NOT EXISTS weight_records (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          home_id UUID NOT NULL, su_id UUID NOT NULL, recorded_by UUID NOT NULL,
          record_date DATE NOT NULL DEFAULT CURRENT_DATE,
          weight_kg NUMERIC(5,2) NOT NULL, height_cm NUMERIC(5,1), bmi NUMERIC(4,1),
          notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
        )`, []);
      await query(`
        INSERT INTO weight_records (home_id, su_id, recorded_by, record_date, weight_kg, height_cm, bmi, notes)
        VALUES ($1,$2,$3,CURRENT_DATE,72.5,165.0,26.6,'Routine monthly weigh')
      `, [homeId, suId, staffId]);
      inserted.weight_records = 1;
    }

    // ── wound_assessments ─────────────────────────────────────────────────────
    if (suId) {
      await query(`
        CREATE TABLE IF NOT EXISTS wound_assessments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          home_id UUID NOT NULL, su_id UUID NOT NULL, assessed_by UUID NOT NULL,
          assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
          wound_location TEXT NOT NULL,
          wound_type TEXT NOT NULL CHECK (wound_type IN ('pressure_ulcer','surgical','leg_ulcer','diabetic','traumatic','other')),
          stage TEXT CHECK (stage IN ('1','2','3','4','unstageable','deep_tissue','none')),
          size_length_cm NUMERIC(5,1), size_width_cm NUMERIC(5,1), size_depth_cm NUMERIC(5,1),
          wound_bed TEXT, exudate_amount TEXT CHECK (exudate_amount IN ('none','low','moderate','high')),
          exudate_type TEXT, surrounding_skin TEXT, dressing_used TEXT, dressing_frequency TEXT,
          pain_score INTEGER CHECK (pain_score BETWEEN 0 AND 10),
          healing_status TEXT CHECK (healing_status IN ('improving','static','deteriorating','healed')),
          notes TEXT, next_review_date DATE,
          status TEXT DEFAULT 'active' CHECK (status IN ('active','healed','closed')),
          created_at TIMESTAMPTZ DEFAULT NOW()
        )`, []);
      await query(`
        INSERT INTO wound_assessments
          (home_id, su_id, assessed_by, assessment_date, wound_location, wound_type, stage,
           size_length_cm, size_width_cm, dressing_used, dressing_frequency, healing_status, notes, status)
        VALUES ($1,$2,$3,CURRENT_DATE,'Left heel','pressure_ulcer','2',3.0,2.0,'Mepitel','Daily','improving','Showing signs of improvement','active')
      `, [homeId, suId, staffId]);
      inserted.wound_assessments = 1;
    }

    // ── peep_plans ────────────────────────────────────────────────────────────
    if (suId) {
      await query(`
        CREATE TABLE IF NOT EXISTS peep_plans (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          home_id UUID NOT NULL, su_id UUID NOT NULL, created_by UUID NOT NULL,
          review_date DATE, mobility_level TEXT NOT NULL CHECK (mobility_level IN ('independent','assisted_1','assisted_2','hoist','bedbound','wheelchair')),
          can_self_evacuate BOOLEAN DEFAULT false, evacuation_method TEXT NOT NULL,
          equipment_needed TEXT, number_of_staff_required INTEGER DEFAULT 1,
          assembly_point TEXT, special_considerations TEXT, known_to_fire_service BOOLEAN DEFAULT false,
          reviewed_by UUID, reviewed_at TIMESTAMPTZ, is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
        )`, []);
      await query(`
        INSERT INTO peep_plans
          (home_id, su_id, created_by, review_date, mobility_level, can_self_evacuate,
           evacuation_method, number_of_staff_required, assembly_point, is_active)
        VALUES ($1,$2,$3,CURRENT_DATE + 90,'wheelchair',false,'Wheelchair evacuation with 2 staff',2,'Car park - main entrance',true)
      `, [homeId, suId, staffId]);
      inserted.peep_plans = 1;
    }

    // ── hospital_admissions ───────────────────────────────────────────────────
    if (suId) {
      await query(`
        CREATE TABLE IF NOT EXISTS hospital_admissions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          home_id UUID NOT NULL, su_id UUID NOT NULL, logged_by UUID NOT NULL,
          hospital_name TEXT NOT NULL, ward TEXT, admission_date DATE NOT NULL, admission_reason TEXT NOT NULL,
          admission_type TEXT NOT NULL CHECK (admission_type IN ('emergency','planned','day_case')),
          discharge_date DATE, discharge_destination TEXT CHECK (discharge_destination IN ('home','care_home','other_hospital','deceased') OR discharge_destination IS NULL),
          outcome_notes TEXT, follow_up_required BOOLEAN DEFAULT false, follow_up_notes TEXT,
          status TEXT DEFAULT 'admitted' CHECK (status IN ('admitted','discharged')),
          created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
        )`, []);
      await query(`
        INSERT INTO hospital_admissions
          (home_id, su_id, logged_by, hospital_name, ward, admission_date, admission_reason, admission_type, follow_up_required, status)
        VALUES ($1,$2,$3,'City General Hospital','Ward 7',CURRENT_DATE - 5,'UTI - requiring IV antibiotics','emergency',true,'admitted')
      `, [homeId, suId, staffId]);
      inserted.hospital_admissions = 1;
    }

    // ── environmental_checks ──────────────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS environmental_checks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        home_id UUID NOT NULL, recorded_by UUID NOT NULL,
        check_date DATE NOT NULL DEFAULT CURRENT_DATE, check_time TIME,
        check_type TEXT NOT NULL CHECK (check_type IN (
          'fridge_temp','freezer_temp','room_temp','water_temp',
          'legionella_flush','fire_alarm_test','emergency_lighting',
          'hoist_check','window_restrictor','other'
        )),
        location TEXT NOT NULL, reading_value TEXT, unit TEXT,
        result TEXT NOT NULL CHECK (result IN ('pass','fail','action_required')),
        action_taken TEXT, notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
      )`, []);
    await query(`
      INSERT INTO environmental_checks (home_id, recorded_by, check_date, check_time, check_type, location, reading_value, unit, result, notes)
      VALUES
        ($1,$2,CURRENT_DATE,'07:30','fridge_temp','Kitchen','4','°C','pass','Morning fridge check'),
        ($1,$2,CURRENT_DATE,'07:31','freezer_temp','Kitchen','-18','°C','pass','Morning freezer check'),
        ($1,$2,CURRENT_DATE,'08:00','fire_alarm_test','Main corridor',null,null,'pass','Weekly test completed')
    `, [homeId, staffId]);
    inserted.environmental_checks = 3;

    // ── waiting_list ──────────────────────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS waiting_list (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        home_id UUID NOT NULL, full_name TEXT NOT NULL, date_of_birth DATE,
        contact_name TEXT, contact_phone TEXT, contact_email TEXT, care_needs TEXT,
        funding_type TEXT CHECK (funding_type IN ('local_authority','self_funded','nhs','unknown')),
        priority TEXT DEFAULT 'standard' CHECK (priority IN ('urgent','high','standard','low')),
        enquiry_date DATE NOT NULL DEFAULT CURRENT_DATE, expected_admission_date DATE,
        preferred_room TEXT, status TEXT DEFAULT 'enquiry' CHECK (status IN ('enquiry','assessment_booked','assessment_complete','offer_made','accepted','declined','withdrawn')),
        notes TEXT, assigned_to UUID, created_by UUID NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
      )`, []);
    await query(`
      INSERT INTO waiting_list (home_id, full_name, date_of_birth, contact_name, contact_phone, care_needs, funding_type, priority, enquiry_date, status, created_by)
      VALUES
        ($1,'Margaret Thompson','1942-03-15','James Thompson','07700 900001','Dementia care, personal care assistance','local_authority','high',CURRENT_DATE,'enquiry',$2),
        ($1,'Robert Williams','1938-11-22','Susan Williams','07700 900002','Post-stroke rehabilitation, mobility support','self_funded','standard',CURRENT_DATE - 7,'assessment_booked',$2)
    `, [homeId, staffId]);
    inserted.waiting_list = 2;

    // ── visitor_log ───────────────────────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS visitor_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        home_id UUID NOT NULL, su_id UUID,
        visitor_name TEXT NOT NULL, visitor_relationship TEXT, visitor_phone TEXT,
        sign_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(), sign_out_time TIMESTAMPTZ,
        purpose TEXT DEFAULT 'social_visit' CHECK (purpose IN ('social_visit','professional','contractor','delivery','other')),
        vehicle_reg TEXT, notes TEXT, signed_in_by UUID NOT NULL, signed_out_by UUID,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`, []);
    await query(`
      INSERT INTO visitor_log (home_id, su_id, visitor_name, visitor_relationship, sign_in_time, sign_out_time, purpose, signed_in_by)
      VALUES
        ($1,$2,'John Smith','Son',NOW() - INTERVAL '2 hours',NOW() - INTERVAL '30 minutes','social_visit',$3),
        ($1,null,'Dr Patricia Moore',null,NOW() - INTERVAL '1 hour',null,'professional',$3)
    `, [homeId, suId, staffId]);
    inserted.visitor_log = 2;

    // ── contractors ───────────────────────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS contractors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        home_id UUID NOT NULL, company_name TEXT NOT NULL, contact_name TEXT,
        contact_phone TEXT, contact_email TEXT, service_type TEXT NOT NULL,
        insurance_expiry DATE, dbs_required BOOLEAN DEFAULT false, dbs_expiry DATE,
        gas_safe_number TEXT, electrician_number TEXT, contract_start DATE, contract_end DATE,
        last_visit_date DATE, next_scheduled_visit DATE, notes TEXT,
        status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','expired')),
        added_by UUID NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW()
      )`, []);
    await query(`
      INSERT INTO contractors (home_id, company_name, contact_name, contact_phone, service_type, insurance_expiry, dbs_required, status, added_by)
      VALUES
        ($1,'ABC Heating Ltd','Mike Johnson','01234 567890','Heating & Boiler Maintenance',CURRENT_DATE + 180,false,'active',$2),
        ($1,'Secure Electric Co','Dave Brown','01234 567891','Electrical Maintenance',CURRENT_DATE + 90,true,'active',$2),
        ($1,'CleanPro Services','Lisa Green','01234 567892','Cleaning & Laundry',CURRENT_DATE + 365,true,'active',$2)
    `, [homeId, staffId]);
    inserted.contractors = 3;

    // ── lessons_learned ───────────────────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS lessons_learned (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        home_id UUID NOT NULL, created_by UUID NOT NULL,
        source_type TEXT NOT NULL CHECK (source_type IN ('incident','complaint','near_miss','audit','inspection','staff_feedback','other')),
        source_reference TEXT, date_of_event DATE NOT NULL, title TEXT NOT NULL,
        what_happened TEXT NOT NULL, root_cause TEXT, lesson TEXT NOT NULL,
        action_taken TEXT NOT NULL, action_owner TEXT, action_due_date DATE,
        action_completed BOOLEAN DEFAULT false, action_completed_date DATE,
        shared_with_team BOOLEAN DEFAULT false, shared_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`, []);
    await query(`
      INSERT INTO lessons_learned
        (home_id, created_by, source_type, date_of_event, title, what_happened, root_cause, lesson, action_taken, action_owner, shared_with_team)
      VALUES
        ($1,$2,'incident',CURRENT_DATE - 14,'Medication Administration Near Miss',
         'Staff member selected wrong blister pack due to similar packaging.',
         'Two residents with similar sounding names had adjacent medication boxes.',
         'Medication storage must have clear visual differentiation between residents with similar names.',
         'Reorganised medication trolley with colour-coded resident dividers and updated protocol.',
         'Deputy Manager',true),
        ($1,$2,'audit',CURRENT_DATE - 7,'Documentation Gap Identified in Care Plans',
         'CQC audit found 3 care plans had not been reviewed within the required 6-week period.',
         'No automated reminder system in place for care plan review dates.',
         'Regular review reminders must be built into the monthly care coordination process.',
         'Set up calendar reminders and assigned care plan review to named key workers.',
         'Home Manager',false)
    `, [homeId, staffId]);
    inserted.lessons_learned = 2;

    // ── staff_absences ────────────────────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS staff_absences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        home_id UUID NOT NULL, staff_id UUID NOT NULL,
        absence_start DATE NOT NULL, absence_end DATE,
        absence_type TEXT NOT NULL CHECK (absence_type IN ('sick','unauthorised','emergency','bereavement','other')),
        reason TEXT, return_to_work_date DATE, return_to_work_completed BOOLEAN DEFAULT false,
        return_to_work_notes TEXT, fit_note_provided BOOLEAN DEFAULT false, fit_note_end_date DATE,
        logged_by UUID NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
      )`, []);
    await query(`
      INSERT INTO staff_absences (home_id, staff_id, absence_start, absence_end, absence_type, reason, fit_note_provided, logged_by)
      VALUES ($1,$2,CURRENT_DATE - 3,CURRENT_DATE - 1,'sick','Cold and flu symptoms',false,$2)
    `, [homeId, staffId]);
    inserted.staff_absences = 1;

    // ── external_contacts ─────────────────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS external_contacts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        home_id UUID NOT NULL, name VARCHAR(200) NOT NULL,
        organisation VARCHAR(200), role VARCHAR(100) NOT NULL,
        category VARCHAR(50) NOT NULL DEFAULT 'professional',
        phone VARCHAR(50), email VARCHAR(200), address TEXT, notes TEXT,
        is_active BOOLEAN DEFAULT true, created_by UUID,
        created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
      )`, []);
    await query(`
      INSERT INTO external_contacts (home_id, name, organisation, role, category, phone, email, is_active, created_by)
      VALUES
        ($1,'Dr Sarah Ahmed','City Medical Practice','GP','gp','01234 100001','s.ahmed@citymedical.nhs.uk',true,$2),
        ($1,'Tom Clarke','Community Pharmacy','Pharmacist','pharmacy','01234 100002','pharmacy@boots.com',true,$2),
        ($1,'Jane Morrison','CQC','CQC Inspector','regulator','0300 061 6161','j.morrison@cqc.org.uk',true,$2),
        ($1,'David Patel','Patel & Sons Solicitors','Solicitor','legal','01234 100003','d.patel@patellaw.co.uk',true,$2)
    `, [homeId, staffId]);
    inserted.external_contacts = 4;

    // ── noticeboard ───────────────────────────────────────────────────────────
    await query(`
      INSERT INTO noticeboard (home_id, created_by, title, body, category, is_pinned, expires_at, target_role)
      VALUES
        ($1,$2,'Welcome to CompCare Hub','All staff must log in to the system daily to record care notes and complete their shifts. Contact your manager if you have any issues accessing your account.','general',true,CURRENT_DATE + 30,null),
        ($1,$2,'Infection Control Reminder','Please ensure all PPE is worn when entering resident rooms. Hand sanitiser stations have been restocked on all corridors. Report any concerns to the IPC Lead immediately.','clinical',false,CURRENT_DATE + 14,null),
        ($1,$2,'Fire Safety Test - This Friday','Scheduled fire alarm test this Friday at 10:00am. This is a planned test — please do not call 999. Ensure all residents are reassured in advance.','safety',true,CURRENT_DATE + 7,null)
    `, [homeId, staffId]);
    inserted.noticeboard = 3;

    res.json({
      success: true,
      message: 'Seed data inserted successfully',
      homeId,
      inserted,
    });
  } catch (err) { next(err); }
});

export default router;
