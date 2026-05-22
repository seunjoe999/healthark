--
-- PostgreSQL database dump
--

\restrict BT6oIg0FNzbW8maHDa3NE3ieAPa2R62OFA1npYG8RMj3hMp4qiDEAakkC1rQuXT

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    home_id uuid,
    template_key text NOT NULL,
    category text NOT NULL,
    subject_id uuid,
    subject_name text,
    conducted_by uuid,
    auditor_name text,
    answers jsonb DEFAULT '{}'::jsonb NOT NULL,
    total_score integer DEFAULT 0,
    max_score integer DEFAULT 0,
    score_pct numeric(5,2) DEFAULT 0,
    risk_level text,
    actions_identified text,
    actions_outcome text,
    actions_completed_date date,
    next_review_date date,
    notes text,
    assessment_date date DEFAULT CURRENT_DATE,
    status text DEFAULT 'completed'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: audit_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    home_id uuid NOT NULL,
    generated_by uuid,
    audit_type character varying(100) NOT NULL,
    custom_name character varying(255),
    status character varying(20) DEFAULT 'generating'::character varying,
    period_from date,
    period_to date,
    findings text,
    recommendations text,
    raw_report text,
    total_checks integer DEFAULT 0,
    checks_passed integer DEFAULT 0,
    checks_failed integer DEFAULT 0,
    generated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: business_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    home_id uuid,
    created_by uuid,
    alert_type character varying(100),
    severity character varying(20) DEFAULT 'info'::character varying,
    title character varying(255) NOT NULL,
    description text,
    is_resolved boolean DEFAULT false,
    resolved_by uuid,
    resolved_at timestamp with time zone,
    resolution_notes text,
    created_at timestamp with time zone DEFAULT now(),
    su_id uuid,
    staff_id uuid,
    record_id uuid,
    record_type character varying(50),
    notified_admin boolean DEFAULT false NOT NULL,
    data jsonb
);


--
-- Name: calendar_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendar_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    home_id uuid NOT NULL,
    created_by uuid,
    title character varying(255) NOT NULL,
    event_type character varying(50) DEFAULT 'other'::character varying,
    event_date date NOT NULL,
    start_time time without time zone,
    end_time time without time zone,
    description text,
    location character varying(255),
    su_id uuid,
    all_staff boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: capacity_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.capacity_assessments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    su_id uuid NOT NULL,
    home_id uuid,
    assessed_by uuid,
    decision_area character varying(255),
    has_capacity boolean,
    assessment_date date,
    summary text,
    outcome text,
    review_date date,
    created_at timestamp with time zone DEFAULT now(),
    best_interest_decision text,
    consulted_with text
);


--
-- Name: care_plan_updates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.care_plan_updates (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    care_plan_id uuid NOT NULL,
    update_notes text NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: care_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.care_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    su_id uuid NOT NULL,
    home_id uuid,
    created_by uuid,
    plan_type character varying(100) NOT NULL,
    custom_name character varying(255),
    aims_outcomes text,
    what_i_can_do text,
    how_to_support text,
    current_status text,
    notes text,
    review_frequency character varying(50) DEFAULT 'monthly'::character varying,
    last_review_date date,
    next_review_date date,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    outcome_achieved boolean,
    reviewed_by uuid
);


--
-- Name: clock_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clock_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    staff_id uuid NOT NULL,
    su_id uuid,
    home_id uuid,
    event_type character varying(20) NOT NULL,
    latitude numeric(10,8),
    longitude numeric(11,8),
    distance_metres integer,
    clocked_at timestamp with time zone DEFAULT now()
);


--
-- Name: daily_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    su_id uuid NOT NULL,
    home_id uuid,
    staff_id uuid,
    record_type character varying(100) NOT NULL,
    shift character varying(20),
    notes text,
    description text,
    amount_ml integer,
    fluid_type character varying(100),
    meal_type character varying(50),
    amount_eaten character varying(50),
    food_description text,
    systolic integer,
    diastolic integer,
    pulse integer,
    temp_celsius numeric(4,1),
    spo2_percent integer,
    supplemental_o2 boolean DEFAULT false,
    weight_kg numeric(6,2),
    bmi numeric(5,2),
    bristol_type integer,
    record_date date DEFAULT CURRENT_DATE,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    flagged boolean DEFAULT false NOT NULL,
    flag_reason text,
    recorded_at timestamp with time zone DEFAULT now()
);


--
-- Name: handover_signatures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.handover_signatures (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    home_id uuid NOT NULL,
    shift_date date NOT NULL,
    shift_type character varying(10) NOT NULL,
    role character varying(20) NOT NULL,
    staff_id uuid NOT NULL,
    signature_data text NOT NULL,
    signed_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT handover_signatures_role_check CHECK (((role)::text = ANY ((ARRAY['outgoing'::character varying, 'incoming'::character varying])::text[])))
);


--
-- Name: home_postcodes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.home_postcodes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    home_id uuid NOT NULL,
    postcode character varying(20) NOT NULL,
    label character varying(100),
    latitude numeric(10,8),
    longitude numeric(11,8),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    radius integer DEFAULT 200 NOT NULL
);


--
-- Name: homes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.homes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organisation_id uuid,
    name character varying(255) NOT NULL,
    address1 text,
    address2 text,
    city character varying(100),
    postcode character varying(20),
    phone character varying(50),
    email character varying(255),
    cqc_location_id character varying(100),
    latitude numeric(10,8),
    longitude numeric(11,8),
    geofence_radius integer DEFAULT 200,
    qr_token character varying(255),
    manager_name character varying(255),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: mar_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mar_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    su_id uuid NOT NULL,
    home_id uuid,
    medication_id uuid,
    medication_name character varying(255),
    dose character varying(100),
    route character varying(100),
    frequency character varying(100),
    scheduled_time time without time zone,
    record_date date DEFAULT CURRENT_DATE,
    given boolean,
    given_at timestamp with time zone,
    given_by uuid,
    witnessed_by uuid,
    refused boolean DEFAULT false,
    refused_reason text,
    omitted boolean DEFAULT false,
    omit_reason text,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: medication_stock; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medication_stock (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    su_id uuid,
    medication_id uuid,
    current_count numeric(10,2) DEFAULT 0,
    last_counted_by uuid,
    last_counted_at timestamp with time zone DEFAULT now(),
    notes text,
    home_id uuid,
    medication_name character varying(255),
    form character varying(100),
    strength character varying(100),
    quantity_remaining numeric(10,2) DEFAULT 0 NOT NULL,
    unit character varying(50) DEFAULT 'tablets'::character varying NOT NULL,
    reorder_threshold numeric(10,2) DEFAULT 7 NOT NULL,
    batch_number character varying(100),
    supplier character varying(255),
    last_updated_by uuid,
    expiry_date date,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: medication_stock_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medication_stock_log (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    stock_id uuid NOT NULL,
    adjusted_by uuid,
    adjustment_type character varying(50),
    quantity_change numeric(10,2),
    quantity_before numeric(10,2),
    quantity_after numeric(10,2),
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: meeting_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meeting_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    created_by uuid,
    notes text,
    action_points text,
    concerns text,
    attendees text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: meeting_signoffs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meeting_signoffs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    signed_at timestamp with time zone DEFAULT now()
);


--
-- Name: must_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.must_scores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    su_id uuid NOT NULL,
    home_id uuid,
    assessed_by uuid,
    weight_kg numeric(6,2),
    height_cm numeric(6,2),
    bmi numeric(5,2),
    must_score integer,
    action_plan text,
    next_assessment_date date,
    created_at timestamp with time zone DEFAULT now(),
    bmi_score smallint,
    weight_loss_score smallint,
    acute_disease_score smallint,
    total_score smallint,
    risk_level character varying(20)
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recipient_id uuid NOT NULL,
    home_id uuid,
    title character varying(255) NOT NULL,
    body text,
    type character varying(50) DEFAULT 'info'::character varying,
    link character varying(500),
    is_read boolean DEFAULT false,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: organisations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organisations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    registration_code character varying(20),
    created_at timestamp with time zone DEFAULT now(),
    reg_number character varying(100),
    cqc_provider character varying(100),
    address1 character varying(255),
    address2 character varying(255),
    address3 character varying(255),
    postcode character varying(10),
    phone character varying(20),
    email character varying(255),
    logo_url character varying(500)
);


--
-- Name: policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organisation_id uuid,
    home_id uuid,
    title character varying(255) NOT NULL,
    version character varying(20) DEFAULT '1.0'::character varying,
    document_url text,
    effective_date date,
    review_date date,
    uploaded_by uuid,
    requires_sign boolean DEFAULT true,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: policy_sign_offs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.policy_sign_offs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    policy_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    signed_at timestamp with time zone DEFAULT now()
);


--
-- Name: ppe_inventory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ppe_inventory (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    home_id uuid NOT NULL,
    item_name character varying(255) NOT NULL,
    item_variant character varying(100),
    current_stock integer DEFAULT 0,
    min_stock integer DEFAULT 10,
    unit character varying(50) DEFAULT 'units'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: ppe_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ppe_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    item_id uuid NOT NULL,
    home_id uuid,
    transaction_type character varying(20) NOT NULL,
    quantity integer NOT NULL,
    staff_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: professional_involvement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.professional_involvement (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    su_id uuid NOT NULL,
    role_title character varying(100),
    full_name character varying(255),
    organisation character varying(255),
    phone character varying(50),
    email character varying(255),
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: quality_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quality_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    home_id uuid,
    su_id uuid,
    related_staff_id uuid,
    created_by uuid,
    record_type character varying(100) NOT NULL,
    title character varying(255),
    summary text,
    description text,
    detail text,
    outcome text,
    action_taken text,
    follow_up_date date,
    status character varying(50) DEFAULT 'open'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    reported_by character varying(255),
    reported_at timestamp with time zone DEFAULT now() NOT NULL,
    severity character varying(20) DEFAULT 'low'::character varying NOT NULL
);


--
-- Name: records_behaviour; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.records_behaviour (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    daily_record_id uuid NOT NULL,
    mood character varying(50),
    behaviour_noted text,
    triggers_noted text,
    action_taken text,
    escalated boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: records_bowel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.records_bowel (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    daily_record_id uuid NOT NULL,
    bristol_type integer,
    frequency_today integer,
    consistency_notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: records_communication; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.records_communication (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    daily_record_id uuid NOT NULL,
    mode_used character varying(50),
    topic text,
    response_level character varying(50),
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: records_food_drink; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.records_food_drink (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    daily_record_id uuid NOT NULL,
    entry_type character varying(20) DEFAULT 'food'::character varying,
    meal_type character varying(50),
    description text,
    amount_eaten character varying(50),
    volume_ml integer,
    fluid_type character varying(100),
    created_at timestamp with time zone DEFAULT now(),
    assisted boolean DEFAULT false NOT NULL,
    refused boolean DEFAULT false NOT NULL,
    notes text
);


--
-- Name: records_handover; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.records_handover (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    daily_record_id uuid NOT NULL,
    shift_summary text,
    priority_flags text,
    outstanding_actions text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: records_incidents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.records_incidents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    daily_record_id uuid NOT NULL,
    incident_type character varying(100),
    location character varying(255),
    incident_time timestamp with time zone,
    description text,
    injuries boolean DEFAULT false,
    injury_details text,
    medical_needed boolean DEFAULT false,
    medical_details text,
    witnesses text,
    immediate_action text,
    reported_to text,
    safeguarding_ref boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    injured_body_parts text,
    medical_attention_req boolean DEFAULT false NOT NULL,
    manager_reviewed boolean DEFAULT false NOT NULL,
    manager_reviewed_at timestamp with time zone
);


--
-- Name: records_one_to_one; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.records_one_to_one (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    daily_record_id uuid NOT NULL,
    topics text,
    duration_mins integer,
    engagement character varying(50),
    follow_up boolean DEFAULT false NOT NULL,
    follow_up_notes text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: records_oral_care; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.records_oral_care (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    daily_record_id uuid NOT NULL,
    care_types text[],
    mouth_condition character varying(50),
    has_dentures boolean DEFAULT false NOT NULL,
    denture_type character varying(50),
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: records_personal_care; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.records_personal_care (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    daily_record_id uuid NOT NULL,
    care_type character varying(100),
    assistance_level character varying(50),
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: records_prn_medication; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.records_prn_medication (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    daily_record_id uuid NOT NULL,
    medication_name character varying(255) NOT NULL,
    dose character varying(100),
    reason text,
    administered_by uuid,
    witnessed_by uuid,
    outcome_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: records_repositioning; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.records_repositioning (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    daily_record_id uuid NOT NULL,
    "position" character varying(50),
    skin_checked boolean DEFAULT false NOT NULL,
    skin_concerns text,
    next_due_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: records_social_activity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.records_social_activity (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    daily_record_id uuid NOT NULL,
    activity_name character varying(100),
    engagement character varying(50),
    enjoyed boolean,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: records_visit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.records_visit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    daily_record_id uuid NOT NULL,
    visit_type character varying(50),
    visitor_name character varying(255),
    visitor_relation character varying(100),
    duration_minutes integer,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: records_visits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.records_visits (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    daily_record_id uuid NOT NULL,
    visit_type character varying(50),
    visitor_name character varying(100),
    relationship character varying(50),
    location character varying(100),
    time_arrived time without time zone,
    time_left time without time zone,
    su_response text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: records_vitals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.records_vitals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    daily_record_id uuid NOT NULL,
    vital_type character varying(50),
    systolic integer,
    diastolic integer,
    pulse integer,
    temp_celsius numeric(4,1),
    spo2_percent integer,
    supplemental_o2 boolean DEFAULT false,
    weight_kg numeric(6,2),
    bmi numeric(5,2),
    created_at timestamp with time zone DEFAULT now(),
    bp_position character varying(20),
    outside_range boolean DEFAULT false NOT NULL,
    temp_method character varying(30),
    o2_litres_min numeric(4,1),
    prev_weight_kg numeric(6,2),
    weight_change_pct numeric(5,2),
    height_cm numeric(5,1)
);


--
-- Name: records_welfare_check; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.records_welfare_check (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    daily_record_id uuid NOT NULL,
    check_type character varying(50),
    su_status character varying(50),
    environment_ok boolean DEFAULT true NOT NULL,
    environment_notes text,
    action_taken text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: risk_assessment_updates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.risk_assessment_updates (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    risk_id uuid NOT NULL,
    update_notes text NOT NULL,
    new_risk_level character varying(20),
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: risk_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.risk_assessments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    su_id uuid NOT NULL,
    home_id uuid,
    created_by uuid,
    risk_type character varying(100),
    description text,
    likelihood integer,
    impact integer,
    risk_score integer,
    controls text,
    review_date date,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    assessment_name character varying(255),
    risk_level character varying(20) DEFAULT 'low'::character varying NOT NULL,
    current_risk_level character varying(20) DEFAULT 'low'::character varying NOT NULL,
    management_plan text,
    review_frequency character varying(20) DEFAULT 'monthly'::character varying NOT NULL,
    next_review_date date,
    last_review_date date,
    who_is_at_risk text,
    is_historical boolean DEFAULT false NOT NULL,
    what_could_happen text,
    triggers text,
    protective_factors text,
    reviewed_by uuid,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: safeguarding_concerns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.safeguarding_concerns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    su_id uuid NOT NULL,
    home_id uuid,
    created_by uuid,
    su_location character varying(255),
    concern_type character varying(100),
    description text,
    immediate_action text,
    agencies_contacted text,
    incident_date date,
    status character varying(50) DEFAULT 'open'::character varying,
    manager_ack boolean DEFAULT false,
    manager_ack_by uuid,
    manager_ack_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    incident_location character varying(255),
    incident_time time without time zone,
    witnesses text,
    medical_required boolean DEFAULT false,
    medical_details text,
    injury_details text,
    immediate_actions text,
    decisions_breached text,
    lessons_learnt text,
    outside_agency boolean DEFAULT false,
    agency_details text,
    management_recs text,
    prevention_actions text,
    reported_to character varying(255),
    reported_at timestamp with time zone,
    outcome text
);


--
-- Name: sensitive_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sensitive_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    su_id uuid NOT NULL,
    home_id uuid,
    created_by uuid,
    note text NOT NULL,
    category character varying(100),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: service_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    home_id uuid,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    preferred_name character varying(100),
    date_of_birth date,
    gender character varying(20),
    address1 text,
    postcode character varying(20),
    photo_url text,
    status character varying(50) DEFAULT 'live'::character varying,
    admission_date date,
    local_authority character varying(255),
    nhs_number character varying(20),
    emergency_rating character varying(20) DEFAULT 'low'::character varying,
    dnar boolean DEFAULT false,
    dnar_form_url text,
    nil_by_mouth boolean DEFAULT false,
    requires_oxygen boolean DEFAULT false,
    has_catheter boolean DEFAULT false,
    need_to_know text,
    min_fluid_ml integer DEFAULT 1500,
    latitude numeric(10,8),
    longitude numeric(11,8),
    geofence_radius integer DEFAULT 200,
    qr_token character varying(255),
    height_cm numeric(5,1),
    weight_kg numeric(6,2),
    medical_history text,
    allergies text,
    hobbies text,
    daily_routine text,
    created_at timestamp with time zone DEFAULT now(),
    med_allergies text,
    food_allergies text,
    special_diet text,
    fluid_consistency character varying(100),
    diet_instructions text,
    my_instructions text,
    bmi numeric(4,1),
    has_peg boolean DEFAULT false NOT NULL,
    life_history text,
    has_lpa boolean DEFAULT false NOT NULL,
    lpa_type character varying(100),
    lpa_attorney character varying(255),
    has_cop_order boolean DEFAULT false NOT NULL,
    cop_details text,
    dnar_location text,
    service_name character varying(255),
    acp_url character varying(500),
    acp_date date,
    funeral_noted boolean DEFAULT false NOT NULL,
    funeral_details text,
    key_safe_code character varying(100),
    religion character varying(100),
    ethnicity character varying(100),
    marital_status character varying(50),
    comms_prefs text,
    pronouns character varying(50),
    ni_number character varying(20),
    capacity_doc_url character varying(500),
    best_interest_url character varying(500)
);


--
-- Name: staff; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organisation_id uuid,
    home_id uuid,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'care_staff'::character varying,
    status character varying(20) DEFAULT 'active'::character varying,
    is_active boolean DEFAULT true,
    phone character varying(50),
    address1 text,
    address2 text,
    address3 text,
    postcode character varying(20),
    date_of_birth date,
    gender character varying(20),
    nationality character varying(100),
    marital_status character varying(50),
    ni_number character varying(20),
    emergency_name character varying(255),
    emergency_phone character varying(50),
    emergency_notes text,
    photo_url text,
    start_date date,
    leave_date date,
    leave_hours_total numeric(6,2) DEFAULT 224,
    leave_hours_remaining numeric(6,2),
    registration_code character varying(20),
    created_at timestamp with time zone DEFAULT now(),
    refresh_token text,
    last_login timestamp with time zone,
    reset_token character varying(255),
    reset_token_expiry timestamp with time zone,
    preferred_name character varying(100)
);


--
-- Name: staff_absences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_absences (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    staff_id uuid NOT NULL,
    home_id uuid,
    absence_type character varying(100) NOT NULL,
    absence_start date NOT NULL,
    absence_end date,
    notified_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: staff_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_assessments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    staff_id uuid NOT NULL,
    conducted_by uuid,
    home_id uuid,
    assessment_type character varying(100) NOT NULL,
    custom_name character varying(255),
    assessment_date date NOT NULL,
    outcome text,
    recommendations text,
    next_due_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: staff_cautions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_cautions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    staff_id uuid NOT NULL,
    home_id uuid,
    created_by uuid,
    caution_type character varying(50) DEFAULT 'verbal'::character varying,
    overview text,
    strengths text,
    weaknesses text,
    action_points text,
    review_date date,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: staff_clock_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_clock_events (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    staff_id uuid NOT NULL,
    home_id uuid NOT NULL,
    su_id uuid,
    event_type character varying(10) NOT NULL,
    event_time timestamp with time zone DEFAULT now() NOT NULL,
    latitude numeric(10,8),
    longitude numeric(11,8),
    distance_metres integer,
    geofence_passed boolean DEFAULT false NOT NULL,
    qr_scan_used boolean DEFAULT false NOT NULL,
    shift_scheduled timestamp with time zone,
    punctuality character varying(10),
    minutes_variance integer,
    device_info jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT staff_clock_events_event_type_check CHECK (((event_type)::text = ANY ((ARRAY['clock_in'::character varying, 'clock_out'::character varying])::text[]))),
    CONSTRAINT staff_clock_events_punctuality_check CHECK (((punctuality)::text = ANY ((ARRAY['early'::character varying, 'on_time'::character varying, 'late'::character varying])::text[])))
);


--
-- Name: staff_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    staff_id uuid NOT NULL,
    home_id uuid,
    uploaded_by uuid,
    document_type character varying(100),
    title character varying(255),
    file_name character varying(255),
    file_url text,
    mime_type character varying(100),
    file_size integer,
    created_at timestamp with time zone DEFAULT now(),
    notes text,
    expiry_date date
);


--
-- Name: staff_home_access; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_home_access (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    staff_id uuid NOT NULL,
    home_id uuid NOT NULL
);


--
-- Name: staff_leave; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_leave (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    staff_id uuid NOT NULL,
    home_id uuid,
    leave_type character varying(50) DEFAULT 'annual'::character varying,
    start_date date,
    end_date date,
    hours_requested numeric(6,2),
    status character varying(20) DEFAULT 'pending'::character varying,
    reason text,
    notes text,
    approved_by uuid,
    approved_at timestamp with time zone,
    decline_reason text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: staff_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sender_id uuid NOT NULL,
    recipient_id uuid,
    home_id uuid,
    subject character varying(255),
    message text NOT NULL,
    is_read boolean DEFAULT false,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: staff_onboarding; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_onboarding (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    staff_id uuid NOT NULL,
    dbs_cleared boolean DEFAULT false,
    care_cert_completed boolean DEFAULT false,
    induction_completed boolean DEFAULT false,
    med_training_completed boolean DEFAULT false,
    right_to_work_verified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    application_received boolean DEFAULT false,
    application_date date,
    interview_completed boolean DEFAULT false,
    interview_date date,
    interview_notes text,
    dbs_submitted_date date,
    dbs_cleared_date date,
    dbs_certificate_url text,
    references_received boolean DEFAULT false,
    references_date date,
    care_cert_date date,
    induction_date date,
    med_training_date date,
    system_training_completed boolean DEFAULT false,
    system_training_date date,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: staff_shifts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_shifts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    home_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    su_id uuid,
    shift_date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    shift_type character varying(50) DEFAULT 'regular'::character varying,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: staff_supervisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_supervisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    staff_id uuid NOT NULL,
    home_id uuid,
    conducted_by uuid,
    supervision_type character varying(50) DEFAULT 'regular'::character varying,
    supervision_date date,
    summary text,
    action_points text,
    next_supervision_date date,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: staff_training; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_training (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    staff_id uuid NOT NULL,
    home_id uuid,
    course_name character varying(255) NOT NULL,
    completed_date date,
    expiry_date date,
    provider character varying(255),
    certificate_url text,
    duration_hours numeric(6,2),
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: staff_training_modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_training_modules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    staff_id uuid NOT NULL,
    module_id character varying(100) NOT NULL,
    module_name character varying(255),
    completed_at timestamp with time zone DEFAULT now()
);


--
-- Name: su_about_me; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.su_about_me (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    su_id uuid NOT NULL,
    life_history text,
    important_people text,
    daily_routine text,
    hobbies_interests text,
    communication text,
    likes_dislikes text,
    beliefs_values text,
    goals_wishes text,
    support_needs text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: su_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.su_contacts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    su_id uuid NOT NULL,
    full_name character varying(255) NOT NULL,
    relationship character varying(100),
    contact_tag character varying(100),
    phone_primary character varying(20),
    phone_secondary character varying(20),
    email character varying(255),
    address1 character varying(255),
    address2 character varying(255),
    postcode character varying(10),
    is_primary boolean DEFAULT false NOT NULL,
    notes text,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: su_daily_fluid_totals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.su_daily_fluid_totals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    su_id uuid,
    record_date date,
    total_ml integer DEFAULT 0,
    below_threshold boolean DEFAULT false
);


--
-- Name: su_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.su_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    su_id uuid NOT NULL,
    home_id uuid,
    uploaded_by uuid,
    document_type character varying(100),
    title character varying(255),
    file_name character varying(255),
    file_url text,
    mime_type character varying(100),
    file_size integer,
    created_at timestamp with time zone DEFAULT now(),
    notes text,
    expiry_date date
);


--
-- Name: su_medications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.su_medications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    su_id uuid NOT NULL,
    home_id uuid,
    medication_name character varying(255) NOT NULL,
    dose character varying(100),
    frequency character varying(100),
    route character varying(100),
    prescribed_by character varying(255),
    start_date date,
    end_date date,
    instructions text,
    is_prn boolean DEFAULT false,
    added_by uuid,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    notes text
);


--
-- Name: su_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.su_messages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    su_id uuid NOT NULL,
    home_id uuid NOT NULL,
    sender_id uuid,
    message text NOT NULL,
    message_type character varying(30) DEFAULT 'general'::character varying NOT NULL,
    attachment_url text,
    attachment_caption text,
    is_read boolean DEFAULT false NOT NULL,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: su_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.su_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    su_id uuid NOT NULL,
    home_id uuid,
    created_by uuid,
    review_type character varying(100),
    review_date date,
    summary text,
    resident_feedback text,
    family_feedback text,
    outcomes text,
    actions text,
    next_review_date date,
    attendees text,
    created_at timestamp with time zone DEFAULT now(),
    conducted_by uuid,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: task_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    home_id uuid NOT NULL,
    su_id uuid,
    title character varying(255) NOT NULL,
    category character varying(100),
    description text,
    frequency character varying(50) DEFAULT 'daily'::character varying,
    due_time time without time zone,
    priority character varying(20) DEFAULT 'normal'::character varying,
    assigned_role character varying(50),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    task_name character varying(255)
);


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    home_id uuid NOT NULL,
    su_id uuid,
    assigned_to uuid,
    created_by uuid,
    title character varying(255) NOT NULL,
    category character varying(100),
    description text,
    task_date date,
    due_time time without time zone,
    priority character varying(20) DEFAULT 'normal'::character varying,
    assigned_role character varying(50),
    status character varying(20) DEFAULT 'pending'::character varying,
    completed_at timestamp with time zone,
    completed_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    completion_notes text
);


--
-- Data for Name: assessments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.assessments (id, home_id, template_key, category, subject_id, subject_name, conducted_by, auditor_name, answers, total_score, max_score, score_pct, risk_level, actions_identified, actions_outcome, actions_completed_date, next_review_date, notes, assessment_date, status, created_at, updated_at) FROM stdin;
69ffa77a-5f63-413f-a029-aece24e9fd73	5c027814-a0f9-44f3-bad4-138e4783fd51	care_plan_audit	service_user	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	Test Resident	e951bf8c-fc86-4771-80ad-b903f754ad6f	\N	{}	0	21	0.00	inadequate	\N	\N	\N	\N	\N	2026-05-21	completed	2026-05-21 12:12:43.908168+01	2026-05-21 12:12:43.908168+01
\.


--
-- Data for Name: audit_reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_reports (id, home_id, generated_by, audit_type, custom_name, status, period_from, period_to, findings, recommendations, raw_report, total_checks, checks_passed, checks_failed, generated_at, created_at) FROM stdin;
123a2580-6923-486b-83a7-0a97f58c4228	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	care_plan	\N	completed	2026-04-18	2026-05-18	## Care Plan Audit Report\n**Period:** 2026-04-18 to 2026-05-18\n\n### Care Plan Review Compliance\n- Total active care plans: **63**\n- Overdue for review: **17**\n\n**Overdue plans:**\n- Dorothy Williams: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Harold Thompson: physical (due Fri May 15 2026 00:00:00 GMT+0100 (West Africa Time))\n- Margaret Clarke: physical (due Mon May 11 2026 00:00:00 GMT+0100 (West Africa Time))\n- Arthur Davies: medical (due Fri May 08 2026 00:00:00 GMT+0100 (West Africa Time))\n- George Bennett: medical (due Sat May 16 2026 00:00:00 GMT+0100 (West Africa Time))\n- Arthur Davies: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Dorothy Williams: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Edna Morrison: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- George Bennett: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Harold Thompson: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Harold Thompson: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Margaret Clarke: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Arthur Davies: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Dorothy Williams: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Edna Morrison: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- George Bennett: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Margaret Clarke: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n\n⚠️ Action required: review overdue care plans immediately.\n	- Review and update 17 overdue care plan(s) immediately\n	## Care Plan Audit Report\n**Period:** 2026-04-18 to 2026-05-18\n\n### Care Plan Review Compliance\n- Total active care plans: **63**\n- Overdue for review: **17**\n\n**Overdue plans:**\n- Dorothy Williams: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Harold Thompson: physical (due Fri May 15 2026 00:00:00 GMT+0100 (West Africa Time))\n- Margaret Clarke: physical (due Mon May 11 2026 00:00:00 GMT+0100 (West Africa Time))\n- Arthur Davies: medical (due Fri May 08 2026 00:00:00 GMT+0100 (West Africa Time))\n- George Bennett: medical (due Sat May 16 2026 00:00:00 GMT+0100 (West Africa Time))\n- Arthur Davies: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Dorothy Williams: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Edna Morrison: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- George Bennett: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Harold Thompson: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Harold Thompson: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Margaret Clarke: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Arthur Davies: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Dorothy Williams: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Edna Morrison: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- George Bennett: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Margaret Clarke: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n\n⚠️ Action required: review overdue care plans immediately.\n	68	51	17	2026-05-18 16:00:19.347644+01	2026-05-18 16:00:19.247535+01
e826c679-d4c8-4bdd-8ae4-e765de285864	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	medication	\N	completed	2026-04-18	2026-05-18	## Medication Audit Report\n**Period:** 2026-04-18 to 2026-05-18\n\n### Medication Administration Records\n- Total MAR entries: **16**\n- Given: **8**\n- Refused: **0**\n- Pending/unsigned: **0**\n\n**Compliance rate: 50%**\n\n⚠️ MAR compliance is below 95% — review unsigned entries.\n	- Review and update 17 overdue care plan(s) immediately\n	## Medication Audit Report\n**Period:** 2026-04-18 to 2026-05-18\n\n### Medication Administration Records\n- Total MAR entries: **16**\n- Given: **8**\n- Refused: **0**\n- Pending/unsigned: **0**\n\n**Compliance rate: 50%**\n\n⚠️ MAR compliance is below 95% — review unsigned entries.\n	68	51	17	2026-05-18 16:00:40.612202+01	2026-05-18 16:00:40.491618+01
1ac254d5-4156-446f-8c55-6cfbf1a66111	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	safeguarding	\N	completed	2026-04-18	2026-05-18	## Safeguarding Audit Report\n**Period:** 2026-04-18 to 2026-05-18\n\n### Safeguarding Audit\n- Total concerns raised: **0**\n- Not yet acknowledged: **0**\n	- Review and update 17 overdue care plan(s) immediately\n	## Safeguarding Audit Report\n**Period:** 2026-04-18 to 2026-05-18\n\n### Safeguarding Audit\n- Total concerns raised: **0**\n- Not yet acknowledged: **0**\n	68	51	17	2026-05-18 16:00:58.71699+01	2026-05-18 16:00:58.590704+01
9946c1ec-9337-4691-bdde-45ab45339574	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	care_plan	\N	completed	2026-04-21	2026-05-21	## Care Plan Audit Report\n**Period:** 2026-04-21 to 2026-05-21\n\n### Care Plan Review Compliance\n- Total active care plans: **66**\n- Overdue for review: **17**\n\n**Overdue plans:**\n- Dorothy Williams: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Harold Thompson: physical (due Fri May 15 2026 00:00:00 GMT+0100 (West Africa Time))\n- Margaret Clarke: physical (due Mon May 11 2026 00:00:00 GMT+0100 (West Africa Time))\n- Arthur Davies: medical (due Fri May 08 2026 00:00:00 GMT+0100 (West Africa Time))\n- George Bennett: medical (due Sat May 16 2026 00:00:00 GMT+0100 (West Africa Time))\n- Arthur Davies: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Dorothy Williams: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Edna Morrison: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- George Bennett: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Harold Thompson: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Harold Thompson: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Margaret Clarke: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Arthur Davies: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Dorothy Williams: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Edna Morrison: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- George Bennett: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Margaret Clarke: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n\n⚠️ Action required: review overdue care plans immediately.\n	- Review and update 17 overdue care plan(s) immediately\n- Review and sign off 2 unreviewed incident(s)\n	## Care Plan Audit Report\n**Period:** 2026-04-21 to 2026-05-21\n\n### Care Plan Review Compliance\n- Total active care plans: **66**\n- Overdue for review: **17**\n\n**Overdue plans:**\n- Dorothy Williams: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Harold Thompson: physical (due Fri May 15 2026 00:00:00 GMT+0100 (West Africa Time))\n- Margaret Clarke: physical (due Mon May 11 2026 00:00:00 GMT+0100 (West Africa Time))\n- Arthur Davies: medical (due Fri May 08 2026 00:00:00 GMT+0100 (West Africa Time))\n- George Bennett: medical (due Sat May 16 2026 00:00:00 GMT+0100 (West Africa Time))\n- Arthur Davies: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Dorothy Williams: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Edna Morrison: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- George Bennett: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Harold Thompson: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Harold Thompson: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Margaret Clarke: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Arthur Davies: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Dorothy Williams: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Edna Morrison: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- George Bennett: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Margaret Clarke: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n\n⚠️ Action required: review overdue care plans immediately.\n	85	66	19	2026-05-21 12:53:02.916215+01	2026-05-21 12:53:02.810301+01
32f7cb50-d663-4a60-85ef-4864e27257c1	5c027814-a0f9-44f3-bad4-138e4783fd51	a1000000-0000-0000-0000-000000000001	care_plan	\N	completed	2026-04-22	2026-05-22	## Care Plan Audit Report\n**Period:** 2026-04-22 to 2026-05-22\n\n### Care Plan Review Compliance\n- Total active care plans: **67**\n- Overdue for review: **17**\n\n**Overdue plans:**\n- Dorothy Williams: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Harold Thompson: physical (due Fri May 15 2026 00:00:00 GMT+0100 (West Africa Time))\n- Margaret Clarke: physical (due Mon May 11 2026 00:00:00 GMT+0100 (West Africa Time))\n- Arthur Davies: medical (due Fri May 08 2026 00:00:00 GMT+0100 (West Africa Time))\n- George Bennett: medical (due Sat May 16 2026 00:00:00 GMT+0100 (West Africa Time))\n- Arthur Davies: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Dorothy Williams: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Edna Morrison: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- George Bennett: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Harold Thompson: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Harold Thompson: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Margaret Clarke: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Arthur Davies: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Dorothy Williams: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Edna Morrison: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- George Bennett: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Margaret Clarke: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n\n⚠️ Action required: review overdue care plans immediately.\n	- Review and update 17 overdue care plan(s) immediately\n- Review and sign off 2 unreviewed incident(s)\n	## Care Plan Audit Report\n**Period:** 2026-04-22 to 2026-05-22\n\n### Care Plan Review Compliance\n- Total active care plans: **67**\n- Overdue for review: **17**\n\n**Overdue plans:**\n- Dorothy Williams: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Harold Thompson: physical (due Fri May 15 2026 00:00:00 GMT+0100 (West Africa Time))\n- Margaret Clarke: physical (due Mon May 11 2026 00:00:00 GMT+0100 (West Africa Time))\n- Arthur Davies: medical (due Fri May 08 2026 00:00:00 GMT+0100 (West Africa Time))\n- George Bennett: medical (due Sat May 16 2026 00:00:00 GMT+0100 (West Africa Time))\n- Arthur Davies: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Dorothy Williams: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Edna Morrison: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- George Bennett: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Harold Thompson: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Harold Thompson: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Margaret Clarke: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Arthur Davies: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Dorothy Williams: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Edna Morrison: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- George Bennett: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Margaret Clarke: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n\n⚠️ Action required: review overdue care plans immediately.\n	86	67	19	2026-05-22 07:14:37.765449+01	2026-05-22 07:14:37.485784+01
57affecd-bb10-46ea-8e81-2a96829064b1	5c027814-a0f9-44f3-bad4-138e4783fd51	a1000000-0000-0000-0000-000000000001	care_plan	\N	completed	2026-04-22	2026-05-22	## Care Plan Audit Report\n**Period:** 2026-04-22 to 2026-05-22\n\n### Care Plan Review Compliance\n- Total active care plans: **67**\n- Overdue for review: **17**\n\n**Overdue plans:**\n- Dorothy Williams: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Harold Thompson: physical (due Fri May 15 2026 00:00:00 GMT+0100 (West Africa Time))\n- Margaret Clarke: physical (due Mon May 11 2026 00:00:00 GMT+0100 (West Africa Time))\n- Arthur Davies: medical (due Fri May 08 2026 00:00:00 GMT+0100 (West Africa Time))\n- George Bennett: medical (due Sat May 16 2026 00:00:00 GMT+0100 (West Africa Time))\n- Arthur Davies: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Dorothy Williams: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Edna Morrison: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- George Bennett: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Harold Thompson: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Harold Thompson: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Margaret Clarke: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Arthur Davies: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Dorothy Williams: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Edna Morrison: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- George Bennett: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Margaret Clarke: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n\n⚠️ Action required: review overdue care plans immediately.\n	- Review and update 17 overdue care plan(s) immediately\n- Review and sign off 2 unreviewed incident(s)\n	## Care Plan Audit Report\n**Period:** 2026-04-22 to 2026-05-22\n\n### Care Plan Review Compliance\n- Total active care plans: **67**\n- Overdue for review: **17**\n\n**Overdue plans:**\n- Dorothy Williams: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Harold Thompson: physical (due Fri May 15 2026 00:00:00 GMT+0100 (West Africa Time))\n- Margaret Clarke: physical (due Mon May 11 2026 00:00:00 GMT+0100 (West Africa Time))\n- Arthur Davies: medical (due Fri May 08 2026 00:00:00 GMT+0100 (West Africa Time))\n- George Bennett: medical (due Sat May 16 2026 00:00:00 GMT+0100 (West Africa Time))\n- Arthur Davies: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Dorothy Williams: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Edna Morrison: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- George Bennett: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Harold Thompson: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Harold Thompson: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Margaret Clarke: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Arthur Davies: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Dorothy Williams: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Edna Morrison: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- George Bennett: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n- Margaret Clarke: medical (due Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time))\n\n⚠️ Action required: review overdue care plans immediately.\n	86	67	19	2026-05-22 07:36:07.160606+01	2026-05-22 07:36:07.128767+01
53d5f9e8-2906-4d9f-b720-a0b063c08474	5c027814-a0f9-44f3-bad4-138e4783fd51	a1000000-0000-0000-0000-000000000001	care_plan	\N	completed	2026-04-22	2026-05-22	## Care Plan Audit Report\n\n### Executive Summary\nThe care home's overall compliance status is concerning, with 17 overdue care plans and 11 residents having no records for the day. Key strengths include a good volume of daily care records, with 214 total records logged, and no instances of fluid intake below threshold. However, key concerns include the high number of overdue care plans and missing records, which may impact the home's CQC rating. The home's compliance with CQC regulations, such as Regulation 9 (Person-centred care) and Regulation 12 (Safe care and treatment), is compromised due to these concerns.\n\n### Detailed Findings\n\n#### Care Planning & Reviews\n⚠️ The care home has 17 overdue care plans, including those for Dorothy Williams (due 13 May 2026), Harold Thompson (due 15 May 2026), and Margaret Clarke (due 11 May 2026). ✅ However, the home has 67 active care plans, indicating some level of planning and review. ⚠️ The duplication of care plans for some residents, such as Arthur Davies and Dorothy Williams, is a concern and may indicate a lack of effective care planning processes.\n\n#### Daily Care & Documentation\nThe care home has a good volume of daily care records, with 214 total records logged, including 42 vitals records, 41 personal care records, and 41 general records. However, ⚠️ 11 residents have no records for the day, including Margaret Thompson, George Williams, and Edith Davies. This lack of documentation may compromise the continuity of care and is a concern.\n\n#### Medication Management\nThe care home's MAR compliance rate is 53%, with 10 medications given and 1 refused. ⚠️ This rate is lower than expected and may indicate a need for improved medication management processes. However, ✅ there are no critical failures in medication management.\n\n#### Nutrition & Hydration\n✅ The care home has no instances of fluid intake below threshold, indicating good nutrition and hydration practices. However, ⚠️ the lack of records for some residents may compromise the ability to monitor and manage their nutrition and hydration needs.\n\n#### Staff Training & Competency\n✅ The care home has no staff training expiring within the next 60 days, indicating a good level of staff competency. However, ⚠️ the home should continue to monitor staff training and competency to ensure compliance with CQC regulations, such as Regulation 18 (Staffing).\n\n#### Safeguarding\n✅ The care home has no safeguarding concerns, indicating a good level of safeguarding practices. However, ⚠️ the home should continue to monitor and review its safeguarding policies and procedures to ensure compliance with CQC regulations, such as Regulation 13 (Safeguarding service users from abuse and improper treatment).\n\n### Summary of Key Risks\n* ⚠️ Overdue care plans and missing records may compromise the continuity of care and resident safety.\n* ⚠️ Lack of documentation for some residents may compromise the ability to monitor and manage their needs.\n* ⚠️ Lower than expected MAR compliance rate may indicate a need for improved medication management processes.\n* ⚠️ Duplication of care plans for some residents may indicate a lack of effective care planning processes.\n* ⚠️ Lack of records for some residents may compromise the ability to monitor and manage their nutrition and hydration needs.\n\n### Good Practice Identified\n* ✅ The care home has a good volume of daily care records, indicating a good level of care and support.\n* ✅ The home has no instances of fluid intake below threshold, indicating good nutrition and hydration practices.\n* ✅ The care home has no staff training expiring within the next 60 days, indicating a good level of staff competency.\n* ✅ The home has no safeguarding concerns, indicating a good level of safeguarding practices.	- Review and update all overdue care plans, including those for Dorothy Williams, Harold Thompson, and Margaret Clarke, to ensure compliance with Regulation 9 (Person-centred care).\n- Implement a system to ensure all residents have daily records, including Margaret Thompson, George Williams, and Edith Davies, to ensure continuity of care and compliance with Regulation 12 (Safe care and treatment).\n- Review and improve medication management processes to increase the MAR compliance rate, including staff training and competency, to ensure compliance with Regulation 12 (Safe care and treatment).\n- Implement a system to monitor and manage resident nutrition and hydration needs, including fluid intake records, to ensure compliance with Regulation 14 (Meeting nutritional and hydration needs).\n- Review and update care planning processes to prevent duplication of care plans and ensure effective care planning, to ensure compliance with Regulation 9 (Person-centred care).\n- Provide staff training on the importance of accurate and complete record-keeping, including the use of electronic records, to ensure compliance with Regulation 17 (Good governance).\n- Review and update safeguarding policies and procedures to ensure compliance with Regulation 13 (Safeguarding service users from abuse and improper treatment).\n- Conduct regular audits to ensure compliance with CQC regulations and identify areas for improvement, including Regulation 18 (Staffing) and Regulation 19 (Fit and proper persons employed).	## Care Plan Audit Report\n\n### Executive Summary\nThe care home's overall compliance status is concerning, with 17 overdue care plans and 11 residents having no records for the day. Key strengths include a good volume of daily care records, with 214 total records logged, and no instances of fluid intake below threshold. However, key concerns include the high number of overdue care plans and missing records, which may impact the home's CQC rating. The home's compliance with CQC regulations, such as Regulation 9 (Person-centred care) and Regulation 12 (Safe care and treatment), is compromised due to these concerns.\n\n### Detailed Findings\n\n#### Care Planning & Reviews\n⚠️ The care home has 17 overdue care plans, including those for Dorothy Williams (due 13 May 2026), Harold Thompson (due 15 May 2026), and Margaret Clarke (due 11 May 2026). ✅ However, the home has 67 active care plans, indicating some level of planning and review. ⚠️ The duplication of care plans for some residents, such as Arthur Davies and Dorothy Williams, is a concern and may indicate a lack of effective care planning processes.\n\n#### Daily Care & Documentation\nThe care home has a good volume of daily care records, with 214 total records logged, including 42 vitals records, 41 personal care records, and 41 general records. However, ⚠️ 11 residents have no records for the day, including Margaret Thompson, George Williams, and Edith Davies. This lack of documentation may compromise the continuity of care and is a concern.\n\n#### Medication Management\nThe care home's MAR compliance rate is 53%, with 10 medications given and 1 refused. ⚠️ This rate is lower than expected and may indicate a need for improved medication management processes. However, ✅ there are no critical failures in medication management.\n\n#### Nutrition & Hydration\n✅ The care home has no instances of fluid intake below threshold, indicating good nutrition and hydration practices. However, ⚠️ the lack of records for some residents may compromise the ability to monitor and manage their nutrition and hydration needs.\n\n#### Staff Training & Competency\n✅ The care home has no staff training expiring within the next 60 days, indicating a good level of staff competency. However, ⚠️ the home should continue to monitor staff training and competency to ensure compliance with CQC regulations, such as Regulation 18 (Staffing).\n\n#### Safeguarding\n✅ The care home has no safeguarding concerns, indicating a good level of safeguarding practices. However, ⚠️ the home should continue to monitor and review its safeguarding policies and procedures to ensure compliance with CQC regulations, such as Regulation 13 (Safeguarding service users from abuse and improper treatment).\n\n### Summary of Key Risks\n* ⚠️ Overdue care plans and missing records may compromise the continuity of care and resident safety.\n* ⚠️ Lack of documentation for some residents may compromise the ability to monitor and manage their needs.\n* ⚠️ Lower than expected MAR compliance rate may indicate a need for improved medication management processes.\n* ⚠️ Duplication of care plans for some residents may indicate a lack of effective care planning processes.\n* ⚠️ Lack of records for some residents may compromise the ability to monitor and manage their nutrition and hydration needs.\n\n### Good Practice Identified\n* ✅ The care home has a good volume of daily care records, indicating a good level of care and support.\n* ✅ The home has no instances of fluid intake below threshold, indicating good nutrition and hydration practices.\n* ✅ The care home has no staff training expiring within the next 60 days, indicating a good level of staff competency.\n* ✅ The home has no safeguarding concerns, indicating a good level of safeguarding practices.	102	72	30	2026-05-22 08:43:31.02767+01	2026-05-22 08:43:26.923301+01
2667a59d-fc7c-4fa9-a289-570c3f7e10dd	5c027814-a0f9-44f3-bad4-138e4783fd51	a1000000-0000-0000-0000-000000000001	care_plan	\N	completed	2026-04-22	2026-05-22	## Care Plan Audit Report\n\n### Executive Summary\nThe care home has demonstrated a high level of compliance with care planning and documentation requirements, with 72 active care plans and no overdue reviews. The home has also maintained accurate and comprehensive daily records, with 225 records logged during the audit period. However, there are some concerns regarding the medication management process, with a 53% compliance rate for medication administration. Overall, the home's compliance status is satisfactory, but there are areas for improvement to achieve an 'Outstanding' CQC rating. The key strengths include the home's ability to maintain up-to-date care plans and daily records, while the key concerns include the medication management process and the lack of detail in incident reports.\n\n### Detailed Findings\n\n#### Care Planning & Reviews\n✅ The care home has 72 active care plans, with no overdue reviews, demonstrating a high level of compliance with care planning requirements.\n✅ All care plans are up-to-date, with regular reviews and updates, ensuring that residents' needs are met.\n⚠️ However, the audit did not assess the quality and content of the care plans, which may be an area for further review.\n\n#### Daily Care & Documentation\n✅ The home has maintained accurate and comprehensive daily records, with 225 records logged during the audit period, covering various aspects of care, including vitals, personal care, and nutrition.\n✅ There are no missing records for any residents, ensuring continuity of care and enabling staff to make informed decisions.\n⚠️ The lack of detail in some records, such as the incident reports for George Bennett, may hinder the ability to investigate and learn from incidents.\n\n#### Medication Management\n⚠️ The medication administration compliance rate is 53%, with 10 out of 19 medications given as prescribed, raising concerns about the effectiveness of the medication management process.\n✅ However, there is only one instance of a resident refusing medication, indicating that residents are generally willing to take their prescribed medications.\n\n#### Nutrition & Hydration\n✅ There are no instances of residents having fluid intake below the threshold, indicating that the home is meeting residents' hydration needs.\n✅ The home has maintained accurate records of fluid intake, enabling staff to monitor and respond to residents' hydration needs.\n\n#### Staff Training & Competency\n✅ There are no staff members with expiring training, ensuring that staff have the necessary skills and knowledge to provide high-quality care.\n✅ The home's staff training programme appears to be effective in maintaining staff competency.\n\n#### Safeguarding\n✅ There are no safeguarding concerns reported during the audit period, indicating that the home has a robust safeguarding process in place.\n✅ The home's safeguarding policy and procedures appear to be effective in protecting residents from harm.\n\n### Summary of Key Risks\n* ⚠️ Medication management process: the 53% compliance rate for medication administration raises concerns about the effectiveness of the medication management process.\n* ⚠️ Lack of detail in incident reports: the lack of detail in incident reports, such as those for George Bennett, may hinder the ability to investigate and learn from incidents.\n* ⚠️ Quality of care plans: the audit did not assess the quality and content of care plans, which may be an area for further review.\n\n### Good Practice Identified\n* ✅ The home's ability to maintain up-to-date care plans and daily records demonstrates a high level of compliance with care planning requirements.\n* ✅ The home's staff training programme appears to be effective in maintaining staff competency.\n* ✅ The home's safeguarding policy and procedures appear to be effective in protecting residents from harm.	- Review and revise the medication management process to ensure that medications are administered as prescribed, in line with Regulation 12 of the CQC regulations.\n- Provide additional training to staff on the importance of maintaining accurate and detailed records, including incident reports, to ensure that incidents can be thoroughly investigated and learned from, in line with Regulation 17 of the CQC regulations.\n- Conduct a review of care plans to ensure that they are of high quality and meet the individual needs of residents, in line with Regulation 9 of the CQC regulations.\n- Develop a system to monitor and review the effectiveness of the medication management process, including regular audits and feedback from staff and residents.\n- Provide guidance to staff on the importance of maintaining accurate and detailed records, including incident reports, and the consequences of not doing so.\n- Consider implementing a system to track and monitor staff training and competency, to ensure that staff have the necessary skills and knowledge to provide high-quality care.\n- Review the home's safeguarding policy and procedures to ensure that they are effective in protecting residents from harm and that staff are aware of their roles and responsibilities in safeguarding residents.	## Care Plan Audit Report\n\n### Executive Summary\nThe care home has demonstrated a high level of compliance with care planning and documentation requirements, with 72 active care plans and no overdue reviews. The home has also maintained accurate and comprehensive daily records, with 225 records logged during the audit period. However, there are some concerns regarding the medication management process, with a 53% compliance rate for medication administration. Overall, the home's compliance status is satisfactory, but there are areas for improvement to achieve an 'Outstanding' CQC rating. The key strengths include the home's ability to maintain up-to-date care plans and daily records, while the key concerns include the medication management process and the lack of detail in incident reports.\n\n### Detailed Findings\n\n#### Care Planning & Reviews\n✅ The care home has 72 active care plans, with no overdue reviews, demonstrating a high level of compliance with care planning requirements.\n✅ All care plans are up-to-date, with regular reviews and updates, ensuring that residents' needs are met.\n⚠️ However, the audit did not assess the quality and content of the care plans, which may be an area for further review.\n\n#### Daily Care & Documentation\n✅ The home has maintained accurate and comprehensive daily records, with 225 records logged during the audit period, covering various aspects of care, including vitals, personal care, and nutrition.\n✅ There are no missing records for any residents, ensuring continuity of care and enabling staff to make informed decisions.\n⚠️ The lack of detail in some records, such as the incident reports for George Bennett, may hinder the ability to investigate and learn from incidents.\n\n#### Medication Management\n⚠️ The medication administration compliance rate is 53%, with 10 out of 19 medications given as prescribed, raising concerns about the effectiveness of the medication management process.\n✅ However, there is only one instance of a resident refusing medication, indicating that residents are generally willing to take their prescribed medications.\n\n#### Nutrition & Hydration\n✅ There are no instances of residents having fluid intake below the threshold, indicating that the home is meeting residents' hydration needs.\n✅ The home has maintained accurate records of fluid intake, enabling staff to monitor and respond to residents' hydration needs.\n\n#### Staff Training & Competency\n✅ There are no staff members with expiring training, ensuring that staff have the necessary skills and knowledge to provide high-quality care.\n✅ The home's staff training programme appears to be effective in maintaining staff competency.\n\n#### Safeguarding\n✅ There are no safeguarding concerns reported during the audit period, indicating that the home has a robust safeguarding process in place.\n✅ The home's safeguarding policy and procedures appear to be effective in protecting residents from harm.\n\n### Summary of Key Risks\n* ⚠️ Medication management process: the 53% compliance rate for medication administration raises concerns about the effectiveness of the medication management process.\n* ⚠️ Lack of detail in incident reports: the lack of detail in incident reports, such as those for George Bennett, may hinder the ability to investigate and learn from incidents.\n* ⚠️ Quality of care plans: the audit did not assess the quality and content of care plans, which may be an area for further review.\n\n### Good Practice Identified\n* ✅ The home's ability to maintain up-to-date care plans and daily records demonstrates a high level of compliance with care planning requirements.\n* ✅ The home's staff training programme appears to be effective in maintaining staff competency.\n* ✅ The home's safeguarding policy and procedures appear to be effective in protecting residents from harm.	97	93	4	2026-05-22 21:55:31.187508+01	2026-05-22 21:55:25.273653+01
\.


--
-- Data for Name: business_alerts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.business_alerts (id, home_id, created_by, alert_type, severity, title, description, is_resolved, resolved_by, resolved_at, resolution_notes, created_at, su_id, staff_id, record_id, record_type, notified_admin, data) FROM stdin;
3e93b9e9-9f96-4ba0-be19-99242734f467	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	care_plan_overdue	warning	Care plan overdue: George Bennett	medical care plan was due for review on Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time)	t	e951bf8c-fc86-4771-80ad-b903f754ad6f	2026-05-21 12:59:51.897857+01	Resolved via alerts dashboard	2026-05-18 22:00:00.972615+01	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	\N	e98e4109-3c30-4ea0-b327-164d84af560a	care_plan	f	\N
28ecd3e7-b635-4fc8-93a2-d6c312f4221d	5c027814-a0f9-44f3-bad4-138e4783fd51	a1000000-0000-0000-0000-000000000001	\N	warning	Fire Safety Inspection Due	Annual fire safety inspection is due this month. Contact facilities team to arrange.	t	\N	\N	\N	2026-05-18 09:23:55.516724+01	\N	\N	\N	\N	f	\N
f24d5fd7-28a0-4f25-8484-21611ce897f4	5c027814-a0f9-44f3-bad4-138e4783fd51	a1000000-0000-0000-0000-000000000001	\N	info	New Staff Training Available	Updated moving and handling training now available online. All staff must complete by end of month.	t	\N	\N	\N	2026-05-18 09:23:55.516724+01	\N	\N	\N	\N	f	\N
639fcc04-660c-47a1-b987-72af46548415	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	care_plan_overdue	high	Care plans overdue for review	4 residents have care plans past their review date.	t	\N	\N	\N	2026-05-18 15:49:34.390945+01	\N	\N	\N	\N	f	\N
1bd0aa67-b2ae-4594-b8bd-ec5282a2bd70	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	medication_gap	high	MAR gap — Arthur Davies	Furosemide 40mg (08:00) not recorded for Arthur Davies.	t	\N	\N	\N	2026-05-18 15:49:34.390945+01	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	\N	\N	\N	f	\N
eb171206-af64-4b2c-bccf-04de40cd4a34	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	fluid_below_threshold	medium	Low fluid intake — Margaret Clarke	Margaret Clarke: 850ml today vs 1500ml target.	t	\N	\N	\N	2026-05-18 15:49:34.390945+01	1259b91c-ad41-4c2d-a811-c23d4fdb2502	\N	\N	\N	f	\N
e6357013-3dcd-46b3-a612-24c92a51f4cd	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	task_missed	medium	Tasks pending today	Fridge log and care plan reviews not yet completed.	t	\N	\N	\N	2026-05-18 15:49:34.390945+01	\N	\N	\N	\N	f	\N
99f290a5-20a2-4f96-8ac4-91188dc88119	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	risk_assessment_overdue	low	Falls risk assessments due	Due this week for Dorothy Williams and George Bennett.	t	\N	\N	\N	2026-05-18 15:49:34.390945+01	\N	\N	\N	\N	f	\N
13b18787-5b2c-4016-800e-4f8f4ddc8762	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	care_plan_overdue	warning	Care plan overdue: Dorothy Williams	medical care plan was due for review on Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time)	t	\N	\N	\N	2026-05-18 16:00:00.163379+01	4185a367-406c-4f44-a395-4c1e66c2a9fb	\N	01ec08e9-b03b-4af5-872d-f5210f16dee9	care_plan	f	\N
855621bc-2b84-4169-b7c2-addc1e0b7b09	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	care_plan_overdue	warning	Care plan overdue: Harold Thompson	physical care plan was due for review on Fri May 15 2026 00:00:00 GMT+0100 (West Africa Time)	t	\N	\N	\N	2026-05-18 16:00:00.170944+01	8f0ebcf2-0cae-445f-b962-838445e5014a	\N	716b9d8d-aeed-4a37-be58-65d26ce4e064	care_plan	f	\N
8c0d375f-244f-472b-9430-a99eba61a574	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	care_plan_overdue	warning	Care plan overdue: Margaret Clarke	physical care plan was due for review on Mon May 11 2026 00:00:00 GMT+0100 (West Africa Time)	t	\N	\N	\N	2026-05-18 16:00:00.174549+01	1259b91c-ad41-4c2d-a811-c23d4fdb2502	\N	490e54c4-ee66-4cb1-8dcd-8cb250969d0f	care_plan	f	\N
a8ba6b03-599e-48c5-a387-c3b43878bc31	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	care_plan_overdue	warning	Care plan overdue: Arthur Davies	medical care plan was due for review on Fri May 08 2026 00:00:00 GMT+0100 (West Africa Time)	t	\N	\N	\N	2026-05-18 16:00:00.178356+01	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	\N	d0e60bce-d7f5-49b5-a483-ad1d2b7049cb	care_plan	f	\N
41ee6b28-1248-4924-875d-54f6f5648106	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	care_plan_overdue	warning	Care plan overdue: George Bennett	medical care plan was due for review on Sat May 16 2026 00:00:00 GMT+0100 (West Africa Time)	t	\N	\N	\N	2026-05-18 16:00:00.185747+01	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	\N	8960b743-66ad-4e35-b0b5-17f0f69bc1b7	care_plan	f	\N
9c782959-2794-4a16-8226-39bc886d8235	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	care_plan_overdue	critical	Care plan review overdue	4 residents have care plans due for review	t	\N	\N	\N	2026-05-18 21:15:37.429794+01	\N	\N	\N	\N	f	\N
ff02096e-6cbb-4cad-8422-d874db130e1f	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	medication_gap	critical	MAR chart gap detected	Medication not recorded for Arthur Davies - 08:00 dose	t	\N	\N	\N	2026-05-18 21:15:37.429794+01	\N	\N	\N	\N	f	\N
fd8e9cab-0e9a-47d9-bcd7-8ae054e7a60e	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	task_missed	warning	Tasks pending	3 tasks are overdue and require attention	t	\N	\N	\N	2026-05-18 21:15:37.429794+01	\N	\N	\N	\N	f	\N
360ff632-9999-4b79-a990-b5a55557b22b	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	fluid_below_threshold	warning	Low fluid intake	Margaret Clarke fluid intake below daily target	t	\N	\N	\N	2026-05-18 21:15:37.429794+01	\N	\N	\N	\N	f	\N
a418e628-686a-4dcc-aac6-e89dbe169c2a	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	care_plan_overdue	critical	Care plan review overdue	4 residents have care plans due for review	t	\N	\N	\N	2026-05-18 21:17:41.787345+01	\N	\N	\N	\N	f	\N
fa594fcb-13d8-4d88-9359-ad376394b02c	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	medication_gap	critical	MAR chart gap detected	Medication not recorded for Arthur Davies - 08:00 dose	t	\N	\N	\N	2026-05-18 21:17:41.787345+01	\N	\N	\N	\N	f	\N
df817711-0699-4c46-a4fd-2defbabd57a6	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	task_missed	warning	Tasks pending	3 tasks are overdue and require attention	t	\N	\N	\N	2026-05-18 21:17:41.787345+01	\N	\N	\N	\N	f	\N
78a4e171-230d-4cac-a0aa-d03b0cc0ea2e	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	fluid_below_threshold	warning	Low fluid intake	Margaret Clarke fluid intake below daily target	t	\N	\N	\N	2026-05-18 21:17:41.787345+01	\N	\N	\N	\N	f	\N
4be94f9a-0737-43e0-9008-627eb477a559	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	care_plan_overdue	warning	Care plan overdue: Arthur Davies	medical care plan was due for review on Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time)	t	\N	\N	\N	2026-05-18 22:00:00.959097+01	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	\N	a950aae4-dd35-4852-94da-7f7b7d1de05e	care_plan	f	\N
2e2069e6-276c-475d-a908-c1f2203cc41f	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	care_plan_overdue	warning	Care plan overdue: Arthur Davies	medical care plan was due for review on Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time)	t	\N	\N	\N	2026-05-18 22:00:00.875534+01	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	\N	3f2d571e-b418-412b-a14f-a6dadbe7a4f4	care_plan	f	\N
a2baf457-3252-4e3a-b703-e294e24404d1	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	care_plan_overdue	warning	Care plan overdue: Dorothy Williams	medical care plan was due for review on Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time)	t	\N	\N	\N	2026-05-18 22:00:00.894148+01	4185a367-406c-4f44-a395-4c1e66c2a9fb	\N	cb3c309e-9344-42fe-b415-984a0c4c9ed8	care_plan	f	\N
fd08a72e-f6fa-4c2b-a3b4-6f848d3271e8	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	care_plan_overdue	warning	Care plan overdue: Dorothy Williams	medical care plan was due for review on Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time)	t	\N	\N	\N	2026-05-18 22:00:00.848453+01	4185a367-406c-4f44-a395-4c1e66c2a9fb	\N	f2a89a03-2bb8-43ed-8b23-4955ac404ff8	care_plan	f	\N
623a23fb-b88d-4eed-be5d-b465627dfae7	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	care_plan_overdue	warning	Care plan overdue: Edna Morrison	medical care plan was due for review on Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time)	t	\N	\N	\N	2026-05-18 22:00:00.963619+01	9b95a09a-1b19-46dc-b388-64cdf909295f	\N	ea164a45-0aa2-4c8f-ade1-38432d4668dd	care_plan	f	\N
de3dcfaf-bb85-4801-9ab1-7c09126f422f	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	care_plan_overdue	warning	Care plan overdue: Edna Morrison	medical care plan was due for review on Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time)	t	\N	\N	\N	2026-05-18 22:00:00.878902+01	9b95a09a-1b19-46dc-b388-64cdf909295f	\N	50a75069-62c1-4321-9c67-3af5c6a4a841	care_plan	f	\N
090e0057-18b9-48ca-870e-fd059744a58f	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	care_plan_overdue	warning	Care plan overdue: George Bennett	medical care plan was due for review on Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time)	t	\N	\N	\N	2026-05-21 14:00:05.356616+01	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	\N	e98e4109-3c30-4ea0-b327-164d84af560a	care_plan	f	\N
fad6292e-0646-44fb-acbc-38241cd80f7b	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	care_plan_overdue	warning	Care plan overdue: George Bennett	medical care plan was due for review on Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time)	t	\N	\N	\N	2026-05-18 22:00:00.886594+01	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	\N	015316d6-5ebe-448a-baa3-85804bb0220a	care_plan	f	\N
5acebe19-2f3c-4f28-8ad9-b3a0d05d2b0a	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	care_plan_overdue	warning	Care plan overdue: Harold Thompson	medical care plan was due for review on Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time)	t	\N	\N	\N	2026-05-18 22:00:00.897365+01	8f0ebcf2-0cae-445f-b962-838445e5014a	\N	eabe9aff-b7f1-4509-a3ec-7399e0e9be6a	care_plan	f	\N
bfdc6443-dafe-413a-9323-f7d2f75e8013	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	care_plan_overdue	warning	Care plan overdue: Harold Thompson	medical care plan was due for review on Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time)	t	\N	\N	\N	2026-05-18 22:00:00.859874+01	8f0ebcf2-0cae-445f-b962-838445e5014a	\N	348bbf47-a6a1-4245-ac09-83548e167bf4	care_plan	f	\N
9432d6ad-b40f-4f3f-929a-48449c84de3f	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	care_plan_overdue	warning	Care plan overdue: Margaret Clarke	medical care plan was due for review on Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time)	t	\N	\N	\N	2026-05-18 22:00:00.903865+01	1259b91c-ad41-4c2d-a811-c23d4fdb2502	\N	d303cd84-da18-4494-a3b4-34638cf3c513	care_plan	f	\N
eaed0baf-7663-49df-99c6-5c7edc92ad23	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	care_plan_overdue	warning	Care plan overdue: Margaret Clarke	medical care plan was due for review on Wed May 13 2026 00:00:00 GMT+0100 (West Africa Time)	t	\N	\N	\N	2026-05-18 22:00:00.863609+01	1259b91c-ad41-4c2d-a811-c23d4fdb2502	\N	11b04835-dc37-4cee-9d9a-c25ba9c72b33	care_plan	f	\N
\.


--
-- Data for Name: calendar_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.calendar_events (id, home_id, created_by, title, event_type, event_date, start_time, end_time, description, location, su_id, all_staff, created_at) FROM stdin;
b5aedf30-60e9-4ec3-a3f4-1470fb1d2acf	5c027814-a0f9-44f3-bad4-138e4783fd51	a1000000-0000-0000-0000-000000000001	Monthly Team Meeting	meeting	2026-05-21	14:00:00	\N	Monthly staff meeting to discuss care quality and resident updates	\N	\N	f	2026-05-18 09:23:55.516724+01
a2189d4b-5df8-4300-abec-1b994bde7126	5c027814-a0f9-44f3-bad4-138e4783fd51	a1000000-0000-0000-0000-000000000001	CQC Inspection Prep	inspection	2026-05-25	10:00:00	\N	Internal audit and preparation for upcoming CQC inspection	\N	\N	f	2026-05-18 09:23:55.516724+01
4f8f5272-6776-4085-b149-1e7d2b73f6bb	5c027814-a0f9-44f3-bad4-138e4783fd51	a1000000-0000-0000-0000-000000000001	Margaret Thompson - GP Visit	appointment	2026-05-20	11:00:00	\N	Quarterly GP review for Margaret Thompson	\N	\N	f	2026-05-18 09:23:55.516724+01
09c6ea6c-aa6f-46c2-b71c-3ccf0947f57c	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	test	appointment	2026-05-19	10:14:00	12:08:00	\N	\N	\N	f	2026-05-19 10:32:17.290521+01
\.


--
-- Data for Name: capacity_assessments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.capacity_assessments (id, su_id, home_id, assessed_by, decision_area, has_capacity, assessment_date, summary, outcome, review_date, created_at, best_interest_decision, consulted_with) FROM stdin;
10f98c8f-fb7c-4e86-90f1-7f9dc1b7533a	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	Medication	t	\N	\N	\N	\N	2026-05-21 12:12:44.189526+01	\N	\N
\.


--
-- Data for Name: care_plan_updates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.care_plan_updates (id, care_plan_id, update_notes, updated_by, created_at) FROM stdin;
ef4b711d-6669-4f3e-819e-e4535ff32903	7db09d79-af3a-4ce7-8df1-8c53b22d4b60	Review completed	e951bf8c-fc86-4771-80ad-b903f754ad6f	2026-05-21 12:07:53.669377+01
e5688f2c-1b5a-4d3f-ab68-e41903535eb5	fd15fb6a-5b4d-4c0c-8e51-7a0a04c05e67	Good progress	e951bf8c-fc86-4771-80ad-b903f754ad6f	2026-05-21 12:16:13.235169+01
\.


--
-- Data for Name: care_plans; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.care_plans (id, su_id, home_id, created_by, plan_type, custom_name, aims_outcomes, what_i_can_do, how_to_support, current_status, notes, review_frequency, last_review_date, next_review_date, is_active, created_at, updated_at, outcome_achieved, reviewed_by) FROM stdin;
d4933351-92f0-4fdd-ac82-57842b8071f3	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	personal_hygiene	\N	Maintain personal dignity	\N	Assist with washing and dressing each morning.	\N	\N	monthly	\N	2026-06-01	t	2026-05-18 15:49:34.390945+01	2026-05-18 15:49:34.390945+01	\N	\N
21c6c20f-a1d2-489e-aec0-e7d70598de16	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	medical	\N	Control hypertension and medication	\N	BP check every morning. Strict medication schedule.	\N	\N	monthly	\N	2026-06-08	t	2026-05-18 15:49:34.390945+01	2026-05-18 15:49:34.390945+01	\N	\N
4657aea9-ba79-46ce-b850-20dd250c9b6a	1259b91c-ad41-4c2d-a811-c23d4fdb2502	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	food_and_fluids	\N	Maintain hydration	\N	Encourage fluids every 2 hours. Alert if below 1000ml by 3pm.	\N	\N	monthly	\N	2026-05-28	t	2026-05-18 15:49:34.390945+01	2026-05-18 15:49:34.390945+01	\N	\N
85da9f91-baa6-4e61-9a6c-bc621c80668a	9b95a09a-1b19-46dc-b388-64cdf909295f	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	physical	\N	Support stroke recovery	\N	Physiotherapy exercises twice daily. Assist from right.	\N	\N	monthly	\N	2026-05-25	t	2026-05-18 15:49:34.390945+01	2026-05-18 15:49:34.390945+01	\N	\N
bca43ba3-190f-4a8d-a13b-ba1b90fa2b45	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	personal_hygiene	\N	Maintain hygiene with dignity	\N	Same time daily. Music during care to reduce distress.	\N	\N	monthly	\N	2026-06-15	t	2026-05-18 15:49:34.390945+01	2026-05-18 15:49:34.390945+01	\N	\N
028ba6b8-1fb1-4c24-ba62-7d5218740432	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	physical	\N	Maintain independence and dignity	\N	Assist with daily activities as needed	\N	\N	monthly	\N	2026-06-17	t	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	\N	\N
7d90f977-d0b0-4213-b3f2-8a997ca1f965	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	medical	\N	Maintain independence and dignity	\N	Assist with daily activities as needed	\N	\N	monthly	\N	2026-06-17	t	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	\N	\N
d6585c79-2a8d-40bf-8718-bea1311c8210	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	food_and_fluids	\N	Maintain independence and dignity	\N	Assist with daily activities as needed	\N	\N	monthly	\N	2026-06-17	t	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	\N	\N
dd4cdae6-ddd1-4624-9cc5-1d462065a64e	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	physical	\N	Maintain independence and dignity	\N	Assist with daily activities as needed	\N	\N	monthly	\N	2026-06-17	t	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	\N	\N
a4045d6d-0793-46c5-8521-ea7fa5859b1a	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	medical	\N	Maintain independence and dignity	\N	Assist with daily activities as needed	\N	\N	monthly	\N	2026-06-17	t	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	\N	\N
3b3e938e-dae5-45c2-8266-d49d54430634	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	food_and_fluids	\N	Maintain independence and dignity	\N	Assist with daily activities as needed	\N	\N	monthly	\N	2026-06-17	t	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	\N	\N
e348e704-20bc-4c82-b9d4-2398d2b3cb0b	9b95a09a-1b19-46dc-b388-64cdf909295f	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	physical	\N	Maintain independence and dignity	\N	Assist with daily activities as needed	\N	\N	monthly	\N	2026-06-17	t	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	\N	\N
cf855351-2aad-40d2-a720-3550f8598ccc	9b95a09a-1b19-46dc-b388-64cdf909295f	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	medical	\N	Maintain independence and dignity	\N	Assist with daily activities as needed	\N	\N	monthly	\N	2026-06-17	t	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	\N	\N
b4058be2-7021-4bd5-a441-54ff64172416	9b95a09a-1b19-46dc-b388-64cdf909295f	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	food_and_fluids	\N	Maintain independence and dignity	\N	Assist with daily activities as needed	\N	\N	monthly	\N	2026-06-17	t	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	\N	\N
702f1efd-a19f-4e51-8326-fbf1af77b4ec	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	physical	\N	Maintain independence and dignity	\N	Assist with daily activities as needed	\N	\N	monthly	\N	2026-06-17	t	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	\N	\N
258742df-e9c0-4f46-911a-c4a28770f5f7	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	medical	\N	Maintain independence and dignity	\N	Assist with daily activities as needed	\N	\N	monthly	\N	2026-06-17	t	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	\N	\N
4e1a8af0-9f6a-44d8-b811-f0fb147ca231	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	food_and_fluids	\N	Maintain independence and dignity	\N	Assist with daily activities as needed	\N	\N	monthly	\N	2026-06-17	t	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	\N	\N
efd8d47a-d120-4eb3-b715-ef0ca0d14857	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	physical	\N	Maintain independence and dignity	\N	Assist with daily activities as needed	\N	\N	monthly	\N	2026-06-17	t	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	\N	\N
292b9b1d-78d1-4e41-bcb4-6a5f2e43007a	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	medical	\N	Maintain independence and dignity	\N	Assist with daily activities as needed	\N	\N	monthly	\N	2026-06-17	t	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	\N	\N
aec27d25-6dd7-4968-974e-0087ac4c025d	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	food_and_fluids	\N	Maintain independence and dignity	\N	Assist with daily activities as needed	\N	\N	monthly	\N	2026-06-17	t	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	\N	\N
c846a4d7-b669-438e-b39a-34a6257d0b06	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	physical	\N	Maintain independence and dignity	\N	Assist with daily activities as needed	\N	\N	monthly	\N	2026-06-17	t	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	\N	\N
50a18b57-0c5f-4ccb-a0a9-5ee6d5e54255	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	medical	\N	Maintain independence and dignity	\N	Assist with daily activities as needed	\N	\N	monthly	\N	2026-06-17	t	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	\N	\N
e4cd84d0-7d9b-48ed-85be-baa01b066301	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	food_and_fluids	\N	Maintain independence and dignity	\N	Assist with daily activities as needed	\N	\N	monthly	\N	2026-06-17	t	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	\N	\N
dcc7fcd8-3196-42f2-968d-f15a0604f1b8	1259b91c-ad41-4c2d-a811-c23d4fdb2502	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	physical	\N	Maintain independence and dignity	\N	Assist with daily activities as needed	\N	\N	monthly	\N	2026-06-17	t	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	\N	\N
78eccac4-2643-4ca9-bf49-57423d261e9f	1259b91c-ad41-4c2d-a811-c23d4fdb2502	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	medical	\N	Maintain independence and dignity	\N	Assist with daily activities as needed	\N	\N	monthly	\N	2026-06-17	t	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	\N	\N
2f33d6b3-43cd-402a-a5a4-bb59717af2b1	1259b91c-ad41-4c2d-a811-c23d4fdb2502	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	physical	\N	Maintain independence and dignity	\N	Assist with daily activities as needed	\N	\N	monthly	\N	2026-06-17	t	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	\N	\N
028a02e5-9bff-4845-847c-5a8f84134687	1259b91c-ad41-4c2d-a811-c23d4fdb2502	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	medical	\N	Maintain independence and dignity	\N	Assist with daily activities as needed	\N	\N	monthly	\N	2026-06-17	t	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	\N	\N
e189abd3-4d7b-49e6-9ce8-5fd88c91915c	1259b91c-ad41-4c2d-a811-c23d4fdb2502	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	food_and_fluids	\N	Maintain independence and dignity	\N	Assist with daily activities as needed	\N	\N	monthly	\N	2026-06-17	t	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	\N	\N
8960b743-66ad-4e35-b0b5-17f0f69bc1b7	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	medical	\N	Manage Alzheimer's progression	\N	Consistent routine. Memory aids. Night sensor active.	\N	\N	monthly	2026-05-22	2026-08-20	t	2026-05-18 15:49:34.390945+01	2026-05-18 15:49:34.390945+01	\N	\N
3f2d571e-b418-412b-a14f-a6dadbe7a4f4	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	medical	\N	Monitor health conditions	\N	Regular observations	\N	\N	monthly	2026-05-22	2026-08-20	t	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	\N	\N
f2a89a03-2bb8-43ed-8b23-4955ac404ff8	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	medical	\N	Monitor health conditions	\N	Regular observations	\N	\N	monthly	2026-05-22	2026-08-20	t	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	\N	\N
50a75069-62c1-4321-9c67-3af5c6a4a841	9b95a09a-1b19-46dc-b388-64cdf909295f	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	medical	\N	Monitor health conditions	\N	Regular observations	\N	\N	monthly	2026-05-22	2026-08-20	t	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	\N	\N
412996f1-8095-40af-b95c-a6018667bce1	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	physical	\N	Maintain independence and dignity	\N	Assist with daily activities as needed	\N	\N	monthly	\N	2026-06-17	t	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	\N	\N
f74e2159-3dd9-450a-92bd-ea192d5641cd	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	medical	\N	Maintain independence and dignity	\N	Assist with daily activities as needed	\N	\N	monthly	\N	2026-06-17	t	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	\N	\N
fe8617fc-9b66-45d8-a75f-f644ee6d4502	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	food_and_fluids	\N	Maintain independence and dignity	\N	Assist with daily activities as needed	\N	\N	monthly	\N	2026-06-17	t	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	\N	\N
c9ffb6bf-17ea-49ea-9ed5-d26e728de05f	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	physical	\N	Maintain independence and dignity	\N	Assist with daily activities as needed	\N	\N	monthly	\N	2026-06-17	t	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	\N	\N
e2ef5bb8-e061-40d4-a75a-425922fc1b61	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	medical	\N	Maintain independence and dignity	\N	Assist with daily activities as needed	\N	\N	monthly	\N	2026-06-17	t	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	\N	\N
8aadca33-fc3b-4f60-bdce-1ba2e5c06d5f	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	food_and_fluids	\N	Maintain independence and dignity	\N	Assist with daily activities as needed	\N	\N	monthly	\N	2026-06-17	t	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	\N	\N
68487057-2c6b-45ba-aab1-f79ba54b6046	9b95a09a-1b19-46dc-b388-64cdf909295f	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	physical	\N	Maintain independence and dignity	\N	Assist with daily activities as needed	\N	\N	monthly	\N	2026-06-17	t	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	\N	\N
465c1ff3-3062-4eff-863a-ab05b937862e	9b95a09a-1b19-46dc-b388-64cdf909295f	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	medical	\N	Maintain independence and dignity	\N	Assist with daily activities as needed	\N	\N	monthly	\N	2026-06-17	t	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	\N	\N
a49a04f9-8ae3-4b7e-bddb-700ca0bc16bd	9b95a09a-1b19-46dc-b388-64cdf909295f	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	food_and_fluids	\N	Maintain independence and dignity	\N	Assist with daily activities as needed	\N	\N	monthly	\N	2026-06-17	t	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	\N	\N
dc293443-96ec-46d6-91f8-a75d40e6d38a	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	physical	\N	Maintain independence and dignity	\N	Assist with daily activities as needed	\N	\N	monthly	\N	2026-06-17	t	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	\N	\N
c0e16249-27e3-420d-9c45-b3899cd1318a	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	medical	\N	Maintain independence and dignity	\N	Assist with daily activities as needed	\N	\N	monthly	\N	2026-06-17	t	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	\N	\N
3a6e873c-775b-46cd-b6ed-459aee3e4160	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	food_and_fluids	\N	Maintain independence and dignity	\N	Assist with daily activities as needed	\N	\N	monthly	\N	2026-06-17	t	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	\N	\N
185c5832-4d73-48df-b914-3984079c9a14	1259b91c-ad41-4c2d-a811-c23d4fdb2502	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	food_and_fluids	\N	Maintain independence and dignity	\N	Assist with daily activities as needed	\N	\N	monthly	\N	2026-06-17	t	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	\N	\N
3dc3d796-5f3b-4835-b826-9f7aad5f965a	92818c0f-b5d7-46f7-8d04-8699b01c2482	5c027814-a0f9-44f3-bad4-138e4783fd51	a1000000-0000-0000-0000-000000000001	personal_care	\N	To maintain dignity and independence in personal care	I can wash my face and brush my teeth independently	Assist with bathing twice weekly. Use non-slip mat. Preferred bath time is 10am.	\N	\N	monthly	\N	2026-06-17	t	2026-05-18 09:23:55.516724+01	2026-05-18 09:23:55.516724+01	\N	\N
621bb31a-d45c-4a67-8c6e-fcd42b6f7f57	92818c0f-b5d7-46f7-8d04-8699b01c2482	5c027814-a0f9-44f3-bad4-138e4783fd51	a1000000-0000-0000-0000-000000000001	mobility	\N	To maintain safe mobility and prevent falls	I can walk short distances with my frame	Ensure walking frame is always within reach. Non-slip footwear at all times.	\N	\N	monthly	\N	2026-06-17	t	2026-05-18 09:23:55.516724+01	2026-05-18 09:23:55.516724+01	\N	\N
d8c75d7a-4e96-49a9-a632-257186348a3f	92818c0f-b5d7-46f7-8d04-8699b01c2482	5c027814-a0f9-44f3-bad4-138e4783fd51	a1000000-0000-0000-0000-000000000001	nutrition	\N	To maintain adequate nutrition and hydration	I can feed myself with adapted cutlery	Soft diet required. Ensure 1500ml fluid daily. Favourite drink is sweet tea.	\N	\N	monthly	\N	2026-06-17	t	2026-05-18 09:23:55.516724+01	2026-05-18 09:23:55.516724+01	\N	\N
e9783ed4-b27a-43e6-b5ab-69c27d7549cb	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	physical	\N	\N	\N	\N	\N	\N	monthly	\N	2026-06-18	t	2026-05-19 10:25:56.088524+01	2026-05-19 10:25:56.088524+01	\N	\N
f065eab9-127c-41e2-b88e-ec1b677510e3	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	communication	\N	\N	\N	\N	\N	\N	monthly	\N	2026-06-17	t	2026-05-18 14:26:22.046465+01	2026-05-18 14:26:22.046465+01	\N	\N
6eb31810-a1b9-45c2-8090-3af530b149b1	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	communication	\N	\N	\N	\N	\N	\N	monthly	\N	2026-06-17	f	2026-05-18 15:34:05.48875+01	2026-05-18 15:34:05.48875+01	\N	\N
3f765ff5-b0ca-4130-895e-a79310aef3e4	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	personal_care	\N	Test aims	\N	Test support	\N	\N	monthly	\N	2026-06-20	t	2026-05-21 11:56:13.129781+01	2026-05-21 11:56:13.129781+01	\N	\N
7db09d79-af3a-4ce7-8df1-8c53b22d4b60	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	personal_care	\N	Help with daily care	\N	Assist with washing	\N	\N	monthly	2026-05-21	2026-06-20	t	2026-05-21 12:07:53.518417+01	2026-05-21 12:07:53.666851+01	t	e951bf8c-fc86-4771-80ad-b903f754ad6f
f75b7fdb-565e-4dfa-af82-544c850b3779	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	personal_care	\N	Test	\N	Assist	\N	\N	monthly	\N	2026-06-20	t	2026-05-21 12:12:42.472952+01	2026-05-21 12:12:42.472952+01	\N	\N
a950aae4-dd35-4852-94da-7f7b7d1de05e	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	medical	\N	Monitor health conditions	\N	Regular observations	\N	\N	monthly	2026-05-22	2026-08-20	t	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	\N	\N
fd15fb6a-5b4d-4c0c-8e51-7a0a04c05e67	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	nutrition	\N	Maintain weight	\N	\N	\N	\N	monthly	2026-05-21	2026-06-20	f	2026-05-21 12:16:13.081046+01	2026-05-21 12:16:13.232733+01	t	e951bf8c-fc86-4771-80ad-b903f754ad6f
c3492b26-2132-4d5f-99d9-d7daddf94ae7	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	hydration_skin	\N	\N	\N	\N	\N	\N	monthly	\N	2026-06-20	t	2026-05-21 13:02:27.056602+01	2026-05-21 13:02:27.056602+01	\N	\N
01ec08e9-b03b-4af5-872d-f5210f16dee9	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	medical	\N	Manage diabetes and dementia	\N	Monitor blood sugar. Use simple instructions.	\N	\N	monthly	2026-05-22	2026-08-20	t	2026-05-18 15:49:34.390945+01	2026-05-18 15:49:34.390945+01	\N	\N
716b9d8d-aeed-4a37-be58-65d26ce4e064	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	physical	\N	Manage Parkinson's symptoms	\N	Allow extra time. Provide adapted utensils.	\N	\N	monthly	2026-05-22	2026-08-20	t	2026-05-18 15:49:34.390945+01	2026-05-18 15:49:34.390945+01	\N	\N
490e54c4-ee66-4cb1-8dcd-8cb250969d0f	1259b91c-ad41-4c2d-a811-c23d4fdb2502	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	physical	\N	Manage COPD	\N	Ensure inhaler accessible. Rest periods during care.	\N	\N	monthly	2026-05-22	2026-08-20	t	2026-05-18 15:49:34.390945+01	2026-05-18 15:49:34.390945+01	\N	\N
d0e60bce-d7f5-49b5-a483-ad1d2b7049cb	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	medical	\N	Manage dementia and heart failure	\N	Monitor oedema daily. Fluid restriction 1500ml.	\N	\N	monthly	2026-05-22	2026-08-20	t	2026-05-18 15:49:34.390945+01	2026-05-18 15:49:34.390945+01	\N	\N
015316d6-5ebe-448a-baa3-85804bb0220a	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	medical	\N	Monitor health conditions	\N	Regular observations	\N	\N	monthly	2026-05-22	2026-08-20	t	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	\N	\N
eabe9aff-b7f1-4509-a3ec-7399e0e9be6a	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	medical	\N	Monitor health conditions	\N	Regular observations	\N	\N	monthly	2026-05-22	2026-08-20	t	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	\N	\N
cb3c309e-9344-42fe-b415-984a0c4c9ed8	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	medical	\N	Monitor health conditions	\N	Regular observations	\N	\N	monthly	2026-05-22	2026-08-20	t	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	\N	\N
ea164a45-0aa2-4c8f-ade1-38432d4668dd	9b95a09a-1b19-46dc-b388-64cdf909295f	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	medical	\N	Monitor health conditions	\N	Regular observations	\N	\N	monthly	2026-05-22	2026-08-20	t	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	\N	\N
348bbf47-a6a1-4245-ac09-83548e167bf4	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	medical	\N	Monitor health conditions	\N	Regular observations	\N	\N	monthly	2026-05-22	2026-08-20	t	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	\N	\N
11b04835-dc37-4cee-9d9a-c25ba9c72b33	1259b91c-ad41-4c2d-a811-c23d4fdb2502	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	medical	\N	Monitor health conditions	\N	Regular observations	\N	\N	monthly	2026-05-22	2026-08-20	t	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	\N	\N
e98e4109-3c30-4ea0-b327-164d84af560a	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	medical	\N	Monitor health conditions	\N	Regular observations	\N	\N	monthly	2026-05-22	2026-08-20	t	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	\N	\N
d303cd84-da18-4494-a3b4-34638cf3c513	1259b91c-ad41-4c2d-a811-c23d4fdb2502	5c027814-a0f9-44f3-bad4-138e4783fd51	0dd6be56-890b-4e27-9d15-a564ebd7f094	medical	\N	Monitor health conditions	\N	Regular observations	\N	\N	monthly	2026-05-22	2026-08-20	t	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	\N	\N
d5e6f275-3114-421f-a78c-66530c032ea8	11111111-0000-0000-0000-000000000002	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	custom	\N	\N	\N	\N	\N	\N	monthly	2026-05-22	2026-06-21	t	2026-05-22 09:45:45.194236+01	2026-05-22 09:45:45.194236+01	\N	\N
e0761de1-51da-4ed2-8a6a-37fc0c54ec0b	11111111-0000-0000-0000-000000000003	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	custom	\N	\N	\N	\N	\N	\N	monthly	2026-05-22	2026-06-21	t	2026-05-22 09:45:45.290677+01	2026-05-22 09:45:45.290677+01	\N	\N
55f466f5-1f98-47d1-8cbf-1ee2809313cb	11111111-0000-0000-0000-000000000004	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	custom	\N	\N	\N	\N	\N	\N	monthly	2026-05-22	2026-06-21	t	2026-05-22 09:45:45.312697+01	2026-05-22 09:45:45.312697+01	\N	\N
91fd4f1d-b348-4ce3-a60b-041531f05123	11111111-0000-0000-0000-000000000005	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	custom	\N	\N	\N	\N	\N	\N	monthly	2026-05-22	2026-06-21	t	2026-05-22 09:45:45.316551+01	2026-05-22 09:45:45.316551+01	\N	\N
a94ba7cf-90a0-423f-89ca-801b605a270a	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	a1000000-0000-0000-0000-000000000001	medical	\N	\N	\N	\N	\N	\N	monthly	\N	2026-06-21	t	2026-05-22 09:48:02.8215+01	2026-05-22 09:48:02.8215+01	\N	\N
\.


--
-- Data for Name: clock_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.clock_events (id, staff_id, su_id, home_id, event_type, latitude, longitude, distance_metres, clocked_at) FROM stdin;
\.


--
-- Data for Name: daily_records; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.daily_records (id, su_id, home_id, staff_id, record_type, shift, notes, description, amount_ml, fluid_type, meal_type, amount_eaten, food_description, systolic, diastolic, pulse, temp_celsius, spo2_percent, supplemental_o2, weight_kg, bmi, bristol_type, record_date, created_at, updated_at, flagged, flag_reason, recorded_at) FROM stdin;
b8fff80c-5ec4-4d30-b5eb-71e681482554	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	personal_care	morning	Dorothy assisted with washing and dressing. Cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 15:49:34.390945+01	2026-05-18 15:49:34.390945+01	f	\N	2026-05-21 12:06:53.790993+01
974acb40-4efb-4704-bf8f-9cfd295c77d5	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	food_drink	morning	Full breakfast eaten. Drank 250ml orange juice.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 15:49:34.390945+01	2026-05-18 15:49:34.390945+01	f	\N	2026-05-21 12:06:53.790993+01
3be344a1-0567-4808-91f9-fde30049d40e	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	personal_care	morning	Harold required full assistance. Tremors present but manageable.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 15:49:34.390945+01	2026-05-18 15:49:34.390945+01	f	\N	2026-05-21 12:06:53.790993+01
e16eea0c-041a-4c43-9669-7ee6eac0d103	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	vitals	morning	BP: 145/92, Pulse: 74, O2: 97%. Slightly elevated.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 15:49:34.390945+01	2026-05-18 15:49:34.390945+01	f	\N	2026-05-21 12:06:53.790993+01
a3d5e674-367f-42a2-a00d-8015bc1a205e	1259b91c-ad41-4c2d-a811-c23d4fdb2502	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	personal_care	morning	Margaret showered. Breathless on exertion — rest taken.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 15:49:34.390945+01	2026-05-18 15:49:34.390945+01	f	\N	2026-05-21 12:06:53.790993+01
8f2dce3d-c8ee-43d6-bf67-fecbffebff8d	1259b91c-ad41-4c2d-a811-c23d4fdb2502	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	food_drink	morning	Fluid intake: 850ml by lunchtime. Encouraged more.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 15:49:34.390945+01	2026-05-18 15:49:34.390945+01	f	\N	2026-05-21 12:06:53.790993+01
e87412a3-0bb8-46e6-a8a5-7007c5a08a57	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	general	morning	Arthur confused, asking for wife. Redirected calmly.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 15:49:34.390945+01	2026-05-18 15:49:34.390945+01	f	\N	2026-05-21 12:06:53.790993+01
db307789-95c5-44af-a19c-b2becc879590	9b95a09a-1b19-46dc-b388-64cdf909295f	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	personal_care	morning	Edna completed physio exercises independently.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 15:49:34.390945+01	2026-05-18 15:49:34.390945+01	f	\N	2026-05-21 12:06:53.790993+01
edfef9ae-a4d3-4018-8cd2-980c6721bb0c	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	general	morning	George calm. Engaged well with morning music session.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 15:49:34.390945+01	2026-05-18 15:49:34.390945+01	f	\N	2026-05-21 12:06:53.790993+01
d058adf3-4bfa-4cd4-81ea-d94f5358ec0f	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	general	morning	Dorothy good mood. Participated in flower arranging.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-18 15:49:34.390945+01	2026-05-18 15:49:34.390945+01	f	\N	2026-05-21 12:06:53.790993+01
9a6639a0-cacf-443b-9e3c-c2ae95d703cd	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	vitals	morning	BP: 148/94. GP notified — review booked.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-18 15:49:34.390945+01	2026-05-18 15:49:34.390945+01	f	\N	2026-05-21 12:06:53.790993+01
6100560e-02f9-4647-abe7-a20c705d2711	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	personal_care	morning	Arthur refused shower. Agreed after 20 mins reassurance.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-18 15:49:34.390945+01	2026-05-18 15:49:34.390945+01	f	\N	2026-05-21 12:06:53.790993+01
0e3c0a27-3e23-4105-8cf3-5f587f5e5101	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	general	night	George wandered at 02:30. Redirected and settled.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-18 15:49:34.390945+01	2026-05-18 15:49:34.390945+01	f	\N	2026-05-21 12:06:53.790993+01
9046e01e-e755-4746-b096-ee11d75c5563	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	general	\N	general completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
dcf2a2d3-15c3-4971-a9dd-fa2462a2a4ce	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	personal_care	\N	personal care completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
6d3f8674-810e-4f68-b7dc-bc99dd5c5c75	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	food_drink	\N	food drink completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
a70e876d-3c46-4952-aac6-114efd1e9b48	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	vitals	\N	vitals completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
252f2a53-3a06-4115-8a38-34f18df90cb9	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	repositioning	\N	repositioning completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
91300b44-079b-47b9-ab09-65f6d8d82159	9b95a09a-1b19-46dc-b388-64cdf909295f	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	general	\N	general completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
51e2f838-efe7-41cf-aaf5-3729f4637202	9b95a09a-1b19-46dc-b388-64cdf909295f	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	personal_care	\N	personal care completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
b3b7a5cd-e110-43ac-9aea-e1a30ad0eacf	9b95a09a-1b19-46dc-b388-64cdf909295f	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	food_drink	\N	food drink completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
edf50b42-c0dc-4007-a0e2-3b63e3b7ad0a	9b95a09a-1b19-46dc-b388-64cdf909295f	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	vitals	\N	vitals completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
b530dc22-2265-416d-9a1e-c756159d2557	9b95a09a-1b19-46dc-b388-64cdf909295f	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	repositioning	\N	repositioning completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
d67578c9-8dce-4471-837b-ea3cb2c7353a	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	general	\N	general completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
08845995-b4c3-421a-85fc-40dc48c189a7	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	general	\N	general completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
fdef87a3-adfc-4884-9bc0-5afc9c0eae0a	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	personal_care	\N	personal care completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
5bd990c0-5a7a-4d7d-a319-49deccfd48a2	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	food_drink	\N	food drink completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
f50e3f70-7be6-468c-90ae-d54ebcd14fb2	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	vitals	\N	vitals completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
d5af7f94-e3bb-4753-83b9-c5ae41c4e91d	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	repositioning	\N	repositioning completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
ddf8be6c-7b07-4ed4-931f-ac1885704c90	1259b91c-ad41-4c2d-a811-c23d4fdb2502	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	general	\N	general completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
24479e15-2f7f-41d8-b366-d562f20667d4	1259b91c-ad41-4c2d-a811-c23d4fdb2502	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	personal_care	\N	personal care completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
0defd70c-72ae-4695-8778-b2c39f8512e4	1259b91c-ad41-4c2d-a811-c23d4fdb2502	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	food_drink	\N	food drink completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
33bcc862-a727-4d0f-98e7-cc2cb86d7bca	1259b91c-ad41-4c2d-a811-c23d4fdb2502	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	vitals	\N	vitals completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
d83c4f50-782b-467f-8f42-33f4ed7de448	1259b91c-ad41-4c2d-a811-c23d4fdb2502	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	repositioning	\N	repositioning completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
9bf191ec-1d40-410f-a898-d73193c9fcc0	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	general	\N	general completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
cb762137-c66c-4f26-9552-fba04ca16591	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	personal_care	\N	personal care completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
70afff1a-dd34-475e-b152-b29763c8d4eb	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	food_drink	\N	food drink completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
96e043dc-dae7-4273-803f-1c8793eb8fc8	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	vitals	\N	vitals completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
56813f4b-80f3-42ff-8cb1-6fe7e212369b	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	repositioning	\N	repositioning completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
c914935a-2dec-4e9b-9eab-9537ebad7b25	9b95a09a-1b19-46dc-b388-64cdf909295f	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	general	\N	general completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
7378cd82-3849-4409-942a-2d538a92f60d	9b95a09a-1b19-46dc-b388-64cdf909295f	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	personal_care	\N	personal care completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
3b8e0f6c-9621-4c1e-baa8-1dc25495450b	9b95a09a-1b19-46dc-b388-64cdf909295f	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	food_drink	\N	food drink completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
e09b82d7-127f-47d7-b264-730b9d2f5dc7	9b95a09a-1b19-46dc-b388-64cdf909295f	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	vitals	\N	vitals completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
d69d9bf2-a2a3-47d3-980b-0ebcadda01df	9b95a09a-1b19-46dc-b388-64cdf909295f	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	repositioning	\N	repositioning completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
4cbd619c-bbb8-4d96-b456-42f25dd20ec9	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	personal_care	\N	personal care completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
4f97f442-328c-4a93-91c2-0fc9af6b7570	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	food_drink	\N	food drink completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
5c7374c9-0620-4858-b60a-d01db0da1e94	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	vitals	\N	vitals completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
61b2c49c-8b5a-490f-8021-4d82a71a5df9	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	repositioning	\N	repositioning completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
d8b3000b-43c5-4ea9-800f-4511f8c5917d	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	general	\N	general completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
d2752ae4-9357-400c-b2fa-f508586f3035	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	general	\N	general completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
5e7361ba-c3c2-41bc-ac89-c9b1abf3e2bd	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	personal_care	\N	personal care completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
40a64f8a-3d4e-4b50-9226-75702b2317ef	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	food_drink	\N	food drink completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
1ddd4aac-3c82-448c-a6ec-55626b065c3f	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	vitals	\N	vitals completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
50f44a99-8719-4d66-957c-f394d68d9f8c	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	repositioning	\N	repositioning completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
f0b2a1a4-a9bd-4d3e-9880-fd93ae8f8a03	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	general	\N	general completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
786a0ab9-9a9e-4972-82c6-a2c74cb1467a	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	personal_care	\N	personal care completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
a29bc30e-6116-450d-aaba-c2a632367e0b	1259b91c-ad41-4c2d-a811-c23d4fdb2502	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	general	\N	general completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
361f8b79-e8a8-42d5-aec8-0e9d017b3ad5	1259b91c-ad41-4c2d-a811-c23d4fdb2502	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	personal_care	\N	personal care completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
1cb7901b-2de6-46d4-8191-bde75a61ef6d	1259b91c-ad41-4c2d-a811-c23d4fdb2502	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	food_drink	\N	food drink completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
e54c415a-0a04-4943-8df8-c61d0402223a	1259b91c-ad41-4c2d-a811-c23d4fdb2502	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	vitals	\N	vitals completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
bcb5f53a-4b28-41e3-b243-44312a63c814	1259b91c-ad41-4c2d-a811-c23d4fdb2502	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	repositioning	\N	repositioning completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
14505562-d7f8-4bb1-8af2-4d8a72f3ad7e	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	general	\N	general completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
e79d48f4-dcb4-4468-ba1c-0462907a723a	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	personal_care	\N	personal care completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
5fcb6ab6-b663-4861-b3ab-89e95f6f190d	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	food_drink	\N	food drink completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
56a5cbc3-a497-464d-b2b6-3644f025dfb5	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	general	\N	general completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
0fc96b0b-0607-4e60-8f52-ac018ad3b7f8	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	personal_care	\N	personal care completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
ff1b0aec-fd8a-40fe-8cc4-412f623c9c59	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	food_drink	\N	food drink completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
66a36622-b6b1-4815-b5b8-e474eaa0ed4f	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	vitals	\N	vitals completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
c41b3fa5-104a-4187-a89f-fe3a129da972	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	repositioning	\N	repositioning completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
539bc5b2-95a7-4f50-b9bb-289c76ce855f	9b95a09a-1b19-46dc-b388-64cdf909295f	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	general	\N	general completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
53e50ddb-21ce-4dcd-96bf-37508562fc3e	9b95a09a-1b19-46dc-b388-64cdf909295f	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	personal_care	\N	personal care completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
85cb01b2-da43-47c0-a926-7499aa3e927f	9b95a09a-1b19-46dc-b388-64cdf909295f	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	food_drink	\N	food drink completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
ee32261e-41e5-4c92-9378-ca4d903d5478	9b95a09a-1b19-46dc-b388-64cdf909295f	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	vitals	\N	vitals completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
d39a403a-b425-488a-b6f4-5cf8af28ded8	9b95a09a-1b19-46dc-b388-64cdf909295f	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	repositioning	\N	repositioning completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
20ffe6fe-5c31-4a09-92e2-d0d30aff6c9d	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	general	\N	general completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
95c68810-be5b-462d-b6e2-81354cb9937d	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	personal_care	\N	personal care completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
f05648e4-9a04-405d-9698-a595d1b1b665	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	food_drink	\N	food drink completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
d3fe4f43-152f-4241-b852-a93b2045f552	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	vitals	\N	vitals completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
8b6914dc-5c17-41e7-9f4b-05bf66928911	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	repositioning	\N	repositioning completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
52bf9607-b0c9-4952-b025-eb3f607a2251	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	general	\N	general completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
e9c045a6-2ac7-47a7-ad07-577bd07037b5	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	personal_care	\N	personal care completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
ff8a80bf-314c-414a-8518-dcb257918039	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	food_drink	\N	food drink completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
29521f46-7e5e-414f-bb03-9e0cd3b5a294	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	vitals	\N	vitals completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
6ee71c00-b800-41fd-b3ad-7dfaf8956083	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	repositioning	\N	repositioning completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
7bc0e19d-de6c-4d11-937c-e3420c330518	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	food_drink	\N	food drink completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
cd9f1256-b692-40c4-afd9-cfd89cd31833	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	vitals	\N	vitals completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
b7cd5615-5da7-4374-a5fa-47be80d27979	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	repositioning	\N	repositioning completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
934fb3d7-0f76-4c85-8310-43f6ee28bd20	1259b91c-ad41-4c2d-a811-c23d4fdb2502	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	general	\N	general completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
fbd2f7d0-4d69-4ef8-8c18-3524e95051aa	1259b91c-ad41-4c2d-a811-c23d4fdb2502	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	personal_care	\N	personal care completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
3d02a703-e286-4b2e-bd68-87a77303e56e	1259b91c-ad41-4c2d-a811-c23d4fdb2502	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	food_drink	\N	food drink completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
5379b758-01e2-4eb4-b838-ea3a6fa33967	1259b91c-ad41-4c2d-a811-c23d4fdb2502	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	vitals	\N	vitals completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
291849a5-8708-4135-a545-4a3090be0484	1259b91c-ad41-4c2d-a811-c23d4fdb2502	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	repositioning	\N	repositioning completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
cd9a38f4-ee41-41a6-84f9-16ffb7b3cfec	1259b91c-ad41-4c2d-a811-c23d4fdb2502	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	general	\N	general completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
22e63149-5e76-4cb7-9324-d740b0626248	1259b91c-ad41-4c2d-a811-c23d4fdb2502	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	personal_care	\N	personal care completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
81b53999-fa1f-400a-93ae-c716a8789c12	1259b91c-ad41-4c2d-a811-c23d4fdb2502	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	food_drink	\N	food drink completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
1c148f9a-1e2e-47f9-8370-427349153111	1259b91c-ad41-4c2d-a811-c23d4fdb2502	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	vitals	\N	vitals completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
68aa5e8f-3c54-4342-ac37-3fb59c5eb006	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	general	\N	general completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
4d756e33-9406-4c42-afec-78822c4d984c	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	personal_care	\N	personal care completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
76b340ad-5c91-4800-ba39-b89dd7129452	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	food_drink	\N	food drink completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
75977d3a-26f2-4ae8-bd6a-9b7b82df9294	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	vitals	\N	vitals completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
90b8ed57-51d2-4db8-a00a-3b1a2055b480	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	repositioning	\N	repositioning completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
759c2e09-4efd-41d0-9cce-a5ceb42557bc	9b95a09a-1b19-46dc-b388-64cdf909295f	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	general	\N	general completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
21a2584e-1f33-401a-a805-9436f5def3cc	9b95a09a-1b19-46dc-b388-64cdf909295f	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	personal_care	\N	personal care completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
f09945fc-8472-4c7f-ad03-1076f4b5fe94	9b95a09a-1b19-46dc-b388-64cdf909295f	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	food_drink	\N	food drink completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
e3cb764e-cf3c-4add-b743-8c6c97871447	9b95a09a-1b19-46dc-b388-64cdf909295f	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	vitals	\N	vitals completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
000cce52-0840-4370-94d2-8ad3389ed17a	9b95a09a-1b19-46dc-b388-64cdf909295f	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	repositioning	\N	repositioning completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
044d10c6-8003-45a7-9f54-96214d73170e	9b95a09a-1b19-46dc-b388-64cdf909295f	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	general	\N	general completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
6f80218b-21f0-4c83-a43c-d96a4f4c9721	9b95a09a-1b19-46dc-b388-64cdf909295f	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	personal_care	\N	personal care completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
4cd2e599-9572-42ab-9012-41c657f7dce4	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	general	\N	general completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
190bf7c6-303b-4166-b3e0-f4bb5e73ca3d	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	personal_care	\N	personal care completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
cbe9fe57-588c-4e99-a804-a0e9803fc29b	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	food_drink	\N	food drink completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
b651a455-e99f-45be-9ece-1bd39b05c9a4	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	vitals	\N	vitals completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
5a04afae-d29a-4252-a4c6-16b624c2e40e	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	repositioning	\N	repositioning completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
1c0069f6-1a79-45be-91cb-ab4f7bf0e3ae	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	general	\N	general completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
5ef5cc12-8714-4cc4-ae18-623d11f523c2	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	personal_care	\N	personal care completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
3f849f00-649b-4662-bdaf-2900ecc2d5d0	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	food_drink	\N	food drink completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
cfedad2c-9911-4961-96e8-bbde8a0249ce	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	vitals	\N	vitals completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
0ddbc0c2-07ea-45eb-9959-16969f91b389	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	general	\N	general completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
ae9ace9d-48d7-4dbe-9c68-de0dbf15bd62	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	personal_care	\N	personal care completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
95aeb447-2ff7-4421-9693-385977665964	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	food_drink	\N	food drink completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
99e7835a-17c4-463c-8829-8858f9c052e8	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	vitals	\N	vitals completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
2b2791e5-f221-4e7f-850e-427ddcec5661	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	repositioning	\N	repositioning completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
59175b47-fbe1-4759-b069-aca15f080668	1259b91c-ad41-4c2d-a811-c23d4fdb2502	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	general	\N	general completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
c156a11b-81b2-4d7b-8423-25281290f62f	1259b91c-ad41-4c2d-a811-c23d4fdb2502	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	personal_care	\N	personal care completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
f3161e81-0f1f-483e-9514-27f619b17cbe	1259b91c-ad41-4c2d-a811-c23d4fdb2502	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	food_drink	\N	food drink completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
abec6c91-cea8-4ac2-b525-f71da62fb8c0	1259b91c-ad41-4c2d-a811-c23d4fdb2502	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	vitals	\N	vitals completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
c2ecaedb-1b26-401c-ac76-0c0f94854701	1259b91c-ad41-4c2d-a811-c23d4fdb2502	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	repositioning	\N	repositioning completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
ff05e0c7-7bc2-4e24-a048-f6686a51a1e7	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	general	\N	general completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
2804b63c-fd17-444a-a7e5-992b85e41242	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	personal_care	\N	personal care completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
0106a5b3-641e-4ae0-9bd6-923e90addd36	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	food_drink	\N	food drink completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
5c5e15e8-3aa2-461d-a69a-021ee3d71f8a	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	vitals	\N	vitals completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
3de8c970-d4f4-4149-b436-ccd0dd87876b	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	repositioning	\N	repositioning completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
fb786656-9400-434e-9e33-a2fdfc21e4de	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	general	\N	general completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
eeb4d91d-70d1-4909-8c09-b051b1a713b8	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	personal_care	\N	personal care completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
40645369-412d-4ccc-913c-d131c7f19e64	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	food_drink	\N	food drink completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
95528bba-db2a-41b4-b12c-6541e366bab8	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	vitals	\N	vitals completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
d9dc2a40-c2c0-44f8-95ff-a090fb749fcd	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	repositioning	\N	repositioning completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
38649d9c-d513-4ee5-a39d-53c5fd9c591f	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	general	\N	general completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
b468454e-e70d-4a17-bfb5-ba7b14cd593e	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	personal_care	\N	personal care completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
e8e9fdad-5d65-4fc8-a0b7-6fc435b67c9a	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	food_drink	\N	food drink completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
6ec25e55-943f-4a45-892e-68929bc02da7	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	vitals	\N	vitals completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
d045c38b-eb36-4704-8d7c-1c1a42bbb6e5	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	repositioning	\N	repositioning completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
0f294541-b76d-42e8-87fe-0615c493f067	9b95a09a-1b19-46dc-b388-64cdf909295f	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	general	\N	general completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
a621ab93-fc75-4df1-8842-e3eb76fb2bb9	9b95a09a-1b19-46dc-b388-64cdf909295f	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	personal_care	\N	personal care completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
2ba04cfc-106d-40d1-8884-e36c98eaa42d	9b95a09a-1b19-46dc-b388-64cdf909295f	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	food_drink	\N	food drink completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
897df467-56c1-4e81-98c9-5f44221436e6	9b95a09a-1b19-46dc-b388-64cdf909295f	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	vitals	\N	vitals completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
7a64274c-fcf1-4d3e-a5da-4ce14ea56773	9b95a09a-1b19-46dc-b388-64cdf909295f	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	repositioning	\N	repositioning completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
0a5549c8-d7ca-4325-8e64-fd7f93d20b0a	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	repositioning	\N	repositioning completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
120a94ec-212f-40c6-93be-16ed7a385dc4	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	general	\N	general completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
f1b59f1f-0524-49b4-960c-b9eec4b68754	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	personal_care	\N	personal care completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
57864fc4-24b9-4b85-af7a-18dfeddc1a85	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	food_drink	\N	food drink completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
b1f1b40c-3258-45f8-a843-ae4ff40000d6	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	vitals	\N	vitals completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
d1b20415-97be-4e1f-a561-96a2754078fa	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	general	\N	general completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
47e046b2-c46c-466e-af33-9891490b0e14	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	personal_care	\N	personal care completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
d85aaad3-757e-41b9-b275-79e0d48958f1	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	food_drink	\N	food drink completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
782f90c7-45dd-4ec8-ac20-e25cffded909	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	vitals	\N	vitals completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
8694cb57-c80d-4aa0-b8bc-62dcbcc53567	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	repositioning	\N	repositioning completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
01467dba-ba77-4f71-8b55-bdd6353edb82	1259b91c-ad41-4c2d-a811-c23d4fdb2502	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	general	\N	general completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
2ce73742-b251-47d2-93d4-c2f75a689693	1259b91c-ad41-4c2d-a811-c23d4fdb2502	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	personal_care	\N	personal care completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
6d2d80ed-3844-4686-bbc9-978eff209d3d	1259b91c-ad41-4c2d-a811-c23d4fdb2502	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	food_drink	\N	food drink completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
d9a980c4-256e-40a2-8675-b1c38ac8d507	1259b91c-ad41-4c2d-a811-c23d4fdb2502	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	vitals	\N	vitals completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
86ad580e-2826-4128-805f-7999c35e498f	1259b91c-ad41-4c2d-a811-c23d4fdb2502	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	repositioning	\N	repositioning completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
ffccb8a8-5b4a-41f8-be5d-4b3cb62637ed	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	general	\N	general completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
3024b4c5-94d6-4cd8-8ffb-7a12b53f8899	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	personal_care	\N	personal care completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
29cde579-44f8-49be-adc0-514af4bf2e0e	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	food_drink	\N	food drink completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
7b82231d-d618-4bda-ad5c-9c1b8a854448	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	vitals	\N	vitals completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
c3a480c0-53af-488a-82a9-1b6eac31199c	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	repositioning	\N	repositioning completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
eef24edf-86d1-4b92-8954-ab25f13b5450	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	general	\N	general completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
24e90a48-b859-4e02-8228-90c21576a979	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	personal_care	\N	personal care completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
e4e6445d-8454-471e-92fb-d8f058659cc6	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	food_drink	\N	food drink completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
0974dab2-0ee4-4336-bc90-e02d3ba3c9e1	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	vitals	\N	vitals completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
ab618fb8-9e7c-4b7b-ae24-be1365f3a920	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	repositioning	\N	repositioning completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-18	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
650d547f-1f84-45a5-8979-7f6413668fd7	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	general	\N	general completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
70cf0925-c1e1-4867-ba51-6dfad8e03291	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	personal_care	\N	personal care completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
eb775804-c8df-41e6-9efa-5ef2743c72db	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	food_drink	\N	food drink completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
39552e9d-b7d8-46ff-a1cf-722dfe7c4784	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	vitals	\N	vitals completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
bd0d4262-6f1e-4892-a117-f562fb3da473	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	repositioning	\N	repositioning completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
3a6ea257-0e71-4480-a261-6b3de9029ce2	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	vitals	\N	vitals completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
fc332864-6921-49e7-a3a6-98747e7ff5bf	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	repositioning	\N	repositioning completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
5e5f14d6-6938-4bf1-b698-15a54fa19021	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	general	\N	general completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
dbc025e8-515d-4110-b0c1-f11f89722cbc	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	personal_care	\N	personal care completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
e57bfb92-3d43-4460-9f0f-cde76396974e	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	food_drink	\N	food drink completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
64b9defc-6c61-4a2f-986f-560c6b2de214	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	vitals	\N	vitals completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
3313ca0a-d0ae-4daa-bd8f-8d23886d6de4	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	repositioning	\N	repositioning completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
098e91e5-04a3-41e8-bfca-1989abfc7dc4	9b95a09a-1b19-46dc-b388-64cdf909295f	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	food_drink	\N	food drink completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
77f3779a-9d50-4056-a48c-f42f6d39edf5	9b95a09a-1b19-46dc-b388-64cdf909295f	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	vitals	\N	vitals completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
97e3d613-4c12-4fd1-9954-6768c3070d70	9b95a09a-1b19-46dc-b388-64cdf909295f	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	repositioning	\N	repositioning completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
3568a721-53ab-43f5-a190-9b66ee8b9807	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	repositioning	\N	repositioning completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:17:41.787345+01	2026-05-18 21:17:41.787345+01	f	\N	2026-05-21 12:06:53.790993+01
b22c89d9-f32a-4376-9732-186ac66414a0	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	personal_care	\N	personal care completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
3c2177b4-99c5-4e32-93f3-ead48861e03d	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	food_drink	\N	food drink completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
f18e62a5-a781-402f-9457-54ec3e7715a0	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	vitals	\N	vitals completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
de754467-d0b6-4170-9523-69a95cae47f6	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	repositioning	\N	repositioning completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-17	2026-05-17 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
a74c37c6-592f-49a5-8717-63e9c29061e3	1259b91c-ad41-4c2d-a811-c23d4fdb2502	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	repositioning	\N	repositioning completed. Resident comfortable and cooperative.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-16	2026-05-16 21:15:37.429794+01	2026-05-18 21:15:37.429794+01	f	\N	2026-05-21 12:06:53.790993+01
5dd60f9c-3fca-4ca5-b458-b704c31c6dc0	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	incident	morning	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-21	2026-05-21 11:58:12.464516+01	2026-05-21 11:58:12.464516+01	f	\N	2026-05-21 12:06:53.790993+01
437e6b61-7fd3-43ed-af35-b0e9e2f20805	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	behaviour	morning	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-21	2026-05-21 12:07:53.037693+01	2026-05-21 12:07:53.037693+01	f	\N	2026-05-21 12:07:53.037693+01
d699a0e9-9dcd-4dfb-b529-d959f1b83ec9	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	vitals	morning	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-21	2026-05-21 12:07:53.188781+01	2026-05-21 12:07:53.188781+01	f	\N	2026-05-21 12:07:53.188781+01
214bf5f8-7fb3-4625-9141-0e2d85b1cd19	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	welfare_check	morning	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-21	2026-05-21 12:07:53.340987+01	2026-05-21 12:07:53.340987+01	f	\N	2026-05-21 12:07:53.340987+01
6cf72ef9-9fbc-4881-9ad8-a74834dd8608	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	general	morning	All well	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-21	2026-05-21 12:12:44.49125+01	2026-05-21 12:12:44.49125+01	f	\N	2026-05-21 12:12:44.49125+01
aa5d9e84-bd9d-445d-8596-b3c44e5195af	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	fluid	morning	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-21	2026-05-21 12:12:44.753867+01	2026-05-21 12:12:44.753867+01	f	\N	2026-05-21 12:12:44.753867+01
c9fb399c-8822-45e1-a37d-2d57ae02b6d8	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	food	morning	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-21	2026-05-21 12:12:45.009089+01	2026-05-21 12:12:45.009089+01	f	\N	2026-05-21 12:12:45.009089+01
b5c1449a-ed86-4ea2-9dd7-b3319bf1ca21	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	vitals	morning	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-21	2026-05-21 12:12:45.284728+01	2026-05-21 12:12:45.284728+01	f	\N	2026-05-21 12:12:45.284728+01
fc4327b4-1870-47c2-ac9d-f003f1c7b993	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	vitals	morning	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-21	2026-05-21 12:12:45.566293+01	2026-05-21 12:12:45.566293+01	f	\N	2026-05-21 12:12:45.566293+01
222ed204-f310-42f6-acfa-e3d5d22e7e68	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	vitals	morning	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-21	2026-05-21 12:12:45.833096+01	2026-05-21 12:12:45.833096+01	f	\N	2026-05-21 12:12:45.833096+01
9ee7a247-ce3e-4190-9521-15f4ac107e8f	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	incident	morning	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-21	2026-05-21 12:12:46.094805+01	2026-05-21 12:12:46.094805+01	f	\N	2026-05-21 12:12:46.094805+01
a76fb035-b195-40f6-9267-c73dbfbb373e	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	behaviour	morning	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-21	2026-05-21 12:12:46.380017+01	2026-05-21 12:12:46.380017+01	f	\N	2026-05-21 12:12:46.380017+01
0846daa2-7a19-4e13-b15e-1ae3c5cb7f64	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	welfare_check	morning	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-21	2026-05-21 12:12:46.676538+01	2026-05-21 12:12:46.676538+01	f	\N	2026-05-21 12:12:46.676538+01
d4c65772-4d00-47fa-97e3-a71f78bb7175	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	repositioning	morning	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-21	2026-05-21 12:12:46.945236+01	2026-05-21 12:12:46.945236+01	f	\N	2026-05-21 12:12:46.945236+01
72315baf-5c32-4cf4-8b77-11dcb49fc2bf	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	oral_care	morning	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-21	2026-05-21 12:15:34.753472+01	2026-05-21 12:15:34.753472+01	f	\N	2026-05-21 12:15:34.753472+01
31bae79b-2a21-46d6-9fee-0c97f240b179	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	visit	afternoon	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-21	2026-05-21 12:15:34.876256+01	2026-05-21 12:15:34.876256+01	f	\N	2026-05-21 12:15:34.876256+01
949a0df3-057b-4427-a4f6-12f8c05098a7	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	one_to_one	morning	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-21	2026-05-21 12:15:34.989483+01	2026-05-21 12:15:34.989483+01	f	\N	2026-05-21 12:15:34.989483+01
e0a6999b-3b4b-4083-a41f-8e7444ad9c50	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	social_activity	afternoon	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-21	2026-05-21 12:15:35.109521+01	2026-05-21 12:15:35.109521+01	f	\N	2026-05-21 12:15:35.109521+01
dc8595d6-195e-4168-9bcb-4d98561b3c64	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	communication	morning	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-21	2026-05-21 12:15:35.231422+01	2026-05-21 12:15:35.231422+01	f	\N	2026-05-21 12:15:35.231422+01
d5b8456a-7c53-4ad4-bfb3-64066a4465b4	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	prn_medication	morning	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-21	2026-05-21 12:15:35.346293+01	2026-05-21 12:15:35.346293+01	f	\N	2026-05-21 12:15:35.346293+01
41e10fd6-5011-4c82-9da8-ad307c2cbea5	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	handover	morning	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-21	2026-05-21 12:15:35.46736+01	2026-05-21 12:15:35.46736+01	f	\N	2026-05-21 12:15:35.46736+01
c0bdc51f-7a4a-42ae-af06-f6a7195afff1	92818c0f-b5d7-46f7-8d04-8699b01c2482	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	general_note	morning	System-created placeholder - update with real observations	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-22	2026-05-22 09:45:45.323414+01	2026-05-22 09:45:45.323414+01	f	\N	2026-05-22 09:45:45.323414+01
5146c75a-0c38-41b3-8245-7545e555e47d	11111111-0000-0000-0000-000000000002	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	general_note	morning	System-created placeholder - update with real observations	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-22	2026-05-22 09:45:45.383599+01	2026-05-22 09:45:45.383599+01	f	\N	2026-05-22 09:45:45.383599+01
b6f5acbd-3e11-4112-bdf2-4bddeb7dd7dd	11111111-0000-0000-0000-000000000003	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	general_note	morning	System-created placeholder - update with real observations	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-22	2026-05-22 09:45:45.386396+01	2026-05-22 09:45:45.386396+01	f	\N	2026-05-22 09:45:45.386396+01
e1912735-9987-434d-9968-84f785f9ca9d	11111111-0000-0000-0000-000000000004	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	general_note	morning	System-created placeholder - update with real observations	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-22	2026-05-22 09:45:45.388988+01	2026-05-22 09:45:45.388988+01	f	\N	2026-05-22 09:45:45.388988+01
180c67e4-ff93-4c96-a306-f9461b9f3c6f	11111111-0000-0000-0000-000000000005	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	general_note	morning	System-created placeholder - update with real observations	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-22	2026-05-22 09:45:45.391765+01	2026-05-22 09:45:45.391765+01	f	\N	2026-05-22 09:45:45.391765+01
02a450bc-967f-46bc-abd7-6845c52ad11f	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	general_note	morning	System-created placeholder - update with real observations	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-22	2026-05-22 09:45:45.413858+01	2026-05-22 09:45:45.413858+01	f	\N	2026-05-22 09:45:45.413858+01
172de7fc-040e-4a32-bdc2-64e5b0a963f5	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	general_note	morning	System-created placeholder - update with real observations	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-22	2026-05-22 09:45:45.416642+01	2026-05-22 09:45:45.416642+01	f	\N	2026-05-22 09:45:45.416642+01
68350da9-4054-463d-a5ef-00d309024e28	1259b91c-ad41-4c2d-a811-c23d4fdb2502	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	general_note	morning	System-created placeholder - update with real observations	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-22	2026-05-22 09:45:45.418961+01	2026-05-22 09:45:45.418961+01	f	\N	2026-05-22 09:45:45.418961+01
798decee-dcc7-42b4-8399-5abfc3c70f13	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	general_note	morning	System-created placeholder - update with real observations	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-22	2026-05-22 09:45:45.421276+01	2026-05-22 09:45:45.421276+01	f	\N	2026-05-22 09:45:45.421276+01
afc25c2a-7e6c-4fc8-bf1f-d101af108bc7	9b95a09a-1b19-46dc-b388-64cdf909295f	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	general_note	morning	System-created placeholder - update with real observations	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-22	2026-05-22 09:45:45.423046+01	2026-05-22 09:45:45.423046+01	f	\N	2026-05-22 09:45:45.423046+01
77f75861-b810-4112-a0d4-35851cee0221	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	general_note	morning	System-created placeholder - update with real observations	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-05-22	2026-05-22 09:45:45.424869+01	2026-05-22 09:45:45.424869+01	f	\N	2026-05-22 09:45:45.424869+01
\.


--
-- Data for Name: handover_signatures; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.handover_signatures (id, home_id, shift_date, shift_type, role, staff_id, signature_data, signed_at) FROM stdin;
\.


--
-- Data for Name: home_postcodes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.home_postcodes (id, home_id, postcode, label, latitude, longitude, created_at, radius) FROM stdin;
\.


--
-- Data for Name: homes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.homes (id, organisation_id, name, address1, address2, city, postcode, phone, email, cqc_location_id, latitude, longitude, geofence_radius, qr_token, manager_name, is_active, created_at) FROM stdin;
5c027814-a0f9-44f3-bad4-138e4783fd51	00000000-0000-0000-0000-000000000001	Comprehensive Care Home	123 Care Street	\N	\N	SW1A 1AA	\N	\N	\N	\N	\N	200	3036553e27cc6a2c099216ddc1f86b0d	\N	t	2026-05-18 08:30:09.666008+01
ef5404d6-6b30-48f2-af31-79ee146810db	00000000-0000-0000-0000-000000000001	Sunrise Care Home	14 Meadow Lane	\N	\N	LE3 5BP	0116 456 7890	\N	\N	\N	\N	200	41b39573a7e14e6f8b02113a7d1fae94	Sarah Johnson	t	2026-05-18 15:49:34.390945+01
\.


--
-- Data for Name: mar_records; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mar_records (id, su_id, home_id, medication_id, medication_name, dose, route, frequency, scheduled_time, record_date, given, given_at, given_by, witnessed_by, refused, refused_reason, omitted, omit_reason, notes, created_at) FROM stdin;
4e5a9b8e-2498-45ce-a8e8-07faabf676de	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	Metformin 500mg	500mg	oral	Twice daily	08:00:00	2026-05-18	t	2026-05-18 12:49:34.390945+01	8fe357e2-8093-43d5-be11-ea37d0b3e206	\N	f	\N	f	\N	\N	2026-05-18 15:49:34.390945+01
f196de8d-5975-4968-a557-32dc8ac6503e	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	Aricept 10mg	10mg	oral	Once daily	08:00:00	2026-05-18	t	2026-05-18 12:49:34.390945+01	8fe357e2-8093-43d5-be11-ea37d0b3e206	\N	f	\N	f	\N	\N	2026-05-18 15:49:34.390945+01
cb6d1c09-b673-4412-affe-65786df09ba5	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	Levodopa 100mg	100mg	oral	Three times daily	08:00:00	2026-05-18	t	2026-05-18 12:49:34.390945+01	8fe357e2-8093-43d5-be11-ea37d0b3e206	\N	f	\N	f	\N	\N	2026-05-18 15:49:34.390945+01
4e35305f-266d-41b6-9a5d-a4e00eae1181	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	Amlodipine 5mg	5mg	oral	Once daily	08:00:00	2026-05-18	t	2026-05-18 12:49:34.390945+01	8fe357e2-8093-43d5-be11-ea37d0b3e206	\N	f	\N	f	\N	\N	2026-05-18 15:49:34.390945+01
19926909-d39d-43e2-b32b-635955febc3b	1259b91c-ad41-4c2d-a811-c23d4fdb2502	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	Salbutamol inhaler	2 puffs	inhaled	As required	08:00:00	2026-05-18	t	2026-05-18 12:49:34.390945+01	8fe357e2-8093-43d5-be11-ea37d0b3e206	\N	f	\N	f	\N	\N	2026-05-18 15:49:34.390945+01
1d71e37e-adf2-4261-a78a-2f6935533ece	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	Furosemide 40mg	40mg	oral	Once daily	08:00:00	2026-05-18	\N	\N	\N	\N	f	\N	f	\N	\N	2026-05-18 15:49:34.390945+01
9da6cdd7-d25f-4d4c-907d-7b2c37c112d2	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	Digoxin 125mcg	125mcg	oral	Once daily	08:00:00	2026-05-18	t	2026-05-18 12:49:34.390945+01	8fe357e2-8093-43d5-be11-ea37d0b3e206	\N	f	\N	f	\N	\N	2026-05-18 15:49:34.390945+01
dd7a4afd-6dfc-4189-ba23-fbe30cdfa3d5	9b95a09a-1b19-46dc-b388-64cdf909295f	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	Sertraline 50mg	50mg	oral	Once daily	08:00:00	2026-05-18	t	2026-05-18 12:49:34.390945+01	8fe357e2-8093-43d5-be11-ea37d0b3e206	\N	f	\N	f	\N	\N	2026-05-18 15:49:34.390945+01
c1713d80-0d2a-436b-858f-851c1c592f45	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	Donepezil 10mg	10mg	oral	Once daily	21:00:00	2026-05-18	\N	\N	\N	\N	f	\N	f	\N	\N	2026-05-18 15:49:34.390945+01
324c3c45-4517-4770-aed3-36553e94af72	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	Memantine 20mg	20mg	oral	Once daily	08:00:00	2026-05-18	t	2026-05-18 12:49:34.390945+01	8fe357e2-8093-43d5-be11-ea37d0b3e206	\N	f	\N	f	\N	\N	2026-05-18 15:49:34.390945+01
355b480f-588a-4039-9456-cf1b65b07c81	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	Amlodipine 5mg	5mg	oral	Once daily	08:00:00	2026-05-18	\N	\N	\N	\N	f	\N	f	\N	\N	2026-05-18 21:17:41.787345+01
3d02c0fb-1e49-47a3-983f-1bca709c4970	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	Metformin 500mg	500mg	oral	Twice daily	08:00:00	2026-05-18	\N	\N	\N	\N	f	\N	f	\N	\N	2026-05-18 21:17:41.787345+01
152e1453-bf2e-4917-80ca-d037987172f9	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	Amlodipine 5mg	5mg	oral	Once daily	08:00:00	2026-05-18	\N	\N	\N	\N	f	\N	f	\N	\N	2026-05-18 21:15:37.429794+01
db9c0e1f-256b-4630-a9b9-c93dade0ef83	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	Metformin 500mg	500mg	oral	Twice daily	08:00:00	2026-05-18	\N	\N	\N	\N	f	\N	f	\N	\N	2026-05-18 21:15:37.429794+01
cb548401-f3cd-408d-89e8-bbdd7c462e28	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	Levodopa 100mg	100mg	oral	Three times daily	08:00:00	2026-05-18	\N	\N	\N	\N	f	\N	f	\N	\N	2026-05-18 21:17:41.787345+01
cb48188e-7c37-4fc5-9d31-96253bf34b4e	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	Levodopa 100mg	100mg	oral	Three times daily	08:00:00	2026-05-18	\N	\N	\N	\N	f	\N	f	\N	\N	2026-05-18 21:15:37.429794+01
14244f8d-2337-479c-bd61-732b554c929e	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	8da736ea-a3b1-4321-b0a2-bf8d185f53e0	\N	\N	\N	\N	\N	2026-05-19	t	\N	e951bf8c-fc86-4771-80ad-b903f754ad6f	\N	f	\N	f	\N	\N	2026-05-19 10:25:10.371648+01
947d4445-892a-4879-ab0a-e312f8c0985d	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	5c027814-a0f9-44f3-bad4-138e4783fd51	01fdc063-8aa2-4e5e-a390-deca3cfa3816	\N	\N	\N	\N	\N	2026-05-19	f	\N	e951bf8c-fc86-4771-80ad-b903f754ad6f	\N	t	\N	f	\N	\N	2026-05-19 10:25:23.986436+01
c8318595-a8a3-452a-85de-95d33f6ffc0c	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	8da736ea-a3b1-4321-b0a2-bf8d185f53e0	\N	\N	\N	\N	08:00:00	2026-05-21	t	\N	e951bf8c-fc86-4771-80ad-b903f754ad6f	\N	f	\N	f	\N	\N	2026-05-21 12:17:00.651941+01
\.


--
-- Data for Name: medication_stock; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.medication_stock (id, su_id, medication_id, current_count, last_counted_by, last_counted_at, notes, home_id, medication_name, form, strength, quantity_remaining, unit, reorder_threshold, batch_number, supplier, last_updated_by, expiry_date, updated_at) FROM stdin;
bf755c36-fab2-40ad-b6f9-03e1e78927c9	4185a367-406c-4f44-a395-4c1e66c2a9fb	\N	0.00	\N	2026-05-18 15:49:34.390945+01	\N	5c027814-a0f9-44f3-bad4-138e4783fd51	Metformin	tablet	500mg	28.00	tablets	14.00	\N	\N	8fe357e2-8093-43d5-be11-ea37d0b3e206	\N	2026-05-21 12:18:46.700165+01
d760f784-3c47-4b1b-a391-d9d730a50214	4185a367-406c-4f44-a395-4c1e66c2a9fb	\N	0.00	\N	2026-05-18 15:49:34.390945+01	\N	5c027814-a0f9-44f3-bad4-138e4783fd51	Donepezil	tablet	10mg	28.00	tablets	7.00	\N	\N	8fe357e2-8093-43d5-be11-ea37d0b3e206	\N	2026-05-21 12:18:46.700165+01
c5871788-b680-4e7c-a16e-9fa0faf1647a	8f0ebcf2-0cae-445f-b962-838445e5014a	\N	0.00	\N	2026-05-18 15:49:34.390945+01	\N	5c027814-a0f9-44f3-bad4-138e4783fd51	Levodopa	tablet	100mg	60.00	tablets	14.00	\N	\N	8fe357e2-8093-43d5-be11-ea37d0b3e206	\N	2026-05-21 12:18:46.700165+01
88644963-fefe-4fdc-8a62-9b7f1aeb0e4f	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	\N	0.00	\N	2026-05-18 15:49:34.390945+01	\N	5c027814-a0f9-44f3-bad4-138e4783fd51	Furosemide	tablet	40mg	5.00	tablets	7.00	\N	\N	8fe357e2-8093-43d5-be11-ea37d0b3e206	\N	2026-05-21 12:18:46.700165+01
0e568a3c-9ea4-46dd-bf37-926308a001a5	\N	\N	0.00	\N	2026-05-21 11:58:12.288387+01	\N	5c027814-a0f9-44f3-bad4-138e4783fd51	Paracetamol	\N	500mg	100.00	tablets	7.00	\N	\N	e951bf8c-fc86-4771-80ad-b903f754ad6f	\N	2026-05-21 12:18:46.700165+01
ad1cd036-a06f-4181-b628-8b781276cebf	\N	\N	0.00	\N	2026-05-21 12:17:00.794609+01	\N	5c027814-a0f9-44f3-bad4-138e4783fd51	Ibuprofen	tablet	400mg	49.00	tablets	10.00	\N	\N	e951bf8c-fc86-4771-80ad-b903f754ad6f	\N	2026-05-21 12:19:01.464572+01
77068845-d276-4e06-9a77-25bd8420b6ee	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	\N	0.00	\N	2026-05-18 15:49:34.390945+01	\N	5c027814-a0f9-44f3-bad4-138e4783fd51	Donepezil	tablet	10mg	5.00	tablets	7.00	\N	\N	e951bf8c-fc86-4771-80ad-b903f754ad6f	\N	2026-05-21 13:02:44.962086+01
\.


--
-- Data for Name: medication_stock_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.medication_stock_log (id, stock_id, adjusted_by, adjustment_type, quantity_change, quantity_before, quantity_after, notes, created_at) FROM stdin;
92a32627-b9ef-4398-af8b-16240c4e7482	ad1cd036-a06f-4181-b628-8b781276cebf	e951bf8c-fc86-4771-80ad-b903f754ad6f	administered	-1.00	50.00	49.00	Given to resident	2026-05-21 12:19:01.466366+01
e8b5925c-756c-4b7c-ae77-5b35872e1fcf	77068845-d276-4e06-9a77-25bd8420b6ee	e951bf8c-fc86-4771-80ad-b903f754ad6f	administered	-1.00	6.00	5.00	\N	2026-05-21 13:02:44.964955+01
\.


--
-- Data for Name: meeting_notes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.meeting_notes (id, event_id, created_by, notes, action_points, concerns, attendees, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: meeting_signoffs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.meeting_signoffs (id, event_id, staff_id, signed_at) FROM stdin;
\.


--
-- Data for Name: must_scores; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.must_scores (id, su_id, home_id, assessed_by, weight_kg, height_cm, bmi, must_score, action_plan, next_assessment_date, created_at, bmi_score, weight_loss_score, acute_disease_score, total_score, risk_level) FROM stdin;
4dc739c2-4944-4b18-bae5-9a44d778a7c9	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	70.00	170.00	24.20	\N	\N	\N	2026-05-21 12:15:34.554052+01	0	0	0	0	low
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, recipient_id, home_id, title, body, type, link, is_read, read_at, created_at) FROM stdin;
5c364e4b-3d9e-4381-bc44-62a2e2bc0d66	0dd6be56-890b-4e27-9d15-a564ebd7f094	5c027814-a0f9-44f3-bad4-138e4783fd51	Care plan overdue	Dorothy Williams medical care plan is 5 days overdue.	warning	/care-plans	f	\N	2026-05-18 15:49:34.390945+01
d0e35994-09fd-4062-919a-c83d0e752640	0dd6be56-890b-4e27-9d15-a564ebd7f094	5c027814-a0f9-44f3-bad4-138e4783fd51	Leave request pending	Priya Sharma has requested annual leave — please review.	info	/holidays	f	\N	2026-05-18 15:49:34.390945+01
91f3b4dc-5585-4484-8899-eb49f482fae9	8fe357e2-8093-43d5-be11-ea37d0b3e206	5c027814-a0f9-44f3-bad4-138e4783fd51	MAR chart gap	Furosemide for Arthur Davies not recorded this morning.	alert	/mar	f	\N	2026-05-18 15:49:34.390945+01
6de34c6a-2798-4c63-8559-2e1c7ab3d21e	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	5c027814-a0f9-44f3-bad4-138e4783fd51	test	test	info	\N	f	\N	2026-05-19 10:33:52.583803+01
8ba3d9ca-fde3-4832-a457-58ad91fb63df	a181f22b-3769-4c52-bb19-861d5c3d2126	5c027814-a0f9-44f3-bad4-138e4783fd51	test	test	info	\N	f	\N	2026-05-19 10:33:52.631864+01
a635bca4-858e-4882-8661-646988b24885	0dd6be56-890b-4e27-9d15-a564ebd7f094	5c027814-a0f9-44f3-bad4-138e4783fd51	test	test	info	\N	f	\N	2026-05-19 10:33:52.636956+01
e70ed8b4-423f-4e33-8d2e-3c0364e21b36	8fe357e2-8093-43d5-be11-ea37d0b3e206	5c027814-a0f9-44f3-bad4-138e4783fd51	test	test	info	\N	f	\N	2026-05-19 10:33:52.639247+01
fa04561e-a223-43fc-837e-94e786594a8c	a2000000-0000-0000-0000-000000000001	5c027814-a0f9-44f3-bad4-138e4783fd51	test	test	info	\N	f	\N	2026-05-19 10:33:52.64134+01
68d47f86-1e33-40ba-99f3-748d632c8651	a1000000-0000-0000-0000-000000000001	5c027814-a0f9-44f3-bad4-138e4783fd51	test	test	info	\N	f	\N	2026-05-19 10:33:52.643582+01
776b0953-cb34-4942-8d9b-8016f9bfbf00	e951bf8c-fc86-4771-80ad-b903f754ad6f	5c027814-a0f9-44f3-bad4-138e4783fd51	New shift assigned	You have been assigned a shift on 2026-06-01 from 08:00 to 16:00	shift	/staff	f	\N	2026-05-21 12:16:14.341069+01
\.


--
-- Data for Name: organisations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.organisations (id, name, registration_code, created_at, reg_number, cqc_provider, address1, address2, address3, postcode, phone, email, logo_url) FROM stdin;
00000000-0000-0000-0000-000000000001	Comprehensive Care	COMPCRE2026	2026-05-18 08:30:09.666008+01	\N	\N	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: policies; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.policies (id, organisation_id, home_id, title, version, document_url, effective_date, review_date, uploaded_by, requires_sign, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: policy_sign_offs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.policy_sign_offs (id, policy_id, staff_id, signed_at) FROM stdin;
\.


--
-- Data for Name: ppe_inventory; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ppe_inventory (id, home_id, item_name, item_variant, current_stock, min_stock, unit, created_at, updated_at) FROM stdin;
46a463ca-17c4-4a29-89d6-447183b7a5ba	5c027814-a0f9-44f3-bad4-138e4783fd51	Gloves	Small	500	100	pairs	2026-05-18 09:23:55.516724+01	2026-05-18 09:23:55.516724+01
b80d5b93-d0ad-4ec6-9dc5-45ada5dcc811	5c027814-a0f9-44f3-bad4-138e4783fd51	Gloves	Medium	800	200	pairs	2026-05-18 09:23:55.516724+01	2026-05-18 09:23:55.516724+01
44d0f840-6a2a-42aa-9d48-31540ad74602	5c027814-a0f9-44f3-bad4-138e4783fd51	Gloves	Large	300	100	pairs	2026-05-18 09:23:55.516724+01	2026-05-18 09:23:55.516724+01
6e55cc92-3a9b-4e27-bf9f-df4c4d6a0b36	5c027814-a0f9-44f3-bad4-138e4783fd51	Face masks	Type IIR	150	50	units	2026-05-18 09:23:55.516724+01	2026-05-18 09:23:55.516724+01
a5349a93-3ac4-4f5d-aacd-280a548cff56	5c027814-a0f9-44f3-bad4-138e4783fd51	Hand sanitiser	500ml	20	5	bottles	2026-05-18 09:23:55.516724+01	2026-05-18 09:23:55.516724+01
1e960ba3-0dd6-4714-b63a-f80462233bb8	5c027814-a0f9-44f3-bad4-138e4783fd51	Disposable Gloves	Medium	320	100	pairs	2026-05-18 15:49:34.390945+01	2026-05-18 15:49:34.390945+01
b841f370-ebb3-41c3-bf7e-82c6f912cb12	5c027814-a0f9-44f3-bad4-138e4783fd51	Disposable Aprons	Standard	85	50	units	2026-05-18 15:49:34.390945+01	2026-05-18 15:49:34.390945+01
be2101c0-3060-47dc-9c8d-b6742a733940	5c027814-a0f9-44f3-bad4-138e4783fd51	Type IIR Face Masks	Standard	120	50	units	2026-05-18 15:49:34.390945+01	2026-05-18 15:49:34.390945+01
f5d95669-bfe9-4963-8b3e-b4ebdc3852b9	5c027814-a0f9-44f3-bad4-138e4783fd51	Hand Sanitiser	500ml	8	5	bottles	2026-05-18 15:49:34.390945+01	2026-05-18 15:49:34.390945+01
f714de2f-a349-4d59-a8a0-b8640234ace3	5c027814-a0f9-44f3-bad4-138e4783fd51	Gloves	\N	100	10	units	2026-05-21 11:56:13.429591+01	2026-05-21 11:56:13.429591+01
440dddbe-6c3a-46f4-a990-5c377a3babe0	5c027814-a0f9-44f3-bad4-138e4783fd51	Aprons	Standard	217	50	units	2026-05-18 09:23:55.516724+01	2026-05-21 12:51:24.281324+01
\.


--
-- Data for Name: ppe_transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ppe_transactions (id, item_id, home_id, transaction_type, quantity, staff_id, notes, created_at) FROM stdin;
3a1d2647-83db-4c49-bb56-41135243d685	440dddbe-6c3a-46f4-a990-5c377a3babe0	5c027814-a0f9-44f3-bad4-138e4783fd51	in	17	e951bf8c-fc86-4771-80ad-b903f754ad6f	\N	2026-05-19 10:36:39.226012+01
195b9412-85db-4c91-9cae-5afe68cba829	440dddbe-6c3a-46f4-a990-5c377a3babe0	5c027814-a0f9-44f3-bad4-138e4783fd51	in	1	e951bf8c-fc86-4771-80ad-b903f754ad6f	\N	2026-05-21 12:51:20.158982+01
88ed4340-0f80-4b0f-a0bd-3110508a135c	440dddbe-6c3a-46f4-a990-5c377a3babe0	5c027814-a0f9-44f3-bad4-138e4783fd51	out	1	e951bf8c-fc86-4771-80ad-b903f754ad6f	\N	2026-05-21 12:51:24.283418+01
\.


--
-- Data for Name: professional_involvement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.professional_involvement (id, su_id, role_title, full_name, organisation, phone, email, notes, created_at) FROM stdin;
066d8c9b-39a5-49be-a0a3-418e24cc70d7	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	test	tesr	\N	\N	\N	\N	2026-05-21 12:55:50.125837+01
\.


--
-- Data for Name: quality_records; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.quality_records (id, home_id, su_id, related_staff_id, created_by, record_type, title, summary, description, detail, outcome, action_taken, follow_up_date, status, created_at, reported_by, reported_at, severity) FROM stdin;
b3541fb2-4f6d-4688-a48b-71b4246e9c61	5c027814-a0f9-44f3-bad4-138e4783fd51	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	\N	e951bf8c-fc86-4771-80ad-b903f754ad6f	compliment	\N	test	\N	\N	\N	\N	\N	open	2026-05-19 15:17:44.459631+01	\N	2026-05-21 11:41:09.897433+01	low
\.


--
-- Data for Name: records_behaviour; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.records_behaviour (id, daily_record_id, mood, behaviour_noted, triggers_noted, action_taken, escalated, created_at) FROM stdin;
bfa72b07-8002-4216-9f0a-91a848de0864	437e6b61-7fd3-43ed-af35-b0e9e2f20805	\N	\N	\N	\N	f	2026-05-21 12:07:53.037693+01
a58d817a-2618-4f86-b8b9-fdd4673567e6	a76fb035-b195-40f6-9267-c73dbfbb373e	\N	\N	\N	\N	f	2026-05-21 12:12:46.380017+01
\.


--
-- Data for Name: records_bowel; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.records_bowel (id, daily_record_id, bristol_type, frequency_today, consistency_notes, created_at) FROM stdin;
\.


--
-- Data for Name: records_communication; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.records_communication (id, daily_record_id, mode_used, topic, response_level, notes, created_at) FROM stdin;
72e01965-7b67-4e9d-9c95-5284e3477612	dc8595d6-195e-4168-9bcb-4d98561b3c64	verbal	Daily chat	good	\N	2026-05-21 12:15:35.231422+01
\.


--
-- Data for Name: records_food_drink; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.records_food_drink (id, daily_record_id, entry_type, meal_type, description, amount_eaten, volume_ml, fluid_type, created_at, assisted, refused, notes) FROM stdin;
\.


--
-- Data for Name: records_handover; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.records_handover (id, daily_record_id, shift_summary, priority_flags, outstanding_actions, created_at) FROM stdin;
6cd53425-187e-4fa5-be12-f364fa76a042	41e10fd6-5011-4c82-9da8-ad307c2cbea5	Quiet shift, all well	{}	None	2026-05-21 12:15:35.46736+01
\.


--
-- Data for Name: records_incidents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.records_incidents (id, daily_record_id, incident_type, location, incident_time, description, injuries, injury_details, medical_needed, medical_details, witnesses, immediate_action, reported_to, safeguarding_ref, created_at, injured_body_parts, medical_attention_req, manager_reviewed, manager_reviewed_at) FROM stdin;
420f50dd-8501-4e2f-ad31-e9683aa51513	5dd60f9c-3fca-4ca5-b458-b704c31c6dc0	\N	\N	2026-05-21 11:58:12.484+01	\N	f		f	\N	\N	\N	\N	f	2026-05-21 11:58:12.464516+01	\N	f	t	2026-05-22 22:02:18.608782+01
1fd55838-b56b-4ff6-895c-a510f4e738b1	9ee7a247-ce3e-4190-9521-15f4ac107e8f	\N	\N	2026-05-21 12:12:46.095+01	\N	f		f	\N	\N	\N	\N	f	2026-05-21 12:12:46.094805+01	\N	f	t	2026-05-22 22:02:18.608782+01
\.


--
-- Data for Name: records_one_to_one; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.records_one_to_one (id, daily_record_id, topics, duration_mins, engagement, follow_up, follow_up_notes, notes, created_at) FROM stdin;
37426423-7eac-4c6e-917b-a5ce7fc90ef1	949a0df3-057b-4427-a4f6-12f8c05098a7	Family memories	30	high	f	\N	\N	2026-05-21 12:15:34.989483+01
\.


--
-- Data for Name: records_oral_care; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.records_oral_care (id, daily_record_id, care_types, mouth_condition, has_dentures, denture_type, notes, created_at) FROM stdin;
376c9a15-a8e7-4fc4-adf8-fa1d0a360247	72315baf-5c32-4cf4-8b77-11dcb49fc2bf	{brushing}	good	f	\N	\N	2026-05-21 12:15:34.753472+01
\.


--
-- Data for Name: records_personal_care; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.records_personal_care (id, daily_record_id, care_type, assistance_level, notes, created_at) FROM stdin;
\.


--
-- Data for Name: records_prn_medication; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.records_prn_medication (id, daily_record_id, medication_name, dose, reason, administered_by, witnessed_by, outcome_notes, created_at) FROM stdin;
fcd45b1c-7261-4f88-b272-8e91f8b314d2	d5b8456a-7c53-4ad4-bfb3-64066a4465b4	Paracetamol	500mg	Pain relief	e951bf8c-fc86-4771-80ad-b903f754ad6f	\N	\N	2026-05-21 12:15:35.346293+01
\.


--
-- Data for Name: records_repositioning; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.records_repositioning (id, daily_record_id, "position", skin_checked, skin_concerns, next_due_at, notes, created_at) FROM stdin;
7747ba8a-b230-4fa1-a43f-d6d37c46e2c9	d4c65772-4d00-47fa-97e3-a71f78bb7175	\N	f	\N	\N	\N	2026-05-21 12:12:46.945236+01
\.


--
-- Data for Name: records_social_activity; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.records_social_activity (id, daily_record_id, activity_name, engagement, enjoyed, notes, created_at) FROM stdin;
144eaf93-bdd5-4f24-af73-16184794bd68	e0a6999b-3b4b-4083-a41f-8e7444ad9c50	Bingo	high	t	\N	2026-05-21 12:15:35.109521+01
\.


--
-- Data for Name: records_visit; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.records_visit (id, daily_record_id, visit_type, visitor_name, visitor_relation, duration_minutes, notes, created_at) FROM stdin;
\.


--
-- Data for Name: records_visits; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.records_visits (id, daily_record_id, visit_type, visitor_name, relationship, location, time_arrived, time_left, su_response, notes, created_at) FROM stdin;
aaff95c5-5d75-41b8-9399-a3fa2bde710b	31bae79b-2a21-46d6-9fee-0c97f240b179	social	Jane Smith	daughter	\N	\N	\N	\N	\N	2026-05-21 12:15:34.876256+01
\.


--
-- Data for Name: records_vitals; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.records_vitals (id, daily_record_id, vital_type, systolic, diastolic, pulse, temp_celsius, spo2_percent, supplemental_o2, weight_kg, bmi, created_at, bp_position, outside_range, temp_method, o2_litres_min, prev_weight_kg, weight_change_pct, height_cm) FROM stdin;
\.


--
-- Data for Name: records_welfare_check; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.records_welfare_check (id, daily_record_id, check_type, su_status, environment_ok, environment_notes, action_taken, created_at) FROM stdin;
a9b6cc23-e2b3-490e-afc9-fb36ea25f13e	214bf5f8-7fb3-4625-9141-0e2d85b1cd19	welfare	\N	t	\N	\N	2026-05-21 12:07:53.340987+01
a9dfc40f-9ae6-4dba-b13a-ef119be9d0d2	0846daa2-7a19-4e13-b15e-1ae3c5cb7f64	welfare	\N	t	\N	\N	2026-05-21 12:12:46.676538+01
\.


--
-- Data for Name: risk_assessment_updates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.risk_assessment_updates (id, risk_id, update_notes, new_risk_level, updated_by, created_at) FROM stdin;
1925f232-a90c-438b-acda-452cbccdfdfc	01b5b211-2180-4204-8c2e-e4f6b5beb2c4	Risk increased	high	e951bf8c-fc86-4771-80ad-b903f754ad6f	2026-05-21 11:55:23.202675+01
0a61c6ba-54c1-44ef-9630-660d88afdf4c	6bd5f55b-6fd6-49a8-bef1-96e6c4400ae6	Risk increased	medium	e951bf8c-fc86-4771-80ad-b903f754ad6f	2026-05-21 12:16:13.513966+01
\.


--
-- Data for Name: risk_assessments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.risk_assessments (id, su_id, home_id, created_by, risk_type, description, likelihood, impact, risk_score, controls, review_date, is_active, created_at, assessment_name, risk_level, current_risk_level, management_plan, review_frequency, next_review_date, last_review_date, who_is_at_risk, is_historical, what_could_happen, triggers, protective_factors, reviewed_by, updated_at) FROM stdin;
cf1390e7-793e-4fd0-951b-441e49ea0354	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	\N	\N	\N	\N	\N	\N	\N	f	2026-05-21 11:54:27.995974+01	Falls Risk	medium	high	Updated plan	monthly	2026-06-20	2026-05-21	\N	f	\N	\N	\N	e951bf8c-fc86-4771-80ad-b903f754ad6f	2026-05-21 11:54:28.577403+01
01b5b211-2180-4204-8c2e-e4f6b5beb2c4	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	\N	\N	\N	\N	\N	\N	\N	t	2026-05-21 11:55:22.96454+01	Falls Risk	low	high	Updated plan	monthly	2026-06-20	2026-05-21	\N	f	\N	\N	\N	e951bf8c-fc86-4771-80ad-b903f754ad6f	2026-05-21 11:55:23.200043+01
42e9ec01-b118-48b4-8e6d-26f15ff9871f	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	\N	\N	\N	\N	\N	\N	\N	t	2026-05-21 12:12:42.732664+01	Falls Risk	medium	medium	Monitor	monthly	2026-06-20	\N	\N	f	\N	\N	\N	\N	2026-05-21 12:12:42.732664+01
6bd5f55b-6fd6-49a8-bef1-96e6c4400ae6	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	\N	\N	\N	\N	\N	\N	\N	f	2026-05-21 12:16:13.369188+01	Test	low	medium	Increased monitoring	monthly	2026-06-20	2026-05-21	\N	f	\N	\N	\N	e951bf8c-fc86-4771-80ad-b903f754ad6f	2026-05-21 12:16:13.511734+01
\.


--
-- Data for Name: safeguarding_concerns; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.safeguarding_concerns (id, su_id, home_id, created_by, su_location, concern_type, description, immediate_action, agencies_contacted, incident_date, status, manager_ack, manager_ack_by, manager_ack_at, created_at, incident_location, incident_time, witnesses, medical_required, medical_details, injury_details, immediate_actions, decisions_breached, lessons_learnt, outside_agency, agency_details, management_recs, prevention_actions, reported_to, reported_at, outcome) FROM stdin;
787c70b9-c5f1-4c2d-af3a-f63ba291e9f2	92818c0f-b5d7-46f7-8d04-8699b01c2482	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	\N	\N	Test incident overview	\N	\N	2026-05-19	open	t	e951bf8c-fc86-4771-80ad-b903f754ad6f	2026-05-19 12:32:50.181777+01	2026-05-19 12:30:57.570332+01	\N	\N	\N	f	\N	\N	Called manager immediately	\N	\N	f	\N	\N	\N	\N	2026-05-19 12:30:57.570332+01	\N
2f39bdca-6d39-4fed-9f9e-6ee55b4aa8dc	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	\N	\N	Test concern overview	\N	\N	2026-05-21	open	t	\N	\N	2026-05-21 11:56:12.973512+01	\N	\N	\N	f	\N	\N	Reported to manager	\N	\N	f	\N	\N	\N	\N	2026-05-21 11:56:12.973512+01	\N
5df1070b-7c93-426e-928a-4a7700fc0777	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	\N	\N	Test concern	\N	\N	2026-05-21	open	t	\N	\N	2026-05-21 12:12:42.993101+01	\N	\N	\N	f	\N	\N	Reported	\N	\N	f	\N	\N	\N	\N	2026-05-21 12:12:42.993101+01	\N
\.


--
-- Data for Name: sensitive_notes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sensitive_notes (id, su_id, home_id, created_by, note, category, created_at) FROM stdin;
fe5c7aa7-33d7-4d23-972e-331d13e9c87c	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	test	general	2026-05-21 12:55:24.015531+01
\.


--
-- Data for Name: service_users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.service_users (id, home_id, first_name, last_name, preferred_name, date_of_birth, gender, address1, postcode, photo_url, status, admission_date, local_authority, nhs_number, emergency_rating, dnar, dnar_form_url, nil_by_mouth, requires_oxygen, has_catheter, need_to_know, min_fluid_ml, latitude, longitude, geofence_radius, qr_token, height_cm, weight_kg, medical_history, allergies, hobbies, daily_routine, created_at, med_allergies, food_allergies, special_diet, fluid_consistency, diet_instructions, my_instructions, bmi, has_peg, life_history, has_lpa, lpa_type, lpa_attorney, has_cop_order, cop_details, dnar_location, service_name, acp_url, acp_date, funeral_noted, funeral_details, key_safe_code, religion, ethnicity, marital_status, comms_prefs, pronouns, ni_number, capacity_doc_url, best_interest_url) FROM stdin;
92818c0f-b5d7-46f7-8d04-8699b01c2482	5c027814-a0f9-44f3-bad4-138e4783fd51	Margaret	Thompson	\N	\N	\N	\N	\N	\N	live	2024-01-15	\N	\N	low	f	\N	f	f	f	\N	1500	\N	\N	200	\N	\N	\N	\N	\N	\N	\N	2026-05-18 08:30:09.666008+01	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	\N	f	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
11111111-0000-0000-0000-000000000002	5c027814-a0f9-44f3-bad4-138e4783fd51	George	Williams	George	1938-07-22	male	12 Oak Street	SW1A 2BB	\N	live	2024-02-10	\N	\N	high	f	\N	f	f	f	\N	1200	\N	\N	200	\N	\N	\N	\N	\N	\N	\N	2026-05-18 09:23:55.516724+01	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	\N	f	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
11111111-0000-0000-0000-000000000003	5c027814-a0f9-44f3-bad4-138e4783fd51	Dorothy	Brown	Dot	1945-11-08	female	8 Maple Avenue	SW1A 3CC	\N	live	2023-11-20	\N	\N	low	f	\N	f	f	f	\N	1500	\N	\N	200	\N	\N	\N	\N	\N	\N	\N	2026-05-18 09:23:55.516724+01	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	\N	f	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
11111111-0000-0000-0000-000000000004	5c027814-a0f9-44f3-bad4-138e4783fd51	Albert	Johnson	Bert	1936-05-30	male	33 Elm Road	SW1A 4DD	\N	live	2024-03-05	\N	\N	high	t	\N	f	f	f	\N	1000	\N	\N	200	\N	\N	\N	\N	\N	\N	\N	2026-05-18 09:23:55.516724+01	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	\N	f	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
11111111-0000-0000-0000-000000000005	5c027814-a0f9-44f3-bad4-138e4783fd51	Edith	Davies	Edie	1950-09-12	female	7 Pine Close	SW1A 5EE	\N	live	2024-04-18	\N	\N	low	f	\N	f	f	f	\N	1500	\N	\N	200	\N	\N	\N	\N	\N	\N	\N	2026-05-18 09:23:55.516724+01	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	\N	f	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	Dorothy	Williams	\N	1938-04-15	female	\N	\N	\N	live	2025-11-18	\N	NHS-001-DW	low	f	\N	f	f	f	Prefers to be called Dot. Enjoys music.	1500	\N	\N	200	\N	\N	62.00	Dementia, Type 2 Diabetes	\N	\N	\N	2026-05-18 15:49:34.390945+01	Penicillin	\N	\N	\N	\N	Approach calmly. Check blood sugar before meals.	\N	f	\N	f	\N	\N	f	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	Harold	Thompson	\N	1934-09-03	male	\N	\N	\N	live	2025-09-18	\N	NHS-002-HT	low	f	\N	f	f	f	Former teacher. Loves crosswords.	1500	\N	\N	200	\N	\N	74.00	Parkinson's disease, Hypertension	\N	\N	\N	2026-05-18 15:49:34.390945+01	Aspirin	\N	\N	\N	\N	Allow extra time. BP check every morning.	\N	f	\N	f	\N	\N	f	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
1259b91c-ad41-4c2d-a811-c23d4fdb2502	5c027814-a0f9-44f3-bad4-138e4783fd51	Margaret	Clarke	\N	1940-12-20	female	\N	\N	\N	live	2026-01-18	\N	NHS-003-MC	low	f	\N	f	f	f	Breathless on exertion.	1500	\N	\N	200	\N	\N	58.00	COPD, Osteoarthritis	\N	\N	\N	2026-05-18 15:49:34.390945+01	None known	\N	\N	\N	\N	Inhaler within reach at all times.	\N	f	\N	f	\N	\N	f	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
ac2507e9-0b59-43c3-bc69-99ceeb54bed8	5c027814-a0f9-44f3-bad4-138e4783fd51	Arthur	Davies	\N	1936-06-08	male	\N	\N	\N	live	2025-05-18	\N	NHS-004-AD	low	f	\N	f	f	f	Sundowning in evenings.	1500	\N	\N	200	\N	\N	68.00	Vascular dementia, Heart failure	\N	\N	\N	2026-05-18 15:49:34.390945+01	Sulfa drugs	\N	\N	\N	\N	Monitor oedema daily. Fluid restriction 1500ml.	\N	f	\N	f	\N	\N	f	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
9b95a09a-1b19-46dc-b388-64cdf909295f	5c027814-a0f9-44f3-bad4-138e4783fd51	Edna	Morrison	\N	1942-02-28	female	\N	\N	\N	live	2026-02-18	\N	NHS-005-EM	low	f	\N	f	f	f	Left-sided weakness.	1500	\N	\N	200	\N	\N	55.00	Stroke recovery, Depression	\N	\N	\N	2026-05-18 15:49:34.390945+01	Latex	\N	\N	\N	\N	No latex gloves. Assist from right side.	\N	f	\N	f	\N	\N	f	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	George	Bennett	\N	1933-11-14	male	\N	\N	\N	live	2025-07-18	\N	NHS-006-GB	low	f	\N	f	f	f	Wanders at night. Sensor mat in place.	1500	\N	\N	200	\N	\N	70.00	Alzheimer's disease	\N	\N	\N	2026-05-18 15:49:34.390945+01	None known	\N	\N	\N	\N	Consistent routine. Night checks every 2 hours.	24.2	f	\N	f	\N	\N	f	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: staff; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.staff (id, organisation_id, home_id, first_name, last_name, email, password_hash, role, status, is_active, phone, address1, address2, address3, postcode, date_of_birth, gender, nationality, marital_status, ni_number, emergency_name, emergency_phone, emergency_notes, photo_url, start_date, leave_date, leave_hours_total, leave_hours_remaining, registration_code, created_at, refresh_token, last_login, reset_token, reset_token_expiry, preferred_name) FROM stdin;
e951bf8c-fc86-4771-80ad-b903f754ad6f	00000000-0000-0000-0000-000000000001	5c027814-a0f9-44f3-bad4-138e4783fd51	System	Admin	admin@healthark.co.uk	$2a$12$Ly/eCCTZiK7OMeync7rTV.bcMlGotVwHCOxjuCtmiwu0Ibbb3LD4C	group_admin	active	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	224.00	189.00	62185C	2026-05-18 15:49:34.390945+01	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdGFmZklkIjoiZTk1MWJmOGMtZmM4Ni00NzcxLTgwYWQtYjkwM2Y3NTRhZDZmIiwib3JnYW5pc2F0aW9uSWQiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJob21lSWQiOiI1YzAyNzgxNC1hMGY5LTQ0ZjMtYmFkNC0xMzhlNDc4M2ZkNTEiLCJyb2xlIjoiZ3JvdXBfYWRtaW4iLCJlbWFpbCI6ImFkbWluQGhlYWx0aGFyay5jby51ayIsImlhdCI6MTc3OTM2NDA4NiwiZXhwIjoxNzgxOTU2MDg2fQ.IBISNjQhyBfmd7NrLYJ2gS1E8NCth3nxhoD6n9XSSnk	2026-05-21 12:48:06.18056+01	\N	\N	\N
0dd6be56-890b-4e27-9d15-a564ebd7f094	00000000-0000-0000-0000-000000000001	5c027814-a0f9-44f3-bad4-138e4783fd51	Sarah	Johnson	manager@healthark.co.uk	$2a$12$ETI5GzuawvM1jitDznV8cOR/ByhaGNt8wWK/c0zrm/iIgRfGizHaa	home_manager	active	t	07700900001	\N	\N	\N	\N	1985-03-12	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	224.00	\N	8F54AD	2026-05-18 15:49:34.390945+01	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdGFmZklkIjoiMGRkNmJlNTYtODkwYi00ZTI3LTlkMTUtYTU2NGViZDdmMDk0Iiwib3JnYW5pc2F0aW9uSWQiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJob21lSWQiOiI1YzAyNzgxNC1hMGY5LTQ0ZjMtYmFkNC0xMzhlNDc4M2ZkNTEiLCJyb2xlIjoiaG9tZV9tYW5hZ2VyIiwiZW1haWwiOiJtYW5hZ2VyQGhlYWx0aGFyay5jby51ayIsImlhdCI6MTc3OTM1Nzk2MSwiZXhwIjoxNzgxOTQ5OTYxfQ.EwVxRl-TQ0P7nMuQshK62QQjsarmJ3f8qzLu1Z0Fu7U	2026-05-21 11:06:01.765991+01	\N	\N	\N
1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	00000000-0000-0000-0000-000000000001	5c027814-a0f9-44f3-bad4-138e4783fd51	Priya	Sharma	care1@healthark.co.uk	$2a$12$UwoYfTcz4cVUcGwVKFqjReg/lCV4aEWS4bJZ89tqgcP86L53CX7rC	care_staff	active	t	07700900003	\N	\N	\N	\N	1995-11-05	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	224.00	\N	D7340E	2026-05-18 15:49:34.390945+01	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdGFmZklkIjoiMWQxYzk0NzctNGZlOS00Njc2LWE2YjMtYzg4YWY2ZmJjYTVlIiwib3JnYW5pc2F0aW9uSWQiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJob21lSWQiOiI1YzAyNzgxNC1hMGY5LTQ0ZjMtYmFkNC0xMzhlNDc4M2ZkNTEiLCJyb2xlIjoiY2FyZV9zdGFmZiIsImVtYWlsIjoiY2FyZTFAaGVhbHRoYXJrLmNvLnVrIiwiaWF0IjoxNzc5MTM1NDczLCJleHAiOjE3ODE3Mjc0NzN9.Gx62RGZz_joOgUgJgyx34q6HcehXrz0ajJEGjaUtB-U	2026-05-18 21:17:53.980238+01	\N	\N	\N
a181f22b-3769-4c52-bb19-861d5c3d2126	00000000-0000-0000-0000-000000000001	5c027814-a0f9-44f3-bad4-138e4783fd51	David	Mensah	care2@healthark.co.uk	$2a$12$K46Nd0iaTUegvMoy8SpHO.t2xX2aBfwpIUWorHGL3fedNFPmInQQO	care_staff	active	t	07700900004	\N	\N	\N	\N	1992-05-18	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	224.00	\N	929163	2026-05-18 15:49:34.390945+01	\N	\N	\N	\N	\N
8fe357e2-8093-43d5-be11-ea37d0b3e206	00000000-0000-0000-0000-000000000001	5c027814-a0f9-44f3-bad4-138e4783fd51	Michael	Okafor	senior@healthark.co.uk	$2a$12$UeA8h2Y7ASwkrRsARN4u7e/GAC4lH/Zd6uvysIRKp9Qy6M9TDPiya	senior_carer	active	t	07700900002	\N	\N	\N	\N	1990-07-22	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	224.00	\N	04664E	2026-05-18 15:49:34.390945+01	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdGFmZklkIjoiOGZlMzU3ZTItODA5My00M2Q1LWJlMTEtZWEzN2QwYjNlMjA2Iiwib3JnYW5pc2F0aW9uSWQiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJob21lSWQiOiI1YzAyNzgxNC1hMGY5LTQ0ZjMtYmFkNC0xMzhlNDc4M2ZkNTEiLCJyb2xlIjoic2VuaW9yX2NhcmVyIiwiZW1haWwiOiJzZW5pb3JAaGVhbHRoYXJrLmNvLnVrIiwiaWF0IjoxNzc5MTM1NDczLCJleHAiOjE3ODE3Mjc0NzN9.PDFASIqUlFD0jfF9iAUeNXQ6k4e3q04z44aVNa7-X08	2026-05-18 21:17:53.492534+01	\N	\N	\N
86d5a846-3c4f-40bb-a131-faa32be5368e	00000000-0000-0000-0000-000000000001	5c027814-a0f9-44f3-bad4-138e4783fd51	Test	User	teststaff_1779188474@test.com	$2a$12$u22TFHAyKrOHei/iypurkOaayDzBRtFg/HfOc5fr3rAgDRJZPHDjy	care_staff	active	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	224.00	\N	\N	2026-05-19 12:01:14.882991+01	\N	\N	\N	\N	\N
85c47d83-2546-437a-a1c5-0a71df67f7d5	00000000-0000-0000-0000-000000000001	5c027814-a0f9-44f3-bad4-138e4783fd51	Jane	Test	jane_1779188606@test.com	$2a$12$UvFGUZUwN5SwCvUyGhVHuOMtiFi8QW4pDd7HSIpVVxNYYKAMHFKnu	care_staff	active	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	224.00	\N	\N	2026-05-19 12:03:26.993441+01	\N	\N	\N	\N	\N
a2000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	5c027814-a0f9-44f3-bad4-138e4783fd51	James	Wilson	staff@compcarehub.co.uk	$2a$12$EyUc1oPV5DPGoloBqpQz1OvNOndyZ8oJem3UrX1tbV1KngemfCGeW	care_staff	active	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	224.00	\N	16060C	2026-05-18 08:30:09.666008+01	\N	\N	\N	\N	\N
a1000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000001	5c027814-a0f9-44f3-bad4-138e4783fd51	Admin	Manager	admin@compcarehub.co.uk	$2a$12$THYgRScEhQAWNOLZiSr/1.u7nfRc14LVHqWi5nYCKZCIlLCElMEiO	group_admin	active	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	224.00	\N	963D71	2026-05-18 08:30:09.666008+01	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdGFmZklkIjoiYTEwMDAwMDAtMDAwMC0wMDAwLTAwMDAtMDAwMDAwMDAwMDAxIiwib3JnYW5pc2F0aW9uSWQiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJob21lSWQiOiI1YzAyNzgxNC1hMGY5LTQ0ZjMtYmFkNC0xMzhlNDc4M2ZkNTEiLCJyb2xlIjoiZ3JvdXBfYWRtaW4iLCJlbWFpbCI6ImFkbWluQGNvbXBjYXJlaHViLmNvLnVrIiwiaWF0IjoxNzc5NDY2MzUxLCJleHAiOjE3ODIwNTgzNTF9.PDRK4xocJlk_ecCRxZ6V3rPglea7qeB9DrMUUYShr8I	2026-05-22 17:12:31.67496+01	\N	\N	\N
\.


--
-- Data for Name: staff_absences; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.staff_absences (id, staff_id, home_id, absence_type, absence_start, absence_end, notified_at, created_by, notes, created_at) FROM stdin;
126b382a-616a-4ed8-be9f-93678cd47d61	e951bf8c-fc86-4771-80ad-b903f754ad6f	5c027814-a0f9-44f3-bad4-138e4783fd51	sick	2026-05-15	\N	2026-05-21 11:55:23.736+01	e951bf8c-fc86-4771-80ad-b903f754ad6f	\N	2026-05-21 11:55:23.737031+01
\.


--
-- Data for Name: staff_assessments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.staff_assessments (id, staff_id, conducted_by, home_id, assessment_type, custom_name, assessment_date, outcome, recommendations, next_due_date, created_at) FROM stdin;
75a59887-6525-4a76-8057-f6407cb82213	e951bf8c-fc86-4771-80ad-b903f754ad6f	e951bf8c-fc86-4771-80ad-b903f754ad6f	5c027814-a0f9-44f3-bad4-138e4783fd51	probation	\N	2026-05-01	\N	\N	\N	2026-05-21 11:55:23.884429+01
\.


--
-- Data for Name: staff_cautions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.staff_cautions (id, staff_id, home_id, created_by, caution_type, overview, strengths, weaknesses, action_points, review_date, created_at) FROM stdin;
0674366c-e497-4460-837b-8c91169a4163	0dd6be56-890b-4e27-9d15-a564ebd7f094	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	verbal	yest	\N	\N	\N	\N	2026-05-18 14:24:42.669593+01
7dc15413-53dc-40ff-bde3-ee20c896185d	e951bf8c-fc86-4771-80ad-b903f754ad6f	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	verbal	Lateness issue	\N	\N	Improve punctuality	\N	2026-05-21 12:16:14.44784+01
\.


--
-- Data for Name: staff_clock_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.staff_clock_events (id, staff_id, home_id, su_id, event_type, event_time, latitude, longitude, distance_metres, geofence_passed, qr_scan_used, shift_scheduled, punctuality, minutes_variance, device_info, created_at) FROM stdin;
2f180214-a710-45b4-8452-f8d20bfe54da	0dd6be56-890b-4e27-9d15-a564ebd7f094	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	clock_in	2026-05-18 11:49:34.390945+01	\N	\N	\N	t	f	\N	on_time	\N	\N	2026-05-18 15:49:34.390945+01
b43b10e8-6b22-4ea9-aceb-6b34fcb7c810	8fe357e2-8093-43d5-be11-ea37d0b3e206	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	clock_in	2026-05-18 11:51:34.390945+01	\N	\N	\N	t	f	\N	early	\N	\N	2026-05-18 15:49:34.390945+01
0b763b91-c343-465c-b12c-b4a0f9f4097e	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	clock_in	2026-05-18 12:04:34.390945+01	\N	\N	\N	t	f	\N	on_time	\N	\N	2026-05-18 15:49:34.390945+01
72d3e8c6-9baa-49b6-9698-a61dabad55f5	a181f22b-3769-4c52-bb19-861d5c3d2126	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	clock_in	2026-05-18 12:19:34.390945+01	\N	\N	\N	t	f	\N	late	\N	\N	2026-05-18 15:49:34.390945+01
e1506a6f-7fc5-4c78-be28-4423bce68699	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	clock_in	2026-05-18 19:15:37.429794+01	\N	\N	\N	t	f	\N	on_time	\N	\N	2026-05-18 21:15:37.429794+01
34eaaae6-8e73-4569-afd7-63fa1356d26e	a181f22b-3769-4c52-bb19-861d5c3d2126	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	clock_in	2026-05-18 19:15:37.429794+01	\N	\N	\N	t	f	\N	on_time	\N	\N	2026-05-18 21:15:37.429794+01
63baa6a6-e3b7-42be-8881-a5f0b43469b6	8fe357e2-8093-43d5-be11-ea37d0b3e206	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	clock_in	2026-05-18 19:15:37.429794+01	\N	\N	\N	t	f	\N	on_time	\N	\N	2026-05-18 21:15:37.429794+01
ab6800b5-c7d9-4448-b60a-fa16894797b8	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	clock_in	2026-05-18 19:17:41.787345+01	\N	\N	\N	t	f	\N	on_time	\N	\N	2026-05-18 21:17:41.787345+01
f59cce2a-9998-4f27-a440-a50a87062833	a181f22b-3769-4c52-bb19-861d5c3d2126	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	clock_in	2026-05-18 19:17:41.787345+01	\N	\N	\N	t	f	\N	on_time	\N	\N	2026-05-18 21:17:41.787345+01
f18d8b5a-1cbb-424a-b39a-5b59aec04bca	8fe357e2-8093-43d5-be11-ea37d0b3e206	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	clock_in	2026-05-18 19:17:41.787345+01	\N	\N	\N	t	f	\N	on_time	\N	\N	2026-05-18 21:17:41.787345+01
\.


--
-- Data for Name: staff_documents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.staff_documents (id, staff_id, home_id, uploaded_by, document_type, title, file_name, file_url, mime_type, file_size, created_at, notes, expiry_date) FROM stdin;
\.


--
-- Data for Name: staff_home_access; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.staff_home_access (id, staff_id, home_id) FROM stdin;
906c28f9-5a78-4763-b97c-c7ff4b36e221	a1000000-0000-0000-0000-000000000001	5c027814-a0f9-44f3-bad4-138e4783fd51
f6e437bf-5d21-4c54-b257-9bd81c16aef3	a2000000-0000-0000-0000-000000000001	5c027814-a0f9-44f3-bad4-138e4783fd51
64425354-07e1-49c9-911a-592f15ccf0b5	0dd6be56-890b-4e27-9d15-a564ebd7f094	5c027814-a0f9-44f3-bad4-138e4783fd51
a1609c96-f6c5-4a76-853f-a3fbef789f96	8fe357e2-8093-43d5-be11-ea37d0b3e206	5c027814-a0f9-44f3-bad4-138e4783fd51
7327d63c-f0d6-41ef-997c-e61a2d51919b	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	5c027814-a0f9-44f3-bad4-138e4783fd51
18ba8af5-6348-4fcd-b7c6-9ea0eda1e2c6	a181f22b-3769-4c52-bb19-861d5c3d2126	5c027814-a0f9-44f3-bad4-138e4783fd51
\.


--
-- Data for Name: staff_leave; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.staff_leave (id, staff_id, home_id, leave_type, start_date, end_date, hours_requested, status, reason, notes, approved_by, approved_at, decline_reason, created_at, updated_at) FROM stdin;
b1cdbf63-bc6b-4c6e-b992-fd72efe8c88d	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	5c027814-a0f9-44f3-bad4-138e4783fd51	annual	2026-06-01	2026-06-08	56.00	pending	Family holiday	\N	\N	\N	\N	2026-05-18 15:49:34.390945+01	2026-05-18 15:49:34.390945+01
ff8df1f1-b1fa-4a5b-ab19-797e36b77b60	a181f22b-3769-4c52-bb19-861d5c3d2126	5c027814-a0f9-44f3-bad4-138e4783fd51	sick	2026-05-17	2026-05-20	24.00	approved	Flu symptoms	\N	\N	\N	\N	2026-05-18 15:49:34.390945+01	2026-05-18 15:49:34.390945+01
8c9e4370-3474-4e44-b1e6-6823363de6a9	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	5c027814-a0f9-44f3-bad4-138e4783fd51	annual	2026-06-01	2026-06-08	56.00	pending	Family holiday	\N	\N	\N	\N	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01
2d5c1d13-0ce5-4d3d-9447-37fca62629c2	a181f22b-3769-4c52-bb19-861d5c3d2126	5c027814-a0f9-44f3-bad4-138e4783fd51	sick	2026-05-17	2026-05-20	24.00	approved	Flu	\N	\N	\N	\N	2026-05-18 21:15:37.429794+01	2026-05-18 21:15:37.429794+01
895f1d78-86d3-40e5-bfbb-575253eba368	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	5c027814-a0f9-44f3-bad4-138e4783fd51	annual	2026-06-01	2026-06-08	56.00	pending	Family holiday	\N	\N	\N	\N	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01
7ca8e7e2-be1a-42b7-8e1c-3e640b8bde80	a181f22b-3769-4c52-bb19-861d5c3d2126	5c027814-a0f9-44f3-bad4-138e4783fd51	sick	2026-05-17	2026-05-20	24.00	approved	Flu	\N	\N	\N	\N	2026-05-18 21:17:41.787345+01	2026-05-18 21:17:41.787345+01
2e5eeb4c-8de7-42c2-8cdd-8ae5f9edaad8	e951bf8c-fc86-4771-80ad-b903f754ad6f	5c027814-a0f9-44f3-bad4-138e4783fd51	annual	2026-06-01	2026-06-05	35.00	pending	\N	\N	\N	\N	\N	2026-05-21 11:53:33.693482+01	2026-05-21 11:53:33.693482+01
46ee9f91-26d8-4ef9-8d77-78787b7de16f	e951bf8c-fc86-4771-80ad-b903f754ad6f	5c027814-a0f9-44f3-bad4-138e4783fd51	annual	2026-07-01	2026-07-05	35.00	approved	\N	\N	e951bf8c-fc86-4771-80ad-b903f754ad6f	2026-05-21 12:16:14.151953+01	\N	2026-05-21 12:16:14.002829+01	2026-05-21 12:16:14.002829+01
\.


--
-- Data for Name: staff_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.staff_messages (id, sender_id, recipient_id, home_id, subject, message, is_read, read_at, created_at) FROM stdin;
79af7ecb-eb86-4913-9678-fc44dd0b881f	e951bf8c-fc86-4771-80ad-b903f754ad6f	0dd6be56-890b-4e27-9d15-a564ebd7f094	\N	\N	hi	f	\N	2026-05-19 12:09:46.244827+01
30563d0b-df65-4fe0-9a14-18acd7d112c6	a1000000-0000-0000-0000-000000000001	0dd6be56-890b-4e27-9d15-a564ebd7f094	\N	\N	hi	f	\N	2026-05-22 07:16:00.41559+01
\.


--
-- Data for Name: staff_onboarding; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.staff_onboarding (id, staff_id, dbs_cleared, care_cert_completed, induction_completed, med_training_completed, right_to_work_verified, created_at, application_received, application_date, interview_completed, interview_date, interview_notes, dbs_submitted_date, dbs_cleared_date, dbs_certificate_url, references_received, references_date, care_cert_date, induction_date, med_training_date, system_training_completed, system_training_date, updated_at) FROM stdin;
b97a307b-81c2-47cb-8417-14db3a85cf71	e951bf8c-fc86-4771-80ad-b903f754ad6f	f	f	f	f	f	2026-05-18 15:49:34.390945+01	f	\N	f	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	f	\N	2026-05-21 11:41:09.897433+01
982a448b-9192-4e49-a05b-f8ecf8c96351	0dd6be56-890b-4e27-9d15-a564ebd7f094	f	f	f	f	f	2026-05-18 15:49:34.390945+01	f	\N	f	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	f	\N	2026-05-21 11:41:09.897433+01
74f7a4a8-f1f1-4b7e-ba8e-6d4c04b5f7ba	8fe357e2-8093-43d5-be11-ea37d0b3e206	f	f	f	f	f	2026-05-18 15:49:34.390945+01	f	\N	f	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	f	\N	2026-05-21 11:41:09.897433+01
adef6d41-47e3-4a41-93fc-bc1578603038	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	f	f	f	f	f	2026-05-18 15:49:34.390945+01	f	\N	f	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	f	\N	2026-05-21 11:41:09.897433+01
7708cc73-2633-45cd-b89a-a0fc61d31706	a181f22b-3769-4c52-bb19-861d5c3d2126	f	f	f	f	f	2026-05-18 15:49:34.390945+01	f	\N	f	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	f	\N	2026-05-21 11:41:09.897433+01
8e7feba7-008b-4f4f-b63a-ce107149a1ea	86d5a846-3c4f-40bb-a131-faa32be5368e	f	f	f	f	f	2026-05-19 12:01:15.062308+01	f	\N	f	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	f	\N	2026-05-21 11:41:09.897433+01
61ca807d-c8d3-450d-a15d-7a35f509fc76	85c47d83-2546-437a-a1c5-0a71df67f7d5	f	f	f	f	f	2026-05-19 12:03:26.997414+01	f	\N	f	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	f	\N	2026-05-21 11:41:09.897433+01
\.


--
-- Data for Name: staff_shifts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.staff_shifts (id, home_id, staff_id, su_id, shift_date, start_time, end_time, shift_type, notes, created_by, created_at) FROM stdin;
0267cd03-0560-4326-9d15-dd9d848fd33d	5c027814-a0f9-44f3-bad4-138e4783fd51	a2000000-0000-0000-0000-000000000001	\N	2026-05-18	07:00:00	14:00:00	early	\N	a1000000-0000-0000-0000-000000000001	2026-05-18 09:23:55.516724+01
6c787b20-df02-4978-b3e5-35ed1bab1ff9	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	\N	2026-05-18	07:00:00	19:00:00	early	\N	0dd6be56-890b-4e27-9d15-a564ebd7f094	2026-05-18 15:49:34.390945+01
f529f837-d17f-40ca-9fd4-f2d5666cfacf	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	\N	2026-05-18	07:00:00	19:00:00	early	\N	0dd6be56-890b-4e27-9d15-a564ebd7f094	2026-05-18 15:49:34.390945+01
ed26a56c-c85b-4538-8c3a-9c44a92c475d	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	\N	2026-05-18	07:00:00	19:00:00	early	\N	0dd6be56-890b-4e27-9d15-a564ebd7f094	2026-05-18 15:49:34.390945+01
d2257af9-77a7-4197-b18d-6a1634eb53b5	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	\N	2026-05-19	07:00:00	19:00:00	early	\N	0dd6be56-890b-4e27-9d15-a564ebd7f094	2026-05-18 15:49:34.390945+01
c61c3da0-897d-40e9-b00a-1fe01c6d6059	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	\N	2026-05-19	19:00:00	07:00:00	late	\N	0dd6be56-890b-4e27-9d15-a564ebd7f094	2026-05-18 15:49:34.390945+01
cf38e1ae-2ece-47da-bd12-8ea5178b6326	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	\N	2026-05-20	07:00:00	19:00:00	early	\N	0dd6be56-890b-4e27-9d15-a564ebd7f094	2026-05-18 15:49:34.390945+01
2a062cfa-1366-406a-9f8c-9c4665e4554e	5c027814-a0f9-44f3-bad4-138e4783fd51	a2000000-0000-0000-0000-000000000001	\N	2026-05-19	22:00:00	07:00:00	night	\N	\N	2026-05-19 10:29:23.507093+01
12d8e6df-1c86-4466-bdff-8dada3bc12ef	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	\N	2026-05-20	14:00:00	22:00:00	late	\N	\N	2026-05-19 10:29:23.515566+01
09efa37e-cad8-445f-876c-c0a3ff9c2b44	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	\N	2026-05-20	22:00:00	07:00:00	night	\N	\N	2026-05-19 10:29:23.519316+01
095bf9ac-3a03-4f4e-bdc5-d8e913880f4f	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	\N	2026-05-21	07:00:00	14:00:00	early	\N	\N	2026-05-19 10:29:23.523415+01
7164c5bf-9879-4b30-90e1-76bfe716385f	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	\N	2026-05-21	14:00:00	22:00:00	late	\N	\N	2026-05-19 10:29:23.525933+01
a84fb075-5bb5-40ed-88ba-527543c23743	5c027814-a0f9-44f3-bad4-138e4783fd51	a2000000-0000-0000-0000-000000000001	\N	2026-05-21	22:00:00	07:00:00	night	\N	\N	2026-05-19 10:29:23.531829+01
fb42f0a8-b3e3-43f8-b1a0-d488a39a9ae5	5c027814-a0f9-44f3-bad4-138e4783fd51	8fe357e2-8093-43d5-be11-ea37d0b3e206	\N	2026-05-22	07:00:00	14:00:00	early	\N	\N	2026-05-19 10:29:23.536757+01
098230e2-7fc8-46ec-9d33-1b44b1739f49	5c027814-a0f9-44f3-bad4-138e4783fd51	a2000000-0000-0000-0000-000000000001	\N	2026-05-22	14:00:00	22:00:00	late	\N	\N	2026-05-19 10:29:23.53881+01
3e2f58d0-05c9-499d-871a-aea8eb49e7d5	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	\N	2026-05-22	22:00:00	07:00:00	night	\N	\N	2026-05-19 10:29:23.541224+01
51d0f485-5dd1-443b-b57b-c0d200d60071	5c027814-a0f9-44f3-bad4-138e4783fd51	1d1c9477-4fe9-4676-a6b3-c88af6fbca5e	\N	2026-05-23	07:00:00	14:00:00	early	\N	\N	2026-05-19 10:29:23.54887+01
fc0a5eeb-3f34-43a3-99e6-42c8a81ee623	5c027814-a0f9-44f3-bad4-138e4783fd51	a2000000-0000-0000-0000-000000000001	\N	2026-05-23	14:00:00	22:00:00	late	\N	\N	2026-05-19 10:29:23.550937+01
f87ade5d-0460-472c-a093-690c51f012ff	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	\N	2026-05-23	22:00:00	07:00:00	night	\N	\N	2026-05-19 10:29:23.553156+01
943de3ea-3a05-4039-ab92-58bf5a580a70	5c027814-a0f9-44f3-bad4-138e4783fd51	a181f22b-3769-4c52-bb19-861d5c3d2126	\N	2026-05-24	07:00:00	14:00:00	early	\N	\N	2026-05-19 10:29:23.556934+01
def8bc3a-6cb5-4ea5-a935-04d563fd64ec	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	\N	2026-06-01	08:00:00	16:00:00	day	\N	e951bf8c-fc86-4771-80ad-b903f754ad6f	2026-05-21 12:16:14.296516+01
\.


--
-- Data for Name: staff_supervisions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.staff_supervisions (id, staff_id, home_id, conducted_by, supervision_type, supervision_date, summary, action_points, next_supervision_date, created_at) FROM stdin;
956598e6-9643-4201-a886-288c2d1830d0	e951bf8c-fc86-4771-80ad-b903f754ad6f	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	supervision	2026-05-21	Good performance	Continue training	\N	2026-05-21 12:16:14.565006+01
\.


--
-- Data for Name: staff_training; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.staff_training (id, staff_id, home_id, course_name, completed_date, expiry_date, provider, certificate_url, duration_hours, created_by, created_at) FROM stdin;
9e2629fc-341a-483e-a59b-dcdaa176eda7	e951bf8c-fc86-4771-80ad-b903f754ad6f	\N	Fire Safety	2026-05-01	\N	\N	\N	4.00	e951bf8c-fc86-4771-80ad-b903f754ad6f	2026-05-21 11:55:23.575795+01
\.


--
-- Data for Name: staff_training_modules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.staff_training_modules (id, staff_id, module_id, module_name, completed_at) FROM stdin;
0bf24f38-1828-484c-904f-e5e5eaa3de6c	e951bf8c-fc86-4771-80ad-b903f754ad6f	intro	Introduction to CompCare Hub	2026-05-19 10:30:05.09679+01
\.


--
-- Data for Name: su_about_me; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.su_about_me (id, su_id, life_history, important_people, daily_routine, hobbies_interests, communication, likes_dislikes, beliefs_values, goals_wishes, support_needs, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: su_contacts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.su_contacts (id, su_id, full_name, relationship, contact_tag, phone_primary, phone_secondary, email, address1, address2, postcode, is_primary, notes, display_order, created_at) FROM stdin;
f1af8558-d419-4f73-b5b7-a99a78c353f2	4185a367-406c-4f44-a395-4c1e66c2a9fb	Patricia Williams	Daughter	Next of Kin	07712345001	\N	\N	\N	\N	\N	t	\N	0	2026-05-18 15:49:34.390945+01
48eb3d1d-1f91-4d42-8ea5-ca37560d95c1	8f0ebcf2-0cae-445f-b962-838445e5014a	James Thompson	Son	Next of Kin	07712345002	\N	\N	\N	\N	\N	t	\N	0	2026-05-18 15:49:34.390945+01
cf206df7-3518-4904-9d7d-8bf10a003f38	1259b91c-ad41-4c2d-a811-c23d4fdb2502	Robert Clarke	Husband	Next of Kin	07712345003	\N	\N	\N	\N	\N	t	\N	0	2026-05-18 15:49:34.390945+01
cffac24d-4ef7-4296-be46-d2140ae89b29	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	Linda Davies	Daughter	Next of Kin	07712345004	\N	\N	\N	\N	\N	t	\N	0	2026-05-18 15:49:34.390945+01
266d979d-aac1-4223-88e8-7a5643f50ea9	9b95a09a-1b19-46dc-b388-64cdf909295f	Brian Morrison	Son	Next of Kin	07712345005	\N	\N	\N	\N	\N	t	\N	0	2026-05-18 15:49:34.390945+01
3ddc93b0-f9b1-4665-ace9-4d67f04ae59c	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	Susan Bennett	Daughter	Next of Kin	07712345006	\N	\N	\N	\N	\N	t	\N	0	2026-05-18 15:49:34.390945+01
\.


--
-- Data for Name: su_daily_fluid_totals; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.su_daily_fluid_totals (id, su_id, record_date, total_ml, below_threshold) FROM stdin;
\.


--
-- Data for Name: su_documents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.su_documents (id, su_id, home_id, uploaded_by, document_type, title, file_name, file_url, mime_type, file_size, created_at, notes, expiry_date) FROM stdin;
\.


--
-- Data for Name: su_medications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.su_medications (id, su_id, home_id, medication_name, dose, frequency, route, prescribed_by, start_date, end_date, instructions, is_prn, added_by, is_active, created_at, created_by, notes) FROM stdin;
a42ebdbd-c92c-4aa1-9d43-79f3538dbdb9	11111111-0000-0000-0000-000000000002	5c027814-a0f9-44f3-bad4-138e4783fd51	Metformin	500mg	Twice daily	Oral	\N	\N	\N	\N	f	\N	t	2026-05-18 09:23:55.516724+01	\N	\N
bf8ce54c-8081-4c1b-8611-3a6223ff7e16	11111111-0000-0000-0000-000000000002	5c027814-a0f9-44f3-bad4-138e4783fd51	Atorvastatin	20mg	Once at night	Oral	\N	\N	\N	\N	f	\N	t	2026-05-18 09:23:55.516724+01	\N	\N
ff7eb108-1b10-453f-ae9f-eb9643592a33	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	Metformin 500mg	500mg	Twice daily	oral	Dr. A. Patel	2025-11-19	\N	\N	f	\N	t	2026-05-18 15:49:34.390945+01	0dd6be56-890b-4e27-9d15-a564ebd7f094	\N
c3890c37-c037-4e1f-ab9e-b6efa5973fa6	4185a367-406c-4f44-a395-4c1e66c2a9fb	5c027814-a0f9-44f3-bad4-138e4783fd51	Aricept 10mg	10mg	Once daily	oral	Dr. A. Patel	2025-11-19	\N	\N	f	\N	t	2026-05-18 15:49:34.390945+01	0dd6be56-890b-4e27-9d15-a564ebd7f094	\N
083a07c3-2b8b-47ae-943d-ba4aa53be662	8f0ebcf2-0cae-445f-b962-838445e5014a	5c027814-a0f9-44f3-bad4-138e4783fd51	Levodopa 100mg	100mg	Three times daily	oral	Dr. R. Williams	2025-09-20	\N	\N	f	\N	t	2026-05-18 15:49:34.390945+01	0dd6be56-890b-4e27-9d15-a564ebd7f094	\N
01fdc063-8aa2-4e5e-a390-deca3cfa3816	ac2507e9-0b59-43c3-bc69-99ceeb54bed8	5c027814-a0f9-44f3-bad4-138e4783fd51	Furosemide 40mg	40mg	Once daily	oral	Dr. A. Patel	2025-05-18	\N	\N	f	\N	t	2026-05-18 15:49:34.390945+01	0dd6be56-890b-4e27-9d15-a564ebd7f094	\N
8da736ea-a3b1-4321-b0a2-bf8d185f53e0	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	Donepezil 10mg	10mg	Once daily	oral	Dr. M. Khan	2025-07-22	\N	\N	f	\N	t	2026-05-18 15:49:34.390945+01	0dd6be56-890b-4e27-9d15-a564ebd7f094	\N
8d3f0c5d-4897-4a4e-9a5c-edc6d3a414c0	92818c0f-b5d7-46f7-8d04-8699b01c2482	5c027814-a0f9-44f3-bad4-138e4783fd51	Amlodipine	5mg	Once daily	Oral	\N	\N	\N	\N	f	\N	t	2026-05-18 09:23:55.516724+01	\N	\N
2d262cfa-98c0-4adc-8fef-5c4a14360e90	92818c0f-b5d7-46f7-8d04-8699b01c2482	5c027814-a0f9-44f3-bad4-138e4783fd51	Paracetamol	500mg	Twice daily	Oral	\N	\N	\N	\N	f	\N	t	2026-05-18 09:23:55.516724+01	\N	\N
29f510f6-a9bd-4590-ad69-af62cea0b379	92818c0f-b5d7-46f7-8d04-8699b01c2482	5c027814-a0f9-44f3-bad4-138e4783fd51	Morphine Sulphate	10mg/5ml	As required	Oral	\N	\N	\N	\N	t	\N	t	2026-05-18 09:23:55.516724+01	\N	\N
9fb7fd3e-895d-47ba-9a8a-8571195f9cdf	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	test	2	once_daily	oral	gp	2026-05-12	\N	once daily	f	a1000000-0000-0000-0000-000000000001	t	2026-05-22 23:01:03.962842+01	\N	\N
4e5df829-47c0-4496-9dc8-912d1c4147ca	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	test	2	once_daily	oral	gp	2026-05-12	\N	once daily	f	a1000000-0000-0000-0000-000000000001	t	2026-05-22 23:02:00.400905+01	\N	\N
\.


--
-- Data for Name: su_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.su_messages (id, su_id, home_id, sender_id, message, message_type, attachment_url, attachment_caption, is_read, read_at, created_at) FROM stdin;
\.


--
-- Data for Name: su_reviews; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.su_reviews (id, su_id, home_id, created_by, review_type, review_date, summary, resident_feedback, family_feedback, outcomes, actions, next_review_date, attendees, created_at, conducted_by, updated_at) FROM stdin;
90326b80-8a27-4bf6-8c57-8252f845dadd	92818c0f-b5d7-46f7-8d04-8699b01c2482	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	care_review	2026-05-19	Review with no homeId in token	\N	\N	\N	\N	\N	\N	2026-05-19 12:31:02.019463+01	\N	2026-05-21 11:41:09.897433+01
9aebef1e-c8f1-4228-bbd5-12019a0b151c	edd7f2de-9016-40cc-9a82-0891e3e5fb1d	5c027814-a0f9-44f3-bad4-138e4783fd51	e951bf8c-fc86-4771-80ad-b903f754ad6f	annual	2026-05-21	Annual review	\N	\N	\N	\N	\N	\N	2026-05-21 12:12:43.270729+01	\N	2026-05-21 12:12:43.270729+01
\.


--
-- Data for Name: task_templates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.task_templates (id, home_id, su_id, title, category, description, frequency, due_time, priority, assigned_role, is_active, created_at, created_by, task_name) FROM stdin;
44e2afbe-8fd5-44f9-9b2a-dd09ef0c5c33	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	Morning medication round	medication	Administer all 08:00 medications and sign MAR charts	daily	\N	normal	senior_carer	t	2026-05-18 15:49:34.390945+01	0dd6be56-890b-4e27-9d15-a564ebd7f094	Morning medication round
1e38859a-79fb-48d5-a25d-c42060595143	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	Evening medication round	medication	Administer all 20:00 medications and sign MAR charts	daily	\N	normal	senior_carer	t	2026-05-18 15:49:34.390945+01	0dd6be56-890b-4e27-9d15-a564ebd7f094	Evening medication round
0c2d6eeb-6b8f-48fc-a3a7-e661d45296c4	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	Fridge temperature log	compliance	Record fridge temperatures	daily	\N	normal	care_staff	t	2026-05-18 15:49:34.390945+01	0dd6be56-890b-4e27-9d15-a564ebd7f094	Fridge temperature log
1565cadb-9e21-42c4-86ab-9b9f738ad6f8	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	Fire safety check	safety	Check all fire exits and alarm panels	weekly	\N	normal	home_manager	t	2026-05-18 15:49:34.390945+01	0dd6be56-890b-4e27-9d15-a564ebd7f094	Fire safety check
1c42af60-f13e-4996-afd3-21d2383c210a	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	Care plan reviews	care	Review flagged care plans	weekly	\N	normal	home_manager	t	2026-05-18 15:49:34.390945+01	0dd6be56-890b-4e27-9d15-a564ebd7f094	Care plan reviews
\.


--
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tasks (id, home_id, su_id, assigned_to, created_by, title, category, description, task_date, due_time, priority, assigned_role, status, completed_at, completed_by, notes, created_at, completion_notes) FROM stdin;
aa50e0f9-c6ab-4bae-b88b-a32cc5ec16bd	5c027814-a0f9-44f3-bad4-138e4783fd51	11111111-0000-0000-0000-000000000002	\N	a1000000-0000-0000-0000-000000000001	Physiotherapy session - George	health	\N	2026-05-18	\N	normal	\N	pending	\N	\N	\N	2026-05-18 09:23:55.516724+01	\N
7340116c-05c7-44a4-86af-645d59a0cfd9	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	\N	a1000000-0000-0000-0000-000000000001	Weekly PPE stock check	admin	\N	2026-05-18	\N	normal	\N	pending	\N	\N	\N	2026-05-18 09:23:55.516724+01	\N
4b3e9edf-2d92-4a3f-9df1-17ac232116fa	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	\N	a1000000-0000-0000-0000-000000000001	Update care plans review log	admin	\N	2026-05-18	\N	normal	\N	completed	\N	\N	\N	2026-05-18 09:23:55.516724+01	\N
bfa5dad6-433b-4981-9a07-2e2cac4ea4bc	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	\N	0dd6be56-890b-4e27-9d15-a564ebd7f094	Morning medication round	medication	Administer 08:00 medications	2026-05-18	08:00:00	urgent	senior_carer	completed	\N	\N	\N	2026-05-18 15:49:34.390945+01	\N
a378ca7a-98df-40b8-bd72-120719ab0c83	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	\N	0dd6be56-890b-4e27-9d15-a564ebd7f094	Fridge temperature log	compliance	Record fridge temperatures	2026-05-18	09:00:00	normal	care_staff	pending	\N	\N	\N	2026-05-18 15:49:34.390945+01	\N
6211470c-cacc-45b4-a455-25ac7f6f31be	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	\N	0dd6be56-890b-4e27-9d15-a564ebd7f094	Evening medication round	medication	Administer 20:00 medications	2026-05-18	20:00:00	urgent	senior_carer	pending	\N	\N	\N	2026-05-18 15:49:34.390945+01	\N
08ab6bee-1150-4d24-b68b-7ccedc9014d9	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	\N	0dd6be56-890b-4e27-9d15-a564ebd7f094	Review Dorothy Williams care plan	care	Care plan overdue — dementia management	2026-05-18	14:00:00	high	home_manager	pending	\N	\N	\N	2026-05-18 15:49:34.390945+01	\N
4c4de9e9-4e57-47dd-8d17-117e2907b182	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	\N	0dd6be56-890b-4e27-9d15-a564ebd7f094	Book GP review for Harold Thompson	medical	BP elevated 3 days — GP review needed	2026-05-18	11:00:00	high	home_manager	pending	\N	\N	\N	2026-05-18 15:49:34.390945+01	\N
89181b53-3595-43db-80e0-789f1abf05f5	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	\N	0dd6be56-890b-4e27-9d15-a564ebd7f094	Chase Furosemide for Arthur Davies	medication	Stock critically low — 5 tablets	2026-05-18	10:00:00	urgent	senior_carer	pending	\N	\N	\N	2026-05-18 15:49:34.390945+01	\N
b8ca7fa7-25ec-4fab-892d-8deeb2520ab5	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	0dd6be56-890b-4e27-9d15-a564ebd7f094	e951bf8c-fc86-4771-80ad-b903f754ad6f	Review Dorothy Williams care plan	\N	\N	2026-05-21	\N	high	\N	pending	\N	\N	\N	2026-05-18 21:15:37.429794+01	\N
7084f2c5-f375-4281-afb3-49fd0ad185a7	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	8fe357e2-8093-43d5-be11-ea37d0b3e206	e951bf8c-fc86-4771-80ad-b903f754ad6f	Order incontinence pads - stock low	\N	\N	2026-05-21	\N	normal	\N	pending	\N	\N	\N	2026-05-18 21:15:37.429794+01	\N
1c0b6346-f66e-4e58-a07b-04e8c65960b7	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	0dd6be56-890b-4e27-9d15-a564ebd7f094	e951bf8c-fc86-4771-80ad-b903f754ad6f	Book GP visit for Harold Thompson	\N	\N	2026-05-21	\N	high	\N	pending	\N	\N	\N	2026-05-18 21:15:37.429794+01	\N
c34c58e9-e37e-4a50-8b19-9013472ae70a	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	0dd6be56-890b-4e27-9d15-a564ebd7f094	e951bf8c-fc86-4771-80ad-b903f754ad6f	Complete fire safety check	\N	\N	2026-05-21	\N	normal	\N	pending	\N	\N	\N	2026-05-18 21:15:37.429794+01	\N
ff17947c-0c46-448c-b5ce-802cc4231bea	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	0dd6be56-890b-4e27-9d15-a564ebd7f094	e951bf8c-fc86-4771-80ad-b903f754ad6f	Update staff rotas for next week	\N	\N	2026-05-21	\N	low	\N	pending	\N	\N	\N	2026-05-18 21:15:37.429794+01	\N
8fd7b6ed-02ef-47ca-8074-158e7e40488b	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	0dd6be56-890b-4e27-9d15-a564ebd7f094	e951bf8c-fc86-4771-80ad-b903f754ad6f	Chase laundry company invoice	\N	\N	2026-05-21	\N	low	\N	pending	\N	\N	\N	2026-05-18 21:15:37.429794+01	\N
ec93bc33-1416-478a-baeb-16c038c48583	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	0dd6be56-890b-4e27-9d15-a564ebd7f094	e951bf8c-fc86-4771-80ad-b903f754ad6f	Review Dorothy Williams care plan	\N	\N	2026-05-21	\N	high	\N	pending	\N	\N	\N	2026-05-18 21:17:41.787345+01	\N
4a85441f-0a6e-44e2-a80e-827d2d49d4df	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	8fe357e2-8093-43d5-be11-ea37d0b3e206	e951bf8c-fc86-4771-80ad-b903f754ad6f	Order incontinence pads - stock low	\N	\N	2026-05-21	\N	normal	\N	pending	\N	\N	\N	2026-05-18 21:17:41.787345+01	\N
306699fe-8669-463c-a56d-5d8bb8b5cca1	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	0dd6be56-890b-4e27-9d15-a564ebd7f094	e951bf8c-fc86-4771-80ad-b903f754ad6f	Book GP visit for Harold Thompson	\N	\N	2026-05-21	\N	high	\N	pending	\N	\N	\N	2026-05-18 21:17:41.787345+01	\N
dfdab791-c907-4777-849d-fa5670754f9a	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	0dd6be56-890b-4e27-9d15-a564ebd7f094	e951bf8c-fc86-4771-80ad-b903f754ad6f	Complete fire safety check	\N	\N	2026-05-21	\N	normal	\N	pending	\N	\N	\N	2026-05-18 21:17:41.787345+01	\N
1cd3d11c-e330-45ad-8dc4-83e1c0fb311c	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	0dd6be56-890b-4e27-9d15-a564ebd7f094	e951bf8c-fc86-4771-80ad-b903f754ad6f	Update staff rotas for next week	\N	\N	2026-05-21	\N	low	\N	pending	\N	\N	\N	2026-05-18 21:17:41.787345+01	\N
05fcf4f7-9982-41e8-89dc-1730c721e060	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	0dd6be56-890b-4e27-9d15-a564ebd7f094	e951bf8c-fc86-4771-80ad-b903f754ad6f	Chase laundry company invoice	\N	\N	2026-05-21	\N	low	\N	pending	\N	\N	\N	2026-05-18 21:17:41.787345+01	\N
ee5852f4-9792-4b5e-b353-8e89bc873fda	5c027814-a0f9-44f3-bad4-138e4783fd51	92818c0f-b5d7-46f7-8d04-8699b01c2482	\N	a1000000-0000-0000-0000-000000000001	Morning medication round	medication	\N	2026-05-18	\N	high	\N	pending	\N	\N	\N	2026-05-18 09:23:55.516724+01	\N
ed76c787-7800-4e87-b89a-e63d02084dad	5c027814-a0f9-44f3-bad4-138e4783fd51	92818c0f-b5d7-46f7-8d04-8699b01c2482	\N	a1000000-0000-0000-0000-000000000001	Blood pressure check - Margaret	health	\N	2026-05-18	\N	normal	\N	pending	\N	\N	\N	2026-05-18 09:23:55.516724+01	\N
aa24acd5-331e-48d3-87f4-a2a4bed8b89b	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	\N	e951bf8c-fc86-4771-80ad-b903f754ad6f	Test task	general	\N	2026-05-21	\N	normal	\N	pending	\N	\N	\N	2026-05-21 11:53:34.032407+01	\N
8718f80c-58c9-4c58-999a-fa307917d0ff	5c027814-a0f9-44f3-bad4-138e4783fd51	\N	\N	e951bf8c-fc86-4771-80ad-b903f754ad6f	Test Task 2	general	\N	2026-05-21	\N	normal	\N	completed	2026-05-21 12:17:00.185981+01	e951bf8c-fc86-4771-80ad-b903f754ad6f	\N	2026-05-21 12:17:00.020556+01	\N
\.


--
-- Name: assessments assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_pkey PRIMARY KEY (id);


--
-- Name: audit_reports audit_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_reports
    ADD CONSTRAINT audit_reports_pkey PRIMARY KEY (id);


--
-- Name: business_alerts business_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_alerts
    ADD CONSTRAINT business_alerts_pkey PRIMARY KEY (id);


--
-- Name: calendar_events calendar_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_pkey PRIMARY KEY (id);


--
-- Name: capacity_assessments capacity_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capacity_assessments
    ADD CONSTRAINT capacity_assessments_pkey PRIMARY KEY (id);


--
-- Name: care_plan_updates care_plan_updates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.care_plan_updates
    ADD CONSTRAINT care_plan_updates_pkey PRIMARY KEY (id);


--
-- Name: care_plans care_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.care_plans
    ADD CONSTRAINT care_plans_pkey PRIMARY KEY (id);


--
-- Name: clock_events clock_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clock_events
    ADD CONSTRAINT clock_events_pkey PRIMARY KEY (id);


--
-- Name: daily_records daily_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_records
    ADD CONSTRAINT daily_records_pkey PRIMARY KEY (id);


--
-- Name: handover_signatures handover_signatures_home_id_shift_date_shift_type_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.handover_signatures
    ADD CONSTRAINT handover_signatures_home_id_shift_date_shift_type_role_key UNIQUE (home_id, shift_date, shift_type, role);


--
-- Name: handover_signatures handover_signatures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.handover_signatures
    ADD CONSTRAINT handover_signatures_pkey PRIMARY KEY (id);


--
-- Name: home_postcodes home_postcodes_home_id_postcode_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.home_postcodes
    ADD CONSTRAINT home_postcodes_home_id_postcode_key UNIQUE (home_id, postcode);


--
-- Name: home_postcodes home_postcodes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.home_postcodes
    ADD CONSTRAINT home_postcodes_pkey PRIMARY KEY (id);


--
-- Name: homes homes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homes
    ADD CONSTRAINT homes_pkey PRIMARY KEY (id);


--
-- Name: mar_records mar_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mar_records
    ADD CONSTRAINT mar_records_pkey PRIMARY KEY (id);


--
-- Name: medication_stock_log medication_stock_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medication_stock_log
    ADD CONSTRAINT medication_stock_log_pkey PRIMARY KEY (id);


--
-- Name: medication_stock medication_stock_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medication_stock
    ADD CONSTRAINT medication_stock_pkey PRIMARY KEY (id);


--
-- Name: medication_stock medication_stock_su_id_medication_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medication_stock
    ADD CONSTRAINT medication_stock_su_id_medication_id_key UNIQUE (su_id, medication_id);


--
-- Name: meeting_notes meeting_notes_event_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_notes
    ADD CONSTRAINT meeting_notes_event_id_key UNIQUE (event_id);


--
-- Name: meeting_notes meeting_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_notes
    ADD CONSTRAINT meeting_notes_pkey PRIMARY KEY (id);


--
-- Name: meeting_signoffs meeting_signoffs_event_id_staff_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_signoffs
    ADD CONSTRAINT meeting_signoffs_event_id_staff_id_key UNIQUE (event_id, staff_id);


--
-- Name: meeting_signoffs meeting_signoffs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_signoffs
    ADD CONSTRAINT meeting_signoffs_pkey PRIMARY KEY (id);


--
-- Name: must_scores must_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.must_scores
    ADD CONSTRAINT must_scores_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: organisations organisations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organisations
    ADD CONSTRAINT organisations_pkey PRIMARY KEY (id);


--
-- Name: policies policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.policies
    ADD CONSTRAINT policies_pkey PRIMARY KEY (id);


--
-- Name: policy_sign_offs policy_sign_offs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.policy_sign_offs
    ADD CONSTRAINT policy_sign_offs_pkey PRIMARY KEY (id);


--
-- Name: policy_sign_offs policy_sign_offs_policy_id_staff_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.policy_sign_offs
    ADD CONSTRAINT policy_sign_offs_policy_id_staff_id_key UNIQUE (policy_id, staff_id);


--
-- Name: ppe_inventory ppe_inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppe_inventory
    ADD CONSTRAINT ppe_inventory_pkey PRIMARY KEY (id);


--
-- Name: ppe_transactions ppe_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppe_transactions
    ADD CONSTRAINT ppe_transactions_pkey PRIMARY KEY (id);


--
-- Name: professional_involvement professional_involvement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.professional_involvement
    ADD CONSTRAINT professional_involvement_pkey PRIMARY KEY (id);


--
-- Name: quality_records quality_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_records
    ADD CONSTRAINT quality_records_pkey PRIMARY KEY (id);


--
-- Name: records_behaviour records_behaviour_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.records_behaviour
    ADD CONSTRAINT records_behaviour_pkey PRIMARY KEY (id);


--
-- Name: records_bowel records_bowel_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.records_bowel
    ADD CONSTRAINT records_bowel_pkey PRIMARY KEY (id);


--
-- Name: records_communication records_communication_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.records_communication
    ADD CONSTRAINT records_communication_pkey PRIMARY KEY (id);


--
-- Name: records_food_drink records_food_drink_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.records_food_drink
    ADD CONSTRAINT records_food_drink_pkey PRIMARY KEY (id);


--
-- Name: records_handover records_handover_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.records_handover
    ADD CONSTRAINT records_handover_pkey PRIMARY KEY (id);


--
-- Name: records_incidents records_incidents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.records_incidents
    ADD CONSTRAINT records_incidents_pkey PRIMARY KEY (id);


--
-- Name: records_one_to_one records_one_to_one_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.records_one_to_one
    ADD CONSTRAINT records_one_to_one_pkey PRIMARY KEY (id);


--
-- Name: records_oral_care records_oral_care_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.records_oral_care
    ADD CONSTRAINT records_oral_care_pkey PRIMARY KEY (id);


--
-- Name: records_personal_care records_personal_care_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.records_personal_care
    ADD CONSTRAINT records_personal_care_pkey PRIMARY KEY (id);


--
-- Name: records_prn_medication records_prn_medication_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.records_prn_medication
    ADD CONSTRAINT records_prn_medication_pkey PRIMARY KEY (id);


--
-- Name: records_repositioning records_repositioning_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.records_repositioning
    ADD CONSTRAINT records_repositioning_pkey PRIMARY KEY (id);


--
-- Name: records_social_activity records_social_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.records_social_activity
    ADD CONSTRAINT records_social_activity_pkey PRIMARY KEY (id);


--
-- Name: records_visit records_visit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.records_visit
    ADD CONSTRAINT records_visit_pkey PRIMARY KEY (id);


--
-- Name: records_visits records_visits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.records_visits
    ADD CONSTRAINT records_visits_pkey PRIMARY KEY (id);


--
-- Name: records_vitals records_vitals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.records_vitals
    ADD CONSTRAINT records_vitals_pkey PRIMARY KEY (id);


--
-- Name: records_welfare_check records_welfare_check_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.records_welfare_check
    ADD CONSTRAINT records_welfare_check_pkey PRIMARY KEY (id);


--
-- Name: risk_assessment_updates risk_assessment_updates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_assessment_updates
    ADD CONSTRAINT risk_assessment_updates_pkey PRIMARY KEY (id);


--
-- Name: risk_assessments risk_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_assessments
    ADD CONSTRAINT risk_assessments_pkey PRIMARY KEY (id);


--
-- Name: safeguarding_concerns safeguarding_concerns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.safeguarding_concerns
    ADD CONSTRAINT safeguarding_concerns_pkey PRIMARY KEY (id);


--
-- Name: sensitive_notes sensitive_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sensitive_notes
    ADD CONSTRAINT sensitive_notes_pkey PRIMARY KEY (id);


--
-- Name: service_users service_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_users
    ADD CONSTRAINT service_users_pkey PRIMARY KEY (id);


--
-- Name: staff_absences staff_absences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_absences
    ADD CONSTRAINT staff_absences_pkey PRIMARY KEY (id);


--
-- Name: staff_assessments staff_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_assessments
    ADD CONSTRAINT staff_assessments_pkey PRIMARY KEY (id);


--
-- Name: staff_cautions staff_cautions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_cautions
    ADD CONSTRAINT staff_cautions_pkey PRIMARY KEY (id);


--
-- Name: staff_clock_events staff_clock_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_clock_events
    ADD CONSTRAINT staff_clock_events_pkey PRIMARY KEY (id);


--
-- Name: staff_documents staff_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_documents
    ADD CONSTRAINT staff_documents_pkey PRIMARY KEY (id);


--
-- Name: staff staff_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_email_key UNIQUE (email);


--
-- Name: staff_home_access staff_home_access_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_home_access
    ADD CONSTRAINT staff_home_access_pkey PRIMARY KEY (id);


--
-- Name: staff_home_access staff_home_access_staff_id_home_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_home_access
    ADD CONSTRAINT staff_home_access_staff_id_home_id_key UNIQUE (staff_id, home_id);


--
-- Name: staff_leave staff_leave_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_leave
    ADD CONSTRAINT staff_leave_pkey PRIMARY KEY (id);


--
-- Name: staff_messages staff_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_messages
    ADD CONSTRAINT staff_messages_pkey PRIMARY KEY (id);


--
-- Name: staff_onboarding staff_onboarding_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_onboarding
    ADD CONSTRAINT staff_onboarding_pkey PRIMARY KEY (id);


--
-- Name: staff_onboarding staff_onboarding_staff_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_onboarding
    ADD CONSTRAINT staff_onboarding_staff_id_key UNIQUE (staff_id);


--
-- Name: staff staff_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_pkey PRIMARY KEY (id);


--
-- Name: staff_shifts staff_shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_shifts
    ADD CONSTRAINT staff_shifts_pkey PRIMARY KEY (id);


--
-- Name: staff_supervisions staff_supervisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_supervisions
    ADD CONSTRAINT staff_supervisions_pkey PRIMARY KEY (id);


--
-- Name: staff_training_modules staff_training_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_training_modules
    ADD CONSTRAINT staff_training_modules_pkey PRIMARY KEY (id);


--
-- Name: staff_training_modules staff_training_modules_staff_id_module_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_training_modules
    ADD CONSTRAINT staff_training_modules_staff_id_module_id_key UNIQUE (staff_id, module_id);


--
-- Name: staff_training staff_training_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_training
    ADD CONSTRAINT staff_training_pkey PRIMARY KEY (id);


--
-- Name: su_about_me su_about_me_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.su_about_me
    ADD CONSTRAINT su_about_me_pkey PRIMARY KEY (id);


--
-- Name: su_about_me su_about_me_su_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.su_about_me
    ADD CONSTRAINT su_about_me_su_id_key UNIQUE (su_id);


--
-- Name: su_contacts su_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.su_contacts
    ADD CONSTRAINT su_contacts_pkey PRIMARY KEY (id);


--
-- Name: su_daily_fluid_totals su_daily_fluid_totals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.su_daily_fluid_totals
    ADD CONSTRAINT su_daily_fluid_totals_pkey PRIMARY KEY (id);


--
-- Name: su_daily_fluid_totals su_daily_fluid_totals_su_id_record_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.su_daily_fluid_totals
    ADD CONSTRAINT su_daily_fluid_totals_su_id_record_date_key UNIQUE (su_id, record_date);


--
-- Name: su_documents su_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.su_documents
    ADD CONSTRAINT su_documents_pkey PRIMARY KEY (id);


--
-- Name: su_medications su_medications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.su_medications
    ADD CONSTRAINT su_medications_pkey PRIMARY KEY (id);


--
-- Name: su_messages su_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.su_messages
    ADD CONSTRAINT su_messages_pkey PRIMARY KEY (id);


--
-- Name: su_reviews su_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.su_reviews
    ADD CONSTRAINT su_reviews_pkey PRIMARY KEY (id);


--
-- Name: task_templates task_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_templates
    ADD CONSTRAINT task_templates_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: idx_cautions_home; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cautions_home ON public.staff_cautions USING btree (home_id);


--
-- Name: idx_clock_home; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clock_home ON public.staff_clock_events USING btree (home_id);


--
-- Name: idx_clock_staff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clock_staff ON public.staff_clock_events USING btree (staff_id);


--
-- Name: idx_clock_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clock_time ON public.staff_clock_events USING btree (event_time);


--
-- Name: idx_cpu_plan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cpu_plan ON public.care_plan_updates USING btree (care_plan_id);


--
-- Name: idx_home_postcodes_home; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_home_postcodes_home ON public.home_postcodes USING btree (home_id);


--
-- Name: idx_mar_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mar_date ON public.mar_records USING btree (record_date);


--
-- Name: idx_mar_home; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mar_home ON public.mar_records USING btree (home_id);


--
-- Name: idx_mar_su; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mar_su ON public.mar_records USING btree (su_id);


--
-- Name: idx_med_stock_home; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_med_stock_home ON public.medication_stock USING btree (home_id);


--
-- Name: idx_med_stock_log; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_med_stock_log ON public.medication_stock_log USING btree (stock_id);


--
-- Name: idx_med_stock_su; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_med_stock_su ON public.medication_stock USING btree (su_id);


--
-- Name: idx_notifications_recipient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_recipient ON public.notifications USING btree (recipient_id, is_read);


--
-- Name: idx_rau_risk; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rau_risk ON public.risk_assessment_updates USING btree (risk_id);


--
-- Name: idx_rbeh_dr; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rbeh_dr ON public.records_behaviour USING btree (daily_record_id);


--
-- Name: idx_rcomm_dr; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rcomm_dr ON public.records_communication USING btree (daily_record_id);


--
-- Name: idx_rhand_dr; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rhand_dr ON public.records_handover USING btree (daily_record_id);


--
-- Name: idx_rone_dr; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rone_dr ON public.records_one_to_one USING btree (daily_record_id);


--
-- Name: idx_roral_dr; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_roral_dr ON public.records_oral_care USING btree (daily_record_id);


--
-- Name: idx_rprn_dr; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rprn_dr ON public.records_prn_medication USING btree (daily_record_id);


--
-- Name: idx_rrepos_dr; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rrepos_dr ON public.records_repositioning USING btree (daily_record_id);


--
-- Name: idx_rsoc_dr; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rsoc_dr ON public.records_social_activity USING btree (daily_record_id);


--
-- Name: idx_rvis_dr; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rvis_dr ON public.records_visits USING btree (daily_record_id);


--
-- Name: idx_rwel_dr; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rwel_dr ON public.records_welfare_check USING btree (daily_record_id);


--
-- Name: idx_safe_home; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_safe_home ON public.safeguarding_concerns USING btree (home_id);


--
-- Name: idx_safe_su; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_safe_su ON public.safeguarding_concerns USING btree (su_id);


--
-- Name: idx_shifts_home_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shifts_home_date ON public.staff_shifts USING btree (home_id, shift_date);


--
-- Name: idx_shifts_staff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shifts_staff ON public.staff_shifts USING btree (staff_id);


--
-- Name: idx_st_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_st_expiry ON public.staff_training USING btree (expiry_date);


--
-- Name: idx_st_staff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_st_staff ON public.staff_training USING btree (staff_id);


--
-- Name: idx_staff_absences_staff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_absences_staff ON public.staff_absences USING btree (staff_id);


--
-- Name: idx_staff_assessments_staff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_assessments_staff ON public.staff_assessments USING btree (staff_id);


--
-- Name: idx_staff_docs_staff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_docs_staff ON public.staff_documents USING btree (staff_id);


--
-- Name: idx_staff_training_staff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_training_staff ON public.staff_training USING btree (staff_id);


--
-- Name: idx_su_meds_home; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_su_meds_home ON public.su_medications USING btree (home_id);


--
-- Name: idx_su_meds_su; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_su_meds_su ON public.su_medications USING btree (su_id);


--
-- Name: idx_su_messages_home; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_su_messages_home ON public.su_messages USING btree (home_id);


--
-- Name: idx_su_messages_su; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_su_messages_su ON public.su_messages USING btree (su_id);


--
-- Name: idx_supervisions_home; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_supervisions_home ON public.staff_supervisions USING btree (home_id);


--
-- Name: idx_supervisions_staff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_supervisions_staff ON public.staff_supervisions USING btree (staff_id);


--
-- Name: idx_tasks_home_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_home_date ON public.tasks USING btree (home_id, task_date);


--
-- Name: idx_tasks_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_status ON public.tasks USING btree (status);


--
-- Name: audit_reports audit_reports_generated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_reports
    ADD CONSTRAINT audit_reports_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES public.staff(id);


--
-- Name: audit_reports audit_reports_home_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_reports
    ADD CONSTRAINT audit_reports_home_id_fkey FOREIGN KEY (home_id) REFERENCES public.homes(id);


--
-- Name: business_alerts business_alerts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_alerts
    ADD CONSTRAINT business_alerts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);


--
-- Name: business_alerts business_alerts_home_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_alerts
    ADD CONSTRAINT business_alerts_home_id_fkey FOREIGN KEY (home_id) REFERENCES public.homes(id);


--
-- Name: business_alerts business_alerts_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_alerts
    ADD CONSTRAINT business_alerts_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.staff(id);


--
-- Name: business_alerts business_alerts_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_alerts
    ADD CONSTRAINT business_alerts_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: business_alerts business_alerts_su_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_alerts
    ADD CONSTRAINT business_alerts_su_id_fkey FOREIGN KEY (su_id) REFERENCES public.service_users(id) ON DELETE SET NULL;


--
-- Name: calendar_events calendar_events_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);


--
-- Name: calendar_events calendar_events_home_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_home_id_fkey FOREIGN KEY (home_id) REFERENCES public.homes(id);


--
-- Name: calendar_events calendar_events_su_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_su_id_fkey FOREIGN KEY (su_id) REFERENCES public.service_users(id);


--
-- Name: capacity_assessments capacity_assessments_assessed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capacity_assessments
    ADD CONSTRAINT capacity_assessments_assessed_by_fkey FOREIGN KEY (assessed_by) REFERENCES public.staff(id);


--
-- Name: capacity_assessments capacity_assessments_home_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capacity_assessments
    ADD CONSTRAINT capacity_assessments_home_id_fkey FOREIGN KEY (home_id) REFERENCES public.homes(id);


--
-- Name: capacity_assessments capacity_assessments_su_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capacity_assessments
    ADD CONSTRAINT capacity_assessments_su_id_fkey FOREIGN KEY (su_id) REFERENCES public.service_users(id);


--
-- Name: care_plan_updates care_plan_updates_care_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.care_plan_updates
    ADD CONSTRAINT care_plan_updates_care_plan_id_fkey FOREIGN KEY (care_plan_id) REFERENCES public.care_plans(id) ON DELETE CASCADE;


--
-- Name: care_plan_updates care_plan_updates_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.care_plan_updates
    ADD CONSTRAINT care_plan_updates_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: care_plans care_plans_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.care_plans
    ADD CONSTRAINT care_plans_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);


--
-- Name: care_plans care_plans_home_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.care_plans
    ADD CONSTRAINT care_plans_home_id_fkey FOREIGN KEY (home_id) REFERENCES public.homes(id);


--
-- Name: care_plans care_plans_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.care_plans
    ADD CONSTRAINT care_plans_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: care_plans care_plans_su_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.care_plans
    ADD CONSTRAINT care_plans_su_id_fkey FOREIGN KEY (su_id) REFERENCES public.service_users(id);


--
-- Name: clock_events clock_events_home_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clock_events
    ADD CONSTRAINT clock_events_home_id_fkey FOREIGN KEY (home_id) REFERENCES public.homes(id);


--
-- Name: clock_events clock_events_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clock_events
    ADD CONSTRAINT clock_events_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id);


--
-- Name: clock_events clock_events_su_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clock_events
    ADD CONSTRAINT clock_events_su_id_fkey FOREIGN KEY (su_id) REFERENCES public.service_users(id);


--
-- Name: daily_records daily_records_home_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_records
    ADD CONSTRAINT daily_records_home_id_fkey FOREIGN KEY (home_id) REFERENCES public.homes(id);


--
-- Name: daily_records daily_records_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_records
    ADD CONSTRAINT daily_records_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id);


--
-- Name: daily_records daily_records_su_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_records
    ADD CONSTRAINT daily_records_su_id_fkey FOREIGN KEY (su_id) REFERENCES public.service_users(id);


--
-- Name: handover_signatures handover_signatures_home_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.handover_signatures
    ADD CONSTRAINT handover_signatures_home_id_fkey FOREIGN KEY (home_id) REFERENCES public.homes(id);


--
-- Name: handover_signatures handover_signatures_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.handover_signatures
    ADD CONSTRAINT handover_signatures_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id);


--
-- Name: home_postcodes home_postcodes_home_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.home_postcodes
    ADD CONSTRAINT home_postcodes_home_id_fkey FOREIGN KEY (home_id) REFERENCES public.homes(id) ON DELETE CASCADE;


--
-- Name: homes homes_organisation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homes
    ADD CONSTRAINT homes_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES public.organisations(id);


--
-- Name: mar_records mar_records_given_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mar_records
    ADD CONSTRAINT mar_records_given_by_fkey FOREIGN KEY (given_by) REFERENCES public.staff(id);


--
-- Name: mar_records mar_records_home_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mar_records
    ADD CONSTRAINT mar_records_home_id_fkey FOREIGN KEY (home_id) REFERENCES public.homes(id);


--
-- Name: mar_records mar_records_medication_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mar_records
    ADD CONSTRAINT mar_records_medication_id_fkey FOREIGN KEY (medication_id) REFERENCES public.su_medications(id);


--
-- Name: mar_records mar_records_su_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mar_records
    ADD CONSTRAINT mar_records_su_id_fkey FOREIGN KEY (su_id) REFERENCES public.service_users(id);


--
-- Name: mar_records mar_records_witnessed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mar_records
    ADD CONSTRAINT mar_records_witnessed_by_fkey FOREIGN KEY (witnessed_by) REFERENCES public.staff(id);


--
-- Name: medication_stock medication_stock_home_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medication_stock
    ADD CONSTRAINT medication_stock_home_id_fkey FOREIGN KEY (home_id) REFERENCES public.homes(id) ON DELETE CASCADE;


--
-- Name: medication_stock medication_stock_last_counted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medication_stock
    ADD CONSTRAINT medication_stock_last_counted_by_fkey FOREIGN KEY (last_counted_by) REFERENCES public.staff(id);


--
-- Name: medication_stock medication_stock_last_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medication_stock
    ADD CONSTRAINT medication_stock_last_updated_by_fkey FOREIGN KEY (last_updated_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: medication_stock_log medication_stock_log_adjusted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medication_stock_log
    ADD CONSTRAINT medication_stock_log_adjusted_by_fkey FOREIGN KEY (adjusted_by) REFERENCES public.staff(id);


--
-- Name: medication_stock_log medication_stock_log_stock_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medication_stock_log
    ADD CONSTRAINT medication_stock_log_stock_id_fkey FOREIGN KEY (stock_id) REFERENCES public.medication_stock(id) ON DELETE CASCADE;


--
-- Name: medication_stock medication_stock_medication_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medication_stock
    ADD CONSTRAINT medication_stock_medication_id_fkey FOREIGN KEY (medication_id) REFERENCES public.su_medications(id);


--
-- Name: medication_stock medication_stock_su_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medication_stock
    ADD CONSTRAINT medication_stock_su_id_fkey FOREIGN KEY (su_id) REFERENCES public.service_users(id);


--
-- Name: meeting_notes meeting_notes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_notes
    ADD CONSTRAINT meeting_notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);


--
-- Name: meeting_notes meeting_notes_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_notes
    ADD CONSTRAINT meeting_notes_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.calendar_events(id) ON DELETE CASCADE;


--
-- Name: meeting_signoffs meeting_signoffs_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_signoffs
    ADD CONSTRAINT meeting_signoffs_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.calendar_events(id) ON DELETE CASCADE;


--
-- Name: meeting_signoffs meeting_signoffs_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_signoffs
    ADD CONSTRAINT meeting_signoffs_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id);


--
-- Name: must_scores must_scores_assessed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.must_scores
    ADD CONSTRAINT must_scores_assessed_by_fkey FOREIGN KEY (assessed_by) REFERENCES public.staff(id);


--
-- Name: must_scores must_scores_home_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.must_scores
    ADD CONSTRAINT must_scores_home_id_fkey FOREIGN KEY (home_id) REFERENCES public.homes(id);


--
-- Name: must_scores must_scores_su_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.must_scores
    ADD CONSTRAINT must_scores_su_id_fkey FOREIGN KEY (su_id) REFERENCES public.service_users(id);


--
-- Name: notifications notifications_home_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_home_id_fkey FOREIGN KEY (home_id) REFERENCES public.homes(id);


--
-- Name: notifications notifications_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.staff(id);


--
-- Name: policies policies_home_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.policies
    ADD CONSTRAINT policies_home_id_fkey FOREIGN KEY (home_id) REFERENCES public.homes(id);


--
-- Name: policies policies_organisation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.policies
    ADD CONSTRAINT policies_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES public.organisations(id);


--
-- Name: policies policies_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.policies
    ADD CONSTRAINT policies_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.staff(id);


--
-- Name: policy_sign_offs policy_sign_offs_policy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.policy_sign_offs
    ADD CONSTRAINT policy_sign_offs_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES public.policies(id);


--
-- Name: policy_sign_offs policy_sign_offs_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.policy_sign_offs
    ADD CONSTRAINT policy_sign_offs_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id);


--
-- Name: ppe_inventory ppe_inventory_home_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppe_inventory
    ADD CONSTRAINT ppe_inventory_home_id_fkey FOREIGN KEY (home_id) REFERENCES public.homes(id);


--
-- Name: ppe_transactions ppe_transactions_home_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppe_transactions
    ADD CONSTRAINT ppe_transactions_home_id_fkey FOREIGN KEY (home_id) REFERENCES public.homes(id);


--
-- Name: ppe_transactions ppe_transactions_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppe_transactions
    ADD CONSTRAINT ppe_transactions_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.ppe_inventory(id);


--
-- Name: ppe_transactions ppe_transactions_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppe_transactions
    ADD CONSTRAINT ppe_transactions_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id);


--
-- Name: professional_involvement professional_involvement_su_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.professional_involvement
    ADD CONSTRAINT professional_involvement_su_id_fkey FOREIGN KEY (su_id) REFERENCES public.service_users(id);


--
-- Name: quality_records quality_records_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_records
    ADD CONSTRAINT quality_records_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);


--
-- Name: quality_records quality_records_home_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_records
    ADD CONSTRAINT quality_records_home_id_fkey FOREIGN KEY (home_id) REFERENCES public.homes(id);


--
-- Name: quality_records quality_records_related_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_records
    ADD CONSTRAINT quality_records_related_staff_id_fkey FOREIGN KEY (related_staff_id) REFERENCES public.staff(id);


--
-- Name: quality_records quality_records_su_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quality_records
    ADD CONSTRAINT quality_records_su_id_fkey FOREIGN KEY (su_id) REFERENCES public.service_users(id);


--
-- Name: records_behaviour records_behaviour_daily_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.records_behaviour
    ADD CONSTRAINT records_behaviour_daily_record_id_fkey FOREIGN KEY (daily_record_id) REFERENCES public.daily_records(id) ON DELETE CASCADE;


--
-- Name: records_bowel records_bowel_daily_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.records_bowel
    ADD CONSTRAINT records_bowel_daily_record_id_fkey FOREIGN KEY (daily_record_id) REFERENCES public.daily_records(id) ON DELETE CASCADE;


--
-- Name: records_communication records_communication_daily_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.records_communication
    ADD CONSTRAINT records_communication_daily_record_id_fkey FOREIGN KEY (daily_record_id) REFERENCES public.daily_records(id) ON DELETE CASCADE;


--
-- Name: records_food_drink records_food_drink_daily_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.records_food_drink
    ADD CONSTRAINT records_food_drink_daily_record_id_fkey FOREIGN KEY (daily_record_id) REFERENCES public.daily_records(id) ON DELETE CASCADE;


--
-- Name: records_handover records_handover_daily_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.records_handover
    ADD CONSTRAINT records_handover_daily_record_id_fkey FOREIGN KEY (daily_record_id) REFERENCES public.daily_records(id) ON DELETE CASCADE;


--
-- Name: records_incidents records_incidents_daily_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.records_incidents
    ADD CONSTRAINT records_incidents_daily_record_id_fkey FOREIGN KEY (daily_record_id) REFERENCES public.daily_records(id) ON DELETE CASCADE;


--
-- Name: records_one_to_one records_one_to_one_daily_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.records_one_to_one
    ADD CONSTRAINT records_one_to_one_daily_record_id_fkey FOREIGN KEY (daily_record_id) REFERENCES public.daily_records(id) ON DELETE CASCADE;


--
-- Name: records_oral_care records_oral_care_daily_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.records_oral_care
    ADD CONSTRAINT records_oral_care_daily_record_id_fkey FOREIGN KEY (daily_record_id) REFERENCES public.daily_records(id) ON DELETE CASCADE;


--
-- Name: records_personal_care records_personal_care_daily_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.records_personal_care
    ADD CONSTRAINT records_personal_care_daily_record_id_fkey FOREIGN KEY (daily_record_id) REFERENCES public.daily_records(id) ON DELETE CASCADE;


--
-- Name: records_prn_medication records_prn_medication_administered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.records_prn_medication
    ADD CONSTRAINT records_prn_medication_administered_by_fkey FOREIGN KEY (administered_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: records_prn_medication records_prn_medication_daily_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.records_prn_medication
    ADD CONSTRAINT records_prn_medication_daily_record_id_fkey FOREIGN KEY (daily_record_id) REFERENCES public.daily_records(id) ON DELETE CASCADE;


--
-- Name: records_prn_medication records_prn_medication_witnessed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.records_prn_medication
    ADD CONSTRAINT records_prn_medication_witnessed_by_fkey FOREIGN KEY (witnessed_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: records_repositioning records_repositioning_daily_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.records_repositioning
    ADD CONSTRAINT records_repositioning_daily_record_id_fkey FOREIGN KEY (daily_record_id) REFERENCES public.daily_records(id) ON DELETE CASCADE;


--
-- Name: records_social_activity records_social_activity_daily_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.records_social_activity
    ADD CONSTRAINT records_social_activity_daily_record_id_fkey FOREIGN KEY (daily_record_id) REFERENCES public.daily_records(id) ON DELETE CASCADE;


--
-- Name: records_visit records_visit_daily_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.records_visit
    ADD CONSTRAINT records_visit_daily_record_id_fkey FOREIGN KEY (daily_record_id) REFERENCES public.daily_records(id) ON DELETE CASCADE;


--
-- Name: records_visits records_visits_daily_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.records_visits
    ADD CONSTRAINT records_visits_daily_record_id_fkey FOREIGN KEY (daily_record_id) REFERENCES public.daily_records(id) ON DELETE CASCADE;


--
-- Name: records_vitals records_vitals_daily_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.records_vitals
    ADD CONSTRAINT records_vitals_daily_record_id_fkey FOREIGN KEY (daily_record_id) REFERENCES public.daily_records(id) ON DELETE CASCADE;


--
-- Name: records_welfare_check records_welfare_check_daily_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.records_welfare_check
    ADD CONSTRAINT records_welfare_check_daily_record_id_fkey FOREIGN KEY (daily_record_id) REFERENCES public.daily_records(id) ON DELETE CASCADE;


--
-- Name: risk_assessment_updates risk_assessment_updates_risk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_assessment_updates
    ADD CONSTRAINT risk_assessment_updates_risk_id_fkey FOREIGN KEY (risk_id) REFERENCES public.risk_assessments(id) ON DELETE CASCADE;


--
-- Name: risk_assessment_updates risk_assessment_updates_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_assessment_updates
    ADD CONSTRAINT risk_assessment_updates_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: risk_assessments risk_assessments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_assessments
    ADD CONSTRAINT risk_assessments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);


--
-- Name: risk_assessments risk_assessments_home_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_assessments
    ADD CONSTRAINT risk_assessments_home_id_fkey FOREIGN KEY (home_id) REFERENCES public.homes(id);


--
-- Name: risk_assessments risk_assessments_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_assessments
    ADD CONSTRAINT risk_assessments_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: risk_assessments risk_assessments_su_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_assessments
    ADD CONSTRAINT risk_assessments_su_id_fkey FOREIGN KEY (su_id) REFERENCES public.service_users(id);


--
-- Name: safeguarding_concerns safeguarding_concerns_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.safeguarding_concerns
    ADD CONSTRAINT safeguarding_concerns_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);


--
-- Name: safeguarding_concerns safeguarding_concerns_home_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.safeguarding_concerns
    ADD CONSTRAINT safeguarding_concerns_home_id_fkey FOREIGN KEY (home_id) REFERENCES public.homes(id);


--
-- Name: safeguarding_concerns safeguarding_concerns_manager_ack_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.safeguarding_concerns
    ADD CONSTRAINT safeguarding_concerns_manager_ack_by_fkey FOREIGN KEY (manager_ack_by) REFERENCES public.staff(id);


--
-- Name: safeguarding_concerns safeguarding_concerns_su_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.safeguarding_concerns
    ADD CONSTRAINT safeguarding_concerns_su_id_fkey FOREIGN KEY (su_id) REFERENCES public.service_users(id);


--
-- Name: sensitive_notes sensitive_notes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sensitive_notes
    ADD CONSTRAINT sensitive_notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);


--
-- Name: sensitive_notes sensitive_notes_home_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sensitive_notes
    ADD CONSTRAINT sensitive_notes_home_id_fkey FOREIGN KEY (home_id) REFERENCES public.homes(id);


--
-- Name: sensitive_notes sensitive_notes_su_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sensitive_notes
    ADD CONSTRAINT sensitive_notes_su_id_fkey FOREIGN KEY (su_id) REFERENCES public.service_users(id);


--
-- Name: service_users service_users_home_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_users
    ADD CONSTRAINT service_users_home_id_fkey FOREIGN KEY (home_id) REFERENCES public.homes(id);


--
-- Name: staff_absences staff_absences_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_absences
    ADD CONSTRAINT staff_absences_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: staff_absences staff_absences_home_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_absences
    ADD CONSTRAINT staff_absences_home_id_fkey FOREIGN KEY (home_id) REFERENCES public.homes(id) ON DELETE CASCADE;


--
-- Name: staff_absences staff_absences_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_absences
    ADD CONSTRAINT staff_absences_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: staff_assessments staff_assessments_conducted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_assessments
    ADD CONSTRAINT staff_assessments_conducted_by_fkey FOREIGN KEY (conducted_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: staff_assessments staff_assessments_home_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_assessments
    ADD CONSTRAINT staff_assessments_home_id_fkey FOREIGN KEY (home_id) REFERENCES public.homes(id) ON DELETE CASCADE;


--
-- Name: staff_assessments staff_assessments_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_assessments
    ADD CONSTRAINT staff_assessments_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: staff_cautions staff_cautions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_cautions
    ADD CONSTRAINT staff_cautions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);


--
-- Name: staff_cautions staff_cautions_home_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_cautions
    ADD CONSTRAINT staff_cautions_home_id_fkey FOREIGN KEY (home_id) REFERENCES public.homes(id);


--
-- Name: staff_cautions staff_cautions_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_cautions
    ADD CONSTRAINT staff_cautions_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id);


--
-- Name: staff_clock_events staff_clock_events_home_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_clock_events
    ADD CONSTRAINT staff_clock_events_home_id_fkey FOREIGN KEY (home_id) REFERENCES public.homes(id);


--
-- Name: staff_clock_events staff_clock_events_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_clock_events
    ADD CONSTRAINT staff_clock_events_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: staff_clock_events staff_clock_events_su_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_clock_events
    ADD CONSTRAINT staff_clock_events_su_id_fkey FOREIGN KEY (su_id) REFERENCES public.service_users(id) ON DELETE SET NULL;


--
-- Name: staff_documents staff_documents_home_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_documents
    ADD CONSTRAINT staff_documents_home_id_fkey FOREIGN KEY (home_id) REFERENCES public.homes(id);


--
-- Name: staff_documents staff_documents_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_documents
    ADD CONSTRAINT staff_documents_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id);


--
-- Name: staff_documents staff_documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_documents
    ADD CONSTRAINT staff_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.staff(id);


--
-- Name: staff_home_access staff_home_access_home_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_home_access
    ADD CONSTRAINT staff_home_access_home_id_fkey FOREIGN KEY (home_id) REFERENCES public.homes(id);


--
-- Name: staff_home_access staff_home_access_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_home_access
    ADD CONSTRAINT staff_home_access_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id);


--
-- Name: staff staff_home_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_home_id_fkey FOREIGN KEY (home_id) REFERENCES public.homes(id);


--
-- Name: staff_leave staff_leave_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_leave
    ADD CONSTRAINT staff_leave_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.staff(id);


--
-- Name: staff_leave staff_leave_home_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_leave
    ADD CONSTRAINT staff_leave_home_id_fkey FOREIGN KEY (home_id) REFERENCES public.homes(id);


--
-- Name: staff_leave staff_leave_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_leave
    ADD CONSTRAINT staff_leave_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id);


--
-- Name: staff_messages staff_messages_home_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_messages
    ADD CONSTRAINT staff_messages_home_id_fkey FOREIGN KEY (home_id) REFERENCES public.homes(id);


--
-- Name: staff_messages staff_messages_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_messages
    ADD CONSTRAINT staff_messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.staff(id);


--
-- Name: staff_messages staff_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_messages
    ADD CONSTRAINT staff_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.staff(id);


--
-- Name: staff_onboarding staff_onboarding_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_onboarding
    ADD CONSTRAINT staff_onboarding_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id);


--
-- Name: staff staff_organisation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES public.organisations(id);


--
-- Name: staff_shifts staff_shifts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_shifts
    ADD CONSTRAINT staff_shifts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);


--
-- Name: staff_shifts staff_shifts_home_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_shifts
    ADD CONSTRAINT staff_shifts_home_id_fkey FOREIGN KEY (home_id) REFERENCES public.homes(id);


--
-- Name: staff_shifts staff_shifts_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_shifts
    ADD CONSTRAINT staff_shifts_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id);


--
-- Name: staff_shifts staff_shifts_su_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_shifts
    ADD CONSTRAINT staff_shifts_su_id_fkey FOREIGN KEY (su_id) REFERENCES public.service_users(id);


--
-- Name: staff_supervisions staff_supervisions_conducted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_supervisions
    ADD CONSTRAINT staff_supervisions_conducted_by_fkey FOREIGN KEY (conducted_by) REFERENCES public.staff(id);


--
-- Name: staff_supervisions staff_supervisions_home_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_supervisions
    ADD CONSTRAINT staff_supervisions_home_id_fkey FOREIGN KEY (home_id) REFERENCES public.homes(id);


--
-- Name: staff_supervisions staff_supervisions_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_supervisions
    ADD CONSTRAINT staff_supervisions_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id);


--
-- Name: staff_training staff_training_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_training
    ADD CONSTRAINT staff_training_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);


--
-- Name: staff_training staff_training_home_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_training
    ADD CONSTRAINT staff_training_home_id_fkey FOREIGN KEY (home_id) REFERENCES public.homes(id);


--
-- Name: staff_training_modules staff_training_modules_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_training_modules
    ADD CONSTRAINT staff_training_modules_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id);


--
-- Name: staff_training staff_training_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_training
    ADD CONSTRAINT staff_training_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id);


--
-- Name: su_about_me su_about_me_su_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.su_about_me
    ADD CONSTRAINT su_about_me_su_id_fkey FOREIGN KEY (su_id) REFERENCES public.service_users(id) ON DELETE CASCADE;


--
-- Name: su_contacts su_contacts_su_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.su_contacts
    ADD CONSTRAINT su_contacts_su_id_fkey FOREIGN KEY (su_id) REFERENCES public.service_users(id) ON DELETE CASCADE;


--
-- Name: su_daily_fluid_totals su_daily_fluid_totals_su_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.su_daily_fluid_totals
    ADD CONSTRAINT su_daily_fluid_totals_su_id_fkey FOREIGN KEY (su_id) REFERENCES public.service_users(id);


--
-- Name: su_documents su_documents_home_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.su_documents
    ADD CONSTRAINT su_documents_home_id_fkey FOREIGN KEY (home_id) REFERENCES public.homes(id);


--
-- Name: su_documents su_documents_su_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.su_documents
    ADD CONSTRAINT su_documents_su_id_fkey FOREIGN KEY (su_id) REFERENCES public.service_users(id);


--
-- Name: su_documents su_documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.su_documents
    ADD CONSTRAINT su_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.staff(id);


--
-- Name: su_medications su_medications_added_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.su_medications
    ADD CONSTRAINT su_medications_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.staff(id);


--
-- Name: su_medications su_medications_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.su_medications
    ADD CONSTRAINT su_medications_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: su_medications su_medications_home_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.su_medications
    ADD CONSTRAINT su_medications_home_id_fkey FOREIGN KEY (home_id) REFERENCES public.homes(id);


--
-- Name: su_medications su_medications_su_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.su_medications
    ADD CONSTRAINT su_medications_su_id_fkey FOREIGN KEY (su_id) REFERENCES public.service_users(id);


--
-- Name: su_messages su_messages_home_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.su_messages
    ADD CONSTRAINT su_messages_home_id_fkey FOREIGN KEY (home_id) REFERENCES public.homes(id) ON DELETE CASCADE;


--
-- Name: su_messages su_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.su_messages
    ADD CONSTRAINT su_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: su_messages su_messages_su_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.su_messages
    ADD CONSTRAINT su_messages_su_id_fkey FOREIGN KEY (su_id) REFERENCES public.service_users(id) ON DELETE CASCADE;


--
-- Name: su_reviews su_reviews_conducted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.su_reviews
    ADD CONSTRAINT su_reviews_conducted_by_fkey FOREIGN KEY (conducted_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: su_reviews su_reviews_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.su_reviews
    ADD CONSTRAINT su_reviews_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);


--
-- Name: su_reviews su_reviews_home_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.su_reviews
    ADD CONSTRAINT su_reviews_home_id_fkey FOREIGN KEY (home_id) REFERENCES public.homes(id);


--
-- Name: su_reviews su_reviews_su_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.su_reviews
    ADD CONSTRAINT su_reviews_su_id_fkey FOREIGN KEY (su_id) REFERENCES public.service_users(id);


--
-- Name: task_templates task_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_templates
    ADD CONSTRAINT task_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: task_templates task_templates_home_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_templates
    ADD CONSTRAINT task_templates_home_id_fkey FOREIGN KEY (home_id) REFERENCES public.homes(id);


--
-- Name: task_templates task_templates_su_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_templates
    ADD CONSTRAINT task_templates_su_id_fkey FOREIGN KEY (su_id) REFERENCES public.service_users(id);


--
-- Name: tasks tasks_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.staff(id);


--
-- Name: tasks tasks_completed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES public.staff(id);


--
-- Name: tasks tasks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);


--
-- Name: tasks tasks_home_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_home_id_fkey FOREIGN KEY (home_id) REFERENCES public.homes(id);


--
-- Name: tasks tasks_su_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_su_id_fkey FOREIGN KEY (su_id) REFERENCES public.service_users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict BT6oIg0FNzbW8maHDa3NE3ieAPa2R62OFA1npYG8RMj3hMp4qiDEAakkC1rQuXT

