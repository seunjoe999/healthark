// Seed script for Render production database — column-corrected
const { Pool } = require('./backend/node_modules/pg');

const pool = new Pool({
  connectionString: 'postgresql://healthark_user:yplXYLHUaPksCpMi57e6PebPK0Yi6laF@dpg-d88dabjbc2fs73eqf960-a.oregon-postgres.render.com/healthark',
  ssl: { rejectUnauthorized: false },
});

const HOME = '5c027814-a0f9-44f3-bad4-138e4783fd51';

async function q(sql, params) {
  try {
    return await pool.query(sql, params);
  } catch(e) {
    console.warn('  SKIP:', e.message.split('\n')[0].slice(0, 120));
    return null;
  }
}

function daysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0,10);
}
function daysAhead(n) {
  const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0,10);
}
function tsAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString();
}

async function main() {
  console.log('Connecting to Render production database...');
  const staffRes = await pool.query("SELECT id, first_name, last_name FROM staff WHERE home_id=$1 ORDER BY created_at LIMIT 10", [HOME]);
  const suRes    = await pool.query("SELECT id, first_name, last_name FROM service_users WHERE home_id=$1 ORDER BY created_at LIMIT 10", [HOME]);
  const staff = staffRes.rows;
  const sus   = suRes.rows;

  if (!staff.length) { console.error('No staff found!'); return pool.end(); }
  if (!sus.length)   { console.error('No service users found!'); return pool.end(); }
  console.log(`Found ${staff.length} staff, ${sus.length} service users\n`);

  const s0 = staff[0].id, s1 = (staff[1]||staff[0]).id, s2 = (staff[2]||staff[0]).id,
        s3 = (staff[3]||staff[0]).id, s4 = (staff[4]||staff[0]).id;
  const su0 = sus[0].id, su1 = (sus[1]||sus[0]).id, su2 = (sus[2]||sus[0]).id,
        su3 = (sus[3]||sus[0]).id, su4 = (sus[4]||sus[0]).id;

  // ── Staff Messages (Inbox) ──────────────────────────────────────────
  console.log('📬 Inbox messages...');
  const messages = [
    [s1, s0, 'Staff Rota Update', 'Please review the updated rota for next week. There are some gaps on Friday night shift that need urgent cover.'],
    [s2, s1, 'Medication Review Reminder', `${sus[0].first_name} ${sus[0].last_name} is due a quarterly medication review. Can you arrange this with the GP this week?`],
    [s0, s1, 'New CQC Guidance', 'CQC has released updated guidance on medication management. Please review and update our protocols by end of month.'],
    [s3, s2, 'Incident Report Filed', 'I have submitted an incident report for the fall this morning. Please review and countersign at your earliest convenience.'],
    [s1, s2, 'Training Certificate Expiring', 'Your Moving & Handling certificate expires next month. Please book a refresher course — see the training calendar.'],
    [s4, s0, 'PPE Supplies Running Low', 'We are running low on disposable gloves (medium). Please order more urgently — less than one week\'s supply remaining.'],
    [s0, s3, 'Welcome to the Team!', 'Welcome aboard! Please complete your induction checklist and shadow a senior carer this week before working independently.'],
    [s2, s4, 'Supervision Due', 'Your 3-month supervision is due next week. Please confirm you are available Tuesday at 2pm.'],
    [s1, s3, 'Resident Hospital Appointment', `${sus[1]?.first_name} has a hospital outpatient appointment on Thursday at 10am. Please ensure transport is arranged.`],
    [s3, s1, 'Night Shift Handover Notes', `Night shift was quiet overall. ${sus[2]?.first_name} had a restless night and required repositioning at 3am. Blood pressure slightly elevated — please monitor today.`],
    [s0, s2, 'CQC Inspection Preparation', 'Our CQC inspection is coming up next month. Please review the evidence folder and flag any gaps so we can address them promptly.'],
    [s2, s0, 'Safeguarding Discussion Needed', 'I would like to discuss a safeguarding matter privately. Please can we speak before the end of shift today?'],
  ];
  for (const [sender, recipient, subject, body] of messages) {
    await q(
      `INSERT INTO staff_messages (id, home_id, sender_id, recipient_id, subject, body, is_read, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, false, NOW() - (random()*14 || ' days')::interval)`,
      [HOME, sender, recipient, subject, body]
    );
  }

  // ── Business Alerts ─────────────────────────────────────────────────
  console.log('🔔 Business alerts...');
  const alerts = [
    ['medication', 'high', 'Missed Medication Dose', `${sus[3]?.first_name} missed their evening Warfarin dose. GP has been notified per protocol.`, su3],
    ['incident', 'critical', 'Fall Incident Reported', `${sus[1]?.first_name} had a fall in the bathroom at 07:30. No serious injury — being monitored. Family notified.`, su1],
    ['staffing', 'medium', 'Shift Uncovered', 'Sunday night shift (11pm–7am) is currently unassigned. Please arrange cover by Friday.', null],
    ['compliance', 'high', 'CQC Inspection Due Next Month', 'Routine CQC inspection scheduled. Evidence files and action plans must be ready by end of month.', null],
    ['medication', 'medium', 'PRN Medication Administered', `Paracetamol PRN given to ${sus[4]?.first_name} at 14:15 for reported headache. Monitoring ongoing.`, su4],
    ['maintenance', 'low', 'Boiler Service Overdue', 'Annual boiler service is overdue by 3 weeks. Contact contractor urgently — legal requirement.', null],
    ['review', 'medium', 'Care Plan Review Due', `${sus[0]?.first_name}'s care plan is due for quarterly review this week.`, su0],
    ['staffing', 'low', 'Late Clock-In', `${staff[3]?.first_name} ${staff[3]?.last_name} clocked in 18 minutes late for the morning shift.`, null],
    ['incident', 'medium', 'Skin Integrity Concern', `Grade 1 pressure mark noted on ${sus[2]?.first_name}'s heel during personal care. Repositioning plan updated.`, su2],
    ['compliance', 'medium', 'DBS Check Expiring Soon', `${staff[2]?.first_name} ${staff[2]?.last_name}'s DBS certificate expires in 18 days. Renewal urgently needed.`, null],
  ];
  for (const [type, severity, title, description, suId] of alerts) {
    await q(
      `INSERT INTO business_alerts (id, home_id, created_by, alert_type, severity, title, description, is_resolved, created_at, su_id)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, false, NOW() - (random()*10 || ' days')::interval, $7)`,
      [HOME, s0, type, severity, title, description, suId]
    );
  }

  // ── Care Plans ──────────────────────────────────────────────────────
  console.log('📋 Care plans...');
  const planTypes = [
    ['personal_care', 'Personal Care & Hygiene', 'Ensure dignity, comfort and optimal hygiene at all times.', 'Can express preferences and indicate discomfort verbally or by gesture.', 'Staff to assist with all personal care following the agreed person-centred plan. Always knock, introduce yourself, and gain consent before commencing.'],
    ['mobility', 'Mobility & Moving', 'Support safe and comfortable movement to maximise independence and prevent falls.', 'Can weight-bear with support and indicate when ready to move.', 'Use assessed equipment at all times. Two-person assist for transfers as assessed. Document any falls immediately.'],
    ['nutrition', 'Nutrition & Hydration', 'Ensure adequate nutrition and hydration to support overall health.', 'Can self-feed with prompting and adapted cutlery.', 'Offer preferred foods and fluids. Monitor and record all intake. Ensure minimum 1500ml fluid per day.'],
  ];
  for (const su of sus) {
    for (const [planType, customName, aims, whatICan, howToSupport] of planTypes) {
      await q(
        `INSERT INTO care_plans (id, su_id, home_id, created_by, plan_type, custom_name, aims_outcomes, what_i_can_do, how_to_support, current_status, notes, review_frequency, last_review_date, next_review_date, is_active, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, 'active', 'Monitor and update at each review. Escalate any significant changes immediately.', 'quarterly', $9, $10, true, NOW() - (random()*60 || ' days')::interval)`,
        [su.id, HOME, s1, planType, customName, aims, whatICan, howToSupport, daysAgo(30), daysAhead(60)]
      );
    }
  }

  // ── Medications ─────────────────────────────────────────────────────
  console.log('💊 Medications...');
  const medList = [
    ['Amlodipine', '5mg', 'Once daily in morning', 'Oral', 'Dr. Patel'],
    ['Warfarin', '3mg', 'Once daily at 6pm', 'Oral', 'Dr. Patel'],
    ['Metformin', '500mg', 'Twice daily with meals', 'Oral', 'Dr. Singh'],
    ['Paracetamol', '1g', 'Up to 4 times daily when required', 'Oral', 'Dr. Patel'],
    ['Omeprazole', '20mg', 'Once daily before breakfast', 'Oral', 'Dr. Singh'],
    ['Aspirin', '75mg', 'Once daily with food', 'Oral', 'Dr. Patel'],
    ['Donepezil', '5mg', 'Once daily at bedtime', 'Oral', 'Dr. Williams'],
    ['Sertraline', '50mg', 'Once daily in morning', 'Oral', 'Dr. Williams'],
    ['Furosemide', '40mg', 'Once daily in morning', 'Oral', 'Dr. Patel'],
    ['Lisinopril', '10mg', 'Once daily', 'Oral', 'Dr. Singh'],
  ];
  const insertedMeds = [];
  for (let i = 0; i < sus.length; i++) {
    const su = sus[i];
    for (let j = 0; j < 3; j++) {
      const [name, dose, freq, route, prescriber] = medList[(i * 2 + j) % medList.length];
      const res = await pool.query(
        `INSERT INTO su_medications (id, su_id, home_id, medication_name, dose, frequency, route, prescribed_by, start_date, is_prn, added_by, is_active, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, false, $9, true, NOW()) RETURNING id, medication_name, dose, frequency, route`,
        [su.id, HOME, name, dose, freq, route, prescriber, daysAgo(90), s1]
      ).catch(e => { console.warn('  SKIP med:', e.message.split('\n')[0].slice(0,80)); return null; });
      if (res?.rows[0]) insertedMeds.push({ ...res.rows[0], su_id: su.id });
    }
  }

  // ── MAR Records ─────────────────────────────────────────────────────
  console.log('📅 MAR records (14 days)...');
  for (const med of insertedMeds.slice(0, 15)) {
    for (let day = 0; day < 14; day++) {
      const given = Math.random() > 0.08;
      await q(
        `INSERT INTO mar_records (id, su_id, home_id, medication_id, medication_name, dose, route, frequency, scheduled_time, record_date, given, given_at, given_by, witnessed_by, refused, omitted, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, '08:00', $8, $9, $10, $11, $12, false, false, NOW())`,
        [med.su_id, HOME, med.id, med.medication_name, med.dose, med.route, med.frequency,
         daysAgo(day), given, given ? `${daysAgo(day)} 08:05` : null, given ? s2 : null, given ? s3 : null]
      );
    }
  }

  // ── Daily Records ────────────────────────────────────────────────────
  console.log('📝 Daily records (14 days)...');
  for (const su of sus) {
    for (let day = 0; day < 14; day++) {
      await q(
        `INSERT INTO daily_records (id, su_id, home_id, staff_id, record_type, shift, notes, amount_ml, fluid_type, record_date, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, 'fluid', 'morning', $4, $5, 'Water', $6, NOW())`,
        [su.id, HOME, s2, `${su.first_name} drinking well. Offered fluid every 2 hours as per care plan.`, 200 + Math.floor(Math.random()*300), daysAgo(day)]
      );
      await q(
        `INSERT INTO daily_records (id, su_id, home_id, staff_id, record_type, shift, notes, meal_type, amount_eaten, food_description, record_date, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, 'food', 'morning', $4, 'breakfast', $5, 'Porridge with honey, toast and marmalade, cup of tea', $6, NOW())`,
        [su.id, HOME, s2, `${su.first_name} had good appetite at breakfast.`, ['all','three_quarters','half','quarter'][day % 4], daysAgo(day)]
      );
      await q(
        `INSERT INTO daily_records (id, su_id, home_id, staff_id, record_type, shift, systolic, diastolic, pulse, record_date, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, 'blood_pressure', 'morning', $4, $5, $6, $7, NOW())`,
        [su.id, HOME, s2, 118 + Math.floor(Math.random()*24), 74 + Math.floor(Math.random()*16), 66 + Math.floor(Math.random()*22), daysAgo(day)]
      );
      if (day % 3 === 0) {
        await q(
          `INSERT INTO daily_records (id, su_id, home_id, staff_id, record_type, shift, notes, record_date, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, 'notes', 'morning', $4, $5, NOW())`,
          [su.id, HOME, s2, `${su.first_name} is settled and comfortable. Participated in morning activities. No concerns to report. Care plan reviewed and followed throughout shift.`, daysAgo(day)]
        );
      }
    }
  }

  // ── Bath Charts ──────────────────────────────────────────────────────
  console.log('🛁 Bath charts...');
  const bathTypes = ['bath', 'shower', 'bed_bath', 'strip_wash'];
  const assistanceLevels = ['full', 'moderate', 'minimal', 'prompting'];
  for (const su of sus) {
    for (let i = 0; i < 6; i++) {
      await q(
        `INSERT INTO bath_charts (id, su_id, home_id, bath_date, bath_time, bath_type, assistance_level, hair_washed, nails_cut, shaved, skin_condition, notes, given_by, witnessed_by, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, '09:30', $4, $5, $6, $7, false, 'good', $8, $9, $10, NOW())`,
        [su.id, HOME, daysAgo(i * 3),
         bathTypes[i % bathTypes.length], assistanceLevels[i % assistanceLevels.length],
         i % 2 === 0, i % 4 === 0,
         `${su.first_name} was cooperative and comfortable. Skin in good condition — no redness or pressure marks noted.`,
         s2, s3]
      );
    }
  }

  // ── Reviews ──────────────────────────────────────────────────────────
  console.log('📊 Reviews...');
  const reviewTypes = ['quarterly', 'annual', 'care_plan', 'health'];
  for (let i = 0; i < sus.length; i++) {
    const su = sus[i];
    await q(
      `INSERT INTO su_reviews (id, su_id, home_id, created_by, review_type, review_date, summary, resident_feedback, family_feedback, outcomes, actions, next_review_date, attendees, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
      [su.id, HOME, s1, reviewTypes[i % reviewTypes.length], daysAgo(14 + i * 10),
        `Quarterly review for ${su.first_name} ${su.last_name}. Overall wellbeing is stable. All care plan goals are being met. No significant changes to care needs identified. Resident appears happy and settled.`,
        `${su.first_name} expressed happiness with the care received. Particularly enjoys the social activities and mealtimes.`,
        `Family expressed satisfaction with care quality and communication. Noted ${su.first_name} appears more settled and is eating and sleeping well.`,
        'All care plan outcomes are being achieved. Resident is settled, comfortable, and maintaining current independence.',
        'Continue current care plan. Review medication with GP at next appointment. Physiotherapy sessions to increase to twice weekly.',
        daysAhead(76 - i * 5),
        JSON.stringify([{name:`${su.first_name} ${su.last_name}`,role:'Resident'},{name:staff[1]?.first_name+' '+staff[1]?.last_name,role:'Home Manager'},{name:'Family Member',role:'Next of Kin'}])
      ]
    );
  }

  // ── Assessments ──────────────────────────────────────────────────────
  console.log('📋 Assessments...');
  for (const su of sus) {
    for (const [key, cat] of [['falls_risk','Risk'],['pressure_ulcer','Risk'],['nutritional','Health']]) {
      await q(
        `INSERT INTO assessments (id, home_id, template_key, category, subject_id, subject_name, conducted_by, answers, total_score, max_score, score_pct, risk_level, actions_identified, next_review_date, assessment_date, status, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, 25, $9, $10, $11, $12, $13, 'completed', NOW())`,
        [HOME, key, cat, su.id, `${su.first_name} ${su.last_name}`, s1,
          JSON.stringify({q1:'Yes',q2:'No',q3:'Sometimes',q4:'Yes',q5:'No'}),
          Math.floor(Math.random()*15)+5,
          Math.floor(Math.random()*60)+20,
          ['low','medium','high'][Math.floor(Math.random()*3)],
          'Implement preventive measures as identified. Review at next care plan meeting. Escalate immediately if status changes.',
          daysAhead(84), daysAgo(7 + sus.indexOf(su) * 5)
        ]
      );
    }
  }

  // ── Quality Records ──────────────────────────────────────────────────
  console.log('✅ Quality / QA records...');
  const qualityItems = [
    ['complaint', 'medium', 'Complaint — Food Temperature', 'Family raised concern that meals were being served cold at lunchtime.', 'Catering timings adjusted. Additional staff allocated at mealtimes. Family written to with outcome.'],
    ['compliment', 'low', 'Exceptional Care Recognised', `Family of ${sus[0]?.first_name} wrote to formally thank the team for outstanding compassionate care.`, 'Letter shared with all staff at team meeting. Individual staff members recognised.'],
    ['incident', 'high', 'Near Miss — Medication Administration', 'Wrong medication nearly administered. Error caught at the double-check stage before administration.', 'Full root cause analysis completed. Medication storage reorganised. Protocol updated.'],
    ['safeguarding', 'critical', 'Safeguarding Referral Made', 'Unexplained bruising noted during personal care. Resident unable to explain injury.', 'Local authority safeguarding team notified within 24 hours. Investigation underway.'],
    ['audit', 'medium', 'Monthly Infection Control Audit', 'Two minor areas for improvement identified — PPE storage and hand hygiene signage.', 'PPE storage cupboard reorganised. New hand hygiene posters installed throughout.'],
    ['complaint', 'low', 'Communication Concern Raised', 'Family felt they were not updated promptly following a minor fall incident.', 'Staff reminded of family communication protocol. Policy updated: family notified within 1 hour.'],
  ];
  for (const [type, severity, title, desc, outcome] of qualityItems) {
    // Try qa_records first, then quality_records
    const res = await q(
      `INSERT INTO qa_records (id, home_id, created_by, record_type, title, description, outcome, status, severity, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'open', $7, NOW() - (random()*21 || ' days')::interval)`,
      [HOME, s1, type, title, desc, outcome, severity]
    );
    if (!res) {
      await q(
        `INSERT INTO quality_records (id, home_id, created_by, record_type, title, description, outcome, status, severity, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'open', $7, NOW() - (random()*21 || ' days')::interval)`,
        [HOME, s1, type, title, desc, outcome, severity]
      );
    }
  }

  // ── DBS Records ──────────────────────────────────────────────────────
  console.log('🔑 DBS records...');
  for (let i = 0; i < staff.length; i++) {
    const s = staff[i];
    const isExpiring = i === 2;
    await q(
      `INSERT INTO staff_dbs (id, staff_id, home_id, dbs_number, dbs_type, issue_date, expiry_date, update_service, status, created_by, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, 'enhanced', $4, $5, true, $6, $7, NOW())`,
      [s.id, HOME, `DBS${100000 + i * 13579}`,
        daysAgo(365 * 2 + i * 45),
        isExpiring ? daysAhead(18) : daysAhead(300 - i * 40),
        isExpiring ? 'expiring_soon' : 'valid', s0]
    );
  }

  // ── Training Records ──────────────────────────────────────────────────
  console.log('🎓 Training records...');
  const courses = [
    ['Moving & Handling — Practical', 6, 365],
    ['Safeguarding Adults', 4, 365],
    ['Fire Safety Awareness', 2, 365],
    ['First Aid at Work', 18, 1095],
    ['Mental Capacity Act & DoLS', 3, 730],
    ['Infection Prevention & Control', 3, 365],
    ['Safe Medication Administration', 6, 730],
    ['Dementia Awareness & Care', 4, 730],
    ['Food Hygiene (Level 2)', 6, 1095],
    ['Lone Working Safety', 2, 365],
    ['Equality & Diversity', 2, 730],
    ['Record Keeping & Documentation', 2, 365],
  ];
  for (const s of staff) {
    for (const [course, hours, validDays] of courses) {
      const daysCompleted = Math.floor(Math.random() * 300);
      const completed = daysAgo(daysCompleted);
      const expiryDate = new Date(); expiryDate.setDate(expiryDate.getDate() - daysCompleted + validDays);
      await q(
        `INSERT INTO staff_training (id, staff_id, home_id, course_name, completed_date, expiry_date, provider, duration_hours, created_by, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'Skills for Care', $6, $7, NOW())`,
        [s.id, HOME, course, completed, expiryDate.toISOString().slice(0,10), hours, s0]
      );
    }
  }

  // ── Rota Shifts ───────────────────────────────────────────────────────
  console.log('📆 Rota shifts...');
  const patterns = [['07:00','14:00','morning'],['14:00','22:00','afternoon'],['22:00','07:00','night']];
  for (let day = -7; day <= 21; day++) {
    const d = new Date(); d.setDate(d.getDate() + day);
    const date = d.toISOString().slice(0,10);
    for (let i = 0; i < patterns.length; i++) {
      const [start, end, type] = patterns[i];
      await q(
        `INSERT INTO staff_shifts (id, home_id, staff_id, shift_date, start_time, end_time, shift_type, created_by, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW())`,
        [HOME, staff[i % staff.length].id, date, start, end, type, s0]
      );
    }
  }

  // ── Staff Leave ────────────────────────────────────────────────────────
  console.log('🏖️ Staff leave...');
  const leaveItems = [
    [s1, 'annual', daysAhead(14), daysAhead(19), 'approved', 'Family holiday booked.'],
    [s2, 'sick', daysAgo(5), daysAgo(3), 'approved', 'Flu — GP fit note provided. Returned fit for duty.'],
    [s3, 'annual', daysAhead(30), daysAhead(34), 'pending', 'Annual leave request awaiting approval.'],
    [s4, 'training', daysAhead(7), daysAhead(7), 'approved', 'Attending mandatory safeguarding refresher training.'],
    [s1, 'compassionate', daysAgo(20), daysAgo(18), 'approved', 'Family bereavement.'],
    [s2, 'annual', daysAhead(45), daysAhead(49), 'pending', 'Holiday request submitted.'],
  ];
  for (const [staffId, type, start, end, status, reason] of leaveItems) {
    await q(
      `INSERT INTO staff_leave (id, staff_id, home_id, leave_type, start_date, end_date, hours_requested, status, reason, approved_by, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 37.5, $6, $7, $8, NOW())`,
      [staffId, HOME, type, start, end, status, reason, s0]
    );
  }

  // ── Policies ──────────────────────────────────────────────────────────
  console.log('📄 Policies...');
  const policyList = [
    ['Safeguarding Adults Policy', '3.2', daysAgo(60), daysAhead(305)],
    ['Medication Management Policy', '4.1', daysAgo(30), daysAhead(335)],
    ['Infection Prevention & Control Policy', '2.5', daysAgo(90), daysAhead(275)],
    ['Health & Safety Policy', '5.0', daysAgo(120), daysAhead(245)],
    ['Fire Safety & Evacuation Policy', '2.1', daysAgo(180), daysAhead(185)],
    ['Moving & Handling Policy', '3.0', daysAgo(45), daysAhead(320)],
    ['Complaints & Compliments Policy', '1.8', daysAgo(200), daysAhead(165)],
    ['Lone Working Policy', '2.3', daysAgo(75), daysAhead(290)],
    ['Whistleblowing Policy', '1.5', daysAgo(150), daysAhead(215)],
    ['Equality & Diversity Policy', '2.0', daysAgo(100), daysAhead(265)],
  ];
  for (const [title, version, effective, review] of policyList) {
    await q(
      `INSERT INTO policies (id, home_id, title, version, effective_date, review_date, uploaded_by, requires_sign, is_active, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, true, NOW())`,
      [HOME, title, version, effective, review, s0]
    );
  }

  // ── Risk Assessments ──────────────────────────────────────────────────
  console.log('⚠️  Risk assessments...');
  const riskItems = [
    ['falls', 'medium', 'Falls Risk Assessment', 'Increased risk of falls due to reduced mobility, balance issues and certain medications.', 'Non-slip flooring checked. Grab rails fitted. Regular 2-hourly mobility checks. Non-slip footwear worn.'],
    ['pressure_ulcer', 'low', 'Pressure Ulcer Prevention', 'Low-medium risk of pressure damage due to periods of reduced mobility.', 'Repositioning every 2 hours when in bed. Pressure-relieving mattress in use. Skin inspected daily.'],
    ['choking', 'high', 'Choking & Dysphagia Risk', 'SALT-assessed as requiring modified texture diet (IDDSI Level 5 — minced and moist).', 'IDDSI Level 5 diet strictly followed. All fluids thickened. Staff trained in Heimlich manoeuvre.'],
    ['wandering', 'medium', 'Wandering & Elopement Risk', 'History of leaving the building unsupervised during periods of confusion.', 'Wander alert system active. All exits monitored with door sensor alarms. Daily orientation check.'],
    ['medication_error', 'medium', 'Medication Administration Risk', 'Complex medication regime — increased risk of administration error.', 'Blister packs used. Double-check required for all administration. Pharmacist review every 3 months.'],
  ];
  for (let i = 0; i < sus.length; i++) {
    const su = sus[i];
    const risk = riskItems[i % riskItems.length];
    await q(
      `INSERT INTO risk_assessments (id, su_id, home_id, created_by, risk_type, description, likelihood, impact, risk_score, controls, review_date, is_active, assessment_name, risk_level, management_plan, next_review_date, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 3, 4, 12, $6, $7, true, $8, $9, $10, $11, NOW())`,
      [su.id, HOME, s1, risk[0], risk[3], risk[4], daysAhead(90), risk[2], risk[1], risk[4], daysAhead(90)]
    );
  }

  // ── Calendar Events ────────────────────────────────────────────────────
  console.log('📅 Calendar events...');
  const events = [
    [`GP Visit — ${sus[0]?.first_name}`, 'medical', daysAhead(3), '10:00', '11:00', su0, 'GP Surgery Room 2'],
    ['Staff Team Meeting', 'meeting', daysAhead(5), '14:00', '15:30', null, 'Main Office'],
    ['Physiotherapy Session', 'therapy', daysAhead(2), '11:00', '12:00', su1, 'Therapy Room'],
    ['Fire Evacuation Drill', 'training', daysAhead(7), '10:00', '10:45', null, 'Whole Building'],
    [`Family Visit — ${sus[2]?.first_name}`, 'visit', daysAhead(1), '14:00', '16:00', su2, 'Main Lounge'],
    ['Mobile Hairdresser', 'activity', daysAhead(4), '10:00', '12:00', null, 'Lounge'],
    ['Evening Quiz Night', 'activity', daysAhead(6), '18:30', '20:00', null, 'Dining Room'],
    ['CQC Inspection Preparation Meeting', 'meeting', daysAhead(10), '09:00', '10:30', null, 'Office'],
    ['Chiropodist Visit', 'medical', daysAhead(9), '10:00', '12:00', null, 'Therapy Room'],
    ['Monthly Relatives Meeting', 'meeting', daysAhead(14), '15:00', '16:30', null, 'Main Lounge'],
  ];
  for (const [title, type, date, start, end, suId, location] of events) {
    await q(
      `INSERT INTO calendar_events (id, home_id, created_by, title, event_type, event_date, start_time, end_time, location, su_id, all_staff, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [HOME, s0, title, type, date, start, end, location, suId, type === 'training' || type === 'meeting']
    );
  }

  // ── Notifications ──────────────────────────────────────────────────────
  console.log('🔔 Notifications...');
  const notifs = [
    [s0, "Care Plan Review Due", `${sus[0]?.first_name}'s care plan review is due in 3 days.`, 'reminder', '/care-plans'],
    [s1, 'DBS Expiring Soon', `${staff[2]?.first_name}'s DBS certificate expires in 18 days. Action required.`, 'alert', '/dbs'],
    [s1, 'New Incident Report', 'A new incident report has been submitted and requires your countersignature.', 'info', '/incidents'],
    [s0, 'Unassigned Shift', 'Sunday night shift (22:00–07:00) is unassigned. Cover must be arranged.', 'warning', '/rota'],
    [s2, 'Training Certificate Expiring', 'Your Moving & Handling certificate expires in 30 days. Book refresher training.', 'reminder', '/training'],
    [s0, `New Message from ${staff[1]?.first_name}`, 'You have an unread message regarding staffing arrangements.', 'info', '/messages'],
    [s1, 'Quality Record Added', 'A new complaint record has been logged and requires your review within 24 hours.', 'warning', '/quality'],
    [s2, 'Supervision Due', 'Your quarterly supervision is due next week. Please confirm your availability.', 'reminder', '/staff'],
  ];
  for (const [recipient, title, body, type, link] of notifs) {
    await q(
      `INSERT INTO notifications (id, recipient_id, home_id, title, body, type, link, is_read, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, false, NOW() - (random()*5 || ' days')::interval)`,
      [recipient, HOME, title, body, type, link]
    );
  }

  // ── Supervisions ────────────────────────────────────────────────────────
  console.log('👥 Supervisions...');
  for (let i = 0; i < staff.length; i++) {
    const s = staff[i];
    await q(
      `INSERT INTO staff_supervisions (id, staff_id, home_id, conducted_by, supervision_type, supervision_date, summary, action_points, next_supervision_date, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, 'quarterly', $4, $5, $6, $7, NOW())`,
      [s.id, HOME, s1, daysAgo(35 + i * 12),
        `Quarterly supervision for ${s.first_name} ${s.last_name}. Staff member is performing well and demonstrates a caring, person-centred approach. Good relationships with residents and colleagues noted. No performance concerns.`,
        JSON.stringify(['Complete mandatory fire safety refresher by end of month','Shadow senior carer for complex wound care procedures','Review and sign updated medication administration policy']),
        daysAhead(55 + i * 12)
      ]
    );
  }

  // ── Resident Diary ──────────────────────────────────────────────────────
  console.log('📖 Resident diary...');
  const activities = ['painting class', 'chair yoga session', 'afternoon music therapy', 'reminiscence group', 'garden walk', 'bingo', 'quiz afternoon', 'cooking activity'];
  const moods = ['happy', 'content', 'settled', 'cheerful'];
  for (const su of sus) {
    for (let day = 0; day < 14; day++) {
      if (day % 2 === 0) {
        const activity = activities[day % activities.length];
        await q(
          `INSERT INTO resident_diary (id, home_id, su_id, recorded_by, diary_date, mood, activities, food_appetite, fluid_intake, sleep_quality, personal_care_done, notes, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'good', 'good', 'good', true, $7, NOW())`,
          [HOME, su.id, s2, daysAgo(day),
            moods[day % moods.length],
            activity,
            `${su.first_name} enjoyed the ${activity} today and appeared happy and engaged. Good mood throughout the day. Interacted well with other residents and staff. No concerns noted.`
          ]
        );
      }
    }
  }

  // ── Noticeboard ─────────────────────────────────────────────────────────
  console.log('📌 Noticeboard...');
  const notices = [
    ['urgent', 'URGENT: Night Shift Cover Needed This Sunday', 'We urgently need someone to cover the night shift (10pm–6am) this Sunday. Please speak to the manager immediately if you can help. Overtime rate will apply.', true],
    ['policy', 'Updated Medication Policy — Please Read & Sign', 'The Medication Administration Policy has been updated (version 4.1). All staff must read and sign the updated policy by Friday. Copies available in the office.', true],
    ['training', 'Mandatory Fire Safety Training — Next Tuesday', 'Mandatory fire safety refresher training takes place next Tuesday at 10am. Attendance is compulsory for all care staff. Please arrange your shifts accordingly.', false],
    ['celebration', 'Staff Appreciation — Thank You All!', 'A huge thank you to everyone for the incredible dedication shown during inspection preparation. You should all be very proud. The inspector commented very positively on our records and the quality of care.', false],
    ['general', 'Reminder: Car Park Arrangements', 'The top car park spaces are reserved for visitors and residents\' families. Staff should use the lower car park. Thank you for your cooperation.', false],
    ['reminder', 'Supervision Schedule — Please Confirm Availability', 'Quarterly supervisions are being scheduled for all staff this month. Please check the supervision board in the office and confirm your preferred time slot with the manager by Wednesday.', false],
  ];
  for (const [category, title, body, pinned] of notices) {
    await q(
      `INSERT INTO noticeboard (id, home_id, created_by, title, body, category, is_pinned, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW() - (random()*14 || ' days')::interval)`,
      [HOME, s1, title, body, category, pinned]
    );
  }

  // ── Maintenance Logs ────────────────────────────────────────────────────
  console.log('🔧 Maintenance...');
  const maintenanceItems = [
    ['Boiler Annual Service Overdue', 'plumbing', 'urgent', 'The annual gas boiler service certificate has lapsed. Engineer must be contacted immediately.'],
    ['Bedroom 4 — Light Fitting Flickering', 'electrical', 'normal', 'Ceiling light fitting in bedroom 4 has been flickering intermittently for 3 days.'],
    ['Fire Door — Slow Closing Mechanism', 'general', 'urgent', 'Fire door on the first floor corridor is not closing fully — fire safety hazard.'],
    ['Garden — Loose Paving Slab', 'general', 'normal', 'A paving slab in the garden area has become loose and presents a trip hazard.'],
    ['Bathroom — Grab Rail Loose', 'plumbing', 'urgent', 'The grab rail next to the assisted bath has become loose and is unsafe. Bathroom out of use until repaired.'],
    ['Kitchen — Dishwasher Fault', 'general', 'normal', 'Commercial dishwasher showing an error code and not completing full cycles.'],
  ];
  for (const [title, category, priority, description] of maintenanceItems) {
    await q(
      `INSERT INTO maintenance_logs (id, home_id, title, description, category, priority, status, reported_by, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'open', $6, NOW() - (random()*21 || ' days')::interval)`,
      [HOME, title, description, category, priority, s3]
    );
  }

  // ── Bowel Charts ────────────────────────────────────────────────────────
  console.log('💧 Bowel charts...');
  for (const su of sus) {
    for (let day = 0; day < 14; day++) {
      if (Math.random() > 0.3) {
        await q(
          `INSERT INTO bowel_charts (id, home_id, su_id, recorded_by, bristol_type, recorded_at, amount, colour, notes, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
          [HOME, su.id, s2,
            Math.floor(Math.random() * 5) + 2,
            `${daysAgo(day)} 09:00`,
            ['small', 'medium', 'large'][Math.floor(Math.random() * 3)],
            ['brown', 'dark brown', 'light brown'][Math.floor(Math.random() * 3)],
            'No concerns noted. Normal for this resident.'
          ]
        );
      }
    }
  }

  // ── Seizure Logs ─────────────────────────────────────────────────────────
  console.log('⚡ Seizure log...');
  const seizures = [
    [su0, 8, '14:22:00', 180, 'tonic_clonic', 'Resident was seated in the lounge when seizure commenced. Eyes rolled back, jerking movements of all four limbs.', 'Positioned safely on floor with head supported. Recovery position adopted post-ictal. GP notified within 10 minutes. Family called.'],
    [su1, 21, '09:15:00', 60, 'absence', 'Brief absence seizure — resident stared blankly and was unresponsive to voice for approximately 60 seconds.', 'Sat with resident throughout. Monitored and documented. GP notified. Medication reviewed.'],
    [su0, 35, '22:45:00', 300, 'tonic_clonic', 'Seizure noted during routine night check. Resident was in bed.', 'Full post-seizure protocol followed. Neurologist referral requested. Rescue medication prescribed by GP.'],
  ];
  for (const [suId, daysBack, time, durationSecs, type, desc, actions] of seizures) {
    const seizureAt = `${daysAgo(daysBack)} ${time}`;
    await q(
      `INSERT INTO seizure_logs (id, home_id, su_id, recorded_by, seizure_at, seizure_type, duration_seconds, description, action_taken, notified_gp, notified_family, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, true, true, NOW())`,
      [HOME, suId, s2, seizureAt, type, durationSecs, desc, actions]
    );
  }

  // ── Professional Visits ───────────────────────────────────────────────────
  console.log('🩺 Professional visits...');
  const pvItems = [
    [su0, 'GP', 'Dr. A. Patel', daysAgo(7), 'Routine medication review. Warfarin dose adjusted from 3mg to 2.5mg. INR test requested.', daysAhead(21), false],
    [su1, 'Physiotherapist', 'Sarah Mitchell (CSP)', daysAgo(3), 'Assessed mobility and balance. Recommended new exercise programme to strengthen lower limbs.', daysAhead(11), false],
    [su2, 'District Nurse', 'Nurse K. Osei', daysAgo(1), 'Wound assessment and dressing change. Wound showing good signs of healing.', daysAhead(3), false],
    [su3, 'Optician', 'Mr. R. Shah (Specsavers)', daysAgo(14), 'Full sight test completed. New prescription issued. Glasses ordered — 10 days for collection.', null, true],
    [su4, 'Dentist', 'Dr. L. Wong (NHS Dentistry)', daysAhead(5), 'Routine dental check-up scheduled.', null, false],
    [su0, 'Occupational Therapist', 'J. Davies (OT)', daysAgo(10), 'Review of equipment needs. Recommended new shower chair. Referral submitted for riser-recliner chair.', daysAhead(30), false],
  ];
  for (const [suId, profType, profName, visitDate, outcome, followUp, followUpDone] of pvItems) {
    await q(
      `INSERT INTO professional_visits (id, home_id, su_id, recorded_by, visit_date, professional_type, professional_name, outcome, follow_up_date, follow_up_done, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [HOME, suId, s1, visitDate, profType, profName, outcome, followUp, followUpDone]
    );
  }

  // ── Observations ─────────────────────────────────────────────────────────
  console.log('🌡️ Observations...');
  for (const su of sus) {
    for (let day = 0; day < 14; day++) {
      await q(
        `INSERT INTO observations (id, home_id, su_id, recorded_by, obs_type, observed_at, temp_celsius, systolic, diastolic, pulse, spo2_percent, notes, is_abnormal, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, 'routine', $4, $5, $6, $7, $8, $9, 'Observations within normal parameters. No acute concerns.', false, NOW())`,
        [HOME, su.id, s2, `${daysAgo(day)} 08:00`,
          +(36.2 + Math.random() * 1.2).toFixed(1),
          118 + Math.floor(Math.random() * 24),
          74 + Math.floor(Math.random() * 16),
          66 + Math.floor(Math.random() * 22),
          95 + Math.floor(Math.random() * 5)
        ]
      );
    }
  }

  // ── Tasks ─────────────────────────────────────────────────────────────────
  console.log('✔️ Tasks...');
  const taskItems = [
    ['Complete monthly fire safety check', 'high', false],
    ['Update care plan for ' + sus[0]?.first_name, 'high', false],
    ['Order PPE supplies — disposable gloves (medium)', 'medium', false],
    ['Book GP appointment for ' + sus[2]?.first_name, 'medium', false],
    ['Submit DBS renewal for ' + staff[2]?.first_name, 'high', false],
    ['Review and sign updated medication policy', 'medium', true],
    ['Complete incident report countersignature', 'high', false],
    ['Arrange transport for Thursday hospital appointment', 'medium', false],
    ['Conduct kitchen temperature log checks', 'low', true],
    ['Update emergency contact details for ' + sus[4]?.first_name, 'low', false],
  ];
  for (const [title, priority, completed] of taskItems) {
    await q(
      `INSERT INTO tasks (id, home_id, created_by, title, priority, is_complete, due_date, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW() - (random()*7 || ' days')::interval)`,
      [HOME, s1, title, priority, completed, daysAhead(completed ? -1 : Math.floor(Math.random() * 7))]
    );
  }

  console.log('\n✅ Render production database seeded successfully!');
  console.log('\nModules seeded:');
  console.log('  📬 Inbox (12 messages)    🔔 Alerts (10)      📋 Care Plans');
  console.log('  💊 Medications + MAR       📝 Daily Records    🛁 Bath Charts');
  console.log('  📊 Reviews + Assessments  ✅ Quality Records   🔑 DBS Records');
  console.log('  🎓 Training               📆 Rota Shifts       🏖️ Leave');
  console.log('  📄 Policies               ⚠️  Risk Assessments  📅 Calendar');
  console.log('  🔔 Notifications           👥 Supervisions      📖 Diary');
  console.log('  📌 Noticeboard            🔧 Maintenance        💧 Bowel Charts');
  console.log('  ⚡ Seizures               🩺 Prof. Visits       🌡️ Observations');
  console.log('  ✔️ Tasks');
  pool.end();
}

main().catch(e => { console.error('Fatal error:', e.message); pool.end(); });
