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
import invoicingRoutes from './routes/invoicing.routes';
import cqcNotificationsRoutes from './routes/cqcNotifications.routes';
import supervisionRoutes from './routes/supervision.routes';
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
app.use('/api/invoicing', invoicingRoutes);
app.use('/api/cqc-notifications', cqcNotificationsRoutes);
app.use('/api/supervision', supervisionRoutes);

import physicalHealthPlanRoutes from './routes/physicalHealthPlan.routes';
import incidentsRoutes from './routes/incidents.routes';
import complianceRoutes from './routes/compliance.routes';
import medicationStockRoutes from './routes/medicationStock.routes';
import signaturesRoutes from './routes/signatures.routes';
app.use('/api/physical-health-plans', physicalHealthPlanRoutes);
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
import diaryRoutes from './routes/diary.routes';
import professionalVisitsRoutes from './routes/professionalVisits.routes';
import medicineRiskRoutes from './routes/medicineRisk.routes';
import performanceMatrixRoutes from './routes/performanceMatrix.routes';
import socialActivitiesRoutes from './routes/socialActivities.routes';
import recruitmentRoutes from './routes/recruitment.routes';
app.use('/api/noticeboard', noticeboardRoutes);
app.use('/api/observations', observationsRoutes);
app.use('/api/seizures', seizuresRoutes);
app.use('/api/bowel-chart', bowelChartRoutes);
app.use('/api/diary', diaryRoutes);
app.use('/api/professional-visits', professionalVisitsRoutes);
app.use('/api/medicine-risk', medicineRiskRoutes);
app.use('/api/performance', performanceMatrixRoutes);
app.use('/api/social-activities', socialActivitiesRoutes);
app.use('/api/recruitment', recruitmentRoutes);

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
       clockin_id UUID,
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
    // ── Resident Diary ────────────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS resident_diary (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
       su_id UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
       recorded_by UUID NOT NULL REFERENCES staff(id) ON DELETE SET NULL,
       diary_date DATE NOT NULL DEFAULT CURRENT_DATE,
       mood VARCHAR(50),
       mood_notes TEXT,
       activities TEXT,
       food_appetite VARCHAR(50),
       fluid_intake VARCHAR(50),
       sleep_quality VARCHAR(50),
       personal_care_done BOOLEAN NOT NULL DEFAULT FALSE,
       notes TEXT,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_diary_su   ON resident_diary(su_id, diary_date DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_diary_home ON resident_diary(home_id, diary_date DESC)`,
    // ── Professional Visits ───────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS professional_visits (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
       su_id UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
       recorded_by UUID NOT NULL REFERENCES staff(id) ON DELETE SET NULL,
       visit_date DATE NOT NULL,
       professional_type VARCHAR(100) NOT NULL,
       professional_name VARCHAR(200),
       organisation VARCHAR(200),
       reason TEXT,
       outcome TEXT,
       instructions_left TEXT,
       follow_up_date DATE,
       follow_up_notes TEXT,
       follow_up_done BOOLEAN NOT NULL DEFAULT FALSE,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_pv_su   ON professional_visits(su_id, visit_date DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_pv_home ON professional_visits(home_id, visit_date DESC)`,
    // ── Medicine Risk Assessments ─────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS medicine_risk_assessments (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
       su_id UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
       assessed_by UUID NOT NULL REFERENCES staff(id) ON DELETE SET NULL,
       assessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       self_medicate BOOLEAN NOT NULL DEFAULT FALSE,
       self_medicate_notes TEXT,
       swallowing_risk VARCHAR(50) NOT NULL DEFAULT 'none',
       swallowing_notes TEXT,
       covert_meds BOOLEAN NOT NULL DEFAULT FALSE,
       covert_notes TEXT,
       prn_protocol BOOLEAN NOT NULL DEFAULT FALSE,
       prn_notes TEXT,
       crushing_required BOOLEAN NOT NULL DEFAULT FALSE,
       crushing_notes TEXT,
       administration_route VARCHAR(100) NOT NULL DEFAULT 'oral',
       known_allergies TEXT,
       storage_location VARCHAR(200),
       risk_level VARCHAR(50) NOT NULL DEFAULT 'low',
       risk_notes TEXT,
       review_date DATE,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_mr_su   ON medicine_risk_assessments(su_id, assessed_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_mr_home ON medicine_risk_assessments(home_id, assessed_at DESC)`,
    // ── Staff Performance Matrix ───────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS staff_performance (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
       staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
       assessed_by UUID NOT NULL REFERENCES staff(id) ON DELETE SET NULL,
       period VARCHAR(50) NOT NULL,
       training_compliance INTEGER,
       supervision_completed BOOLEAN NOT NULL DEFAULT FALSE,
       supervisions_due INTEGER,
       supervisions_done INTEGER,
       incidents_reported INTEGER NOT NULL DEFAULT 0,
       punctuality_score INTEGER CHECK (punctuality_score BETWEEN 1 AND 5),
       attitude_score INTEGER CHECK (attitude_score BETWEEN 1 AND 5),
       care_quality_score INTEGER CHECK (care_quality_score BETWEEN 1 AND 5),
       documentation_score INTEGER CHECK (documentation_score BETWEEN 1 AND 5),
       teamwork_score INTEGER CHECK (teamwork_score BETWEEN 1 AND 5),
       overall_score NUMERIC(4,2),
       risk_rating VARCHAR(50) NOT NULL DEFAULT 'low',
       strengths TEXT,
       areas_improvement TEXT,
       action_plan TEXT,
       notes TEXT,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_perf_staff ON staff_performance(staff_id, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_perf_home  ON staff_performance(home_id, created_at DESC)`,
    `ALTER TABLE su_contacts ADD COLUMN IF NOT EXISTS phone_home VARCHAR(20)`,
    `ALTER TABLE su_contacts DROP CONSTRAINT IF EXISTS su_contacts_contact_tag_check`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS gender_at_birth VARCHAR(50)`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS sexuality VARCHAR(100)`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS care_plan_live_date DATE`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS room_number VARCHAR(20)`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8)`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8)`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS geofence_radius INTEGER NOT NULL DEFAULT 200`,
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
    // ── Staff columns that login depends on ───────────────────────────────────
    `ALTER TABLE staff ADD COLUMN IF NOT EXISTS refresh_token TEXT`,
    `ALTER TABLE staff ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ`,
    `ALTER TABLE staff ADD COLUMN IF NOT EXISTS feature_flags JSONB NOT NULL DEFAULT '{}'`,
    `ALTER TABLE staff ADD COLUMN IF NOT EXISTS leave_hours_total NUMERIC(6,2) NOT NULL DEFAULT 210`,
    `ALTER TABLE staff ADD COLUMN IF NOT EXISTS leave_hours_remaining NUMERIC(6,2) NOT NULL DEFAULT 210`,
    `ALTER TABLE mar_records ADD COLUMN IF NOT EXISTS mar_code VARCHAR(10)`,
    // Add new audit types to enum
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='staff_all' AND enumtypid='audit_type'::regtype) THEN ALTER TYPE audit_type ADD VALUE 'staff_all'; END IF; END $$`,
    // Notifications table
    `CREATE TABLE IF NOT EXISTS notifications (
       id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       recipient_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
       home_id      UUID REFERENCES homes(id) ON DELETE CASCADE,
       title        VARCHAR(255) NOT NULL,
       body         TEXT,
       type         VARCHAR(20) NOT NULL DEFAULT 'info',
       link         VARCHAR(500),
       is_read      BOOLEAN NOT NULL DEFAULT FALSE,
       read_at      TIMESTAMPTZ,
       created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_notif_recipient ON notifications(recipient_id, created_at DESC)`,
    // Ensure staff_messages columns allow null home_id (some inserts don't have homeId)
    `ALTER TABLE staff_messages ALTER COLUMN home_id DROP NOT NULL`,
    // Ensure staff_messages has a message/body alias column
    `ALTER TABLE staff_messages ADD COLUMN IF NOT EXISTS message TEXT`,
    // Fix audit_reports attachments (was mistakenly added as 'audits')
    `ALTER TABLE audit_reports ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'`,
    // Fix performance overall_score precision (NUMERIC(4,2) overflows for 100)
    `ALTER TABLE staff_performance ALTER COLUMN overall_score TYPE NUMERIC(5,2)`,
    // Fix: update existing staff whose total is still at old default 224 → 210
    `UPDATE staff SET leave_hours_total = 210, leave_hours_remaining = 210 WHERE leave_hours_total = 224 AND leave_hours_remaining = 224`,
    // Care plan reads tracking
    `CREATE TABLE IF NOT EXISTS care_plan_reads (
       id         BIGSERIAL PRIMARY KEY,
       plan_id    UUID NOT NULL REFERENCES care_plans(id) ON DELETE CASCADE,
       staff_id   UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
       read_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_cpr_plan ON care_plan_reads(plan_id, read_at DESC)`,
    // Social activities
    `CREATE TABLE IF NOT EXISTS social_activities (
       id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       su_id        UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
       home_id      UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
       staff_id     UUID REFERENCES staff(id) ON DELETE SET NULL,
       title        VARCHAR(255) NOT NULL,
       activity_date DATE NOT NULL,
       duration_mins INTEGER,
       location     VARCHAR(255),
       participants VARCHAR(255),
       enjoyed      VARCHAR(20),
       notes        TEXT,
       created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_sa_su ON social_activities(su_id, activity_date DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_sa_home ON social_activities(home_id, activity_date DESC)`,
    // Recruitment candidates
    `CREATE TABLE IF NOT EXISTS recruitment_candidates (
       id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       home_id        UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
       first_name     VARCHAR(100) NOT NULL,
       last_name      VARCHAR(100) NOT NULL,
       email          VARCHAR(255),
       phone          VARCHAR(30),
       position       VARCHAR(255) NOT NULL,
       applied_date   DATE NOT NULL DEFAULT CURRENT_DATE,
       status         VARCHAR(30) NOT NULL DEFAULT 'applied',
       interview_date DATE,
       notes          TEXT,
       dbs_check      VARCHAR(20),
       reference_check VARCHAR(20),
       created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_recruit_home ON recruitment_candidates(home_id, applied_date DESC)`,
    // Audit attachments column
    `ALTER TABLE audits ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'`,
    // ── audit_log (non-partitioned fallback) ──────────────────────────────────
    `CREATE TABLE IF NOT EXISTS audit_log (
       id          BIGSERIAL PRIMARY KEY,
       timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       staff_id    UUID,
       home_id     UUID,
       action      VARCHAR(100),
       table_name  VARCHAR(100),
       record_id   UUID,
       ip_address  VARCHAR(45),
       session_id  VARCHAR(100),
       new_values  JSONB
     )`,
    // ── Tables used in routes but missing from migrations ─────────────────────
    `CREATE TABLE IF NOT EXISTS su_about_me (
       su_id              UUID PRIMARY KEY REFERENCES service_users(id) ON DELETE CASCADE,
       life_history       TEXT,
       important_people   TEXT,
       daily_routine      TEXT,
       hobbies_interests  TEXT,
       communication      TEXT,
       likes_dislikes     TEXT,
       beliefs_values     TEXT,
       goals_wishes       TEXT,
       support_needs      TEXT,
       updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE TABLE IF NOT EXISTS sensitive_notes (
       id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       su_id       UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
       home_id     UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
       created_by  UUID REFERENCES staff(id) ON DELETE SET NULL,
       note        TEXT NOT NULL,
       category    VARCHAR(50) NOT NULL DEFAULT 'general',
       created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_sensitive_su ON sensitive_notes(su_id, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS capacity_assessments (
       id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       su_id                 UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
       home_id               UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
       assessed_by           UUID REFERENCES staff(id) ON DELETE SET NULL,
       decision_area         TEXT NOT NULL,
       has_capacity          BOOLEAN,
       best_interest_decision TEXT,
       consulted_with        TEXT,
       outcome               TEXT,
       review_date           DATE,
       created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_capacity_su ON capacity_assessments(su_id, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS professional_involvement (
       id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       su_id        UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
       role_title   VARCHAR(255) NOT NULL,
       full_name    VARCHAR(255) NOT NULL,
       organisation VARCHAR(255),
       phone        VARCHAR(30),
       email        VARCHAR(255),
       notes        TEXT,
       created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_professional_su ON professional_involvement(su_id)`,
    `CREATE TABLE IF NOT EXISTS meeting_notes (
       id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       event_id      UUID NOT NULL UNIQUE REFERENCES calendar_events(id) ON DELETE CASCADE,
       created_by    UUID REFERENCES staff(id) ON DELETE SET NULL,
       notes         TEXT,
       action_points TEXT,
       concerns      TEXT,
       attendees     TEXT,
       outcome       TEXT,
       summary       TEXT,
       updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE TABLE IF NOT EXISTS meeting_signoffs (
       event_id   UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
       staff_id   UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
       signed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       PRIMARY KEY (event_id, staff_id)
     )`,
    // ── Invoicing, CQC notifications, Supervision, Appraisals ─────────────────
    `CREATE TABLE IF NOT EXISTS invoices (
       id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       home_id           UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
       su_id             UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
       month_date        DATE NOT NULL,
       commissioned_hours DECIMAL(10,2),
       hourly_rate       DECIMAL(10,2),
       invoice_amount    DECIMAL(12,2),
       status            VARCHAR(20) NOT NULL DEFAULT 'pending',
       notes             TEXT,
       created_by        UUID REFERENCES staff(id),
       created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       UNIQUE(home_id, su_id, month_date)
     )`,
    `CREATE INDEX IF NOT EXISTS idx_invoices_home_su ON invoices(home_id, su_id)`,
    `CREATE INDEX IF NOT EXISTS idx_invoices_status  ON invoices(status)`,
    `CREATE TABLE IF NOT EXISTS cqc_notifications (
       id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       home_id           UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
       su_id             UUID REFERENCES service_users(id) ON DELETE CASCADE,
       notification_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       notification_type VARCHAR(50),
       details           TEXT,
       notified_by       UUID REFERENCES staff(id),
       attachment_url    TEXT,
       status            VARCHAR(20) NOT NULL DEFAULT 'pending',
       created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_cqc_home ON cqc_notifications(home_id, notification_date DESC)`,
    `CREATE TABLE IF NOT EXISTS supervisions (
       id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       home_id               UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
       staff_id              UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
       supervisor_id         UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
       supervision_date      DATE NOT NULL,
       supervision_type      VARCHAR(50),
       summary               TEXT,
       strengths             TEXT,
       areas_for_improvement TEXT,
       action_points         TEXT,
       next_date             DATE,
       created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_supervisions_staff ON supervisions(staff_id, supervision_date DESC)`,
    `CREATE TABLE IF NOT EXISTS appraisals (
       id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       home_id            UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
       staff_id           UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
       appraiser_id       UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
       appraisal_date     DATE NOT NULL,
       rating             VARCHAR(20),
       performance_summary TEXT,
       comments           TEXT,
       goals              TEXT,
       next_review_date   DATE,
       created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_appraisals_staff ON appraisals(staff_id, appraisal_date DESC)`,
    // ── Physical health support plans ─────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS physical_health_plans (
       id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       home_id          UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
       su_id            UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
       created_by       UUID REFERENCES staff(id) ON DELETE SET NULL,
       reviewed_by      UUID REFERENCES staff(id) ON DELETE SET NULL,
       height_cm        NUMERIC(5,1),
       weight_kg        NUMERIC(6,2),
       bmi              NUMERIC(5,2),
       blood_pressure   VARCHAR(20),
       pulse            INTEGER,
       temperature_c    NUMERIC(4,1),
       oxygen_sat       INTEGER,
       conditions       TEXT,
       allergies        TEXT,
       current_meds     TEXT,
       gp_name          VARCHAR(255),
       gp_phone         VARCHAR(30),
       hospital_number  VARCHAR(100),
       nhs_number       VARCHAR(20),
       last_gp_review   DATE,
       next_review_date DATE,
       notes            TEXT,
       review_date      DATE,
       created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_php_su   ON physical_health_plans(su_id, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_php_home ON physical_health_plans(home_id)`,
    // ── quality_records — complaints/compliments extra fields ─────────────────
    `ALTER TABLE quality_records ADD COLUMN IF NOT EXISTS from_type     VARCHAR(50)`,
    `ALTER TABLE quality_records ADD COLUMN IF NOT EXISTS from_name     VARCHAR(255)`,
    `ALTER TABLE quality_records ADD COLUMN IF NOT EXISTS lessons_learnt TEXT`,
    `ALTER TABLE quality_records ADD COLUMN IF NOT EXISTS updates_text   TEXT`,
    `ALTER TABLE quality_records ADD COLUMN IF NOT EXISTS status         VARCHAR(20) NOT NULL DEFAULT 'open'`,
    `ALTER TABLE quality_records ADD COLUMN IF NOT EXISTS entry_date     DATE`,
    // ── risk_assessments — extra risk scoring fields ───────────────────────────
    `ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS risk_before_intervention TEXT`,
    `ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS risk_score               INTEGER`,
    `ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS risk_rating_option        VARCHAR(50)`,
    `ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS evaluation_of_risk        TEXT`,
    `ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS risk_acceptable           VARCHAR(50)`,
    `ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS risk_after_controls       TEXT`,
    `ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS historical_context        TEXT`,
    // ── supervisions — extra supervision/burnout fields ───────────────────────
    `ALTER TABLE supervisions ADD COLUMN IF NOT EXISTS review_frequency             VARCHAR(50)`,
    `ALTER TABLE supervisions ADD COLUMN IF NOT EXISTS supervisor_name_text         VARCHAR(255)`,
    `ALTER TABLE supervisions ADD COLUMN IF NOT EXISTS time_of_meeting              VARCHAR(10)`,
    `ALTER TABLE supervisions ADD COLUMN IF NOT EXISTS location                     VARCHAR(50)`,
    `ALTER TABLE supervisions ADD COLUMN IF NOT EXISTS previous_actions_completed   VARCHAR(20)`,
    `ALTER TABLE supervisions ADD COLUMN IF NOT EXISTS had_absences                 VARCHAR(20)`,
    `ALTER TABLE supervisions ADD COLUMN IF NOT EXISTS workload_scale               INTEGER`,
    `ALTER TABLE supervisions ADD COLUMN IF NOT EXISTS pdp_completed                VARCHAR(20)`,
    `ALTER TABLE supervisions ADD COLUMN IF NOT EXISTS burnout_total                INTEGER`,
    `ALTER TABLE supervisions ADD COLUMN IF NOT EXISTS actions_escalated            VARCHAR(20)`,
    `ALTER TABLE supervisions ADD COLUMN IF NOT EXISTS next_supervision_time        VARCHAR(10)`,
    `ALTER TABLE supervisions ADD COLUMN IF NOT EXISTS conducted_by                 VARCHAR(255)`,
    `ALTER TABLE supervisions ADD COLUMN IF NOT EXISTS metadata                     JSONB NOT NULL DEFAULT '{}'`,
    // ── care_plans — medication support plan fields ───────────────────────────
    `ALTER TABLE care_plans ADD COLUMN IF NOT EXISTS medication_support_level VARCHAR(255)`,
    `ALTER TABLE care_plans ADD COLUMN IF NOT EXISTS manages_own_meds         BOOLEAN NOT NULL DEFAULT FALSE`,
    `ALTER TABLE care_plans ADD COLUMN IF NOT EXISTS level_of_support         TEXT`,
    `ALTER TABLE care_plans ADD COLUMN IF NOT EXISTS support_types            TEXT`,
    `ALTER TABLE care_plans ADD COLUMN IF NOT EXISTS date_medication_review   DATE`,
    `ALTER TABLE care_plans ADD COLUMN IF NOT EXISTS regular_medications      TEXT`,
    `ALTER TABLE care_plans ADD COLUMN IF NOT EXISTS prn_medications          TEXT`,
    `ALTER TABLE care_plans ADD COLUMN IF NOT EXISTS otc_medications          TEXT`,
    `ALTER TABLE care_plans ADD COLUMN IF NOT EXISTS prn_protocol             TEXT`,
    `ALTER TABLE care_plans ADD COLUMN IF NOT EXISTS prn_list                 TEXT`,
    `ALTER TABLE care_plans ADD COLUMN IF NOT EXISTS indication_for_use       TEXT`,
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

