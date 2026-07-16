import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types/index';
import jwt from 'jsonwebtoken';

const router = Router();
router.use(authenticate);

function fromToken(req: Request, field: string): string {
  const token = req.headers.authorization?.substring(7);
  if (token) { const d = jwt.decode(token) as any; return (req.staff as any)?.[field] || d?.[field] || ''; }
  return (req.staff as any)?.[field] || '';
}

async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS environmental_checks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      home_id UUID NOT NULL,
      recorded_by UUID NOT NULL,
      check_date DATE NOT NULL DEFAULT CURRENT_DATE,
      check_time TIME,
      check_type TEXT NOT NULL CHECK (check_type IN (
        'fridge_temp','freezer_temp','room_temp','water_temp',
        'legionella_flush','fire_alarm_test','emergency_lighting',
        'hoist_check','window_restrictor','other'
      )),
      location TEXT NOT NULL,
      reading_value TEXT,
      unit TEXT,
      result TEXT NOT NULL CHECK (result IN ('pass','fail','action_required')),
      action_taken TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `, []);
}

router.use(async (_req, _res, next) => {
  try { await ensureTable(); } catch (_) {}
  next();
});

// GET /api/environmental
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const { date, checkType, days } = req.query;

    let sql = `
      SELECT
        ec.*,
        s.first_name || ' ' || s.last_name AS recorded_by_name
      FROM environmental_checks ec
      LEFT JOIN staff s ON s.id = ec.recorded_by
      WHERE ec.home_id = $1
    `;
    const params: any[] = [homeId];

    if (date) { params.push(date); sql += ` AND ec.check_date = $${params.length}`; }
    if (checkType) { params.push(checkType); sql += ` AND ec.check_type = $${params.length}`; }
    if (days && !date) {
      params.push(Number(days));
      sql += ` AND ec.check_date >= CURRENT_DATE - ($${params.length} || ' days')::INTERVAL`;
    }

    sql += ' ORDER BY ec.check_date DESC, ec.created_at DESC';

    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/environmental/summary
router.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');

    const countRows = await query(`
      SELECT
        COUNT(*) FILTER (WHERE check_date = CURRENT_DATE) AS checks_today,
        COUNT(*) FILTER (WHERE result IN ('fail','action_required')
          AND check_date >= CURRENT_DATE - INTERVAL '7 days') AS fails_this_week
      FROM environmental_checks
      WHERE home_id = $1
    `, [homeId]);

    // Last check per type
    const lastRows = await query(`
      SELECT DISTINCT ON (check_type)
        check_type, check_date, result, location
      FROM environmental_checks
      WHERE home_id = $1
      ORDER BY check_type, check_date DESC, created_at DESC
    `, [homeId]);

    const dailyTypes = ['fridge_temp', 'freezer_temp'];
    const weeklyTypes = ['legionella_flush', 'fire_alarm_test', 'hoist_check'];
    const monthlyTypes = ['emergency_lighting', 'window_restrictor'];

    const lastByType: Record<string, any> = {};
    (lastRows as any[]).forEach((r: any) => { lastByType[r.check_type] = r; });

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];
    const monthAgo = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0];

    const overdueTypes: string[] = [];

    for (const t of dailyTypes) {
      const last = lastByType[t];
      if (!last || last.check_date < todayStr) overdueTypes.push(t);
    }
    for (const t of weeklyTypes) {
      const last = lastByType[t];
      if (!last || last.check_date < weekAgo) overdueTypes.push(t);
    }
    for (const t of monthlyTypes) {
      const last = lastByType[t];
      if (!last || last.check_date < monthAgo) overdueTypes.push(t);
    }

    res.json({
      success: true,
      data: {
        ...(countRows[0] as any),
        overdue_types: overdueTypes,
        last_by_type: lastByType,
      }
    } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/environmental
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recordedBy = fromToken(req, 'staffId');
    const homeId = req.body.homeId || fromToken(req, 'homeId');
    const {
      checkDate, checkTime, checkType, location,
      readingValue, unit, result, actionTaken, notes
    } = req.body;

    if (!checkType) throw new AppError('checkType is required', 400);
    if (!location) throw new AppError('location is required', 400);
    if (!result) throw new AppError('result is required', 400);

    const rows = await query(`
      INSERT INTO environmental_checks
        (home_id, recorded_by, check_date, check_time, check_type, location,
         reading_value, unit, result, action_taken, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *
    `, [
      homeId, recordedBy,
      checkDate || todayDate(),
      checkTime || null,
      checkType, location,
      readingValue || null,
      unit || null,
      result,
      actionTaken || null,
      notes || null
    ]);

    res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
  } catch (err) { next(err); }
});

function todayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export default router;
