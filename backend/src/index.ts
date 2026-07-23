// MUST BE THE VERY FIRST LINE
require('dotenv').config(); 
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
import { seedNewFeatures } from './seed';

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
  'https://compcarehub.co.uk',
  'https://www.compcarehub.co.uk',
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

app.get('/api/version', (_req, res) => {
  res.json({ commit: process.env.RENDER_GIT_COMMIT || 'local', ts: Date.now() });
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
// Mount the more specific /api/assessments/news2 BEFORE the general
// /api/assessments router. Express matches in registration order, so if the
// general router (which has a `/:id` handler) is registered first, a request to
// /api/assessments/news2 gets captured by `/:id` and "news2" is treated as a
// UUID, causing a 500. Registering the specific path first avoids that.
import news2Routes from './routes/news2.routes';
app.use('/api/assessments/news2', news2Routes);
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
import aiRoutes from './routes/ai.routes';
app.use('/api/ai', aiRoutes);
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

// ── Phase 3 routes ────────────────────────────────────────────────────────
import fluidBalanceRoutes from './routes/fluidBalance.routes';
import weightTrackerRoutes from './routes/weightTracker.routes';
import woundCareRoutes from './routes/woundCare.routes';
import peepRoutes from './routes/peep.routes';
import hospitalAdmissionsRoutes from './routes/hospitalAdmissions.routes';
import environmentalRoutes from './routes/environmental.routes';
import bedOccupancyRoutes from './routes/bedOccupancy.routes';
import waitingListRoutes from './routes/waitingList.routes';
import visitorLogRoutes from './routes/visitorLog.routes';
import contractorsRoutes from './routes/contractors.routes';
import lessonsLearnedRoutes from './routes/lessonsLearned.routes';
import staffAbsenceRoutes from './routes/staffAbsence.routes';
import trainingMatrixRoutes from './routes/trainingMatrix.routes';
import externalContactsRoutes from './routes/externalContacts.routes';
import seedRoutes from './routes/seed.routes';
app.use('/api/fluid-balance', fluidBalanceRoutes);
app.use('/api/weight-tracker', weightTrackerRoutes);
app.use('/api/wound-care', woundCareRoutes);
app.use('/api/peep', peepRoutes);
app.use('/api/hospital-admissions', hospitalAdmissionsRoutes);
app.use('/api/environmental', environmentalRoutes);
app.use('/api/bed-occupancy', bedOccupancyRoutes);
app.use('/api/waiting-list', waitingListRoutes);
app.use('/api/visitor-log', visitorLogRoutes);
app.use('/api/contractors', contractorsRoutes);
app.use('/api/lessons-learned', lessonsLearnedRoutes);
app.use('/api/staff-absence', staffAbsenceRoutes);
app.use('/api/training-matrix', trainingMatrixRoutes);
app.use('/api/external-contacts', externalContactsRoutes);
app.use('/api/seed', seedRoutes);

import waterlowRoutes from './routes/waterlow.routes';
import cqcRoutes from './routes/cqc.routes';
import clinicalRoutes from './routes/clinical.routes';
// news2Routes is imported & mounted earlier (before the general /api/assessments router)
app.use('/api/assessments', waterlowRoutes);
app.use('/api/cqc', cqcRoutes);
app.use('/api/clinical', clinicalRoutes);

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

/**
 * createCoreTables — runs before ensureColumns().
 * Creates every foundational table that other tables reference.
 * Uses CREATE TABLE IF NOT EXISTS so it is safe on a populated DB.
 * Each statement is wrapped in its own try/catch so one failure
 * never blocks the rest.
 */
async function createCoreTables() {
  const stmts: Array<{ label: string; sql: string }> = [
    // ── Extensions ────────────────────────────────────────────────────────────
    { label: 'extension pgcrypto', sql: `CREATE EXTENSION IF NOT EXISTS pgcrypto` },
    { label: 'extension uuid-ossp', sql: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"` },
    { label: 'extension pg_trgm', sql: `CREATE EXTENSION IF NOT EXISTS pg_trgm` },

    // ── Enums (guard with DO $$ so we never error on “already exists”) ────────
    { label: 'enum staff_role', sql: `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='staff_role') THEN CREATE TYPE staff_role AS ENUM ('care_staff','senior_carer','home_manager','group_admin','auditor','team_leader','admin','deputy_manager'); END IF; END $$` },
    { label: 'enum staff_status', sql: `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='staff_status') THEN CREATE TYPE staff_status AS ENUM ('active','on_leave','suspended','resigned','terminated','pending'); END IF; END $$` },
    { label: 'enum su_status', sql: `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='su_status') THEN CREATE TYPE su_status AS ENUM ('live','pre_admission','archive','on_hold','hospital'); END IF; END $$` },
    { label: 'enum emergency_rating', sql: `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='emergency_rating') THEN CREATE TYPE emergency_rating AS ENUM ('low','medium','high'); END IF; END $$` },
    { label: 'enum gender_type', sql: `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='gender_type') THEN CREATE TYPE gender_type AS ENUM ('male','female','non_binary','prefer_not_to_say','other'); END IF; END $$` },
    { label: 'enum leave_type', sql: `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='leave_type') THEN CREATE TYPE leave_type AS ENUM ('annual','sick','unauthorised','maternity','paternity','compassionate','other'); END IF; END $$` },
    { label: 'enum leave_status', sql: `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='leave_status') THEN CREATE TYPE leave_status AS ENUM ('pending','approved','declined','cancelled'); END IF; END $$` },
    { label: 'enum review_frequency', sql: `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='review_frequency') THEN CREATE TYPE review_frequency AS ENUM ('weekly','fortnightly','monthly','eight_weekly','yearly'); END IF; END $$` },
    { label: 'enum risk_level', sql: `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='risk_level') THEN CREATE TYPE risk_level AS ENUM ('low','medium','high','critical'); END IF; END $$` },
    { label: 'enum outcome_status', sql: `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='outcome_status') THEN CREATE TYPE outcome_status AS ENUM ('yes','partially','no','ongoing'); END IF; END $$` },
    { label: 'enum care_plan_type', sql: `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='care_plan_type') THEN CREATE TYPE care_plan_type AS ENUM ('physical','communication','oral_care','medical','food_and_fluids','one_page_profile','finance','visitation','vulnerability','personal_hygiene','hydration_skin','social_activities','community_access','distress_behaviour','crisis','alcohol_use','home_safety','emotional_breakdown','positive_behaviour','oral_care_assessment','autism','pen_assessment','personal_evacuation','end_of_life','adhd','custom','monthly_progress'); END IF; END $$` },
    { label: 'enum assessment_type', sql: `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='assessment_type') THEN CREATE TYPE assessment_type AS ENUM ('clinical_supervision','employment_risk','interview','medication_competency','new_staff','competency','pip','pregnancy_risk','return_to_work','shadow_shift','spot_check','appraisal','staff_competency','one_to_one','training_compliance','supervision','team_leader_review','custom'); END IF; END $$` },
    { label: 'enum audit_type', sql: `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='audit_type') THEN CREATE TYPE audit_type AS ENUM ('medication','infection_control','fire_safety','documentation','falls_prevention','safeguarding','nutrition_hydration','activity','care_plan','incident_analysis','pressure_sore','one_to_one','equipment','premises','mandatory_safety','mar_chart','free_template','staff_all'); END IF; END $$` },
    { label: 'enum alert_type', sql: `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='alert_type') THEN CREATE TYPE alert_type AS ENUM ('task_missed','care_plan_overdue','risk_assessment_overdue','medication_gap','fluid_below_threshold','weight_alert','vital_sign_flag','training_expiring','training_expired','incident_not_reviewed','unsigned_policy','stock_low','dnar_missing','document_expiring','care_plan_review_due'); END IF; END $$` },
    { label: 'enum alert_severity', sql: `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='alert_severity') THEN CREATE TYPE alert_severity AS ENUM ('info','warning','critical'); END IF; END $$` },
    { label: 'enum maintenance_priority', sql: `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='maintenance_priority') THEN CREATE TYPE maintenance_priority AS ENUM ('low','medium','high','urgent'); END IF; END $$` },
    { label: 'enum maintenance_status', sql: `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='maintenance_status') THEN CREATE TYPE maintenance_status AS ENUM ('open','in_progress','resolved','closed'); END IF; END $$` },
    { label: 'enum maintenance_category', sql: `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='maintenance_category') THEN CREATE TYPE maintenance_category AS ENUM ('electrical','plumbing','heating','equipment','decoration','security','garden','cleaning','furniture','it','other'); END IF; END $$` },
    { label: 'enum dbs_type', sql: `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='dbs_type') THEN CREATE TYPE dbs_type AS ENUM ('basic','standard','enhanced','enhanced_barred'); END IF; END $$` },
    { label: 'enum doc_status', sql: `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='doc_status') THEN CREATE TYPE doc_status AS ENUM ('valid','expiring_soon','expired','pending'); END IF; END $$` },
    { label: 'enum bath_type', sql: `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='bath_type') THEN CREATE TYPE bath_type AS ENUM ('bath','shower','bed_bath','strip_wash','hair_wash','foot_soak'); END IF; END $$` },
    { label: 'enum bath_assistance', sql: `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='bath_assistance') THEN CREATE TYPE bath_assistance AS ENUM ('independent','prompting','minimal','moderate','full'); END IF; END $$` },

    // ── Root tables (no foreign-key dependencies) ─────────────────────────────
    { label: 'table organisations', sql: `CREATE TABLE IF NOT EXISTS organisations (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name          VARCHAR(255) NOT NULL,
      reg_number    VARCHAR(100),
      cqc_provider  VARCHAR(100),
      address1      VARCHAR(255),
      address2      VARCHAR(255),
      address3      VARCHAR(255),
      postcode      VARCHAR(10),
      phone         VARCHAR(20),
      email         VARCHAR(255),
      logo_url      VARCHAR(500),
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )` },

    { label: 'table homes', sql: `CREATE TABLE IF NOT EXISTS homes (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
      name            VARCHAR(255) NOT NULL,
      cqc_location_id VARCHAR(100),
      address1        VARCHAR(255) NOT NULL DEFAULT '',
      address2        VARCHAR(255),
      address3        VARCHAR(255),
      postcode        VARCHAR(10) NOT NULL DEFAULT '',
      latitude        DECIMAL(10,8),
      longitude       DECIMAL(11,8),
      phone           VARCHAR(20),
      email           VARCHAR(255),
      manager_name    VARCHAR(255),
      geofence_radius INTEGER NOT NULL DEFAULT 200,
      qr_token        VARCHAR(255) UNIQUE DEFAULT encode(gen_random_bytes(32),'hex'),
      is_active       BOOLEAN NOT NULL DEFAULT TRUE,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )` },
    { label: 'idx homes_org', sql: `CREATE INDEX IF NOT EXISTS idx_homes_org ON homes(organisation_id)` },

    { label: 'table staff', sql: `CREATE TABLE IF NOT EXISTS staff (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
      home_id         UUID REFERENCES homes(id) ON DELETE SET NULL,
      email           VARCHAR(255) UNIQUE NOT NULL,
      password_hash   VARCHAR(255) NOT NULL DEFAULT '',
      first_name      VARCHAR(100) NOT NULL DEFAULT '',
      last_name       VARCHAR(100) NOT NULL DEFAULT '',
      preferred_name  VARCHAR(100),
      role            VARCHAR(50) NOT NULL DEFAULT 'care_staff',
      status          VARCHAR(50) NOT NULL DEFAULT 'active',
      photo_url       VARCHAR(500),
      phone           VARCHAR(20),
      address1        VARCHAR(255),
      address2        VARCHAR(255),
      address3        VARCHAR(255),
      postcode        VARCHAR(10),
      date_of_birth   DATE,
      gender          VARCHAR(50),
      nationality     VARCHAR(100),
      marital_status  VARCHAR(50),
      ni_number       VARCHAR(20),
      start_date      DATE,
      leave_date      DATE,
      leave_hours_total    DECIMAL(6,2) NOT NULL DEFAULT 210,
      leave_hours_used     DECIMAL(6,2) NOT NULL DEFAULT 0,
      leave_hours_remaining DECIMAL(6,2) NOT NULL DEFAULT 210,
      emergency_name  VARCHAR(255),
      emergency_phone VARCHAR(20),
      emergency_notes TEXT,
      access_any_network BOOLEAN NOT NULL DEFAULT TRUE,
      is_active       BOOLEAN NOT NULL DEFAULT TRUE,
      last_login      TIMESTAMPTZ,
      refresh_token   TEXT,
      reset_token     VARCHAR(255),
      reset_token_expiry TIMESTAMPTZ,
      feature_flags   JSONB NOT NULL DEFAULT '{}',
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )` },
    { label: 'idx staff_email', sql: `CREATE INDEX IF NOT EXISTS idx_staff_email ON staff(email)` },
    { label: 'idx staff_home', sql: `CREATE INDEX IF NOT EXISTS idx_staff_home ON staff(home_id)` },

    { label: 'table service_users', sql: `CREATE TABLE IF NOT EXISTS service_users (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      home_id         UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
      first_name      VARCHAR(100) NOT NULL,
      last_name       VARCHAR(100) NOT NULL,
      preferred_name  VARCHAR(100),
      date_of_birth   DATE NOT NULL DEFAULT CURRENT_DATE,
      gender          VARCHAR(50),
      pronouns        VARCHAR(50),
      photo_url       VARCHAR(500),
      status          VARCHAR(50) NOT NULL DEFAULT 'pre_admission',
      emergency_rating VARCHAR(20) NOT NULL DEFAULT 'low',
      nhs_number      VARCHAR(20),
      ni_number       VARCHAR(20),
      qr_token        VARCHAR(255) UNIQUE DEFAULT encode(gen_random_bytes(16),'hex'),
      dnar            BOOLEAN,
      dnar_form_url   VARCHAR(500),
      dnar_location   TEXT,
      admission_date  DATE,
      local_authority VARCHAR(255),
      service_name    VARCHAR(255),
      acp_url         VARCHAR(500),
      acp_date        DATE,
      funeral_noted   BOOLEAN NOT NULL DEFAULT FALSE,
      funeral_details TEXT,
      address1        VARCHAR(255),
      address2        VARCHAR(255),
      address3        VARCHAR(255),
      postcode        VARCHAR(10),
      email           VARCHAR(255),
      phone           VARCHAR(20),
      key_safe_code   VARCHAR(100),
      religion        VARCHAR(100),
      ethnicity       VARCHAR(100),
      marital_status  VARCHAR(50),
      comms_prefs     TEXT,
      life_history    TEXT,
      hobbies         TEXT,
      daily_routine   TEXT,
      height_cm       DECIMAL(5,1),
      weight_kg       DECIMAL(5,2),
      bmi             DECIMAL(4,1),
      medical_history TEXT,
      med_allergies   TEXT,
      requires_oxygen BOOLEAN NOT NULL DEFAULT FALSE,
      has_catheter    BOOLEAN NOT NULL DEFAULT FALSE,
      has_peg         BOOLEAN NOT NULL DEFAULT FALSE,
      food_allergies  TEXT,
      nil_by_mouth    BOOLEAN NOT NULL DEFAULT FALSE,
      special_diet    TEXT,
      fluid_consistency VARCHAR(100),
      min_fluid_ml    INTEGER DEFAULT 1500,
      diet_instructions TEXT,
      capacity_doc_url  VARCHAR(500),
      best_interest_url VARCHAR(500),
      has_lpa           BOOLEAN NOT NULL DEFAULT FALSE,
      lpa_type          VARCHAR(100),
      lpa_attorney      VARCHAR(255),
      has_cop_order     BOOLEAN NOT NULL DEFAULT FALSE,
      cop_details       TEXT,
      need_to_know    TEXT,
      my_instructions TEXT,
      room_number     VARCHAR(20),
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )` },
    { label: 'idx su_home', sql: `CREATE INDEX IF NOT EXISTS idx_su_home ON service_users(home_id)` },
    { label: 'idx su_status', sql: `CREATE INDEX IF NOT EXISTS idx_su_status ON service_users(status)` },

    // ── Tables that other tables reference ────────────────────────────────────
    { label: 'table care_plans', sql: `CREATE TABLE IF NOT EXISTS care_plans (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      su_id            UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
      home_id          UUID NOT NULL REFERENCES homes(id),
      plan_type        VARCHAR(100) NOT NULL DEFAULT 'custom',
      custom_name      VARCHAR(255),
      aims_outcomes    TEXT,
      what_i_can_do    TEXT,
      how_to_support   TEXT,
      outcome_achieved VARCHAR(50),
      outcome_date     DATE,
      review_frequency VARCHAR(50) NOT NULL DEFAULT 'monthly',
      last_review_date DATE,
      next_review_date DATE,
      reviewed_by      UUID REFERENCES staff(id),
      is_active        BOOLEAN NOT NULL DEFAULT TRUE,
      created_by       UUID REFERENCES staff(id),
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )` },
    { label: 'idx care_plans_su', sql: `CREATE INDEX IF NOT EXISTS idx_care_plans_su ON care_plans(su_id)` },

    { label: 'table risk_assessments', sql: `CREATE TABLE IF NOT EXISTS risk_assessments (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      su_id             UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
      home_id           UUID NOT NULL REFERENCES homes(id),
      assessment_name   VARCHAR(255) NOT NULL DEFAULT 'Assessment',
      description       TEXT,
      risk_level        VARCHAR(20) NOT NULL DEFAULT 'low',
      current_risk_level VARCHAR(20) NOT NULL DEFAULT 'low',
      who_is_at_risk    TEXT,
      is_historical     BOOLEAN NOT NULL DEFAULT FALSE,
      what_could_happen TEXT,
      triggers          TEXT,
      protective_factors TEXT,
      management_plan   TEXT,
      review_frequency  VARCHAR(50) NOT NULL DEFAULT 'monthly',
      last_review_date  DATE,
      next_review_date  DATE,
      reviewed_by       UUID REFERENCES staff(id),
      is_active         BOOLEAN NOT NULL DEFAULT TRUE,
      created_by        UUID REFERENCES staff(id),
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )` },
    { label: 'idx risks_su', sql: `CREATE INDEX IF NOT EXISTS idx_risks_su ON risk_assessments(su_id)` },

    { label: 'table daily_records', sql: `CREATE TABLE IF NOT EXISTS daily_records (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      su_id        UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
      home_id      UUID NOT NULL REFERENCES homes(id),
      staff_id     UUID NOT NULL REFERENCES staff(id),
      record_type  VARCHAR(50) NOT NULL,
      record_date  DATE NOT NULL DEFAULT CURRENT_DATE,
      recorded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      shift        VARCHAR(20),
      notes        TEXT,
      flagged      BOOLEAN NOT NULL DEFAULT FALSE,
      flag_reason  TEXT,
      ai_reviewed  BOOLEAN NOT NULL DEFAULT FALSE,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )` },
    { label: 'idx dr_su', sql: `CREATE INDEX IF NOT EXISTS idx_dr_su ON daily_records(su_id)` },
    { label: 'idx dr_home', sql: `CREATE INDEX IF NOT EXISTS idx_dr_home ON daily_records(home_id)` },
    { label: 'idx dr_date', sql: `CREATE INDEX IF NOT EXISTS idx_dr_date ON daily_records(record_date)` },

    { label: 'table calendar_events', sql: `CREATE TABLE IF NOT EXISTS calendar_events (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      home_id      UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
      created_by   UUID NOT NULL REFERENCES staff(id),
      title        VARCHAR(255) NOT NULL,
      event_type   VARCHAR(50),
      start_time   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      end_time     TIMESTAMPTZ,
      location     TEXT,
      description  TEXT,
      agenda       TEXT,
      attendees    UUID[],
      notes        TEXT,
      action_plans TEXT,
      concerns     TEXT,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )` },

    { label: 'table su_medications', sql: `CREATE TABLE IF NOT EXISTS su_medications (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      su_id           UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
      home_id         UUID NOT NULL REFERENCES homes(id),
      medication_name VARCHAR(255) NOT NULL,
      dose            VARCHAR(100),
      route           VARCHAR(50),
      frequency       VARCHAR(100),
      prescriber      VARCHAR(255),
      start_date      DATE,
      end_date        DATE,
      is_active       BOOLEAN NOT NULL DEFAULT TRUE,
      is_prn          BOOLEAN NOT NULL DEFAULT FALSE,
      notes           TEXT,
      created_by      UUID REFERENCES staff(id),
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )` },
    { label: 'idx su_meds_su', sql: `CREATE INDEX IF NOT EXISTS idx_su_meds_su ON su_medications(su_id)` },

    { label: 'table records_incidents', sql: `CREATE TABLE IF NOT EXISTS records_incidents (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      daily_record_id  UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
      incident_type    VARCHAR(50),
      location         TEXT,
      incident_time    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      description      TEXT NOT NULL DEFAULT '',
      injuries         BOOLEAN NOT NULL DEFAULT FALSE,
      injury_details   TEXT,
      body_map_data    JSONB,
      medical_needed   BOOLEAN NOT NULL DEFAULT FALSE,
      medical_details  TEXT,
      witnesses        TEXT,
      immediate_action TEXT NOT NULL DEFAULT '',
      reported_to      UUID REFERENCES staff(id),
      reported_at      TIMESTAMPTZ,
      safeguarding_ref BOOLEAN NOT NULL DEFAULT FALSE,
      manager_reviewed BOOLEAN NOT NULL DEFAULT FALSE,
      manager_reviewed_at TIMESTAMPTZ,
      ai_analysis      TEXT,
      ai_analysed_at   TIMESTAMPTZ
    )` },
    { label: 'idx incidents_record', sql: `CREATE INDEX IF NOT EXISTS idx_incidents_record ON records_incidents(daily_record_id)` },

    { label: 'table records_behaviour', sql: `CREATE TABLE IF NOT EXISTS records_behaviour (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      daily_record_id UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
      mood            VARCHAR(30),
      behaviour_noted TEXT,
      triggers_noted  TEXT,
      action_taken    TEXT,
      escalated       BOOLEAN NOT NULL DEFAULT FALSE
    )` },

    { label: 'table records_prn_medication', sql: `CREATE TABLE IF NOT EXISTS records_prn_medication (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      daily_record_id UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
      medication_name VARCHAR(255) NOT NULL,
      dose            VARCHAR(100),
      reason          TEXT NOT NULL DEFAULT '',
      administered_by UUID NOT NULL REFERENCES staff(id),
      witnessed_by    UUID REFERENCES staff(id),
      outcome_notes   TEXT,
      reviewed_at     TIMESTAMPTZ
    )` },

    { label: 'table business_alerts', sql: `CREATE TABLE IF NOT EXISTS business_alerts (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      home_id      UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
      alert_type   VARCHAR(100) NOT NULL,
      severity     VARCHAR(20) NOT NULL DEFAULT 'warning',
      title        VARCHAR(255) NOT NULL,
      description  TEXT NOT NULL DEFAULT '',
      su_id        UUID REFERENCES service_users(id),
      staff_id     UUID REFERENCES staff(id),
      record_id    UUID,
      record_type  VARCHAR(50),
      is_resolved  BOOLEAN NOT NULL DEFAULT FALSE,
      resolved_by  UUID REFERENCES staff(id),
      resolved_at  TIMESTAMPTZ,
      resolution_notes TEXT,
      notified_admin  BOOLEAN NOT NULL DEFAULT FALSE,
      data         JSONB,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )` },
    { label: 'idx alerts_home', sql: `CREATE INDEX IF NOT EXISTS idx_alerts_home ON business_alerts(home_id)` },

    { label: 'table policies', sql: `CREATE TABLE IF NOT EXISTS policies (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
      home_id         UUID REFERENCES homes(id),
      title           VARCHAR(255) NOT NULL,
      version         VARCHAR(20) NOT NULL DEFAULT '1.0',
      document_url    VARCHAR(500) NOT NULL DEFAULT '',
      effective_date  DATE NOT NULL DEFAULT CURRENT_DATE,
      review_date     DATE,
      uploaded_by     UUID NOT NULL REFERENCES staff(id),
      requires_sign   BOOLEAN NOT NULL DEFAULT TRUE,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )` },

    { label: 'table policy_sign_offs', sql: `CREATE TABLE IF NOT EXISTS policy_sign_offs (
      id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
      staff_id  UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
      signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(policy_id, staff_id)
    )` },

    { label: 'table audit_reports', sql: `CREATE TABLE IF NOT EXISTS audit_reports (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      home_id         UUID NOT NULL REFERENCES homes(id),
      audit_type      VARCHAR(100) NOT NULL,
      custom_name     VARCHAR(255),
      period_from     DATE NOT NULL DEFAULT CURRENT_DATE,
      period_to       DATE NOT NULL DEFAULT CURRENT_DATE,
      generated_by    UUID REFERENCES staff(id),
      is_ai_generated BOOLEAN NOT NULL DEFAULT TRUE,
      total_checks    INTEGER,
      checks_passed   INTEGER,
      checks_failed   INTEGER,
      findings        TEXT,
      recommendations TEXT,
      raw_report      TEXT,
      attachments     JSONB NOT NULL DEFAULT '[]',
      status          VARCHAR(20) NOT NULL DEFAULT 'completed',
      generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )` },
    { label: 'idx audits_home', sql: `CREATE INDEX IF NOT EXISTS idx_audits_home ON audit_reports(home_id)` },

    { label: 'table ppe_inventory', sql: `CREATE TABLE IF NOT EXISTS ppe_inventory (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      home_id      UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
      item_name    VARCHAR(255) NOT NULL,
      item_variant VARCHAR(100),
      current_stock INTEGER NOT NULL DEFAULT 0,
      min_stock    INTEGER NOT NULL DEFAULT 10,
      unit         VARCHAR(30) NOT NULL DEFAULT 'units',
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )` },

    { label: 'table quality_records', sql: `CREATE TABLE IF NOT EXISTS quality_records (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      home_id       UUID NOT NULL REFERENCES homes(id),
      record_type   VARCHAR(20) NOT NULL DEFAULT 'feedback',
      subject_type  VARCHAR(10),
      subject_su    UUID REFERENCES service_users(id),
      subject_staff UUID REFERENCES staff(id),
      raised_by     VARCHAR(255),
      raised_by_role VARCHAR(100),
      description   TEXT NOT NULL DEFAULT '',
      action_taken  TEXT,
      outcome       TEXT,
      resolved      BOOLEAN NOT NULL DEFAULT FALSE,
      resolved_at   TIMESTAMPTZ,
      created_by    UUID REFERENCES staff(id),
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )` },
    { label: 'idx qa_home', sql: `CREATE INDEX IF NOT EXISTS idx_qa_home ON quality_records(home_id)` },

    { label: 'table su_reviews', sql: `CREATE TABLE IF NOT EXISTS su_reviews (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      su_id        UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
      home_id      UUID NOT NULL REFERENCES homes(id),
      review_type  VARCHAR(20) NOT NULL DEFAULT 'review',
      review_date  DATE NOT NULL DEFAULT CURRENT_DATE,
      conducted_by UUID NOT NULL REFERENCES staff(id),
      attendees    TEXT,
      summary      TEXT NOT NULL DEFAULT '',
      outcomes     TEXT,
      action_plans TEXT,
      next_review_date DATE,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )` },

    { label: 'table assessments', sql: `CREATE TABLE IF NOT EXISTS assessments (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      staff_id        UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
      conducted_by    UUID NOT NULL REFERENCES staff(id),
      home_id         UUID NOT NULL REFERENCES homes(id),
      assessment_type VARCHAR(100) NOT NULL,
      custom_name     VARCHAR(255),
      assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
      outcome         TEXT,
      recommendations TEXT,
      next_due_date   DATE,
      document_url    VARCHAR(500),
      attachments     JSONB NOT NULL DEFAULT '[]',
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )` },
    { label: 'idx assessments_staff', sql: `CREATE INDEX IF NOT EXISTS idx_assessments_staff ON assessments(staff_id)` },

    { label: 'table staff_home_access', sql: `CREATE TABLE IF NOT EXISTS staff_home_access (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      staff_id            UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
      home_id             UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
      can_view_care_plans BOOLEAN NOT NULL DEFAULT TRUE,
      can_edit_care_plans BOOLEAN NOT NULL DEFAULT FALSE,
      can_view_sensitive  BOOLEAN NOT NULL DEFAULT FALSE,
      can_run_reports     BOOLEAN NOT NULL DEFAULT FALSE,
      can_manage_staff    BOOLEAN NOT NULL DEFAULT FALSE,
      can_approve_leave   BOOLEAN NOT NULL DEFAULT FALSE,
      can_view_phones     BOOLEAN NOT NULL DEFAULT TRUE,
      can_view_keysafe    BOOLEAN NOT NULL DEFAULT FALSE,
      can_view_financials BOOLEAN NOT NULL DEFAULT FALSE,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(staff_id, home_id)
    )` },

    { label: 'table staff_onboarding', sql: `CREATE TABLE IF NOT EXISTS staff_onboarding (
      id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      staff_id                  UUID NOT NULL UNIQUE REFERENCES staff(id) ON DELETE CASCADE,
      application_received      BOOLEAN NOT NULL DEFAULT FALSE,
      application_date          DATE,
      interview_completed       BOOLEAN NOT NULL DEFAULT FALSE,
      interview_date            DATE,
      interview_notes           TEXT,
      dbs_submitted_date        DATE,
      dbs_cleared               BOOLEAN NOT NULL DEFAULT FALSE,
      dbs_cleared_date          DATE,
      dbs_certificate_url       VARCHAR(500),
      references_received       INTEGER NOT NULL DEFAULT 0,
      references_date           DATE,
      references_evidence_url   VARCHAR(500),
      care_cert_completed       BOOLEAN NOT NULL DEFAULT FALSE,
      care_cert_date            DATE,
      induction_completed       BOOLEAN NOT NULL DEFAULT FALSE,
      induction_date            DATE,
      med_training_completed    BOOLEAN NOT NULL DEFAULT FALSE,
      med_training_date         DATE,
      right_to_work_verified    BOOLEAN NOT NULL DEFAULT FALSE,
      right_to_work_doc_url     VARCHAR(500),
      system_training_completed BOOLEAN NOT NULL DEFAULT FALSE,
      system_training_date      DATE,
      created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )` },

    { label: 'table staff_leave', sql: `CREATE TABLE IF NOT EXISTS staff_leave (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      staff_id        UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
      home_id         UUID NOT NULL REFERENCES homes(id),
      leave_type      VARCHAR(50) NOT NULL,
      start_date      DATE NOT NULL,
      end_date        DATE NOT NULL,
      hours_requested DECIMAL(6,2),
      status          VARCHAR(20) NOT NULL DEFAULT 'pending',
      reason          TEXT,
      approved_by     UUID REFERENCES staff(id),
      approved_at     TIMESTAMPTZ,
      decline_reason  TEXT,
      notes           TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )` },
    { label: 'idx leave_staff', sql: `CREATE INDEX IF NOT EXISTS idx_leave_staff ON staff_leave(staff_id)` },

    { label: 'table staff_absences', sql: `CREATE TABLE IF NOT EXISTS staff_absences (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      staff_id         UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
      home_id          UUID NOT NULL REFERENCES homes(id),
      absence_type     VARCHAR(50) NOT NULL,
      notified_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      absence_start    TIMESTAMPTZ NOT NULL,
      absence_end      TIMESTAMPTZ,
      return_completed BOOLEAN NOT NULL DEFAULT FALSE,
      return_date      DATE,
      return_notes     TEXT,
      bradford_score   INTEGER,
      created_by       UUID REFERENCES staff(id),
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )` },

    { label: 'table staff_clock_events', sql: `CREATE TABLE IF NOT EXISTS staff_clock_events (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      staff_id         UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
      home_id          UUID NOT NULL REFERENCES homes(id),
      event_type       VARCHAR(10) NOT NULL,
      event_time       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      latitude         DECIMAL(10,8),
      longitude        DECIMAL(11,8),
      distance_metres  INTEGER,
      geofence_passed  BOOLEAN NOT NULL DEFAULT FALSE,
      qr_scan_used     BOOLEAN NOT NULL DEFAULT FALSE,
      shift_scheduled  TIMESTAMPTZ,
      punctuality      VARCHAR(10),
      minutes_variance INTEGER,
      device_info      JSONB,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )` },
    { label: 'idx clock_staff', sql: `CREATE INDEX IF NOT EXISTS idx_clock_staff ON staff_clock_events(staff_id)` },

    { label: 'table staff_cautions', sql: `CREATE TABLE IF NOT EXISTS staff_cautions (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      staff_id     UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
      issued_by    UUID NOT NULL REFERENCES staff(id),
      caution_date DATE NOT NULL DEFAULT CURRENT_DATE,
      overview     TEXT NOT NULL DEFAULT '',
      strengths    TEXT,
      weaknesses   TEXT,
      action_points TEXT,
      document_url VARCHAR(500),
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )` },

    { label: 'table staff_sensitive_notes', sql: `CREATE TABLE IF NOT EXISTS staff_sensitive_notes (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      staff_id   UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
      created_by UUID NOT NULL REFERENCES staff(id),
      note       TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )` },

    { label: 'table staff_supervisions', sql: `CREATE TABLE IF NOT EXISTS staff_supervisions (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      staff_id         UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
      home_id          UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
      supervisor_id    UUID REFERENCES staff(id) ON DELETE SET NULL,
      supervision_date DATE NOT NULL,
      supervision_type VARCHAR(100) DEFAULT 'monthly',
      topics_discussed TEXT,
      actions_agreed   TEXT,
      next_date        DATE,
      staff_signature  BOOLEAN NOT NULL DEFAULT FALSE,
      supervisor_signature BOOLEAN NOT NULL DEFAULT FALSE,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )` },
    { label: 'idx supervision_staff', sql: `CREATE INDEX IF NOT EXISTS idx_supervision_staff ON staff_supervisions(staff_id)` },

    { label: 'table su_contacts', sql: `CREATE TABLE IF NOT EXISTS su_contacts (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      su_id          UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
      full_name      VARCHAR(255) NOT NULL,
      relationship   VARCHAR(100),
      contact_tag    VARCHAR(20),
      phone_primary  VARCHAR(20),
      phone_secondary VARCHAR(20),
      email          VARCHAR(255),
      address1       VARCHAR(255),
      address2       VARCHAR(255),
      postcode       VARCHAR(10),
      is_primary     BOOLEAN NOT NULL DEFAULT FALSE,
      notes          TEXT,
      display_order  INTEGER NOT NULL DEFAULT 0,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )` },

    { label: 'table su_professionals', sql: `CREATE TABLE IF NOT EXISTS su_professionals (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      su_id        UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
      role_title   VARCHAR(255) NOT NULL,
      name         VARCHAR(255) NOT NULL,
      organisation VARCHAR(255),
      phone        VARCHAR(20),
      email        VARCHAR(255),
      notes        TEXT,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )` },

    { label: 'table su_messages', sql: `CREATE TABLE IF NOT EXISTS su_messages (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      su_id            UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
      home_id          UUID NOT NULL REFERENCES homes(id),
      sender_id        UUID NOT NULL REFERENCES staff(id),
      message          TEXT NOT NULL,
      message_type     VARCHAR(20) NOT NULL DEFAULT 'text',
      attachment_url   VARCHAR(500),
      attachment_caption TEXT,
      read_by          UUID[],
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )` },

    { label: 'table care_plan_updates', sql: `CREATE TABLE IF NOT EXISTS care_plan_updates (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      care_plan_id UUID NOT NULL REFERENCES care_plans(id) ON DELETE CASCADE,
      update_notes TEXT NOT NULL,
      updated_by   UUID NOT NULL REFERENCES staff(id),
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )` },

    { label: 'table risk_assessment_updates', sql: `CREATE TABLE IF NOT EXISTS risk_assessment_updates (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      risk_id        UUID NOT NULL REFERENCES risk_assessments(id) ON DELETE CASCADE,
      update_notes   TEXT NOT NULL,
      new_risk_level VARCHAR(20),
      updated_by     UUID NOT NULL REFERENCES staff(id),
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )` },

    { label: 'table records_food_drink', sql: `CREATE TABLE IF NOT EXISTS records_food_drink (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      daily_record_id UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
      entry_type      VARCHAR(5) NOT NULL,
      meal_type       VARCHAR(30),
      description     TEXT NOT NULL DEFAULT '',
      amount_eaten    VARCHAR(30),
      volume_ml       INTEGER,
      assisted        BOOLEAN NOT NULL DEFAULT FALSE,
      refused         BOOLEAN NOT NULL DEFAULT FALSE,
      notes           TEXT
    )` },

    { label: 'table su_daily_fluid_totals', sql: `CREATE TABLE IF NOT EXISTS su_daily_fluid_totals (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      su_id          UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
      home_id        UUID NOT NULL REFERENCES homes(id),
      record_date    DATE NOT NULL DEFAULT CURRENT_DATE,
      total_ml       INTEGER NOT NULL DEFAULT 0,
      below_threshold BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(su_id, record_date)
    )` },

    { label: 'table records_vitals', sql: `CREATE TABLE IF NOT EXISTS records_vitals (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      daily_record_id UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
      vital_type      VARCHAR(20) NOT NULL,
      systolic        INTEGER,
      diastolic       INTEGER,
      pulse           INTEGER,
      bp_position     VARCHAR(20),
      temp_celsius    DECIMAL(4,1),
      temp_method     VARCHAR(20),
      spo2_percent    INTEGER,
      supplemental_o2 BOOLEAN DEFAULT FALSE,
      o2_litres_min   DECIMAL(4,1),
      weight_kg       DECIMAL(5,2),
      height_cm       DECIMAL(5,1),
      bmi             DECIMAL(4,1),
      must_score      INTEGER,
      prev_weight_kg  DECIMAL(5,2),
      weight_change_pct DECIMAL(5,2),
      outside_range   BOOLEAN NOT NULL DEFAULT FALSE,
      action_taken    TEXT
    )` },

    { label: 'table records_personal_care', sql: `CREATE TABLE IF NOT EXISTS records_personal_care (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      daily_record_id UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
      care_types      TEXT[],
      assistance_level VARCHAR(20),
      continence_care BOOLEAN NOT NULL DEFAULT FALSE,
      continence_notes TEXT,
      skin_condition  TEXT,
      notes           TEXT
    )` },

    { label: 'table records_bowel', sql: `CREATE TABLE IF NOT EXISTS records_bowel (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      daily_record_id UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
      bristol_type    INTEGER,
      frequency_today INTEGER,
      colour          VARCHAR(30),
      consistency_notes TEXT,
      laxative_given  BOOLEAN NOT NULL DEFAULT FALSE,
      days_since_last INTEGER
    )` },

    { label: 'table records_repositioning', sql: `CREATE TABLE IF NOT EXISTS records_repositioning (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      daily_record_id UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
      position        VARCHAR(20),
      skin_checked    BOOLEAN NOT NULL DEFAULT FALSE,
      skin_concerns   TEXT,
      next_due_at     TIMESTAMPTZ,
      notes           TEXT
    )` },

    { label: 'table records_oral_care', sql: `CREATE TABLE IF NOT EXISTS records_oral_care (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      daily_record_id UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
      care_types      TEXT[],
      mouth_condition VARCHAR(30),
      has_dentures    BOOLEAN,
      denture_type    VARCHAR(20),
      notes           TEXT
    )` },

    { label: 'table records_communication', sql: `CREATE TABLE IF NOT EXISTS records_communication (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      daily_record_id UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
      mode_used       VARCHAR(30),
      topic           TEXT,
      response_level  VARCHAR(20),
      notes           TEXT
    )` },

    { label: 'table records_one_to_one', sql: `CREATE TABLE IF NOT EXISTS records_one_to_one (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      daily_record_id UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
      topics          TEXT,
      duration_mins   INTEGER,
      engagement      VARCHAR(20),
      follow_up       BOOLEAN NOT NULL DEFAULT FALSE,
      follow_up_notes TEXT,
      notes           TEXT
    )` },

    { label: 'table records_social_activity', sql: `CREATE TABLE IF NOT EXISTS records_social_activity (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      daily_record_id UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
      activity_name   VARCHAR(255),
      engagement      VARCHAR(30),
      enjoyed         VARCHAR(10),
      notes           TEXT
    )` },

    { label: 'table records_visits', sql: `CREATE TABLE IF NOT EXISTS records_visits (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      daily_record_id UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
      visit_type      VARCHAR(20),
      visitor_name    VARCHAR(255),
      relationship    VARCHAR(100),
      location        VARCHAR(255),
      time_arrived    TIMESTAMPTZ,
      time_left       TIMESTAMPTZ,
      su_response     VARCHAR(30),
      notes           TEXT
    )` },

    { label: 'table records_med_stock', sql: `CREATE TABLE IF NOT EXISTS records_med_stock (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      daily_record_id UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
      medication_name VARCHAR(255) NOT NULL,
      opening_balance INTEGER NOT NULL,
      given_today     INTEGER NOT NULL DEFAULT 0,
      closing_balance INTEGER NOT NULL,
      expected_balance INTEGER NOT NULL,
      discrepancy     BOOLEAN NOT NULL DEFAULT FALSE,
      discrepancy_notes TEXT,
      counted_by      UUID NOT NULL REFERENCES staff(id),
      witnessed_by    UUID REFERENCES staff(id)
    )` },

    { label: 'table records_handover', sql: `CREATE TABLE IF NOT EXISTS records_handover (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      daily_record_id UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
      shift_summary   TEXT NOT NULL DEFAULT '',
      priority_flags  TEXT[],
      outstanding_actions TEXT,
      signed_off      BOOLEAN NOT NULL DEFAULT FALSE,
      signed_off_at   TIMESTAMPTZ
    )` },

    { label: 'table records_followup', sql: `CREATE TABLE IF NOT EXISTS records_followup (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      daily_record_id UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
      su_id           UUID NOT NULL REFERENCES service_users(id),
      home_id         UUID NOT NULL REFERENCES homes(id),
      task_description TEXT NOT NULL DEFAULT '',
      assigned_to     UUID REFERENCES staff(id),
      due_date        DATE,
      completed       BOOLEAN NOT NULL DEFAULT FALSE,
      completed_by    UUID REFERENCES staff(id),
      completed_at    TIMESTAMPTZ,
      notes           TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )` },

    { label: 'table records_welfare_check', sql: `CREATE TABLE IF NOT EXISTS records_welfare_check (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      daily_record_id UUID NOT NULL REFERENCES daily_records(id) ON DELETE CASCADE,
      check_type      VARCHAR(20),
      su_status       VARCHAR(30),
      environment_ok  BOOLEAN NOT NULL DEFAULT TRUE,
      environment_notes TEXT,
      action_taken    TEXT
    )` },

    { label: 'table records_must', sql: `CREATE TABLE IF NOT EXISTS records_must (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      su_id           UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
      home_id         UUID NOT NULL REFERENCES homes(id),
      staff_id        UUID NOT NULL REFERENCES staff(id),
      record_date     DATE NOT NULL DEFAULT CURRENT_DATE,
      current_weight  DECIMAL(5,2) NOT NULL DEFAULT 0,
      current_height  DECIMAL(5,1) NOT NULL DEFAULT 0,
      bmi             DECIMAL(4,1) NOT NULL DEFAULT 0,
      bmi_score       INTEGER NOT NULL,
      weight_loss_pct DECIMAL(5,2),
      weight_score    INTEGER NOT NULL DEFAULT 0,
      acutely_ill     BOOLEAN NOT NULL DEFAULT FALSE,
      acute_score     INTEGER NOT NULL DEFAULT 0,
      must_score      INTEGER NOT NULL DEFAULT 0,
      must_category   VARCHAR(10) NOT NULL DEFAULT 'low',
      prev_weight     DECIMAL(5,2),
      action_plan     TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )` },

    { label: 'table task_templates', sql: `CREATE TABLE IF NOT EXISTS task_templates (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      home_id      UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
      title        TEXT NOT NULL DEFAULT '',
      category     TEXT NOT NULL DEFAULT 'general',
      description  TEXT,
      frequency    TEXT NOT NULL DEFAULT 'daily',
      due_time     TEXT,
      assigned_role TEXT,
      priority     TEXT NOT NULL DEFAULT 'normal',
      su_id        UUID,
      is_active    BOOLEAN NOT NULL DEFAULT TRUE,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )` },

    { label: 'table task_completions', sql: `CREATE TABLE IF NOT EXISTS task_completions (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      template_id  UUID NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
      home_id      UUID NOT NULL REFERENCES homes(id),
      su_id        UUID REFERENCES service_users(id),
      due_date     DATE NOT NULL DEFAULT CURRENT_DATE,
      due_time     TIME,
      completed    BOOLEAN NOT NULL DEFAULT FALSE,
      completed_by UUID REFERENCES staff(id),
      completed_at TIMESTAMPTZ,
      notes        TEXT,
      missed       BOOLEAN NOT NULL DEFAULT FALSE,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )` },

    { label: 'table ppe_transactions', sql: `CREATE TABLE IF NOT EXISTS ppe_transactions (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      item_id          UUID NOT NULL REFERENCES ppe_inventory(id) ON DELETE CASCADE,
      home_id          UUID NOT NULL REFERENCES homes(id),
      transaction_type VARCHAR(10) NOT NULL,
      quantity         INTEGER NOT NULL,
      staff_id         UUID REFERENCES staff(id),
      notes            TEXT,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )` },

    { label: 'table calendar_event_sign_offs', sql: `CREATE TABLE IF NOT EXISTS calendar_event_sign_offs (
      id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id  UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
      staff_id  UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
      signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(event_id, staff_id)
    )` },

    { label: 'table medication_stock', sql: `CREATE TABLE IF NOT EXISTS medication_stock (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      su_id           UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
      home_id         UUID NOT NULL REFERENCES homes(id),
      medication_name VARCHAR(255) NOT NULL,
      current_stock   INTEGER NOT NULL DEFAULT 0,
      unit            VARCHAR(50) NOT NULL DEFAULT 'tablets',
      reorder_level   INTEGER NOT NULL DEFAULT 5,
      last_updated_by UUID REFERENCES staff(id),
      notes           TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )` },
    { label: 'idx medstock_su', sql: `CREATE INDEX IF NOT EXISTS idx_medstock_su ON medication_stock(su_id)` },

    { label: 'table documents', sql: `CREATE TABLE IF NOT EXISTS documents (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      home_id       UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
      uploaded_by   UUID REFERENCES staff(id),
      title         VARCHAR(255) NOT NULL,
      category      VARCHAR(100) NOT NULL DEFAULT 'general',
      file_url      TEXT NOT NULL,
      file_name     VARCHAR(255),
      file_size     INTEGER,
      mime_type     VARCHAR(100),
      notes         TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )` },
    { label: 'idx documents_home', sql: `CREATE INDEX IF NOT EXISTS idx_documents_home ON documents(home_id)` },

    { label: 'table signatures', sql: `CREATE TABLE IF NOT EXISTS signatures (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      staff_id     UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
      resource_type VARCHAR(50) NOT NULL,
      resource_id  UUID NOT NULL,
      signature_data TEXT NOT NULL,
      signed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )` },

    // ── Default organisation seed (upsert so it is idempotent) ───────────────
    { label: 'seed default org', sql: `INSERT INTO organisations (id, name, reg_number, email)
      VALUES ('00000000-0000-0000-0000-000000000001','CompCare Hub Organisation','REG-001','admin@comprehensivecare.org.uk')
      ON CONFLICT (id) DO NOTHING` },
  ];

  for (const { label, sql } of stmts) {
    try {
      await pool.query(sql);
    } catch (err: any) {
      logger.warn(`createCoreTables [${label}] skipped: ${err?.message?.split('\n')[0]}`);
    }
  }
  logger.info('Core tables bootstrap complete');
}

async function ensureColumns() {
  const stmts = [
    // ── New tables ─────────────────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS staff_training (
       id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       staff_id       UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
       course_name    VARCHAR(255) NOT NULL,
       completed_date DATE,
       duration_hours NUMERIC(5,2),
       expiry_date    DATE,
       certificate_url VARCHAR(500),
       created_by     UUID REFERENCES staff(id) ON DELETE SET NULL,
       created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_st_staff  ON staff_training(staff_id)`,
    `CREATE INDEX IF NOT EXISTS idx_st_expiry ON staff_training(expiry_date)`,
    `CREATE TABLE IF NOT EXISTS mar_records (
       id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       home_id         UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
       su_id           UUID REFERENCES service_users(id) ON DELETE CASCADE,
       medication_id   UUID REFERENCES su_medications(id) ON DELETE CASCADE,
       given_by        UUID REFERENCES staff(id) ON DELETE SET NULL,
       record_date     DATE NOT NULL DEFAULT CURRENT_DATE,
       scheduled_time  TIME,
       given           BOOLEAN NOT NULL DEFAULT FALSE,
       refused         BOOLEAN NOT NULL DEFAULT FALSE,
       refused_reason  TEXT,
       notes           TEXT,
       created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_mar_home ON mar_records(home_id)`,
    `CREATE INDEX IF NOT EXISTS idx_mar_su   ON mar_records(su_id)`,
    `CREATE INDEX IF NOT EXISTS idx_mar_date ON mar_records(record_date)`,
    `CREATE TABLE IF NOT EXISTS safeguarding_concerns (
       id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       home_id       UUID NOT NULL REFERENCES homes(id),
       su_id         UUID NOT NULL REFERENCES service_users(id),
       overview      TEXT,
       incident_date DATE NOT NULL,
       manager_ack   BOOLEAN NOT NULL DEFAULT FALSE,
       created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_safe_home ON safeguarding_concerns(home_id)`,
    `CREATE INDEX IF NOT EXISTS idx_safe_su   ON safeguarding_concerns(su_id)`,
    // ── homes schema fixes (for DBs created from old Aiven dump) ─────────────
    `ALTER TABLE homes ADD COLUMN IF NOT EXISTS city TEXT`,
    `ALTER TABLE homes ADD COLUMN IF NOT EXISTS address1 TEXT`,
    `ALTER TABLE homes ADD COLUMN IF NOT EXISTS address2 TEXT`,
    `ALTER TABLE homes ADD COLUMN IF NOT EXISTS address3 TEXT`,
    `ALTER TABLE homes ADD COLUMN IF NOT EXISTS postcode TEXT`,
    `ALTER TABLE homes ADD COLUMN IF NOT EXISTS phone TEXT`,
    `ALTER TABLE homes ADD COLUMN IF NOT EXISTS email TEXT`,
    `ALTER TABLE homes ADD COLUMN IF NOT EXISTS cqc_location_id TEXT`,
    `ALTER TABLE homes ADD COLUMN IF NOT EXISTS cqc_provider_id TEXT`,
    `ALTER TABLE homes ADD COLUMN IF NOT EXISTS logo_url TEXT`,
    `ALTER TABLE homes ADD COLUMN IF NOT EXISTS bed_count INTEGER DEFAULT 0`,
    `ALTER TABLE homes ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`,
    `ALTER TABLE homes ADD COLUMN IF NOT EXISTS qr_token TEXT`,
    // ── organisations schema fixes ─────────────────────────────────────────────
    `ALTER TABLE organisations ADD COLUMN IF NOT EXISTS reg_number TEXT`,
    `ALTER TABLE organisations ADD COLUMN IF NOT EXISTS cqc_provider TEXT`,
    `ALTER TABLE organisations ADD COLUMN IF NOT EXISTS address1 TEXT`,
    `ALTER TABLE organisations ADD COLUMN IF NOT EXISTS address2 TEXT`,
    `ALTER TABLE organisations ADD COLUMN IF NOT EXISTS address3 TEXT`,
    `ALTER TABLE organisations ADD COLUMN IF NOT EXISTS postcode TEXT`,
    `ALTER TABLE organisations ADD COLUMN IF NOT EXISTS phone TEXT`,
    `ALTER TABLE organisations ADD COLUMN IF NOT EXISTS email TEXT`,
    `ALTER TABLE organisations ADD COLUMN IF NOT EXISTS logo_url TEXT`,
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
    `ALTER TABLE assessments ALTER COLUMN staff_id DROP NOT NULL`,
    `ALTER TABLE assessments ALTER COLUMN conducted_by DROP NOT NULL`,
    `ALTER TABLE assessments ALTER COLUMN assessment_type DROP NOT NULL`,
    `ALTER TABLE assessments ALTER COLUMN home_id DROP NOT NULL`,
    `ALTER TABLE assessments ADD COLUMN IF NOT EXISTS template_key TEXT`,
    `ALTER TABLE assessments ADD COLUMN IF NOT EXISTS category TEXT`,
    `ALTER TABLE assessments ADD COLUMN IF NOT EXISTS subject_id UUID`,
    `ALTER TABLE assessments ADD COLUMN IF NOT EXISTS subject_name TEXT`,
    `ALTER TABLE assessments ADD COLUMN IF NOT EXISTS auditor_name TEXT`,
    `ALTER TABLE assessments ADD COLUMN IF NOT EXISTS answers JSONB NOT NULL DEFAULT '{}'`,
    `ALTER TABLE assessments ADD COLUMN IF NOT EXISTS total_score INTEGER DEFAULT 0`,
    `ALTER TABLE assessments ADD COLUMN IF NOT EXISTS max_score INTEGER DEFAULT 0`,
    `ALTER TABLE assessments ADD COLUMN IF NOT EXISTS score_pct NUMERIC(5,2) DEFAULT 0`,
    `ALTER TABLE assessments ADD COLUMN IF NOT EXISTS risk_level TEXT`,
    `ALTER TABLE assessments ADD COLUMN IF NOT EXISTS actions_identified TEXT`,
    `ALTER TABLE assessments ADD COLUMN IF NOT EXISTS actions_outcome TEXT`,
    `ALTER TABLE assessments ADD COLUMN IF NOT EXISTS actions_completed_date DATE`,
    `ALTER TABLE assessments ADD COLUMN IF NOT EXISTS next_review_date DATE`,
    `ALTER TABLE assessments ADD COLUMN IF NOT EXISTS notes TEXT`,
    `ALTER TABLE assessments ADD COLUMN IF NOT EXISTS assessment_date DATE DEFAULT CURRENT_DATE`,
    `ALTER TABLE assessments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed'`,
    // ── New feature tables (migration 003) ────────────────────────────────────
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'maintenance_priority') THEN CREATE TYPE maintenance_priority AS ENUM ('low','medium','high','urgent'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'maintenance_status') THEN CREATE TYPE maintenance_status AS ENUM ('open','in_progress','resolved','closed'); END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'maintenance_category') THEN CREATE TYPE maintenance_category AS ENUM ('electrical','plumbing','heating','equipment','decoration','security','garden','cleaning','furniture','it','other'); END IF; END $$`,
    `CREATE TABLE IF NOT EXISTS maintenance_logs (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS funding_type TEXT`,
    `ALTER TABLE service_users ADD COLUMN IF NOT EXISTS care_level TEXT`,
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
    // ── mar_records — columns added to CREATE TABLE but may be missing from existing DB ─
    `ALTER TABLE mar_records ADD COLUMN IF NOT EXISTS medication_id   UUID REFERENCES su_medications(id) ON DELETE CASCADE`,
    `ALTER TABLE mar_records ADD COLUMN IF NOT EXISTS given_by        UUID REFERENCES staff(id) ON DELETE SET NULL`,
    `ALTER TABLE mar_records ADD COLUMN IF NOT EXISTS scheduled_time  TIME`,
    `ALTER TABLE mar_records ADD COLUMN IF NOT EXISTS refused_reason  TEXT`,
    `ALTER TABLE mar_records ADD COLUMN IF NOT EXISTS notes           TEXT`,
    // Legacy mar_records columns (medication_name/dose) are superseded by
    // medication_id (joined to su_medications). Old schemas made them NOT NULL,
    // which breaks logging a MAR entry since the route only sets medication_id.
    `ALTER TABLE mar_records ALTER COLUMN medication_name DROP NOT NULL`,
    `ALTER TABLE mar_records ALTER COLUMN dose DROP NOT NULL`,
    // ── staff_training — columns added to CREATE TABLE but may be missing from existing DB ──
    `ALTER TABLE staff_training ADD COLUMN IF NOT EXISTS completed_date  DATE`,
    `ALTER TABLE staff_training ADD COLUMN IF NOT EXISTS duration_hours  NUMERIC(5,2)`,
    `ALTER TABLE staff_training ADD COLUMN IF NOT EXISTS certificate_url VARCHAR(500)`,
    `ALTER TABLE staff_training ADD COLUMN IF NOT EXISTS created_by      UUID REFERENCES staff(id) ON DELETE SET NULL`,
    // Add new audit types to enum
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='staff_all' AND enumtypid='audit_type'::regtype) THEN ALTER TYPE audit_type ADD VALUE 'staff_all'; END IF; END $$`,
    // Notifications table
    `CREATE TABLE IF NOT EXISTS notifications (
       id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
       id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
       id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
       id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
       id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
       id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       su_id       UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
       home_id     UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
       created_by  UUID REFERENCES staff(id) ON DELETE SET NULL,
       note        TEXT NOT NULL,
       category    VARCHAR(50) NOT NULL DEFAULT 'general',
       created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_sensitive_su ON sensitive_notes(su_id, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS capacity_assessments (
       id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
       id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
       id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
       id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
       id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
       id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
       id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
       id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    `ALTER TABLE quality_records ADD COLUMN IF NOT EXISTS related_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL`,
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
       id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
       id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
       id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    `ALTER TABLE records_incidents ADD COLUMN IF NOT EXISTS cqc_notified               BOOLEAN NOT NULL DEFAULT FALSE`,
    `ALTER TABLE records_incidents ADD COLUMN IF NOT EXISTS family_notified            BOOLEAN NOT NULL DEFAULT FALSE`,
    `ALTER TABLE records_incidents ADD COLUMN IF NOT EXISTS cqc_not_notified_reason    TEXT`,
    `ALTER TABLE records_incidents ADD COLUMN IF NOT EXISTS family_not_notified_reason TEXT`,
    `ALTER TABLE records_incidents ADD COLUMN IF NOT EXISTS reported_to                TEXT`,
    `ALTER TABLE records_incidents ADD COLUMN IF NOT EXISTS safeguarding_ref           TEXT`,
    `ALTER TABLE records_incidents ADD COLUMN IF NOT EXISTS emotion        TEXT`,
    `ALTER TABLE records_incidents ADD COLUMN IF NOT EXISTS review_notes   JSONB NOT NULL DEFAULT '[]'::jsonb`,
    `ALTER TABLE records_incidents ADD COLUMN IF NOT EXISTS signature      JSONB`,
    `ALTER TABLE records_incidents ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ DEFAULT NOW()`,
    // ── Confidential Information ──────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS confidential_info (
       id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    // ── su_medications — controlled medication flag ───────────────────────────
    `ALTER TABLE su_medications ADD COLUMN IF NOT EXISTS is_controlled BOOLEAN NOT NULL DEFAULT FALSE`,
    // ── mar_records — controlled medication witness sign-off ──────────────────
    `ALTER TABLE mar_records ADD COLUMN IF NOT EXISTS controlled_witness_id     UUID REFERENCES staff(id) ON DELETE SET NULL`,
    `ALTER TABLE mar_records ADD COLUMN IF NOT EXISTS controlled_witness_name   VARCHAR(255)`,
    `ALTER TABLE mar_records ADD COLUMN IF NOT EXISTS controlled_witness_signed BOOLEAN NOT NULL DEFAULT FALSE`,
    `ALTER TABLE mar_records ADD COLUMN IF NOT EXISTS controlled_witness_signed_at TIMESTAMPTZ`,
    `ALTER TABLE mar_records ADD COLUMN IF NOT EXISTS mgmt_sign_off_by          VARCHAR(255)`,
    `ALTER TABLE mar_records ADD COLUMN IF NOT EXISTS mgmt_sign_off_at          TIMESTAMPTZ`,
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
    // ── su_documents — service user key documents ─────────────────────────────
    `CREATE TABLE IF NOT EXISTS su_documents (
       id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       su_id         UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
       home_id       UUID REFERENCES homes(id) ON DELETE SET NULL,
       uploaded_by   UUID REFERENCES staff(id) ON DELETE SET NULL,
       document_type VARCHAR(100) NOT NULL DEFAULT 'other',
       title         VARCHAR(255),
       file_url      TEXT NOT NULL,
       file_name     VARCHAR(255),
       file_size     INTEGER,
       mime_type     VARCHAR(100),
       notes         TEXT,
       expiry_date   DATE,
       created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_su_docs_su ON su_documents(su_id)`,
    // ── staff_documents — certificates and training records ───────────────────
    `CREATE TABLE IF NOT EXISTS staff_documents (
       id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       staff_id      UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
       uploaded_by   UUID REFERENCES staff(id) ON DELETE SET NULL,
       document_type VARCHAR(100) NOT NULL DEFAULT 'other',
       title         VARCHAR(255),
       file_url      TEXT NOT NULL,
       file_name     VARCHAR(255),
       file_size     INTEGER,
       mime_type     VARCHAR(100),
       notes         TEXT,
       expiry_date   DATE,
       created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_staff_docs_staff ON staff_documents(staff_id)`,
    // ── records_incidents — time of incident and extra template fields ─────────
    `ALTER TABLE records_incidents ADD COLUMN IF NOT EXISTS incident_time        TIME`,
    `ALTER TABLE records_incidents ADD COLUMN IF NOT EXISTS contributing_factors TEXT`,
    `ALTER TABLE records_incidents ADD COLUMN IF NOT EXISTS prevention_actions   TEXT`,
    // ── su_medications — pharmacy, GP, codes, location, warning ──────────────
    // `instructions` is referenced by mar.routes.ts (INSERT into su_medications and
    // COALESCE(m.instructions, m.notes) in the MAR chart query). Without it the
    // MAR chart 500s once any record exists, and creating a medication fails.
    `ALTER TABLE su_medications ADD COLUMN IF NOT EXISTS instructions           TEXT`,
    `ALTER TABLE su_medications ADD COLUMN IF NOT EXISTS is_prn                 BOOLEAN NOT NULL DEFAULT FALSE`,
    `ALTER TABLE su_medications ADD COLUMN IF NOT EXISTS prescribed_by          VARCHAR(255)`,
    `ALTER TABLE su_medications ADD COLUMN IF NOT EXISTS added_by               UUID REFERENCES staff(id) ON DELETE SET NULL`,
    `ALTER TABLE su_medications ADD COLUMN IF NOT EXISTS pharmacy_name          VARCHAR(255)`,
    `ALTER TABLE su_medications ADD COLUMN IF NOT EXISTS pharmacy_phone         VARCHAR(20)`,
    `ALTER TABLE su_medications ADD COLUMN IF NOT EXISTS gp_name                VARCHAR(255)`,
    `ALTER TABLE su_medications ADD COLUMN IF NOT EXISTS gp_phone               VARCHAR(20)`,
    `ALTER TABLE su_medications ADD COLUMN IF NOT EXISTS medication_code        VARCHAR(50)`,
    `ALTER TABLE su_medications ADD COLUMN IF NOT EXISTS atc_code               VARCHAR(50)`,
    `ALTER TABLE su_medications ADD COLUMN IF NOT EXISTS location_access_code   TEXT`,
    `ALTER TABLE su_medications ADD COLUMN IF NOT EXISTS medicine_warning       TEXT`,
    // ── staff_cautions — columns used in reviews.routes.ts INSERT but missing from 001_schema ──
    `ALTER TABLE staff_cautions ADD COLUMN IF NOT EXISTS home_id      UUID REFERENCES homes(id) ON DELETE SET NULL`,
    `ALTER TABLE staff_cautions ADD COLUMN IF NOT EXISTS created_by   UUID REFERENCES staff(id) ON DELETE SET NULL`,
    `ALTER TABLE staff_cautions ADD COLUMN IF NOT EXISTS caution_type VARCHAR(50) NOT NULL DEFAULT 'verbal'`,
    `ALTER TABLE staff_cautions ADD COLUMN IF NOT EXISTS review_date  DATE`,
    // ── staff_supervisions — columns used in reviews.routes.ts INSERT but missing from 003_new_features ──
    `ALTER TABLE staff_supervisions ADD COLUMN IF NOT EXISTS conducted_by         UUID REFERENCES staff(id) ON DELETE SET NULL`,
    `ALTER TABLE staff_supervisions ADD COLUMN IF NOT EXISTS action_points        TEXT`,
    `ALTER TABLE staff_supervisions ADD COLUMN IF NOT EXISTS next_supervision_date DATE`,
    // ── calendar_events — new columns used by routes but missing from 001_schema ─────────────
    `ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS event_date DATE`,
    `ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS su_id UUID REFERENCES service_users(id) ON DELETE SET NULL`,
    `ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS all_staff BOOLEAN NOT NULL DEFAULT FALSE`,
    // Backfill event_date from start_time if event_date is null
    `UPDATE calendar_events SET event_date = start_time::date WHERE event_date IS NULL AND start_time IS NOT NULL`,
    // ── staff_shifts / shift_templates — create tables if they don't exist yet ─────────────────
    `CREATE TABLE IF NOT EXISTS staff_shifts (
       id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       home_id      UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
       staff_id     UUID REFERENCES staff(id) ON DELETE SET NULL,
       su_id        UUID REFERENCES service_users(id) ON DELETE SET NULL,
       shift_date   DATE NOT NULL,
       start_time   TIME NOT NULL,
       end_time     TIME NOT NULL,
       shift_type   VARCHAR(50) NOT NULL DEFAULT 'regular',
       break_minutes INTEGER NOT NULL DEFAULT 0,
       template_id  UUID,
       notes_for_carers TEXT,
       notes_for_managers TEXT,
       is_standby   BOOLEAN NOT NULL DEFAULT FALSE,
       notes        TEXT,
       created_by   UUID REFERENCES staff(id) ON DELETE SET NULL,
       created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_shifts_home_date ON staff_shifts(home_id, shift_date)`,
    `CREATE INDEX IF NOT EXISTS idx_shifts_staff ON staff_shifts(staff_id, shift_date)`,
    `CREATE TABLE IF NOT EXISTS shift_templates (
       id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       home_id      UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
       label        VARCHAR(255),
       staff_id     UUID REFERENCES staff(id) ON DELETE SET NULL,
       su_id        UUID REFERENCES service_users(id) ON DELETE SET NULL,
       shift_type   VARCHAR(50) NOT NULL DEFAULT 'regular',
       start_time   TIME NOT NULL,
       end_time     TIME NOT NULL,
       break_minutes INTEGER NOT NULL DEFAULT 0,
       recurrence   VARCHAR(50) NOT NULL DEFAULT 'weekly',
       days_of_week INTEGER[],
       start_date   DATE NOT NULL,
       staff_count  INTEGER NOT NULL DEFAULT 1,
       is_ongoing   BOOLEAN NOT NULL DEFAULT FALSE,
       is_active    BOOLEAN NOT NULL DEFAULT TRUE,
       notes_for_carers TEXT,
       notes_for_managers TEXT,
       created_by   UUID REFERENCES staff(id) ON DELETE SET NULL,
       created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_shift_templates_home ON shift_templates(home_id, is_active)`,
    // ── staff_shifts — columns added by later routes but may be missing in prod ──────────────
    `ALTER TABLE staff_shifts ADD COLUMN IF NOT EXISTS break_minutes INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE staff_shifts ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES shift_templates(id) ON DELETE SET NULL`,
    `ALTER TABLE staff_shifts ADD COLUMN IF NOT EXISTS notes_for_carers TEXT`,
    `ALTER TABLE staff_shifts ADD COLUMN IF NOT EXISTS notes_for_managers TEXT`,
    `ALTER TABLE staff_shifts ADD COLUMN IF NOT EXISTS is_standby BOOLEAN NOT NULL DEFAULT FALSE`,
    `ALTER TABLE staff_shifts ADD COLUMN IF NOT EXISTS notes TEXT`,
    `ALTER TABLE staff_shifts ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES staff(id) ON DELETE SET NULL`,
    // ── shift_templates — columns used in service-shift route but may be missing in prod ──────
    `ALTER TABLE shift_templates ADD COLUMN IF NOT EXISTS is_ongoing BOOLEAN NOT NULL DEFAULT FALSE`,
    `ALTER TABLE shift_templates ADD COLUMN IF NOT EXISTS notes_for_carers TEXT`,
    `ALTER TABLE shift_templates ADD COLUMN IF NOT EXISTS notes_for_managers TEXT`,
    `ALTER TABLE shift_templates ADD COLUMN IF NOT EXISTS staff_count INTEGER NOT NULL DEFAULT 1`,
    `ALTER TABLE shift_templates ADD COLUMN IF NOT EXISTS label VARCHAR(255)`,
    `ALTER TABLE shift_templates ADD COLUMN IF NOT EXISTS su_id UUID REFERENCES service_users(id) ON DELETE SET NULL`,
    `ALTER TABLE shift_templates ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES staff(id) ON DELETE SET NULL`,
    // ── must_scores — table used in reviews.routes.ts but missing from all migrations ──────────
    `CREATE TABLE IF NOT EXISTS must_scores (
       id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       su_id                UUID NOT NULL REFERENCES service_users(id) ON DELETE CASCADE,
       home_id              UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
       assessed_by          UUID REFERENCES staff(id) ON DELETE SET NULL,
       weight_kg            NUMERIC(6,2),
       height_cm            NUMERIC(5,1),
       bmi                  NUMERIC(5,2),
       bmi_score            INTEGER NOT NULL DEFAULT 0,
       weight_loss_score    INTEGER NOT NULL DEFAULT 0,
       acute_disease_score  INTEGER NOT NULL DEFAULT 0,
       total_score          INTEGER NOT NULL DEFAULT 0,
       risk_level           VARCHAR(20) NOT NULL DEFAULT 'low',
       action_plan          TEXT,
       next_assessment_date DATE,
       created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_must_scores_su   ON must_scores(su_id, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_must_scores_home ON must_scores(home_id)`,
    // ── must_scores — column aliases used by assessments.routes.ts ───────────────
    `ALTER TABLE must_scores ADD COLUMN IF NOT EXISTS assessed_at TIMESTAMPTZ DEFAULT NOW()`,
    `ALTER TABLE must_scores ADD COLUMN IF NOT EXISTS notes TEXT`,
    // ── quality_records — columns used by quality.routes.ts ──────────────────────
    `ALTER TABLE quality_records ADD COLUMN IF NOT EXISTS su_id UUID REFERENCES service_users(id) ON DELETE SET NULL`,
    `ALTER TABLE quality_records ADD COLUMN IF NOT EXISTS summary VARCHAR(500)`,
    `ALTER TABLE quality_records ADD COLUMN IF NOT EXISTS detail TEXT`,
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

async function createNewFeatureTables() {
  const stmts = [
    // Fluid Balance
    `CREATE TABLE IF NOT EXISTS fluid_balance (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      home_id UUID NOT NULL, su_id UUID NOT NULL, recorded_by UUID NOT NULL,
      record_date DATE NOT NULL DEFAULT CURRENT_DATE,
      record_time TIME NOT NULL DEFAULT CURRENT_TIME,
      type TEXT NOT NULL CHECK (type IN ('input','output')),
      category TEXT NOT NULL, amount_ml INTEGER NOT NULL, notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    // Weight Records
    `CREATE TABLE IF NOT EXISTS weight_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      home_id UUID NOT NULL, su_id UUID NOT NULL, recorded_by UUID NOT NULL,
      record_date DATE NOT NULL DEFAULT CURRENT_DATE,
      weight_kg NUMERIC(5,2) NOT NULL, height_cm NUMERIC(5,1), bmi NUMERIC(4,1), notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    // Wound Assessments
    `CREATE TABLE IF NOT EXISTS wound_assessments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      home_id UUID NOT NULL, su_id UUID NOT NULL, assessed_by UUID NOT NULL,
      assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
      wound_location TEXT NOT NULL,
      wound_type TEXT NOT NULL CHECK (wound_type IN ('pressure_ulcer','surgical','leg_ulcer','diabetic','traumatic','other')),
      stage TEXT CHECK (stage IN ('1','2','3','4','unstageable','deep_tissue','none')),
      size_length_cm NUMERIC(5,1), size_width_cm NUMERIC(5,1), size_depth_cm NUMERIC(5,1),
      wound_bed TEXT, exudate_amount TEXT CHECK (exudate_amount IN ('none','low','moderate','high')),
      exudate_type TEXT, surrounding_skin TEXT, dressing_used TEXT, dressing_frequency TEXT,
      pain_score INTEGER CHECK (pain_score BETWEEN 0 AND 10),
      healing_status TEXT CHECK (healing_status IN ('improving','static','deteriorating','healed')),
      notes TEXT, next_review_date DATE,
      status TEXT DEFAULT 'active' CHECK (status IN ('active','healed','closed')),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    // PEEP Plans
    `CREATE TABLE IF NOT EXISTS peep_plans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      home_id UUID NOT NULL, su_id UUID NOT NULL, created_by UUID NOT NULL, review_date DATE,
      mobility_level TEXT NOT NULL CHECK (mobility_level IN ('independent','assisted_1','assisted_2','hoist','bedbound','wheelchair')),
      can_self_evacuate BOOLEAN DEFAULT false, evacuation_method TEXT NOT NULL,
      equipment_needed TEXT, number_of_staff_required INTEGER DEFAULT 1,
      assembly_point TEXT, special_considerations TEXT,
      known_to_fire_service BOOLEAN DEFAULT false,
      reviewed_by UUID, reviewed_at TIMESTAMPTZ,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    // Hospital Admissions
    `CREATE TABLE IF NOT EXISTS hospital_admissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      home_id UUID NOT NULL, su_id UUID NOT NULL, logged_by UUID NOT NULL,
      hospital_name TEXT NOT NULL, ward TEXT, admission_date DATE NOT NULL,
      admission_reason TEXT NOT NULL,
      admission_type TEXT NOT NULL CHECK (admission_type IN ('emergency','planned','day_case')),
      discharge_date DATE,
      discharge_destination TEXT CHECK (discharge_destination IN ('home','care_home','other_hospital','deceased') OR discharge_destination IS NULL),
      outcome_notes TEXT, follow_up_required BOOLEAN DEFAULT false, follow_up_notes TEXT,
      status TEXT DEFAULT 'admitted' CHECK (status IN ('admitted','discharged')),
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    // Environmental Checks
    `CREATE TABLE IF NOT EXISTS environmental_checks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      home_id UUID NOT NULL, recorded_by UUID NOT NULL,
      check_date DATE NOT NULL DEFAULT CURRENT_DATE, check_time TIME,
      check_type TEXT NOT NULL CHECK (check_type IN (
        'fridge_temp','freezer_temp','room_temp','water_temp',
        'legionella_flush','fire_alarm_test','emergency_lighting',
        'hoist_check','window_restrictor','other'
      )),
      location TEXT NOT NULL, reading_value TEXT, unit TEXT,
      result TEXT NOT NULL CHECK (result IN ('pass','fail','action_required')),
      action_taken TEXT, notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    // Waiting List
    `CREATE TABLE IF NOT EXISTS waiting_list (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      home_id UUID NOT NULL, full_name TEXT NOT NULL, date_of_birth DATE,
      contact_name TEXT, contact_phone TEXT, contact_email TEXT, care_needs TEXT,
      funding_type TEXT CHECK (funding_type IN ('local_authority','self_funded','nhs','unknown')),
      priority TEXT DEFAULT 'standard' CHECK (priority IN ('urgent','high','standard','low')),
      enquiry_date DATE NOT NULL DEFAULT CURRENT_DATE, expected_admission_date DATE,
      preferred_room TEXT,
      status TEXT DEFAULT 'enquiry' CHECK (status IN ('enquiry','assessment_booked','assessment_complete','offer_made','accepted','declined','withdrawn')),
      notes TEXT, assigned_to UUID, created_by UUID NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    // Visitor Log
    `CREATE TABLE IF NOT EXISTS visitor_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      home_id UUID NOT NULL, su_id UUID, visitor_name TEXT NOT NULL,
      visitor_relationship TEXT, visitor_phone TEXT,
      sign_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(), sign_out_time TIMESTAMPTZ,
      purpose TEXT DEFAULT 'social_visit' CHECK (purpose IN ('social_visit','professional','contractor','delivery','other')),
      vehicle_reg TEXT, notes TEXT, signed_in_by UUID NOT NULL, signed_out_by UUID,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    // Contractors
    `CREATE TABLE IF NOT EXISTS contractors (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      home_id UUID NOT NULL, company_name TEXT NOT NULL,
      contact_name TEXT, contact_phone TEXT, contact_email TEXT,
      service_type TEXT NOT NULL, insurance_expiry DATE,
      dbs_required BOOLEAN DEFAULT false, dbs_expiry DATE,
      gas_safe_number TEXT, electrician_number TEXT,
      contract_start DATE, contract_end DATE,
      last_visit_date DATE, next_scheduled_visit DATE, notes TEXT,
      status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','expired')),
      added_by UUID NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    // Lessons Learned
    `CREATE TABLE IF NOT EXISTS lessons_learned (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      home_id UUID NOT NULL, created_by UUID NOT NULL,
      source_type TEXT NOT NULL CHECK (source_type IN ('incident','complaint','near_miss','audit','inspection','staff_feedback','other')),
      source_reference TEXT, date_of_event DATE NOT NULL,
      title TEXT NOT NULL, what_happened TEXT NOT NULL, root_cause TEXT,
      lesson TEXT NOT NULL, action_taken TEXT NOT NULL, action_owner TEXT,
      action_due_date DATE, action_completed BOOLEAN DEFAULT false,
      action_completed_date DATE, shared_with_team BOOLEAN DEFAULT false,
      shared_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    // External Contacts
    `CREATE TABLE IF NOT EXISTS external_contacts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      home_id UUID NOT NULL, name VARCHAR(200) NOT NULL,
      organisation VARCHAR(200), role VARCHAR(100) NOT NULL,
      category VARCHAR(50) NOT NULL DEFAULT 'professional',
      phone VARCHAR(50), email VARCHAR(200), address TEXT, notes TEXT,
      is_active BOOLEAN DEFAULT true, created_by UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    // Add missing columns to staff_absences (created by createCoreTables with old schema)
    `ALTER TABLE staff_absences ADD COLUMN IF NOT EXISTS reason TEXT`,
    `ALTER TABLE staff_absences ADD COLUMN IF NOT EXISTS logged_by UUID`,
    `ALTER TABLE staff_absences ADD COLUMN IF NOT EXISTS return_to_work_date DATE`,
    `ALTER TABLE staff_absences ADD COLUMN IF NOT EXISTS return_to_work_completed BOOLEAN DEFAULT false`,
    `ALTER TABLE staff_absences ADD COLUMN IF NOT EXISTS return_to_work_notes TEXT`,
    `ALTER TABLE staff_absences ADD COLUMN IF NOT EXISTS fit_note_provided BOOLEAN DEFAULT false`,
    `ALTER TABLE staff_absences ADD COLUMN IF NOT EXISTS fit_note_end_date DATE`,
    `ALTER TABLE staff_absences ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`,
  ];
  for (const sql of stmts) {
    await pool.query(sql).catch((e: any) => logger.warn('createNewFeatureTables: ' + e.message));
  }
  logger.info('New feature tables ready');
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

  // Add 'pending' to staff_status enum — used by the self-registration flow
  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pending'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'staff_status')) THEN
        ALTER TYPE staff_status ADD VALUE 'pending';
      END IF;
    END $$
  `).catch((err: any) => logger.warn('staff_status pending enum skipped: ' + err?.message));

  try { await createCoreTables(); } catch (err: any) { logger.warn('createCoreTables error: ' + err?.message); }
  try { await createNewFeatureTables(); } catch (err: any) { logger.warn('createNewFeatureTables error: ' + err?.message); }
  try { await ensureColumns(); } catch (err: any) { logger.warn('ensureColumns error: ' + err?.message); }
  try { await seedRolePermissions(); } catch (err: any) { logger.warn('seedRolePermissions error: ' + err?.message); }
  try { await seedNewFeatures(); } catch (err: any) { logger.warn('seedNewFeatures error: ' + err?.message); }

  // One-time backfill: assign home_id to any staff account that still has NULL
  try {
    const { pool: dbPool } = await import('./config/database');
    await dbPool.query(`
      UPDATE staff s
      SET home_id = (
        SELECT h.id FROM homes h
        WHERE h.organisation_id = s.organisation_id
        ORDER BY h.created_at
        LIMIT 1
      )
      WHERE s.home_id IS NULL
        AND s.organisation_id IS NOT NULL
    `);
    logger.info('Backfill: null home_id accounts updated');
  } catch (err: any) { logger.warn('Backfill home_id error: ' + err?.message); }

  // Backfill: assign sequential room numbers to live residents without one
  try {
    const { pool: dbPool } = await import('./config/database');
    await dbPool.query(`
      UPDATE service_users su
      SET room_number = sub.rn::TEXT
      FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY home_id ORDER BY admission_date NULLS LAST, created_at) AS rn
        FROM service_users
        WHERE status = 'live' AND (room_number IS NULL OR room_number = '')
      ) sub
      WHERE su.id = sub.id
    `);
    logger.info('Backfill: room numbers assigned to residents without one');
  } catch (err: any) { logger.warn('Backfill room_number error: ' + err?.message); }

  app.listen(PORT, () => {
    logger.info(`CompCare Hub API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });

  if (process.env.NODE_ENV !== 'test') startScheduler();
}

process.on('SIGTERM', async () => { await pool.end(); process.exit(0); });
process.on('unhandledRejection', (reason) => logger.error('Unhandled rejection', { reason }));

bootstrap().catch((err) => { logger.error('Bootstrap failed', { err }); process.exit(1); });

export default app;

// Trigger deploy 3
