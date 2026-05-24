-- ================================================================
-- HEALTHARK - NEW FEATURES MIGRATION
-- Version 3.0 | Maintenance, DBS, Invoicing, Audit, Outcomes, Bath Chart
-- ================================================================

-- ── Maintenance / Facility Issues ────────────────────────────────────────────
CREATE TYPE maintenance_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE maintenance_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE maintenance_category AS ENUM (
  'electrical', 'plumbing', 'heating', 'equipment', 'decoration',
  'security', 'garden', 'cleaning', 'furniture', 'it', 'other'
);

CREATE TABLE IF NOT EXISTS maintenance_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_id       UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  title         VARCHAR(255) NOT NULL,
  description   TEXT,
  category      maintenance_category NOT NULL DEFAULT 'other',
  priority      maintenance_priority NOT NULL DEFAULT 'medium',
  status        maintenance_status NOT NULL DEFAULT 'open',
  location      VARCHAR(255),
  reported_by   UUID REFERENCES staff(id) ON DELETE SET NULL,
  assigned_to   UUID REFERENCES staff(id) ON DELETE SET NULL,
  resolved_by   UUID REFERENCES staff(id) ON DELETE SET NULL,
  resolved_at   TIMESTAMPTZ,
  resolution_notes TEXT,
  photo_url     VARCHAR(500),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_home ON maintenance_logs(home_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_logs(status);

-- ── Staff DBS & Compliance Documents ─────────────────────────────────────────
CREATE TYPE dbs_type AS ENUM ('basic', 'standard', 'enhanced', 'enhanced_barred');
CREATE TYPE doc_status AS ENUM ('valid', 'expiring_soon', 'expired', 'pending');

CREATE TABLE IF NOT EXISTS staff_dbs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id        UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  home_id         UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  dbs_number      VARCHAR(50),
  dbs_type        dbs_type NOT NULL DEFAULT 'enhanced',
  issue_date      DATE NOT NULL,
  expiry_date     DATE,
  update_service  BOOLEAN NOT NULL DEFAULT FALSE,
  status          doc_status NOT NULL DEFAULT 'valid',
  notes           TEXT,
  document_url    VARCHAR(500),
  created_by      UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_references (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id        UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  home_id         UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  referee_name    VARCHAR(255) NOT NULL,
  referee_position VARCHAR(255),
  referee_company VARCHAR(255),
  referee_email   VARCHAR(255),
  referee_phone   VARCHAR(20),
  reference_type  VARCHAR(50) DEFAULT 'professional',
  received_date   DATE,
  status          doc_status NOT NULL DEFAULT 'pending',
  notes           TEXT,
  document_url    VARCHAR(500),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_right_to_work (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id        UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  home_id         UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  document_type   VARCHAR(100) NOT NULL,
  document_number VARCHAR(100),
  expiry_date     DATE,
  status          doc_status NOT NULL DEFAULT 'valid',
  document_url    VARCHAR(500),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_dbs_staff ON staff_dbs(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_dbs_home ON staff_dbs(home_id);

-- ── Timesheets / Invoicing ────────────────────────────────────────────────────
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'void');

CREATE TABLE IF NOT EXISTS timesheets (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id      UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  home_id       UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  week_start    DATE NOT NULL,
  week_end      DATE NOT NULL,
  total_hours   DECIMAL(6,2) NOT NULL DEFAULT 0,
  regular_hours DECIMAL(6,2) NOT NULL DEFAULT 0,
  overtime_hours DECIMAL(6,2) NOT NULL DEFAULT 0,
  hourly_rate   DECIMAL(8,2),
  total_pay     DECIMAL(10,2),
  approved_by   UUID REFERENCES staff(id) ON DELETE SET NULL,
  approved_at   TIMESTAMPTZ,
  status        VARCHAR(50) NOT NULL DEFAULT 'pending',
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(staff_id, week_start)
);

CREATE TABLE IF NOT EXISTS timesheet_entries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timesheet_id    UUID NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE,
  clockin_id      UUID,
  work_date       DATE NOT NULL,
  start_time      TIME,
  end_time        TIME,
  break_minutes   INTEGER DEFAULT 0,
  hours_worked    DECIMAL(5,2) NOT NULL DEFAULT 0,
  shift_type      VARCHAR(50),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timesheets_staff ON timesheets(staff_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_home ON timesheets(home_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_week ON timesheets(week_start);

-- ── Audit Trail ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_trail (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_id       UUID REFERENCES homes(id) ON DELETE SET NULL,
  staff_id      UUID REFERENCES staff(id) ON DELETE SET NULL,
  staff_name    VARCHAR(255),
  action        VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id   UUID,
  resource_label VARCHAR(255),
  old_data      JSONB,
  new_data      JSONB,
  ip_address    VARCHAR(45),
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_home ON audit_trail(home_id);
CREATE INDEX IF NOT EXISTS idx_audit_staff ON audit_trail(staff_id);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_trail(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_trail(created_at DESC);

-- ── Care Outcomes ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS care_outcomes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  su_id           UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
  home_id         UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  care_plan_id    UUID REFERENCES care_plans(id) ON DELETE SET NULL,
  goal            TEXT NOT NULL,
  description     TEXT,
  target_date     DATE,
  review_date     DATE,
  status          outcome_status NOT NULL DEFAULT 'ongoing',
  progress_notes  TEXT,
  achieved_date   DATE,
  created_by      UUID REFERENCES staff(id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS outcome_reviews (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outcome_id    UUID NOT NULL REFERENCES care_outcomes(id) ON DELETE CASCADE,
  reviewed_by   UUID REFERENCES staff(id) ON DELETE SET NULL,
  status        outcome_status NOT NULL,
  notes         TEXT NOT NULL,
  review_date   DATE NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outcomes_su ON care_outcomes(su_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_home ON care_outcomes(home_id);

-- ── Bath Chart ────────────────────────────────────────────────────────────────
CREATE TYPE bath_type AS ENUM ('bath', 'shower', 'bed_bath', 'strip_wash', 'hair_wash', 'foot_soak');
CREATE TYPE bath_assistance AS ENUM ('independent', 'prompting', 'minimal', 'moderate', 'full');

CREATE TABLE IF NOT EXISTS bath_charts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  su_id           UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
  home_id         UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  bath_date       DATE NOT NULL,
  bath_time       TIME,
  bath_type       bath_type NOT NULL DEFAULT 'shower',
  assistance_level bath_assistance NOT NULL DEFAULT 'moderate',
  hair_washed     BOOLEAN NOT NULL DEFAULT FALSE,
  nails_cut       BOOLEAN NOT NULL DEFAULT FALSE,
  shaved          BOOLEAN NOT NULL DEFAULT FALSE,
  skin_condition  VARCHAR(255),
  notes           TEXT,
  given_by        UUID REFERENCES staff(id) ON DELETE SET NULL,
  witnessed_by    UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bath_su ON bath_charts(su_id);
CREATE INDEX IF NOT EXISTS idx_bath_home ON bath_charts(home_id);
CREATE INDEX IF NOT EXISTS idx_bath_date ON bath_charts(bath_date DESC);

-- ── Staff Supervision ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_supervisions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id        UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  home_id         UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  supervisor_id   UUID REFERENCES staff(id) ON DELETE SET NULL,
  supervision_date DATE NOT NULL,
  supervision_type VARCHAR(100) DEFAULT 'monthly',
  topics_discussed TEXT,
  actions_agreed   TEXT,
  next_date       DATE,
  staff_signature BOOLEAN NOT NULL DEFAULT FALSE,
  supervisor_signature BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supervision_staff ON staff_supervisions(staff_id);

-- ── Dashboard Stats Cache (for fast dashboard loads) ─────────────────────────
CREATE TABLE IF NOT EXISTS dashboard_cache (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_id       UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  cache_key     VARCHAR(100) NOT NULL,
  cache_data    JSONB NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '15 minutes',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(home_id, cache_key)
);
