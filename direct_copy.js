/**
 * Direct DB-to-DB copy: reads from local PostgreSQL, writes to Render
 * Only copies columns that exist in BOTH databases — no schema mismatch errors
 * Usage: node direct_copy.js "<RENDER_DATABASE_URL>"
 */
const { Pool } = require('pg');

const renderUrl = process.argv[2];
if (!renderUrl) { console.error('Usage: node direct_copy.js "<RENDER_URL>"'); process.exit(1); }

const local = new Pool({ host: 'localhost', port: 5432, database: 'healthark', user: 'postgres', password: 'adeniji1234', ssl: false });
const remote = new Pool({ connectionString: renderUrl, ssl: { rejectUnauthorized: false } });

// Tables in dependency order (parents before children)
const TABLES = [
  'organisations', 'homes', 'staff', 'service_users',
  'care_plans', 'care_plan_updates',
  'risk_assessments', 'risk_assessment_updates',
  'safeguarding_concerns',
  'records_incidents', 'daily_records',
  'records_behaviour', 'records_bowel', 'records_communication',
  'records_food_drink', 'records_oral_care', 'records_personal_care',
  'records_repositioning', 'records_social_activity', 'records_visits',
  'records_welfare_check', 'records_vitals', 'records_one_to_one',
  'records_handover', 'records_prn_medication',
  'su_medications', 'mar_records',
  'medication_stock', 'medication_stock_log',
  'staff_training', 'ppe_inventory', 'ppe_transactions',
  'business_alerts', 'notifications',
  'audit_reports', 'policies', 'policy_sign_offs',
  'calendar_events', 'assessments', 'capacity_assessments',
  'quality_records', 'must_scores', 'professional_involvement',
  'messages', 'staff_onboarding', 'su_contacts', 'su_documents',
  'shifts', 'clock_events', 'tasks', 'reviews', 'signatures',
];

async function getTableColumns(pool, table) {
  const r = await pool.query(
    `SELECT column_name, is_nullable, column_default, udt_name
     FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`,
    [table]
  );
  return r.rows;
}

async function tableExists(pool, table) {
  const r = await pool.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`,
    [table]
  );
  return r.rows.length > 0;
}

function escape(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return String(val);
  if (val instanceof Date) return `'${val.toISOString()}'`;
  if (Array.isArray(val)) return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  // Empty string for enum columns — use NULL instead to avoid invalid enum errors
  if (val === '') return 'NULL';
  return `'${String(val).replace(/'/g, "''")}'`;
}

function safeDefault(colInfo) {
  const t = colInfo.udt_name;
  if (t === 'bool') return 'FALSE';
  if (['int2','int4','int8','float4','float8','numeric'].includes(t)) return '0';
  if (t === 'timestamptz' || t === 'timestamp') return `'${new Date().toISOString()}'`;
  if (t === 'date') return `'${new Date().toISOString().slice(0,10)}'`;
  return "''";
}

async function copyTable(localClient, remoteClient, table) {
  const [localColRows, remoteColRows] = await Promise.all([
    getTableColumns(local, table),
    getTableColumns(remote, table),
  ]);

  const remoteMap = {};
  for (const c of remoteColRows) remoteMap[c.column_name] = c;

  // Only copy columns that exist in both
  const cols = localColRows.map(r => r.column_name).filter(c => remoteMap[c]);
  if (cols.length === 0) { console.log(`  ${table}: no common columns, skipped`); return 0; }

  const rows = await localClient.query(`SELECT ${cols.map(c => `"${c}"`).join(',')} FROM ${table} LIMIT 50000`);
  if (rows.rows.length === 0) return 0;

  let inserted = 0, skipped = 0;
  const colList = cols.map(c => `"${c}"`).join(', ');

  for (const row of rows.rows) {
    // Build only columns whose value is non-null OR have a DB default to fall back on
    const useCols = [];
    const useVals = [];
    for (const c of cols) {
      const val = row[c];
      const isNull = val === null || val === undefined;
      const isNotNull = remoteMap[c].is_nullable === 'NO';
      if (isNull && isNotNull) {
        if (remoteMap[c].column_default) continue;
        useCols.push(`"${c}"`);
        useVals.push(safeDefault(remoteMap[c]));
      } else {
        useCols.push(`"${c}"`);
        // Cast boolean→integer when remote column is an integer type
        const remoteType = remoteMap[c].udt_name;
        if (typeof val === 'boolean' && ['int2','int4','int8'].includes(remoteType)) {
          useVals.push(val ? '1' : '0');
        } else {
          useVals.push(escape(val));
        }
      }
    }

    const sql = `INSERT INTO ${table} (${useCols.join(', ')}) VALUES (${useVals.join(', ')}) ON CONFLICT DO NOTHING`;
    try {
      const r = await remoteClient.query(sql);
      if (r.rowCount > 0) inserted++;
      else skipped++;
    } catch (e) {
      if (inserted + skipped < 3) console.log(`    ERR (${table}): ${e.message.split('\n')[0].substring(0,120)}`);
      skipped++;
    }
  }
  return inserted;
}

async function main() {
  const localClient = await local.connect();
  const remoteClient = await remote.connect();

  // Disable FK checks and triggers for the session
  try { await remoteClient.query("SET session_replication_role = replica") } catch (e) {
    console.log('  Note: could not disable FK checks (limited privileges), using safe insert order');
  }

  let total = 0;
  for (const table of TABLES) {
    const localExists = await tableExists(local, table);
    const remoteExists = await tableExists(remote, table);
    if (!localExists) { console.log(`  SKIP (no local): ${table}`); continue; }
    if (!remoteExists) { console.log(`  SKIP (no remote): ${table}`); continue; }

    try {
      const n = await copyTable(localClient, remoteClient, table);
      if (n > 0) { console.log(`  ✓ ${table}: ${n} rows`); total += n; }
      else console.log(`  - ${table}: 0 new rows`);
    } catch (e) {
      console.log(`  ✗ ${table}: ${e.message.split('\n')[0]}`);
    }
  }

  try { await remoteClient.query("SET session_replication_role = DEFAULT") } catch {}

  console.log(`\nTotal inserted: ${total} rows`);
  localClient.release();
  remoteClient.release();
  await Promise.all([local.end(), remote.end()]);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
