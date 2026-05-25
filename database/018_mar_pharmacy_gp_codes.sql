-- 018: Add Pharmacy, GP, and Medication Codes to MAR
-- Adds pharmacy_name, pharmacy_phone, gp_name, gp_phone, medication_code, atc_code columns

ALTER TABLE su_medications 
ADD COLUMN IF NOT EXISTS pharmacy_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS pharmacy_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS gp_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS gp_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS medication_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS atc_code VARCHAR(50);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_su_medications_pharmacy_name ON su_medications(pharmacy_name);
CREATE INDEX IF NOT EXISTS idx_su_medications_gp_name ON su_medications(gp_name);
CREATE INDEX IF NOT EXISTS idx_su_medications_code ON su_medications(medication_code);
