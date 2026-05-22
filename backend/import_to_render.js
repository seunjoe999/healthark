/**
 * Import local data into Render's PostgreSQL
 * Usage: node import_to_render.js <RENDER_DATABASE_URL>
 * Example: node import_to_render.js "postgresql://user:pass@host/dbname?sslmode=require"
 */
const { Pool } = require('pg');
const fs = require('fs');

const url = process.argv[2];
if (!url) {
  console.error('Usage: node import_to_render.js "<RENDER_DATABASE_URL>"');
  console.error('Get the External Database URL from Render dashboard → your PostgreSQL → Info tab');
  process.exit(1);
}

const dataFile = 'healthark_data.sql';
if (!fs.existsSync(dataFile)) {
  console.error('healthark_data.sql not found. Run the export script first.');
  process.exit(1);
}

async function main() {
  const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
  const client = await pool.connect();

  console.log('Connected to Render PostgreSQL');
  const sql = fs.readFileSync(dataFile, 'utf8');
  const statements = sql.split('\n').filter(line =>
    line.trim() && !line.startsWith('--') && line.trim() !== ''
  );

  let ok = 0, skip = 0, errors = 0;
  for (const stmt of statements) {
    const s = stmt.trim();
    if (!s) continue;
    try {
      await client.query(s);
      if (s.startsWith('INSERT')) ok++;
    } catch (e) {
      const msg = e.message.split('\n')[0];
      if (msg.includes('already exists') || msg.includes('ON CONFLICT') || msg.includes('duplicate')) {
        skip++;
      } else if (s.startsWith('INSERT')) {
        console.warn('  WARN:', msg.substring(0, 100));
        errors++;
      }
    }
  }

  console.log(`\nImport complete:`);
  console.log(`  Inserted: ${ok} rows`);
  console.log(`  Skipped (duplicates): ${skip}`);
  console.log(`  Errors: ${errors}`);

  client.release();
  await pool.end();
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
