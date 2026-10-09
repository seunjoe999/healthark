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

// POST /api/system/client-error — a crash reported by someone's browser.
router.post('/client-error', async (req: Request, res: Response) => {
  try {
    const message = String(req.body?.message || '').slice(0, 1000);
    const page = String(req.body?.page || '').slice(0, 280);
    if (message) {
      await query(
        'INSERT INTO error_log (method, path, status_code, message, staff_id, source) VALUES ($1,$2,$3,$4,$5,$6)',
        ['SCREEN', page || '/', 0, message, req.staff?.staffId || null, 'browser']);
    }
  } catch { /* never fail the caller */ }
  res.json({ success: true } as ApiResponse);
});

// What part of the system an issue belongs to, worked out from the address it happened on.
const AREA_SQL = `CASE
  WHEN e.source = 'browser' THEN 'Screen crash'
  WHEN e.path LIKE '/api/clockin%' THEN 'Clock in / out'
  WHEN e.path LIKE '/api/auth%' THEN 'Sign in'
  WHEN e.path LIKE '/api/mar%' THEN 'Medication'
  WHEN e.path LIKE '/api/shifts%' THEN 'Rota'
  WHEN e.path LIKE '/api/daily-records%' OR e.path LIKE '/api/incidents%' THEN 'Daily records & incidents'
  WHEN e.path LIKE '/api/tasks%' THEN 'Tasks'
  WHEN e.path LIKE '/api/staff%' THEN 'Staff & leave'
  WHEN e.path LIKE '/api/service-users%' OR e.path LIKE '/api/care-plans%' THEN 'Service users & care plans'
  ELSE 'Other' END`;

// POST /api/system/resolve — mark an issue as dealt with. Every entry with that
// exact message leaves the list; if it happens again it comes back as new.
router.post('/resolve', requireRole('group_admin', 'home_manager'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messages: string[] = (Array.isArray(req.body?.messages) ? req.body.messages : [req.body?.message])
      .filter((m: any) => typeof m === 'string' && m.length > 0).slice(0, 100);
    if (!messages.length) return res.status(400).json({ success: false, error: 'Nothing to mark as fixed' } as ApiResponse);
    const rows = await query<any>(
      'UPDATE error_log SET resolved_at = NOW() WHERE resolved_at IS NULL AND message = ANY($1::text[]) RETURNING id', [messages]);
    res.json({ success: true, data: { resolved: rows.length } } as ApiResponse);
  } catch (err) { next(err); }
});

router.get('/health', requireRole('group_admin', 'home_manager'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || req.staff.homeId;
    const safe = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => { try { return await fn(); } catch { return fallback; } };

    const [errCounts, recentErrors, stuck, openAlerts, unsignedMeds] = await Promise.all([
      safe(() => query<any>(
        `SELECT COUNT(*) FILTER (WHERE created_at > NOW() - interval '24 hours') AS last_24h,
                COUNT(*) FILTER (WHERE created_at > NOW() - interval '7 days') AS last_7d
         FROM error_log WHERE resolved_at IS NULL`), [{ last_24h: '0', last_7d: '0' }]),
      safe(() => query<any>(
        `SELECT to_char(e.created_at AT TIME ZONE 'Europe/London', 'DD Mon HH24:MI') AS at, e.method, e.path, e.status_code, e.message,
                COALESCE(s.first_name || ' ' || s.last_name, '—') AS staff, ${AREA_SQL} AS area,
                CASE WHEN e.status_code >= 500 OR e.source = 'browser' THEN 'error' ELSE 'refused' END AS kind
         FROM error_log e LEFT JOIN staff s ON s.id = e.staff_id
         WHERE e.resolved_at IS NULL
         ORDER BY e.created_at DESC LIMIT 200`), []),
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

    // The same problem repeated many times is one issue: group by area + message.
    const topIssues = await safe(() => query<any>(
      `SELECT ${AREA_SQL} AS area, e.message, COUNT(*) AS times, COUNT(DISTINCT e.staff_id) AS people,
              to_char(MAX(e.created_at) AT TIME ZONE 'Europe/London', 'DD Mon HH24:MI') AS last_seen,
              CASE WHEN MAX(e.status_code) >= 500 OR bool_or(e.source = 'browser') THEN 'error' ELSE 'refused' END AS kind
       FROM error_log e WHERE e.created_at > NOW() - interval '7 days' AND e.resolved_at IS NULL
       GROUP BY 1, e.message ORDER BY COUNT(*) DESC LIMIT 60`), []);
    const byArea = await safe(() => query<any>(
      `SELECT ${AREA_SQL} AS area, COUNT(*) AS times FROM error_log e
       WHERE e.created_at > NOW() - interval '7 days' AND e.resolved_at IS NULL GROUP BY 1 ORDER BY COUNT(*) DESC`), []);
    const autoClosed = await safe(() => query<any>(
      `SELECT s.first_name || ' ' || s.last_name AS staff, to_char(ce.event_time AT TIME ZONE 'Europe/London', 'DD Mon HH24:MI') AS at
       FROM staff_clock_events ce JOIN staff s ON s.id = ce.staff_id
       WHERE ce.auto_closed = TRUE AND ce.home_id = $1 AND ce.event_time > NOW() - interval '7 days'
       ORDER BY ce.event_time DESC LIMIT 60`, [homeId]), []);

    // Allocation changes in the last 7 days, and how many have no user rota
    // action in the minute before them (which would mean the system did it).
    const rotaChanges = await safe(() => query<any>(
      `SELECT COUNT(*) AS total,
              COUNT(*) FILTER (WHERE NOT EXISTS (
                SELECT 1 FROM rota_actions ra
                WHERE ra.created_at BETWEEN c.changed_at - interval '60 seconds' AND c.changed_at + interval '2 seconds')) AS unexplained
       FROM shift_change_log c WHERE c.home_id = $1 AND c.changed_at > NOW() - interval '7 days'`, [homeId]), [{ total: '0', unexplained: '0' }]);
    const unexplainedList = await safe(() => query<any>(
      `SELECT to_char(c.changed_at AT TIME ZONE 'Europe/London', 'DD Mon HH24:MI:SS') AS at,
              to_char(sh.shift_date, 'Dy DD Mon') || ' ' || to_char(sh.start_time, 'HH24:MI') || '-' || to_char(sh.end_time, 'HH24:MI') AS shift,
              COALESCE(sh.label, '') AS service,
              COALESCE(o.first_name || ' ' || o.last_name, 'Unfilled') AS from_staff,
              COALESCE(n.first_name || ' ' || n.last_name, 'Unfilled') AS to_staff
       FROM shift_change_log c
       LEFT JOIN staff_shifts sh ON sh.id = c.shift_id
       LEFT JOIN staff o ON o.id = c.old_staff_id LEFT JOIN staff n ON n.id = c.new_staff_id
       WHERE c.home_id = $1 AND c.changed_at > NOW() - interval '7 days'
         AND NOT EXISTS (SELECT 1 FROM rota_actions ra
                         WHERE ra.created_at BETWEEN c.changed_at - interval '60 seconds' AND c.changed_at + interval '2 seconds')
       ORDER BY c.changed_at DESC LIMIT 40`, [homeId]), []);

    res.json({
      success: true,
      data: {
        rota: { changes7d: parseInt(rotaChanges[0]?.total || '0', 10), unexplained7d: parseInt(rotaChanges[0]?.unexplained || '0', 10), unexplained: unexplainedList },
        topIssues: topIssues.map((t: any) => ({ ...t, times: parseInt(t.times, 10), people: parseInt(t.people, 10) })),
        byArea: byArea.map((a: any) => ({ area: a.area, times: parseInt(a.times, 10) })),
        autoClockedOut: autoClosed,
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
