import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { pool } from '../config/database';
import { logger } from '../config/logger';

async function migrate() {
  const schemaPath = path.join(__dirname, '../../../database/001_schema.sql');
  if (!fs.existsSync(schemaPath)) { logger.error('Schema file not found'); process.exit(1); }
  const sql = fs.readFileSync(schemaPath, 'utf8');
  const client = await pool.connect();
  try {
    logger.info('Running migration...');
    await client.query(sql);
    logger.info('Migration completed');
  } finally { client.release(); await pool.end(); }
}
migrate().catch(() => process.exit(1));
