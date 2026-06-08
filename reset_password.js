/**
 * Reset a staff account password on Render (or any Postgres DB).
 * Usage:
 *   DATABASE_URL="postgres://..." node reset_password.js
 *
 * Edit EMAIL and NEW_PASSWORD below before running.
 */

const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const EMAIL = 'admin@compcarehub.co.uk';   // ← change if needed
const NEW_PASSWORD = 'Admin1234';           // ← change to what you want

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('ERROR: Set DATABASE_URL env var first.\n  e.g. DATABASE_URL="postgres://..." node reset_password.js');
    process.exit(1);
  }

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  // Check if user exists
  const { rows } = await client.query(
    'SELECT id, email, first_name, last_name, role, is_active, status FROM staff WHERE email = $1',
    [EMAIL]
  );

  if (!rows.length) {
    console.log(`\nNo account found for: ${EMAIL}`);
    console.log('\nAll existing accounts:');
    const all = await client.query('SELECT email, first_name, last_name, role, is_active, status FROM staff ORDER BY created_at');
    all.rows.forEach(r => console.log(`  ${r.email}  [${r.role}]  active=${r.is_active}  status=${r.status}`));
    await client.end();
    return;
  }

  const staff = rows[0];
  console.log(`\nFound: ${staff.first_name} ${staff.last_name} <${staff.email}> [${staff.role}]`);
  console.log(`  is_active=${staff.is_active}  status=${staff.status}`);

  // Hash new password
  const hash = await bcrypt.hash(NEW_PASSWORD, 12);

  // Update password and ensure account is active
  await client.query(
    'UPDATE staff SET password_hash=$1, is_active=true, status=$2 WHERE id=$3',
    [hash, 'active', staff.id]
  );

  console.log(`\nPassword reset to: ${NEW_PASSWORD}`);
  console.log('Account set to: is_active=true, status=active');
  console.log('\nYou can now log in with:');
  console.log(`  Email:    ${EMAIL}`);
  console.log(`  Password: ${NEW_PASSWORD}`);

  await client.end();
}

main().catch(err => { console.error(err.message); process.exit(1); });
