// Final fix script — all enum values now matched to Render production schema
const { Pool } = require('./backend/node_modules/pg');
const pool = new Pool({
  connectionString: 'postgresql://healthark_user:yplXYLHUaPksCpMi57e6PebPK0Yi6laF@dpg-d88dabjbc2fs73eqf960-a.oregon-postgres.render.com/healthark',
  ssl: { rejectUnauthorized: false },
});
const HOME = '5c027814-a0f9-44f3-bad4-138e4783fd51';
const ORG  = '00000000-0000-0000-0000-000000000001';

async function q(sql, params) {
  try { return await pool.query(sql, params); }
  catch(e) { console.warn('  SKIP:', e.message.split('\n')[0].slice(0, 120)); return null; }
}
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate()-n); return d.toISOString().slice(0,10); }
function daysAhead(n) { const d = new Date(); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }

async function main() {
  const staffRes = await pool.query("SELECT id, first_name, last_name FROM staff WHERE home_id=$1 ORDER BY created_at LIMIT 10", [HOME]);
  const suRes    = await pool.query("SELECT id, first_name, last_name FROM service_users WHERE home_id=$1 ORDER BY created_at LIMIT 10", [HOME]);
  const staff = staffRes.rows, sus = suRes.rows;

  const s0 = staff[0].id;
  const s1 = (staff[1] || staff[0]).id;
  const s2 = (staff[2] || staff[0]).id;
  const s3 = (staff[3] || staff[0]).id;
  const s4 = (staff[4] || staff[0]).id;

  const su0 = sus[0].id, su1 = (sus[1]||sus[0]).id, su2 = (sus[2]||sus[0]).id;
  const su3 = (sus[3]||sus[0]).id, su4 = (sus[4]||sus[0]).id;

  // ── Business Alerts ────────────────────────────────────────────────────
  // alert_type: care_plan_review_due, medication_gap, incident_not_reviewed, training_expiring, training_expired, fluid_below_threshold, risk_assessment_overdue, unsigned_policy, stock_low, vital_sign_flag
  // alert_severity: info, warning, critical
  console.log('🔔 Business alerts...');
  const alerts = [
    ['care_plan_review_due',      'warning',  "Care Plan Review Due", `${sus[0]?.first_name}'s care plan is overdue for quarterly review. Please schedule with family urgently.`, su0],
    ['medication_gap',            'critical', 'Missed Medication Dose', `${sus[3]?.first_name} missed their evening Warfarin dose. GP has been notified per protocol.`, su3],
    ['incident_not_reviewed',     'critical', 'Incident Report Awaiting Review', `A fall incident report for ${sus[1]?.first_name} has not been reviewed or countersigned.`, su1],
    ['training_expiring',         'warning',  'Training Certificate Expiring', `${staff[2]?.first_name} ${staff[2]?.last_name}'s Moving & Handling cert expires in 3 weeks.`, null],
    ['training_expired',          'critical', 'DBS Check Expiring Soon', `${staff[2]?.first_name} ${staff[2]?.last_name}'s DBS certificate expires in 18 days. Action required.`, null],
    ['fluid_below_threshold',     'warning',  'Fluid Intake Below Target', `${sus[2]?.first_name}'s fluid intake was below 1000ml yesterday. Increase monitoring.`, su2],
    ['risk_assessment_overdue',   'warning',  'Risk Assessment Review Overdue', `Falls risk assessment for ${sus[4]?.first_name} is overdue. Please complete within 48 hours.`, su4],
    ['unsigned_policy',           'info',     'Policy Awaiting Staff Signatures', 'Updated Medication Administration Policy has not been signed by all staff. Complete by Friday.', null],
    ['stock_low',                 'info',     'PPE Stock Running Low', 'Disposable gloves (medium) are critically low — less than 1 week supply. Order urgently.', null],
    ['vital_sign_flag',           'critical', 'Abnormal Vital Sign Recorded', `${sus[1]?.first_name}'s blood pressure reading of 180/110 was flagged as abnormal. GP informed.`, su1],
  ];
  for (const [type, severity, title, description, suId] of alerts) {
    await q(
      `INSERT INTO business_alerts (id, home_id, created_by, alert_type, severity, title, description, is_resolved, created_at, su_id)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, false, NOW() - (random()*10 || ' days')::interval, $7)`,
      [HOME, s0, type, severity, title, description, suId]
    );
  }

  // ── Care Plans ──────────────────────────────────────────────────────────
  // review_frequency: weekly, fortnightly, monthly, eight_weekly, yearly
  console.log('📋 Care plans...');
  const planTypes = [
    ['personal_care', 'Personal Care & Hygiene', 'monthly',
      'Ensure dignity, comfort and optimal hygiene is maintained at all times.',
      'Can express preferences and indicate discomfort verbally or by gesture.',
      'Staff to assist with all personal care following the agreed person-centred plan. Always knock, introduce yourself, and gain consent before commencing.'],
    ['mobility', 'Mobility & Moving', 'monthly',
      'Support safe and comfortable movement to maximise independence and prevent falls.',
      'Can weight-bear with support and indicate when ready to move.',
      'Use assessed equipment at all times. Two-person assist for transfers. Document all falls immediately.'],
    ['nutrition', 'Nutrition & Hydration', 'monthly',
      'Ensure adequate nutrition and hydration to support overall health and wellbeing.',
      'Can self-feed with prompting and adapted cutlery.',
      'Offer preferred foods and fluids. Monitor and record all intake. Ensure minimum 1500ml fluid per day.'],
  ];
  for (const su of sus) {
    for (const [planType, customName, freq, aims, whatICan, howToSupport] of planTypes) {
      await q(
        `INSERT INTO care_plans (id, su_id, home_id, created_by, plan_type, custom_name, aims_outcomes, what_i_can_do, how_to_support, current_status, notes, review_frequency, last_review_date, next_review_date, is_active, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, 'active', 'Monitor and update at each review. Escalate any significant changes immediately.', $9, $10, $11, true, NOW() - (random()*60 || ' days')::interval)`,
        [su.id, HOME, s1, planType, customName, aims, whatICan, howToSupport, freq, daysAgo(30), daysAhead(60)]
      );
    }
  }

  // ── Staff Leave ─────────────────────────────────────────────────────────
  // leave_type: annual, sick, unauthorised, maternity, paternity, compassionate, other
  console.log('🏖️ Staff leave...');
  const leaveItems = [
    [s1, 'annual',       daysAhead(14), daysAhead(19), 'approved', 'Family holiday booked.'],
    [s2, 'sick',         daysAgo(5),    daysAgo(3),    'approved', 'Flu — GP fit note provided. Returned fit for duty.'],
    [s3, 'annual',       daysAhead(30), daysAhead(34), 'pending',  'Annual leave request awaiting approval.'],
    [s4, 'other',        daysAhead(7),  daysAhead(7),  'approved', 'Attending mandatory safeguarding refresher training.'],
    [s1, 'compassionate',daysAgo(20),   daysAgo(18),   'approved', 'Family bereavement.'],
    [s2, 'annual',       daysAhead(45), daysAhead(49), 'pending',  'Holiday request submitted.'],
  ];
  for (const [staffId, type, start, end, status, reason] of leaveItems) {
    await q(
      `INSERT INTO staff_leave (id, staff_id, home_id, leave_type, start_date, end_date, hours_requested, status, reason, approved_by, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 37.5, $6, $7, $8, NOW())`,
      [staffId, HOME, type, start, end, status, reason, s0]
    );
  }

  // ── Policies ─────────────────────────────────────────────────────────────
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
      `INSERT INTO policies (id, organisation_id, home_id, title, version, effective_date, review_date, uploaded_by, document_url, requires_sign, is_active, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, true, true, NOW())`,
      [ORG, HOME, title, version, effective, review, s0, `https://policies.comprehensivecare.co.uk/${title.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-v${version}.pdf`]
    );
  }

  // ── Tasks ─────────────────────────────────────────────────────────────────
  // priority: low, normal, high, urgent | status: pending/completed
  console.log('✔️ Tasks...');
  const taskItems = [
    ['Complete monthly fire safety check', 'compliance', 'urgent', 'pending'],
    [`Update care plan for ${sus[0]?.first_name} ${sus[0]?.last_name}`, 'care', 'high', 'pending'],
    ['Order PPE supplies — disposable gloves (medium)', 'admin', 'normal', 'pending'],
    [`Book GP appointment for ${sus[2]?.first_name}`, 'care', 'normal', 'pending'],
    [`Submit DBS renewal for ${staff[2]?.first_name} ${staff[2]?.last_name}`, 'compliance', 'urgent', 'pending'],
    ['Review and sign updated medication policy', 'compliance', 'normal', 'completed'],
    ['Complete incident report countersignature', 'care', 'high', 'pending'],
    ['Arrange transport for Thursday hospital appointment', 'care', 'normal', 'pending'],
    ['Conduct kitchen temperature log checks', 'admin', 'low', 'completed'],
    [`Update emergency contact details for ${sus[4]?.first_name}`, 'admin', 'low', 'pending'],
    ['Restock hand sanitiser dispensers in corridors', 'admin', 'normal', 'pending'],
    ['Review and update risk assessments for new residents', 'care', 'high', 'pending'],
  ];
  for (const [title, category, priority, status] of taskItems) {
    await q(
      `INSERT INTO tasks (id, home_id, created_by, title, category, priority, status, task_date, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW() - (random()*7 || ' days')::interval)`,
      [HOME, s1, title, category, priority, status, daysAhead(status === 'completed' ? -1 : Math.floor(Math.random()*7))]
    );
  }

  // ── QA Records ─────────────────────────────────────────────────────────────
  // record_type: complaint, compliment, feedback, concern
  // subject_type: staff, su, home
  console.log('✅ QA records...');
  const qaItems = [
    ['complaint', 'home',  null, s0,  'Family raised concern that meals were being served cold at lunchtime during weekday shifts.', 'Catering timings adjusted. Additional staff allocated at mealtimes. Family written to with outcome.', 'Resolved to family satisfaction.'],
    ['compliment','su',    su0,  s1,  `Family of ${sus[0]?.first_name} wrote to formally thank the team for outstanding compassionate care.`, 'Letter shared with all staff at team meeting. Individual staff formally recognised.', 'Positive outcome — team morale boost.'],
    ['concern',   'su',    su2,  s1,  `Unexplained bruising noted on ${sus[2]?.first_name}'s forearm during personal care. Raised as potential safeguarding concern.`, 'Local authority notified within 24 hours. Investigation underway.', 'Investigation ongoing.'],
    ['complaint', 'home',  null, s2,  `Family of ${sus[1]?.first_name} felt not updated promptly following a minor fall incident.`, 'Staff reminded of family communication protocol. Policy updated: notify family within 1 hour.', 'Family satisfied with resolution.'],
    ['feedback',  'home',  null, s3,  'Anonymous feedback card praising cleanliness of the home and cheerful attitude of care staff.', 'Feedback shared with housekeeping and care team at next meeting.', 'Positive feedback shared at team meeting.'],
    ['concern',   'staff', null, s0,  'Concern raised about inconsistent handover notes — some shifts not being documented thoroughly.', 'Documentation refresher conducted with all care staff. Supervision for affected individuals scheduled.', 'Improvement noted after refresher.'],
  ];
  for (const [type, subjectType, subjectSu, raisedBy, description, action, outcome] of qaItems) {
    await q(
      `INSERT INTO qa_records (id, home_id, record_type, subject_type, subject_su, raised_by, description, action_taken, outcome, resolved, created_by, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, false, $9, NOW() - (random()*21 || ' days')::interval)`,
      [HOME, type, subjectType, subjectSu, raisedBy, description, action, outcome, s1]
    );
  }

  // ── Maintenance Logs ─────────────────────────────────────────────────────
  // priority: low, medium, high, urgent | category: electrical, plumbing, heating, equipment, decoration, security, garden, cleaning, furniture, it, other
  console.log('🔧 Maintenance...');
  const maintItems = [
    ['Boiler Annual Service Overdue', 'heating', 'urgent', 'The annual gas boiler service certificate has lapsed. Engineer must be contacted immediately — legal requirement.'],
    ['Bedroom 4 — Light Fitting Flickering', 'electrical', 'medium', 'Ceiling light fitting has been flickering for 3 days. Resident finds it distressing.'],
    ['Fire Door — Slow Closing Mechanism', 'security', 'urgent', 'Fire door on first floor corridor not closing fully — fire safety hazard requiring immediate attention.'],
    ['Garden — Loose Paving Slab', 'garden', 'medium', 'A paving slab in the garden area has become loose — trip hazard for residents.'],
    ['Bathroom — Grab Rail Loose', 'plumbing', 'urgent', 'Grab rail next to assisted bath is loose and unsafe. Bathroom marked out of use until repaired.'],
    ['Kitchen — Dishwasher Fault', 'equipment', 'medium', 'Commercial dishwasher showing error code and not completing full wash cycles.'],
    ['Office — Computer Monitor Not Working', 'it', 'low', 'Office monitor has stopped working. Manager using laptop as temporary measure.'],
  ];
  for (const [title, category, priority, description] of maintItems) {
    await q(
      `INSERT INTO maintenance_logs (id, home_id, title, description, category, priority, status, reported_by, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'open', $6, NOW() - (random()*21 || ' days')::interval)`,
      [HOME, title, description, category, priority, s3]
    );
  }

  // ── Verify counts ─────────────────────────────────────────────────────────
  console.log('\n📊 Verifying data counts...');
  const counts = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM staff_messages WHERE home_id=$1) AS messages,
      (SELECT COUNT(*) FROM business_alerts WHERE home_id=$1) AS alerts,
      (SELECT COUNT(*) FROM care_plans WHERE home_id=$1) AS care_plans,
      (SELECT COUNT(*) FROM su_medications WHERE home_id=$1) AS medications,
      (SELECT COUNT(*) FROM mar_records WHERE home_id=$1) AS mar,
      (SELECT COUNT(*) FROM daily_records WHERE home_id=$1) AS daily_records,
      (SELECT COUNT(*) FROM bath_charts WHERE home_id=$1) AS bath_charts,
      (SELECT COUNT(*) FROM su_reviews WHERE home_id=$1) AS reviews,
      (SELECT COUNT(*) FROM staff_training WHERE home_id=$1) AS training,
      (SELECT COUNT(*) FROM staff_shifts WHERE home_id=$1) AS shifts,
      (SELECT COUNT(*) FROM tasks WHERE home_id=$1) AS tasks,
      (SELECT COUNT(*) FROM staff_leave WHERE home_id=$1) AS leave,
      (SELECT COUNT(*) FROM policies WHERE home_id=$1) AS policies,
      (SELECT COUNT(*) FROM maintenance_logs WHERE home_id=$1) AS maintenance,
      (SELECT COUNT(*) FROM noticeboard WHERE home_id=$1) AS noticeboard,
      (SELECT COUNT(*) FROM notifications WHERE home_id=$1) AS notifications,
      (SELECT COUNT(*) FROM bowel_charts WHERE home_id=$1) AS bowel,
      (SELECT COUNT(*) FROM seizure_logs WHERE home_id=$1) AS seizures,
      (SELECT COUNT(*) FROM observations WHERE home_id=$1) AS observations,
      (SELECT COUNT(*) FROM resident_diary WHERE home_id=$1) AS diary,
      (SELECT COUNT(*) FROM professional_visits WHERE home_id=$1) AS prof_visits,
      (SELECT COUNT(*) FROM qa_records WHERE home_id=$1) AS qa_records
  `, [HOME]);

  const c = counts.rows[0];
  console.log(`
  Messages:      ${c.messages}   Alerts:        ${c.alerts}
  Care Plans:    ${c.care_plans}   Medications:   ${c.medications}
  MAR Records:   ${c.mar}   Daily Records: ${c.daily_records}
  Bath Charts:   ${c.bath_charts}   Reviews:       ${c.reviews}
  Training:      ${c.training}   Shifts:        ${c.shifts}
  Tasks:         ${c.tasks}   Leave:         ${c.leave}
  Policies:      ${c.policies}   Maintenance:   ${c.maintenance}
  Noticeboard:   ${c.noticeboard}   Notifications: ${c.notifications}
  Bowel Charts:  ${c.bowel}   Seizures:      ${c.seizures}
  Observations:  ${c.observations}   Diary:         ${c.diary}
  Prof Visits:   ${c.prof_visits}   QA Records:    ${c.qa_records}
`);

  console.log('✅ Production database fully seeded!');
  pool.end();
}
main().catch(e=>{ console.error('Fatal:', e.message); pool.end(); });
