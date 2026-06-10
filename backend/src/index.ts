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
import publicRoutes from './routes/public.routes';

const app = express();
const PORT = parseInt(process.env.PORT || '3001');

// Trust Render's reverse proxy so req.ip is the real client IP (not the proxy IP)
app.set('trust proxy', 1);

// â”€â”€ Security â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));
// Disable strict MIME checking globally to let the assets pass through Cloudflare seamlessly
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

// â”€â”€ CORS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://app.comprehensivecare.org.uk',
  'https://comprehensivecare.org.uk',
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
app.use('/api', rateLimit({ windowMs: 900000, max: 1000, standardHeaders: true, legacyHeaders: false }));
app.use('/api/auth/login', rateLimit({ windowMs: 900000, max: 50, standardHeaders: true, legacyHeaders: false }));

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
app.use('/api/public', publicRoutes);

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
import consentsRoutes from './routes/consents.routes';
import confidentialRoutes from './routes/confidential.routes';
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
app.use('/api/consents', consentsRoutes);
app.use('/api/confidential', confidentialRoutes);

// ── Serve React frontend ──────────────────────────────────────────────────
import fs from 'fs';
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  logger.info(`Serving frontend from: ${frontendDist}`);
  // Explicitly serve assets folder with correct MIME types
  // VERY STRICT STATIC SERVING TO PREVENT REACT WILDCARD FROM SWALLOWING JS/CSS
  app.use('/assets', express.static(path.join(frontendDist, 'assets'), {
    maxAge: '1y',
    setHeaders: (res, p) => {
      if (p.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript');
      else if (p.endsWith('.css')) res.setHeader('Content-Type', 'text/css');
    }
  }));
  app.use('/logo.jpeg', express.static(path.join(frontendDist, 'logo.jpeg')));
  app.use('/pwa-192.png', express.static(path.join(frontendDist, 'pwa-192.png')));
  app.use('/pwa-512.png', express.static(path.join(frontendDist, 'pwa-512.png')));
  app.use('/manifest.json', express.static(path.join(frontendDist, 'manifest.json')));
  app.use(express.static(frontendDist));
  app.get(/^(?!\/api|\/uploads|\/assets).*/, (_req, res) => {
    res.setHeader('Surrogate-Control', 'no-store');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
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
    `ALTER TABLE care_plans ADD COLUMN IF NOT EXISTS su_sign_off BOOLEAN NOT NULL DEFAULT FALSE`,
    `ALTER TABLE care_plans ADD COLUMN IF NOT EXISTS staff_sign_off BOOLEAN NOT NULL DEFAULT FALSE`,
    `ALTER TABLE daily_records ADD COLUMN IF NOT EXISTS amount_ml     INTEGER`,
    `ALTER TABLE business_alerts ADD COLUMN IF NOT EXISTS data        JSONB`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS min_fluid_ml  INTEGER NOT NULL DEFAULT 1500`,
    `ALTER TABLE audit_reports ADD COLUMN IF NOT EXISTS total_checks  INTEGER`,
    `ALTER TABLE audit_reports ADD COLUMN IF NOT EXISTS checks_passed INTEGER`,
    `ALTER TABLE audit_reports ADD COLUMN IF NOT EXISTS checks_failed INTEGER`,
    `ALTER TABLE safeguarding_concerns ADD COLUMN IF NOT EXISTS manager_ack BOOLEAN NOT NULL DEFAULT FALSE`,
    `ALTER TABLE assessments ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'`,
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
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS gp_name VARCHAR(255)`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS pharmacy_name VARCHAR(255)`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS annual_health_date DATE`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS annual_health_notes TEXT`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS annual_health_na BOOLEAN NOT NULL DEFAULT FALSE`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS gp_review_date DATE`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS gp_review_notes TEXT`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS gp_review_na BOOLEAN NOT NULL DEFAULT FALSE`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS mental_health_date DATE`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS mental_health_notes TEXT`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS mental_health_na BOOLEAN NOT NULL DEFAULT FALSE`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS dentist_date DATE`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS dentist_notes TEXT`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS dentist_na BOOLEAN NOT NULL DEFAULT FALSE`,
    `ALTER TABLE su_reviews ADD COLUMN IF NOT EXISTS monthly_progress TEXT`,
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
    // Staff messages (internal messaging between staff)
    `CREATE TABLE IF NOT EXISTS staff_messages (
       id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       sender_id    UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
       recipient_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
       home_id      UUID REFERENCES homes(id) ON DELETE CASCADE,
       subject      VARCHAR(255),
       body         TEXT,
       message      TEXT,
       is_read      BOOLEAN NOT NULL DEFAULT FALSE,
       read_at      TIMESTAMPTZ,
       created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_messages_recipient ON staff_messages(recipient_id, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_messages_sender    ON staff_messages(sender_id,    created_at DESC)`,
    // Ensure staff_messages columns allow null home_id (some inserts don't have homeId)
    `ALTER TABLE staff_messages ALTER COLUMN home_id DROP NOT NULL`,
    // Ensure staff_messages has a message column (Render DB may have body instead)
    // Ensure staff_messages has a message column (Render DB may have body instead)
    `ALTER TABLE staff_messages ADD COLUMN IF NOT EXISTS message TEXT`,
    `ALTER TABLE staff_messages ADD COLUMN IF NOT EXISTS body TEXT`,
    `ALTER TABLE staff_messages ALTER COLUMN body DROP NOT NULL`,
    `ALTER TABLE staff_messages ALTER COLUMN message DROP NOT NULL`,
    // Fix recruitment_candidates missing pipeline_stage
    `ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS pipeline_stage VARCHAR(100) DEFAULT 'applied'`,
    // Allow auto-generated performance records to have no assessor
    `ALTER TABLE staff_performance ALTER COLUMN assessed_by DROP NOT NULL`,
    `ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS training_done BOOLEAN NOT NULL DEFAULT FALSE`,
    `ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS dbs_cleared BOOLEAN NOT NULL DEFAULT FALSE`,
    `ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS references_done BOOLEAN NOT NULL DEFAULT FALSE`,
    `ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS fully_compliant BOOLEAN NOT NULL DEFAULT FALSE`,
    `ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS ready_to_start BOOLEAN NOT NULL DEFAULT FALSE`,
    `ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS start_date DATE`,
    `ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS reference_number VARCHAR(20) UNIQUE`,
    `ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS experience_summary TEXT`,
    `ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS years_experience VARCHAR(20)`,
    `ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS right_to_work BOOLEAN DEFAULT TRUE`,
    `ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS interview_date TIMESTAMP`,
    `ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS interview_notes TEXT`,
    `ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS rejection_reason TEXT`,
    `ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS cv_url TEXT`,
    `ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS certificates_urls JSONB DEFAULT '[]'`,
    // Copy body -> message for existing rows that only have body
    `UPDATE staff_messages SET message = body WHERE message IS NULL AND body IS NOT NULL`,
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
       id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       home_id         UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
       first_name      VARCHAR(100) NOT NULL,
       last_name       VARCHAR(100) NOT NULL,
       email           VARCHAR(255),
       phone           VARCHAR(30),
       position        VARCHAR(255) NOT NULL,
       applied_date    DATE NOT NULL DEFAULT CURRENT_DATE,
       status          VARCHAR(30) NOT NULL DEFAULT 'applied',
       pipeline_stage  VARCHAR(30) NOT NULL DEFAULT 'applied',
       interview_date  DATE,
       notes           TEXT,
       dbs_check       VARCHAR(20),
       reference_check VARCHAR(20),
       training_done   BOOLEAN NOT NULL DEFAULT FALSE,
       dbs_cleared     BOOLEAN NOT NULL DEFAULT FALSE,
       references_done BOOLEAN NOT NULL DEFAULT FALSE,
       fully_compliant BOOLEAN NOT NULL DEFAULT FALSE,
       ready_to_start  BOOLEAN NOT NULL DEFAULT FALSE,
       start_date      DATE,
       created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_recruit_home ON recruitment_candidates(home_id, applied_date DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_recruit_pipeline ON recruitment_candidates(home_id, pipeline_stage)`,
    // Handover resident notes
    `CREATE TABLE IF NOT EXISTS handover_resident_notes (
       id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       home_id     UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
       su_id       UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
       shift_date  DATE NOT NULL,
       shift_type  VARCHAR(20) NOT NULL,
       notes       TEXT,
       created_by  UUID REFERENCES staff(id) ON DELETE SET NULL,
       updated_by  UUID REFERENCES staff(id) ON DELETE SET NULL,
       created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       UNIQUE (home_id, su_id, shift_date, shift_type)
     )`,
    `CREATE INDEX IF NOT EXISTS idx_hn_home_date ON handover_resident_notes(home_id, shift_date DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_hn_su ON handover_resident_notes(su_id)`,
    // Leave hours: ensure remaining is set for staff where it is NULL
    `UPDATE staff SET leave_hours_remaining = leave_hours_total WHERE leave_hours_remaining IS NULL`,
    // Leave hours: fix staff still on old 224 default
    `UPDATE staff SET leave_hours_total = 210, leave_hours_remaining = 210 WHERE leave_hours_total = 224`,
    // Audit attachments column (using correct table name audit_reports)
    `ALTER TABLE audit_reports ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'`,
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
    `ALTER TABLE care_plans ADD COLUMN IF NOT EXISTS attachments_notes        TEXT`,
    `ALTER TABLE medicine_risk_assessments ADD COLUMN IF NOT EXISTS triggers           TEXT`,
    `ALTER TABLE medicine_risk_assessments ADD COLUMN IF NOT EXISTS protective_factors TEXT`,
    `ALTER TABLE medicine_risk_assessments ADD COLUMN IF NOT EXISTS attachment_notes   TEXT`,
    // ── care_plans — sign-off and consent fields ──────────────────────────────
    `ALTER TABLE care_plans ADD COLUMN IF NOT EXISTS su_signed_by    TEXT`,
    `ALTER TABLE care_plans ADD COLUMN IF NOT EXISTS su_signed_date  DATE`,
    `ALTER TABLE care_plans ADD COLUMN IF NOT EXISTS staff_signed_by TEXT`,
    `ALTER TABLE care_plans ADD COLUMN IF NOT EXISTS staff_signed_date DATE`,
    `ALTER TABLE care_plans ADD COLUMN IF NOT EXISTS consent_notes   TEXT`,
    `ALTER TABLE care_plans ADD COLUMN IF NOT EXISTS consent_given   BOOLEAN NOT NULL DEFAULT FALSE`,
    `ALTER TABLE care_plans ADD COLUMN IF NOT EXISTS consent_date    DATE`,
    `ALTER TABLE care_plans ADD COLUMN IF NOT EXISTS custom_name     VARCHAR(255)`,
    // ── risk_assessments — sign-off fields ───────────────────────────────────
    `ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS signed_off      BOOLEAN NOT NULL DEFAULT FALSE`,
    `ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS signed_off_by   TEXT`,
    `ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS signed_off_date DATE`,
    // ── service_users — GP and pharmacy contact ───────────────────────────────
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS gp_phone        VARCHAR(30)`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS gp_address       TEXT`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS pharmacy_phone   VARCHAR(30)`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS pharmacy_address  TEXT`,
    // ── care_plans — signature data ───────────────────────────────────────────
    `ALTER TABLE care_plans ADD COLUMN IF NOT EXISTS su_signature_dataurl    TEXT`,
    `ALTER TABLE care_plans ADD COLUMN IF NOT EXISTS staff_signature_dataurl TEXT`,
    `ALTER TABLE care_plans ADD COLUMN IF NOT EXISTS template_data           JSONB DEFAULT '{}'::jsonb`,
    // ── records_behaviour — ABC chart extended fields ─────────────────────────
    `ALTER TABLE records_behaviour ADD COLUMN IF NOT EXISTS behaviour_types      TEXT[]`,
    `ALTER TABLE records_behaviour ADD COLUMN IF NOT EXISTS antecedents          TEXT`,
    `ALTER TABLE records_behaviour ADD COLUMN IF NOT EXISTS consequences         TEXT`,
    `ALTER TABLE records_behaviour ADD COLUMN IF NOT EXISTS care_intervention    TEXT`,
    `ALTER TABLE records_behaviour ADD COLUMN IF NOT EXISTS other_staff_involved BOOLEAN NOT NULL DEFAULT FALSE`,
    // ── records_prn_medication — extended PRN fields ──────────────────────────
    `ALTER TABLE records_prn_medication ADD COLUMN IF NOT EXISTS medicine_type      TEXT`,
    `ALTER TABLE records_prn_medication ADD COLUMN IF NOT EXISTS administered        BOOLEAN NOT NULL DEFAULT TRUE`,
    `ALTER TABLE records_prn_medication ADD COLUMN IF NOT EXISTS side_effects        BOOLEAN NOT NULL DEFAULT FALSE`,
    `ALTER TABLE records_prn_medication ADD COLUMN IF NOT EXISTS side_effects_notes  TEXT`,
    `ALTER TABLE records_prn_medication ADD COLUMN IF NOT EXISTS emotion             TEXT`,
    `ALTER TABLE records_prn_medication ADD COLUMN IF NOT EXISTS completed           BOOLEAN NOT NULL DEFAULT FALSE`,
    // ── staff_training_modules — inbuilt training hub completion tracking ─────
    `CREATE TABLE IF NOT EXISTS staff_training_modules (
       staff_id     UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
       module_id    VARCHAR(100) NOT NULL,
       module_name  VARCHAR(255),
       completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       PRIMARY KEY (staff_id, module_id)
     )`,
    `CREATE INDEX IF NOT EXISTS idx_stm_staff ON staff_training_modules(staff_id)`,
    // Clock-in home postcodes
    `CREATE TABLE IF NOT EXISTS home_postcodes (
       id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       home_id    UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
       postcode   VARCHAR(20) NOT NULL,
       label      VARCHAR(100),
       latitude   DECIMAL(10,7),
       longitude  DECIMAL(10,7),
       radius     INTEGER NOT NULL DEFAULT 200,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       UNIQUE (home_id, postcode)
     )`,
    `CREATE INDEX IF NOT EXISTS idx_hp_home ON home_postcodes(home_id)`,
    // Allow null hours_requested on leave requests (field is optional in the form)
    `ALTER TABLE staff_leave ALTER COLUMN hours_requested DROP NOT NULL`,
    // Allow null for optional numeric fields on service users
    `ALTER TABLE service_users ALTER COLUMN min_fluid_ml DROP NOT NULL`,
    `ALTER TABLE service_users ALTER COLUMN height_cm DROP NOT NULL`,
    `ALTER TABLE service_users ALTER COLUMN weight_kg DROP NOT NULL`,
    // Shift swap requests table
    `CREATE TABLE IF NOT EXISTS shift_swap_requests (
       id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       home_id             UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
       shift_id            UUID NOT NULL REFERENCES staff_shifts(id) ON DELETE CASCADE,
       requesting_staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
       target_staff_id     UUID REFERENCES staff(id) ON DELETE SET NULL,
       status              VARCHAR(20) NOT NULL DEFAULT 'pending',
       notes               TEXT,
       response_notes      TEXT,
       created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_ssr_home ON shift_swap_requests(home_id, status)`,
    // Role permissions — per-home, per-role permission overrides
    `CREATE TABLE IF NOT EXISTS role_permissions (
       home_id     UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
       role        VARCHAR(50) NOT NULL,
       permission  VARCHAR(100) NOT NULL,
       granted     BOOLEAN NOT NULL DEFAULT false,
       updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       PRIMARY KEY (home_id, role, permission)
     )`,
    // Maintenance contacts
    `CREATE TABLE IF NOT EXISTS maintenance_contacts (
       id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       home_id    UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
       name       VARCHAR(255) NOT NULL,
       role       VARCHAR(255),
       company    VARCHAR(255),
       email      VARCHAR(255),
       phone      VARCHAR(50),
       notes      TEXT,
       created_by UUID REFERENCES staff(id) ON DELETE SET NULL,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_mc_home ON maintenance_contacts(home_id)`,
    // Role-level access rights (feature flags per role, not per user)
    `CREATE TABLE IF NOT EXISTS role_access_rights (
       home_id       UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
       role          VARCHAR(50) NOT NULL,
       feature_flags JSONB NOT NULL DEFAULT '{}',
       updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       PRIMARY KEY (home_id, role)
     )`,
    // Consent forms per service user
    `CREATE TABLE IF NOT EXISTS su_consents (
       id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       su_id                  UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
       home_id                UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
       consent_type           VARCHAR(100) NOT NULL,
       has_capacity           VARCHAR(20)  NOT NULL DEFAULT 'yes',
       capacity_notes         TEXT,
       consent_given          BOOLEAN      NOT NULL DEFAULT FALSE,
       consent_method         VARCHAR(100),
       best_interest_decision TEXT,
       decision_maker         VARCHAR(255),
       review_date            DATE,
       notes                  TEXT,
       created_by             UUID REFERENCES staff(id) ON DELETE SET NULL,
       su_signed_by           TEXT,
       su_signed_date         DATE,
       staff_signed_by        TEXT,
       staff_signed_date      DATE,
       created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
       updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
       UNIQUE (su_id, consent_type)
     )`,
    `CREATE INDEX IF NOT EXISTS idx_consents_su   ON su_consents(su_id)`,
    `CREATE INDEX IF NOT EXISTS idx_consents_home ON su_consents(home_id)`,
    // Task templates
    `CREATE TABLE IF NOT EXISTS task_templates (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       home_id UUID NOT NULL,
       title TEXT NOT NULL,
       category TEXT NOT NULL DEFAULT 'general',
       description TEXT,
       frequency TEXT NOT NULL DEFAULT 'daily',
       due_time TEXT,
       assigned_role TEXT,
       priority TEXT NOT NULL DEFAULT 'normal',
       su_id UUID,
       is_active BOOLEAN NOT NULL DEFAULT true,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE TABLE IF NOT EXISTS staff_service_user_assignments (
       id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       home_id    UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
       staff_id   UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
       su_id      UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
       created_at TIMESTAMPTZ DEFAULT NOW(),
       UNIQUE (staff_id, su_id)
     )`,
    `CREATE INDEX IF NOT EXISTS idx_ssua_staff ON staff_service_user_assignments(staff_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ssua_su    ON staff_service_user_assignments(su_id)`,
    `ALTER TABLE records_incidents ADD COLUMN IF NOT EXISTS cqc_notified   BOOLEAN NOT NULL DEFAULT FALSE`,
    `ALTER TABLE records_incidents ADD COLUMN IF NOT EXISTS family_notified BOOLEAN NOT NULL DEFAULT FALSE`,
    `ALTER TABLE records_incidents ADD COLUMN IF NOT EXISTS emotion        TEXT`,
    `ALTER TABLE records_incidents ADD COLUMN IF NOT EXISTS review_notes   JSONB NOT NULL DEFAULT '[]'::jsonb`,
    `ALTER TABLE records_incidents ADD COLUMN IF NOT EXISTS signature      JSONB`,
    `ALTER TABLE records_incidents ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ DEFAULT NOW()`,
    // ── Confidential Information ──────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS confidential_info (
       id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       home_id       UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
       subject_type  VARCHAR(20) NOT NULL CHECK (subject_type IN ('service_user','staff')),
       subject_id    UUID NOT NULL,
       title         VARCHAR(255) NOT NULL,
       content       TEXT,
       document_url  VARCHAR(500),
       document_name VARCHAR(255),
       signature_data TEXT,
       signed_by     VARCHAR(255),
       created_by    UUID REFERENCES staff(id) ON DELETE SET NULL,
       created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_confinfo_home    ON confidential_info(home_id, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_confinfo_subject ON confidential_info(subject_id, subject_type)`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='team_leader' AND enumtypid=(SELECT oid FROM pg_type WHERE typname='staff_role')) THEN ALTER TYPE staff_role ADD VALUE 'team_leader'; END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='admin' AND enumtypid=(SELECT oid FROM pg_type WHERE typname='staff_role')) THEN ALTER TYPE staff_role ADD VALUE 'admin'; END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='deputy_manager' AND enumtypid=(SELECT oid FROM pg_type WHERE typname='staff_role')) THEN ALTER TYPE staff_role ADD VALUE 'deputy_manager'; END IF; END $$`,
    // ── medicine_risk_assessments — controlled meds, document, sign-off ──────
    `ALTER TABLE medicine_risk_assessments ADD COLUMN IF NOT EXISTS controlled_meds          BOOLEAN NOT NULL DEFAULT FALSE`,
    `ALTER TABLE medicine_risk_assessments ADD COLUMN IF NOT EXISTS controlled_notes         TEXT`,
    `ALTER TABLE medicine_risk_assessments ADD COLUMN IF NOT EXISTS controlled_witness       VARCHAR(255)`,
    `ALTER TABLE medicine_risk_assessments ADD COLUMN IF NOT EXISTS controlled_witness_sig   TEXT`,
    `ALTER TABLE medicine_risk_assessments ADD COLUMN IF NOT EXISTS document_url             VARCHAR(500)`,
    `ALTER TABLE medicine_risk_assessments ADD COLUMN IF NOT EXISTS document_name            VARCHAR(255)`,
    `ALTER TABLE medicine_risk_assessments ADD COLUMN IF NOT EXISTS signed_off_by            VARCHAR(255)`,
    `ALTER TABLE medicine_risk_assessments ADD COLUMN IF NOT EXISTS signed_off_date          DATE`,
    `ALTER TABLE medicine_risk_assessments ADD COLUMN IF NOT EXISTS staff_signature          TEXT`,
    // ── risk_assessments — update tracking and last assessed date ─────────────
    `ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS risk_update_tracking TEXT`,
    `ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS last_assessed_date   DATE`,
  ];
  for (const sql of stmts) {
    await pool.query(sql).catch((err: any) => {
      logger.warn(`ensureSchema skipped: ${err?.message?.split('\n')[0]}`);
    });
  }
  logger.info('Schema verified');
}

const ROLE_PERMISSION_DEFAULTS: Record<string, Record<string, boolean>> = {
  care_staff:     { edit_service_users: false, edit_care_plans: false, view_sensitive_info: false, edit_staff: false, manage_rota: false, approve_leave: false, manage_tasks: false, view_reports: false, access_all_residents: false },
  team_leader:    { edit_service_users: false, edit_care_plans: false, view_sensitive_info: true,  edit_staff: false, manage_rota: true,  approve_leave: false, manage_tasks: false, view_reports: true,  access_all_residents: false },
  admin:          { edit_service_users: false, edit_care_plans: true,  view_sensitive_info: true,  edit_staff: true,  manage_rota: true,  approve_leave: true,  manage_tasks: true,  view_reports: true,  access_all_residents: true  },
  deputy_manager: { edit_service_users: true,  edit_care_plans: true,  view_sensitive_info: true,  edit_staff: true,  manage_rota: true,  approve_leave: true,  manage_tasks: true,  view_reports: true,  access_all_residents: true  },
  home_manager:   { edit_service_users: true,  edit_care_plans: true,  view_sensitive_info: true,  edit_staff: true,  manage_rota: true,  approve_leave: true,  manage_tasks: true,  view_reports: true,  access_all_residents: true  },
  group_admin:    { edit_service_users: true,  edit_care_plans: true,  view_sensitive_info: true,  edit_staff: true,  manage_rota: true,  approve_leave: true,  manage_tasks: true,  view_reports: true,  access_all_residents: true  },
};

async function seedRolePermissions() {
  try {
    const homes = await pool.query('SELECT id FROM homes WHERE is_active = true');
    for (const home of homes.rows) {
      for (const [role, perms] of Object.entries(ROLE_PERMISSION_DEFAULTS)) {
        for (const [permission, granted] of Object.entries(perms)) {
          await pool.query(
            `INSERT INTO role_permissions (home_id, role, permission, granted)
             VALUES ($1,$2,$3,$4)
             ON CONFLICT (home_id, role, permission) DO NOTHING`,
            [home.id, role, permission, granted]
          );
        }
      }
    }
    logger.info('Role permissions seeded');
  } catch (err: any) {
    logger.warn('Role permissions seed skipped: ' + err?.message);
  }
}

async function bootstrap() {
  try {
    await pool.query('SELECT 1');
    logger.info('Database connected successfully');
  } catch (err) {
    logger.error('Database connection failed', { err });
    process.exit(1);
  }

  // Add monthly_progress to care_plan_type enum if it doesn't exist yet
  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'monthly_progress'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'care_plan_type')) THEN
        ALTER TYPE care_plan_type ADD VALUE 'monthly_progress';
      END IF;
    END $$
  `).catch((err: any) => logger.warn('Enum update skipped: ' + err?.message));

  await ensureColumns();
  await seedRolePermissions();

  app.listen(PORT, () => {
    logger.info(`CompCare Hub API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });

  if (process.env.NODE_ENV !== 'test') startScheduler();
}

process.on('SIGTERM', async () => { await pool.end(); process.exit(0); });
process.on('unhandledRejection', (reason) => logger.error('Unhandled rejection', { reason }));

bootstrap().catch((err) => { logger.error('Bootstrap failed', { err }); process.exit(1); });

export default app;

// Trigger deploy
