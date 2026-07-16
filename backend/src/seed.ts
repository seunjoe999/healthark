import { query } from './config/database';
import { logger } from './config/logger';

export async function seedNewFeatures() {
  try {
    // Get the first home and staff/resident IDs to seed against
    const homes = await query<{ id: string; name: string }>('SELECT id, name FROM homes LIMIT 1');
    if (!homes.length) { logger.info('Seed skipped: no homes found'); return; }
    const homeId = homes[0].id;

    const staff = await query<{ id: string; first_name: string; last_name: string }>(
      'SELECT id, first_name, last_name FROM staff WHERE home_id = $1 LIMIT 3', [homeId]
    );
    const residents = await query<{ id: string; first_name: string; last_name: string }>(
      'SELECT id, first_name, last_name FROM service_users WHERE home_id = $1 AND status = \'active\' LIMIT 3', [homeId]
    );
    const staffId = staff[0]?.id || null;
    const residentId = residents[0]?.id || null;
    const staffName = staff[0] ? `${staff[0].first_name} ${staff[0].last_name}` : 'Test Staff';
    const residentName = residents[0] ? `${residents[0].first_name} ${residents[0].last_name}` : 'Test Resident';

    const inserted: Record<string, number> = {};

    // ── Noticeboard ─────────────────────────────────────────────────────────
    const nbCount = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM noticeboard WHERE home_id = $1', [homeId]
    );
    if (Number(nbCount[0]?.count) === 0) {
      await query(`INSERT INTO noticeboard (home_id, title, content, category, priority, created_by, is_active) VALUES
        ($1, 'Welcome to CompCare Hub', 'All new features are now live. Explore fluid balance, wound care, PEEP plans and more in the sidebar.', 'general', 'high', $2, true),
        ($1, 'Monthly Fire Drill — 25th July', 'Mandatory fire drill scheduled for 25th July at 10:00am. All staff must participate.', 'safety', 'high', $2, true),
        ($1, 'CQC Inspection Prep', 'Please ensure all care plans are up to date and medication records are completed daily ahead of the upcoming CQC inspection.', 'compliance', 'normal', $2, true)
      `, [homeId, staffId]);
      inserted.noticeboard = 3;
    }

    // ── Fluid Balance ────────────────────────────────────────────────────────
    if (residentId) {
      const fbCount = await query<{ count: string }>(
        'SELECT COUNT(*) as count FROM fluid_balance WHERE home_id = $1', [homeId]
      );
      if (Number(fbCount[0]?.count) === 0) {
        await query(`INSERT INTO fluid_balance (home_id, service_user_id, record_date, fluid_type, amount_ml, route, recorded_by) VALUES
          ($1,$2,CURRENT_DATE,'Water',250,'oral',$3),
          ($1,$2,CURRENT_DATE,'Tea',200,'oral',$3),
          ($1,$2,CURRENT_DATE,'Soup',150,'oral',$3),
          ($1,$2,CURRENT_DATE,'Urine',-300,'output',$3)
        `, [homeId, residentId, staffId]).catch(() => {});
        inserted.fluid_balance = 4;
      }
    }

    // ── Weight Records ───────────────────────────────────────────────────────
    if (residentId) {
      const wCount = await query<{ count: string }>(
        'SELECT COUNT(*) as count FROM weight_records WHERE home_id = $1', [homeId]
      );
      if (Number(wCount[0]?.count) === 0) {
        await query(`INSERT INTO weight_records (home_id, service_user_id, weight_kg, recorded_date, recorded_by) VALUES
          ($1,$2,68.5,CURRENT_DATE - INTERVAL '30 days',$3),
          ($1,$2,67.8,CURRENT_DATE - INTERVAL '14 days',$3),
          ($1,$2,68.1,CURRENT_DATE,$3)
        `, [homeId, residentId, staffId]).catch(() => {});
        inserted.weight_records = 3;
      }
    }

    // ── Wound Assessments ────────────────────────────────────────────────────
    if (residentId) {
      const woundCount = await query<{ count: string }>(
        'SELECT COUNT(*) as count FROM wound_assessments WHERE home_id = $1', [homeId]
      );
      if (Number(woundCount[0]?.count) === 0) {
        await query(`INSERT INTO wound_assessments (home_id, service_user_id, wound_location, wound_type, wound_size, wound_stage, dressing_type, assessment_date, assessed_by) VALUES
          ($1,$2,'Left heel','Pressure ulcer','2cm x 1.5cm','Stage 2','Foam dressing',CURRENT_DATE,$3),
          ($1,$2,'Right shin','Laceration','3cm x 0.5cm','Superficial','Non-adherent',CURRENT_DATE - INTERVAL '7 days',$3)
        `, [homeId, residentId, staffId]).catch(() => {});
        inserted.wound_assessments = 2;
      }
    }

    // ── PEEP Plans ───────────────────────────────────────────────────────────
    if (residentId) {
      const peepCount = await query<{ count: string }>(
        'SELECT COUNT(*) as count FROM peep_plans WHERE home_id = $1', [homeId]
      );
      if (Number(peepCount[0]?.count) === 0) {
        await query(`INSERT INTO peep_plans (home_id, service_user_id, evacuation_method, mobility_level, equipment_needed, assembly_point, notes, created_by, review_date) VALUES
          ($1,$2,'Evacuation chair assisted','Limited — needs two-person assist','Evacuation chair, slide sheet','Front car park','Resident becomes anxious during alarms. Use calm reassurance.',$3,CURRENT_DATE + INTERVAL '6 months')
        `, [homeId, residentId, staffId]).catch(() => {});
        inserted.peep_plans = 1;
      }
    }

    // ── Hospital Admissions ──────────────────────────────────────────────────
    if (residentId) {
      const haCount = await query<{ count: string }>(
        'SELECT COUNT(*) as count FROM hospital_admissions WHERE home_id = $1', [homeId]
      );
      if (Number(haCount[0]?.count) === 0) {
        await query(`INSERT INTO hospital_admissions (home_id, service_user_id, admission_date, discharge_date, hospital_name, reason, ward, outcome, notes) VALUES
          ($1,$2,CURRENT_DATE - INTERVAL '45 days',CURRENT_DATE - INTERVAL '40 days','Royal Victoria Hospital','Urinary tract infection','Ward 7','Discharged home with antibiotics','Responded well to IV antibiotics'),
          ($1,$2,CURRENT_DATE - INTERVAL '10 days',NULL,'City General Hospital','Fall with suspected hip fracture','Orthopaedic Ward','Awaiting surgery','Family notified')
        `, [homeId, residentId]).catch(() => {});
        inserted.hospital_admissions = 2;
      }
    }

    // ── Environmental Checks ─────────────────────────────────────────────────
    const envCount = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM environmental_checks WHERE home_id = $1', [homeId]
    );
    if (Number(envCount[0]?.count) === 0) {
      await query(`INSERT INTO environmental_checks (home_id, check_type, location, reading_value, unit, result, checked_by) VALUES
        ($1,'fridge_temp','Kitchen Fridge 1','4.2','°C','pass',$2),
        ($1,'fridge_temp','Kitchen Fridge 2','5.8','°C','pass',$2),
        ($1,'freezer_temp','Kitchen Freezer','-18.5','°C','pass',$2),
        ($1,'room_temp','Lounge','21.5','°C','pass',$2),
        ($1,'room_temp','Bedroom 3','18.2','°C','warning',$2),
        ($1,'water_temp','Bathroom 1 Hot','44.5','°C','pass',$2),
        ($1,'legionella_flush','Shower Room 2','flushed for 2 mins','','pass',$2),
        ($1,'fire_alarm_test','Main panel','Weekly test passed','','pass',$2)
      `, [homeId, staffId]).catch(() => {});
      inserted.environmental_checks = 8;
    }

    // ── Waiting List ─────────────────────────────────────────────────────────
    const wlCount = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM waiting_list WHERE home_id = $1', [homeId]
    );
    if (Number(wlCount[0]?.count) === 0) {
      await query(`INSERT INTO waiting_list (home_id, full_name, date_of_birth, contact_name, contact_phone, care_needs, priority, status, nhs_number) VALUES
        ($1,'Margaret Thompson','1938-03-15','David Thompson','07700900123','Dementia — requires 24hr supervision. Needs help with all personal care.',  'urgent','enquiry','NHS123456789'),
        ($1,'Robert Jenkins','1942-07-22','Susan Jenkins','07700900456','Parkinson''s disease — mobility issues, falls risk, medication management required.','high','assessment_booked','NHS987654321'),
        ($1,'Dorothy Walsh','1935-11-08','Peter Walsh','07700900789','Frailty — post-hip replacement, requires physiotherapy and personal care support.','standard','enquiry','NHS456789123')
      `, [homeId]).catch(() => {});
      inserted.waiting_list = 3;
    }

    // ── Visitor Log ──────────────────────────────────────────────────────────
    const vlCount = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM visitor_log WHERE home_id = $1', [homeId]
    );
    if (Number(vlCount[0]?.count) === 0) {
      await query(`INSERT INTO visitor_log (home_id, visitor_name, purpose, sign_in_time, sign_out_time, temperature_check, id_checked) VALUES
        ($1,'Sarah Johnson','Family Visit',NOW() - INTERVAL '2 hours',NOW() - INTERVAL '30 minutes',true,false),
        ($1,'Dr. Ahmed Khan','Healthcare Professional',NOW() - INTERVAL '1 hour',NOW() - INTERVAL '45 minutes',true,true),
        ($1,'Mike Clarke','Contractor — HVAC',NOW() - INTERVAL '3 hours',NOW() - INTERVAL '1 hour',true,true)
      `, [homeId]).catch(() => {});
      inserted.visitor_log = 3;
    }

    // ── Contractors ──────────────────────────────────────────────────────────
    const ctCount = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM contractors WHERE home_id = $1', [homeId]
    );
    if (Number(ctCount[0]?.count) === 0) {
      await query(`INSERT INTO contractors (home_id, company_name, contact_name, phone, email, service_type, insurance_expiry, gas_safe_expiry, dbs_expiry) VALUES
        ($1,'Premier Gas Services','John Briggs','07800100200','john@premiergas.co.uk','Gas/Heating',CURRENT_DATE + INTERVAL '8 months',CURRENT_DATE + INTERVAL '6 months',CURRENT_DATE + INTERVAL '2 years'),
        ($1,'CleanTech Solutions','Maria Santos','07800100201','maria@cleantech.co.uk','Cleaning',CURRENT_DATE + INTERVAL '3 months',NULL,CURRENT_DATE + INTERVAL '18 months'),
        ($1,'FireSafe UK','Tom Bradley','07800100202','tom@firesafe.co.uk','Fire Safety',CURRENT_DATE - INTERVAL '15 days',NULL,CURRENT_DATE + INTERVAL '1 year'),
        ($1,'SecureIT Systems','Priya Patel','07800100203','priya@secureit.co.uk','IT/Technology',CURRENT_DATE + INTERVAL '11 months',NULL,CURRENT_DATE + INTERVAL '3 years')
      `, [homeId]).catch(() => {});
      inserted.contractors = 4;
    }

    // ── Lessons Learned ──────────────────────────────────────────────────────
    const llCount = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM lessons_learned WHERE home_id = $1', [homeId]
    );
    if (Number(llCount[0]?.count) === 0) {
      await query(`INSERT INTO lessons_learned (home_id, title, incident_type, date_of_incident, description, root_cause, lesson_learned, action_taken, action_owner, priority, status, created_by) VALUES
        ($1,'Medication omission — evening round','Medication Error',CURRENT_DATE - INTERVAL '14 days',
         'Night staff omitted one resident''s blood pressure medication during the evening round.',
         'Staff unfamiliar with updated MAR chart after medication review.',
         'All staff must be briefed following any medication change before the next round.',
         'New medication handover checklist introduced. MAR change alerts added.',
         'Registered Manager','high','in_progress',$2),
        ($1,'Resident fall in bathroom','Fall',CURRENT_DATE - INTERVAL '30 days',
         'Resident found on bathroom floor. No injuries sustained.',
         'Wet floor without non-slip mat in place. Call bell not within reach.',
         'Non-slip mats must be checked daily. Call bells checked every shift.',
         'Non-slip mats installed in all bathrooms. Call bell audit completed.',
         'Senior Carer','medium','closed',$2)
      `, [homeId, staffId]).catch(() => {});
      inserted.lessons_learned = 2;
    }

    // ── Staff Absences ───────────────────────────────────────────────────────
    if (staffId) {
      const saCount = await query<{ count: string }>(
        'SELECT COUNT(*) as count FROM staff_absences WHERE home_id = $1', [homeId]
      );
      if (Number(saCount[0]?.count) === 0) {
        const staff2 = staff[1]?.id || staffId;
        await query(`INSERT INTO staff_absences (home_id, staff_id, absence_start, absence_end, absence_type, reason) VALUES
          ($1,$2,CURRENT_DATE - INTERVAL '20 days',CURRENT_DATE - INTERVAL '18 days','sickness','Respiratory infection'),
          ($1,$3,CURRENT_DATE - INTERVAL '60 days',CURRENT_DATE - INTERVAL '57 days','sickness','Back pain'),
          ($1,$2,CURRENT_DATE - INTERVAL '10 days',NULL,'sickness','Ongoing — GP certificate provided')
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
        ($1,'999','Emergency Services','Police / Fire / Ambulance','emergency','999',NULL),
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
