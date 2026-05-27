-- ================================================================
-- HEALTHARK - FIX MISSING COLUMNS
-- Version 4.0 | Fixes for staff messaging and recruitment
-- ================================================================

-- ── Check if staff_messages table exists and fix it ──────────────────
-- The staff_messages table needs a 'body' column for compatibility
-- Adding 'body' as alias for 'message' if it doesn't exist

ALTER TABLE IF EXISTS staff_messages ADD COLUMN IF NOT EXISTS body TEXT;

-- If body column was just added, populate it from message
UPDATE staff_messages SET body = message WHERE body IS NULL AND message IS NOT NULL;

-- Make body NOT NULL if it's going to be used
ALTER TABLE IF EXISTS staff_messages ALTER COLUMN body SET NOT NULL;

-- ── Fix recruitment_candidates table ──────────────────────────────────
-- Add missing pipeline_stage column

ALTER TABLE IF EXISTS recruitment_candidates 
ADD COLUMN IF NOT EXISTS pipeline_stage VARCHAR(100) DEFAULT 'applied';

-- Ensure the column is nullable to avoid conflicts with existing data
ALTER TABLE IF EXISTS recruitment_candidates 
ALTER COLUMN pipeline_stage DROP NOT NULL;

-- ── Create recruitment_candidates table if it doesn't exist ──────────
CREATE TABLE IF NOT EXISTS recruitment_candidates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_id         UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  first_name      VARCHAR(100) NOT NULL,
  last_name       VARCHAR(100) NOT NULL,
  email           VARCHAR(255),
  phone           VARCHAR(20),
  position        VARCHAR(255) NOT NULL,
  applied_date    DATE,
  status          VARCHAR(50) DEFAULT 'applied',
  pipeline_stage  VARCHAR(100) DEFAULT 'applied',
  interview_date  DATE,
  notes           TEXT,
  dbs_check       BOOLEAN DEFAULT FALSE,
  reference_check BOOLEAN DEFAULT FALSE,
  training_done   BOOLEAN DEFAULT FALSE,
  dbs_cleared     BOOLEAN DEFAULT FALSE,
  references_done BOOLEAN DEFAULT FALSE,
  fully_compliant BOOLEAN DEFAULT FALSE,
  ready_to_start  BOOLEAN DEFAULT FALSE,
  start_date      DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recruitment_home ON recruitment_candidates(home_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_status ON recruitment_candidates(status);
CREATE INDEX IF NOT EXISTS idx_recruitment_pipeline ON recruitment_candidates(pipeline_stage);

-- ── Create or fix staff_messages table ────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_messages (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id     UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  recipient_id  UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  home_id       UUID REFERENCES homes(id) ON DELETE SET NULL,
  subject       VARCHAR(255),
  message       TEXT NOT NULL,
  body          TEXT NOT NULL,
  is_read       BOOLEAN NOT NULL DEFAULT FALSE,
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_messages_sender ON staff_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_staff_messages_recipient ON staff_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_staff_messages_created ON staff_messages(created_at DESC);

-- ── Verify data integrity ─────────────────────────────────────────────
-- Ensure no orphaned messages (staff must exist)
DELETE FROM staff_messages 
WHERE sender_id NOT IN (SELECT id FROM staff) 
   OR recipient_id NOT IN (SELECT id FROM staff);

-- Ensure no orphaned recruitment candidates (home must exist)
DELETE FROM recruitment_candidates 
WHERE home_id NOT IN (SELECT id FROM homes);
