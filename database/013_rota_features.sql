-- Staff leave / absence tracking
CREATE TABLE IF NOT EXISTS staff_leave (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  leave_date DATE NOT NULL,
  leave_type VARCHAR(20) NOT NULL DEFAULT 'annual',
  notes TEXT,
  created_by UUID REFERENCES staff(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(staff_id, leave_date)
);

-- Shift swap requests
CREATE TABLE IF NOT EXISTS shift_swap_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  shift_id UUID NOT NULL REFERENCES staff_shifts(id) ON DELETE CASCADE,
  requesting_staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  target_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  notes TEXT,
  response_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
