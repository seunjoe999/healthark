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
  '020_medication_location_warning.sql',
];

function splitStatements(sql: string): string[] {
  // Robust SQL splitter:
  //  - strips `-- ...` line comments and `/* ... */` block comments
  //  - respects single/double-quoted string literals
  //  - respects dollar-quoted bodies ($$ ... $$ and $tag$ ... $tag$)
  //    so function/DO blocks with internal semicolons stay intact
  //  - splits only on top-level `;`
  const statements: string[] = [];
  let current = '';
  let i = 0;
  const n = sql.length;

  while (i < n) {
    const ch = sql[i];
    const next = sql[i + 1];

    // Line comment
    if (ch === '-' && next === '-') {
      const nl = sql.indexOf('\n', i);
      i = nl === -1 ? n : nl; // keep the newline for the next iteration
      continue;
    }

    // Block comment
    if (ch === '/' && next === '*') {
      const end = sql.indexOf('*/', i + 2);
      i = end === -1 ? n : end + 2;
      continue;
    }

    // Single-quoted string literal
    if (ch === "'") {
      current += ch;
      i++;
      while (i < n) {
        current += sql[i];
        if (sql[i] === "'") {
          if (sql[i + 1] === "'") { current += sql[i + 1]; i += 2; continue; } // escaped quote
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    // Double-quoted identifier
    if (ch === '"') {
      current += ch;
      i++;
      while (i < n) {
        current += sql[i];
        if (sql[i] === '"') { i++; break; }
        i++;
      }
      continue;
    }

    // Dollar-quoted string ($$ ... $$ or $tag$ ... $tag$)
    if (ch === '$') {
      const tagMatch = /^\$[A-Za-z_0-9]*\$/.exec(sql.slice(i));
      if (tagMatch) {
        const tag = tagMatch[0];
        const end = sql.indexOf(tag, i + tag.length);
        const stop = end === -1 ? n : end + tag.length;
        current += sql.slice(i, stop);
        i = stop;
        continue;
      }
    }

    // Statement terminator
    if (ch === ';') {
      const trimmed = current.trim();
      if (trimmed.length > 0) statements.push(trimmed);
      current = '';
      i++;
      continue;
    }

    current += ch;
    i++;
  }

  const tail = current.trim();
  if (tail.length > 0) statements.push(tail);
  return statements;
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
