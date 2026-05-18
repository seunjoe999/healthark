-- ================================================================
-- MIGRATION 003 — ALL MISSING TABLES
-- Run this on the healthark database after 001_schema.sql
-- ================================================================

-- ── NOTIFICATIONS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  home_id      UUID REFERENCES homes(id) ON DELETE CASCADE,
  title        VARCHAR(255) NOT NULL,
  body         TEXT,
  type         VARCHAR(50) NOT NULL DEFAULT 'info',
  link         VARCHAR(500),
  is_read      BOOLEAN NOT NULL DEFAULT FALSE,
  read_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, is_read);

-- ── STAFF SHIFTS (ROTA) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_shifts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_id      UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  staff_id     UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  su_id        UUID REFERENCES service_users(id) ON DELETE SET NULL,
  shift_date   DATE NOT NULL,
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  shift_type   VARCHAR(50) NOT NULL DEFAULT 'regular',
  notes        TEXT,
  created_by   UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_shifts_home_date ON staff_shifts(home_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_shifts_staff     ON staff_shifts(staff_id);

-- ── TASKS (flat table — generated from templates by scheduler) ────
CREATE TABLE IF NOT EXISTS tasks (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_id          UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  su_id            UUID REFERENCES service_users(id) ON DELETE SET NULL,
  created_by       UUID REFERENCES staff(id) ON DELETE SET NULL,
  title            VARCHAR(255) NOT NULL,
  category         VARCHAR(100) NOT NULL DEFAULT 'general',
  description      TEXT,
  task_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  due_time         TIME,
  priority         VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  assigned_role    VARCHAR(50),
  assigned_to      UUID REFERENCES staff(id) ON DELETE SET NULL,
  status           VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','missed')),
  completed_by     UUID REFERENCES staff(id) ON DELETE SET NULL,
  completed_at     TIMESTAMPTZ,
  completion_notes TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tasks_home_date ON tasks(home_id, task_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status    ON tasks(status);

-- Add missing columns to task_templates
ALTER TABLE task_templates ADD COLUMN IF NOT EXISTS title        VARCHAR(255);
ALTER TABLE task_templates ADD COLUMN IF NOT EXISTS due_time     TIME;
ALTER TABLE task_templates ADD COLUMN IF NOT EXISTS priority     VARCHAR(20) DEFAULT 'normal';
ALTER TABLE task_templates ADD COLUMN IF NOT EXISTS su_id        UUID REFERENCES service_users(id) ON DELETE SET NULL;

-- Add missing columns to organisations table
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS reg_number   VARCHAR(100);
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS cqc_provider VARCHAR(100);
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS address1     VARCHAR(255);
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS address2     VARCHAR(255);
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS address3     VARCHAR(255);
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS postcode     VARCHAR(10);
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS phone        VARCHAR(20);
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS email        VARCHAR(255);
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS logo_url     VARCHAR(500);

-- ── STAFF SUPERVISIONS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_supervisions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id        UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  home_id         UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  conducted_by    UUID NOT NULL REFERENCES staff(id),
  supervision_date DATE NOT NULL DEFAULT CURRENT_DATE,
  supervision_type VARCHAR(50) NOT NULL DEFAULT 'monthly',
  topics          TEXT,
  staff_comments  TEXT,
  manager_comments TEXT,
  action_points   TEXT,
  next_due_date   DATE,
  document_url    VARCHAR(500),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_supervisions_staff ON staff_supervisions(staff_id);
CREATE INDEX IF NOT EXISTS idx_supervisions_home  ON staff_supervisions(home_id);

-- ── STAFF DOCUMENTS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_documents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id      UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  home_id       UUID REFERENCES homes(id) ON DELETE CASCADE,
  document_name VARCHAR(255) NOT NULL,
  document_type VARCHAR(100),
  file_url      VARCHAR(500) NOT NULL,
  file_size     INTEGER,
  uploaded_by   UUID REFERENCES staff(id) ON DELETE SET NULL,
  expiry_date   DATE,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_staff_docs_staff ON staff_documents(staff_id);

-- ── MEDICATION STOCK ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medication_stock (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_id             UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  su_id               UUID REFERENCES service_users(id) ON DELETE SET NULL,
  medication_name     VARCHAR(255) NOT NULL,
  form                VARCHAR(100),
  strength            VARCHAR(100),
  quantity_remaining  DECIMAL(10,2) NOT NULL DEFAULT 0,
  unit                VARCHAR(50) NOT NULL DEFAULT 'tablets',
  expiry_date         DATE,
  reorder_threshold   DECIMAL(10,2) NOT NULL DEFAULT 7,
  batch_number        VARCHAR(100),
  supplier            VARCHAR(255),
  last_updated_by     UUID REFERENCES staff(id) ON DELETE SET NULL,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE medication_stock ADD COLUMN IF NOT EXISTS home_id UUID REFERENCES homes(id) ON DELETE CASCADE;
ALTER TABLE medication_stock ADD COLUMN IF NOT EXISTS su_id  UUID REFERENCES service_users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_med_stock_home ON medication_stock(home_id);
CREATE INDEX IF NOT EXISTS idx_med_stock_su   ON medication_stock(su_id);

CREATE TABLE IF NOT EXISTS medication_stock_log (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stock_id         UUID NOT NULL REFERENCES medication_stock(id) ON DELETE CASCADE,
  adjusted_by      UUID NOT NULL REFERENCES staff(id),
  adjustment_type  VARCHAR(50) NOT NULL,
  quantity_change  DECIMAL(10,2) NOT NULL,
  quantity_before  DECIMAL(10,2) NOT NULL,
  quantity_after   DECIMAL(10,2) NOT NULL,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_med_stock_log ON medication_stock_log(stock_id);

-- ── SU MEDICATIONS (for reports) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS su_medications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  su_id           UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
  home_id         UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  medication_name VARCHAR(255) NOT NULL,
  dose            VARCHAR(100) NOT NULL,
  route           VARCHAR(50),
  frequency       VARCHAR(100),
  prescribed_by   VARCHAR(255),
  start_date      DATE,
  end_date        DATE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  notes           TEXT,
  created_by      UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_su_meds_su   ON su_medications(su_id);
CREATE INDEX IF NOT EXISTS idx_su_meds_home ON su_medications(home_id);

-- ── SERVICE USERS — add missing columns ──────────────────────────
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS medical_history   TEXT;
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS med_allergies     TEXT;
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS food_allergies    TEXT;
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS special_diet      TEXT;
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS fluid_consistency VARCHAR(100);
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS min_fluid_ml      INTEGER NOT NULL DEFAULT 1500;
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS diet_instructions TEXT;
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS need_to_know      TEXT;
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS my_instructions   TEXT;
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS height_cm         DECIMAL(5,1);
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS weight_kg         DECIMAL(5,2);
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS bmi               DECIMAL(4,1);
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS requires_oxygen   BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS has_catheter      BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS has_peg           BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS nil_by_mouth      BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS life_history      TEXT;
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS hobbies           TEXT;
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS daily_routine     TEXT;
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS has_lpa           BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS lpa_type          VARCHAR(100);
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS lpa_attorney      VARCHAR(255);
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS has_cop_order     BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS cop_details       TEXT;
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS dnar              BOOLEAN;
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS dnar_form_url     VARCHAR(500);
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS dnar_location     TEXT;
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS local_authority   VARCHAR(255);
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS service_name      VARCHAR(255);
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS acp_url           VARCHAR(500);
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS acp_date          DATE;
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS funeral_noted     BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS funeral_details   TEXT;
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS key_safe_code     VARCHAR(100);
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS religion          VARCHAR(100);
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS ethnicity         VARCHAR(100);
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS marital_status    VARCHAR(50);
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS comms_prefs       TEXT;
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS emergency_rating  VARCHAR(20) NOT NULL DEFAULT 'low';
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS preferred_name    VARCHAR(100);
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS pronouns          VARCHAR(50);
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS ni_number         VARCHAR(20);
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS capacity_doc_url  VARCHAR(500);
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS best_interest_url VARCHAR(500);

-- ── STAFF CAUTIONS — add home_id if missing ───────────────────────
ALTER TABLE staff_cautions ADD COLUMN IF NOT EXISTS home_id UUID REFERENCES homes(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_cautions_home ON staff_cautions(home_id);

-- ── STAFF LEAVE — ensure all columns exist ────────────────────────
ALTER TABLE staff ADD COLUMN IF NOT EXISTS refresh_token      VARCHAR(500);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS reset_token        VARCHAR(255);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMPTZ;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS is_active          BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS last_login         TIMESTAMPTZ;

-- ── STAFF CLOCK EVENTS — allow null su_id ────────────────────────
ALTER TABLE staff_clock_events ALTER COLUMN su_id DROP NOT NULL;

-- ── HOME POSTCODES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS home_postcodes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_id    UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  postcode   VARCHAR(20) NOT NULL,
  label      VARCHAR(100),
  latitude   DECIMAL(10,8),
  longitude  DECIMAL(11,8),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(home_id, postcode)
);
CREATE INDEX IF NOT EXISTS idx_home_postcodes_home ON home_postcodes(home_id);
