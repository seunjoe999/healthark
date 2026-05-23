// Run: node seed_test_data.js
const { Pool } = require('./backend/node_modules/pg');

const pool = new Pool({
  host: 'localhost', port: 5432, database: 'healthark',
  user: 'postgres', password: 'adeniji1234',
});

const HOME   = '5c027814-a0f9-44f3-bad4-138e4783fd51';
const STAFF  = [
  'e951bf8c-fc86-4771-80ad-b903f754ad6f', // System Admin
  '0dd6be56-890b-4e27-9d15-a564ebd7f094', // Sarah Johnson
  '1d1c9477-4fe9-4676-a6b3-c88af6fbca5e', // Priya Sharma
  'a181f22b-3769-4c52-bb19-861d5c3d2126', // David Mensah
  '8fe357e2-8093-43d5-be11-ea37d0b3e206', // Michael Okafor
  '86d5a846-3c4f-40bb-a131-faa32be5368e',
  '85c47d83-2546-437a-a1c5-0a71df67f7d5',
];
const SUS = [
  '92818c0f-b5d7-46f7-8d04-8699b01c2482', // Margaret Thompson
  '11111111-0000-0000-0000-000000000002', // George Williams
  '11111111-0000-0000-0000-000000000003', // Dorothy Brown
  '11111111-0000-0000-0000-000000000004', // Albert Johnson
  '11111111-0000-0000-0000-000000000005', // Edith Davies
  '4185a367-406c-4f44-a395-4c1e66c2a9fb',
  '8f0ebcf2-0cae-445f-b962-838445e5014a',
  '1259b91c-ad41-4c2d-a811-c23d4fdb2502',
];

function daysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString();
}
function daysFromNow(n) {
  const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0,10);
}
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function run() {
  const q = (sql, p) => pool.query(sql, p);

  // ── Birthdays: set some staff + SU DOBs to next 7 days ───────────────────
  console.log('Setting birthdays...');
  const thisYear = new Date().getFullYear();
  await q(`UPDATE staff SET date_of_birth=$1 WHERE id=$2`, [`${thisYear}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(new Date().getDate()+1).padStart(2,'0')}`, STAFF[1]]);
  await q(`UPDATE staff SET date_of_birth=$1 WHERE id=$2`, [`${thisYear}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(new Date().getDate()+3).padStart(2,'0')}`, STAFF[2]]);
  await q(`UPDATE service_users SET date_of_birth=$1 WHERE id=$2`, [`${thisYear}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(new Date().getDate()+2).padStart(2,'0')}`, SUS[0]]);

  // ── Noticeboard ───────────────────────────────────────────────────────────
  console.log('Seeding noticeboard...');
  const notices = [
    ['Fire Drill – This Friday', 'All staff must participate in the fire drill at 10:00am this Friday. Please ensure all residents are accounted for and evacuation procedures are followed.', 'urgent', true],
    ['New Medication Protocol', 'Following the latest CQC guidance, all PRN medications must now be documented within 15 minutes of administration. Please see the updated policy in the policies section.', 'policy', false],
    ['Staff Training – Moving & Handling', 'Mandatory moving and handling refresher training scheduled for next Tuesday 14:00–16:00. All care staff must attend. Room 3.', 'training', false],
    ['Congratulations to Priya!', 'Please join us in congratulating Priya Sharma on completing her NVQ Level 3 in Health and Social Care. Outstanding achievement!', 'celebration', true],
    ['Boiler Maintenance – 28th May', 'The boiler will be serviced on 28th May between 09:00–12:00. Hot water may be intermittent during this time.', 'maintenance', false],
    ['Staff Meeting – Monday 9am', 'Monthly team meeting this Monday at 9:00am in the main lounge. Agenda includes rota updates, new residents, and CQC prep.', 'reminder', false],
  ];
  for (const [title, body, category, pinned] of notices) {
    await q(`INSERT INTO noticeboard (home_id, created_by, title, body, category, is_pinned)
             VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
      [HOME, pick(STAFF), title, body, category, pinned]);
  }

  // ── Resident Diary ────────────────────────────────────────────────────────
  console.log('Seeding resident diary...');
  const moods = ['great','good','good','fair','low'];
  const appetites = ['good','good','fair','poor'];
  const sleeps = ['good','fair','restless'];
  const activitiesList = [
    'Attended morning exercise class. Enjoyed tea and biscuits with visitors.',
    'Watched television in the lounge. Had a short walk in the garden.',
    'Participated in arts and crafts. Listened to music in the afternoon.',
    'Quiet day, preferred to stay in room. Read newspaper and chatted with staff.',
    'Attended music therapy session. Very engaged and responsive.',
    'Family visit in the afternoon. In good spirits throughout the day.',
  ];
  for (let i = 0; i < 20; i++) {
    const su = SUS[i % SUS.length];
    await q(`INSERT INTO resident_diary
      (home_id, su_id, recorded_by, diary_date, mood, mood_notes, activities,
       food_appetite, fluid_intake, sleep_quality, personal_care_done, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [HOME, su, pick(STAFF),
       new Date(Date.now() - (i * 86400000)).toISOString().slice(0,10),
       pick(moods), i % 3 === 0 ? 'Seemed a little unsettled this morning but improved later.' : null,
       pick(activitiesList), pick(appetites), pick(['good','fair','poor']), pick(sleeps),
       i % 4 !== 0, i % 5 === 0 ? 'No concerns noted.' : null]);
  }

  // ── Observations (vitals) ─────────────────────────────────────────────────
  console.log('Seeding observations...');
  const obsTypes = ['temperature','blood_pressure','full_set','spo2','weight'];
  for (let i = 0; i < 25; i++) {
    const su = SUS[i % SUS.length];
    const type = pick(obsTypes);
    const isFullOrTemp = type === 'temperature' || type === 'full_set';
    const isFullOrBP   = type === 'blood_pressure' || type === 'full_set';
    await q(`INSERT INTO observations
      (home_id, su_id, recorded_by, obs_type, observed_at,
       temp_celsius, systolic, diastolic, pulse, spo2_percent, weight_kg,
       notes, is_abnormal)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [HOME, su, pick(STAFF), type,
       new Date(Date.now() - i * 7200000).toISOString(),
       isFullOrTemp ? (36.2 + Math.random() * 2).toFixed(1) : null,
       isFullOrBP   ? Math.floor(115 + Math.random() * 40) : null,
       isFullOrBP   ? Math.floor(70 + Math.random() * 20)  : null,
       type === 'full_set' ? Math.floor(65 + Math.random() * 30) : null,
       type === 'spo2' || type === 'full_set' ? Math.floor(93 + Math.random() * 6) : null,
       type === 'weight' ? (55 + Math.random() * 30).toFixed(1) : null,
       null, i % 7 === 0]);
  }

  // ── Seizure Log ───────────────────────────────────────────────────────────
  console.log('Seeding seizure log...');
  const seizureTypes = ['tonic_clonic','absence','focal','myoclonic','tonic'];
  const actions = [
    'Positioned on side, timed episode, called for assistance. Recovery position maintained throughout.',
    'Ensured safe environment, removed hazards, timed duration. GP notified post-episode.',
    'Sat with resident, kept calm, timed episode. Checked airway on recovery.',
  ];
  for (let i = 0; i < 8; i++) {
    const su = SUS[i % 3]; // only some residents have seizure history
    await q(`INSERT INTO seizure_logs
      (home_id, su_id, recorded_by, seizure_at, seizure_type, duration_seconds,
       description, recovery_time_mins, post_ictal, action_taken,
       notified_gp, notified_family, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [HOME, su, pick(STAFF),
       daysAgo(Math.floor(i * 4)),
       pick(seizureTypes),
       30 + Math.floor(Math.random() * 90),
       'Resident experienced sudden onset of convulsive movements. Eyes rolled back. Limb rigidity observed.',
       5 + Math.floor(Math.random() * 15),
       'Drowsy and confused post-episode. Slept for approximately 45 minutes.',
       pick(actions),
       i % 3 === 0, i % 4 === 0,
       'Resident recovered fully. Medication reviewed.']);
  }

  // ── Bowel Chart ───────────────────────────────────────────────────────────
  console.log('Seeding bowel chart...');
  const colours = ['brown','dark_brown','light_brown','yellow'];
  const amounts = ['small','medium','large'];
  for (let i = 0; i < 30; i++) {
    const su = SUS[i % SUS.length];
    await q(`INSERT INTO bowel_charts
      (home_id, su_id, recorded_by, bristol_type, recorded_at,
       amount, colour, blood_present, mucus_present, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [HOME, su, pick(STAFF),
       1 + Math.floor(Math.random() * 7),
       new Date(Date.now() - i * 28800000).toISOString(),
       pick(amounts), pick(colours),
       i % 15 === 0, i % 20 === 0,
       null]);
  }

  // ── Professional Visits ───────────────────────────────────────────────────
  console.log('Seeding professional visits...');
  const visits = [
    ['GP', 'Dr. Amanda Clarke', 'Riverside Medical Practice', 'Routine medication review', 'Adjusted blood pressure medication. Increase ramipril to 10mg daily.', 'Monitor BP for 2 weeks and report back.'],
    ['District Nurse', 'Nurse Helen Boyd', 'NHS Community Care', 'Wound dressing change – leg ulcer', 'Wound healing well. Continue current dressing regime.', null],
    ['Physiotherapist', 'James Osei', 'Active Physio Ltd', 'Mobility assessment following fall', 'Recommended walking frame and balance exercises. See exercise plan attached.', 'Book follow-up in 4 weeks.'],
    ['Occupational Therapist', 'Rachel Chen', 'County OT Services', 'Home adaptation assessment', 'Recommended grab rails for bathroom. Referral to equipment team.', 'Await equipment installation.'],
    ['Social Worker', 'Mike Adeyemi', 'Adult Social Care', 'Annual care review', 'Care package reviewed and updated. Family in agreement with changes.', null],
    ['Dentist', 'Dr. Sarah Park', 'Smiles Dental', 'Annual dental check', 'Two teeth require extraction. Referral to hospital dentist sent.', 'Appointment expected within 6 weeks.'],
    ['Dietitian', 'Laura Fenn', 'NHS Nutrition Team', 'MUST score review and dietary plan update', 'MUST score 2. High risk. Fortified diet and supplements recommended.', 'Reassess in 4 weeks.'],
    ['Chiropodist', 'Tom Barnes', 'FootCare Plus', 'Routine foot care', 'Nails trimmed, callus treated. No concerns.', null],
  ];
  for (let i = 0; i < visits.length; i++) {
    const [type, name, org, reason, outcome, followUp] = visits[i];
    await q(`INSERT INTO professional_visits
      (home_id, su_id, recorded_by, visit_date, professional_type,
       professional_name, organisation, reason, outcome,
       instructions_left, follow_up_date, follow_up_notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [HOME, SUS[i % SUS.length], pick(STAFF),
       new Date(Date.now() - i * 86400000 * 3).toISOString().slice(0,10),
       type, name, org, reason, outcome,
       i % 3 === 0 ? 'Ensure medication changes are updated on MAR sheet.' : null,
       followUp ? daysFromNow(14 + i * 3) : null,
       followUp]);
  }

  // ── Medicine Risk Assessments ─────────────────────────────────────────────
  console.log('Seeding medicine risk assessments...');
  const swallowRisks = ['none','none','low','medium','high'];
  const riskLevels   = ['low','low','medium','high'];
  for (let i = 0; i < SUS.length; i++) {
    await q(`INSERT INTO medicine_risk_assessments
      (home_id, su_id, assessed_by, self_medicate, swallowing_risk, swallowing_notes,
       covert_meds, covert_notes, prn_protocol, prn_notes,
       crushing_required, crushing_notes, administration_route,
       known_allergies, storage_location, risk_level, risk_notes, review_date)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
      [HOME, SUS[i], STAFF[1],
       false, pick(swallowRisks),
       i % 3 === 0 ? 'Requires thickened fluids (Stage 2 – Nectar). All medications to be given in puree or dissolved in water.' : null,
       i % 4 === 0, i % 4 === 0 ? 'MCA in place – capacity assessed 12/01/2026. BIA completed and filed.' : null,
       i % 3 === 0, i % 3 === 0 ? 'Lorazepam 0.5mg PRN for acute anxiety. Max 2 doses per 24hrs. Contact GP if used.' : null,
       i % 5 === 0, i % 5 === 0 ? 'All tablets to be crushed and mixed with yoghurt or jam.' : null,
       'oral',
       i % 3 === 0 ? 'Penicillin – documented allergy. Causes anaphylaxis.' : 'NKDA',
       'Locked medication trolley – Room ' + (i + 2),
       pick(riskLevels),
       'Resident requires 2-staff administration due to compliance issues.',
       daysFromNow(90 + i * 15)]);
  }

  // ── Staff Performance ─────────────────────────────────────────────────────
  console.log('Seeding staff performance...');
  const periods = ['January 2026','February 2026','March 2026','April 2026','May 2026'];
  const strengthsList = [
    'Excellent communication with residents and families. Always punctual and professional.',
    'Strong clinical knowledge. Consistently goes above and beyond.',
    'Very compassionate carer. Residents speak highly of them.',
    'Great team player. Reliable and adaptable to change.',
  ];
  const improvements = [
    'Documentation could be more detailed and timely.',
    'Would benefit from further training in dementia care.',
    'Needs to improve time management during busy periods.',
    'Should take on more leadership responsibilities.',
  ];
  for (let i = 1; i < Math.min(STAFF.length, 6); i++) {
    await q(`INSERT INTO staff_performance
      (home_id, staff_id, assessed_by, period, training_compliance,
       supervision_completed, supervisions_due, supervisions_done,
       incidents_reported, punctuality_score, attitude_score, care_quality_score,
       documentation_score, teamwork_score, overall_score, risk_rating,
       strengths, areas_improvement, action_plan)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
      [HOME, STAFF[i], STAFF[0],
       pick(periods),
       70 + Math.floor(Math.random() * 30),
       true, 2, 2,
       Math.floor(Math.random() * 3),
       3 + Math.floor(Math.random() * 3),
       3 + Math.floor(Math.random() * 3),
       3 + Math.floor(Math.random() * 3),
       3 + Math.floor(Math.random() * 3),
       3 + Math.floor(Math.random() * 3),
       (3.5 + Math.random() * 1.5).toFixed(1),
       pick(['low','low','medium']),
       pick(strengthsList),
       pick(improvements),
       'Enrol in relevant training course. Monthly supervision to track progress.']);
  }

  // ── Tasks ─────────────────────────────────────────────────────────────────
  console.log('Seeding tasks...');
  const taskData = [
    ['Complete monthly medication audit', 'high', -2],
    ['Update Margaret Thompson care plan', 'high', -1],
    ['Book GP visit for George Williams', 'medium', 3],
    ['Order continence supplies', 'medium', 1],
    ['Submit CQC quarterly return', 'high', -5],
    ['Schedule staff supervision – Priya Sharma', 'medium', 7],
    ['Fire safety check – kitchen extinguishers', 'high', -3],
    ['Update risk assessment – Dorothy Brown (falls)', 'high', 2],
    ['Arrange transport for hospital appointment – Albert Johnson', 'medium', 5],
    ['Review and sign new staff handbook', 'low', 10],
  ];
  for (const [title, priority, daysOffset] of taskData) {
    await q(`INSERT INTO tasks (home_id, title, priority, due_date, assigned_to, created_by, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7)
             ON CONFLICT DO NOTHING`,
      [HOME, title, priority,
       daysFromNow(daysOffset),
       pick(STAFF), STAFF[0],
       daysOffset < 0 ? 'overdue' : 'pending']).catch(() => {});
  }

  // ── Incidents ─────────────────────────────────────────────────────────────
  console.log('Seeding incidents...');
  const incidentTypes = ['fall','medication_error','behaviour','near_miss','property_damage'];
  const incidentDescs = [
    'Resident found on floor in bedroom. No apparent injury. Area checked for hazards.',
    'Medication given 2 hours late due to staffing issues. GP informed. No adverse effects.',
    'Resident became verbally aggressive during personal care. De-escalation techniques used.',
    'Near miss – resident almost slipped on wet floor. Floor dried immediately. Wet floor sign placed.',
    'Resident accidentally knocked over TV. Screen cracked. No injury.',
  ];
  for (let i = 0; i < 6; i++) {
    await q(`INSERT INTO records_incidents
      (home_id, su_id, staff_id, incident_type, incident_date, description,
       action_taken, reported_to, reported_at, severity, location)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT DO NOTHING`,
      [HOME, SUS[i % SUS.length], pick(STAFF),
       pick(incidentTypes),
       new Date(Date.now() - i * 86400000 * 4),
       pick(incidentDescs),
       'Incident recorded. Manager informed. Family notified where appropriate.',
       'home_manager',
       new Date(Date.now() - i * 86400000 * 4 + 3600000),
       pick(['low','medium','high']),
       pick(['bedroom','lounge','bathroom','corridor','garden'])
      ]).catch(() => {});
  }

  // ── Maintenance ───────────────────────────────────────────────────────────
  console.log('Seeding maintenance...');
  const maintItems = [
    ['Leaking tap – bathroom Room 5', 'plumbing', 'medium'],
    ['Broken window handle – Room 3', 'other', 'low'],
    ['Faulty call bell – Room 7', 'electrical', 'urgent'],
    ['Garden gate hinge broken', 'security', 'medium'],
    ['Damp patch on ceiling – dining room', 'plumbing', 'high'],
    ['Fridge not cooling properly – kitchen', 'equipment', 'high'],
  ];
  for (const [title, category, priority] of maintItems) {
    await q(`INSERT INTO maintenance_logs
      (home_id, title, category, priority, status, location, reported_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
      [HOME, title, category, priority,
       priority === 'urgent' ? 'in_progress' : 'open',
       title.split('–')[1]?.trim() || 'General',
       pick(STAFF)]).catch(() => {});
  }

  // ── Safeguarding ─────────────────────────────────────────────────────────
  console.log('Seeding safeguarding...');
  await q(`INSERT INTO safeguarding_concerns
    (home_id, su_id, overview, incident_date, manager_ack)
    VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
    [HOME, SUS[0],
     'Unexplained bruising noted on resident\'s arm during personal care. Investigation initiated. Family informed.',
     new Date(Date.now() - 7 * 86400000),
     true]).catch(() => {});

  console.log('\n✅ Seed complete. All test data inserted.');
  pool.end();
}

run().catch(e => { console.error('Seed failed:', e.message); pool.end(); });
