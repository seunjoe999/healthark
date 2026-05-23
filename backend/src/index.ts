import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { errorHandler, notFound } from './middleware/errorHandler';
import { logger } from './config/logger';
import { pool } from './config/database';
import { startScheduler } from './services/scheduler';

// Routes
import authRoutes from './routes/auth.routes';
import homesRoutes from './routes/homes.routes';
import staffRoutes from './routes/staff.routes';
import alertsRoutes from './routes/alerts.routes';
import serviceUserRoutes from './routes/serviceUsers.routes';
import dailyRecordRoutes from './routes/dailyRecords.routes';
import carePlanRoutes from './routes/carePlans.routes';
import riskAssessmentRoutes from './routes/riskAssessments.routes';
import safeguardingRoutes from './routes/safeguarding.routes';
import staffHRRoutes from './routes/staffHR.routes';
import aiAuditRoutes from './routes/aiAudit.routes';
import reportsRoutes from './routes/reports.routes';
import policiesRoutes from './routes/policies.routes';
import ppeRoutes from './routes/ppe.routes';
import documentsRoutes from './routes/documents.routes';
import messagesRoutes from './routes/messages.routes';
import calendarRoutes from './routes/calendar.routes';

const app = express();
const PORT = parseInt(process.env.PORT || '3001');

// â”€â”€ Security â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

// â”€â”€ CORS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : []),
  ...(process.env.RENDER_EXTERNAL_URL ? [process.env.RENDER_EXTERNAL_URL] : []),
  ...(process.env.RENDER_EXTERNAL_HOSTNAME ? [`https://${process.env.RENDER_EXTERNAL_HOSTNAME}`] : []),
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
}));

// â”€â”€ Rate limiting â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.use('/api', rateLimit({ windowMs: 900000, max: 500, standardHeaders: true, legacyHeaders: false }));
app.use('/api/auth/login', rateLimit({ windowMs: 900000, max: 10, standardHeaders: true, legacyHeaders: false }));

// â”€â”€ General middleware â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// â”€â”€ Static files (uploaded documents) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// â”€â”€ Health check â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

// â”€â”€ ALL API Routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.use('/api/auth', authRoutes);
app.use('/api/homes', homesRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/service-users', serviceUserRoutes);
app.use('/api/daily-records', dailyRecordRoutes);
app.use('/api/care-plans', carePlanRoutes);
app.use('/api/risk-assessments', riskAssessmentRoutes);
app.use('/api/safeguarding', safeguardingRoutes);
app.use('/api/staff-hr', staffHRRoutes);
app.use('/api/audits', aiAuditRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/policies', policiesRoutes);
app.use('/api/ppe', ppeRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/calendar', calendarRoutes);

import marRoutes from './routes/mar.routes';
import clockinRoutes from './routes/clockin.routes';
import familyRoutes from './routes/family.routes';
import shiftsRoutes from './routes/shifts.routes';
import searchRoutes from './routes/search.routes';
import notificationsRoutes from './routes/notifications.routes';
import uploadRoutes from './routes/upload.routes';
import reviewsRoutes from './routes/reviews.routes';
import tasksRoutes from './routes/tasks.routes';
import qualityRoutes from './routes/quality.routes';
import assessmentsRoutes from './routes/assessments.routes';
app.use('/api/mar', marRoutes);
app.use('/api/clockin', clockinRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/shifts', shiftsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/quality', qualityRoutes);
app.use('/api/assessments', assessmentsRoutes);

import incidentsRoutes from './routes/incidents.routes';
import complianceRoutes from './routes/compliance.routes';
import medicationStockRoutes from './routes/medicationStock.routes';
import signaturesRoutes from './routes/signatures.routes';
app.use('/api/incidents', incidentsRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/medication-stock', medicationStockRoutes);
app.use('/api/signatures', signaturesRoutes);

import maintenanceRoutes from './routes/maintenance.routes';
import dbsRoutes from './routes/dbs.routes';
import timesheetsRoutes from './routes/timesheets.routes';
import auditTrailRoutes from './routes/auditTrail.routes';
import outcomesRoutes from './routes/outcomes.routes';
import bathChartRoutes from './routes/bathChart.routes';
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/dbs', dbsRoutes);
app.use('/api/timesheets', timesheetsRoutes);
app.use('/api/audit-trail', auditTrailRoutes);
app.use('/api/outcomes', outcomesRoutes);
app.use('/api/bath-chart', bathChartRoutes);

import noticeboardRoutes from './routes/noticeboard.routes';
import observationsRoutes from './routes/observations.routes';
import seizuresRoutes from './routes/seizures.routes';
import bowelChartRoutes from './routes/bowelChart.routes';
app.use('/api/noticeboard', noticeboardRoutes);
app.use('/api/observations', observationsRoutes);
app.use('/api/seizures', seizuresRoutes);
app.use('/api/bowel-chart', bowelChartRoutes);

// ── Serve React frontend ──────────────────────────────────────────────────
import fs from 'fs';
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  logger.info(`Serving frontend from: ${frontendDist}`);
  app.use(express.static(frontendDist));
  app.get(/^(?!\/api|\/uploads).*/, (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  logger.warn(`Frontend dist not found at: ${frontendDist}`);
}

// ── Error handling ────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// â”€â”€ Start â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function ensureColumns() {
  const stmts = [
    // ── New tables ─────────────────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS staff_training (
       id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       staff_id    UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
       course_name VARCHAR(255) NOT NULL,
       expiry_date DATE,
       created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_st_staff  ON staff_training(staff_id)`,
    `CREATE INDEX IF NOT EXISTS idx_st_expiry ON staff_training(expiry_date)`,
    `CREATE TABLE IF NOT EXISTS mar_records (
       id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       home_id     UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
       su_id       UUID REFERENCES service_users(id) ON DELETE CASCADE,
       record_date DATE NOT NULL DEFAULT CURRENT_DATE,
       given       BOOLEAN NOT NULL DEFAULT FALSE,
       refused     BOOLEAN NOT NULL DEFAULT FALSE,
       created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_mar_home ON mar_records(home_id)`,
    `CREATE INDEX IF NOT EXISTS idx_mar_su   ON mar_records(su_id)`,
    `CREATE INDEX IF NOT EXISTS idx_mar_date ON mar_records(record_date)`,
    `CREATE TABLE IF NOT EXISTS safeguarding_concerns (
       id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       home_id       UUID NOT NULL REFERENCES homes(id),
       su_id         UUID NOT NULL REFERENCES service_users(id),
       overview      TEXT,
       incident_date DATE NOT NULL,
       manager_ack   BOOLEAN NOT NULL DEFAULT FALSE,
       created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_safe_home ON safeguarding_concerns(home_id)`,
    `CREATE INDEX IF NOT EXISTS idx_safe_su   ON safeguarding_concerns(su_id)`,
    // ── New columns ────────────────────────────────────────────────────────────
    `ALTER TABLE records_incidents ADD COLUMN IF NOT EXISTS manager_reviewed    BOOLEAN NOT NULL DEFAULT FALSE`,
    `ALTER TABLE records_incidents ADD COLUMN IF NOT EXISTS manager_reviewed_at TIMESTAMPTZ`,
    `ALTER TABLE care_plans ADD COLUMN IF NOT EXISTS last_review_date DATE`,
    `ALTER TABLE care_plans ADD COLUMN IF NOT EXISTS next_review_date DATE`,
    `ALTER TABLE care_plans ADD COLUMN IF NOT EXISTS is_active        BOOLEAN NOT NULL DEFAULT TRUE`,
    `ALTER TABLE care_plans ADD COLUMN IF NOT EXISTS reviewed_by      UUID REFERENCES staff(id) ON DELETE SET NULL`,
    `ALTER TABLE daily_records ADD COLUMN IF NOT EXISTS amount_ml     INTEGER`,
    `ALTER TABLE business_alerts ADD COLUMN IF NOT EXISTS data        JSONB`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS min_fluid_ml  INTEGER NOT NULL DEFAULT 1500`,
    `ALTER TABLE audit_reports ADD COLUMN IF NOT EXISTS total_checks  INTEGER`,
    `ALTER TABLE audit_reports ADD COLUMN IF NOT EXISTS checks_passed INTEGER`,
    `ALTER TABLE audit_reports ADD COLUMN IF NOT EXISTS checks_failed INTEGER`,
    `ALTER TABLE safeguarding_concerns ADD COLUMN IF NOT EXISTS manager_ack BOOLEAN NOT NULL DEFAULT FALSE`,
    // ── New feature tables (migration 003) ────────────────────────────────────
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'maintenance_priority') THEN CREATE TYPE maintenance_priority AS ENUM ('low','medium','high','urgent'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'maintenance_status') THEN CREATE TYPE maintenance_status AS ENUM ('open','in_progress','resolved','closed'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'maintenance_category') THEN CREATE TYPE maintenance_category AS ENUM ('electrical','plumbing','heating','equipment','decoration','security','garden','cleaning','furniture','it','other'); END IF; END $$`,
    `CREATE TABLE IF NOT EXISTS maintenance_logs (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
       title VARCHAR(255) NOT NULL,
       description TEXT,
       category maintenance_category NOT NULL DEFAULT 'other',
       priority maintenance_priority NOT NULL DEFAULT 'medium',
       status maintenance_status NOT NULL DEFAULT 'open',
       location VARCHAR(255),
       reported_by UUID REFERENCES staff(id) ON DELETE SET NULL,
       assigned_to UUID REFERENCES staff(id) ON DELETE SET NULL,
       resolved_by UUID REFERENCES staff(id) ON DELETE SET NULL,
       resolved_at TIMESTAMPTZ,
       resolution_notes TEXT,
       photo_url VARCHAR(500),
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_maintenance_home ON maintenance_logs(home_id)`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dbs_type') THEN CREATE TYPE dbs_type AS ENUM ('basic','standard','enhanced','enhanced_barred'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'doc_status') THEN CREATE TYPE doc_status AS ENUM ('valid','expiring_soon','expired','pending'); END IF; END $$`,
    `CREATE TABLE IF NOT EXISTS staff_dbs (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
       home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
       dbs_number VARCHAR(50),
       dbs_type dbs_type NOT NULL DEFAULT 'enhanced',
       issue_date DATE NOT NULL,
       expiry_date DATE,
       update_service BOOLEAN NOT NULL DEFAULT FALSE,
       status doc_status NOT NULL DEFAULT 'valid',
       notes TEXT,
       document_url VARCHAR(500),
       created_by UUID REFERENCES staff(id) ON DELETE SET NULL,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE TABLE IF NOT EXISTS staff_references (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
       home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
       referee_name VARCHAR(255) NOT NULL,
       referee_position VARCHAR(255),
       referee_company VARCHAR(255),
       referee_email VARCHAR(255),
       referee_phone VARCHAR(20),
       reference_type VARCHAR(50) DEFAULT 'professional',
       received_date DATE,
       status doc_status NOT NULL DEFAULT 'pending',
       notes TEXT,
       document_url VARCHAR(500),
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE TABLE IF NOT EXISTS staff_right_to_work (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
       home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
       document_type VARCHAR(100) NOT NULL,
       document_number VARCHAR(100),
       expiry_date DATE,
       status doc_status NOT NULL DEFAULT 'valid',
       document_url VARCHAR(500),
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE TABLE IF NOT EXISTS timesheets (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
       home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
       week_start DATE NOT NULL,
       week_end DATE NOT NULL,
       total_hours DECIMAL(6,2) NOT NULL DEFAULT 0,
       regular_hours DECIMAL(6,2) NOT NULL DEFAULT 0,
       overtime_hours DECIMAL(6,2) NOT NULL DEFAULT 0,
       hourly_rate DECIMAL(8,2),
       total_pay DECIMAL(10,2),
       approved_by UUID REFERENCES staff(id) ON DELETE SET NULL,
       approved_at TIMESTAMPTZ,
       status VARCHAR(50) NOT NULL DEFAULT 'pending',
       notes TEXT,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       UNIQUE(staff_id, week_start)
     )`,
    `CREATE TABLE IF NOT EXISTS timesheet_entries (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       timesheet_id UUID NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE,
       clockin_id UUID REFERENCES clock_sessions(id) ON DELETE SET NULL,
       work_date DATE NOT NULL,
       start_time TIME,
       end_time TIME,
       break_minutes INTEGER DEFAULT 0,
       hours_worked DECIMAL(5,2) NOT NULL DEFAULT 0,
       shift_type VARCHAR(50),
       notes TEXT,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE TABLE IF NOT EXISTS audit_trail (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       home_id UUID REFERENCES homes(id) ON DELETE SET NULL,
       staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
       staff_name VARCHAR(255),
       action VARCHAR(100) NOT NULL,
       resource_type VARCHAR(100) NOT NULL,
       resource_id UUID,
       resource_label VARCHAR(255),
       old_data JSONB,
       new_data JSONB,
       ip_address VARCHAR(45),
       user_agent TEXT,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_audit_home ON audit_trail(home_id)`,
    `CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_trail(created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS care_outcomes (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       su_id UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
       home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
       care_plan_id UUID REFERENCES care_plans(id) ON DELETE SET NULL,
       goal TEXT NOT NULL,
       description TEXT,
       target_date DATE,
       review_date DATE,
       status outcome_status NOT NULL DEFAULT 'ongoing',
       progress_notes TEXT,
       achieved_date DATE,
       created_by UUID REFERENCES staff(id) ON DELETE SET NULL,
       updated_by UUID REFERENCES staff(id) ON DELETE SET NULL,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE TABLE IF NOT EXISTS outcome_reviews (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       outcome_id UUID NOT NULL REFERENCES care_outcomes(id) ON DELETE CASCADE,
       reviewed_by UUID REFERENCES staff(id) ON DELETE SET NULL,
       status outcome_status NOT NULL,
       notes TEXT NOT NULL,
       review_date DATE NOT NULL,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bath_type') THEN CREATE TYPE bath_type AS ENUM ('bath','shower','bed_bath','strip_wash','hair_wash','foot_soak'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bath_assistance') THEN CREATE TYPE bath_assistance AS ENUM ('independent','prompting','minimal','moderate','full'); END IF; END $$`,
    `CREATE TABLE IF NOT EXISTS bath_charts (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       su_id UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
       home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
       bath_date DATE NOT NULL,
       bath_time TIME,
       bath_type bath_type NOT NULL DEFAULT 'shower',
       assistance_level bath_assistance NOT NULL DEFAULT 'moderate',
       hair_washed BOOLEAN NOT NULL DEFAULT FALSE,
       nails_cut BOOLEAN NOT NULL DEFAULT FALSE,
       shaved BOOLEAN NOT NULL DEFAULT FALSE,
       skin_condition VARCHAR(255),
       notes TEXT,
       given_by UUID REFERENCES staff(id) ON DELETE SET NULL,
       witnessed_by UUID REFERENCES staff(id) ON DELETE SET NULL,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_bath_su ON bath_charts(su_id)`,
    `CREATE INDEX IF NOT EXISTS idx_bath_date ON bath_charts(bath_date DESC)`,
    // ── Extended service_user profile columns ─────────────────────────────────
    // ── Noticeboard ───────────────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS noticeboard (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
       created_by UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
       title VARCHAR(255) NOT NULL,
       body TEXT,
       category VARCHAR(50) NOT NULL DEFAULT 'general',
       is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
       expires_at TIMESTAMPTZ,
       target_role VARCHAR(50),
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_noticeboard_home ON noticeboard(home_id, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS noticeboard_reads (
       notice_id UUID NOT NULL REFERENCES noticeboard(id) ON DELETE CASCADE,
       staff_id  UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
       read_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       PRIMARY KEY (notice_id, staff_id)
     )`,
    // ── Observations (vitals / temperature) ───────────────────────────────────
    `CREATE TABLE IF NOT EXISTS observations (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
       su_id UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
       recorded_by UUID NOT NULL REFERENCES staff(id) ON DELETE SET NULL,
       obs_type VARCHAR(50) NOT NULL DEFAULT 'temperature',
       observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       temp_celsius NUMERIC(4,1),
       temp_method VARCHAR(50),
       systolic INTEGER,
       diastolic INTEGER,
       pulse INTEGER,
       spo2_percent INTEGER,
       o2_litres_min NUMERIC(4,1),
       weight_kg NUMERIC(6,2),
       blood_glucose NUMERIC(5,2),
       notes TEXT,
       is_abnormal BOOLEAN NOT NULL DEFAULT FALSE,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_obs_su ON observations(su_id, observed_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_obs_home ON observations(home_id, observed_at DESC)`,
    // ── Seizure log ───────────────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS seizure_logs (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
       su_id UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
       recorded_by UUID NOT NULL REFERENCES staff(id) ON DELETE SET NULL,
       seizure_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       seizure_type VARCHAR(100) NOT NULL DEFAULT 'unclassified',
       duration_seconds INTEGER,
       description TEXT,
       recovery_time_mins INTEGER,
       post_ictal TEXT,
       action_taken TEXT,
       notified_gp BOOLEAN NOT NULL DEFAULT FALSE,
       notified_family BOOLEAN NOT NULL DEFAULT FALSE,
       notes TEXT,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_seizure_su ON seizure_logs(su_id, seizure_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_seizure_home ON seizure_logs(home_id, seizure_at DESC)`,
    // ── Bowel chart ───────────────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS bowel_charts (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
       su_id UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
       recorded_by UUID NOT NULL REFERENCES staff(id) ON DELETE SET NULL,
       bristol_type INTEGER NOT NULL CHECK (bristol_type BETWEEN 1 AND 7),
       recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       amount VARCHAR(50),
       colour VARCHAR(50),
       consistency VARCHAR(50),
       blood_present BOOLEAN NOT NULL DEFAULT FALSE,
       mucus_present BOOLEAN NOT NULL DEFAULT FALSE,
       notes TEXT,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_bowel_su ON bowel_charts(su_id, recorded_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_bowel_home ON bowel_charts(home_id, recorded_at DESC)`,
    `ALTER TABLE su_contacts ADD COLUMN IF NOT EXISTS phone_home VARCHAR(20)`,
    `ALTER TABLE su_contacts DROP CONSTRAINT IF EXISTS su_contacts_contact_tag_check`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS gender_at_birth VARCHAR(50)`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS sexuality VARCHAR(100)`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS care_plan_live_date DATE`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS room_number VARCHAR(20)`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS team_involvement TEXT`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS mca_capacity VARCHAR(50)`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS dols_active BOOLEAN NOT NULL DEFAULT FALSE`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS dols_start_date DATE`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS dols_end_date DATE`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS dols_notes TEXT`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS cqc_informed BOOLEAN NOT NULL DEFAULT FALSE`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS banding VARCHAR(100)`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS person_id VARCHAR(100)`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS funeral_director VARCHAR(255)`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS bath_frequency VARCHAR(100)`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS bath_preferred_time VARCHAR(100)`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS bath_team_support TEXT`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS bath_type_pref VARCHAR(100)`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS bath_directions TEXT`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS bath_preferred_products TEXT`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS meal_frequency VARCHAR(100)`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS eat_directions TEXT`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS eat_team_preference TEXT`,
  ];
  for (const sql of stmts) {
    await pool.query(sql).catch((err: any) => {
      logger.warn(`ensureSchema skipped: ${err?.message?.split('\n')[0]}`);
    });
  }
  logger.info('Schema verified');
}

async function bootstrap() {
  try {
    await pool.query('SELECT 1');
    logger.info('Database connected successfully');
  } catch (err) {
    logger.error('Database connection failed', { err });
    process.exit(1);
  }

  await ensureColumns();

  app.listen(PORT, () => {
    logger.info(`CompCare Hub API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });

  if (process.env.NODE_ENV !== 'test') startScheduler();
}

process.on('SIGTERM', async () => { await pool.end(); process.exit(0); });
process.on('unhandledRejection', (reason) => logger.error('Unhandled rejection', { reason }));

bootstrap().catch((err) => { logger.error('Bootstrap failed', { err }); process.exit(1); });

export default app;

