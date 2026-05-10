import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { errorHandler, notFound } from './middleware/errorHandler';
import { logger } from './config/logger';
import { pool } from './config/database';
import { startScheduler } from './services/scheduler';

// Routes
import authRoutes from './routes/auth.routes';
import homesRoutes from './routes/homes.routes';
import staffRoutes from './routes/staff.routes';
import alertsRoutes from './routes/alerts.routes';

const app = express();
const PORT = parseInt(process.env.PORT || '3001');

// ── Security middleware ──────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
}));

// ── CORS ─────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'X-Session-ID'],
}));

// ── Rate limiting ────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX || '500'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many login attempts. Please wait 15 minutes.' },
});

app.use('/api', limiter);
app.use('/api/auth/login', authLimiter);

// ── General middleware ───────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
  stream: { write: (message) => logger.info(message.trim()) },
}));

// ── Health check ─────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      db: 'connected',
    });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

// ── API Routes ───────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/homes', homesRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/alerts', alertsRoutes);

// Phase 2+ routes (wired in as each phase is built)
import serviceUserRoutes from './routes/serviceUsers.routes';
app.use('/api/service-users', serviceUserRoutes);
import dailyRecordRoutes from './routes/dailyRecords.routes';
app.use('/api/daily-records', dailyRecordRoutes);
// app.use('/api/care-plans', carePlanRoutes);
// app.use('/api/risk-assessments', riskAssessmentRoutes);
// app.use('/api/mar', marRoutes);
// app.use('/api/safeguarding', safeguardingRoutes);
// app.use('/api/tasks', taskRoutes);
// app.use('/api/messages', messageRoutes);
// app.use('/api/audits', auditRoutes);
// app.use('/api/reports', reportRoutes);
// app.use('/api/policies', policyRoutes);
// app.use('/api/qa', qaRoutes);
// app.use('/api/ppe', ppeRoutes);
// app.use('/api/leave', leaveRoutes);
// app.use('/api/calendar', calendarRoutes);

// ── 404 & error handler ──────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start ────────────────────────────────────────────────────────
async function bootstrap() {
  // Test DB connection
  try {
    await pool.query('SELECT 1');
    logger.info('Database connected successfully');
  } catch (err) {
    logger.error('Database connection failed', { err });
    process.exit(1);
  }

  app.listen(PORT, () => {
    logger.info(`HealthArk API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });

  // Start background scheduler
  if (process.env.NODE_ENV !== 'test') {
    startScheduler();
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received — shutting down gracefully');
  await pool.end();
  process.exit(0);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason });
});

bootstrap().catch((err) => {
  logger.error('Bootstrap failed', { err });
  process.exit(1);
});

export default app;

// TEMPORARY DEBUG ROUTE - remove after testing
app.get('/debug/homes', async (req: any, res: any) => {
  const { query: dbQuery } = await import('./config/database');
  const rows = await dbQuery(
    `SELECT h.id, h.name, h.organisation_id, h.is_active 
     FROM homes h 
     WHERE h.organisation_id = '00000000-0000-0000-0000-000000000001'`
  );
  res.json({ rows, count: rows.length });
});
