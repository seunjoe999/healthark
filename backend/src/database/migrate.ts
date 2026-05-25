import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { pool } from '../config/database';
import { logger } from '../config/logger';

const MIGRATION_FILES = [
  '001_schema.sql',
  '002_add_missing_columns.sql',
  '003_missing_tables.sql',
  '004_demo_data.sql',
  '005_fix_and_seed.sql',
  '006_app_tables.sql',
  '007_more_fixes.sql',
  '008_missing_tables.sql',
  '009_schema_alignment.sql',
  '010_add_all_missing_columns.sql',
  '011_audit_compliance_fixes.sql',
  '012_cqc_family_notifications.sql',
  '013_rota_features.sql',
  '014_shift_templates.sql',
  '015_app_features.sql',
  '016_service_rota.sql',
  '017_risk_management.sql',
  '018_mar_pharmacy_gp_codes.sql',
  '019_invoicing_cqc_supervision.sql',
];

function splitStatements(sql: string): string[] {
  // Split on semicolons at end of line, skip comments and blanks
  return sql
    .split(/;[ \t]*(\r?\n|$)/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
}

async function migrate() {
  const dbDir = path.join(__dirname, '../../../database');
  const client = await pool.connect();
  try {
    for (const file of MIGRATION_FILES) {
      const filePath = path.join(dbDir, file);
      if (!fs.existsSync(filePath)) {
        logger.warn(`Migration file not found, skipping: ${file}`);
        continue;
      }
      logger.info(`Running ${file}...`);
      const sql = fs.readFileSync(filePath, 'utf8');
      const statements = splitStatements(sql);
      let ok = 0, skipped = 0;
      for (const stmt of statements) {
        try {
          await client.query(stmt);
          ok++;
        } catch (err: any) {
          const msg = err.message?.split('\n')[0] || String(err);
          logger.warn(`  Skipped statement: ${msg.substring(0, 120)}`);
          skipped++;
        }
      }
      logger.info(`${file} completed (${ok} ok, ${skipped} skipped)`);
    }
    logger.info('All migrations completed');
  } finally {
    client.release();
    await pool.end();
  }
}
migrate().catch((err) => { logger.error('Migration failed', { err }); process.exit(1); });
