-- ================================================================
-- DEMO DATA — run in pgAdmin connected to the healthark database
-- Run AFTER 001_schema.sql and 003_missing_tables.sql
-- ================================================================

DO $$
DECLARE
  v_org_id    UUID := '00000000-0000-0000-0000-000000000001';
  v_home_id   UUID;
  v_admin_id  UUID;
  v_mgr_id    UUID;
  v_senior_id UUID;
  v_care1_id  UUID;
  v_care2_id  UUID;
  su1 UUID; su2 UUID; su3 UUID; su4 UUID; su5 UUID; su6 UUID;
  t1 UUID; t2 UUID; t3 UUID; t4 UUID; t5 UUID; t6 UUID;
BEGIN

-- ── Organisation (ensure exists) ─────────────────────────────────
INSERT INTO organisations (id, name, reg_number, email)
VALUES (v_org_id, 'CompCare Hub Organisation', 'REG-001', 'admin@compcarehub.co.uk')
ON CONFLICT (id) DO NOTHING;

-- ── Home ─────────────────────────────────────────────────────────
INSERT INTO homes (organisation_id, name, address1, postcode, phone, email, manager_name, geofence_radius, is_active)
VALUES (v_org_id, 'Sunrise Care Home', '14 Meadow Lane', 'LE3 5BP', '0116 456 7890', 'sunrise@compcarehub.co.uk', 'Sarah Johnson', 200, true)
ON CONFLICT DO NOTHING;
SELECT id INTO v_home_id FROM homes WHERE organisation_id = v_org_id LIMIT 1;

-- ── Admin staff ───────────────────────────────────────────────────
-- Password for ALL accounts: Admin1234
-- bcrypt hash of 'Admin1234' with salt rounds 10
INSERT INTO staff (organisation_id, home_id, email, password_hash, first_name, last_name, role, is_active, status)
VALUES (v_org_id, v_home_id, 'admin@healthark.co.uk',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVKhB7fRCi',
  'System', 'Admin', 'group_admin', true, 'active')
ON CONFLICT (email) DO UPDATE SET home_id = v_home_id, is_active = true, status = 'active',
  password_hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVKhB7fRCi';
SELECT id INTO v_admin_id FROM staff WHERE email = 'admin@healthark.co.uk';
INSERT INTO staff_onboarding (staff_id) VALUES (v_admin_id) ON CONFLICT DO NOTHING;

-- Manager
INSERT INTO staff (organisation_id, home_id, email, password_hash, first_name, last_name, role, phone, is_active, status, date_of_birth)
VALUES (v_org_id, v_home_id, 'manager@healthark.co.uk',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVKhB7fRCi',
  'Sarah', 'Johnson', 'home_manager', '07700900001', true, 'active', '1985-03-12')
ON CONFLICT (email) DO UPDATE SET home_id = v_home_id, is_active = true, status = 'active',
  password_hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVKhB7fRCi';
SELECT id INTO v_mgr_id FROM staff WHERE email = 'manager@healthark.co.uk';
INSERT INTO staff_onboarding (staff_id) VALUES (v_mgr_id) ON CONFLICT DO NOTHING;
INSERT INTO staff_home_access (staff_id, home_id) VALUES (v_mgr_id, v_home_id) ON CONFLICT DO NOTHING;

-- Senior carer
INSERT INTO staff (organisation_id, home_id, email, password_hash, first_name, last_name, role, phone, is_active, status, date_of_birth)
VALUES (v_org_id, v_home_id, 'senior@healthark.co.uk',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVKhB7fRCi',
  'Michael', 'Okafor', 'senior_carer', '07700900002', true, 'active', '1990-07-22')
ON CONFLICT (email) DO UPDATE SET home_id = v_home_id, is_active = true, status = 'active',
  password_hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVKhB7fRCi';
SELECT id INTO v_senior_id FROM staff WHERE email = 'senior@healthark.co.uk';
INSERT INTO staff_onboarding (staff_id) VALUES (v_senior_id) ON CONFLICT DO NOTHING;
INSERT INTO staff_home_access (staff_id, home_id) VALUES (v_senior_id, v_home_id) ON CONFLICT DO NOTHING;

-- Care staff 1
INSERT INTO staff (organisation_id, home_id, email, password_hash, first_name, last_name, role, phone, is_active, status, date_of_birth)
VALUES (v_org_id, v_home_id, 'care1@healthark.co.uk',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVKhB7fRCi',
  'Priya', 'Sharma', 'care_staff', '07700900003', true, 'active', '1995-11-05')
ON CONFLICT (email) DO UPDATE SET home_id = v_home_id, is_active = true, status = 'active',
  password_hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVKhB7fRCi';
SELECT id INTO v_care1_id FROM staff WHERE email = 'care1@healthark.co.uk';
INSERT INTO staff_onboarding (staff_id) VALUES (v_care1_id) ON CONFLICT DO NOTHING;
INSERT INTO staff_home_access (staff_id, home_id) VALUES (v_care1_id, v_home_id) ON CONFLICT DO NOTHING;

-- Care staff 2
INSERT INTO staff (organisation_id, home_id, email, password_hash, first_name, last_name, role, phone, is_active, status, date_of_birth)
VALUES (v_org_id, v_home_id, 'care2@healthark.co.uk',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVKhB7fRCi',
  'David', 'Mensah', 'care_staff', '07700900004', true, 'active', '1992-05-18')
ON CONFLICT (email) DO UPDATE SET home_id = v_home_id, is_active = true, status = 'active',
  password_hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVKhB7fRCi';
SELECT id INTO v_care2_id FROM staff WHERE email = 'care2@healthark.co.uk';
INSERT INTO staff_onboarding (staff_id) VALUES (v_care2_id) ON CONFLICT DO NOTHING;
INSERT INTO staff_home_access (staff_id, home_id) VALUES (v_care2_id, v_home_id) ON CONFLICT DO NOTHING;

-- ── Service Users (Residents) ─────────────────────────────────────
INSERT INTO service_users (home_id, first_name, last_name, date_of_birth, gender,
  nhs_number, medical_history, med_allergies, status, admission_date,
  min_fluid_ml, weight_kg, need_to_know, my_instructions)
VALUES (v_home_id, 'Dorothy', 'Williams', '1938-04-15', 'female',
  'NHS-001-DW', 'Dementia, Type 2 Diabetes', 'Penicillin', 'live', NOW()-INTERVAL '6 months',
  1500, 62, 'Prefers to be called Dot. Enjoys music and gardening.',
  'Approach calmly. Use simple instructions. Check blood sugar before meals.')
RETURNING id INTO su1;

INSERT INTO service_users (home_id, first_name, last_name, date_of_birth, gender,
  nhs_number, medical_history, med_allergies, status, admission_date,
  min_fluid_ml, weight_kg, need_to_know, my_instructions)
VALUES (v_home_id, 'Harold', 'Thompson', '1934-09-03', 'male',
  'NHS-002-HT', 'Parkinson''s disease, Hypertension', 'Aspirin', 'live', NOW()-INTERVAL '8 months',
  1500, 74, 'Former teacher. Loves crosswords and cricket.',
  'Allow extra time for tasks. Monitor tremors. BP check every morning.')
RETURNING id INTO su2;

INSERT INTO service_users (home_id, first_name, last_name, date_of_birth, gender,
  nhs_number, medical_history, med_allergies, status, admission_date,
  min_fluid_ml, weight_kg, need_to_know, my_instructions)
VALUES (v_home_id, 'Margaret', 'Clarke', '1940-12-20', 'female',
  'NHS-003-MC', 'COPD, Osteoarthritis', 'None known', 'live', NOW()-INTERVAL '4 months',
  1500, 58, 'Breathless on exertion. Needs rest periods during personal care.',
  'Inhaler must be within reach at all times. Sit upright after meals.')
RETURNING id INTO su3;

INSERT INTO service_users (home_id, first_name, last_name, date_of_birth, gender,
  nhs_number, medical_history, med_allergies, status, admission_date,
  min_fluid_ml, weight_kg, need_to_know, my_instructions)
VALUES (v_home_id, 'Arthur', 'Davies', '1936-06-08', 'male',
  'NHS-004-AD', 'Vascular dementia, Heart failure', 'Sulfa drugs', 'live', NOW()-INTERVAL '12 months',
  1500, 68, 'Can become distressed in the evenings (sundowning). Calm approach essential.',
  'Monitor for oedema in legs daily. Restrict fluids to 1500ml. Diuretics at 08:00.')
RETURNING id INTO su4;

INSERT INTO service_users (home_id, first_name, last_name, date_of_birth, gender,
  nhs_number, medical_history, med_allergies, status, admission_date,
  min_fluid_ml, weight_kg, need_to_know, my_instructions)
VALUES (v_home_id, 'Edna', 'Morrison', '1942-02-28', 'female',
  'NHS-005-EM', 'Stroke recovery, Depression', 'Latex', 'live', NOW()-INTERVAL '3 months',
  1500, 55, 'Left-sided weakness following stroke. Physiotherapy twice daily.',
  'No latex gloves. Assist from right side. Encourage communication exercises.')
RETURNING id INTO su5;

INSERT INTO service_users (home_id, first_name, last_name, date_of_birth, gender,
  nhs_number, medical_history, med_allergies, status, admission_date,
  min_fluid_ml, weight_kg, need_to_know, my_instructions)
VALUES (v_home_id, 'George', 'Bennett', '1933-11-14', 'male',
  'NHS-006-GB', 'Alzheimer''s disease', 'None known', 'live', NOW()-INTERVAL '10 months',
  1500, 71, 'Wanders at night. Sensor mat in place. Loves Frank Sinatra.',
  'Consistent routine essential. Redirect if confused. Night checks every 2 hours.')
RETURNING id INTO su6;

-- ── SU Contacts ───────────────────────────────────────────────────
INSERT INTO su_contacts (su_id, full_name, relationship, contact_tag, phone_primary, is_primary)
VALUES
  (su1, 'Patricia Williams', 'Daughter', 'Next of Kin', '07712345001', true),
  (su2, 'James Thompson', 'Son', 'Next of Kin', '07712345002', true),
  (su3, 'Robert Clarke', 'Husband', 'Next of Kin', '07712345003', true),
  (su4, 'Linda Davies', 'Daughter', 'Next of Kin', '07712345004', true),
  (su5, 'Brian Morrison', 'Son', 'Next of Kin', '07712345005', true),
  (su6, 'Susan Bennett', 'Daughter', 'Next of Kin', '07712345006', true);

-- ── Care Plans ────────────────────────────────────────────────────
INSERT INTO care_plans (su_id, home_id, plan_type, aims_outcomes, how_to_support,
  review_frequency, next_review_date, is_active, created_by)
VALUES
  (su1, v_home_id, 'medical',
   'Manage diabetes and dementia symptoms effectively',
   'Monitor blood sugar before meals. Administer insulin as prescribed. Use simple clear instructions.',
   'monthly', CURRENT_DATE - 5, true, v_mgr_id),
  (su1, v_home_id, 'personal_hygiene',
   'Maintain personal dignity and cleanliness',
   'Assist with washing and dressing each morning. Encourage independence where possible.',
   'monthly', CURRENT_DATE + 14, true, v_mgr_id),
  (su2, v_home_id, 'physical',
   'Manage Parkinson''s symptoms and maintain independence',
   'Allow extra time. Provide adapted utensils. Monitor swallowing.',
   'monthly', CURRENT_DATE - 3, true, v_mgr_id),
  (su2, v_home_id, 'medical',
   'Control hypertension and Parkinson''s medication schedule',
   'BP check every morning. Administer Levodopa on strict schedule.',
   'monthly', CURRENT_DATE + 21, true, v_mgr_id),
  (su3, v_home_id, 'physical',
   'Manage COPD and maintain respiratory health',
   'Ensure inhaler accessible. Monitor breathing. Rest periods during care.',
   'monthly', CURRENT_DATE - 7, true, v_mgr_id),
  (su3, v_home_id, 'food_and_fluids',
   'Maintain adequate nutrition and hydration',
   'Encourage fluid intake every 2 hours. Record all intake. Alert if below 1000ml by 3pm.',
   'monthly', CURRENT_DATE + 10, true, v_mgr_id),
  (su4, v_home_id, 'medical',
   'Manage vascular dementia and heart failure',
   'Monitor oedema daily. Administer diuretics at 08:00. Fluid restriction 1500ml/day.',
   'monthly', CURRENT_DATE - 10, true, v_mgr_id),
  (su5, v_home_id, 'physical',
   'Support stroke recovery and maximise function',
   'Physiotherapy exercises twice daily. Assist from right side only.',
   'monthly', CURRENT_DATE + 7, true, v_mgr_id),
  (su6, v_home_id, 'medical',
   'Manage Alzheimer''s progression and maintain quality of life',
   'Consistent daily routine. Memory aids throughout room. Night sensor mat active.',
   'monthly', CURRENT_DATE - 2, true, v_mgr_id),
  (su6, v_home_id, 'personal_hygiene',
   'Maintain hygiene with dignity',
   'Morning routine at same time daily. Music during personal care to reduce distress.',
   'monthly', CURRENT_DATE + 28, true, v_mgr_id);

-- ── Daily Records ─────────────────────────────────────────────────
INSERT INTO daily_records (su_id, home_id, staff_id, record_type, record_date, shift, notes)
VALUES
  (su1, v_home_id, v_care1_id, 'personal_care', CURRENT_DATE, 'morning',
   'Dorothy assisted with washing and dressing. Cooperative and in good spirits today.'),
  (su1, v_home_id, v_care2_id, 'food_drink', CURRENT_DATE, 'morning',
   'Dorothy ate full breakfast — porridge and toast. Drank 250ml orange juice.'),
  (su2, v_home_id, v_care1_id, 'personal_care', CURRENT_DATE, 'morning',
   'Harold required full assistance with morning routine. Tremors present but manageable.'),
  (su2, v_home_id, v_senior_id, 'vitals', CURRENT_DATE, 'morning',
   'BP: 145/92, Pulse: 74, O2: 97%. Slightly elevated BP noted. GP will be informed if persistent.'),
  (su3, v_home_id, v_care2_id, 'personal_care', CURRENT_DATE, 'morning',
   'Margaret assisted with shower. Breathless on exertion — rest periods taken.'),
  (su3, v_home_id, v_care1_id, 'food_drink', CURRENT_DATE, 'morning',
   'Fluid intake: 850ml by lunchtime. Encouraged to drink more. Offered preferred squash drink.'),
  (su4, v_home_id, v_care2_id, 'general', CURRENT_DATE, 'morning',
   'Arthur confused this morning, asking for his late wife. Redirected calmly with photos.'),
  (su5, v_home_id, v_senior_id, 'personal_care', CURRENT_DATE, 'morning',
   'Edna completed physiotherapy exercises independently. Good progress this week.'),
  (su6, v_home_id, v_care1_id, 'general', CURRENT_DATE, 'morning',
   'George settled and calm. Engaged well with morning music session — sang along.'),
  -- Yesterday
  (su1, v_home_id, v_care2_id, 'general', CURRENT_DATE-1, 'morning',
   'Dorothy in good mood. Participated in flower arranging activity. Ate all meals.'),
  (su2, v_home_id, v_care1_id, 'vitals', CURRENT_DATE-1, 'morning',
   'BP: 148/94, Pulse: 71, O2: 98%. GP notified of elevated BP — review booked.'),
  (su3, v_home_id, v_senior_id, 'general', CURRENT_DATE-1, 'afternoon',
   'Margaret complained of joint pain in knees. Paracetamol administered as prescribed.'),
  (su4, v_home_id, v_care2_id, 'personal_care', CURRENT_DATE-1, 'morning',
   'Arthur initially refused shower. Agreed after 20 minutes with reassurance.'),
  (su5, v_home_id, v_care1_id, 'general', CURRENT_DATE-1, 'morning',
   'Edna in lower mood. Spoke with daughter on video call at 2pm — lifted spirits.'),
  (su6, v_home_id, v_care2_id, 'general', CURRENT_DATE-1, 'night',
   'George wandered at 02:30. Sensor activated. Redirected to room and settled.'),
  -- 2 days ago
  (su1, v_home_id, v_senior_id, 'vitals', CURRENT_DATE-2, 'morning',
   'BP: 138/85, Pulse: 72, O2: 98%. Blood sugar 7.2 — within range.'),
  (su3, v_home_id, v_care1_id, 'food_drink', CURRENT_DATE-2, 'afternoon',
   'Total fluid intake 1350ml today — below 1500ml target. Plan to increase encouragement.'),
  (su4, v_home_id, v_care2_id, 'vitals', CURRENT_DATE-2, 'morning',
   'Legs checked — mild oedema noted in ankles. Elevated feet for 30 mins.'),
  (su5, v_home_id, v_senior_id, 'personal_care', CURRENT_DATE-2, 'morning',
   'Edna showered independently with supervision. Improving mobility on right side.');

-- ── MAR Records ───────────────────────────────────────────────────
INSERT INTO mar_records (su_id, home_id, medication_name, dose, route, frequency,
  scheduled_time, record_date, given, given_at, given_by)
VALUES
  (su1, v_home_id, 'Metformin 500mg', '500mg', 'oral', 'Twice daily',
   '08:00', CURRENT_DATE, true, NOW()-INTERVAL '3 hours', v_senior_id),
  (su1, v_home_id, 'Aricept (Donepezil) 10mg', '10mg', 'oral', 'Once daily',
   '08:00', CURRENT_DATE, true, NOW()-INTERVAL '3 hours', v_senior_id),
  (su2, v_home_id, 'Levodopa/Carbidopa 100/25mg', '100mg', 'oral', 'Three times daily',
   '08:00', CURRENT_DATE, true, NOW()-INTERVAL '3 hours', v_senior_id),
  (su2, v_home_id, 'Amlodipine 5mg', '5mg', 'oral', 'Once daily',
   '08:00', CURRENT_DATE, true, NOW()-INTERVAL '3 hours', v_senior_id),
  (su3, v_home_id, 'Salbutamol 100mcg inhaler', '2 puffs', 'inhaled', 'As required',
   '08:00', CURRENT_DATE, true, NOW()-INTERVAL '3 hours', v_senior_id),
  (su3, v_home_id, 'Tiotropium 18mcg inhaler', '1 puff', 'inhaled', 'Once daily',
   '08:00', CURRENT_DATE, true, NOW()-INTERVAL '3 hours', v_senior_id),
  -- Arthur's morning dose NOT given (creates an alert scenario)
  (su4, v_home_id, 'Furosemide 40mg', '40mg', 'oral', 'Once daily',
   '08:00', CURRENT_DATE, NULL, NULL, NULL),
  (su4, v_home_id, 'Digoxin 125mcg', '125mcg', 'oral', 'Once daily',
   '08:00', CURRENT_DATE, true, NOW()-INTERVAL '3 hours', v_senior_id),
  (su5, v_home_id, 'Sertraline 50mg', '50mg', 'oral', 'Once daily',
   '08:00', CURRENT_DATE, true, NOW()-INTERVAL '3 hours', v_senior_id),
  (su5, v_home_id, 'Clopidogrel 75mg', '75mg', 'oral', 'Once daily',
   '08:00', CURRENT_DATE, true, NOW()-INTERVAL '3 hours', v_senior_id),
  -- George's evening dose not yet due
  (su6, v_home_id, 'Donepezil 10mg', '10mg', 'oral', 'Once daily',
   '21:00', CURRENT_DATE, NULL, NULL, NULL),
  (su6, v_home_id, 'Memantine 20mg', '20mg', 'oral', 'Once daily',
   '08:00', CURRENT_DATE, true, NOW()-INTERVAL '3 hours', v_senior_id);

-- ── SU Medications (active prescriptions) ────────────────────────
INSERT INTO su_medications (su_id, home_id, medication_name, dose, route, frequency,
  prescribed_by, start_date, is_active, created_by)
VALUES
  (su1, v_home_id, 'Metformin 500mg', '500mg', 'oral', 'Twice daily', 'Dr. A. Patel', CURRENT_DATE-180, true, v_mgr_id),
  (su1, v_home_id, 'Aricept (Donepezil) 10mg', '10mg', 'oral', 'Once daily', 'Dr. A. Patel', CURRENT_DATE-180, true, v_mgr_id),
  (su2, v_home_id, 'Levodopa/Carbidopa 100/25mg', '100mg', 'oral', 'Three times daily', 'Dr. R. Williams', CURRENT_DATE-240, true, v_mgr_id),
  (su3, v_home_id, 'Salbutamol 100mcg inhaler', '2 puffs', 'inhaled', 'As required', 'Dr. M. Khan', CURRENT_DATE-120, true, v_mgr_id),
  (su4, v_home_id, 'Furosemide 40mg', '40mg', 'oral', 'Once daily', 'Dr. A. Patel', CURRENT_DATE-365, true, v_mgr_id),
  (su5, v_home_id, 'Sertraline 50mg', '50mg', 'oral', 'Once daily', 'Dr. R. Williams', CURRENT_DATE-90, true, v_mgr_id),
  (su6, v_home_id, 'Donepezil 10mg', '10mg', 'oral', 'Once daily', 'Dr. M. Khan', CURRENT_DATE-300, true, v_mgr_id);

-- ── Medication Stock ──────────────────────────────────────────────
INSERT INTO medication_stock (home_id, su_id, medication_name, form, strength,
  quantity_remaining, unit, reorder_threshold, last_updated_by)
VALUES
  (v_home_id, su1, 'Metformin', 'tablet', '500mg', 28, 'tablets', 14, v_senior_id),
  (v_home_id, su1, 'Donepezil', 'tablet', '10mg', 28, 'tablets', 7, v_senior_id),
  (v_home_id, su2, 'Levodopa/Carbidopa', 'tablet', '100/25mg', 60, 'tablets', 14, v_senior_id),
  (v_home_id, su4, 'Furosemide', 'tablet', '40mg', 5, 'tablets', 7, v_senior_id),
  (v_home_id, su6, 'Donepezil', 'tablet', '10mg', 6, 'tablets', 7, v_senior_id);

-- ── Task Templates ────────────────────────────────────────────────
INSERT INTO task_templates (home_id, created_by, task_name, title, category, description,
  frequency, assigned_role, is_active)
VALUES
  (v_home_id, v_mgr_id, 'Morning medication round', 'Morning medication round',
   'medication', 'Administer all 08:00 medications and sign MAR charts', 'daily', 'senior_carer', true),
  (v_home_id, v_mgr_id, 'Evening medication round', 'Evening medication round',
   'medication', 'Administer all 20:00 medications and sign MAR charts', 'daily', 'senior_carer', true),
  (v_home_id, v_mgr_id, 'Fridge temperature log', 'Fridge temperature log',
   'compliance', 'Record fridge temperatures in kitchen and medication room', 'daily', 'care_staff', true),
  (v_home_id, v_mgr_id, 'Fire safety check', 'Fire safety check',
   'safety', 'Check all fire exits, extinguishers and alarm panels', 'weekly', 'home_manager', true),
  (v_home_id, v_mgr_id, 'Weekly care plan reviews', 'Weekly care plan reviews',
   'care', 'Review flagged care plans and update as needed', 'weekly', 'home_manager', true),
  (v_home_id, v_mgr_id, 'Order PPE supplies', 'Order PPE supplies',
   'supplies', 'Check stock levels and order gloves, aprons and masks if needed', 'weekly', 'senior_carer', true);

-- ── Tasks for today (from templates) ─────────────────────────────
INSERT INTO tasks (home_id, created_by, title, category, description, task_date, due_time, priority, assigned_role, status)
VALUES
  (v_home_id, v_mgr_id, 'Morning medication round', 'medication',
   'Administer all 08:00 medications and sign MAR charts', CURRENT_DATE, '08:00', 'urgent', 'senior_carer', 'completed'),
  (v_home_id, v_mgr_id, 'Fridge temperature log', 'compliance',
   'Record fridge temperatures in kitchen and medication room', CURRENT_DATE, '09:00', 'normal', 'care_staff', 'pending'),
  (v_home_id, v_mgr_id, 'Evening medication round', 'medication',
   'Administer all 20:00 medications and sign MAR charts', CURRENT_DATE, '20:00', 'urgent', 'senior_carer', 'pending'),
  (v_home_id, v_mgr_id, 'Review Dorothy Williams care plan', 'care',
   'Care plan overdue for review — dementia and diabetes management', CURRENT_DATE, '14:00', 'high', 'home_manager', 'pending'),
  (v_home_id, v_mgr_id, 'Book GP review for Harold Thompson', 'medical',
   'BP has been elevated for 3 consecutive days — GP review needed', CURRENT_DATE, '11:00', 'high', 'home_manager', 'pending'),
  (v_home_id, v_mgr_id, 'Chase Furosemide supply for Arthur Davies', 'medication',
   'Stock critically low — 5 tablets remaining. Contact pharmacy today.', CURRENT_DATE, '10:00', 'urgent', 'senior_carer', 'pending');

-- ── Business Alerts ───────────────────────────────────────────────
INSERT INTO business_alerts (home_id, alert_type, severity, title, description, su_id, is_resolved)
VALUES
  (v_home_id, 'care_plan_overdue', 'high',
   'Care plans overdue for review',
   '4 residents have care plans past their review date: Dorothy Williams (Medical), Harold Thompson (Physical), Margaret Clarke (Physical), Arthur Davies (Medical).',
   NULL, false),
  (v_home_id, 'medication_gap', 'high',
   'MAR chart gap — Arthur Davies',
   'Furosemide 40mg (08:00 dose) has not been recorded for Arthur Davies. Please administer and update MAR chart immediately.',
   su4, false),
  (v_home_id, 'fluid_below_threshold', 'medium',
   'Low fluid intake — Margaret Clarke',
   'Margaret Clarke has consumed only 850ml today against a 1500ml daily target. Increase monitoring and encourage fluids.',
   su3, false),
  (v_home_id, 'task_missed', 'medium',
   'Urgent tasks pending today',
   'Fridge temperature log and care plan reviews are due and have not been completed.',
   NULL, false),
  (v_home_id, 'risk_assessment_overdue', 'low',
   'Falls risk assessments due',
   'Falls risk assessment due for review for Dorothy Williams and George Bennett this week.',
   NULL, false);

-- ── Staff Leave Requests ──────────────────────────────────────────
INSERT INTO staff_leave (home_id, staff_id, leave_type, start_date, end_date, hours_requested, reason, status)
VALUES
  (v_home_id, v_care1_id, 'annual', CURRENT_DATE+14, CURRENT_DATE+21, 56, 'Family holiday booked', 'pending'),
  (v_home_id, v_care2_id, 'sick', CURRENT_DATE-1, CURRENT_DATE+2, 24, 'Flu symptoms — GP signed off', 'approved');

-- ── Staff Clock-in Events (today) ─────────────────────────────────
INSERT INTO staff_clock_events (staff_id, home_id, event_type, event_time, geofence_passed, punctuality)
VALUES
  (v_mgr_id,    v_home_id, 'clock_in', NOW()-INTERVAL '4 hours', true, 'on_time'),
  (v_senior_id, v_home_id, 'clock_in', NOW()-INTERVAL '3 hours 58 minutes', true, 'early'),
  (v_care1_id,  v_home_id, 'clock_in', NOW()-INTERVAL '3 hours 45 minutes', true, 'on_time'),
  (v_care2_id,  v_home_id, 'clock_in', NOW()-INTERVAL '3 hours 30 minutes', true, 'late');

-- ── Staff Shifts (this week) ──────────────────────────────────────
INSERT INTO staff_shifts (home_id, staff_id, shift_date, start_time, end_time, shift_type, created_by)
VALUES
  (v_home_id, v_senior_id, CURRENT_DATE, '07:00', '19:00', 'early', v_mgr_id),
  (v_home_id, v_care1_id,  CURRENT_DATE, '07:00', '19:00', 'early', v_mgr_id),
  (v_home_id, v_care2_id,  CURRENT_DATE, '07:00', '19:00', 'early', v_mgr_id),
  (v_home_id, v_senior_id, CURRENT_DATE+1, '07:00', '19:00', 'early', v_mgr_id),
  (v_home_id, v_care1_id,  CURRENT_DATE+1, '19:00', '07:00', 'late', v_mgr_id),
  (v_home_id, v_care2_id,  CURRENT_DATE+2, '07:00', '19:00', 'early', v_mgr_id),
  (v_home_id, v_senior_id, CURRENT_DATE+2, '19:00', '07:00', 'late', v_mgr_id);

-- ── PPE Inventory ─────────────────────────────────────────────────
INSERT INTO ppe_inventory (home_id, item_name, item_variant, current_stock, min_stock, unit)
VALUES
  (v_home_id, 'Disposable Gloves', 'Small', 450, 100, 'pairs'),
  (v_home_id, 'Disposable Gloves', 'Medium', 320, 100, 'pairs'),
  (v_home_id, 'Disposable Gloves', 'Large', 180, 100, 'pairs'),
  (v_home_id, 'Disposable Aprons', 'Standard', 85, 50, 'units'),
  (v_home_id, 'Type IIR Face Masks', 'Standard', 120, 50, 'units'),
  (v_home_id, 'Hand Sanitiser', '500ml', 8, 5, 'bottles'),
  (v_home_id, 'Eye Protection', 'Goggles', 12, 5, 'units');

-- ── Notifications ─────────────────────────────────────────────────
INSERT INTO notifications (recipient_id, home_id, title, body, type, link, is_read)
VALUES
  (v_mgr_id, v_home_id, 'Care plan overdue', 'Dorothy Williams medical care plan is 5 days overdue for review.', 'warning', '/care-plans', false),
  (v_mgr_id, v_home_id, 'Leave request pending', 'Priya Sharma has requested annual leave 14–21 days from now. Please review.', 'info', '/holidays', false),
  (v_senior_id, v_home_id, 'MAR chart gap', 'Furosemide dose for Arthur Davies has not been recorded this morning.', 'alert', '/mar', false),
  (v_mgr_id, v_home_id, 'Staff registered', 'A new staff registration is pending your approval.', 'info', '/staff', true);

RAISE NOTICE '==============================================';
RAISE NOTICE 'Demo data seeded successfully!';
RAISE NOTICE 'Home: Sunrise Care Home';
RAISE NOTICE '6 residents | 5 staff | care plans | MAR | tasks | alerts';
RAISE NOTICE '';
RAISE NOTICE 'LOGIN CREDENTIALS (all use password: Admin1234)';
RAISE NOTICE '  admin@healthark.co.uk   — Group Admin';
RAISE NOTICE '  manager@healthark.co.uk — Home Manager';
RAISE NOTICE '  senior@healthark.co.uk  — Senior Carer';
RAISE NOTICE '  care1@healthark.co.uk   — Care Staff';
RAISE NOTICE '  care2@healthark.co.uk   — Care Staff';
RAISE NOTICE '==============================================';

END $$;
