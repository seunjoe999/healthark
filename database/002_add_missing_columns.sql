-- Migration: add columns that may be missing from older installs

-- Add refresh_token and reset columns to staff if not present
ALTER TABLE staff ADD COLUMN IF NOT EXISTS refresh_token VARCHAR(500);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMPTZ;

-- Add is_active if not present
ALTER TABLE staff ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Add last_login if not present  
ALTER TABLE staff ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
