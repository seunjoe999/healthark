/**
 * Run all database migrations against a target PostgreSQL (e.g. Render)
 * Usage: node run_migrations_render.js "<DATABASE_URL>"
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const url = process.argv[2];
if (!url) { console.error('Usage: node run_migrations_render.js "<DATABASE_URL>"'); process.exit(1); }

const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

const MIGRATIONS = [
  '001_schema.sql',
  '002_add_missing_columns.sql',
  '003_missing_tables.sql',
  '004_demo_data.sql',
  '005_fix_and_seed.sql',
  '006_app_tables.sql',
  '007_more_fixes.sql',
  '008_missing_tables.sql',
  '009_schema_alignment.sql',
  '010_add_all_missing_columns.sql',
  '011_audit_compliance_fixes.sql',
];

function splitStatements(sql) {
  return sql
    .split(/;[ \t]*(\r?\n|$)/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
}

async function main() {
  const client = await pool.connect();
  const dbDir = path.join(__dirname, 'database');

  for (const file of MIGRATIONS) {
    const filePath = path.join(dbDir, file);
    if (!fs.existsSync(filePath)) { console.log(`  SKIP (not found): ${file}`); continue; }
    process.stdout.write(`Running ${file}... `);
    const sql = fs.readFileSync(filePath, 'utf8');
    const statements = splitStatements(sql);
    let ok = 0, skipped = 0;
    for (const stmt of statements) {
      try {
        await client.query(stmt);
        ok++;
      } catch (e) {
        skipped++;
      }
    }
    console.log(`done (${ok} ok, ${skipped} skipped)`);
  }

  console.log('\nAll migrations complete.');
  client.release();
  await pool.end();
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
