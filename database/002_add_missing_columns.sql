-- Migration: add columns that may be missing from older installs

-- Add refresh_token and reset columns to staff if not present
ALTER TABLE staff ADD COLUMN IF NOT EXISTS refresh_token VARCHAR(500);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMPTZ;

-- Add is_active if not present
ALTER TABLE staff ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Add last_login if not present
ALTER TABLE staff ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- staff_shifts table (rota / shifts)
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
CREATE INDEX IF NOT EXISTS idx_shifts_staff ON staff_shifts(staff_id);

-- notifications table
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
