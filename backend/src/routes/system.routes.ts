import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { query, pool } from '../config/database';
import { ApiResponse } from '../types';

// System health — one place for the owner to see whether anything is quietly
// going wrong (server errors, staff stuck clocked in, alerts building up)
// without waiting for staff to report it.
const router = Router();
router.use(authenticate);

const STARTED_AT = new Date();

router.get('/health', requireRole('group_admin', 'home_manager'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || req.staff.homeId;
    const safe = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => { try { return await fn(); } catch { return fallback; } };

    const [errCounts, recentErrors, stuck, openAlerts, unsignedMeds] = await Promise.all([
      safe(() => query<any>(
        `SELECT COUNT(*) FILTER (WHERE created_at > NOW() - interval '24 hours') AS last_24h,
                COUNT(*) FILTER (WHERE created_at > NOW() - interval '7 days') AS last_7d
         FROM error_log`), [{ last_24h: '0', last_7d: '0' }]),
      safe(() => query<any>(
        `SELECT to_char(e.created_at AT TIME ZONE 'Europe/London', 'DD Mon HH24:MI') AS at, e.method, e.path, e.status_code, e.message,
                COALESCE(s.first_name || ' ' || s.last_name, '—') AS staff
         FROM error_log e LEFT JOIN staff s ON s.id = e.staff_id
         ORDER BY e.created_at DESC LIMIT 40`), []),
      // Latest clock event is a clock-in more than 16 hours old: almost certainly forgot to clock out.
      safe(() => query<any>(
        `SELECT s.first_name || ' ' || s.last_name AS staff,
                to_char(l.event_time AT TIME ZONE 'Europe/London', 'DD Mon HH24:MI') AS clocked_in_at,
                ROUND(EXTRACT(EPOCH FROM (NOW() - l.event_time)) / 3600) AS hours_ago
         FROM staff s
         JOIN LATERAL (SELECT event_type, event_time FROM staff_clock_events ce WHERE ce.staff_id = s.id ORDER BY event_time DESC LIMIT 1) l ON TRUE
         WHERE s.home_id = $1 AND s.is_active = TRUE AND l.event_type = 'clock_in' AND l.event_time < NOW() - interval '16 hours'
         ORDER BY l.event_time`, [homeId]), []),
      safe(() => query<any>(
        `SELECT alert_type, COUNT(*) AS open FROM business_alerts WHERE home_id = $1 AND is_resolved = FALSE GROUP BY alert_type ORDER BY COUNT(*) DESC`, [homeId]), []),
      safe(() => query<any>(
        `SELECT COUNT(*) AS n FROM tasks WHERE home_id = $1 AND status <> 'completed' AND task_date BETWEEN CURRENT_DATE - 7 AND CURRENT_DATE - 1`, [homeId]), [{ n: '0' }]),
    ]);

    res.json({
      success: true,
      data: {
        startedAt: STARTED_AT.toISOString(),
        uptimeHours: Math.round((Date.now() - STARTED_AT.getTime()) / 360000) / 10,
        memoryMb: Math.round(process.memoryUsage().rss / 1048576),
        db: { connections: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount },
        errors: { last24h: parseInt(errCounts[0]?.last_24h || '0', 10), last7d: parseInt(errCounts[0]?.last_7d || '0', 10), recent: recentErrors },
        stuckClockIns: stuck,
        openAlerts: openAlerts.map((a: any) => ({ type: String(a.alert_type).replace(/_/g, ' '), open: parseInt(a.open, 10) })),
        tasksNotCompletedLast7Days: parseInt(unsignedMeds[0]?.n || '0', 10),
      },
    } as ApiResponse);
  } catch (err) { next(err); }
});

export default router;
