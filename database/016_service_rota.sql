-- Service-user-centric rota improvements
ALTER TABLE shift_templates ADD COLUMN IF NOT EXISTS notes_for_carers TEXT;
ALTER TABLE shift_templates ADD COLUMN IF NOT EXISTS notes_for_managers TEXT;
ALTER TABLE shift_templates ADD COLUMN IF NOT EXISTS is_ongoing BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE shift_templates ADD COLUMN IF NOT EXISTS total_staff_required INT NOT NULL DEFAULT 1;

ALTER TABLE staff_shifts ADD COLUMN IF NOT EXISTS notes_for_carers TEXT;
ALTER TABLE staff_shifts ADD COLUMN IF NOT EXISTS notes_for_managers TEXT;
ALTER TABLE staff_shifts ADD COLUMN IF NOT EXISTS is_standby BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE staff_shifts ADD COLUMN IF NOT EXISTS standby_work_details TEXT;

-- Allow staff_id to be null (for unfilled slots)
ALTER TABLE staff_shifts ALTER COLUMN staff_id DROP NOT NULL;
