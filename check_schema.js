const { Pool } = require('pg');
const url = process.argv[2];
const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

async function main() {
  const client = await pool.connect();

  // List all tables
  const tables = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`);
  console.log('\n=== TABLES ===');
  tables.rows.forEach(r => console.log(' ', r.table_name));

  // Check specific columns
  const checks = [
    ['organisations', 'registration_code'],
    ['homes', 'city'],
    ['staff', 'leave_hours_remaining'],
    ['service_users', 'latitude'],
    ['service_users', 'longitude'],
  ];
  console.log('\n=== MISSING COLUMNS ===');
  for (const [table, col] of checks) {
    const r = await client.query(
      `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name=$2`,
      [table, col]
    );
    if (r.rows.length === 0) console.log(`  MISSING: ${table}.${col}`);
    else console.log(`  OK: ${table}.${col}`);
  }

  client.release();
  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
