const { Pool } = require('pg');

const passwords = ['postgres', 'admin', 'password', 'HealthArk2024', 'HealthArk2024!', 'healthark', 'admin123', 'Password123', 'Postgres2024', ''];

async function tryPassword(pw) {
  const pool = new Pool({ host: 'localhost', port: 5432, database: 'healthark', user: 'postgres', password: pw, ssl: false, connectionTimeoutMillis: 3000 });
  try {
    const c = await pool.connect();
    const r = await c.query('SELECT current_user');
    c.release();
    await pool.end();
    return true;
  } catch (e) {
    await pool.end().catch(() => {});
    return false;
  }
}

async function main() {
  for (const pw of passwords) {
    process.stdout.write('Trying: "' + pw + '" ... ');
    const ok = await tryPassword(pw);
    if (ok) { console.log('SUCCESS!'); process.stdout.write('Password is: ' + pw + '\n'); return pw; }
    else console.log('failed');
  }
  console.log('No common password worked. You need to provide the postgres superuser password.');
}

main().catch(console.error);
