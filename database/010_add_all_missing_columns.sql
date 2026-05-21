-- ================================================================
-- MIGRATION 010 — Add every missing column and table
-- ================================================================

-- ── daily_records: flagging + recorded_at ─────────────────────────
ALTER TABLE daily_records ADD COLUMN IF NOT EXISTS flagged      BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE daily_records ADD COLUMN IF NOT EXISTS flag_reason  TEXT;
ALTER TABLE daily_records ADD COLUMN IF NOT EXISTS recorded_at  TIMESTAMPTZ DEFAULT NOW();

-- ── records_vitals: extra vital detail columns ────────────────────
ALTER TABLE records_vitals ADD COLUMN IF NOT EXISTS bp_position      VARCHAR(20);
ALTER TABLE records_vitals ADD COLUMN IF NOT EXISTS outside_range    BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE records_vitals ADD COLUMN IF NOT EXISTS temp_method      VARCHAR(30);
ALTER TABLE records_vitals ADD COLUMN IF NOT EXISTS o2_litres_min    NUMERIC(4,1);
ALTER TABLE records_vitals ADD COLUMN IF NOT EXISTS prev_weight_kg   NUMERIC(6,2);
ALTER TABLE records_vitals ADD COLUMN IF NOT EXISTS weight_change_pct NUMERIC(5,2);
ALTER TABLE records_vitals ADD COLUMN IF NOT EXISTS vital_type       VARCHAR(30);
ALTER TABLE records_vitals ADD COLUMN IF NOT EXISTS height_cm        NUMERIC(5,1);

-- ── records_food_drink: assisted / refused ────────────────────────
ALTER TABLE records_food_drink ADD COLUMN IF NOT EXISTS assisted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE records_food_drink ADD COLUMN IF NOT EXISTS refused  BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE records_food_drink ADD COLUMN IF NOT EXISTS notes    TEXT;

-- ── records_incidents: body map + medical attention ───────────────
ALTER TABLE records_incidents ADD COLUMN IF NOT EXISTS injured_body_parts    TEXT;
ALTER TABLE records_incidents ADD COLUMN IF NOT EXISTS medical_attention_req BOOLEAN NOT NULL DEFAULT FALSE;

-- ── care_plans: review / outcome fields ──────────────────────────
ALTER TABLE care_plans ADD COLUMN IF NOT EXISTS outcome_achieved BOOLEAN;
ALTER TABLE care_plans ADD COLUMN IF NOT EXISTS reviewed_by      UUID REFERENCES staff(id) ON DELETE SET NULL;

-- ── care_plan_updates: new table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS care_plan_updates (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  care_plan_id UUID NOT NULL REFERENCES care_plans(id) ON DELETE CASCADE,
  update_notes TEXT NOT NULL,
  updated_by   UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cpu_plan ON care_plan_updates(care_plan_id);

-- ── must_scores: scoring breakdown columns ────────────────────────
ALTER TABLE must_scores ADD COLUMN IF NOT EXISTS bmi_score          SMALLINT;
ALTER TABLE must_scores ADD COLUMN IF NOT EXISTS weight_loss_score  SMALLINT;
ALTER TABLE must_scores ADD COLUMN IF NOT EXISTS acute_disease_score SMALLINT;
ALTER TABLE must_scores ADD COLUMN IF NOT EXISTS total_score        SMALLINT;
ALTER TABLE must_scores ADD COLUMN IF NOT EXISTS risk_level         VARCHAR(20);

-- ── capacity_assessments: extra fields ───────────────────────────
ALTER TABLE capacity_assessments ADD COLUMN IF NOT EXISTS best_interest_decision TEXT;
ALTER TABLE capacity_assessments ADD COLUMN IF NOT EXISTS consulted_with         TEXT;

-- ── home_postcodes: per-postcode geofence radius ─────────────────
ALTER TABLE home_postcodes ADD COLUMN IF NOT EXISTS radius INTEGER NOT NULL DEFAULT 200;

-- ── su_documents: notes and expiry ───────────────────────────────
ALTER TABLE su_documents ADD COLUMN IF NOT EXISTS notes       TEXT;
ALTER TABLE su_documents ADD COLUMN IF NOT EXISTS expiry_date DATE;

-- ── staff_documents: notes and expiry ────────────────────────────
ALTER TABLE staff_documents ADD COLUMN IF NOT EXISTS notes       TEXT;
ALTER TABLE staff_documents ADD COLUMN IF NOT EXISTS expiry_date DATE;

-- ── su_messages: family/staff messaging per service user ──────────
CREATE TABLE IF NOT EXISTS su_messages (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  su_id             UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
  home_id           UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  sender_id         UUID REFERENCES staff(id) ON DELETE SET NULL,
  message           TEXT NOT NULL,
  message_type      VARCHAR(30) NOT NULL DEFAULT 'general',
  attachment_url    TEXT,
  attachment_caption TEXT,
  is_read           BOOLEAN NOT NULL DEFAULT FALSE,
  read_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_su_messages_su   ON su_messages(su_id);
CREATE INDEX IF NOT EXISTS idx_su_messages_home ON su_messages(home_id);

-- ── records_behaviour ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS records_behaviour (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_record_id UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
  mood            VARCHAR(50),
  behaviour_noted TEXT,
  triggers_noted  TEXT,
  action_taken    TEXT,
  escalated       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rbeh_dr ON records_behaviour(daily_record_id);

-- ── records_repositioning ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS records_repositioning (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_record_id UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
  position        VARCHAR(50),
  skin_checked    BOOLEAN NOT NULL DEFAULT FALSE,
  skin_concerns   TEXT,
  next_due_at     TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rrepos_dr ON records_repositioning(daily_record_id);

-- ── records_oral_care ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS records_oral_care (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_record_id UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
  care_types      TEXT[],
  mouth_condition VARCHAR(50),
  has_dentures    BOOLEAN NOT NULL DEFAULT FALSE,
  denture_type    VARCHAR(50),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_roral_dr ON records_oral_care(daily_record_id);

-- ── records_communication ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS records_communication (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_record_id UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
  mode_used       VARCHAR(50),
  topic           TEXT,
  response_level  VARCHAR(50),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rcomm_dr ON records_communication(daily_record_id);

-- ── records_one_to_one ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS records_one_to_one (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_record_id UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
  topics          TEXT,
  duration_mins   INTEGER,
  engagement      VARCHAR(50),
  follow_up       BOOLEAN NOT NULL DEFAULT FALSE,
  follow_up_notes TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rone_dr ON records_one_to_one(daily_record_id);

-- ── records_social_activity ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS records_social_activity (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_record_id UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
  activity_name   VARCHAR(100),
  engagement      VARCHAR(50),
  enjoyed         BOOLEAN,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rsoc_dr ON records_social_activity(daily_record_id);

-- ── records_visits (note: DB has records_visit singular but route uses plural) ──
CREATE TABLE IF NOT EXISTS records_visits (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_record_id UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
  visit_type      VARCHAR(50),
  visitor_name    VARCHAR(100),
  relationship    VARCHAR(50),
  location        VARCHAR(100),
  time_arrived    TIME,
  time_left       TIME,
  su_response     TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rvis_dr ON records_visits(daily_record_id);

-- ── records_prn_medication ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS records_prn_medication (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_record_id UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
  medication_name VARCHAR(255) NOT NULL,
  dose            VARCHAR(100),
  reason          TEXT,
  administered_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  witnessed_by    UUID REFERENCES staff(id) ON DELETE SET NULL,
  outcome_notes   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rprn_dr ON records_prn_medication(daily_record_id);

-- ── records_welfare_check ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS records_welfare_check (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_record_id   UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
  check_type        VARCHAR(50),
  su_status         VARCHAR(50),
  environment_ok    BOOLEAN NOT NULL DEFAULT TRUE,
  environment_notes TEXT,
  action_taken      TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rwel_dr ON records_welfare_check(daily_record_id);

-- ── records_handover ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS records_handover (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_record_id     UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
  shift_summary       TEXT,
  priority_flags      TEXT,
  outstanding_actions TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rhand_dr ON records_handover(daily_record_id);
