-- ================================================================
-- ONE-SHOT FIX + SEED — run this in pgAdmin on the healthark database
-- Adds ALL missing columns then inserts all demo data
-- ================================================================

-- ── Add every possibly-missing column ────────────────────────────

-- organisations
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS reg_number   VARCHAR(100);
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS cqc_provider VARCHAR(100);
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS address1     VARCHAR(255);
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS phone        VARCHAR(20);
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS email        VARCHAR(255);
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS logo_url     VARCHAR(500);

-- staff
ALTER TABLE staff ADD COLUMN IF NOT EXISTS refresh_token      VARCHAR(500);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS reset_token        VARCHAR(255);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMPTZ;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS is_active          BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS last_login         TIMESTAMPTZ;

-- service_users
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
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS dnar              BOOLEAN;
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS dnar_form_url     VARCHAR(500);
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS dnar_location     TEXT;
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS has_lpa           BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS lpa_type          VARCHAR(100);
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS lpa_attorney      VARCHAR(255);
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS has_cop_order     BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS emergency_rating  VARCHAR(20) NOT NULL DEFAULT 'low';
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS preferred_name    VARCHAR(100);
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS pronouns          VARCHAR(50);
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS ni_number         VARCHAR(20);
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
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS capacity_doc_url  VARCHAR(500);
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS best_interest_url VARCHAR(500);

-- business_alerts
ALTER TABLE business_alerts ADD COLUMN IF NOT EXISTS su_id            UUID REFERENCES service_users(id) ON DELETE SET NULL;
ALTER TABLE business_alerts ADD COLUMN IF NOT EXISTS staff_id         UUID REFERENCES staff(id) ON DELETE SET NULL;
ALTER TABLE business_alerts ADD COLUMN IF NOT EXISTS record_id        UUID;
ALTER TABLE business_alerts ADD COLUMN IF NOT EXISTS record_type      VARCHAR(50);
ALTER TABLE business_alerts ADD COLUMN IF NOT EXISTS resolved_by      UUID REFERENCES staff(id) ON DELETE SET NULL;
ALTER TABLE business_alerts ADD COLUMN IF NOT EXISTS resolved_at      TIMESTAMPTZ;
ALTER TABLE business_alerts ADD COLUMN IF NOT EXISTS resolution_notes TEXT;
ALTER TABLE business_alerts ADD COLUMN IF NOT EXISTS notified_admin   BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE business_alerts ADD COLUMN IF NOT EXISTS is_resolved      BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE business_alerts ADD COLUMN IF NOT EXISTS severity         VARCHAR(20) NOT NULL DEFAULT 'medium';
ALTER TABLE business_alerts ADD COLUMN IF NOT EXISTS alert_type       VARCHAR(100);
ALTER TABLE business_alerts ADD COLUMN IF NOT EXISTS title            VARCHAR(255);
ALTER TABLE business_alerts ADD COLUMN IF NOT EXISTS description      TEXT;

-- task_templates
ALTER TABLE task_templates ADD COLUMN IF NOT EXISTS created_by    UUID REFERENCES staff(id) ON DELETE SET NULL;
ALTER TABLE task_templates ADD COLUMN IF NOT EXISTS task_name     VARCHAR(255);
ALTER TABLE task_templates ADD COLUMN IF NOT EXISTS title         VARCHAR(255);
ALTER TABLE task_templates ADD COLUMN IF NOT EXISTS category      VARCHAR(100) NOT NULL DEFAULT 'general';
ALTER TABLE task_templates ADD COLUMN IF NOT EXISTS description   TEXT;
ALTER TABLE task_templates ADD COLUMN IF NOT EXISTS assigned_role VARCHAR(50);
ALTER TABLE task_templates ADD COLUMN IF NOT EXISTS due_time      TIME;
ALTER TABLE task_templates ADD COLUMN IF NOT EXISTS priority      VARCHAR(20) NOT NULL DEFAULT 'normal';
ALTER TABLE task_templates ADD COLUMN IF NOT EXISTS su_id         UUID REFERENCES service_users(id) ON DELETE SET NULL;
ALTER TABLE task_templates ADD COLUMN IF NOT EXISTS frequency     VARCHAR(50) NOT NULL DEFAULT 'daily';
ALTER TABLE task_templates ADD COLUMN IF NOT EXISTS is_active     BOOLEAN NOT NULL DEFAULT TRUE;

-- tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS su_id            UUID REFERENCES service_users(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by       UUID REFERENCES staff(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS title            VARCHAR(255);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS category         VARCHAR(100) NOT NULL DEFAULT 'general';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description      TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_date        DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_time         TIME;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority         VARCHAR(20) NOT NULL DEFAULT 'normal';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_role    VARCHAR(50);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_to      UUID REFERENCES staff(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status           VARCHAR(20) NOT NULL DEFAULT 'pending';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_by     UUID REFERENCES staff(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at     TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completion_notes TEXT;

-- medication_stock
ALTER TABLE medication_stock ALTER COLUMN medication_id DROP NOT NULL;
ALTER TABLE medication_stock ADD COLUMN IF NOT EXISTS home_id            UUID REFERENCES homes(id) ON DELETE CASCADE;
ALTER TABLE medication_stock ADD COLUMN IF NOT EXISTS medication_name    VARCHAR(255);
ALTER TABLE medication_stock ADD COLUMN IF NOT EXISTS form               VARCHAR(100);
ALTER TABLE medication_stock ADD COLUMN IF NOT EXISTS strength           VARCHAR(100);
ALTER TABLE medication_stock ADD COLUMN IF NOT EXISTS quantity_remaining DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE medication_stock ADD COLUMN IF NOT EXISTS unit               VARCHAR(50) NOT NULL DEFAULT 'tablets';
ALTER TABLE medication_stock ADD COLUMN IF NOT EXISTS reorder_threshold  DECIMAL(10,2) NOT NULL DEFAULT 7;
ALTER TABLE medication_stock ADD COLUMN IF NOT EXISTS expiry_date        DATE;
ALTER TABLE medication_stock ADD COLUMN IF NOT EXISTS batch_number       VARCHAR(100);
ALTER TABLE medication_stock ADD COLUMN IF NOT EXISTS supplier           VARCHAR(255);
ALTER TABLE medication_stock ADD COLUMN IF NOT EXISTS last_updated_by    UUID REFERENCES staff(id) ON DELETE SET NULL;
ALTER TABLE medication_stock ADD COLUMN IF NOT EXISTS notes              TEXT;

-- su_medications
ALTER TABLE su_medications ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES staff(id) ON DELETE SET NULL;
ALTER TABLE su_medications ADD COLUMN IF NOT EXISTS notes      TEXT;
ALTER TABLE su_medications ADD COLUMN IF NOT EXISTS end_date   DATE;

-- staff_cautions
ALTER TABLE staff_cautions ADD COLUMN IF NOT EXISTS home_id UUID REFERENCES homes(id) ON DELETE CASCADE;

-- staff_clock_events
ALTER TABLE staff_clock_events ALTER COLUMN su_id DROP NOT NULL;

-- ── Create missing tables ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS su_contacts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  su_id           UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
  full_name       VARCHAR(255) NOT NULL,
  relationship    VARCHAR(100),
  contact_tag     VARCHAR(100),
  phone_primary   VARCHAR(20),
  phone_secondary VARCHAR(20),
  email           VARCHAR(255),
  address1        VARCHAR(255),
  address2        VARCHAR(255),
  postcode        VARCHAR(10),
  is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
  notes           TEXT,
  display_order   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS staff_supervisions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id         UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  home_id          UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  conducted_by     UUID NOT NULL REFERENCES staff(id),
  supervision_date DATE NOT NULL DEFAULT CURRENT_DATE,
  supervision_type VARCHAR(50) NOT NULL DEFAULT 'monthly',
  topics           TEXT,
  staff_comments   TEXT,
  manager_comments TEXT,
  action_points    TEXT,
  next_due_date    DATE,
  document_url     VARCHAR(500),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS medication_stock_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stock_id        UUID NOT NULL REFERENCES medication_stock(id) ON DELETE CASCADE,
  adjusted_by     UUID NOT NULL REFERENCES staff(id),
  adjustment_type VARCHAR(50) NOT NULL,
  quantity_change DECIMAL(10,2) NOT NULL,
  quantity_before DECIMAL(10,2) NOT NULL,
  quantity_after  DECIMAL(10,2) NOT NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mar_records (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  su_id           UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
  home_id         UUID NOT NULL REFERENCES homes(id),
  medication_name VARCHAR(255) NOT NULL,
  dose            VARCHAR(100) NOT NULL,
  route           VARCHAR(50),
  frequency       VARCHAR(100),
  scheduled_time  TIME,
  record_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  given           BOOLEAN,
  given_at        TIMESTAMPTZ,
  given_by        UUID REFERENCES staff(id) ON DELETE SET NULL,
  witnessed_by    UUID REFERENCES staff(id) ON DELETE SET NULL,
  refused         BOOLEAN NOT NULL DEFAULT FALSE,
  refused_reason  TEXT,
  omitted         BOOLEAN NOT NULL DEFAULT FALSE,
  omit_reason     TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS care_plans (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  su_id            UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
  home_id          UUID NOT NULL REFERENCES homes(id),
  plan_type        VARCHAR(100) NOT NULL,
  custom_name      VARCHAR(255),
  aims_outcomes    TEXT,
  what_i_can_do    TEXT,
  how_to_support   TEXT,
  outcome_achieved VARCHAR(50),
  outcome_date     DATE,
  review_frequency VARCHAR(50) NOT NULL DEFAULT 'monthly',
  last_review_date DATE,
  next_review_date DATE,
  reviewed_by      UUID REFERENCES staff(id) ON DELETE SET NULL,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_by       UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_records (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  su_id       UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
  home_id     UUID NOT NULL REFERENCES homes(id),
  staff_id    UUID NOT NULL REFERENCES staff(id),
  record_type VARCHAR(50) NOT NULL,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  shift       VARCHAR(20),
  notes       TEXT,
  flagged     BOOLEAN NOT NULL DEFAULT FALSE,
  flag_reason TEXT,
  ai_reviewed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_leave (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id        UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  home_id         UUID NOT NULL REFERENCES homes(id),
  leave_type      VARCHAR(50) NOT NULL,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  hours_requested DECIMAL(6,2) NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending',
  reason          TEXT,
  approved_by     UUID REFERENCES staff(id) ON DELETE SET NULL,
  approved_at     TIMESTAMPTZ,
  decline_reason  TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ppe_inventory (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_id       UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  item_name     VARCHAR(255) NOT NULL,
  item_variant  VARCHAR(100),
  current_stock INTEGER NOT NULL DEFAULT 0,
  min_stock     INTEGER NOT NULL DEFAULT 0,
  unit          VARCHAR(50) NOT NULL DEFAULT 'units',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_onboarding (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id                  UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE UNIQUE,
  application_received      BOOLEAN NOT NULL DEFAULT FALSE,
  dbs_cleared               BOOLEAN NOT NULL DEFAULT FALSE,
  references_received       BOOLEAN NOT NULL DEFAULT FALSE,
  care_cert_completed       BOOLEAN NOT NULL DEFAULT FALSE,
  induction_completed       BOOLEAN NOT NULL DEFAULT FALSE,
  right_to_work_verified    BOOLEAN NOT NULL DEFAULT FALSE,
  system_training_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS business_alerts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_id          UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  alert_type       VARCHAR(100) NOT NULL DEFAULT 'general',
  severity         VARCHAR(20)  NOT NULL DEFAULT 'medium',
  title            VARCHAR(255) NOT NULL DEFAULT '',
  description      TEXT,
  su_id            UUID REFERENCES service_users(id) ON DELETE SET NULL,
  staff_id         UUID REFERENCES staff(id) ON DELETE SET NULL,
  record_id        UUID,
  record_type      VARCHAR(50),
  is_resolved      BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_by      UUID REFERENCES staff(id) ON DELETE SET NULL,
  resolved_at      TIMESTAMPTZ,
  resolution_notes TEXT,
  notified_admin   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── DEMO DATA ─────────────────────────────────────────────────────
DO $$
DECLARE
  v_org_id    UUID := '00000000-0000-0000-0000-000000000001';
  v_home_id   UUID;
  v_admin_id  UUID;
  v_mgr_id    UUID;
  v_senior_id UUID;
  v_care1_id  UUID;
  v_care2_id  UUID;
  su1 UUID; su2 UUID; su3 UUID; su4 UUID; su5 UUID; su6 UUID;
BEGIN

-- Organisation
INSERT INTO organisations (id, name)
VALUES (v_org_id, 'CompCare Hub Organisation')
ON CONFLICT (id) DO NOTHING;

-- Home
INSERT INTO homes (organisation_id, name, address1, postcode, phone, manager_name, geofence_radius, is_active)
VALUES (v_org_id, 'Sunrise Care Home', '14 Meadow Lane', 'LE3 5BP', '0116 456 7890', 'Sarah Johnson', 200, true)
ON CONFLICT DO NOTHING;
SELECT id INTO v_home_id FROM homes WHERE organisation_id = v_org_id LIMIT 1;

-- Admin (password: Admin1234)
INSERT INTO staff (organisation_id, home_id, email, password_hash, first_name, last_name, role, is_active, status)
VALUES (v_org_id, v_home_id, 'admin@healthark.co.uk',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVKhB7fRCi',
  'System', 'Admin', 'group_admin', true, 'active')
ON CONFLICT (email) DO UPDATE SET
  organisation_id=v_org_id, home_id=v_home_id, is_active=true, status='active',
  password_hash='$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVKhB7fRCi';
SELECT id INTO v_admin_id FROM staff WHERE email='admin@healthark.co.uk';
INSERT INTO staff_onboarding (staff_id) VALUES (v_admin_id) ON CONFLICT DO NOTHING;

-- Manager
INSERT INTO staff (organisation_id, home_id, email, password_hash, first_name, last_name, role, phone, is_active, status, date_of_birth)
VALUES (v_org_id, v_home_id, 'manager@healthark.co.uk',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVKhB7fRCi',
  'Sarah', 'Johnson', 'home_manager', '07700900001', true, 'active', '1985-03-12')
ON CONFLICT (email) DO UPDATE SET
  organisation_id=v_org_id, home_id=v_home_id, is_active=true, status='active',
  password_hash='$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVKhB7fRCi';
SELECT id INTO v_mgr_id FROM staff WHERE email='manager@healthark.co.uk';
INSERT INTO staff_onboarding (staff_id) VALUES (v_mgr_id) ON CONFLICT DO NOTHING;
INSERT INTO staff_home_access (staff_id, home_id) VALUES (v_mgr_id, v_home_id) ON CONFLICT DO NOTHING;

-- Senior carer
INSERT INTO staff (organisation_id, home_id, email, password_hash, first_name, last_name, role, phone, is_active, status, date_of_birth)
VALUES (v_org_id, v_home_id, 'senior@healthark.co.uk',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVKhB7fRCi',
  'Michael', 'Okafor', 'senior_carer', '07700900002', true, 'active', '1990-07-22')
ON CONFLICT (email) DO UPDATE SET
  organisation_id=v_org_id, home_id=v_home_id, is_active=true, status='active',
  password_hash='$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVKhB7fRCi';
SELECT id INTO v_senior_id FROM staff WHERE email='senior@healthark.co.uk';
INSERT INTO staff_onboarding (staff_id) VALUES (v_senior_id) ON CONFLICT DO NOTHING;
INSERT INTO staff_home_access (staff_id, home_id) VALUES (v_senior_id, v_home_id) ON CONFLICT DO NOTHING;

-- Care staff 1
INSERT INTO staff (organisation_id, home_id, email, password_hash, first_name, last_name, role, phone, is_active, status, date_of_birth)
VALUES (v_org_id, v_home_id, 'care1@healthark.co.uk',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVKhB7fRCi',
  'Priya', 'Sharma', 'care_staff', '07700900003', true, 'active', '1995-11-05')
ON CONFLICT (email) DO UPDATE SET
  organisation_id=v_org_id, home_id=v_home_id, is_active=true, status='active',
  password_hash='$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVKhB7fRCi';
SELECT id INTO v_care1_id FROM staff WHERE email='care1@healthark.co.uk';
INSERT INTO staff_onboarding (staff_id) VALUES (v_care1_id) ON CONFLICT DO NOTHING;
INSERT INTO staff_home_access (staff_id, home_id) VALUES (v_care1_id, v_home_id) ON CONFLICT DO NOTHING;

-- Care staff 2
INSERT INTO staff (organisation_id, home_id, email, password_hash, first_name, last_name, role, phone, is_active, status, date_of_birth)
VALUES (v_org_id, v_home_id, 'care2@healthark.co.uk',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVKhB7fRCi',
  'David', 'Mensah', 'care_staff', '07700900004', true, 'active', '1992-05-18')
ON CONFLICT (email) DO UPDATE SET
  organisation_id=v_org_id, home_id=v_home_id, is_active=true, status='active',
  password_hash='$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVKhB7fRCi';
SELECT id INTO v_care2_id FROM staff WHERE email='care2@healthark.co.uk';
INSERT INTO staff_onboarding (staff_id) VALUES (v_care2_id) ON CONFLICT DO NOTHING;
INSERT INTO staff_home_access (staff_id, home_id) VALUES (v_care2_id, v_home_id) ON CONFLICT DO NOTHING;

-- Service users
INSERT INTO service_users (home_id,first_name,last_name,date_of_birth,gender,nhs_number,medical_history,med_allergies,status,admission_date,min_fluid_ml,weight_kg,need_to_know,my_instructions)
VALUES (v_home_id,'Dorothy','Williams','1938-04-15','female','NHS-001-DW','Dementia, Type 2 Diabetes','Penicillin','live',NOW()-INTERVAL '6 months',1500,62,'Prefers to be called Dot. Enjoys music.','Approach calmly. Check blood sugar before meals.')
RETURNING id INTO su1;

INSERT INTO service_users (home_id,first_name,last_name,date_of_birth,gender,nhs_number,medical_history,med_allergies,status,admission_date,min_fluid_ml,weight_kg,need_to_know,my_instructions)
VALUES (v_home_id,'Harold','Thompson','1934-09-03','male','NHS-002-HT','Parkinson''s disease, Hypertension','Aspirin','live',NOW()-INTERVAL '8 months',1500,74,'Former teacher. Loves crosswords.','Allow extra time. BP check every morning.')
RETURNING id INTO su2;

INSERT INTO service_users (home_id,first_name,last_name,date_of_birth,gender,nhs_number,medical_history,med_allergies,status,admission_date,min_fluid_ml,weight_kg,need_to_know,my_instructions)
VALUES (v_home_id,'Margaret','Clarke','1940-12-20','female','NHS-003-MC','COPD, Osteoarthritis','None known','live',NOW()-INTERVAL '4 months',1500,58,'Breathless on exertion.','Inhaler within reach at all times.')
RETURNING id INTO su3;

INSERT INTO service_users (home_id,first_name,last_name,date_of_birth,gender,nhs_number,medical_history,med_allergies,status,admission_date,min_fluid_ml,weight_kg,need_to_know,my_instructions)
VALUES (v_home_id,'Arthur','Davies','1936-06-08','male','NHS-004-AD','Vascular dementia, Heart failure','Sulfa drugs','live',NOW()-INTERVAL '12 months',1500,68,'Sundowning in evenings.','Monitor oedema daily. Fluid restriction 1500ml.')
RETURNING id INTO su4;

INSERT INTO service_users (home_id,first_name,last_name,date_of_birth,gender,nhs_number,medical_history,med_allergies,status,admission_date,min_fluid_ml,weight_kg,need_to_know,my_instructions)
VALUES (v_home_id,'Edna','Morrison','1942-02-28','female','NHS-005-EM','Stroke recovery, Depression','Latex','live',NOW()-INTERVAL '3 months',1500,55,'Left-sided weakness.','No latex gloves. Assist from right side.')
RETURNING id INTO su5;

INSERT INTO service_users (home_id,first_name,last_name,date_of_birth,gender,nhs_number,medical_history,med_allergies,status,admission_date,min_fluid_ml,weight_kg,need_to_know,my_instructions)
VALUES (v_home_id,'George','Bennett','1933-11-14','male','NHS-006-GB','Alzheimer''s disease','None known','live',NOW()-INTERVAL '10 months',1500,71,'Wanders at night. Sensor mat in place.','Consistent routine. Night checks every 2 hours.')
RETURNING id INTO su6;

-- Contacts
INSERT INTO su_contacts (su_id,full_name,relationship,contact_tag,phone_primary,is_primary) VALUES
  (su1,'Patricia Williams','Daughter','Next of Kin','07712345001',true),
  (su2,'James Thompson','Son','Next of Kin','07712345002',true),
  (su3,'Robert Clarke','Husband','Next of Kin','07712345003',true),
  (su4,'Linda Davies','Daughter','Next of Kin','07712345004',true),
  (su5,'Brian Morrison','Son','Next of Kin','07712345005',true),
  (su6,'Susan Bennett','Daughter','Next of Kin','07712345006',true);

-- Care plans
INSERT INTO care_plans (su_id,home_id,plan_type,aims_outcomes,how_to_support,review_frequency,next_review_date,is_active,created_by) VALUES
  (su1,v_home_id,'medical','Manage diabetes and dementia','Monitor blood sugar. Use simple instructions.','monthly',CURRENT_DATE-5,true,v_mgr_id),
  (su1,v_home_id,'personal_hygiene','Maintain personal dignity','Assist with washing and dressing each morning.','monthly',CURRENT_DATE+14,true,v_mgr_id),
  (su2,v_home_id,'physical','Manage Parkinson''s symptoms','Allow extra time. Provide adapted utensils.','monthly',CURRENT_DATE-3,true,v_mgr_id),
  (su2,v_home_id,'medical','Control hypertension and medication','BP check every morning. Strict medication schedule.','monthly',CURRENT_DATE+21,true,v_mgr_id),
  (su3,v_home_id,'physical','Manage COPD','Ensure inhaler accessible. Rest periods during care.','monthly',CURRENT_DATE-7,true,v_mgr_id),
  (su3,v_home_id,'food_and_fluids','Maintain hydration','Encourage fluids every 2 hours. Alert if below 1000ml by 3pm.','monthly',CURRENT_DATE+10,true,v_mgr_id),
  (su4,v_home_id,'medical','Manage dementia and heart failure','Monitor oedema daily. Fluid restriction 1500ml.','monthly',CURRENT_DATE-10,true,v_mgr_id),
  (su5,v_home_id,'physical','Support stroke recovery','Physiotherapy exercises twice daily. Assist from right.','monthly',CURRENT_DATE+7,true,v_mgr_id),
  (su6,v_home_id,'medical','Manage Alzheimer''s progression','Consistent routine. Memory aids. Night sensor active.','monthly',CURRENT_DATE-2,true,v_mgr_id),
  (su6,v_home_id,'personal_hygiene','Maintain hygiene with dignity','Same time daily. Music during care to reduce distress.','monthly',CURRENT_DATE+28,true,v_mgr_id);

-- Daily records
INSERT INTO daily_records (su_id,home_id,staff_id,record_type,record_date,shift,notes) VALUES
  (su1,v_home_id,v_care1_id,'personal_care',CURRENT_DATE,'morning','Dorothy assisted with washing and dressing. Cooperative.'),
  (su1,v_home_id,v_care2_id,'food_drink',CURRENT_DATE,'morning','Full breakfast eaten. Drank 250ml orange juice.'),
  (su2,v_home_id,v_care1_id,'personal_care',CURRENT_DATE,'morning','Harold required full assistance. Tremors present but manageable.'),
  (su2,v_home_id,v_senior_id,'vitals',CURRENT_DATE,'morning','BP: 145/92, Pulse: 74, O2: 97%. Slightly elevated.'),
  (su3,v_home_id,v_care2_id,'personal_care',CURRENT_DATE,'morning','Margaret showered. Breathless on exertion — rest taken.'),
  (su3,v_home_id,v_care1_id,'food_drink',CURRENT_DATE,'morning','Fluid intake: 850ml by lunchtime. Encouraged more.'),
  (su4,v_home_id,v_care2_id,'general',CURRENT_DATE,'morning','Arthur confused, asking for wife. Redirected calmly.'),
  (su5,v_home_id,v_senior_id,'personal_care',CURRENT_DATE,'morning','Edna completed physio exercises independently.'),
  (su6,v_home_id,v_care1_id,'general',CURRENT_DATE,'morning','George calm. Engaged well with morning music session.'),
  (su1,v_home_id,v_care2_id,'general',CURRENT_DATE-1,'morning','Dorothy good mood. Participated in flower arranging.'),
  (su2,v_home_id,v_care1_id,'vitals',CURRENT_DATE-1,'morning','BP: 148/94. GP notified — review booked.'),
  (su4,v_home_id,v_care2_id,'personal_care',CURRENT_DATE-1,'morning','Arthur refused shower. Agreed after 20 mins reassurance.'),
  (su6,v_home_id,v_care2_id,'general',CURRENT_DATE-1,'night','George wandered at 02:30. Redirected and settled.');

-- MAR records
INSERT INTO mar_records (su_id,home_id,medication_name,dose,route,frequency,scheduled_time,record_date,given,given_at,given_by) VALUES
  (su1,v_home_id,'Metformin 500mg','500mg','oral','Twice daily','08:00',CURRENT_DATE,true,NOW()-INTERVAL '3 hours',v_senior_id),
  (su1,v_home_id,'Aricept 10mg','10mg','oral','Once daily','08:00',CURRENT_DATE,true,NOW()-INTERVAL '3 hours',v_senior_id),
  (su2,v_home_id,'Levodopa 100mg','100mg','oral','Three times daily','08:00',CURRENT_DATE,true,NOW()-INTERVAL '3 hours',v_senior_id),
  (su2,v_home_id,'Amlodipine 5mg','5mg','oral','Once daily','08:00',CURRENT_DATE,true,NOW()-INTERVAL '3 hours',v_senior_id),
  (su3,v_home_id,'Salbutamol inhaler','2 puffs','inhaled','As required','08:00',CURRENT_DATE,true,NOW()-INTERVAL '3 hours',v_senior_id),
  (su4,v_home_id,'Furosemide 40mg','40mg','oral','Once daily','08:00',CURRENT_DATE,NULL,NULL,NULL),
  (su4,v_home_id,'Digoxin 125mcg','125mcg','oral','Once daily','08:00',CURRENT_DATE,true,NOW()-INTERVAL '3 hours',v_senior_id),
  (su5,v_home_id,'Sertraline 50mg','50mg','oral','Once daily','08:00',CURRENT_DATE,true,NOW()-INTERVAL '3 hours',v_senior_id),
  (su6,v_home_id,'Donepezil 10mg','10mg','oral','Once daily','21:00',CURRENT_DATE,NULL,NULL,NULL),
  (su6,v_home_id,'Memantine 20mg','20mg','oral','Once daily','08:00',CURRENT_DATE,true,NOW()-INTERVAL '3 hours',v_senior_id);

-- SU Medications
INSERT INTO su_medications (su_id,home_id,medication_name,dose,route,frequency,prescribed_by,start_date,is_active,created_by) VALUES
  (su1,v_home_id,'Metformin 500mg','500mg','oral','Twice daily','Dr. A. Patel',CURRENT_DATE-180,true,v_mgr_id),
  (su1,v_home_id,'Aricept 10mg','10mg','oral','Once daily','Dr. A. Patel',CURRENT_DATE-180,true,v_mgr_id),
  (su2,v_home_id,'Levodopa 100mg','100mg','oral','Three times daily','Dr. R. Williams',CURRENT_DATE-240,true,v_mgr_id),
  (su4,v_home_id,'Furosemide 40mg','40mg','oral','Once daily','Dr. A. Patel',CURRENT_DATE-365,true,v_mgr_id),
  (su6,v_home_id,'Donepezil 10mg','10mg','oral','Once daily','Dr. M. Khan',CURRENT_DATE-300,true,v_mgr_id);

-- Medication stock
INSERT INTO medication_stock (home_id,su_id,medication_name,form,strength,quantity_remaining,unit,reorder_threshold,last_updated_by) VALUES
  (v_home_id,su1,'Metformin','tablet','500mg',28,'tablets',14,v_senior_id),
  (v_home_id,su1,'Donepezil','tablet','10mg',28,'tablets',7,v_senior_id),
  (v_home_id,su2,'Levodopa','tablet','100mg',60,'tablets',14,v_senior_id),
  (v_home_id,su4,'Furosemide','tablet','40mg',5,'tablets',7,v_senior_id),
  (v_home_id,su6,'Donepezil','tablet','10mg',6,'tablets',7,v_senior_id);

-- Task templates
INSERT INTO task_templates (home_id,created_by,task_name,title,category,description,frequency,assigned_role,is_active) VALUES
  (v_home_id,v_mgr_id,'Morning medication round','Morning medication round','medication','Administer all 08:00 medications and sign MAR charts','daily','senior_carer',true),
  (v_home_id,v_mgr_id,'Evening medication round','Evening medication round','medication','Administer all 20:00 medications and sign MAR charts','daily','senior_carer',true),
  (v_home_id,v_mgr_id,'Fridge temperature log','Fridge temperature log','compliance','Record fridge temperatures','daily','care_staff',true),
  (v_home_id,v_mgr_id,'Fire safety check','Fire safety check','safety','Check all fire exits and alarm panels','weekly','home_manager',true),
  (v_home_id,v_mgr_id,'Care plan reviews','Care plan reviews','care','Review flagged care plans','weekly','home_manager',true);

-- Tasks for today
INSERT INTO tasks (home_id,created_by,title,category,description,task_date,due_time,priority,assigned_role,status) VALUES
  (v_home_id,v_mgr_id,'Morning medication round','medication','Administer 08:00 medications',CURRENT_DATE,'08:00','urgent','senior_carer','completed'),
  (v_home_id,v_mgr_id,'Fridge temperature log','compliance','Record fridge temperatures',CURRENT_DATE,'09:00','normal','care_staff','pending'),
  (v_home_id,v_mgr_id,'Evening medication round','medication','Administer 20:00 medications',CURRENT_DATE,'20:00','urgent','senior_carer','pending'),
  (v_home_id,v_mgr_id,'Review Dorothy Williams care plan','care','Care plan overdue — dementia management',CURRENT_DATE,'14:00','high','home_manager','pending'),
  (v_home_id,v_mgr_id,'Book GP review for Harold Thompson','medical','BP elevated 3 days — GP review needed',CURRENT_DATE,'11:00','high','home_manager','pending'),
  (v_home_id,v_mgr_id,'Chase Furosemide for Arthur Davies','medication','Stock critically low — 5 tablets',CURRENT_DATE,'10:00','urgent','senior_carer','pending');

-- Business alerts
INSERT INTO business_alerts (home_id,alert_type,severity,title,description,su_id,is_resolved) VALUES
  (v_home_id,'care_plan_overdue','high','Care plans overdue for review','4 residents have care plans past their review date.',NULL,false),
  (v_home_id,'medication_gap','high','MAR gap — Arthur Davies','Furosemide 40mg (08:00) not recorded for Arthur Davies.',su4,false),
  (v_home_id,'fluid_below_threshold','medium','Low fluid intake — Margaret Clarke','Margaret Clarke: 850ml today vs 1500ml target.',su3,false),
  (v_home_id,'task_missed','medium','Tasks pending today','Fridge log and care plan reviews not yet completed.',NULL,false),
  (v_home_id,'risk_assessment_overdue','low','Falls risk assessments due','Due this week for Dorothy Williams and George Bennett.',NULL,false);

-- Staff leave
INSERT INTO staff_leave (home_id,staff_id,leave_type,start_date,end_date,hours_requested,reason,status) VALUES
  (v_home_id,v_care1_id,'annual',CURRENT_DATE+14,CURRENT_DATE+21,56,'Family holiday','pending'),
  (v_home_id,v_care2_id,'sick',CURRENT_DATE-1,CURRENT_DATE+2,24,'Flu symptoms','approved');

-- Clock-in events
INSERT INTO staff_clock_events (staff_id,home_id,event_type,event_time,geofence_passed,punctuality) VALUES
  (v_mgr_id,v_home_id,'clock_in',NOW()-INTERVAL '4 hours',true,'on_time'),
  (v_senior_id,v_home_id,'clock_in',NOW()-INTERVAL '3 hours 58 minutes',true,'early'),
  (v_care1_id,v_home_id,'clock_in',NOW()-INTERVAL '3 hours 45 minutes',true,'on_time'),
  (v_care2_id,v_home_id,'clock_in',NOW()-INTERVAL '3 hours 30 minutes',true,'late');

-- Shifts
INSERT INTO staff_shifts (home_id,staff_id,shift_date,start_time,end_time,shift_type,created_by) VALUES
  (v_home_id,v_senior_id,CURRENT_DATE,'07:00','19:00','early',v_mgr_id),
  (v_home_id,v_care1_id,CURRENT_DATE,'07:00','19:00','early',v_mgr_id),
  (v_home_id,v_care2_id,CURRENT_DATE,'07:00','19:00','early',v_mgr_id),
  (v_home_id,v_senior_id,CURRENT_DATE+1,'07:00','19:00','early',v_mgr_id),
  (v_home_id,v_care1_id,CURRENT_DATE+1,'19:00','07:00','late',v_mgr_id),
  (v_home_id,v_care2_id,CURRENT_DATE+2,'07:00','19:00','early',v_mgr_id);

-- PPE
INSERT INTO ppe_inventory (home_id,item_name,item_variant,current_stock,min_stock,unit) VALUES
  (v_home_id,'Disposable Gloves','Medium',320,100,'pairs'),
  (v_home_id,'Disposable Aprons','Standard',85,50,'units'),
  (v_home_id,'Type IIR Face Masks','Standard',120,50,'units'),
  (v_home_id,'Hand Sanitiser','500ml',8,5,'bottles');

-- Notifications
INSERT INTO notifications (recipient_id,home_id,title,body,type,link,is_read) VALUES
  (v_mgr_id,v_home_id,'Care plan overdue','Dorothy Williams medical care plan is 5 days overdue.','warning','/care-plans',false),
  (v_mgr_id,v_home_id,'Leave request pending','Priya Sharma has requested annual leave — please review.','info','/holidays',false),
  (v_senior_id,v_home_id,'MAR chart gap','Furosemide for Arthur Davies not recorded this morning.','alert','/mar',false);

RAISE NOTICE '==============================================';
RAISE NOTICE 'SUCCESS — demo data seeded!';
RAISE NOTICE 'Logins (all password: Admin1234)';
RAISE NOTICE '  admin@healthark.co.uk   — Group Admin';
RAISE NOTICE '  manager@healthark.co.uk — Home Manager';
RAISE NOTICE '  senior@healthark.co.uk  — Senior Carer';
RAISE NOTICE '  care1@healthark.co.uk   — Care Staff';
RAISE NOTICE '==============================================';

END $$;
