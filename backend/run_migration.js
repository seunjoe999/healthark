const { Pool } = require('pg');

// All SQL statements needed to bring DB schema up to date
const migrations = [
  // records_incidents
  "ALTER TABLE records_incidents ADD COLUMN IF NOT EXISTS manager_reviewed BOOLEAN NOT NULL DEFAULT FALSE",
  "ALTER TABLE records_incidents ADD COLUMN IF NOT EXISTS manager_reviewed_at TIMESTAMPTZ",
  // care_plans
  "ALTER TABLE care_plans ADD COLUMN IF NOT EXISTS last_review_date DATE",
  "ALTER TABLE care_plans ADD COLUMN IF NOT EXISTS next_review_date DATE",
  "ALTER TABLE care_plans ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE",
  "ALTER TABLE care_plans ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES staff(id) ON DELETE SET NULL",
  // daily_records
  "ALTER TABLE daily_records ADD COLUMN IF NOT EXISTS amount_ml INTEGER",
  // business_alerts
  "ALTER TABLE business_alerts ADD COLUMN IF NOT EXISTS data JSONB",
  // service_users
  "ALTER TABLE service_users ADD COLUMN IF NOT EXISTS min_fluid_ml INTEGER NOT NULL DEFAULT 1500",
  // audit_reports
  "ALTER TABLE audit_reports ADD COLUMN IF NOT EXISTS total_checks INTEGER",
  "ALTER TABLE audit_reports ADD COLUMN IF NOT EXISTS checks_passed INTEGER",
  "ALTER TABLE audit_reports ADD COLUMN IF NOT EXISTS checks_failed INTEGER",
  // staff_training table
  `CREATE TABLE IF NOT EXISTS staff_training (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    course_name VARCHAR(255) NOT NULL,
    expiry_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  "CREATE INDEX IF NOT EXISTS idx_st_staff ON staff_training(staff_id)",
  "CREATE INDEX IF NOT EXISTS idx_st_expiry ON staff_training(expiry_date)",
  // mar_records table
  `CREATE TABLE IF NOT EXISTS mar_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    su_id UUID REFERENCES service_users(id) ON DELETE CASCADE,
    record_date DATE NOT NULL DEFAULT CURRENT_DATE,
    given BOOLEAN NOT NULL DEFAULT FALSE,
    refused BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  "CREATE INDEX IF NOT EXISTS idx_mar_home ON mar_records(home_id)",
  "CREATE INDEX IF NOT EXISTS idx_mar_su ON mar_records(su_id)",
  "CREATE INDEX IF NOT EXISTS idx_mar_date ON mar_records(record_date)",
  // safeguarding_concerns table
  `CREATE TABLE IF NOT EXISTS safeguarding_concerns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    home_id UUID NOT NULL REFERENCES homes(id),
    su_id UUID NOT NULL REFERENCES service_users(id),
    overview TEXT,
    incident_date DATE NOT NULL,
    manager_ack BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  "CREATE INDEX IF NOT EXISTS idx_safe_home ON safeguarding_concerns(home_id)",
  "CREATE INDEX IF NOT EXISTS idx_safe_su ON safeguarding_concerns(su_id)",
  "ALTER TABLE safeguarding_concerns ADD COLUMN IF NOT EXISTS manager_ack BOOLEAN NOT NULL DEFAULT FALSE",
  // Grant privileges so healthark_user can ALTER these tables in future
  "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO healthark_user",
  "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO healthark_user",
  "ALTER TABLE records_incidents OWNER TO healthark_user",
  "ALTER TABLE care_plans OWNER TO healthark_user",
  "ALTER TABLE audit_reports OWNER TO healthark_user",
  "ALTER TABLE business_alerts OWNER TO healthark_user",
  "ALTER TABLE daily_records OWNER TO healthark_user",
  "ALTER TABLE service_users OWNER TO healthark_user",
  "ALTER TABLE staff OWNER TO healthark_user",
  "ALTER TABLE staff_training OWNER TO healthark_user",
  "ALTER TABLE mar_records OWNER TO healthark_user",
  "ALTER TABLE safeguarding_concerns OWNER TO healthark_user",
];

async function runWith(config) {
  const pool = new Pool({ ...config, ssl: false });
  const client = await pool.connect();
  console.log(`Connected as ${config.user}`);
  let ok = 0, skip = 0;
  for (const sql of migrations) {
    try {
      await client.query(sql);
      console.log('  OK:', sql.substring(0, 70).replace(/\n/g, ' ').trim());
      ok++;
    } catch (e) {
      console.warn('  SKIP:', e.message.split('\n')[0]);
      skip++;
    }
  }
  client.release();
  await pool.end();
  console.log(`\nDone: ${ok} applied, ${skip} skipped`);
}

async function run() {
  // Try postgres superuser with user-supplied password first
  const attempts = [
    { host: 'localhost', port: 5432, database: 'healthark', user: 'postgres', password: 'adeniji1234' },
    { host: 'localhost', port: 5432, database: 'healthark', user: 'postgres', password: '' },
    { host: 'localhost', port: 5432, database: 'healthark', user: 'healthark_user', password: 'HealthArk2024' },
  ];

  for (const cfg of attempts) {
    try {
      await runWith(cfg);
      return;
    } catch (e) {
      console.warn(`Failed as ${cfg.user}:${cfg.password ? '***' : '(empty)'} — ${e.message.split('\n')[0]}`);
    }
  }
  console.error('All connection attempts failed. Check PostgreSQL is running and credentials are correct.');
  process.exit(1);
}

run().catch(err => { console.error(err.message); process.exit(1); });
