-- ================================================================
-- MIGRATION 011 — Ensure all audit and compliance fix columns exist
-- ================================================================

-- Ensure records_incidents table has all required columns for audit fixes
ALTER TABLE records_incidents ADD COLUMN IF NOT EXISTS manager_reviewed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE records_incidents ADD COLUMN IF NOT EXISTS manager_reviewed_at TIMESTAMPTZ;

-- Ensure care_plans table has all required columns
ALTER TABLE care_plans ADD COLUMN IF NOT EXISTS last_review_date DATE;
ALTER TABLE care_plans ADD COLUMN IF NOT EXISTS next_review_date DATE;
ALTER TABLE care_plans ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES staff(id) ON DELETE SET NULL;
ALTER TABLE care_plans ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Ensure daily_records table captures the necessary data types
ALTER TABLE daily_records ADD COLUMN IF NOT EXISTS amount_ml INTEGER;

-- Ensure business_alerts has necessary columns for fluid and PPE alerts
ALTER TABLE business_alerts ADD COLUMN IF NOT EXISTS data JSONB;

-- Ensure service_users has min_fluid_ml for fluid intake checks
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS min_fluid_ml INTEGER NOT NULL DEFAULT 1500;

-- Create staff_training table if not exists (for training expiry checks)
CREATE TABLE IF NOT EXISTS staff_training (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id     UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  course_name  VARCHAR(255) NOT NULL,
  expiry_date  DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_st_staff ON staff_training(staff_id);
CREATE INDEX IF NOT EXISTS idx_st_expiry ON staff_training(expiry_date);

-- Create mar_records table if not exists (for medication compliance)
CREATE TABLE IF NOT EXISTS mar_records (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_id       UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  su_id         UUID REFERENCES service_users(id) ON DELETE CASCADE,
  record_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  given         BOOLEAN NOT NULL DEFAULT FALSE,
  refused       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mar_home ON mar_records(home_id);
CREATE INDEX IF NOT EXISTS idx_mar_su ON mar_records(su_id);
CREATE INDEX IF NOT EXISTS idx_mar_date ON mar_records(record_date);

-- Ensure safeguarding_concerns table exists and has manager_ack
CREATE TABLE IF NOT EXISTS safeguarding_concerns (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_id       UUID NOT NULL REFERENCES homes(id),
  su_id         UUID NOT NULL REFERENCES service_users(id),
  overview      TEXT,
  incident_date DATE NOT NULL,
  manager_ack   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_safe_home ON safeguarding_concerns(home_id);
CREATE INDEX IF NOT EXISTS idx_safe_su ON safeguarding_concerns(su_id);

ALTER TABLE safeguarding_concerns ADD COLUMN IF NOT EXISTS manager_ack BOOLEAN NOT NULL DEFAULT FALSE;

-- Ensure audit_reports table has all scoring columns
ALTER TABLE audit_reports ADD COLUMN IF NOT EXISTS total_checks INTEGER;
ALTER TABLE audit_reports ADD COLUMN IF NOT EXISTS checks_passed INTEGER;
ALTER TABLE audit_reports ADD COLUMN IF NOT EXISTS checks_failed INTEGER;
