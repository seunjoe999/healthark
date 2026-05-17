-- Run this migration to enable home-based postcode clock-in

-- Allow staff_clock_events without a service user (home-level clock-in)
ALTER TABLE staff_clock_events ALTER COLUMN su_id DROP NOT NULL;

-- Postcode locations per care home (multiple allowed)
CREATE TABLE IF NOT EXISTS home_postcodes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_id    UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  postcode   VARCHAR(20) NOT NULL,
  label      VARCHAR(100),
  latitude   DECIMAL(10,8),
  longitude  DECIMAL(11,8),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(home_id, postcode)
);

CREATE INDEX IF NOT EXISTS idx_home_postcodes_home ON home_postcodes(home_id);
