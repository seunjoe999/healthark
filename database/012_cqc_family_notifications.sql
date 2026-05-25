-- Add CQC and family notification tracking to incidents
ALTER TABLE records_incidents ADD COLUMN IF NOT EXISTS cqc_notified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE records_incidents ADD COLUMN IF NOT EXISTS cqc_not_notified_reason TEXT;
ALTER TABLE records_incidents ADD COLUMN IF NOT EXISTS family_notified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE records_incidents ADD COLUMN IF NOT EXISTS family_not_notified_reason TEXT;

-- Add per-resident handover notes table
CREATE TABLE IF NOT EXISTS handover_resident_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  su_id UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  shift_type VARCHAR(20) NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES staff(id),
  updated_by UUID REFERENCES staff(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(home_id, su_id, shift_date, shift_type)
);
