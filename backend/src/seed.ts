import { query } from './config/database';
import { logger } from './config/logger';

export async function seedNewFeatures() {
  try {
    const homes = await query<{ id: string; name: string }>('SELECT id, name FROM homes LIMIT 1');
    if (!homes.length) { logger.info('Seed skipped: no homes found'); return; }
    const homeId = homes[0].id;

    const staff = await query<{ id: string; first_name: string; last_name: string }>(
      'SELECT id, first_name, last_name FROM staff WHERE home_id = $1 LIMIT 3', [homeId]
    );
    const residents = await query<{ id: string; first_name: string; last_name: string }>(
      "SELECT id, first_name, last_name FROM service_users WHERE home_id = $1 AND status = 'active' LIMIT 3", [homeId]
    );
    const staffId = staff[0]?.id || null;
    const residentId = residents[0]?.id || null;

    const inserted: Record<string, number> = {};

    // ── Noticeboard ──────────────────────────────────────────────────────────
    const nbCount = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM noticeboard WHERE home_id = $1', [homeId]
    );
    if (Number(nbCount[0]?.count) === 0 && staffId) {
      await query(`INSERT INTO noticeboard (home_id, title, body, category, is_pinned, created_by) VALUES
        ($1, 'Welcome to CompCare Hub', 'All new features are now live. Explore fluid balance, wound care, PEEP plans and more in the sidebar.', 'general', true, $2),
        ($1, 'Monthly Fire Drill — 25th July', 'Mandatory fire drill scheduled for 25th July at 10:00am. All staff must participate.', 'safety', false, $2),
        ($1, 'CQC Inspection Prep', 'Please ensure all care plans are up to date and medication records are completed daily ahead of the upcoming CQC inspection.', 'compliance', false, $2)
      `, [homeId, staffId]);
      inserted.noticeboard = 3;
    }

    // ── Fluid Balance ────────────────────────────────────────────────────────
    if (residentId && staffId) {
      const fbCount = await query<{ count: string }>(
        'SELECT COUNT(*) as count FROM fluid_balance WHERE home_id = $1', [homeId]
      );
      if (Number(fbCount[0]?.count) === 0) {
        await query(`INSERT INTO fluid_balance (home_id, su_id, record_date, type, category, amount_ml, recorded_by) VALUES
          ($1,$2,CURRENT_DATE,'input','Water',250,$3),
          ($1,$2,CURRENT_DATE,'input','Tea',200,$3),
          ($1,$2,CURRENT_DATE,'input','Soup',150,$3),
          ($1,$2,CURRENT_DATE,'output','Urine',300,$3)
        `, [homeId, residentId, staffId]).catch(() => {});
        inserted.fluid_balance = 4;
      }
    }

    // ── Weight Records ───────────────────────────────────────────────────────
    if (residentId && staffId) {
      const wCount = await query<{ count: string }>(
        'SELECT COUNT(*) as count FROM weight_records WHERE home_id = $1', [homeId]
      );
      if (Number(wCount[0]?.count) === 0) {
        await query(`INSERT INTO weight_records (home_id, su_id, weight_kg, record_date, recorded_by) VALUES
          ($1,$2,68.5,CURRENT_DATE - INTERVAL '30 days',$3),
          ($1,$2,67.8,CURRENT_DATE - INTERVAL '14 days',$3),
          ($1,$2,68.1,CURRENT_DATE,$3)
        `, [homeId, residentId, staffId]).catch(() => {});
        inserted.weight_records = 3;
      }
    }

    // ── Wound Assessments ────────────────────────────────────────────────────
    if (residentId && staffId) {
      const woundCount = await query<{ count: string }>(
        'SELECT COUNT(*) as count FROM wound_assessments WHERE home_id = $1', [homeId]
      );
      if (Number(woundCount[0]?.count) === 0) {
        await query(`INSERT INTO wound_assessments (home_id, su_id, wound_location, wound_type, size_length_cm, size_width_cm, stage, dressing_used, assessment_date, assessed_by) VALUES
          ($1,$2,'Left heel','pressure_ulcer',2.0,1.5,'2','Foam dressing',CURRENT_DATE,$3),
          ($1,$2,'Right shin','traumatic',3.0,0.5,'none','Non-adherent',CURRENT_DATE - INTERVAL '7 days',$3)
        `, [homeId, residentId, staffId]).catch(() => {});
        inserted.wound_assessments = 2;
      }
    }

    // ── PEEP Plans ───────────────────────────────────────────────────────────
    if (residentId && staffId) {
      const peepCount = await query<{ count: string }>(
        'SELECT COUNT(*) as count FROM peep_plans WHERE home_id = $1', [homeId]
      );
      if (Number(peepCount[0]?.count) === 0) {
        await query(`INSERT INTO peep_plans (home_id, su_id, evacuation_method, mobility_level, equipment_needed, assembly_point, special_considerations, created_by, review_date) VALUES
          ($1,$2,'Evacuation chair assisted','assisted_2','Evacuation chair, slide sheet','Front car park','Resident becomes anxious during alarms. Use calm reassurance.',$3,CURRENT_DATE + INTERVAL '6 months')
        `, [homeId, residentId, staffId]).catch(() => {});
        inserted.peep_plans = 1;
      }
    }

    // ── Hospital Admissions ──────────────────────────────────────────────────
    if (residentId && staffId) {
      const haCount = await query<{ count: string }>(
        'SELECT COUNT(*) as count FROM hospital_admissions WHERE home_id = $1', [homeId]
      );
      if (Number(haCount[0]?.count) === 0) {
        await query(`INSERT INTO hospital_admissions (home_id, su_id, admission_date, discharge_date, hospital_name, admission_reason, admission_type, ward, outcome_notes, logged_by) VALUES
          ($1,$2,CURRENT_DATE - INTERVAL '45 days',CURRENT_DATE - INTERVAL '40 days','Royal Victoria Hospital','Urinary tract infection','emergency','Ward 7','Discharged home with antibiotics. Responded well to IV antibiotics.',$3),
          ($1,$2,CURRENT_DATE - INTERVAL '10 days',NULL,'City General Hospital','Fall with suspected hip fracture','emergency','Orthopaedic Ward','Family notified. Awaiting surgery.',$3)
        `, [homeId, residentId, staffId]).catch(() => {});
        inserted.hospital_admissions = 2;
      }
    }

    // ── Environmental Checks ─────────────────────────────────────────────────
    if (staffId) {
      const envCount = await query<{ count: string }>(
        'SELECT COUNT(*) as count FROM environmental_checks WHERE home_id = $1', [homeId]
      );
      if (Number(envCount[0]?.count) === 0) {
        await query(`INSERT INTO environmental_checks (home_id, check_type, location, reading_value, unit, result, recorded_by) VALUES
          ($1,'fridge_temp','Kitchen Fridge 1','4.2','°C','pass',$2),
          ($1,'fridge_temp','Kitchen Fridge 2','5.8','°C','pass',$2),
          ($1,'freezer_temp','Kitchen Freezer','-18.5','°C','pass',$2),
          ($1,'room_temp','Lounge','21.5','°C','pass',$2),
          ($1,'room_temp','Bedroom 3','18.2','°C','action_required',$2),
          ($1,'water_temp','Bathroom 1 Hot','44.5','°C','pass',$2),
          ($1,'legionella_flush','Shower Room 2','flushed for 2 mins','','pass',$2),
          ($1,'fire_alarm_test','Main panel','Weekly test passed','','pass',$2)
        `, [homeId, staffId]).catch(() => {});
        inserted.environmental_checks = 8;
      }
    }

    // ── Waiting List ─────────────────────────────────────────────────────────
    if (staffId) {
      const wlCount = await query<{ count: string }>(
        'SELECT COUNT(*) as count FROM waiting_list WHERE home_id = $1', [homeId]
      );
      if (Number(wlCount[0]?.count) === 0) {
        await query(`INSERT INTO waiting_list (home_id, full_name, date_of_birth, contact_name, contact_phone, care_needs, priority, status, created_by) VALUES
          ($1,'Margaret Thompson','1938-03-15','David Thompson','07700900123','Dementia — requires 24hr supervision. Needs help with all personal care.','urgent','enquiry',$2),
          ($1,'Robert Jenkins','1942-07-22','Susan Jenkins','07700900456','Parkinson''s disease — mobility issues, falls risk, medication management required.','high','assessment_booked',$2),
          ($1,'Dorothy Walsh','1935-11-08','Peter Walsh','07700900789','Frailty — post-hip replacement, requires physiotherapy and personal care support.','standard','enquiry',$2)
        `, [homeId, staffId]).catch(() => {});
        inserted.waiting_list = 3;
      }
    }

    // ── Visitor Log ──────────────────────────────────────────────────────────
    if (staffId) {
      const vlCount = await query<{ count: string }>(
        'SELECT COUNT(*) as count FROM visitor_log WHERE home_id = $1', [homeId]
      );
      if (Number(vlCount[0]?.count) === 0) {
        await query(`INSERT INTO visitor_log (home_id, visitor_name, purpose, sign_in_time, sign_out_time, signed_in_by) VALUES
          ($1,'Sarah Johnson','social_visit',NOW() - INTERVAL '2 hours',NOW() - INTERVAL '30 minutes',$2),
          ($1,'Dr. Ahmed Khan','professional',NOW() - INTERVAL '1 hour',NOW() - INTERVAL '45 minutes',$2),
          ($1,'Mike Clarke','contractor',NOW() - INTERVAL '3 hours',NOW() - INTERVAL '1 hour',$2)
        `, [homeId, staffId]).catch(() => {});
        inserted.visitor_log = 3;
      }
    }

    // ── Contractors ──────────────────────────────────────────────────────────
    if (staffId) {
      const ctCount = await query<{ count: string }>(
        'SELECT COUNT(*) as count FROM contractors WHERE home_id = $1', [homeId]
      );
      if (Number(ctCount[0]?.count) === 0) {
        await query(`INSERT INTO contractors (home_id, company_name, contact_name, contact_phone, contact_email, service_type, insurance_expiry, dbs_expiry, added_by) VALUES
          ($1,'Premier Gas Services','John Briggs','07800100200','john@premiergas.co.uk','Gas/Heating',CURRENT_DATE + INTERVAL '8 months',CURRENT_DATE + INTERVAL '2 years',$2),
          ($1,'CleanTech Solutions','Maria Santos','07800100201','maria@cleantech.co.uk','Cleaning',CURRENT_DATE + INTERVAL '3 months',CURRENT_DATE + INTERVAL '18 months',$2),
          ($1,'FireSafe UK','Tom Bradley','07800100202','tom@firesafe.co.uk','Fire Safety',CURRENT_DATE - INTERVAL '15 days',CURRENT_DATE + INTERVAL '1 year',$2),
          ($1,'SecureIT Systems','Priya Patel','07800100203','priya@secureit.co.uk','IT/Technology',CURRENT_DATE + INTERVAL '11 months',CURRENT_DATE + INTERVAL '3 years',$2)
        `, [homeId, staffId]).catch(() => {});
        inserted.contractors = 4;
      }
    }

    // ── Lessons Learned ──────────────────────────────────────────────────────
    if (staffId) {
      const llCount = await query<{ count: string }>(
        'SELECT COUNT(*) as count FROM lessons_learned WHERE home_id = $1', [homeId]
      );
      if (Number(llCount[0]?.count) === 0) {
        await query(`INSERT INTO lessons_learned (home_id, created_by, source_type, date_of_event, title, what_happened, root_cause, lesson, action_taken, action_owner) VALUES
          ($1,$2,'incident',CURRENT_DATE - INTERVAL '14 days',
           'Medication omission — evening round',
           'Night staff omitted one resident''s blood pressure medication during the evening round.',
           'Staff unfamiliar with updated MAR chart after medication review.',
           'All staff must be briefed following any medication change before the next round.',
           'New medication handover checklist introduced. MAR change alerts added.',
           'Registered Manager'),
          ($1,$2,'incident',CURRENT_DATE - INTERVAL '30 days',
           'Resident fall in bathroom',
           'Resident found on bathroom floor. No injuries sustained.',
           'Wet floor without non-slip mat in place. Call bell not within reach.',
           'Non-slip mats must be checked daily. Call bells checked every shift.',
           'Non-slip mats installed in all bathrooms. Call bell audit completed.',
           'Senior Carer')
        `, [homeId, staffId]).catch(() => {});
        inserted.lessons_learned = 2;
      }
    }

    // ── Staff Absences ───────────────────────────────────────────────────────
    if (staffId) {
      const saCount = await query<{ count: string }>(
        'SELECT COUNT(*) as count FROM staff_absences WHERE home_id = $1', [homeId]
      );
      if (Number(saCount[0]?.count) === 0) {
        const staff2 = staff[1]?.id || staffId;
        await query(`INSERT INTO staff_absences (home_id, staff_id, absence_start, absence_end, absence_type, reason, logged_by) VALUES
          ($1,$2,CURRENT_DATE - INTERVAL '20 days',CURRENT_DATE - INTERVAL '18 days','sick','Respiratory infection',$2),
          ($1,$3,CURRENT_DATE - INTERVAL '60 days',CURRENT_DATE - INTERVAL '57 days','sick','Back pain',$2),
          ($1,$2,CURRENT_DATE - INTERVAL '10 days',NULL,'sick','Ongoing — GP certificate provided',$2)
        `, [homeId, staffId, staff2]).catch(() => {});
        inserted.staff_absences = 3;
      }
    }

    // ── External Contacts ────────────────────────────────────────────────────
    const ecCount = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM external_contacts WHERE home_id = $1', [homeId]
    );
    if (Number(ecCount[0]?.count) === 0) {
      await query(`INSERT INTO external_contacts (home_id, name, organisation, role, category, phone, email) VALUES
        ($1,'Dr. Amelia Foster','Northfield Medical Centre','GP','healthcare','01234567890','amelia.foster@nmc.nhs.uk'),
        ($1,'James Okafor','City Council Adult Social Care','Social Worker','authority','01234567891','james.okafor@citycouncil.gov.uk'),
        ($1,'Care Quality Commission','CQC','Regulatory Body','authority','03000616161','enquiries@cqc.org.uk'),
        ($1,'Emergency Services',NULL,'Police / Fire / Ambulance','emergency','999',NULL),
        ($1,'NHS 111','NHS','Out-of-Hours Healthcare','healthcare','111',NULL),
        ($1,'Sarah Mitchell','Sunrise Pharmacy','Pharmacist','healthcare','01234567892','sarah@sunrisepharmacy.co.uk')
      `, [homeId]).catch(() => {});
      inserted.external_contacts = 6;
    }

    const total = Object.values(inserted).reduce((a, b) => a + b, 0);
    if (total > 0) {
      logger.info(`Seed complete for home ${homes[0].name}: ${JSON.stringify(inserted)}`);
    } else {
      logger.info('Seed skipped: all tables already have data');
    }
  } catch (err: any) {
    logger.error('Seed error: ' + err.message);
  }
}
