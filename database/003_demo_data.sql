-- ================================================================
-- DEMO DATA — run this in pgAdmin connected to the healthark DB
-- ================================================================

DO $$
DECLARE
  v_org_id   UUID := '00000000-0000-0000-0000-000000000001';
  v_home_id  UUID;
  v_admin_id UUID;
  v_mgr_id   UUID;
  v_senior_id UUID;
  v_care1_id  UUID;
  v_care2_id  UUID;
  su1 UUID; su2 UUID; su3 UUID; su4 UUID; su5 UUID; su6 UUID;
BEGIN

-- ── Home ──────────────────────────────────────────────────────────
INSERT INTO homes (organisation_id, name, address1, postcode, phone, email, manager_name, geofence_radius, is_active)
VALUES (v_org_id, 'Sunrise Care Home', '14 Meadow Lane', 'LE3 5BP', '0116 456 7890', 'sunrise@healthark.co.uk', 'Sarah Johnson', 200, true)
ON CONFLICT DO NOTHING;

SELECT id INTO v_home_id FROM homes WHERE organisation_id = v_org_id LIMIT 1;

-- ── Staff ─────────────────────────────────────────────────────────
-- Admin (update existing or insert)
UPDATE staff SET home_id = v_home_id, is_active = true, status = 'active',
  password_hash = '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.' -- Admin1234 (bcrypt)
WHERE email IN ('admin@healthark.co.uk','admin@compcarehub.co.uk');

-- If no admin exists, insert one
INSERT INTO staff (organisation_id, home_id, email, password_hash, first_name, last_name, role, is_active, status)
SELECT v_org_id, v_home_id, 'admin@healthark.co.uk',
  '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.',
  'System', 'Admin', 'group_admin', true, 'active'
WHERE NOT EXISTS (SELECT 1 FROM staff WHERE email IN ('admin@healthark.co.uk','admin@compcarehub.co.uk'));

SELECT id INTO v_admin_id FROM staff WHERE email IN ('admin@healthark.co.uk','admin@compcarehub.co.uk') LIMIT 1;
INSERT INTO staff_onboarding (staff_id) VALUES (v_admin_id) ON CONFLICT DO NOTHING;

-- Manager
INSERT INTO staff (organisation_id, home_id, email, password_hash, first_name, last_name, role, phone, is_active, status, date_of_birth)
VALUES (v_org_id, v_home_id, 'manager@healthark.co.uk',
  '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.',
  'Sarah', 'Johnson', 'home_manager', '07700900001', true, 'active', '1985-03-12')
ON CONFLICT (email) DO UPDATE SET home_id = v_home_id, is_active = true, status = 'active';
SELECT id INTO v_mgr_id FROM staff WHERE email = 'manager@healthark.co.uk';
INSERT INTO staff_onboarding (staff_id) VALUES (v_mgr_id) ON CONFLICT DO NOTHING;
INSERT INTO staff_home_access (staff_id, home_id) VALUES (v_mgr_id, v_home_id) ON CONFLICT DO NOTHING;

-- Senior carer
INSERT INTO staff (organisation_id, home_id, email, password_hash, first_name, last_name, role, phone, is_active, status, date_of_birth)
VALUES (v_org_id, v_home_id, 'senior@healthark.co.uk',
  '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.',
  'Michael', 'Okafor', 'senior_carer', '07700900002', true, 'active', '1990-07-22')
ON CONFLICT (email) DO UPDATE SET home_id = v_home_id, is_active = true, status = 'active';
SELECT id INTO v_senior_id FROM staff WHERE email = 'senior@healthark.co.uk';
INSERT INTO staff_onboarding (staff_id) VALUES (v_senior_id) ON CONFLICT DO NOTHING;
INSERT INTO staff_home_access (staff_id, home_id) VALUES (v_senior_id, v_home_id) ON CONFLICT DO NOTHING;

-- Care staff 1
INSERT INTO staff (organisation_id, home_id, email, password_hash, first_name, last_name, role, phone, is_active, status, date_of_birth)
VALUES (v_org_id, v_home_id, 'care1@healthark.co.uk',
  '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.',
  'Priya', 'Sharma', 'care_staff', '07700900003', true, 'active', '1995-11-05')
ON CONFLICT (email) DO UPDATE SET home_id = v_home_id, is_active = true, status = 'active';
SELECT id INTO v_care1_id FROM staff WHERE email = 'care1@healthark.co.uk';
INSERT INTO staff_onboarding (staff_id) VALUES (v_care1_id) ON CONFLICT DO NOTHING;
INSERT INTO staff_home_access (staff_id, home_id) VALUES (v_care1_id, v_home_id) ON CONFLICT DO NOTHING;

-- Care staff 2
INSERT INTO staff (organisation_id, home_id, email, password_hash, first_name, last_name, role, phone, is_active, status, date_of_birth)
VALUES (v_org_id, v_home_id, 'care2@healthark.co.uk',
  '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.',
  'David', 'Mensah', 'care_staff', '07700900004', true, 'active', '1992-05-18')
ON CONFLICT (email) DO UPDATE SET home_id = v_home_id, is_active = true, status = 'active';
SELECT id INTO v_care2_id FROM staff WHERE email = 'care2@healthark.co.uk';
INSERT INTO staff_onboarding (staff_id) VALUES (v_care2_id) ON CONFLICT DO NOTHING;
INSERT INTO staff_home_access (staff_id, home_id) VALUES (v_care2_id, v_home_id) ON CONFLICT DO NOTHING;

-- ── Service Users (Residents) ─────────────────────────────────────
INSERT INTO service_users (home_id, first_name, last_name, date_of_birth, gender, nhs_number, medical_history, med_allergies, status, admission_date, min_fluid_ml, weight_kg, need_to_know)
VALUES (v_home_id, 'Dorothy', 'Williams', '1938-04-15', 'female', 'NHS-001-DW', 'Dementia, Type 2 Diabetes', 'Penicillin', 'live', NOW()-INTERVAL '6 months', 1500, 62, 'Prefers to be called Dot. Enjoys music and gardening.')
RETURNING id INTO su1;

INSERT INTO service_users (home_id, first_name, last_name, date_of_birth, gender, nhs_number, medical_history, med_allergies, status, admission_date, min_fluid_ml, weight_kg, need_to_know)
VALUES (v_home_id, 'Harold', 'Thompson', '1934-09-03', 'male', 'NHS-002-HT', 'Parkinson''s disease, Hypertension', 'Aspirin', 'live', NOW()-INTERVAL '8 months', 1500, 74, 'Former teacher. Loves crosswords and cricket.')
RETURNING id INTO su2;

INSERT INTO service_users (home_id, first_name, last_name, date_of_birth, gender, nhs_number, medical_history, med_allergies, status, admission_date, min_fluid_ml, weight_kg, need_to_know)
VALUES (v_home_id, 'Margaret', 'Clarke', '1940-12-20', 'female', 'NHS-003-MC', 'COPD, Osteoarthritis', 'None known', 'live', NOW()-INTERVAL '4 months', 1500, 58, 'Breathless on exertion. Needs rest periods during personal care.')
RETURNING id INTO su3;

INSERT INTO service_users (home_id, first_name, last_name, date_of_birth, gender, nhs_number, medical_history, med_allergies, status, admission_date, min_fluid_ml, weight_kg, need_to_know)
VALUES (v_home_id, 'Arthur', 'Davies', '1936-06-08', 'male', 'NHS-004-AD', 'Vascular dementia, Heart failure', 'Sulfa drugs', 'live', NOW()-INTERVAL '12 months', 1500, 68, 'Can become distressed in the evenings. Calm approach essential.')
RETURNING id INTO su4;

INSERT INTO service_users (home_id, first_name, last_name, date_of_birth, gender, nhs_number, medical_history, med_allergies, status, admission_date, min_fluid_ml, weight_kg, need_to_know)
VALUES (v_home_id, 'Edna', 'Morrison', '1942-02-28', 'female', 'NHS-005-EM', 'Stroke recovery, Depression', 'Latex', 'live', NOW()-INTERVAL '3 months', 1500, 55, 'Left-sided weakness following stroke. Physiotherapy twice daily.')
RETURNING id INTO su5;

INSERT INTO service_users (home_id, first_name, last_name, date_of_birth, gender, nhs_number, medical_history, med_allergies, status, admission_date, min_fluid_ml, weight_kg, need_to_know)
VALUES (v_home_id, 'George', 'Bennett', '1933-11-14', 'male', 'NHS-006-GB', 'Alzheimer''s disease', 'None known', 'live', NOW()-INTERVAL '10 months', 1500, 71, 'Wanders at night. Sensor mat in place. Loves Frank Sinatra.')
RETURNING id INTO su6;

-- ── Care Plans ────────────────────────────────────────────────────
INSERT INTO care_plans (su_id, home_id, plan_type, aims_outcomes, how_to_support, review_frequency, next_review_date, is_active, created_by)
VALUES
  (su1, v_home_id, 'physical', 'Maintain mobility and prevent falls', 'Assist with mobility aids, encourage gentle exercise', 'monthly', NOW()+INTERVAL '28 days', true, v_mgr_id),
  (su1, v_home_id, 'medical', 'Manage diabetes and dementia symptoms', 'Monitor blood sugar, administer medication as prescribed', 'monthly', NOW()-INTERVAL '5 days', true, v_mgr_id),
  (su1, v_home_id, 'personal_hygiene', 'Maintain personal dignity and cleanliness', 'Assist with washing, dressing and grooming', 'monthly', NOW()+INTERVAL '14 days', true, v_mgr_id),
  (su2, v_home_id, 'physical', 'Manage Parkinson''s symptoms and maintain independence', 'Assist with tremor management, provide adapted utensils', 'monthly', NOW()-INTERVAL '3 days', true, v_mgr_id),
  (su2, v_home_id, 'medical', 'Control hypertension and Parkinson''s medication', 'Monitor blood pressure daily, administer medication on time', 'monthly', NOW()+INTERVAL '21 days', true, v_mgr_id),
  (su3, v_home_id, 'physical', 'Manage COPD and maintain respiratory health', 'Monitor breathing, support with inhaler use', 'monthly', NOW()-INTERVAL '7 days', true, v_mgr_id),
  (su3, v_home_id, 'food_and_fluids', 'Maintain adequate nutrition and hydration', 'Encourage fluid intake every 2 hours, monitor meals', 'monthly', NOW()+INTERVAL '10 days', true, v_mgr_id),
  (su4, v_home_id, 'medical', 'Manage vascular dementia and heart failure', 'Monitor oedema, administer diuretics as prescribed', 'monthly', NOW()-INTERVAL '10 days', true, v_mgr_id),
  (su5, v_home_id, 'physical', 'Support stroke recovery and maintain function', 'Physiotherapy exercises twice daily', 'monthly', NOW()+INTERVAL '7 days', true, v_mgr_id),
  (su6, v_home_id, 'medical', 'Manage Alzheimer''s progression', 'Provide consistent routine, memory aids, orientation', 'monthly', NOW()-INTERVAL '2 days', true, v_mgr_id);

-- ── Daily Records (last 3 days) ───────────────────────────────────
INSERT INTO daily_records (su_id, home_id, staff_id, record_type, record_date, shift, notes)
VALUES
  (su1, v_home_id, v_care1_id, 'personal_care', CURRENT_DATE, 'morning', 'Dorothy assisted with washing and dressing. Cooperative and in good spirits.'),
  (su1, v_home_id, v_care2_id, 'general', CURRENT_DATE, 'afternoon', 'Dorothy watched television. Ate well at lunch. No concerns noted.'),
  (su2, v_home_id, v_care1_id, 'personal_care', CURRENT_DATE, 'morning', 'Harold required full assistance with morning routine. Tremors present but managed.'),
  (su2, v_home_id, v_senior_id, 'vitals', CURRENT_DATE, 'morning', 'BP: 145/92, Pulse: 74, O2: 97%. Within acceptable range.'),
  (su3, v_home_id, v_care2_id, 'personal_care', CURRENT_DATE, 'morning', 'Margaret assisted with shower. Breathless on exertion, rested afterwards.'),
  (su3, v_home_id, v_care1_id, 'food_drink', CURRENT_DATE, 'afternoon', 'Margaret fluid intake: 850ml by 3pm. Encouraged to drink more.'),
  (su4, v_home_id, v_care2_id, 'general', CURRENT_DATE, 'morning', 'Arthur confused this morning, kept asking for his wife. Redirected calmly.'),
  (su5, v_home_id, v_senior_id, 'personal_care', CURRENT_DATE, 'morning', 'Edna completed physiotherapy exercises. Good progress noted.'),
  (su6, v_home_id, v_care1_id, 'general', CURRENT_DATE, 'morning', 'George settled and calm. Engaged with music therapy session.'),
  -- Yesterday
  (su1, v_home_id, v_care2_id, 'general', CURRENT_DATE-1, 'morning', 'Dorothy slept well. Ate full breakfast. Participated in morning activities.'),
  (su2, v_home_id, v_care1_id, 'vitals', CURRENT_DATE-1, 'morning', 'BP: 148/94, Pulse: 71. GP notified of persistent elevated BP.'),
  (su3, v_home_id, v_senior_id, 'general', CURRENT_DATE-1, 'afternoon', 'Margaret complained of joint pain. Paracetamol administered as prescribed.'),
  (su4, v_home_id, v_care2_id, 'personal_care', CURRENT_DATE-1, 'morning', 'Arthur refused shower initially but agreed after 20 minutes. Washed and changed.'),
  (su5, v_home_id, v_care1_id, 'general', CURRENT_DATE-1, 'morning', 'Edna in low mood today. Encouraged to call family. Spoke with daughter at 2pm.'),
  (su6, v_home_id, v_care2_id, 'general', CURRENT_DATE-1, 'morning', 'George wandered at night. Redirected back to room. Sleep sensor activated.');

-- ── MAR Records ───────────────────────────────────────────────────
INSERT INTO mar_records (su_id, home_id, medication_name, dose, route, frequency, scheduled_time, record_date, given, given_at, given_by)
VALUES
  (su1, v_home_id, 'Metformin 500mg', '500mg', 'oral', 'Twice daily', '08:00', CURRENT_DATE, true, NOW()-INTERVAL '2 hours', v_senior_id),
  (su1, v_home_id, 'Aricept 10mg', '10mg', 'oral', 'Once daily', '08:00', CURRENT_DATE, true, NOW()-INTERVAL '2 hours', v_senior_id),
  (su2, v_home_id, 'Levodopa 100mg', '100mg', 'oral', 'Three times daily', '08:00', CURRENT_DATE, true, NOW()-INTERVAL '2 hours', v_senior_id),
  (su2, v_home_id, 'Amlodipine 5mg', '5mg', 'oral', 'Once daily', '08:00', CURRENT_DATE, true, NOW()-INTERVAL '2 hours', v_senior_id),
  (su3, v_home_id, 'Salbutamol inhaler', '2 puffs', 'inhaled', 'As required', '08:00', CURRENT_DATE, true, NOW()-INTERVAL '2 hours', v_senior_id),
  (su4, v_home_id, 'Furosemide 40mg', '40mg', 'oral', 'Once daily', '08:00', CURRENT_DATE, NULL, NULL, NULL),
  (su5, v_home_id, 'Sertraline 50mg', '50mg', 'oral', 'Once daily', '08:00', CURRENT_DATE, true, NOW()-INTERVAL '2 hours', v_senior_id),
  (su6, v_home_id, 'Donepezil 10mg', '10mg', 'oral', 'Once daily', '21:00', CURRENT_DATE, NULL, NULL, NULL);

-- ── Task Templates ────────────────────────────────────────────────
INSERT INTO task_templates (home_id, created_by, task_name, category, description, frequency, assigned_role, is_active)
VALUES
  (v_home_id, v_mgr_id, 'Morning medication round', 'medication', 'Administer all morning medications and update MAR charts', 'daily', 'senior_carer', true),
  (v_home_id, v_mgr_id, 'Fire safety check', 'safety', 'Check all fire exits, extinguishers and alarm panels', 'weekly', 'home_manager', true),
  (v_home_id, v_mgr_id, 'Fridge temperature log', 'compliance', 'Record fridge temperatures in kitchen and medication room', 'daily', 'care_staff', true),
  (v_home_id, v_mgr_id, 'Weekly care plan reviews', 'care', 'Review flagged care plans and update as needed', 'weekly', 'home_manager', true),
  (v_home_id, v_mgr_id, 'Staff supervision - Priya Sharma', 'hr', 'Monthly one-to-one supervision session', 'monthly', 'home_manager', true),
  (v_home_id, v_mgr_id, 'Order PPE supplies', 'supplies', 'Check stock and order gloves, aprons and masks', 'weekly', 'senior_carer', true);

-- ── Task Completions (pending ones for today) ─────────────────────
INSERT INTO task_completions (template_id, home_id, due_date, completed, missed)
SELECT id, v_home_id, CURRENT_DATE, false, false
FROM task_templates WHERE home_id = v_home_id;

-- ── Business Alerts ───────────────────────────────────────────────
INSERT INTO business_alerts (home_id, alert_type, severity, title, description, is_resolved)
VALUES
  (v_home_id, 'care_plan_overdue', 'high', 'Care plans overdue for review', '4 residents have care plans that are past their review date and require immediate attention.', false),
  (v_home_id, 'medication_gap', 'high', 'MAR chart gap — Arthur Davies', 'Furosemide 40mg (08:00 dose) has not been recorded for Arthur Davies. Please review and update.', false),
  (v_home_id, 'fluid_below_threshold', 'medium', 'Low fluid intake — Margaret Clarke', 'Margaret Clarke has consumed only 850ml today against a target of 1500ml. Encourage fluid intake.', false),
  (v_home_id, 'task_missed', 'medium', 'Tasks pending today', 'Morning medication round and fridge temperature log are due today and have not been completed.', false),
  (v_home_id, 'risk_assessment_overdue', 'low', 'Risk assessments due', 'Falls risk assessment is due for review for 2 residents this week.', false);

-- ── Staff Leave ───────────────────────────────────────────────────
INSERT INTO staff_leave (home_id, staff_id, leave_type, start_date, end_date, hours_requested, reason, status)
VALUES
  (v_home_id, v_care1_id, 'annual', CURRENT_DATE+14, CURRENT_DATE+21, 56, 'Family holiday booked', 'pending'),
  (v_home_id, v_care2_id, 'sick', CURRENT_DATE-1, CURRENT_DATE+2, 24, 'Flu symptoms', 'approved');

-- ── Clock-in Events (today) ───────────────────────────────────────
INSERT INTO staff_clock_events (staff_id, home_id, event_type, event_time, geofence_passed, punctuality)
VALUES
  (v_mgr_id,    v_home_id, 'clock_in', NOW()-INTERVAL '4 hours', true, 'on_time'),
  (v_senior_id, v_home_id, 'clock_in', NOW()-INTERVAL '3 hours 55 minutes', true, 'early'),
  (v_care1_id,  v_home_id, 'clock_in', NOW()-INTERVAL '3 hours 45 minutes', true, 'on_time'),
  (v_care2_id,  v_home_id, 'clock_in', NOW()-INTERVAL '3 hours 30 minutes', true, 'late');

RAISE NOTICE 'Demo data seeded successfully for home: %', v_home_id;
RAISE NOTICE 'Logins: admin@healthark.co.uk / Admin1234';
RAISE NOTICE '        manager@healthark.co.uk / Admin1234';
RAISE NOTICE '        senior@healthark.co.uk  / Admin1234';
RAISE NOTICE '        care1@healthark.co.uk   / Admin1234';

END $$;
