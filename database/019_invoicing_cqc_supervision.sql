-- 019: Create Invoicing, CQC Notifications, and Supervision Tables

-- Invoices table for monthly invoicing
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  su_id UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
  month_date DATE NOT NULL,
  commissioned_hours DECIMAL(10,2),
  hourly_rate DECIMAL(10,2),
  invoice_amount DECIMAL(12,2),
  status VARCHAR(20) DEFAULT 'pending',
  notes TEXT,
  created_by UUID REFERENCES staff(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(home_id, su_id, month_date)
);

-- CQC notifications table for safeguarding alerts
CREATE TABLE IF NOT EXISTS cqc_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  su_id UUID REFERENCES service_users(id) ON DELETE CASCADE,
  notification_date TIMESTAMP DEFAULT NOW(),
  notification_type VARCHAR(50),
  details TEXT,
  notified_by UUID REFERENCES staff(id),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(home_id, su_id, notification_date)
);

-- Supervision records table
CREATE TABLE IF NOT EXISTS supervisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  supervisor_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  supervision_date DATE NOT NULL,
  supervision_type VARCHAR(50),
  summary TEXT,
  strengths TEXT,
  areas_for_improvement TEXT,
  action_points TEXT,
  next_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Appraisals table
CREATE TABLE IF NOT EXISTS appraisals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  appraiser_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  appraisal_date DATE NOT NULL,
  rating VARCHAR(20),
  performance_summary TEXT,
  comments TEXT,
  goals TEXT,
  next_review_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Update shifts table to include shift_type
ALTER TABLE shifts 
ADD COLUMN IF NOT EXISTS shift_type VARCHAR(50) DEFAULT 'regular';

-- Create index for invoice lookups
CREATE INDEX IF NOT EXISTS idx_invoices_home_su ON invoices(home_id, su_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_supervisions_staff ON supervisions(staff_id, supervisor_id);
CREATE INDEX IF NOT EXISTS idx_appraisals_staff ON appraisals(staff_id, appraiser_id);

-- Add team_leader role if not exists
INSERT INTO staff_roles (role_name, description, created_at) 
VALUES ('team_leader', 'Team Leader - Can manage their team and supervise staff', NOW())
ON CONFLICT (role_name) DO NOTHING;

-- Ensure staff table has team_lead_id for team leader assignment
ALTER TABLE staff
ADD COLUMN IF NOT EXISTS team_lead_id UUID REFERENCES staff(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_staff_team_lead ON staff(team_lead_id);
