/**
 * Export all local database data as SQL INSERT statements
 * Compatible with PostgreSQL 15/16 (what Render uses)
 * Run: node export_for_render.js
 */
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  host: 'localhost', port: 5432, database: 'healthark',
  user: 'postgres', password: 'adeniji1234', ssl: false,
});

// Tables in dependency order (parents before children)
const TABLES = [
  'organisations',
  'homes',
  'staff',
  'service_users',
  'care_plans',
  'care_plan_updates',
  'risk_assessments',
  'risk_assessment_updates',
  'safeguarding_concerns',
  'records_incidents',
  'daily_records',
  'records_behaviour',
  'records_bowel',
  'records_communication',
  'records_food_drink',
  'records_oral_care',
  'records_personal_care',
  'records_repositioning',
  'records_social_activity',
  'records_visits',
  'records_welfare_check',
  'records_vitals',
  'records_one_to_one',
  'records_handover',
  'records_prn_medication',
  'su_medications',
  'mar_records',
  'medication_stock',
  'medication_stock_log',
  'staff_training',
  'ppe_inventory',
  'ppe_transactions',
  'business_alerts',
  'notifications',
  'audit_reports',
  'policies',
  'policy_sign_offs',
  'calendar_events',
  'assessments',
  'capacity_assessments',
  'quality_records',
  'must_scores',
  'professional_involvement',
  'messages',
  'staff_onboarding',
  'su_contacts',
  'su_documents',
  'shifts',
  'clock_events',
  'tasks',
  'reviews',
  'signatures',
];

function escape(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return String(val);
  if (val instanceof Date) return `'${val.toISOString()}'`;
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

async function tableExists(client, table) {
  const r = await client.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`,
    [table]
  );
  return r.rows.length > 0;
}

async function exportTable(client, table, out) {
  if (!await tableExists(client, table)) return 0;
  const r = await client.query(`SELECT * FROM ${table} ORDER BY created_at NULLS FIRST LIMIT 50000`);
  if (!r.rows.length) return 0;

  out.push(`\n-- ${table} (${r.rows.length} rows)`);
  out.push(`ALTER TABLE ${table} DISABLE TRIGGER ALL;`);

  for (const row of r.rows) {
    const cols = Object.keys(row).map(c => `"${c}"`).join(', ');
    const vals = Object.values(row).map(escape).join(', ');
    out.push(`INSERT INTO ${table} (${cols}) VALUES (${vals}) ON CONFLICT DO NOTHING;`);
  }

  out.push(`ALTER TABLE ${table} ENABLE TRIGGER ALL;`);
  return r.rows.length;
}

async function main() {
  const client = await pool.connect();
  const lines = [];

  lines.push('-- CompCare Hub database export for Render');
  lines.push(`-- Generated: ${new Date().toISOString()}`);
  lines.push('-- Run this AFTER the app has started on Render (tables will exist)');
  lines.push('');
  lines.push('SET session_replication_role = replica; -- disable FK checks during import');
  lines.push('');

  let total = 0;
  for (const table of TABLES) {
    try {
      const n = await exportTable(client, table, lines);
      if (n > 0) console.log(`  ✓ ${table}: ${n} rows`);
    } catch (e) {
      console.warn(`  ⚠ ${table}: ${e.message.split('\n')[0]}`);
    }
  }

  lines.push('');
  lines.push('SET session_replication_role = DEFAULT;');
  lines.push('');
  lines.push('-- Update sequences so new IDs don\'t conflict');
  lines.push(`SELECT setval(pg_get_serial_sequence(t.table_name, c.column_name), COALESCE(MAX((t.table_name || '.' || c.column_name)::text::bigint), 1))
FROM information_schema.tables t
JOIN information_schema.columns c ON c.table_name = t.table_name
WHERE c.column_default LIKE 'nextval%' AND t.table_schema = 'public';`);

  const output = lines.join('\n');
  fs.writeFileSync('healthark_data.sql', output, 'utf8');
  console.log(`\nDone! Saved to healthark_data.sql`);
  console.log(`File size: ${(output.length / 1024).toFixed(0)} KB`);

  client.release();
  await pool.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
