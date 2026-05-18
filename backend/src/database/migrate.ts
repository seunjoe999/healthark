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
];

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
      await client.query(sql);
      logger.info(`${file} completed`);
    }
    logger.info('All migrations completed');
  } finally {
    client.release();
    await pool.end();
  }
}
migrate().catch(() => process.exit(1));
