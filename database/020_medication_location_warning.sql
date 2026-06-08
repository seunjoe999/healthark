-- 020: Add Location/Access Code and Medicine Warning to su_medications

ALTER TABLE su_medications
ADD COLUMN IF NOT EXISTS location_access_code TEXT,
ADD COLUMN IF NOT EXISTS medicine_warning TEXT;
