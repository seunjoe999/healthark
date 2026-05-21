-- ================================================================
-- MIGRATION 008 — Add missing tables: notifications, staff_shifts, tasks
-- ================================================================

-- ── notifications ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  home_id      UUID REFERENCES homes(id) ON DELETE SET NULL,
  title        VARCHAR(255) NOT NULL,
  body         TEXT,
  type         VARCHAR(30) NOT NULL DEFAULT 'info',
  link         VARCHAR(500),
  is_read      BOOLEAN NOT NULL DEFAULT FALSE,
  read_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, is_read);

-- ── staff_shifts ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_shifts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_id      UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  staff_id     UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  su_id        UUID REFERENCES service_users(id) ON DELETE SET NULL,
  shift_date   DATE NOT NULL,
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  shift_type   VARCHAR(20) NOT NULL DEFAULT 'regular',
  notes        TEXT,
  created_by   UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(home_id, staff_id, shift_date, shift_type)
);
CREATE INDEX IF NOT EXISTS idx_shifts_home_date ON staff_shifts(home_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_shifts_staff     ON staff_shifts(staff_id);

-- ── tasks ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_id          UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  su_id            UUID REFERENCES service_users(id) ON DELETE SET NULL,
  created_by       UUID REFERENCES staff(id) ON DELETE SET NULL,
  title            VARCHAR(255) NOT NULL,
  category         VARCHAR(50) NOT NULL DEFAULT 'general',
  description      TEXT,
  task_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  due_time         TIME,
  priority         VARCHAR(20) NOT NULL DEFAULT 'normal',
  assigned_role    VARCHAR(50),
  status           VARCHAR(20) NOT NULL DEFAULT 'pending',
  completed_by     UUID REFERENCES staff(id) ON DELETE SET NULL,
  completed_at     TIMESTAMPTZ,
  completion_notes TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tasks_home_date ON tasks(home_id, task_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status    ON tasks(home_id, status);
