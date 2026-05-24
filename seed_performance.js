// Seed performance matrix records
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

const STRENGTHS = [
  'Excellent time-keeping and reliability, consistently punctual across all shifts',
  'Outstanding care quality and compassionate approach with residents',
  'Strong teamwork and communication with colleagues on all shifts',
  'Thorough documentation and attention to detail in care records',
  'Proactive attitude and willingness to take on additional responsibilities',
  'Excellent medication administration skills and adherence to protocols',
  'Highly organised and efficient, completing tasks to a high standard',
];

const IMPROVEMENTS = [
  'Continue to develop documentation skills and ensure records are completed promptly',
  'Build confidence in leading handover meetings and communicating concerns to management',
  'Focus on time management when completing care plans during busy periods',
  'Improve awareness of infection control procedures and PPE compliance',
  'Enhance knowledge of safeguarding procedures and reporting thresholds',
];

const ACTION_PLANS = [
  'Complete mandatory online training modules by end of month. Shadow senior carer for one shift per week.',
  'Attend next team meeting to discuss communication strategies. Review care plan training.',
  'Work with deputy manager to create a personal development plan over the next quarter.',
  'Complete additional safeguarding training. Review incident reporting procedures.',
  'Schedule supervision with manager monthly. Focus on documentation quality.',
];

const PERIODS = [
  'May 2026', 'April 2026', 'March 2026', 'February 2026', 'January 2026',
];

async function main() {
  const staffRes = await pool.query(
    "SELECT id, first_name, last_name, role FROM staff WHERE home_id=$1 AND is_active=true ORDER BY created_at LIMIT 10",
    [HOME]
  );
  const staff = staffRes.rows;

  if (!staff.length) {
    console.error('No staff found for home', HOME);
    process.exit(1);
  }

  const managerId = staff.find(s => s.role === 'home_manager')?.id || staff[0].id;

  console.log(`Found ${staff.length} staff members`);
  console.log('\n📊 Seeding performance matrix records...');

  let inserted = 0;

  for (const s of staff) {
    const ri = Math.floor(Math.random() * staff.length);
    const punctuality = Math.floor(Math.random() * 2) + 4; // 4-5
    const attitude = Math.floor(Math.random() * 2) + 3;    // 3-5
    const careQuality = Math.floor(Math.random() * 2) + 3; // 3-5
    const documentation = Math.floor(Math.random() * 3) + 2; // 2-4
    const teamwork = Math.floor(Math.random() * 2) + 3;    // 3-5
    const overallScore = ((punctuality + attitude + careQuality + documentation + teamwork) / 5).toFixed(1);
    const trainingCompliance = Math.floor(Math.random() * 30) + 70; // 70-100%
    const supervisionsDue = 2;
    const supervisionsDone = Math.random() > 0.2 ? 2 : 1;
    const riskRating = documentation < 3 ? 'medium' : 'low';

    const period = PERIODS[Math.floor(Math.random() * PERIODS.length)];
    const strength = STRENGTHS[ri % STRENGTHS.length];
    const improvement = IMPROVEMENTS[ri % IMPROVEMENTS.length];
    const actionPlan = ACTION_PLANS[ri % ACTION_PLANS.length];

    const r = await q(
      `INSERT INTO staff_performance (
        home_id, staff_id, assessed_by, period,
        training_compliance, supervision_completed, supervisions_due, supervisions_done,
        incidents_reported, punctuality_score, attitude_score, care_quality_score,
        documentation_score, teamwork_score, overall_score, risk_rating,
        strengths, areas_improvement, action_plan, notes, created_at
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8,
        $9, $10, $11, $12,
        $13, $14, $15, $16,
        $17, $18, $19, $20, NOW() - (random() * interval '60 days')
      ) ON CONFLICT DO NOTHING`,
      [
        HOME, s.id, managerId, period,
        trainingCompliance, supervisionsDone >= supervisionsDue, supervisionsDue, supervisionsDone,
        0, punctuality, attitude, careQuality,
        documentation, teamwork, overallScore, riskRating,
        strength, improvement, actionPlan, '',
      ]
    );
    if (r) {
      inserted++;
      console.log(`  ✓ ${s.first_name} ${s.last_name} (${s.role}) — score ${overallScore} — ${period}`);
    }
  }

  // Add a second month of reviews for some staff
  for (const s of staff.slice(0, 4)) {
    const punctuality = Math.floor(Math.random() * 2) + 3;
    const attitude = Math.floor(Math.random() * 2) + 3;
    const careQuality = Math.floor(Math.random() * 2) + 3;
    const documentation = Math.floor(Math.random() * 3) + 2;
    const teamwork = Math.floor(Math.random() * 2) + 3;
    const overallScore = ((punctuality + attitude + careQuality + documentation + teamwork) / 5).toFixed(1);
    const trainingCompliance = Math.floor(Math.random() * 30) + 65;
    const riskRating = Number(overallScore) < 3 ? 'medium' : 'low';
    const period = 'April 2026';

    const r = await q(
      `INSERT INTO staff_performance (
        home_id, staff_id, assessed_by, period,
        training_compliance, supervision_completed, supervisions_due, supervisions_done,
        incidents_reported, punctuality_score, attitude_score, care_quality_score,
        documentation_score, teamwork_score, overall_score, risk_rating,
        strengths, areas_improvement, action_plan, notes, created_at
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8,
        $9, $10, $11, $12,
        $13, $14, $15, $16,
        $17, $18, $19, $20, NOW() - (random() * interval '30 days')
      ) ON CONFLICT DO NOTHING`,
      [
        HOME, s.id, managerId, period,
        trainingCompliance, true, 2, 2,
        0, punctuality, attitude, careQuality,
        documentation, teamwork, overallScore, riskRating,
        STRENGTHS[(staff.indexOf(s) + 1) % STRENGTHS.length],
        IMPROVEMENTS[(staff.indexOf(s) + 2) % IMPROVEMENTS.length],
        ACTION_PLANS[(staff.indexOf(s)) % ACTION_PLANS.length], '',
      ]
    );
    if (r) inserted++;
  }

  console.log(`\n  ✓ ${inserted} performance reviews inserted`);
  console.log('\n✅ Done!');
  await pool.end();
}

main().catch(e => { console.error(e); pool.end(); process.exit(1); });
