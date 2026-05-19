import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from '../config/database';
import { logger } from '../config/logger';

const ORG_ID = '00000000-0000-0000-0000-000000000001';

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const homeRes = await client.query(
      `INSERT INTO homes (organisation_id, name, address1, postcode)
       VALUES ($1, 'Sunrise Care Home', '1 High Street', 'SW1A 1AA') RETURNING id`,
      [ORG_ID]
    );
    const homeId = homeRes.rows[0].id;

    const adminHash = await bcrypt.hash('Admin1234', 12);
    const adminRes = await client.query(
      `INSERT INTO staff (organisation_id, home_id, email, password_hash, first_name, last_name, role)
       VALUES ($1,$2,'admin@healthark.co.uk',$3,'System','Admin','group_admin') RETURNING id`,
      [ORG_ID, homeId, adminHash]
    );
    await client.query('INSERT INTO staff_onboarding (staff_id) VALUES ($1)', [adminRes.rows[0].id]);

    const mgHash = await bcrypt.hash('Manager1234', 12);
    const mgRes = await client.query(
      `INSERT INTO staff (organisation_id, home_id, email, password_hash, first_name, last_name, role)
       VALUES ($1,$2,'manager@healthark.co.uk',$3,'Sarah','Johnson','home_manager') RETURNING id`,
      [ORG_ID, homeId, mgHash]
    );
    await client.query('INSERT INTO staff_onboarding (staff_id) VALUES ($1)', [mgRes.rows[0].id]);

    const careHash = await bcrypt.hash('Staff1234', 12);
    const careRes = await client.query(
      `INSERT INTO staff (organisation_id, home_id, email, password_hash, first_name, last_name, role)
       VALUES ($1,$2,'care1@healthark.co.uk',$3,'James','Wilson','care_staff') RETURNING id`,
      [ORG_ID, homeId, careHash]
    );
    await client.query('INSERT INTO staff_onboarding (staff_id) VALUES ($1)', [careRes.rows[0].id]);
    await client.query('INSERT INTO staff_home_access (staff_id, home_id) VALUES ($1,$2)', [careRes.rows[0].id, homeId]);

    await client.query('COMMIT');
    logger.info('Seed done. Logins: admin@healthark.co.uk/Admin1234 | manager@healthark.co.uk/Manager1234 | care1@healthark.co.uk/Staff1234');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Seed failed', { err });
    throw err;
  } finally { client.release(); await pool.end(); }
}
seed().catch(() => process.exit(1));
