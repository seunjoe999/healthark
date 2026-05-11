import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from '../config/database';

async function reset() {
  const newPassword = 'Admin1234';
  const hash = await bcrypt.hash(newPassword, 12);
  await pool.query(
    "UPDATE staff SET password_hash = $1 WHERE email = 'admin@compcarehub.co.uk'",
    [hash]
  );
  await pool.query(
    "UPDATE staff SET password_hash = $1 WHERE email = 'manager@compcarehub.co.uk'",
    [await bcrypt.hash('Manager1234', 12)]
  );
  await pool.query(
    "UPDATE staff SET password_hash = $1 WHERE email = 'staff@compcarehub.co.uk'",
    [await bcrypt.hash('Staff1234', 12)]
  );
  console.log('Passwords reset:');
  console.log('  admin@compcarehub.co.uk   -> Admin1234');
  console.log('  manager@compcarehub.co.uk -> Manager1234');
  console.log('  staff@compcarehub.co.uk   -> Staff1234');
  await pool.end();
}

reset().catch(e => { console.error(e); process.exit(1); });
