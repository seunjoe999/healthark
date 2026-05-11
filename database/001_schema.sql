-- ================================================================
-- HEALTHARK - COMPLETE DATABASE SCHEMA
-- Version 1.0 | PostgreSQL 15+
-- UK Care Home Management Platform
-- ================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fast text search

-- ================================================================
-- ENUMS
-- ================================================================

CREATE TYPE staff_role AS ENUM (
  'care_staff', 'senior_carer', 'home_manager', 'group_admin', 'auditor'
);

CREATE TYPE staff_status AS ENUM (
  'active', 'on_leave', 'suspended', 'resigned', 'terminated'
);

CREATE TYPE su_status AS ENUM (
  'live', 'pre_admission', 'archive', 'on_hold', 'hospital'
);

CREATE TYPE emergency_rating AS ENUM ('low', 'medium', 'high');

CREATE TYPE gender_type AS ENUM (
  'male', 'female', 'non_binary', 'prefer_not_to_say', 'other'
);

CREATE TYPE leave_type AS ENUM (
  'annual', 'sick', 'unauthorised', 'maternity',
  'paternity', 'compassionate', 'other'
);

CREATE TYPE leave_status AS ENUM (
  'pending', 'approved', 'declined', 'cancelled'
);

CREATE TYPE review_frequency AS ENUM (
  'weekly', 'fortnightly', 'monthly', 'eight_weekly', 'yearly'
);

CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TYPE outcome_status AS ENUM ('yes', 'partially', 'no', 'ongoing');

CREATE TYPE care_plan_type AS ENUM (
  'physical', 'communication', 'oral_care', 'medical',
  'food_and_fluids', 'one_page_profile', 'finance', 'visitation',
  'vulnerability', 'personal_hygiene', 'hydration_skin',
  'social_activities', 'community_access', 'distress_behaviour',
  'crisis', 'alcohol_use', 'home_safety', 'emotional_breakdown',
  'positive_behaviour', 'oral_care_assessment', 'autism',
  'pen_assessment', 'personal_evacuation', 'end_of_life',
  'adhd', 'custom'
);

CREATE TYPE assessment_type AS ENUM (
  'clinical_supervision', 'employment_risk', 'interview',
  'medication_competency', 'new_staff', 'competency', 'pip',
  'pregnancy_risk', 'return_to_work', 'shadow_shift', 'spot_check',
  'appraisal', 'staff_competency', 'one_to_one',
  'training_compliance', 'supervision', 'team_leader_review', 'custom'
);

CREATE TYPE audit_type AS ENUM (
  'medication', 'infection_control', 'fire_safety', 'documentation',
  'falls_prevention', 'safeguarding', 'nutrition_hydration',
  'activity', 'care_plan', 'incident_analysis', 'pressure_sore',
  'one_to_one', 'equipment', 'premises', 'mandatory_safety',
  'mar_chart', 'free_template'
);

CREATE TYPE alert_type AS ENUM (
  'task_missed', 'care_plan_overdue', 'risk_assessment_overdue',
  'medication_gap', 'fluid_below_threshold', 'weight_alert',
  'vital_sign_flag', 'training_expiring', 'training_expired',
  'incident_not_reviewed', 'unsigned_policy', 'stock_low',
  'dnar_missing', 'document_expiring', 'care_plan_review_due'
);

CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'critical');

-- ================================================================
-- ORGANISATIONS & HOMES
-- ================================================================

CREATE TABLE organisations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(255) NOT NULL,
  reg_number    VARCHAR(100),
  cqc_provider  VARCHAR(100),
  address1      VARCHAR(255),
  address2      VARCHAR(255),
  address3      VARCHAR(255),
  postcode      VARCHAR(10),
  phone         VARCHAR(20),
  email         VARCHAR(255),
  logo_url      VARCHAR(500),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE homes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  cqc_location_id VARCHAR(100),
  address1        VARCHAR(255) NOT NULL,
  address2        VARCHAR(255),
  address3        VARCHAR(255),
  postcode        VARCHAR(10) NOT NULL,
  latitude        DECIMAL(10,8),
  longitude       DECIMAL(11,8),
  phone           VARCHAR(20),
  email           VARCHAR(255),
  manager_name    VARCHAR(255),
  geofence_radius INTEGER NOT NULL DEFAULT 200,  -- metres
  qr_token        VARCHAR(255) UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_homes_org ON homes(organisation_id);
CREATE INDEX idx_homes_postcode ON homes(postcode);

-- ================================================================
-- STAFF
-- ================================================================

CREATE TABLE staff (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  home_id         UUID REFERENCES homes(id) ON DELETE SET NULL,
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  first_name      VARCHAR(100) NOT NULL,
  last_name       VARCHAR(100) NOT NULL,
  preferred_name  VARCHAR(100),
  role            staff_role NOT NULL DEFAULT 'care_staff',
  status          staff_status NOT NULL DEFAULT 'active',
  photo_url       VARCHAR(500),
  phone           VARCHAR(20),
  address1        VARCHAR(255),
  address2        VARCHAR(255),
  address3        VARCHAR(255),
  postcode        VARCHAR(10),
  date_of_birth   DATE,
  gender          VARCHAR(50),
  nationality     VARCHAR(100),
  marital_status  VARCHAR(50),
  ni_number       VARCHAR(20),  -- encrypted at application layer
  start_date      DATE,
  leave_date      DATE,
  -- Leave allowance
  leave_hours_total DECIMAL(6,2) NOT NULL DEFAULT 224.00,
  leave_hours_used  DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  -- Emergency contact
  emergency_name  VARCHAR(255),
  emergency_phone VARCHAR(20),
  emergency_notes TEXT,
  -- Access control
  access_any_network BOOLEAN NOT NULL DEFAULT TRUE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_login      TIMESTAMPTZ,
  refresh_token   VARCHAR(500),
  -- Password reset
  reset_token       VARCHAR(255),
  reset_token_expiry TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_staff_org ON staff(organisation_id);
CREATE INDEX idx_staff_home ON staff(home_id);
CREATE INDEX idx_staff_email ON staff(email);
CREATE INDEX idx_staff_role ON staff(role);

-- Per-home access permissions for each staff member
CREATE TABLE staff_home_access (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id              UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  home_id               UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  can_view_care_plans   BOOLEAN NOT NULL DEFAULT TRUE,
  can_edit_care_plans   BOOLEAN NOT NULL DEFAULT FALSE,
  can_view_sensitive    BOOLEAN NOT NULL DEFAULT FALSE,
  can_run_reports       BOOLEAN NOT NULL DEFAULT FALSE,
  can_manage_staff      BOOLEAN NOT NULL DEFAULT FALSE,
  can_approve_leave     BOOLEAN NOT NULL DEFAULT FALSE,
  can_view_phones       BOOLEAN NOT NULL DEFAULT TRUE,
  can_view_keysafe      BOOLEAN NOT NULL DEFAULT FALSE,
  can_view_financials   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(staff_id, home_id)
);

-- Onboarding checklist
CREATE TABLE staff_onboarding (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id                    UUID NOT NULL UNIQUE REFERENCES staff(id) ON DELETE CASCADE,
  application_received        BOOLEAN NOT NULL DEFAULT FALSE,
  application_date            DATE,
  interview_completed         BOOLEAN NOT NULL DEFAULT FALSE,
  interview_date              DATE,
  interview_notes             TEXT,
  dbs_submitted_date          DATE,
  dbs_cleared                 BOOLEAN NOT NULL DEFAULT FALSE,
  dbs_cleared_date            DATE,
  dbs_certificate_url         VARCHAR(500),
  references_received         INTEGER NOT NULL DEFAULT 0,
  references_date             DATE,
  references_evidence_url     VARCHAR(500),
  care_cert_completed         BOOLEAN NOT NULL DEFAULT FALSE,
  care_cert_date              DATE,
  induction_completed         BOOLEAN NOT NULL DEFAULT FALSE,
  induction_date              DATE,
  med_training_completed      BOOLEAN NOT NULL DEFAULT FALSE,
  med_training_date           DATE,
  right_to_work_verified      BOOLEAN NOT NULL DEFAULT FALSE,
  right_to_work_doc_url       VARCHAR(500),
  system_training_completed   BOOLEAN NOT NULL DEFAULT FALSE,
  system_training_date        DATE,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Training & certificates
CREATE TABLE staff_training (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id        UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  course_name     VARCHAR(255) NOT NULL,
  completed_date  DATE NOT NULL,
  duration_hours  DECIMAL(5,2),
  certificate_url VARCHAR(500),
  expiry_date     DATE,
  -- Alert tracking: 0=none, 1=60day sent, 2=30day sent, 3=7day sent, 4=expired sent
  alert_level     INTEGER NOT NULL DEFAULT 0,
  created_by      UUID REFERENCES staff(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_training_staff ON staff_training(staff_id);
CREATE INDEX idx_training_expiry ON staff_training(expiry_date) WHERE expiry_date IS NOT NULL;

-- Leave requests
CREATE TABLE staff_leave (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id       UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  home_id        UUID NOT NULL REFERENCES homes(id),
  leave_type     leave_type NOT NULL,
  start_date     DATE NOT NULL,
  end_date       DATE NOT NULL,
  hours_requested DECIMAL(6,2) NOT NULL,
  status         leave_status NOT NULL DEFAULT 'pending',
  reason         TEXT,
  approved_by    UUID REFERENCES staff(id),
  approved_at    TIMESTAMPTZ,
  decline_reason TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leave_staff ON staff_leave(staff_id);
CREATE INDEX idx_leave_dates ON staff_leave(start_date, end_date);

-- Absence records
CREATE TABLE staff_absences (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id             UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  home_id              UUID NOT NULL REFERENCES homes(id),
  absence_type         leave_type NOT NULL,
  notified_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  absence_start        TIMESTAMPTZ NOT NULL,
  absence_end          TIMESTAMPTZ,
  return_completed     BOOLEAN NOT NULL DEFAULT FALSE,
  return_date          DATE,
  return_notes         TEXT,
  bradford_score       INTEGER,
  created_by           UUID REFERENCES staff(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_absences_staff ON staff_absences(staff_id);

-- Clock in / out events
CREATE TABLE staff_clock_events (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id         UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  home_id          UUID NOT NULL REFERENCES homes(id),
  event_type       VARCHAR(10) NOT NULL CHECK (event_type IN ('clock_in', 'clock_out')),
  event_time       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  latitude         DECIMAL(10,8),
  longitude        DECIMAL(11,8),
  distance_metres  INTEGER,
  geofence_passed  BOOLEAN NOT NULL DEFAULT FALSE,
  qr_scan_used     BOOLEAN NOT NULL DEFAULT FALSE,
  shift_scheduled  TIMESTAMPTZ,
  punctuality      VARCHAR(10) CHECK (punctuality IN ('early', 'on_time', 'late')),
  minutes_variance INTEGER,  -- negative = early, positive = late
  device_info      JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clock_staff ON staff_clock_events(staff_id);
CREATE INDEX idx_clock_home ON staff_clock_events(home_id);
CREATE INDEX idx_clock_time ON staff_clock_events(event_time);

-- Cautions / disciplinary
CREATE TABLE staff_cautions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id     UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  issued_by    UUID NOT NULL REFERENCES staff(id),
  caution_date DATE NOT NULL DEFAULT CURRENT_DATE,
  overview     TEXT NOT NULL,
  strengths    TEXT,
  weaknesses   TEXT,
  action_points TEXT,
  document_url VARCHAR(500),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sensitive notes (restricted visibility)
CREATE TABLE staff_sensitive_notes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id    UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  created_by  UUID NOT NULL REFERENCES staff(id),
  note        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Staff assessments
CREATE TABLE staff_assessments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id        UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  conducted_by    UUID NOT NULL REFERENCES staff(id),
  home_id         UUID NOT NULL REFERENCES homes(id),
  assessment_type assessment_type NOT NULL,
  custom_name     VARCHAR(255),
  assessment_date DATE NOT NULL,
  outcome         TEXT,
  recommendations TEXT,
  next_due_date   DATE,
  document_url    VARCHAR(500),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assessments_staff ON staff_assessments(staff_id);

-- ================================================================
-- SERVICE USERS
-- ================================================================

CREATE TABLE service_users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_id         UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  -- Identity
  first_name      VARCHAR(100) NOT NULL,
  last_name       VARCHAR(100) NOT NULL,
  preferred_name  VARCHAR(100),
  date_of_birth   DATE NOT NULL,
  gender          gender_type,
  pronouns        VARCHAR(50),
  photo_url       VARCHAR(500),
  -- Status
  status          su_status NOT NULL DEFAULT 'pre_admission',
  emergency_rating emergency_rating NOT NULL DEFAULT 'low',
  -- IDs
  nhs_number      VARCHAR(20),
  ni_number       VARCHAR(20),
  qr_token        VARCHAR(255) UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  -- DNAR
  dnar            BOOLEAN,
  dnar_form_url   VARCHAR(500),
  dnar_location   TEXT,
  -- Admission
  admission_date  DATE,
  local_authority VARCHAR(255),
  service_name    VARCHAR(255),
  -- Advance care plan
  acp_url         VARCHAR(500),
  acp_date        DATE,
  -- Funeral
  funeral_noted   BOOLEAN NOT NULL DEFAULT FALSE,
  funeral_details TEXT,
  -- Contact
  address1        VARCHAR(255),
  address2        VARCHAR(255),
  address3        VARCHAR(255),
  postcode        VARCHAR(10),
  email           VARCHAR(255),
  phone           VARCHAR(20),
  key_safe_code   VARCHAR(100),  -- encrypted at app layer
  -- Background
  religion        VARCHAR(100),
  ethnicity       VARCHAR(100),
  marital_status  VARCHAR(50),
  comms_prefs     TEXT,
  life_history    TEXT,
  hobbies         TEXT,
  daily_routine   TEXT,
  -- Health
  height_cm       DECIMAL(5,1),
  weight_kg       DECIMAL(5,2),
  bmi             DECIMAL(4,1),
  medical_history TEXT,
  med_allergies   TEXT,
  requires_oxygen BOOLEAN NOT NULL DEFAULT FALSE,
  has_catheter    BOOLEAN NOT NULL DEFAULT FALSE,
  has_peg         BOOLEAN NOT NULL DEFAULT FALSE,
  -- Diet
  food_allergies  TEXT,
  nil_by_mouth    BOOLEAN NOT NULL DEFAULT FALSE,
  special_diet    TEXT,
  fluid_consistency VARCHAR(100),
  min_fluid_ml    INTEGER NOT NULL DEFAULT 1500,
  diet_instructions TEXT,
  -- Capacity
  capacity_assessment_url DATE,
  capacity_doc_url  VARCHAR(500),
  best_interest_url VARCHAR(500),
  has_lpa           BOOLEAN NOT NULL DEFAULT FALSE,
  lpa_type          VARCHAR(100),
  lpa_attorney      VARCHAR(255),
  has_cop_order     BOOLEAN NOT NULL DEFAULT FALSE,
  cop_details       TEXT,
  -- Key info (displayed prominently to staff)
  need_to_know    TEXT,
  my_instructions TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_su_home ON service_users(home_id);
CREATE INDEX idx_su_status ON service_users(status);
CREATE INDEX idx_su_name ON service_users USING GIN (
  to_tsvector('english', first_name || ' ' || last_name)
);

-- Important contacts (unlimited)
CREATE TABLE su_contacts (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  su_id          UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
  full_name      VARCHAR(255) NOT NULL,
  relationship   VARCHAR(100),
  contact_tag    VARCHAR(20) CHECK (contact_tag IN ('professional','family','emergency')),
  phone_primary  VARCHAR(20),
  phone_secondary VARCHAR(20),
  email          VARCHAR(255),
  address1       VARCHAR(255),
  address2       VARCHAR(255),
  postcode       VARCHAR(10),
  is_primary     BOOLEAN NOT NULL DEFAULT FALSE,
  notes          TEXT,
  display_order  INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contacts_su ON su_contacts(su_id);

-- Professional involvement
CREATE TABLE su_professionals (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  su_id        UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
  role_title   VARCHAR(255) NOT NULL,
  name         VARCHAR(255) NOT NULL,
  organisation VARCHAR(255),
  phone        VARCHAR(20),
  email        VARCHAR(255),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_professionals_su ON su_professionals(su_id);

-- Key documents
CREATE TABLE su_documents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  su_id         UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
  document_name VARCHAR(255) NOT NULL,
  document_type VARCHAR(100),
  file_url      VARCHAR(500) NOT NULL,
  file_size     INTEGER,
  uploaded_by   UUID REFERENCES staff(id),
  expiry_date   DATE,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_su_docs ON su_documents(su_id);
CREATE INDEX idx_su_docs_expiry ON su_documents(expiry_date) WHERE expiry_date IS NOT NULL;

-- My Comms messages
CREATE TABLE su_messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  su_id       UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
  home_id     UUID NOT NULL REFERENCES homes(id),
  sender_id   UUID NOT NULL REFERENCES staff(id),
  message     TEXT NOT NULL,
  message_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text','photo','family_message')),
  attachment_url VARCHAR(500),
  attachment_caption TEXT,
  read_by     UUID[],  -- array of staff IDs who have read it
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_su_messages ON su_messages(su_id);

-- ================================================================
-- CARE PLANS
-- ================================================================

CREATE TABLE care_plans (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  su_id            UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
  home_id          UUID NOT NULL REFERENCES homes(id),
  plan_type        care_plan_type NOT NULL,
  custom_name      VARCHAR(255),
  -- Core content
  aims_outcomes    TEXT,
  what_i_can_do    TEXT,
  how_to_support   TEXT,
  outcome_achieved outcome_status,
  outcome_date     DATE,
  -- Review tracking
  review_frequency review_frequency NOT NULL DEFAULT 'monthly',
  last_review_date DATE,
  next_review_date DATE,
  reviewed_by      UUID REFERENCES staff(id),
  -- Status
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_by       UUID REFERENCES staff(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_care_plans_su ON care_plans(su_id);
CREATE INDEX idx_care_plans_review ON care_plans(next_review_date) WHERE is_active = TRUE;

CREATE TABLE care_plan_updates (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  care_plan_id UUID NOT NULL REFERENCES care_plans(id) ON DELETE CASCADE,
  update_notes TEXT NOT NULL,
  updated_by   UUID NOT NULL REFERENCES staff(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cp_updates ON care_plan_updates(care_plan_id);

-- ================================================================
-- RISK ASSESSMENTS
-- ================================================================

CREATE TABLE risk_assessments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  su_id             UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
  home_id           UUID NOT NULL REFERENCES homes(id),
  assessment_name   VARCHAR(255) NOT NULL,
  description       TEXT,
  risk_level        risk_level NOT NULL DEFAULT 'low',
  current_risk_level risk_level NOT NULL DEFAULT 'low',
  who_is_at_risk    TEXT,
  is_historical     BOOLEAN NOT NULL DEFAULT FALSE,
  what_could_happen TEXT,
  triggers          TEXT,
  protective_factors TEXT,
  management_plan   TEXT,
  review_frequency  review_frequency NOT NULL DEFAULT 'monthly',
  last_review_date  DATE,
  next_review_date  DATE,
  reviewed_by       UUID REFERENCES staff(id),
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_by        UUID REFERENCES staff(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_risks_su ON risk_assessments(su_id);
CREATE INDEX idx_risks_review ON risk_assessments(next_review_date) WHERE is_active = TRUE;

CREATE TABLE risk_assessment_updates (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  risk_id          UUID NOT NULL REFERENCES risk_assessments(id) ON DELETE CASCADE,
  update_notes     TEXT NOT NULL,
  new_risk_level   risk_level,
  updated_by       UUID NOT NULL REFERENCES staff(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- DAILY RECORDS (parent table)
-- ================================================================

CREATE TABLE daily_records (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  su_id        UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
  home_id      UUID NOT NULL REFERENCES homes(id),
  staff_id     UUID NOT NULL REFERENCES staff(id),
  record_type  VARCHAR(50) NOT NULL,
  record_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  shift        VARCHAR(20) CHECK (shift IN ('morning','afternoon','evening','night')),
  notes        TEXT,
  flagged      BOOLEAN NOT NULL DEFAULT FALSE,
  flag_reason  TEXT,
  ai_reviewed  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dr_su ON daily_records(su_id);
CREATE INDEX idx_dr_home ON daily_records(home_id);
CREATE INDEX idx_dr_date ON daily_records(record_date);
CREATE INDEX idx_dr_type ON daily_records(record_type);
CREATE INDEX idx_dr_staff ON daily_records(staff_id);

-- Food & drink (auto-totalled by trigger)
CREATE TABLE records_food_drink (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_record_id UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
  entry_type     VARCHAR(5) NOT NULL CHECK (entry_type IN ('food','drink')),
  meal_type      VARCHAR(30),  -- breakfast/lunch/dinner/snack/supplement
  description    TEXT NOT NULL,
  amount_eaten   VARCHAR(30),  -- all/three_quarters/half/quarter/none
  volume_ml      INTEGER,      -- for drinks
  assisted       BOOLEAN NOT NULL DEFAULT FALSE,
  refused        BOOLEAN NOT NULL DEFAULT FALSE,
  notes          TEXT
);

CREATE INDEX idx_food_drink_record ON records_food_drink(daily_record_id);

-- Daily fluid totals (maintained by trigger)
CREATE TABLE su_daily_fluid_totals (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  su_id        UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
  home_id      UUID NOT NULL REFERENCES homes(id),
  record_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  total_ml     INTEGER NOT NULL DEFAULT 0,
  below_threshold BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(su_id, record_date)
);

CREATE INDEX idx_fluid_su_date ON su_daily_fluid_totals(su_id, record_date);

-- Clinical vitals
CREATE TABLE records_vitals (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_record_id UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
  vital_type     VARCHAR(20) NOT NULL CHECK (vital_type IN ('bp','temperature','oxygen','weight','must')),
  -- Blood pressure
  systolic       INTEGER,
  diastolic      INTEGER,
  pulse          INTEGER,
  bp_position    VARCHAR(20),  -- sitting/standing/lying
  -- Temperature
  temp_celsius   DECIMAL(4,1),
  temp_method    VARCHAR(20),  -- ear/forehead/oral/axillary
  -- Oxygen
  spo2_percent   INTEGER,
  supplemental_o2 BOOLEAN DEFAULT FALSE,
  o2_litres_min  DECIMAL(4,1),
  -- Weight & MUST
  weight_kg      DECIMAL(5,2),
  height_cm      DECIMAL(5,1),
  bmi            DECIMAL(4,1),
  must_score     INTEGER,      -- 0, 1, or 2+
  prev_weight_kg DECIMAL(5,2),
  weight_change_pct DECIMAL(5,2),
  -- Alert
  outside_range  BOOLEAN NOT NULL DEFAULT FALSE,
  action_taken   TEXT
);

CREATE INDEX idx_vitals_record ON records_vitals(daily_record_id);

-- Personal care
CREATE TABLE records_personal_care (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_record_id UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
  care_types      TEXT[],  -- wash/shower/bath/hair_wash/shave/nail_care
  assistance_level VARCHAR(20) CHECK (assistance_level IN ('independent','prompted','assisted','full_assist')),
  continence_care BOOLEAN NOT NULL DEFAULT FALSE,
  continence_notes TEXT,
  skin_condition  TEXT,
  notes           TEXT
);

-- Bowel movement
CREATE TABLE records_bowel (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_record_id UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
  bristol_type    INTEGER CHECK (bristol_type BETWEEN 1 AND 7),
  frequency_today INTEGER,
  colour          VARCHAR(30),
  consistency_notes TEXT,
  laxative_given  BOOLEAN NOT NULL DEFAULT FALSE,
  days_since_last INTEGER
);

-- Behaviour
CREATE TABLE records_behaviour (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_record_id UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
  mood            VARCHAR(30) CHECK (mood IN ('happy','calm','anxious','agitated','distressed','withdrawn','other')),
  behaviour_noted TEXT,
  triggers_noted  TEXT,
  action_taken    TEXT,
  escalated       BOOLEAN NOT NULL DEFAULT FALSE
);

-- Repositioning
CREATE TABLE records_repositioning (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_record_id UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
  position        VARCHAR(20) CHECK (position IN ('left_side','right_side','back','sitting','other')),
  skin_checked    BOOLEAN NOT NULL DEFAULT FALSE,
  skin_concerns   TEXT,
  next_due_at     TIMESTAMPTZ,
  notes           TEXT
);

-- Oral care
CREATE TABLE records_oral_care (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_record_id UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
  care_types      TEXT[],  -- teeth_brushed/dentures_cleaned/mouthwash/oral_swab
  mouth_condition VARCHAR(30) CHECK (mouth_condition IN ('good','dry','sore','ulcers','bleeding','other')),
  has_dentures    BOOLEAN,
  denture_type    VARCHAR(20),  -- upper/lower/full
  notes           TEXT
);

-- Communication
CREATE TABLE records_communication (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_record_id UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
  mode_used       VARCHAR(30),  -- verbal/makaton/pecs/written/eye_gaze/other
  topic           TEXT,
  response_level  VARCHAR(20) CHECK (response_level IN ('good','limited','none','non_verbal')),
  notes           TEXT
);

-- One to one conversations
CREATE TABLE records_one_to_one (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_record_id UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
  topics          TEXT,
  duration_mins   INTEGER,
  engagement      VARCHAR(20) CHECK (engagement IN ('good','limited','refused','other')),
  follow_up       BOOLEAN NOT NULL DEFAULT FALSE,
  follow_up_notes TEXT,
  notes           TEXT
);

-- Social activities
CREATE TABLE records_social_activity (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_record_id UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
  activity_name   VARCHAR(255),
  engagement      VARCHAR(30) CHECK (engagement IN ('fully_engaged','partially','observed','declined')),
  enjoyed         VARCHAR(10) CHECK (enjoyed IN ('yes','no','unsure')),
  notes           TEXT
);

-- Visits (social, family, community access)
CREATE TABLE records_visits (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_record_id UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
  visit_type      VARCHAR(20) CHECK (visit_type IN ('social','family','community')),
  visitor_name    VARCHAR(255),
  relationship    VARCHAR(100),
  location        VARCHAR(255),
  time_arrived    TIMESTAMPTZ,
  time_left       TIMESTAMPTZ,
  su_response     VARCHAR(30),
  notes           TEXT
);

-- Incidents
CREATE TABLE records_incidents (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_record_id  UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
  incident_type    VARCHAR(50),
  location         TEXT,
  incident_time    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  description      TEXT NOT NULL,
  injuries         BOOLEAN NOT NULL DEFAULT FALSE,
  injury_details   TEXT,
  body_map_data    JSONB,  -- {front: [{x,y,label}], back: [...]}
  medical_needed   BOOLEAN NOT NULL DEFAULT FALSE,
  medical_details  TEXT,
  witnesses        TEXT,
  immediate_action TEXT NOT NULL,
  reported_to      UUID REFERENCES staff(id),
  reported_at      TIMESTAMPTZ,
  safeguarding_ref BOOLEAN NOT NULL DEFAULT FALSE,
  manager_reviewed BOOLEAN NOT NULL DEFAULT FALSE,
  manager_reviewed_at TIMESTAMPTZ,
  ai_analysis      TEXT,  -- forensic root cause from AI engine
  ai_analysed_at   TIMESTAMPTZ
);

CREATE INDEX idx_incidents_record ON records_incidents(daily_record_id);

-- Safeguarding concerns (formal record)
CREATE TABLE safeguarding_concerns (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  su_id                UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
  home_id              UUID NOT NULL REFERENCES homes(id),
  created_by           UUID NOT NULL REFERENCES staff(id),
  su_location          TEXT,
  incident_location    TEXT,
  incident_date        DATE NOT NULL,
  incident_time        TIME,
  overview             TEXT NOT NULL,
  witnesses            TEXT,
  medical_required     BOOLEAN NOT NULL DEFAULT FALSE,
  medical_details      TEXT,
  injury_details       TEXT,
  body_map_data        JSONB,
  immediate_actions    TEXT NOT NULL,
  decisions_breached   TEXT,
  lessons_learnt       TEXT,
  outside_agency       BOOLEAN NOT NULL DEFAULT FALSE,
  agency_details       TEXT,
  management_recs      TEXT,
  prevention_actions   TEXT,
  reported_to          UUID REFERENCES staff(id),
  reported_at          TIMESTAMPTZ,
  manager_ack          BOOLEAN NOT NULL DEFAULT FALSE,
  manager_ack_by       UUID REFERENCES staff(id),
  manager_ack_at       TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_safeguarding_su ON safeguarding_concerns(su_id);
CREATE INDEX idx_safeguarding_home ON safeguarding_concerns(home_id);

-- PRN Medications
CREATE TABLE records_prn_medication (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_record_id UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
  medication_name VARCHAR(255) NOT NULL,
  dose            VARCHAR(100),
  reason          TEXT NOT NULL,
  administered_by UUID NOT NULL REFERENCES staff(id),
  witnessed_by    UUID REFERENCES staff(id),
  outcome_notes   TEXT,
  reviewed_at     TIMESTAMPTZ
);

-- MAR (Medication Administration Records)
CREATE TABLE mar_records (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  su_id           UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
  home_id         UUID NOT NULL REFERENCES homes(id),
  medication_name VARCHAR(255) NOT NULL,
  dose            VARCHAR(100) NOT NULL,
  route           VARCHAR(50),  -- oral/topical/injection/inhaled
  frequency       VARCHAR(100),
  scheduled_time  TIME,
  record_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  given           BOOLEAN,  -- null = not yet due
  given_at        TIMESTAMPTZ,
  given_by        UUID REFERENCES staff(id),
  witnessed_by    UUID REFERENCES staff(id),
  refused         BOOLEAN NOT NULL DEFAULT FALSE,
  refused_reason  TEXT,
  omitted         BOOLEAN NOT NULL DEFAULT FALSE,
  omit_reason     TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mar_su ON mar_records(su_id);
CREATE INDEX idx_mar_date ON mar_records(record_date);

-- Medication stock count
CREATE TABLE records_med_stock (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_record_id UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
  medication_name VARCHAR(255) NOT NULL,
  opening_balance INTEGER NOT NULL,
  given_today     INTEGER NOT NULL DEFAULT 0,
  closing_balance INTEGER NOT NULL,
  expected_balance INTEGER NOT NULL,
  discrepancy     BOOLEAN NOT NULL DEFAULT FALSE,
  discrepancy_notes TEXT,
  counted_by      UUID NOT NULL REFERENCES staff(id),
  witnessed_by    UUID REFERENCES staff(id)
);

-- Handover records
CREATE TABLE records_handover (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_record_id UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
  shift_summary   TEXT NOT NULL,
  priority_flags  TEXT[],  -- displayed on next shift login
  outstanding_actions TEXT,
  signed_off      BOOLEAN NOT NULL DEFAULT FALSE,
  signed_off_at   TIMESTAMPTZ
);

-- Follow-up tasks
CREATE TABLE records_followup (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_record_id UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
  su_id           UUID NOT NULL REFERENCES service_users(id),
  home_id         UUID NOT NULL REFERENCES homes(id),
  task_description TEXT NOT NULL,
  assigned_to     UUID REFERENCES staff(id),
  due_date        DATE,
  completed       BOOLEAN NOT NULL DEFAULT FALSE,
  completed_by    UUID REFERENCES staff(id),
  completed_at    TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_followup_assigned ON records_followup(assigned_to) WHERE completed = FALSE;

-- Comfort/welfare checks
CREATE TABLE records_welfare_check (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_record_id UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
  check_type      VARCHAR(20) CHECK (check_type IN ('comfort','welfare','night')),
  su_status       VARCHAR(30),
  environment_ok  BOOLEAN NOT NULL DEFAULT TRUE,
  environment_notes TEXT,
  action_taken    TEXT
);

-- Weight / MUST standalone (for MUST module)
CREATE TABLE records_must (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  su_id           UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
  home_id         UUID NOT NULL REFERENCES homes(id),
  staff_id        UUID NOT NULL REFERENCES staff(id),
  record_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  current_weight  DECIMAL(5,2) NOT NULL,
  current_height  DECIMAL(5,1) NOT NULL,
  bmi             DECIMAL(4,1) NOT NULL,
  bmi_score       INTEGER NOT NULL,   -- 0=>=20, 1=18.5-20, 2=<18.5
  weight_loss_pct DECIMAL(5,2),
  weight_score    INTEGER NOT NULL,   -- 0=<5%, 1=5-10%, 2=>10%
  acutely_ill     BOOLEAN NOT NULL DEFAULT FALSE,
  acute_score     INTEGER NOT NULL DEFAULT 0,  -- 0 or 2
  must_score      INTEGER NOT NULL,   -- 0=low, 1=medium, 2+=high
  must_category   VARCHAR(10) NOT NULL CHECK (must_category IN ('low','medium','high')),
  prev_weight     DECIMAL(5,2),
  action_plan     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_must_su ON records_must(su_id, record_date);

-- ================================================================
-- TASKS
-- ================================================================

CREATE TABLE task_templates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_id         UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  created_by      UUID NOT NULL REFERENCES staff(id),
  task_name       VARCHAR(255) NOT NULL,
  category        VARCHAR(50) NOT NULL,
  description     TEXT,
  frequency       VARCHAR(20) NOT NULL CHECK (frequency IN ('daily','twice_daily','weekly','fortnightly','monthly','one_off')),
  scheduled_time  TIME,
  assigned_role   staff_role,
  assigned_staff  UUID REFERENCES staff(id),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE task_completions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id  UUID NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
  home_id      UUID NOT NULL REFERENCES homes(id),
  su_id        UUID REFERENCES service_users(id),
  due_date     DATE NOT NULL,
  due_time     TIME,
  completed    BOOLEAN NOT NULL DEFAULT FALSE,
  completed_by UUID REFERENCES staff(id),
  completed_at TIMESTAMPTZ,
  notes        TEXT,
  missed       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_task_comp_due ON task_completions(due_date, completed);
CREATE INDEX idx_task_comp_home ON task_completions(home_id);

-- ================================================================
-- MESSAGING (STAFF INBOX)
-- ================================================================

CREATE TABLE staff_messages (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_id      UUID NOT NULL REFERENCES homes(id),
  sender_id    UUID NOT NULL REFERENCES staff(id),
  recipient_id UUID REFERENCES staff(id),  -- null = broadcast to home
  subject      VARCHAR(255),
  body         TEXT NOT NULL,
  is_read      BOOLEAN NOT NULL DEFAULT FALSE,
  read_at      TIMESTAMPTZ,
  parent_id    UUID REFERENCES staff_messages(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_staff_msg_recipient ON staff_messages(recipient_id);
CREATE INDEX idx_staff_msg_home ON staff_messages(home_id);

-- ================================================================
-- POLICIES & PROCEDURES
-- ================================================================

CREATE TABLE policies (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  home_id        UUID REFERENCES homes(id),  -- null = org-wide
  title          VARCHAR(255) NOT NULL,
  version        VARCHAR(20) NOT NULL DEFAULT '1.0',
  document_url   VARCHAR(500) NOT NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  review_date    DATE,
  uploaded_by    UUID NOT NULL REFERENCES staff(id),
  requires_sign  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE policy_sign_offs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id   UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  staff_id    UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  signed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(policy_id, staff_id)
);

-- ================================================================
-- AUDITS
-- ================================================================

CREATE TABLE audit_reports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_id         UUID NOT NULL REFERENCES homes(id),
  audit_type      audit_type NOT NULL,
  custom_name     VARCHAR(255),
  period_from     DATE NOT NULL,
  period_to       DATE NOT NULL,
  generated_by    UUID REFERENCES staff(id),
  is_ai_generated BOOLEAN NOT NULL DEFAULT TRUE,
  -- AI output
  total_checks    INTEGER,
  checks_passed   INTEGER,
  checks_failed   INTEGER,
  findings        TEXT,
  recommendations TEXT,
  raw_report      TEXT,
  -- Status
  status          VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('generating','completed','failed')),
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audits_home ON audit_reports(home_id);
CREATE INDEX idx_audits_type ON audit_reports(audit_type);
CREATE INDEX idx_audits_date ON audit_reports(generated_at);

-- ================================================================
-- BUSINESS ALERTS
-- ================================================================

CREATE TABLE business_alerts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_id      UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  alert_type   alert_type NOT NULL,
  severity     alert_severity NOT NULL DEFAULT 'warning',
  title        VARCHAR(255) NOT NULL,
  description  TEXT NOT NULL,
  -- What this alert refers to
  su_id        UUID REFERENCES service_users(id),
  staff_id     UUID REFERENCES staff(id),
  record_id    UUID,  -- generic reference
  record_type  VARCHAR(50),
  -- State
  is_resolved  BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_by  UUID REFERENCES staff(id),
  resolved_at  TIMESTAMPTZ,
  resolution_notes TEXT,
  -- Notification tracking
  notified_admin  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_home ON business_alerts(home_id);
CREATE INDEX idx_alerts_unresolved ON business_alerts(home_id, is_resolved) WHERE is_resolved = FALSE;
CREATE INDEX idx_alerts_su ON business_alerts(su_id) WHERE su_id IS NOT NULL;

-- ================================================================
-- CALENDAR / EVENTS
-- ================================================================

CREATE TABLE calendar_events (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_id      UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  created_by   UUID NOT NULL REFERENCES staff(id),
  title        VARCHAR(255) NOT NULL,
  event_type   VARCHAR(50),
  start_time   TIMESTAMPTZ NOT NULL,
  end_time     TIMESTAMPTZ,
  location     TEXT,
  description  TEXT,
  agenda       TEXT,
  attendees    UUID[],  -- array of staff IDs
  notes        TEXT,
  action_plans TEXT,
  concerns     TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE calendar_event_sign_offs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id    UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  staff_id    UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  signed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, staff_id)
);

-- ================================================================
-- PPE / INVENTORY
-- ================================================================

CREATE TABLE ppe_inventory (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_id      UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  item_name    VARCHAR(255) NOT NULL,
  item_variant VARCHAR(100),  -- e.g. size S/M/L for gloves
  current_stock INTEGER NOT NULL DEFAULT 0,
  min_stock    INTEGER NOT NULL DEFAULT 10,
  unit         VARCHAR(30) NOT NULL DEFAULT 'units',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ppe_transactions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id      UUID NOT NULL REFERENCES ppe_inventory(id) ON DELETE CASCADE,
  home_id      UUID NOT NULL REFERENCES homes(id),
  transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('in','out')),
  quantity     INTEGER NOT NULL,
  staff_id     UUID REFERENCES staff(id),  -- who took items
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ppe_transactions ON ppe_transactions(item_id);

-- ================================================================
-- QUALITY ASSURANCE
-- ================================================================

CREATE TABLE qa_records (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_id       UUID NOT NULL REFERENCES homes(id),
  record_type   VARCHAR(20) NOT NULL CHECK (record_type IN ('complaint','compliment','feedback','concern')),
  subject_type  VARCHAR(10) CHECK (subject_type IN ('staff','su','home')),
  subject_su    UUID REFERENCES service_users(id),
  subject_staff UUID REFERENCES staff(id),
  raised_by     VARCHAR(255),
  raised_by_role VARCHAR(100),
  description   TEXT NOT NULL,
  action_taken  TEXT,
  outcome       TEXT,
  resolved      BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at   TIMESTAMPTZ,
  created_by    UUID REFERENCES staff(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_qa_home ON qa_records(home_id);

-- Service user review & feedback
CREATE TABLE su_reviews (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  su_id       UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
  home_id     UUID NOT NULL REFERENCES homes(id),
  review_type VARCHAR(20) NOT NULL CHECK (review_type IN ('review','feedback')),
  review_date DATE NOT NULL DEFAULT CURRENT_DATE,
  conducted_by UUID NOT NULL REFERENCES staff(id),
  attendees   TEXT,
  summary     TEXT NOT NULL,
  outcomes    TEXT,
  action_plans TEXT,
  next_review_date DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- IMMUTABLE AUDIT LOG (every action in the system)
-- ================================================================

CREATE TABLE audit_log (
  id           BIGSERIAL PRIMARY KEY,
  timestamp    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  staff_id     UUID REFERENCES staff(id),
  home_id      UUID REFERENCES homes(id),
  action       VARCHAR(50) NOT NULL,   -- CREATE/UPDATE/DELETE/LOGIN/LOGOUT/VIEW
  table_name   VARCHAR(100),
  record_id    UUID,
  old_values   JSONB,
  new_values   JSONB,
  ip_address   INET,
  user_agent   TEXT,
  session_id   VARCHAR(255)
) PARTITION BY RANGE (timestamp);

-- Create initial partitions (one per month - add more as needed)
CREATE TABLE audit_log_2025 PARTITION OF audit_log
  FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE audit_log_2026 PARTITION OF audit_log
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE audit_log_2027 PARTITION OF audit_log
  FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');

CREATE INDEX idx_audit_staff ON audit_log(staff_id, timestamp);
CREATE INDEX idx_audit_record ON audit_log(table_name, record_id);

-- ================================================================
-- TRIGGERS
-- ================================================================

-- Auto-update updated_at on any UPDATE
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_organisations_updated BEFORE UPDATE ON organisations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_homes_updated BEFORE UPDATE ON homes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_staff_updated BEFORE UPDATE ON staff FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_su_updated BEFORE UPDATE ON service_users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_care_plans_updated BEFORE UPDATE ON care_plans FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_risks_updated BEFORE UPDATE ON risk_assessments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-total fluid intake when a drink record is inserted/updated
CREATE OR REPLACE FUNCTION update_fluid_total()
RETURNS TRIGGER AS $$
DECLARE
  v_su_id UUID;
  v_home_id UUID;
  v_date DATE;
  v_total INTEGER;
  v_min_ml INTEGER;
BEGIN
  SELECT dr.su_id, dr.home_id, dr.record_date
  INTO v_su_id, v_home_id, v_date
  FROM daily_records dr WHERE dr.id = NEW.daily_record_id;

  SELECT COALESCE(SUM(volume_ml), 0) INTO v_total
  FROM records_food_drink rfd
  JOIN daily_records dr ON dr.id = rfd.daily_record_id
  WHERE dr.su_id = v_su_id AND dr.record_date = v_date AND rfd.entry_type = 'drink';

  SELECT min_fluid_ml INTO v_min_ml FROM service_users WHERE id = v_su_id;

  INSERT INTO su_daily_fluid_totals (su_id, home_id, record_date, total_ml, below_threshold)
  VALUES (v_su_id, v_home_id, v_date, v_total, v_total < COALESCE(v_min_ml, 1500))
  ON CONFLICT (su_id, record_date) DO UPDATE
  SET total_ml = EXCLUDED.total_ml,
      below_threshold = EXCLUDED.below_threshold,
      updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_fluid_total
AFTER INSERT OR UPDATE ON records_food_drink
FOR EACH ROW WHEN (NEW.entry_type = 'drink' AND NEW.volume_ml IS NOT NULL)
EXECUTE FUNCTION update_fluid_total();

-- Auto-calculate BMI when weight vitals are inserted
CREATE OR REPLACE FUNCTION calculate_bmi()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.vital_type = 'weight' AND NEW.weight_kg IS NOT NULL AND NEW.height_cm IS NOT NULL THEN
    NEW.bmi := ROUND((NEW.weight_kg / POWER(NEW.height_cm / 100.0, 2))::NUMERIC, 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calc_bmi
BEFORE INSERT OR UPDATE ON records_vitals
FOR EACH ROW EXECUTE FUNCTION calculate_bmi();

-- ================================================================
-- SEED: DEFAULT ORGANISATION (update values before deploy)
-- ================================================================

INSERT INTO organisations (id, name, reg_number, email)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'CompCare Hub Organisation',
  'REG-001',
  'admin@compcarehub.co.uk'
);
