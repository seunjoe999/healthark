const { Pool } = require('pg');
const local = new Pool({ host:'localhost', port:5432, database:'healthark', user:'postgres', password:'adeniji1234', ssl:false });
const remote = new Pool({ connectionString:'postgresql://healthark_user:yplXYLHUaPksCpMi57e6PebPK0Yi6laF@dpg-d88dabjbc2fs73eqf960-a.oregon-postgres.render.com/healthark', ssl:{rejectUnauthorized:false} });

function escape(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return String(val);
  if (val instanceof Date) return `'${val.toISOString()}'`;
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

async function run() {
  const [lc, rc] = await Promise.all([
    local.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='staff' ORDER BY ordinal_position`),
    remote.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='staff' ORDER BY ordinal_position`),
  ]);
  const remoteSet = new Set(rc.rows.map(r => r.column_name));
  const cols = lc.rows.map(r => r.column_name).filter(c => remoteSet.has(c));
  console.log('Common columns:', cols.length);

  const row = await local.query(`SELECT ${cols.map(c => `"${c}"`).join(',')} FROM staff WHERE email='admin@compcarehub.co.uk' LIMIT 1`);
  if (!row.rows.length) { console.log('No staff found'); return; }

  const r = row.rows[0];
  const vals = cols.map(c => escape(r[c])).join(', ');
  const sql = `INSERT INTO staff (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${vals})`;

  console.log('Attempting insert of admin@compcarehub.co.uk...');
  try {
    await remote.query(sql);
    console.log('SUCCESS');
  } catch(e) {
    console.log('ERROR:', e.message);
  }
  await Promise.all([local.end(), remote.end()]);
}
run().catch(e => console.error(e.message));
