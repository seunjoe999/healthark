import 'dotenv/config';
import { pool } from '../config/database';
import { logger } from '../config/logger';

// Each statement is run independently — permission failures are skipped so the rest still apply.
const STATEMENTS = [
  // ── daily_records ────────────────────────────────────────────────
  `ALTER TABLE daily_records ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ DEFAULT NOW()`,
  `ALTER TABLE daily_records ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ DEFAULT NOW()`,

  // ── audit_reports ────────────────────────────────────────────────
  `ALTER TABLE audit_reports ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT false`,

  // ── quality_records (may already exist from 006 run) ─────────────
  `CREATE TABLE IF NOT EXISTS quality_records (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    home_id          UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    su_id            UUID REFERENCES service_users(id) ON DELETE SET NULL,
    related_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    created_by       UUID REFERENCES staff(id) ON DELETE SET NULL,
    record_type      VARCHAR(50) NOT NULL DEFAULT 'complaint',
    summary          VARCHAR(500) NOT NULL,
    detail           TEXT,
    action_taken     TEXT,
    reported_by      VARCHAR(255),
    reported_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    severity         VARCHAR(20)  NOT NULL DEFAULT 'low',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `ALTER TABLE quality_records ADD COLUMN IF NOT EXISTS reported_by      VARCHAR(255)`,
  `ALTER TABLE quality_records ADD COLUMN IF NOT EXISTS reported_at      TIMESTAMPTZ DEFAULT NOW()`,
  `ALTER TABLE quality_records ADD COLUMN IF NOT EXISTS severity         VARCHAR(20) DEFAULT 'low'`,
  `ALTER TABLE quality_records ADD COLUMN IF NOT EXISTS detail           TEXT`,
  `ALTER TABLE quality_records ADD COLUMN IF NOT EXISTS action_taken     TEXT`,
  `ALTER TABLE quality_records ADD COLUMN IF NOT EXISTS related_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL`,

  // ── staff_training_modules ────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS staff_training_modules (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id     UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    module_id    VARCHAR(100) NOT NULL,
    module_name  VARCHAR(255),
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(staff_id, module_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_training_modules_staff ON staff_training_modules(staff_id)`,

  // ── su_reviews — only if current user owns the table ─────────────
  `ALTER TABLE su_reviews ADD COLUMN IF NOT EXISTS created_by       UUID REFERENCES staff(id)`,
  `ALTER TABLE su_reviews ADD COLUMN IF NOT EXISTS resident_feedback TEXT`,
  `ALTER TABLE su_reviews ADD COLUMN IF NOT EXISTS family_feedback   TEXT`,
  `ALTER TABLE su_reviews ALTER COLUMN conducted_by DROP NOT NULL`,
  `ALTER TABLE su_reviews DROP CONSTRAINT IF EXISTS su_reviews_review_type_check`,

  // ── staff_supervisions ────────────────────────────────────────────
  `ALTER TABLE staff_supervisions ADD COLUMN IF NOT EXISTS summary              TEXT`,
  `ALTER TABLE staff_supervisions ADD COLUMN IF NOT EXISTS strengths            TEXT`,
  `ALTER TABLE staff_supervisions ADD COLUMN IF NOT EXISTS areas_for_improvement TEXT`,
  `ALTER TABLE staff_supervisions ADD COLUMN IF NOT EXISTS next_date            DATE`,

  // ── staff_service_user_assignments ─────────────────────────────────
  `CREATE TABLE IF NOT EXISTS staff_service_user_assignments (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    home_id    UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    staff_id   UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    su_id      UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (staff_id, su_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_ssua_staff ON staff_service_user_assignments(staff_id)`,
  `CREATE INDEX IF NOT EXISTS idx_ssua_su    ON staff_service_user_assignments(su_id)`,
];

async function applyFixes() {
  const client = await pool.connect();
  let ok = 0; let skipped = 0;
  try {
    for (const sql of STATEMENTS) {
      const preview = sql.trim().split('\n')[0].substring(0, 80);
      try {
        await client.query(sql);
        logger.info(`✓  ${preview}`);
        ok++;
      } catch (err: any) {
        logger.warn(`⚠  SKIPPED (${err.message?.split('\n')[0]}) — ${preview}`);
        skipped++;
        // Re-establish connection after error (pg requires it after a failed query)
        client.release();
        const newClient = await pool.connect();
        Object.assign(client, newClient);
      }
    }
    logger.info(`Done — ${ok} applied, ${skipped} skipped`);
  } finally {
    try { client.release(); } catch {}
    await pool.end();
  }
}

applyFixes().catch(err => { console.error(err); process.exit(1); });
