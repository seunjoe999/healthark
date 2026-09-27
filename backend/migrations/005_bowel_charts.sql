-- ================================================================
-- HEALTHARK - BOWEL CHARTS TABLE
-- Version 5.0 | Was only ever created ad-hoc via the self-healing
-- schema block in src/index.ts; adding it here as the versioned
-- source of truth (idempotent, matches that block exactly).
-- ================================================================

CREATE TABLE IF NOT EXISTS bowel_charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  su_id UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
  recorded_by UUID NOT NULL REFERENCES staff(id) ON DELETE SET NULL,
  bristol_type INTEGER NOT NULL CHECK (bristol_type BETWEEN 1 AND 7),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  amount VARCHAR(50),
  colour VARCHAR(50),
  consistency VARCHAR(50),
  blood_present BOOLEAN NOT NULL DEFAULT FALSE,
  mucus_present BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bowel_su ON bowel_charts(su_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_bowel_home ON bowel_charts(home_id, recorded_at DESC);
