-- ================================================================
-- MIGRATION 007 — Fix missing columns identified in production
-- ================================================================

-- ── daily_records: recorded_at may be missing in older DBs ───────
ALTER TABLE daily_records ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE daily_records ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ DEFAULT NOW();

-- ── audit_reports: is_ai_generated was never in any migration ────
ALTER TABLE audit_reports ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT false;

-- ── quality_records: table exists but missing columns from 006 ───
-- (CREATE TABLE IF NOT EXISTS in 006 was skipped if table already existed)
ALTER TABLE quality_records ADD COLUMN IF NOT EXISTS reported_by      VARCHAR(255);
ALTER TABLE quality_records ADD COLUMN IF NOT EXISTS reported_at      TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE quality_records ADD COLUMN IF NOT EXISTS severity         VARCHAR(20)  NOT NULL DEFAULT 'low';
ALTER TABLE quality_records ADD COLUMN IF NOT EXISTS detail           TEXT;
ALTER TABLE quality_records ADD COLUMN IF NOT EXISTS action_taken     TEXT;
ALTER TABLE quality_records ADD COLUMN IF NOT EXISTS related_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL;

-- ── staff_training_modules: re-ensure table exists ───────────────
CREATE TABLE IF NOT EXISTS staff_training_modules (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id     UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  module_id    VARCHAR(100) NOT NULL,
  module_name  VARCHAR(255),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(staff_id, module_id)
);
CREATE INDEX IF NOT EXISTS idx_training_modules_staff ON staff_training_modules(staff_id);

-- ── su_reviews: re-apply fixes in case they were missed ──────────
ALTER TABLE su_reviews ADD COLUMN IF NOT EXISTS created_by      UUID REFERENCES staff(id);
ALTER TABLE su_reviews ADD COLUMN IF NOT EXISTS resident_feedback TEXT;
ALTER TABLE su_reviews ADD COLUMN IF NOT EXISTS family_feedback  TEXT;
ALTER TABLE su_reviews ALTER COLUMN conducted_by DROP NOT NULL;
ALTER TABLE su_reviews DROP CONSTRAINT IF EXISTS su_reviews_review_type_check;

-- ── risk_assessments: add missing optional columns ────────────────
ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS current_risk_level VARCHAR(20) NOT NULL DEFAULT 'low';
ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS who_is_at_risk TEXT;
ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS is_historical BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS what_could_happen TEXT;
ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS triggers TEXT;
ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS protective_factors TEXT;
ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS reviewed_by UUID;
