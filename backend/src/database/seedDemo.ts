import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from '../config/database';
import { logger } from '../config/logger';

const ORG_ID = '00000000-0000-0000-0000-000000000001';

async function seedDemo() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── Check if home already exists ─────────────────────────────
    const existingHome = await client.query(
      `SELECT id FROM homes WHERE organisation_id = $1 LIMIT 1`, [ORG_ID]
    );

    let homeId: string;
    let adminId: string;
    let managerId: string;
    let seniorId: string;
    let careId: string;
    let care2Id: string;

    if (existingHome.rows.length) {
      homeId = existingHome.rows[0].id;
      logger.info('Using existing home: ' + homeId);

      // Get or create staff
      const existingAdmin = await client.query(`SELECT id FROM staff WHERE email='admin@healthark.co.uk' OR email='admin@compcarehub.co.uk' LIMIT 1`);
      if (existingAdmin.rows.length) {
        adminId = existingAdmin.rows[0].id;
      } else {
        const h = await bcrypt.hash('Admin1234', 12);
        const r = await client.query(
          `INSERT INTO staff (organisation_id,home_id,email,password_hash,first_name,last_name,role,is_active,status)
           VALUES ($1,$2,'admin@healthark.co.uk',$3,'System','Admin','group_admin',true,'active') RETURNING id`,
          [ORG_ID, homeId, h]
        );
        adminId = r.rows[0].id;
        await client.query(`INSERT INTO staff_onboarding (staff_id) VALUES ($1) ON CONFLICT DO NOTHING`, [adminId]);
      }
    } else {
      // Create home
      const homeRes = await client.query(
        `INSERT INTO homes (organisation_id, name, address1, postcode, phone, email, manager_name, geofence_radius)
         VALUES ($1,'Sunrise Care Home','14 Meadow Lane','LE3 5BP','0116 456 7890','sunrise@compcarehub.co.uk','Sarah Johnson',200)
         RETURNING id`,
        [ORG_ID]
      );
      homeId = homeRes.rows[0].id;

      const adminHash = await bcrypt.hash('Admin1234', 12);
      const adminRes = await client.query(
        `INSERT INTO staff (organisation_id,home_id,email,password_hash,first_name,last_name,role,is_active,status)
         VALUES ($1,$2,'admin@healthark.co.uk',$3,'System','Admin','group_admin',true,'active') RETURNING id`,
        [ORG_ID, homeId, adminHash]
      );
      adminId = adminRes.rows[0].id;
      await client.query(`INSERT INTO staff_onboarding (staff_id) VALUES ($1) ON CONFLICT DO NOTHING`, [adminId]);
    }

    // ── Staff ────────────────────────────────────────────────────
    const mgHash = await bcrypt.hash('Manager1234', 12);
    const mgRes = await client.query(
      `INSERT INTO staff (organisation_id,home_id,email,password_hash,first_name,last_name,role,phone,is_active,status,date_of_birth)
       VALUES ($1,$2,'manager@healthark.co.uk',$3,'Sarah','Johnson','home_manager','07700900001',true,'active','1985-03-12')
       ON CONFLICT (email) DO UPDATE SET home_id=$2 RETURNING id`,
      [ORG_ID, homeId, mgHash]
    );
    managerId = mgRes.rows[0].id;
    await client.query(`INSERT INTO staff_onboarding (staff_id) VALUES ($1) ON CONFLICT DO NOTHING`, [managerId]);
    await client.query(`INSERT INTO staff_home_access (staff_id,home_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [managerId, homeId]);

    const seniorHash = await bcrypt.hash('Senior1234', 12);
    const seniorRes = await client.query(
      `INSERT INTO staff (organisation_id,home_id,email,password_hash,first_name,last_name,role,phone,is_active,status,date_of_birth)
       VALUES ($1,$2,'senior@healthark.co.uk',$3,'Michael','Okafor','senior_carer','07700900002',true,'active','1990-07-22')
       ON CONFLICT (email) DO UPDATE SET home_id=$2 RETURNING id`,
      [ORG_ID, homeId, seniorHash]
    );
    seniorId = seniorRes.rows[0].id;
    await client.query(`INSERT INTO staff_onboarding (staff_id) VALUES ($1) ON CONFLICT DO NOTHING`, [seniorId]);
    await client.query(`INSERT INTO staff_home_access (staff_id,home_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [seniorId, homeId]);

    const care1Hash = await bcrypt.hash('Care1234', 12);
    const care1Res = await client.query(
      `INSERT INTO staff (organisation_id,home_id,email,password_hash,first_name,last_name,role,phone,is_active,status,date_of_birth)
       VALUES ($1,$2,'care1@healthark.co.uk',$3,'Priya','Sharma','care_staff','07700900003',true,'active','1995-11-05')
       ON CONFLICT (email) DO UPDATE SET home_id=$2 RETURNING id`,
      [ORG_ID, homeId, care1Hash]
    );
    careId = care1Res.rows[0].id;
    await client.query(`INSERT INTO staff_onboarding (staff_id) VALUES ($1) ON CONFLICT DO NOTHING`, [careId]);
    await client.query(`INSERT INTO staff_home_access (staff_id,home_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [careId, homeId]);

    const care2Hash = await bcrypt.hash('Care1234', 12);
    const care2Res = await client.query(
      `INSERT INTO staff (organisation_id,home_id,email,password_hash,first_name,last_name,role,phone,is_active,status,date_of_birth)
       VALUES ($1,$2,'care2@healthark.co.uk',$3,'David','Mensah','care_staff','07700900004',true,'active','1992-05-18')
       ON CONFLICT (email) DO UPDATE SET home_id=$2 RETURNING id`,
      [ORG_ID, homeId, care2Hash]
    );
    care2Id = care2Res.rows[0].id;
    await client.query(`INSERT INTO staff_onboarding (staff_id) VALUES ($1) ON CONFLICT DO NOTHING`, [care2Id]);
    await client.query(`INSERT INTO staff_home_access (staff_id,home_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [care2Id, homeId]);

    // ── Service Users (Residents) ─────────────────────────────────
    const residents = [
      { first: 'Dorothy', last: 'Williams', dob: '1938-04-15', gender: 'female', nhs: 'NHS-001-DW', room: '1', diagnosis: 'Dementia, Type 2 Diabetes', allergies: 'Penicillin' },
      { first: 'Harold', last: 'Thompson', dob: '1934-09-03', gender: 'male', nhs: 'NHS-002-HT', room: '2', diagnosis: 'Parkinson\'s disease, Hypertension', allergies: 'Aspirin' },
      { first: 'Margaret', last: 'Clarke', dob: '1940-12-20', gender: 'female', nhs: 'NHS-003-MC', room: '3', diagnosis: 'COPD, Osteoarthritis', allergies: 'None known' },
      { first: 'Arthur', last: 'Davies', dob: '1936-06-08', gender: 'male', nhs: 'NHS-004-AD', room: '4', diagnosis: 'Vascular dementia, Heart failure', allergies: 'Sulfa drugs' },
      { first: 'Edna', last: 'Morrison', dob: '1942-02-28', gender: 'female', nhs: 'NHS-005-EM', room: '5', diagnosis: 'Stroke recovery, Depression', allergies: 'Latex' },
      { first: 'George', last: 'Bennett', dob: '1933-11-14', gender: 'male', nhs: 'NHS-006-GB', room: '6', diagnosis: 'Alzheimer\'s disease', allergies: 'None known' },
    ];

    const suIds: string[] = [];
    for (const r of residents) {
      const res = await client.query(
        `INSERT INTO service_users
           (home_id, first_name, last_name, date_of_birth, gender, nhs_number,
            room_number, primary_diagnosis, allergies, status, admission_date,
            fluid_target_ml, weight_kg)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'live',NOW()-INTERVAL '3 months',$10,$11)
         ON CONFLICT DO NOTHING RETURNING id`,
        [homeId, r.first, r.last, r.dob, r.gender, r.nhs,
         r.room, r.diagnosis, r.allergies, 1500, 65 + Math.random() * 30]
      );
      if (res.rows.length) suIds.push(res.rows[0].id);
    }

    if (!suIds.length) {
      // Already seeded — fetch existing
      const existing = await client.query(`SELECT id FROM service_users WHERE home_id=$1 LIMIT 6`, [homeId]);
      suIds.push(...existing.rows.map((r: any) => r.id));
    }

    // ── Care Plans ────────────────────────────────────────────────
    const planTypes = ['physical', 'medical', 'food_and_fluids', 'personal_hygiene', 'oral_care', 'communication'];
    for (const suId of suIds) {
      for (const pt of planTypes.slice(0, 3)) {
        await client.query(
          `INSERT INTO care_plans (home_id, su_id, plan_type, title, goals, interventions,
             created_by, next_review_date, is_active)
           VALUES ($1,$2,$3,$4,$5,$6,$7, NOW() + INTERVAL '30 days', true)
           ON CONFLICT DO NOTHING`,
          [homeId, suId, pt,
           `${pt.replace(/_/g,' ')} care plan`,
           'Maintain independence and dignity',
           'Assist with daily activities as needed',
           managerId]
        );
      }
      // One overdue plan per resident
      await client.query(
        `INSERT INTO care_plans (home_id, su_id, plan_type, title, goals, interventions,
           created_by, next_review_date, is_active)
         VALUES ($1,$2,'medical','Medical Review Plan','Monitor health conditions','Regular observations',$3, NOW()-INTERVAL '5 days', true)
         ON CONFLICT DO NOTHING`,
        [homeId, suId, managerId]
      );
    }

    // ── Daily Records (last 3 days) ───────────────────────────────
    const recordTypes = ['general', 'personal_care', 'food_drink', 'vitals', 'repositioning'];
    const staffIds = [careId, care2Id, seniorId];
    for (let day = 0; day < 3; day++) {
      for (const suId of suIds) {
        for (const rt of recordTypes) {
          const staffId = staffIds[Math.floor(Math.random() * staffIds.length)];
          await client.query(
            `INSERT INTO daily_records (home_id, su_id, staff_id, record_type, record_date, notes, created_at)
             VALUES ($1,$2,$3,$4, NOW()-INTERVAL '${day} days', $5, NOW()-INTERVAL '${day} days')
             ON CONFLICT DO NOTHING`,
            [homeId, suId, staffId, rt,
             `${rt.replace(/_/g,' ')} completed. Resident comfortable and cooperative.`]
          );
        }
      }
    }

    // ── Tasks ─────────────────────────────────────────────────────
    const tasks = [
      { title: 'Review Dorothy Williams care plan', priority: 'high', assigned: managerId },
      { title: 'Order incontinence pads - stock low', priority: 'medium', assigned: seniorId },
      { title: 'Book GP visit for Harold Thompson', priority: 'high', assigned: managerId },
      { title: 'Complete fire safety check', priority: 'medium', assigned: managerId },
      { title: 'Update staff rotas for next week', priority: 'low', assigned: managerId },
      { title: 'Chase laundry company invoice', priority: 'low', assigned: managerId },
    ];
    for (const t of tasks) {
      await client.query(
        `INSERT INTO tasks (home_id, title, priority, assigned_to, created_by, due_date, status)
         VALUES ($1,$2,$3,$4,$5, NOW()+INTERVAL '3 days','pending')
         ON CONFLICT DO NOTHING`,
        [homeId, t.title, t.priority, t.assigned, adminId]
      );
    }

    // ── Business Alerts ───────────────────────────────────────────
    await client.query(
      `INSERT INTO business_alerts (home_id, alert_type, severity, title, description)
       VALUES
         ($1,'care_plan_overdue','high','Care plan review overdue','4 residents have care plans due for review'),
         ($1,'medication_gap','high','MAR chart gap detected','Medication not recorded for Arthur Davies - 08:00 dose'),
         ($1,'task_missed','medium','Tasks pending','3 tasks are overdue and require attention'),
         ($1,'fluid_below_threshold','medium','Low fluid intake','Margaret Clarke fluid intake below daily target')
       ON CONFLICT DO NOTHING`,
      [homeId]
    );

    // ── Staff Leave Requests ──────────────────────────────────────
    await client.query(
      `INSERT INTO staff_leave (home_id, staff_id, leave_type, start_date, end_date, days_requested, reason, status)
       VALUES
         ($1,$2,'annual', NOW()+INTERVAL '14 days', NOW()+INTERVAL '21 days', 7, 'Family holiday', 'pending'),
         ($1,$3,'sick', NOW()-INTERVAL '1 day', NOW()+INTERVAL '2 days', 3, 'Flu', 'approved')
       ON CONFLICT DO NOTHING`,
      [homeId, careId, care2Id]
    );

    // ── Clock-in Events (today) ───────────────────────────────────
    for (const sid of [careId, care2Id, seniorId]) {
      await client.query(
        `INSERT INTO staff_clock_events (staff_id, home_id, event_type, event_time, geofence_passed, punctuality)
         VALUES ($1,$2,'clock_in', NOW()-INTERVAL '2 hours', true, 'on_time')
         ON CONFLICT DO NOTHING`,
        [sid, homeId]
      );
    }

    // ── MAR (medication records) ──────────────────────────────────
    if (suIds.length >= 2) {
      await client.query(
        `INSERT INTO mar_medications (home_id, su_id, medication_name, dosage, frequency, route, prescribed_by, start_date, is_active)
         VALUES
           ($1,$2,'Amlodipine 5mg','5mg','Once daily','oral','Dr. Patel', NOW()-INTERVAL '60 days', true),
           ($1,$2,'Metformin 500mg','500mg','Twice daily','oral','Dr. Patel', NOW()-INTERVAL '60 days', true),
           ($1,$3,'Levodopa 100mg','100mg','Three times daily','oral','Dr. Williams', NOW()-INTERVAL '90 days', true)
         ON CONFLICT DO NOTHING`,
        [homeId, suIds[0], suIds[1]]
      );
    }

    await client.query('COMMIT');

    logger.info('==============================================');
    logger.info('Demo data seeded successfully!');
    logger.info('');
    logger.info('LOGIN CREDENTIALS:');
    logger.info('  Admin:   admin@healthark.co.uk   / Admin1234');
    logger.info('  Manager: manager@healthark.co.uk / Manager1234');
    logger.info('  Senior:  senior@healthark.co.uk  / Senior1234');
    logger.info('  Staff:   care1@healthark.co.uk   / Care1234');
    logger.info('==============================================');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Demo seed failed', { err });
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seedDemo().catch(() => process.exit(1));
