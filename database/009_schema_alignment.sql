-- ================================================================
-- MIGRATION 009 — Align actual DB schema with application routes
-- ================================================================

-- ── risk_assessments: add all columns the app routes expect ──────
ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS assessment_name  VARCHAR(255);
ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS risk_level       VARCHAR(20) NOT NULL DEFAULT 'low';
ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS current_risk_level VARCHAR(20) NOT NULL DEFAULT 'low';
ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS management_plan  TEXT;
ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS review_frequency VARCHAR(20) NOT NULL DEFAULT 'monthly';
ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS next_review_date DATE;
ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS last_review_date DATE;
ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS who_is_at_risk   TEXT;
ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS is_historical    BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS what_could_happen TEXT;
ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS triggers         TEXT;
ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS protective_factors TEXT;
ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS reviewed_by      UUID REFERENCES staff(id) ON DELETE SET NULL;
ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ DEFAULT NOW();

-- Seed assessment_name from existing risk_type data
UPDATE risk_assessments SET assessment_name = risk_type WHERE assessment_name IS NULL AND risk_type IS NOT NULL;
-- Seed management_plan from existing controls data
UPDATE risk_assessments SET management_plan = controls WHERE management_plan IS NULL AND controls IS NOT NULL;
-- Seed next_review_date from existing review_date
UPDATE risk_assessments SET next_review_date = review_date WHERE next_review_date IS NULL AND review_date IS NOT NULL;

-- ── staff_assessments: create table ──────────────────────────────
CREATE TABLE IF NOT EXISTS staff_assessments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id        UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  conducted_by    UUID REFERENCES staff(id) ON DELETE SET NULL,
  home_id         UUID REFERENCES homes(id) ON DELETE CASCADE,
  assessment_type VARCHAR(100) NOT NULL,
  custom_name     VARCHAR(255),
  assessment_date DATE NOT NULL,
  outcome         TEXT,
  recommendations TEXT,
  next_due_date   DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_staff_assessments_staff ON staff_assessments(staff_id);

-- ── staff_absences: create table ─────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_absences (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id     UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  home_id      UUID REFERENCES homes(id) ON DELETE CASCADE,
  absence_type VARCHAR(100) NOT NULL,
  absence_start DATE NOT NULL,
  absence_end   DATE,
  notified_at   TIMESTAMPTZ DEFAULT NOW(),
  created_by    UUID REFERENCES staff(id) ON DELETE SET NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_staff_absences_staff ON staff_absences(staff_id);

-- ── staff_onboarding: add missing columns ────────────────────────
ALTER TABLE staff_onboarding ADD COLUMN IF NOT EXISTS application_received    BOOLEAN DEFAULT FALSE;
ALTER TABLE staff_onboarding ADD COLUMN IF NOT EXISTS application_date        DATE;
ALTER TABLE staff_onboarding ADD COLUMN IF NOT EXISTS interview_completed     BOOLEAN DEFAULT FALSE;
ALTER TABLE staff_onboarding ADD COLUMN IF NOT EXISTS interview_date          DATE;
ALTER TABLE staff_onboarding ADD COLUMN IF NOT EXISTS interview_notes         TEXT;
ALTER TABLE staff_onboarding ADD COLUMN IF NOT EXISTS dbs_submitted_date     DATE;
ALTER TABLE staff_onboarding ADD COLUMN IF NOT EXISTS dbs_cleared_date       DATE;
ALTER TABLE staff_onboarding ADD COLUMN IF NOT EXISTS dbs_certificate_url    TEXT;
ALTER TABLE staff_onboarding ADD COLUMN IF NOT EXISTS references_received    BOOLEAN DEFAULT FALSE;
ALTER TABLE staff_onboarding ADD COLUMN IF NOT EXISTS references_date        DATE;
ALTER TABLE staff_onboarding ADD COLUMN IF NOT EXISTS care_cert_date         DATE;
ALTER TABLE staff_onboarding ADD COLUMN IF NOT EXISTS induction_date         DATE;
ALTER TABLE staff_onboarding ADD COLUMN IF NOT EXISTS med_training_date      DATE;
ALTER TABLE staff_onboarding ADD COLUMN IF NOT EXISTS system_training_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE staff_onboarding ADD COLUMN IF NOT EXISTS system_training_date   DATE;
ALTER TABLE staff_onboarding ADD COLUMN IF NOT EXISTS updated_at             TIMESTAMPTZ DEFAULT NOW();

-- ── quality_records: add missing columns (if not already there) ──
ALTER TABLE quality_records ADD COLUMN IF NOT EXISTS reported_by   VARCHAR(255);
ALTER TABLE quality_records ADD COLUMN IF NOT EXISTS reported_at   TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE quality_records ADD COLUMN IF NOT EXISTS severity      VARCHAR(20) NOT NULL DEFAULT 'low';

-- ── su_reviews: ensure all needed columns exist ──────────────────
ALTER TABLE su_reviews ADD COLUMN IF NOT EXISTS conducted_by    UUID REFERENCES staff(id) ON DELETE SET NULL;
ALTER TABLE su_reviews ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ DEFAULT NOW();

-- ── staff_training: ensure table exists ──────────────────────────
CREATE TABLE IF NOT EXISTS staff_training (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id         UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  course_name      VARCHAR(255) NOT NULL,
  completed_date   DATE NOT NULL,
  duration_hours   NUMERIC(5,2),
  expiry_date      DATE,
  certificate_url  TEXT,
  created_by       UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_staff_training_staff ON staff_training(staff_id);

-- ── notifications: ensure home_id allows null (staff may not have home) ─
ALTER TABLE notifications ALTER COLUMN home_id DROP NOT NULL;
