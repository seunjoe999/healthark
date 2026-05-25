-- Risk management enhancements
ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS historical_context TEXT;
ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS risk_rating VARCHAR(20);

-- Rename/alias: risk_rating maps to risk_level for clarity
-- (risk_level = initial, current_risk_level = current, risk_rating = overall)
-- Back-fill risk_rating from current_risk_level
UPDATE risk_assessments SET risk_rating = current_risk_level WHERE risk_rating IS NULL;
