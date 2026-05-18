-- ================================================================
-- MIGRATION 006 — Create missing tables and fix column mismatches
-- ================================================================

-- ── Fix su_reviews ────────────────────────────────────────────────
ALTER TABLE su_reviews ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES staff(id);
ALTER TABLE su_reviews ADD COLUMN IF NOT EXISTS resident_feedback TEXT;
ALTER TABLE su_reviews ADD COLUMN IF NOT EXISTS family_feedback TEXT;
ALTER TABLE su_reviews ALTER COLUMN conducted_by DROP NOT NULL;
ALTER TABLE su_reviews DROP CONSTRAINT IF EXISTS su_reviews_review_type_check;
ALTER TABLE su_reviews ALTER COLUMN review_type TYPE VARCHAR(50);

-- ── Fix staff_supervisions — add columns expected by the routes ───
ALTER TABLE staff_supervisions ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE staff_supervisions ADD COLUMN IF NOT EXISTS strengths TEXT;
ALTER TABLE staff_supervisions ADD COLUMN IF NOT EXISTS areas_for_improvement TEXT;
ALTER TABLE staff_supervisions ADD COLUMN IF NOT EXISTS next_date DATE;

-- ── quality_records — new table (distinct from qa_records) ────────
CREATE TABLE IF NOT EXISTS quality_records (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  severity         VARCHAR(20) NOT NULL DEFAULT 'low',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quality_records_home ON quality_records(home_id);
CREATE INDEX IF NOT EXISTS idx_quality_records_su   ON quality_records(su_id);

-- ── staff_training_modules — inbuilt e-learning completions ───────
CREATE TABLE IF NOT EXISTS staff_training_modules (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id     UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  module_id    VARCHAR(100) NOT NULL,
  module_name  VARCHAR(255),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(staff_id, module_id)
);
CREATE INDEX IF NOT EXISTS idx_training_modules_staff ON staff_training_modules(staff_id);
