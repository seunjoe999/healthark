import 'dotenv/config';
import { pool } from '../config/database';

const TABLES = ['su_reviews', 'staff_supervisions', 'audit_reports', 'quality_records',
                 'daily_records', 'staff_training_modules'];

async function diagnose() {
  const client = await pool.connect();
  try {
    for (const table of TABLES) {
      const res = await client.query(
        `SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position`,
        [table]
      );
      console.log(`\n=== ${table} (${res.rows.length} cols) ===`);
      res.rows.forEach(r => console.log(`  ${r.column_name}  [${r.data_type}] nullable=${r.is_nullable}`));
    }
  } finally {
    client.release();
    await pool.end();
  }
}
diagnose().catch(console.error);
