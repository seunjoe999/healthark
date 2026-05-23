/**
 * Sync schema from local PostgreSQL to Render PostgreSQL
 * Adds any columns that exist locally but not on Render
 * Usage: node sync_schema.js "<RENDER_DATABASE_URL>"
 */
const { Pool } = require('pg');

const renderUrl = process.argv[2];
if (!renderUrl) { console.error('Usage: node sync_schema.js "<RENDER_URL>"'); process.exit(1); }

const local = new Pool({ host: 'localhost', port: 5432, database: 'healthark', user: 'postgres', password: 'adeniji1234', ssl: false });
const remote = new Pool({ connectionString: renderUrl, ssl: { rejectUnauthorized: false } });

async function getColumns(pool) {
  const r = await pool.query(`
    SELECT table_name, column_name, data_type, character_maximum_length,
           numeric_precision, numeric_scale, is_nullable, column_default,
           udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `);
  const map = {};
  for (const row of r.rows) {
    if (!map[row.table_name]) map[row.table_name] = {};
    map[row.table_name][row.column_name] = row;
  }
  return map;
}

function buildColType(col) {
  const dt = col.udt_name === 'uuid' ? 'UUID' :
             col.udt_name === 'bool' ? 'BOOLEAN' :
             col.udt_name === 'int4' ? 'INTEGER' :
             col.udt_name === 'int8' ? 'BIGINT' :
             col.udt_name === 'float8' ? 'DOUBLE PRECISION' :
             col.udt_name === 'numeric' ? `DECIMAL(${col.numeric_precision || 10},${col.numeric_scale || 2})` :
             col.udt_name === 'timestamptz' ? 'TIMESTAMPTZ' :
             col.udt_name === 'timestamp' ? 'TIMESTAMP' :
             col.udt_name === 'date' ? 'DATE' :
             col.udt_name === 'time' ? 'TIME' :
             col.udt_name === 'text' ? 'TEXT' :
             col.udt_name === 'jsonb' ? 'JSONB' :
             col.udt_name === 'json' ? 'JSON' :
             col.character_maximum_length ? `VARCHAR(${col.character_maximum_length})` :
             col.data_type.toUpperCase();
  return dt;
}

async function main() {
  console.log('Comparing schemas...');
  const [localCols, remoteCols] = await Promise.all([getColumns(local), getColumns(remote)]);

  const localClient = await local.connect();
  const remoteClient = await remote.connect();

  let added = 0, skipped = 0;

  for (const [table, cols] of Object.entries(localCols)) {
    if (!remoteCols[table]) {
      console.log(`  SKIP table (not in Render): ${table}`);
      continue;
    }
    for (const [col, info] of Object.entries(cols)) {
      if (remoteCols[table][col]) continue; // already exists
      const colType = buildColType(info);
      // Build safe default
      let colDef = `${colType}`;
      const nullable = info.is_nullable === 'YES';
      if (!nullable) {
        // Use safe defaults for NOT NULL columns
        if (colType.includes('BOOLEAN')) colDef += ' NOT NULL DEFAULT FALSE';
        else if (colType.includes('INT') || colType.includes('DECIMAL') || colType.includes('DOUBLE')) colDef += ' NOT NULL DEFAULT 0';
        else if (colType.includes('TIMESTAMPTZ') || colType.includes('TIMESTAMP')) colDef += ' NOT NULL DEFAULT NOW()';
        else colDef += ''; // leave nullable for complex types
      }
      const sql = `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS "${col}" ${colDef}`;
      try {
        await remoteClient.query(sql);
        console.log(`  + ${table}.${col} (${colType})`);
        added++;
      } catch (e) {
        console.log(`  ! ${table}.${col}: ${e.message.split('\n')[0].substring(0, 80)}`);
        skipped++;
      }
    }
  }

  console.log(`\nDone: ${added} columns added, ${skipped} skipped`);
  localClient.release();
  remoteClient.release();
  await Promise.all([local.end(), remote.end()]);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
