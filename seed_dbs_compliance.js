// Seed DBS, References, Right to Work for staff
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

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function monthsAhead(n) {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  return d.toISOString().split('T')[0];
}

async function main() {
  const staffRes = await pool.query(
    "SELECT id, first_name, last_name FROM staff WHERE home_id=$1 AND is_active=true ORDER BY created_at LIMIT 10", [HOME]
  );
  const staff = staffRes.rows;

  if (!staff.length) {
    console.error('No staff found for home', HOME);
    process.exit(1);
  }

  console.log(`Found ${staff.length} staff members`);

  // ── DBS Records ────────────────────────────────────────────────────────────
  console.log('\n🔐 DBS Records...');

  const dbsData = [
    { type: 'enhanced_barred', daysAgoIssue: 90,  status: 'valid' },
    { type: 'enhanced',        daysAgoIssue: 400, status: 'valid' },
    { type: 'enhanced_barred', daysAgoIssue: 180, status: 'valid' },
    { type: 'enhanced',        daysAgoIssue: 60,  status: 'valid' },
    { type: 'enhanced_barred', daysAgoIssue: 730, status: 'expiring_soon' },
    { type: 'enhanced',        daysAgoIssue: 300, status: 'valid' },
    { type: 'enhanced_barred', daysAgoIssue: 120, status: 'valid' },
    { type: 'enhanced',        daysAgoIssue: 45,  status: 'valid' },
    { type: 'enhanced_barred', daysAgoIssue: 200, status: 'valid' },
    { type: 'enhanced',        daysAgoIssue: 500, status: 'expiring_soon' },
  ];

  for (let i = 0; i < staff.length; i++) {
    const s = staff[i];
    const d = dbsData[i % dbsData.length];
    const issueDate = daysAgo(d.daysAgoIssue);
    // DBS numbers are 12 digits
    const dbsNum = `${String(Math.floor(Math.random() * 9000000000) + 1000000000)}${String(Math.floor(Math.random() * 90) + 10)}`;

    await q(
      `INSERT INTO staff_dbs (id, staff_id, home_id, dbs_number, dbs_type, issue_date, update_service, status, notes, created_by, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       ON CONFLICT DO NOTHING`,
      [s.id, HOME, dbsNum, d.type, issueDate, true, d.status,
       'DBS check completed as part of pre-employment screening',
       staff[0].id]
    );
    console.log(`  ✓ DBS for ${s.first_name} ${s.last_name}`);
  }

  // ── References ─────────────────────────────────────────────────────────────
  console.log('\n📄 References...');

  const refData = [
    { name: 'Dr Sarah Mitchell',   pos: 'Clinical Director',      co: 'Sunrise Care Group',       email: 'smitchell@sunrisecare.co.uk',   status: 'valid' },
    { name: 'James Thornton',      pos: 'Home Manager',           co: 'Oakwood Residential Home',  email: 'j.thornton@oakwood.co.uk',      status: 'valid' },
    { name: 'Patricia O\'Brien',   pos: 'Senior Nurse',           co: 'St. Mary\'s Hospital',      email: 'pobrien@stmarys.nhs.uk',        status: 'valid' },
    { name: 'Robert Chambers',     pos: 'Operations Manager',     co: 'CarePlus Ltd',              email: 'rchambers@careplus.co.uk',      status: 'valid' },
    { name: 'Angela Fitzpatrick',  pos: 'Deputy Manager',         co: 'Elmwood Care Home',         email: 'a.fitzpatrick@elmwood.co.uk',   status: 'valid' },
    { name: 'Thomas Whitfield',    pos: 'Ward Manager',           co: 'Northgate Hospital',        email: 'twhitfield@northgate.nhs.uk',   status: 'valid' },
    { name: 'Gillian Hartley',     pos: 'HR Manager',             co: 'Helping Hands Care',        email: 'ghartley@helpinghands.co.uk',   status: 'valid' },
    { name: 'Michael Pearson',     pos: 'Care Home Owner',        co: 'Pearson Care Group',        email: 'm.pearson@pearsoncare.co.uk',   status: 'valid' },
    { name: 'Susan Blackwood',     pos: 'Registered Manager',     co: 'Birchwood Nursing Home',    email: 's.blackwood@birchwood.co.uk',   status: 'valid' },
    { name: 'David Nkemdirim',     pos: 'Community Matron',       co: 'NHS Community Trust',       email: 'd.nkemdirim@nhstrust.co.uk',    status: 'valid' },
  ];

  for (let i = 0; i < staff.length; i++) {
    const s = staff[i];
    // Two references per staff
    for (let j = 0; j < 2; j++) {
      const rd = refData[(i * 2 + j) % refData.length];
      const recDate = daysAgo(Math.floor(Math.random() * 60) + 10);
      await q(
        `INSERT INTO staff_references (id, staff_id, home_id, referee_name, referee_position, referee_company, referee_email, reference_type, received_date, status, notes, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'professional', $7, $8, $9, NOW())
         ON CONFLICT DO NOTHING`,
        [s.id, HOME, rd.name, rd.pos, rd.co, rd.email, recDate, rd.status,
         'Reference received and verified satisfactory']
      );
    }
    console.log(`  ✓ References for ${s.first_name} ${s.last_name}`);
  }

  // ── Right to Work ──────────────────────────────────────────────────────────
  console.log('\n🪪 Right to Work...');

  const rtwData = [
    { docType: 'British Passport',              docNum: `P${Math.floor(Math.random()*900000000+100000000)}`, expiry: monthsAhead(48), status: 'valid' },
    { docType: 'British Passport',              docNum: `P${Math.floor(Math.random()*900000000+100000000)}`, expiry: monthsAhead(36), status: 'valid' },
    { docType: 'EU Settled Status',             docNum: `SS${Math.floor(Math.random()*900000+100000)}`,      expiry: null,             status: 'valid' },
    { docType: 'UK Biometric Residence Permit', docNum: `BRP${Math.floor(Math.random()*900000+100000)}`,    expiry: monthsAhead(12),  status: 'expiring_soon' },
    { docType: 'British Passport',              docNum: `P${Math.floor(Math.random()*900000000+100000000)}`, expiry: monthsAhead(24), status: 'valid' },
    { docType: 'Irish Passport',                docNum: `TP${Math.floor(Math.random()*900000000+100000000)}`, expiry: monthsAhead(60), status: 'valid' },
    { docType: 'British National (Overseas)',   docNum: `BNO${Math.floor(Math.random()*900000+100000)}`,    expiry: monthsAhead(18),  status: 'valid' },
    { docType: 'British Passport',              docNum: `P${Math.floor(Math.random()*900000000+100000000)}`, expiry: monthsAhead(54), status: 'valid' },
    { docType: 'EU Settled Status',             docNum: `SS${Math.floor(Math.random()*900000+100000)}`,      expiry: null,             status: 'valid' },
    { docType: 'UK Biometric Residence Permit', docNum: `BRP${Math.floor(Math.random()*900000+100000)}`,    expiry: monthsAhead(8),   status: 'expiring_soon' },
  ];

  for (let i = 0; i < staff.length; i++) {
    const s = staff[i];
    const rd = rtwData[i % rtwData.length];
    await q(
      `INSERT INTO staff_right_to_work (id, staff_id, home_id, document_type, document_number, expiry_date, status, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT DO NOTHING`,
      [s.id, HOME, rd.docType, rd.docNum, rd.expiry, rd.status]
    );
    console.log(`  ✓ Right to Work for ${s.first_name} ${s.last_name}`);
  }

  console.log('\n✅ DBS & Compliance seeding complete!');
  await pool.end();
}

main().catch(e => { console.error(e); pool.end(); process.exit(1); });
