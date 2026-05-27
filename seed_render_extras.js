// Seed missing data: clock events, timesheets, medicine risk, performance, care outcomes
const { Pool } = require('./backend/node_modules/pg');
const pool = new Pool({
  connectionString: 'postgresql://healthark_user:yplXYLHUaPksCpMi57e6PebPK0Yi6laF@dpg-d88dabjbc2fs73eqf960-a.oregon-postgres.render.com/healthark',
  ssl: { rejectUnauthorized: false },
});
const HOME = '5c027814-a0f9-44f3-bad4-138e4783fd51';

async function q(sql, params) {
  try { const r = await pool.query(sql, params); return r; }
  catch(e) { console.warn('  SKIP:', e.message.split('\n')[0].slice(0, 120)); return null; }
}

function daysAgo(n, hour = 8, min = 0) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
}

async function main() {
  const staffRes = await pool.query(
    "SELECT id, first_name, last_name FROM staff WHERE home_id=$1 AND is_active=true ORDER BY created_at LIMIT 10", [HOME]
  );
  const suRes = await pool.query(
    "SELECT id, first_name, last_name FROM service_users WHERE home_id=$1 AND status='live' ORDER BY created_at LIMIT 10", [HOME]
  );
  const staff = staffRes.rows;
  const sus = suRes.rows;

  if (!staff.length || !sus.length) {
    console.error('No staff or service users found for home', HOME);
    process.exit(1);
  }

  const s0 = staff[0].id;
  const s1 = (staff[1] || staff[0]).id;
  const s2 = (staff[2] || staff[0]).id;
  const s3 = (staff[3] || staff[0]).id;
  const s4 = (staff[4] || staff[0]).id;

  // ── Staff Clock Events (3 weeks of data for 5 staff) ──────────────────────
  console.log('🕐 Clock events...');

  // Each staff member: Mon-Fri, clock in at 8am, out at 4pm
  // 3 weeks ago through last week
  const shiftData = [
    { staffId: s0, startHour: 7, endHour: 15 },
    { staffId: s1, startHour: 8, endHour: 16 },
    { staffId: s2, startHour: 14, endHour: 22 },
    { staffId: s3, startHour: 7, endHour: 15 },
    { staffId: s4, startHour: 8, endHour: 16 },
  ];

  for (const { staffId, startHour, endHour } of shiftData) {
    // 3 weeks of Mon-Fri
    for (let week = 3; week >= 1; week--) {
      for (let dayOfWeek = 0; dayOfWeek < 5; dayOfWeek++) {
        const daysBack = week * 7 - dayOfWeek;
        const clockInTime = daysAgo(daysBack, startHour, 0);
        const clockOutTime = daysAgo(daysBack, endHour, 0);

        await q(
          `INSERT INTO staff_clock_events (id, staff_id, home_id, event_type, event_time, geofence_passed, qr_scan_used, punctuality, created_at)
           VALUES (gen_random_uuid(), $1, $2, 'clock_in', $3, true, false, 'on_time', $3)`,
          [staffId, HOME, clockInTime]
        );
        await q(
          `INSERT INTO staff_clock_events (id, staff_id, home_id, event_type, event_time, geofence_passed, qr_scan_used, created_at)
           VALUES (gen_random_uuid(), $1, $2, 'clock_out', $3, true, false, $3)`,
          [staffId, HOME, clockOutTime]
        );
      }
    }
  }
  console.log('  ✓ Clock events inserted');

  // ── Timesheets (3 weeks for 5 staff) ──────────────────────────────────────
  console.log('📋 Timesheets...');

  function getMondayOfWeek(weeksAgo) {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) - weeksAgo * 7;
    d.setDate(diff);
    return d.toISOString().split('T')[0];
  }

  for (const { staffId } of shiftData) {
    for (let week = 3; week >= 1; week--) {
      const weekStart = getMondayOfWeek(week);
      const weekEndDate = new Date(weekStart);
      weekEndDate.setDate(weekEndDate.getDate() + 6);
      const weekEnd = weekEndDate.toISOString().split('T')[0];
      const totalHours = 40.00;
      const status = week === 1 ? 'pending' : 'approved';

      const tsRes = await q(
        `INSERT INTO timesheets (id, staff_id, home_id, week_start, week_end, total_hours, regular_hours, overtime_hours, status, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $5, 0.00, $6, NOW())
         ON CONFLICT (staff_id, week_start) DO NOTHING
         RETURNING id`,
        [staffId, HOME, weekStart, weekEnd, totalHours, status]
      );

      if (!tsRes || !tsRes.rows.length) continue;
      const tsId = tsRes.rows[0]?.id;
      if (!tsId) continue;

      // Insert 5 daily entries (Mon-Fri)
      const shiftStart = shiftData.find(s => s.staffId === staffId)?.startHour || 8;
      const shiftEnd = shiftData.find(s => s.staffId === staffId)?.endHour || 16;
      for (let d = 0; d < 5; d++) {
        const workDate = new Date(weekStart);
        workDate.setDate(workDate.getDate() + d);
        const dateStr = workDate.toISOString().split('T')[0];
        const startTime = `${String(shiftStart).padStart(2,'0')}:00`;
        const endTime = `${String(shiftEnd).padStart(2,'0')}:00`;
        await q(
          `INSERT INTO timesheet_entries (id, timesheet_id, work_date, start_time, end_time, hours_worked, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, 8.00, NOW())`,
          [tsId, dateStr, startTime, endTime]
        );
      }
    }
  }
  console.log('  ✓ Timesheets inserted');

  // ── Medicine Risk Assessments (one per SU) ────────────────────────────────
  console.log('💊 Medicine risk assessments...');

  const riskData = [
    { swallowing: 'none',   route: 'oral',    risk: 'low',    allergies: null,           covert: false, prn: false, crush: false },
    { swallowing: 'low',    route: 'oral',    risk: 'medium', allergies: 'Penicillin',   covert: false, prn: true,  crush: false },
    { swallowing: 'medium', route: 'oral',    risk: 'high',   allergies: 'NSAIDs',       covert: true,  prn: true,  crush: true  },
    { swallowing: 'none',   route: 'patch',   risk: 'low',    allergies: null,           covert: false, prn: false, crush: false },
    { swallowing: 'none',   route: 'inhaler', risk: 'low',    allergies: 'Aspirin',      covert: false, prn: true,  crush: false },
    { swallowing: 'high',   route: 'oral',    risk: 'high',   allergies: 'Metformin',    covert: true,  prn: false, crush: true  },
    { swallowing: 'none',   route: 'oral',    risk: 'medium', allergies: null,           covert: false, prn: true,  crush: false },
    { swallowing: 'low',    route: 'topical', risk: 'low',    allergies: null,           covert: false, prn: false, crush: false },
    { swallowing: 'none',   route: 'oral',    risk: 'low',    allergies: 'Sulfonamides', covert: false, prn: false, crush: false },
    { swallowing: 'medium', route: 'oral',    risk: 'medium', allergies: null,           covert: false, prn: true,  crush: false },
  ];

  for (let i = 0; i < sus.length; i++) {
    const su = sus[i];
    const rd = riskData[i % riskData.length];
    const daysBack = Math.floor(Math.random() * 60) + 7;
    const reviewDate = new Date();
    reviewDate.setMonth(reviewDate.getMonth() + 6);

    await q(
      `INSERT INTO medicine_risk_assessments
         (id, home_id, su_id, assessed_by, assessed_at, self_medicate, swallowing_risk, covert_meds,
          prn_protocol, crushing_required, administration_route, known_allergies, storage_location,
          risk_level, risk_notes, review_date, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, NOW() - ($4 || ' days')::interval, false, $5, $6, $7, $8, $9, $10,
               'Locked cabinet', $11, 'Assessed as part of quarterly medication review', $12, NOW())`,
      [HOME, su.id, s0, daysBack, rd.swallowing, rd.covert, rd.prn, rd.crush, rd.route,
       rd.allergies, rd.risk, reviewDate.toISOString().split('T')[0]]
    );
  }
  console.log('  ✓ Medicine risk assessments inserted');

  // ── Staff Performance Matrix ──────────────────────────────────────────────
  console.log('📊 Staff performance reviews...');

  const periods = ['March 2026', 'April 2026', 'May 2026'];
  const perfData = [
    { punct: 5, attitude: 5, care: 5, doc: 4, team: 5, overall: 4.8, risk: 'low',    training: 100, strengths: 'Excellent punctuality, great resident rapport', improve: 'Documentation speed' },
    { punct: 4, attitude: 4, care: 4, doc: 3, team: 4, overall: 3.8, risk: 'low',    training: 90,  strengths: 'Good team player, compassionate care', improve: 'MAR completion timeliness' },
    { punct: 3, attitude: 4, care: 3, doc: 3, team: 3, overall: 3.2, risk: 'medium', training: 75,  strengths: 'Caring attitude towards residents', improve: 'Punctuality, documentation, training compliance' },
    { punct: 5, attitude: 5, care: 5, doc: 5, team: 5, overall: 5.0, risk: 'low',    training: 100, strengths: 'Outstanding in all areas, role model for team', improve: 'Continue current performance' },
    { punct: 4, attitude: 3, care: 4, doc: 4, team: 3, overall: 3.6, risk: 'low',    training: 85,  strengths: 'Good care quality, reliable', improve: 'Communication with team, attitude under pressure' },
  ];

  for (let i = 0; i < Math.min(staff.length, 5); i++) {
    const staffMember = staff[i];
    const pd = perfData[i % perfData.length];
    // Insert for most recent two periods
    for (let p = 0; p < 2; p++) {
      const period = periods[periods.length - 1 - p];
      await q(
        `INSERT INTO staff_performance
           (id, home_id, staff_id, assessed_by, period, training_compliance, supervision_completed,
            supervisions_due, supervisions_done, punctuality_score, attitude_score, care_quality_score,
            documentation_score, teamwork_score, overall_score, risk_rating, strengths, areas_improvement,
            action_plan, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, true, 2, 2, $6, $7, $8, $9, $10, $11, $12, $13, $14,
                 'Continue monthly supervisions and complete outstanding training', NOW() - ($15 || ' days')::interval)`,
        [HOME, staffMember.id, s0, period, pd.training, pd.punct, pd.attitude, pd.care, pd.doc, pd.team,
         pd.overall, pd.risk, pd.strengths, pd.improve, p * 35]
      );
    }
  }
  console.log('  ✓ Staff performance reviews inserted');

  // ── Care Outcomes ─────────────────────────────────────────────────────────
  console.log('🎯 Care outcomes...');

  const outcomeTemplates = [
    { goal: 'Improve mobility and independence with walking', description: 'Resident to walk 10 metres independently with frame within 3 months', status: 'ongoing' },
    { goal: 'Maintain hydration above daily target', description: 'Ensure minimum 1500ml fluid intake per day to prevent UTIs and dehydration', status: 'yes' },
    { goal: 'Engage in daily social activities', description: 'Participate in at least one group activity per day to reduce social isolation', status: 'ongoing' },
    { goal: 'Manage pain levels effectively', description: 'Pain score to remain below 4/10 at all times through medication and positioning', status: 'partially' },
    { goal: 'Maintain skin integrity and prevent pressure sores', description: 'Zero pressure sore incidents through regular repositioning and skin assessments', status: 'yes' },
    { goal: 'Improve oral hygiene routine compliance', description: 'Resident to accept oral care twice daily with appropriate support', status: 'ongoing' },
    { goal: 'Reduce falls incidents', description: 'No falls in a 3-month period through environmental adaptations and fall prevention plan', status: 'partially' },
    { goal: 'Maintain weight within healthy range', description: 'Body weight to remain stable within 5% over 3 months through nutritional monitoring', status: 'ongoing' },
  ];

  for (let i = 0; i < sus.length; i++) {
    const su = sus[i];
    // 2 outcomes per SU
    for (let j = 0; j < 2; j++) {
      const tpl = outcomeTemplates[(i * 2 + j) % outcomeTemplates.length];
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + 3);
      const daysBack = Math.floor(Math.random() * 30) + 5;

      await q(
        `INSERT INTO care_outcomes
           (id, su_id, home_id, goal, description, target_date, status, created_by, updated_by, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6::outcome_status, $7, $7,
                 NOW() - ($8 || ' days')::interval, NOW() - ($8 || ' days')::interval)`,
        [su.id, HOME, tpl.goal, tpl.description, targetDate.toISOString().split('T')[0],
         tpl.status, s0, daysBack]
      );
    }
  }
  console.log('  ✓ Care outcomes inserted');

  console.log('\n✅ All extras seeded successfully!');
  await pool.end();
}

main().catch(e => { console.error(e); pool.end(); process.exit(1); });
