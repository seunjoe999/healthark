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
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
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

// ── Serve React frontend in production ────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDist));
  app.get(/^(?!\/api|\/uploads).*/, (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
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

