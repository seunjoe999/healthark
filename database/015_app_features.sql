-- Add learning disabilities and key info to service users
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS learning_disabilities TEXT;
ALTER TABLE service_users ADD COLUMN IF NOT EXISTS key_info TEXT;

-- Add feature flags to staff (controls which nav sections each account can see)
ALTER TABLE staff ADD COLUMN IF NOT EXISTS feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Add outcome and summary fields to meeting notes (for appointment outcomes vs event summaries)
ALTER TABLE meeting_notes ADD COLUMN IF NOT EXISTS outcome TEXT;
ALTER TABLE meeting_notes ADD COLUMN IF NOT EXISTS summary TEXT;

-- Add policy_attachments table for file uploads on policies
CREATE TABLE IF NOT EXISTS policy_attachments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id   UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  file_name   VARCHAR(255) NOT NULL,
  file_url    TEXT NOT NULL,
  mime_type   VARCHAR(100),
  uploaded_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
