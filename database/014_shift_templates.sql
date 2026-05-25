-- Recurring shift templates
CREATE TABLE IF NOT EXISTS shift_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id       UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  label         VARCHAR(100),
  staff_id      UUID REFERENCES staff(id) ON DELETE CASCADE,
  su_id         UUID REFERENCES service_users(id) ON DELETE SET NULL,
  shift_type    VARCHAR(20) NOT NULL DEFAULT 'regular',
  start_time    TIME NOT NULL,
  end_time      TIME NOT NULL,
  break_minutes INT NOT NULL DEFAULT 0,
  recurrence    VARCHAR(20) NOT NULL DEFAULT 'weekly',
  days_of_week  INTEGER[] NOT NULL DEFAULT ARRAY[1],
  start_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  staff_count   INT NOT NULL DEFAULT 1,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_by    UUID REFERENCES staff(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add break time and template link to individual shifts
ALTER TABLE staff_shifts ADD COLUMN IF NOT EXISTS break_minutes INT NOT NULL DEFAULT 0;
ALTER TABLE staff_shifts ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES shift_templates(id) ON DELETE SET NULL;
