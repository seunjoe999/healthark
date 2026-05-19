import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from '../config/database';

async function reset() {
  const newPassword = 'Admin1234';
  const hash = await bcrypt.hash(newPassword, 12);
  await pool.query(
    "UPDATE staff SET password_hash = $1 WHERE email = 'admin@healthark.co.uk'",
    [hash]
  );
  await pool.query(
    "UPDATE staff SET password_hash = $1 WHERE email = 'manager@healthark.co.uk'",
    [await bcrypt.hash('Manager1234', 12)]
  );
  await pool.query(
    "UPDATE staff SET password_hash = $1 WHERE email = 'care1@healthark.co.uk'",
    [await bcrypt.hash('Staff1234', 12)]
  );
  console.log('Passwords reset:');
  console.log('  admin@healthark.co.uk   -> Admin1234');
  console.log('  manager@healthark.co.uk -> Manager1234');
  console.log('  care1@healthark.co.uk   -> Staff1234';
  await pool.end();
}

reset().catch(e => { console.error(e); process.exit(1); });
