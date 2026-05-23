const { Pool } = require('pg');
const url = process.argv[2];
const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

const FIXES = [
  // Missing columns
  `ALTER TABLE organisations ADD COLUMN IF NOT EXISTS registration_code VARCHAR(100)`,
  `ALTER TABLE homes ADD COLUMN IF NOT EXISTS city VARCHAR(255)`,
  `ALTER TABLE staff ADD COLUMN IF NOT EXISTS leave_hours_remaining DECIMAL(6,2) NOT NULL DEFAULT 0`,
  `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8)`,
  `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8)`,

  // Missing tasks table
  `CREATE TABLE IF NOT EXISTS tasks (
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
  )`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_home_date ON tasks(home_id, task_date)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`,

  // Missing signatures table
  `CREATE TABLE IF NOT EXISTS signatures (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_id  UUID NOT NULL,
    record_type VARCHAR(100) NOT NULL,
    staff_id   UUID REFERENCES staff(id) ON DELETE SET NULL,
    signed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  // Missing reviews table
  `CREATE TABLE IF NOT EXISTS reviews (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    home_id     UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    su_id       UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
    reviewed_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    review_date DATE NOT NULL DEFAULT CURRENT_DATE,
    review_type VARCHAR(100) NOT NULL DEFAULT 'care_plan',
    notes       TEXT,
    next_review DATE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  // Missing shifts table (alias for staff_shifts)
  `CREATE TABLE IF NOT EXISTS shifts (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    home_id      UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    staff_id     UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    shift_date   DATE NOT NULL,
    start_time   TIME NOT NULL,
    end_time     TIME NOT NULL,
    shift_type   VARCHAR(50) NOT NULL DEFAULT 'regular',
    notes        TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  // Missing clock_events table (alias for staff_clock_events)
  `CREATE TABLE IF NOT EXISTS clock_events (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    home_id      UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    staff_id     UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    event_type   VARCHAR(20) NOT NULL DEFAULT 'clock_in',
    event_time   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  // Missing messages table
  `CREATE TABLE IF NOT EXISTS messages (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    home_id     UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    sender_id   UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    subject     VARCHAR(255),
    body        TEXT,
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  // Missing quality_records table
  `CREATE TABLE IF NOT EXISTS quality_records (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    home_id     UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    recorded_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    category    VARCHAR(100) NOT NULL,
    score       INTEGER,
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  // Missing must_scores table
  `CREATE TABLE IF NOT EXISTS must_scores (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    home_id     UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    su_id       UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
    recorded_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    score       INTEGER,
    bmi_score   INTEGER,
    weight_loss_score INTEGER,
    acute_disease_score INTEGER,
    overall_risk VARCHAR(20),
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  // Missing professional_involvement table
  `CREATE TABLE IF NOT EXISTS professional_involvement (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    home_id        UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    su_id          UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
    professional_name VARCHAR(255),
    role           VARCHAR(100),
    organisation   VARCHAR(255),
    phone          VARCHAR(50),
    email          VARCHAR(255),
    last_contact   DATE,
    notes          TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  // Missing capacity_assessments table
  `CREATE TABLE IF NOT EXISTS capacity_assessments (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    home_id     UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    su_id       UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
    assessed_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    decision_type VARCHAR(100),
    has_capacity BOOLEAN,
    rationale   TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
];

async function main() {
  const client = await pool.connect();
  let ok = 0, fail = 0;
  for (const sql of FIXES) {
    try {
      await client.query(sql);
      ok++;
      const name = sql.trim().split('\n')[0].substring(0, 80);
      console.log(`  OK: ${name}`);
    } catch (e) {
      fail++;
      console.log(`  SKIP: ${e.message.split('\n')[0].substring(0, 100)}`);
    }
  }
  console.log(`\nDone: ${ok} applied, ${fail} skipped`);
  client.release();
  await pool.end();
}
main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
