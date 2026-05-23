// Comprehensive seed for all remaining modules — corrected to match actual DB schema
const { Pool } = require('./backend/node_modules/pg');
const pool = new Pool({ host:'localhost', port:5432, database:'healthark', user:'postgres', password:'adeniji1234' });

const HOME = '5c027814-a0f9-44f3-bad4-138e4783fd51';

async function q(sql, params) {
  try {
    await pool.query(sql, params);
  } catch(e) {
    console.warn('  SKIP:', e.message.split('\n')[0]);
  }
}

function daysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0,10);
}
function daysAhead(n) {
  const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0,10);
}

async function main() {
  console.log('=== Comprehensive Test Data Seed ===\n');

  const staffRes = await pool.query("SELECT id, first_name, last_name FROM staff WHERE home_id=$1 ORDER BY created_at LIMIT 10", [HOME]);
  const suRes = await pool.query("SELECT id, first_name, last_name FROM service_users WHERE home_id=$1 ORDER BY created_at LIMIT 10", [HOME]);

  const staff = staffRes.rows;
  const sus = suRes.rows;

  if (!staff.length) { console.error('No staff found!'); return pool.end(); }
  if (!sus.length) { console.error('No service users found!'); return pool.end(); }

  console.log(`Found ${staff.length} staff, ${sus.length} service users`);

  const s0 = staff[0].id;
  const s1 = (staff[1] || staff[0]).id;
  const s2 = (staff[2] || staff[0]).id;
  const s3 = (staff[3] || staff[0]).id;
  const s4 = (staff[4] || staff[0]).id;

  const su0 = sus[0].id;
  const su1 = (sus[1] || sus[0]).id;
  const su2 = (sus[2] || sus[0]).id;
  const su3 = (sus[3] || sus[0]).id;
  const su4 = (sus[4] || sus[0]).id;

  // ─── Staff Messages (Inbox) ───
  console.log('📬 Seeding staff messages (Inbox)...');
  const messages = [
    [s1, s0, 'Staff Rota Update', 'Please review the updated rota for next week. There are some gaps on Friday night shift.'],
    [s2, s1, 'Medication Review Reminder', 'Margaret Thompson is due her quarterly medication review. Can you arrange this with the GP?'],
    [s0, s1, 'New CQC Guidance', 'The CQC has released new guidance on medication management. Please review and update our protocols.'],
    [s3, s2, 'Incident Report Filed', 'I have submitted an incident report for the fall this morning. Please review and sign off.'],
    [s1, s2, 'Training Certificates', 'Your Moving & Handling certificate expires next month. Please book a refresher course.'],
    [s4, s0, 'PPE Supplies Low', 'We are running low on disposable gloves (medium). Please order more before Thursday.'],
    [s0, s3, 'Welcome to the Team', 'Welcome aboard! Please complete your induction checklist by end of week.'],
    [s2, s4, 'Supervision Due', 'Your 3-month supervision is due next week. Please confirm you are available Tuesday at 2pm.'],
    [s1, s3, 'Resident Appointment', 'George Williams has a hospital appointment on Thursday. Please ensure transport is arranged.'],
    [s3, s1, 'Handover Notes', 'Night shift was quiet. Dorothy Brown had a restless night and required repositioning at 3am.'],
  ];
  for (const [sender, recipient, subject, message] of messages) {
    await q(
      `INSERT INTO staff_messages (id, sender_id, recipient_id, home_id, subject, message, is_read, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, false, NOW() - (random()*10 || ' days')::interval)`,
      [sender, recipient, HOME, subject, message]
    );
  }

  // ─── Business Alerts ───
  console.log('🔔 Seeding alerts...');
  const alerts = [
    ['medication', 'high', 'Missed Medication Dose', 'Albert Johnson missed his evening Warfarin dose. GP has been notified.', su3],
    ['incident', 'critical', 'Fall Incident', 'George Williams had a fall in the bathroom at 07:30. No serious injury — monitored.', su1],
    ['staffing', 'medium', 'Shift Uncovered', 'Sunday night shift (11pm-7am) is currently unassigned. Please arrange cover.', null],
    ['compliance', 'high', 'CQC Inspection Due', 'Routine CQC inspection scheduled for next month. Begin preparation checklist.', null],
    ['medication', 'medium', 'PRN Medication Administered', 'Paracetamol PRN given to Edith Davies at 14:15 for reported headache.', su4],
    ['maintenance', 'low', 'Boiler Service Due', 'Annual boiler service is overdue by 2 weeks. Contact contractor urgently.', null],
    ['review', 'medium', 'Care Plan Review Due', "Margaret Thompson's care plan is due for quarterly review this week.", su0],
    ['staffing', 'low', 'Late Clock-In', 'David Mensah clocked in 18 minutes late for the morning shift.', null],
  ];
  for (const [type, severity, title, description, suId] of alerts) {
    await q(
      `INSERT INTO business_alerts (id, home_id, created_by, alert_type, severity, title, description, is_resolved, created_at, su_id)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, false, NOW() - (random()*7 || ' days')::interval, $7)`,
      [HOME, s0, type, severity, title, description, suId]
    );
  }

  // ─── Care Plans ───
  console.log('📋 Seeding care plans...');
  const planTypes = [
    ['personal_care', 'Personal Care & Hygiene'],
    ['mobility', 'Mobility & Moving'],
    ['nutrition', 'Nutrition & Hydration'],
  ];
  for (const su of sus) {
    for (const [planType, customName] of planTypes) {
      await q(
        `INSERT INTO care_plans (id, su_id, home_id, created_by, plan_type, custom_name, aims_outcomes, what_i_can_do, how_to_support, current_status, notes, review_frequency, last_review_date, next_review_date, is_active, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, 'active', $9, 'quarterly', $10, $11, true, NOW() - (random()*30 || ' days')::interval)`,
        [su.id, HOME, s1,
          planType, customName,
          `Ensure ${su.first_name} maintains dignity, comfort and optimal wellbeing in relation to ${customName.toLowerCase()}.`,
          `${su.first_name} can communicate preferences and indicate discomfort.`,
          `Staff to assist with ${customName.toLowerCase()} following the agreed plan. Always knock and ask permission before entering.`,
          `Regular monitoring and documentation. Any concerns to be escalated to senior staff immediately.`,
          daysAgo(30), daysAhead(60)
        ]
      );
    }
  }

  // ─── Medications ───
  console.log('💊 Seeding medications...');
  const medList = [
    ['Amlodipine', '5mg', 'Once daily', 'Oral', 'Dr. Patel'],
    ['Warfarin', '3mg', 'Once daily', 'Oral', 'Dr. Patel'],
    ['Metformin', '500mg', 'Twice daily with meals', 'Oral', 'Dr. Singh'],
    ['Paracetamol', '1g', 'Up to 4 times daily', 'Oral', 'Dr. Patel'],
    ['Omeprazole', '20mg', 'Once daily', 'Oral', 'Dr. Singh'],
    ['Aspirin', '75mg', 'Once daily', 'Oral', 'Dr. Patel'],
    ['Donepezil', '5mg', 'Once at bedtime', 'Oral', 'Dr. Williams'],
    ['Sertraline', '50mg', 'Once daily in morning', 'Oral', 'Dr. Williams'],
  ];
  const insertedMeds = [];
  for (let i = 0; i < sus.length; i++) {
    const su = sus[i];
    const offset = i % 5;
    for (let j = 0; j < 3; j++) {
      const [name, dose, freq, route, prescriber] = medList[(offset + j) % medList.length];
      const res = await pool.query(
        `INSERT INTO su_medications (id, su_id, home_id, medication_name, dose, frequency, route, prescribed_by, start_date, is_prn, added_by, is_active, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, false, $9, true, NOW()) RETURNING id, medication_name, dose, frequency, route`,
        [su.id, HOME, name, dose, freq, route, prescriber, daysAgo(90), s1]
      ).catch(e => { console.warn('  SKIP med:', e.message.split('\n')[0]); return null; });
      if (res) insertedMeds.push({ ...res.rows[0], su_id: su.id });
    }
  }

  // ─── MAR Records ───
  console.log('📅 Seeding MAR records...');
  const times = ['08:00', '13:00', '18:00', '22:00'];
  for (const med of insertedMeds.slice(0, 12)) {
    for (let day = 0; day < 7; day++) {
      const scheduled = times[Math.floor(Math.random() * 2)];
      const given = Math.random() > 0.1;
      await q(
        `INSERT INTO mar_records (id, su_id, home_id, medication_id, medication_name, dose, route, frequency, scheduled_time, record_date, given, given_at, given_by, witnessed_by, refused, omitted, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, false, false, NOW())`,
        [med.su_id, HOME, med.id, med.medication_name, med.dose, med.route, med.frequency,
         scheduled, daysAgo(day), given,
         given ? `${daysAgo(day)} ${scheduled}` : null,
         given ? s2 : null, given ? s3 : null]
      );
    }
  }

  // ─── Daily Records ───
  console.log('📝 Seeding daily records...');
  for (const su of sus) {
    for (let day = 0; day < 7; day++) {
      await q(
        `INSERT INTO daily_records (id, su_id, home_id, staff_id, record_type, shift, notes, amount_ml, fluid_type, record_date, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, 'fluid', 'morning', 'Fluid intake recorded — resident drinking well.', $4, 'Water', $5, NOW())`,
        [su.id, HOME, s2, 250 + Math.floor(Math.random()*200), daysAgo(day)]
      );
      await q(
        `INSERT INTO daily_records (id, su_id, home_id, staff_id, record_type, shift, notes, meal_type, amount_eaten, food_description, record_date, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, 'food', 'morning', 'Good appetite this morning.', 'breakfast', $4, 'Porridge, toast, orange juice', $5, NOW())`,
        [su.id, HOME, s2, ['all','three_quarters','half'][day%3], daysAgo(day)]
      );
      await q(
        `INSERT INTO daily_records (id, su_id, home_id, staff_id, record_type, shift, systolic, diastolic, pulse, record_date, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, 'blood_pressure', 'morning', $4, $5, $6, $7, NOW())`,
        [su.id, HOME, s2, 120+Math.floor(Math.random()*20), 75+Math.floor(Math.random()*15), 68+Math.floor(Math.random()*20), daysAgo(day)]
      );
    }
  }

  // ─── Bath Charts ───
  console.log('🛁 Seeding bath charts...');
  const bathTypes = ['full_bath', 'shower', 'bed_bath', 'strip_wash'];
  const assistanceLevels = ['full_assistance', 'partial_assistance', 'supervision_only', 'independent'];
  for (const su of sus) {
    for (let i = 0; i < 4; i++) {
      await q(
        `INSERT INTO bath_charts (id, su_id, home_id, bath_date, bath_time, bath_type, assistance_level, hair_washed, nails_cut, shaved, skin_condition, notes, given_by, witnessed_by, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, '09:30', $4, $5, $6, $7, false, 'good', $8, $9, $10, NOW())`,
        [su.id, HOME, daysAgo(i*4),
         bathTypes[i % bathTypes.length],
         assistanceLevels[i % assistanceLevels.length],
         i % 2 === 0, i % 3 === 0,
         `${su.first_name} was comfortable throughout. Skin in good condition. No concerns noted.`,
         s2, s3
        ]
      );
    }
  }

  // ─── Reviews ───
  console.log('📊 Seeding reviews...');
  const reviewTypes = ['annual', 'quarterly', 'care_plan', 'health'];
  for (let i = 0; i < sus.length; i++) {
    const su = sus[i];
    await q(
      `INSERT INTO su_reviews (id, su_id, home_id, created_by, review_type, review_date, summary, resident_feedback, family_feedback, outcomes, actions, next_review_date, attendees, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
      [su.id, HOME, s1,
        reviewTypes[i % reviewTypes.length],
        daysAgo(14 + i * 7),
        `Quarterly review for ${su.first_name} ${su.last_name}. Overall wellbeing is stable. Care plan goals are being met.`,
        `${su.first_name} expressed contentment with the care received. Enjoys social activities and mealtimes.`,
        'Family reports satisfaction with care quality.',
        'All care plan outcomes are being achieved. Resident is settled and comfortable.',
        'Continue current care plan. Review medication with GP next month.',
        daysAhead(90 - i * 5),
        JSON.stringify([{name: `${su.first_name} ${su.last_name}`, role: 'Resident'}, {name: 'Sarah Johnson', role: 'Manager'}])
      ]
    );
  }

  // ─── Assessments ───
  console.log('📋 Seeding assessments...');
  for (const su of sus) {
    for (const [key, cat] of [['falls_risk','Risk'],['pressure_ulcer','Risk']]) {
      await q(
        `INSERT INTO assessments (id, home_id, template_key, category, subject_id, subject_name, conducted_by, answers, total_score, max_score, score_pct, risk_level, actions_identified, next_review_date, assessment_date, status, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'completed', NOW())`,
        [HOME, key, cat, su.id,
          `${su.first_name} ${su.last_name}`,
          s1, JSON.stringify({q1:'Yes',q2:'No',q3:'Sometimes'}),
          Math.floor(Math.random()*15)+5, 25,
          Math.floor(Math.random()*60)+20,
          ['low','medium','high'][Math.floor(Math.random()*3)],
          'Ensure non-slip mats are in place. Install grab rails. Review footwear.',
          daysAhead(90), daysAgo(7)
        ]
      );
    }
  }

  // ─── Quality Records ───
  console.log('✅ Seeding quality records...');
  const qualityItems = [
    ['complaint', 'high', 'Complaint — Meal Quality', 'Family complained about cold food served at lunchtime.', 'Catering team briefed. Food temperature monitoring introduced.'],
    ['compliment', 'low', 'Outstanding Care Praised', 'Family wrote to praise exceptional care provided during a difficult period.', 'Shared with team at staff meeting.'],
    ['incident', 'high', 'Near Miss — Medication', 'Wrong medication nearly administered. Caught during double-check process.', 'Full root cause analysis completed. Protocol updated.'],
    ['safeguarding', 'critical', 'Safeguarding Alert Raised', 'Safeguarding concern raised following unexplained bruising observed during personal care.', 'Local authority notified. Investigation ongoing.'],
    ['audit', 'medium', 'Infection Control Audit', 'Monthly infection control audit completed. 2 minor issues identified.', 'PPE storage improved. Hand hygiene reminders posted.'],
  ];
  for (const [type, severity, title, desc, outcome] of qualityItems) {
    await q(
      `INSERT INTO quality_records (id, home_id, created_by, record_type, title, description, outcome, status, severity, created_at, reported_by, reported_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'open', $7, NOW() - (random()*14 || ' days')::interval, $8, NOW() - (random()*14 || ' days')::interval)`,
      [HOME, s1, type, title, desc, outcome, severity, s0]
    );
  }

  // ─── DBS Records ───
  console.log('🔑 Seeding DBS records...');
  for (let i = 0; i < staff.length; i++) {
    const s = staff[i];
    const isExpiring = i === 2;
    await q(
      `INSERT INTO staff_dbs (id, staff_id, home_id, dbs_number, dbs_type, issue_date, expiry_date, update_service, status, created_by, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, 'enhanced', $4, $5, true, $6, $7, NOW())`,
      [s.id, HOME,
        `DBS${100000 + i * 12345}`,
        daysAgo(365 * 2 + i * 30),
        isExpiring ? daysAhead(20) : daysAhead(365 - i * 30),
        isExpiring ? 'expiring_soon' : 'valid',
        s0
      ]
    );
  }

  // ─── Training Records ───
  console.log('🎓 Seeding training records...');
  const courses = [
    ['Moving & Handling', 6, 365],
    ['Safeguarding Adults', 4, 365],
    ['Fire Safety', 2, 365],
    ['First Aid', 16, 1095],
    ['Mental Capacity Act', 3, 730],
    ['Infection Control', 3, 365],
    ['Medication Administration', 6, 730],
    ['Dementia Awareness', 4, 730],
    ['Food Hygiene', 6, 1095],
    ['Lone Working', 2, 365],
  ];
  for (const s of staff) {
    for (const [course, hours, validDays] of courses) {
      const completed = daysAgo(Math.floor(Math.random() * 300));
      const expiry = new Date(completed);
      expiry.setDate(expiry.getDate() + validDays);
      await q(
        `INSERT INTO staff_training (id, staff_id, home_id, course_name, completed_date, expiry_date, provider, duration_hours, created_by, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [s.id, HOME, course, completed, expiry.toISOString().slice(0,10), 'Skills for Care', hours, s0]
      );
    }
  }

  // ─── Shifts / Rota ───
  console.log('📆 Seeding rota shifts...');
  const shiftPatterns = [
    { start: '07:00', end: '14:00', type: 'morning' },
    { start: '14:00', end: '22:00', type: 'afternoon' },
    { start: '22:00', end: '07:00', type: 'night' },
  ];
  for (let day = -7; day <= 14; day++) {
    const date = daysAhead(day);
    for (let i = 0; i < shiftPatterns.length; i++) {
      const pattern = shiftPatterns[i];
      const assigned = Math.random() > 0.15;
      const staffId = assigned ? staff[i % staff.length].id : null;
      await q(
        `INSERT INTO staff_shifts (id, home_id, staff_id, shift_date, start_time, end_time, shift_type, created_by, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW())`,
        [HOME, staffId, date, pattern.start, pattern.end, pattern.type, s0]
      );
    }
  }

  // ─── Staff Leave ───
  console.log('🏖️ Seeding staff leave...');
  const leaveRequests = [
    [s1, 'annual', daysAhead(14), daysAhead(19), 'approved', 'Family holiday booked.'],
    [s2, 'sick', daysAgo(5), daysAgo(3), 'approved', 'Flu — returned to work.'],
    [s3, 'annual', daysAhead(30), daysAhead(34), 'pending', 'Annual leave request.'],
    [s4, 'training', daysAhead(7), daysAhead(7), 'approved', 'Mandatory safeguarding refresher.'],
    [s2, 'compassionate', daysAgo(20), daysAgo(18), 'approved', 'Family bereavement.'],
  ];
  for (const [staffId, type, start, end, status, reason] of leaveRequests) {
    await q(
      `INSERT INTO staff_leave (id, staff_id, home_id, leave_type, start_date, end_date, hours_requested, status, reason, approved_by, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 37.5, $6, $7, $8, NOW())`,
      [staffId, HOME, type, start, end, status, reason, s0]
    );
  }

  // ─── Policies ───
  console.log('📄 Seeding policies...');
  const policyList = [
    ['Safeguarding Adults Policy', '3.2', daysAgo(60), daysAhead(305)],
    ['Medication Management Policy', '4.1', daysAgo(30), daysAhead(335)],
    ['Infection Control Policy', '2.5', daysAgo(90), daysAhead(275)],
    ['Health & Safety Policy', '5.0', daysAgo(120), daysAhead(245)],
    ['Fire Safety Policy', '2.1', daysAgo(180), daysAhead(185)],
    ['Moving & Handling Policy', '3.0', daysAgo(45), daysAhead(320)],
    ['Complaints & Compliments Policy', '1.8', daysAgo(200), daysAhead(165)],
    ['Lone Working Policy', '2.3', daysAgo(75), daysAhead(290)],
  ];
  for (const [title, version, effective, review] of policyList) {
    await q(
      `INSERT INTO policies (id, home_id, title, version, effective_date, review_date, uploaded_by, requires_sign, is_active, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, true, NOW())`,
      [HOME, title, version, effective, review, s0]
    );
  }

  // ─── Risk Assessments ───
  console.log('⚠️  Seeding risk assessments...');
  const riskItems = [
    ['falls', 'medium', 'Falls Risk Assessment', 'Increased risk of falls due to mobility issues and medication side effects.', 'Non-slip flooring fitted. Grab rails installed. Regular checks every 2 hours.'],
    ['pressure_ulcer', 'low', 'Pressure Ulcer Risk', 'Potential risk of pressure ulcers due to reduced mobility.', 'Repositioning schedule in place. Pressure-relieving mattress in use.'],
    ['choking', 'medium', 'Choking Risk Assessment', 'Modified texture diet required following SALT assessment.', 'Minced and moist diet. Staff trained in Heimlich manoeuvre.'],
    ['wandering', 'high', 'Wandering & Elopement Risk', 'History of attempting to leave the building unsupervised.', 'Door sensor alerts installed. Visual monitoring in communal areas.'],
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

  // ─── Handover Records ───
  console.log('🔄 Seeding handover records...');
  for (let day = 0; day < 7; day++) {
    const drRes = await pool.query(
      `INSERT INTO daily_records (id, su_id, home_id, staff_id, record_type, shift, notes, record_date, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, 'notes', 'morning', $4, $5, NOW()) RETURNING id`,
      [su0, HOME, s2,
        `General handover notes. Overall a ${['quiet','busy','routine','challenging','positive'][day % 5]} shift.`,
        daysAgo(day)
      ]
    ).catch(e => { console.warn('  SKIP dr for handover:', e.message.split('\n')[0]); return null; });

    if (drRes?.rows[0]) {
      await q(
        `INSERT INTO records_handover (id, daily_record_id, shift_summary, priority_flags, outstanding_actions, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())`,
        [drRes.rows[0].id,
          `Shift handover for ${daysAgo(day)}. All residents accounted for. Medications administered as prescribed. No falls or incidents to report.`,
          JSON.stringify(['Margaret Thompson — GP appointment tomorrow', 'Dietary supplements need ordering']),
          JSON.stringify(['Call GP re: Margaret Thompson prescription', 'Complete monthly fire safety check'])
        ]
      );
    }
  }

  // ─── Calendar Events ───
  console.log('📅 Seeding calendar events...');
  const events = [
    ['GP Visit — Margaret Thompson', 'medical', daysAhead(3), '10:00', '11:00', su0, 'GP Surgery Room 2'],
    ['Staff Meeting', 'meeting', daysAhead(5), '14:00', '15:30', null, 'Main Office'],
    ['Physiotherapy Session', 'therapy', daysAhead(2), '11:00', '12:00', su1, 'Therapy Room'],
    ['Fire Drill', 'training', daysAhead(7), '10:00', '10:30', null, 'Whole Building'],
    ['Family Visit — Dorothy Brown', 'visit', daysAhead(1), '14:00', '16:00', su2, 'Lounge'],
    ['Hairdresser Visit', 'activity', daysAhead(4), '10:00', '12:00', null, 'Lounge'],
    ['Quiz Night', 'activity', daysAhead(6), '18:30', '20:00', null, 'Dining Room'],
    ['CQC Preparation Meeting', 'meeting', daysAhead(10), '09:00', '10:00', null, 'Office'],
  ];
  for (const [title, type, date, start, end, suId, location] of events) {
    await q(
      `INSERT INTO calendar_events (id, home_id, created_by, title, event_type, event_date, start_time, end_time, location, su_id, all_staff, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [HOME, s0, title, type, date, start, end, location, suId, type === 'training' || type === 'meeting']
    );
  }

  // ─── Notifications ───
  console.log('🔔 Seeding notifications...');
  const notifs = [
    [s0, "Care Plan Review Due", "Margaret Thompson's care plan is due for review in 3 days.", 'reminder', '/service-users'],
    [s1, 'DBS Expiring Soon', "Priya Sharma's DBS certificate expires in 20 days. Please arrange renewal.", 'alert', '/dbs'],
    [s1, 'New Incident Report', 'A new incident report has been submitted for your review.', 'info', '/incidents'],
    [s0, 'Shift Unassigned', 'Sunday night shift (22:00-07:00) is unassigned. Please arrange cover.', 'warning', '/rota'],
    [s2, 'Training Due', 'Your Moving & Handling certificate expires in 30 days.', 'reminder', '/training'],
    [s0, 'New Message', 'You have a new message from Sarah Johnson.', 'info', '/messages'],
  ];
  for (const [recipient, title, body, type, link] of notifs) {
    await q(
      `INSERT INTO notifications (id, recipient_id, home_id, title, body, type, link, is_read, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, false, NOW() - (random()*3 || ' days')::interval)`,
      [recipient, HOME, title, body, type, link]
    );
  }

  // ─── Supervisions ───
  console.log('👥 Seeding supervisions...');
  for (let i = 0; i < staff.length; i++) {
    const s = staff[i];
    await q(
      `INSERT INTO staff_supervisions (id, staff_id, home_id, conducted_by, supervision_type, supervision_date, summary, action_points, next_supervision_date, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, 'quarterly', $4, $5, $6, $7, NOW())`,
      [s.id, HOME, s1,
        daysAgo(30 + i * 10),
        `Quarterly supervision for ${s.first_name} ${s.last_name}. Performance is satisfactory. Staff member is engaged and motivated. No performance concerns identified.`,
        JSON.stringify(['Complete mandatory training by end of month', 'Shadow senior carer for complex care procedures', 'Review and sign updated medication policy']),
        daysAhead(60 + i * 10)
      ]
    );
  }

  console.log('\n✅ All done! Comprehensive test data seeded successfully.');
  pool.end();
}

main().catch(e => { console.error('Fatal:', e.message); pool.end(); });
