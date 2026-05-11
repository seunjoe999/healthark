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

// ── Security ─────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// ── CORS ──────────────────────────────────────────────────────────
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

// ── Rate limiting ─────────────────────────────────────────────────
app.use('/api', rateLimit({ windowMs: 900000, max: 500, standardHeaders: true, legacyHeaders: false }));
app.use('/api/auth/login', rateLimit({ windowMs: 900000, max: 10, standardHeaders: true, legacyHeaders: false }));

// ── General middleware ────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// ── Static files (uploaded documents) ────────────────────────────
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ── Health check ──────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

// ── ALL API Routes ────────────────────────────────────────────────
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
import reviewsRoutes from './routes/reviews.routes';
import tasksRoutes from './routes/tasks.routes';
import qualityRoutes from './routes/quality.routes';
app.use('/api/mar', marRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/quality', qualityRoutes);

// ── Error handling ────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────
async function bootstrap() {
  try {
    await pool.query('SELECT 1');
    logger.info('Database connected successfully');
  } catch (err) {
    logger.error('Database connection failed', { err });
    process.exit(1);
  }

  app.listen(PORT, () => {
    logger.info(`CompCare Hub API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });

  if (process.env.NODE_ENV !== 'test') startScheduler();
}

process.on('SIGTERM', async () => { await pool.end(); process.exit(0); });
process.on('unhandledRejection', (reason) => logger.error('Unhandled rejection', { reason }));

bootstrap().catch((err) => { logger.error('Bootstrap failed', { err }); process.exit(1); });

export default app;
