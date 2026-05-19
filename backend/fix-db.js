require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'healthark',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  ssl: false,
});

async function addColIfMissing(client, sql, description) {
  try {
    await client.query(sql);
    console.log('✅', description);
  } catch (e) {
    if (e.code === '42701') {
      console.log('⏭ ', description, '(already exists)');
    } else {
      console.error('❌', description, e.message);
    }
  }
}

async function run() {
  const client = await pool.connect();
  try {
    // --- care_plans: add reviewed_by column ---
    await addColIfMissing(client,
      `ALTER TABLE care_plans ADD COLUMN reviewed_by UUID REFERENCES staff(id) ON DELETE SET NULL`,
      'care_plans.reviewed_by');

    await addColIfMissing(client,
      `ALTER TABLE care_plans ADD COLUMN outcome_achieved VARCHAR(50)`,
      'care_plans.outcome_achieved');

    await addColIfMissing(client,
      `ALTER TABLE care_plans ADD COLUMN outcome_date DATE`,
      'care_plans.outcome_date');

    // --- service_users duplicates: delete newer copies (cascade delete dependent records first) ---
    const dupes = await client.query(`
      SELECT first_name, last_name, home_id, COUNT(*) as cnt,
             array_agg(id ORDER BY created_at DESC) as ids
      FROM service_users GROUP BY first_name, last_name, home_id HAVING COUNT(*) > 1
    `);

    if (dupes.rows.length) {
      console.log(`\nFound ${dupes.rows.length} groups of duplicate service users`);
      for (const row of dupes.rows) {
        // Keep the first ID (oldest, created_at ASC), delete the rest
        const keepId = row.ids[row.ids.length - 1]; // last in DESC array = oldest
        const deleteIds = row.ids.slice(0, -1);

        console.log(`  Keeping ${row.first_name} ${row.last_name} id=${keepId}, deleting ${deleteIds.length} copies`);

        for (const delId of deleteIds) {
          // Re-point su_medications
          await client.query(`UPDATE su_medications SET su_id=$1 WHERE su_id=$2`, [keepId, delId]).catch(() => {});
          await client.query(`UPDATE su_contacts SET su_id=$1 WHERE su_id=$2`, [keepId, delId]).catch(() => {});
          await client.query(`UPDATE care_plans SET su_id=$1 WHERE su_id=$2`, [keepId, delId]).catch(() => {});
          await client.query(`UPDATE daily_records SET su_id=$1 WHERE su_id=$2`, [keepId, delId]).catch(() => {});
          await client.query(`UPDATE mar_records SET su_id=$1 WHERE su_id=$2`, [keepId, delId]).catch(() => {});
          await client.query(`UPDATE tasks SET su_id=$1 WHERE su_id=$2`, [keepId, delId]).catch(() => {});
          await client.query(`UPDATE business_alerts SET su_id=$1 WHERE su_id=$2`, [keepId, delId]).catch(() => {});
          await client.query(`UPDATE safeguarding_concerns SET su_id=$1 WHERE su_id=$2`, [keepId, delId]).catch(() => {});
          await client.query(`UPDATE risk_assessments SET su_id=$1 WHERE su_id=$2`, [keepId, delId]).catch(() => {});
          await client.query(`UPDATE su_reviews SET su_id=$1 WHERE su_id=$2`, [keepId, delId]).catch(() => {});
          await client.query(`UPDATE records_followup SET su_id=$1 WHERE su_id=$2`, [keepId, delId]).catch(() => {});
          await client.query(`UPDATE medication_stock SET su_id=$1 WHERE su_id=$2`, [keepId, delId]).catch(() => {});
          // Delete any remaining child records
          await client.query(`DELETE FROM su_documents WHERE su_id=$1`, [delId]).catch(() => {});
          await client.query(`DELETE FROM su_messages WHERE su_id=$1`, [delId]).catch(() => {});
          await client.query(`DELETE FROM su_professionals WHERE su_id=$1`, [delId]).catch(() => {});
          await client.query(`DELETE FROM records_must WHERE su_id=$1`, [delId]).catch(() => {});
          await client.query(`DELETE FROM su_daily_fluid_totals WHERE su_id=$1`, [delId]).catch(() => {});
          // Now delete the duplicate
          try {
            await client.query(`DELETE FROM service_users WHERE id=$1`, [delId]);
            console.log(`    Deleted duplicate ${delId}`);
          } catch (e) {
            console.error(`    Could not delete ${delId}:`, e.message);
          }
        }
      }
    } else {
      console.log('No duplicate service users found');
    }

    // Verify
    const suCount = await client.query(`SELECT COUNT(*) FROM service_users WHERE status='live'`);
    const cpCheck = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name='care_plans' AND column_name='reviewed_by'
    `);
    console.log(`\n✅ Live service users: ${suCount.rows[0].count}`);
    console.log(`✅ care_plans.reviewed_by: ${cpCheck.rows.length ? 'EXISTS' : 'MISSING'}`);

    console.log('\nAll fixes applied!');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
