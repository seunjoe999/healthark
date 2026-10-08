import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types';

const router = Router();

function nd(v: any): string | null { return v && String(v).trim() ? String(v).trim() : null; }

router.use(authenticate);

// GET /api/alerts?homeId=xxx
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = req.query.homeId as string || req.staff.homeId;
    if (!homeId) throw new AppError('homeId required', 400);

    const resolved = req.query.resolved === 'true';
    const rows = await query(
      `SELECT ba.*,
              su.first_name || ' ' || su.last_name AS su_name,
              s.first_name || ' ' || s.last_name AS staff_name
       FROM business_alerts ba
       LEFT JOIN service_users su ON su.id = ba.su_id
       LEFT JOIN staff s ON s.id = ba.staff_id
       WHERE ba.home_id = $1 AND ba.is_resolved = $2
       ORDER BY ba.severity DESC, ba.created_at DESC
       LIMIT 100`,
      [homeId, resolved]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// PUT /api/alerts/:id/resolve
router.put('/:id/resolve',
  requireRole('home_manager', 'group_admin'),
  [param('id').isUUID(), body('resolutionNotes').optional().isString()],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query(
        `UPDATE business_alerts SET
          is_resolved = TRUE, resolved_by = $1, resolved_at = NOW(),
          resolution_notes = $2
         WHERE id = $3 RETURNING *`,
        [req.staff.staffId, req.body.resolutionNotes || null, req.params.id]
      );
      if (!rows.length) throw new AppError('Alert not found', 404);
      res.json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// ── Alert settings ────────────────────────────────────────────────
const ALERT_SETTINGS_ROLES: any[] = ['home_manager', 'group_admin', 'deputy_manager', 'admin', 'director', 'registered_manager', 'service_manager'];
const ALERT_TYPE_LABELS: Record<string, string> = {
  care_plan_overdue: 'Care plan review overdue',
  fluid_below_threshold: 'Fluid intake below target',
  medication_stock_low: 'Medication stock low',
  training_expiring: 'Staff training expiring',
  incident_not_reviewed: 'Incident not reviewed',
  tomorrows_unfilled_shifts: "Tomorrow's shifts with no staff",
  handover_not_completed: 'Handover not completed',
  no_bowel_movement: 'No bowel movement for 3+ days',
  clocked_in_too_far: 'Clocked in away from the service',
  no_notes_written: 'Worked a shift without writing a daily record',
  sensitive_date: 'Sensitive date for a service user',
};

// GET /api/alerts/settings — every alert type this home uses, with its on/off and auto-clear setting.
router.get('/settings', requireRole(...ALERT_SETTINGS_ROLES), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || req.staff.homeId;
    if (!homeId) throw new AppError('homeId required', 400);
    const [used, saved] = await Promise.all([
      query<any>('SELECT alert_type, COUNT(*) FILTER (WHERE is_resolved = FALSE) AS open FROM business_alerts WHERE home_id = $1 GROUP BY alert_type', [homeId]),
      query<any>('SELECT alert_type, enabled, auto_clear_hours FROM alert_settings WHERE home_id = $1', [homeId]),
    ]);
    const types = Array.from(new Set([...Object.keys(ALERT_TYPE_LABELS), ...used.map((u: any) => u.alert_type)]));
    const data = types.map(t => {
      const s = saved.find((x: any) => x.alert_type === t);
      return {
        alertType: t,
        label: ALERT_TYPE_LABELS[t] || t.replace(/_/g, ' ').replace(/^./, (c: string) => c.toUpperCase()),
        enabled: s ? s.enabled : true,
        autoClearHours: s ? s.auto_clear_hours : null,
        open: parseInt(used.find((u: any) => u.alert_type === t)?.open || '0', 10),
      };
    }).sort((a, b) => a.label.localeCompare(b.label));
    res.json({ success: true, data } as ApiResponse);
  } catch (err) { next(err); }
});

// PUT /api/alerts/settings — save one alert type's setting for a home.
router.put('/settings', requireRole(...ALERT_SETTINGS_ROLES),
  [body('homeId').isUUID(), body('alertType').isString().isLength({ min: 1, max: 100 }), body('enabled').isBoolean()],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { homeId, alertType, enabled } = req.body;
      const hrs = Number(req.body.autoClearHours);
      const autoClear = Number.isFinite(hrs) && hrs > 0 ? Math.min(Math.trunc(hrs), 24 * 365) : null;
      await query(
        `INSERT INTO alert_settings (home_id, alert_type, enabled, auto_clear_hours, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (home_id, alert_type) DO UPDATE SET enabled = $3, auto_clear_hours = $4, updated_at = NOW()`,
        [homeId, alertType, !!enabled, autoClear]);
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/alerts/bulk — resolve or delete many alerts at once. Clearing a
// backlog one alert at a time was the only option before.
router.post('/bulk',
  requireRole('home_manager', 'group_admin', 'deputy_manager', 'admin', 'director', 'registered_manager', 'service_manager'),
  [body('ids').isArray({ min: 1, max: 500 }), body('ids.*').isUUID(), body('action').isIn(['resolve', 'delete'])],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { ids, action } = req.body;
      // Group admins act across homes; everyone else only on their own home's alerts.
      const scopeHome = req.staff.role === 'group_admin' ? null : (req.staff.homeId || null);
      if (req.staff.role !== 'group_admin' && !scopeHome) throw new AppError('No home on your account', 400);
      const rows = action === 'delete'
        ? await query(
            'DELETE FROM business_alerts WHERE id = ANY($1::uuid[]) AND ($2::uuid IS NULL OR home_id = $2::uuid) RETURNING id',
            [ids, scopeHome])
        : await query(
            `UPDATE business_alerts SET is_resolved = TRUE, resolved_by = $3, resolved_at = NOW(),
                    resolution_notes = COALESCE(resolution_notes, 'Resolved in bulk via alerts dashboard')
              WHERE id = ANY($1::uuid[]) AND ($2::uuid IS NULL OR home_id = $2::uuid) AND is_resolved = FALSE RETURNING id`,
            [ids, scopeHome, req.staff.staffId]);
      res.json({ success: true, data: { count: rows.length } } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/alerts - create manual alert (internal use & AI engine)
router.post('/',
  requireRole('home_manager', 'group_admin'),
  [
    body('homeId').isUUID(),
    body('alertType').notEmpty(),
    body('severity').isIn(['info','warning','critical']),
    body('title').notEmpty(),
    body('description').notEmpty(),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { homeId, alertType, severity, title, description,
              suId, staffId: alertStaffId, recordId, recordType } = req.body;

      const rows = await query(
        `INSERT INTO business_alerts
           (home_id, alert_type, severity, title, description, su_id, staff_id, record_id, record_type)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [homeId, alertType, severity, title, description,
         suId || null, alertStaffId || null, recordId || null, recordType || null]
      );

      // Send notification to all home managers and group admins
      try {
        const managerRows = await query<any>(
          `SELECT id FROM staff WHERE home_id=$1 AND role IN ('home_manager','group_admin') AND is_active=true`,
          [homeId]
        );
        for (const m of managerRows) {
          await query(
            `INSERT INTO notifications (recipient_id, home_id, title, body, type, link)
             VALUES ($1,$2,$3,$4,$5,'/alerts')`,
            [m.id, homeId, `Alert: ${title}`, description, severity === 'critical' ? 'error' : severity === 'warning' ? 'warning' : 'info']
          );
        }
      } catch (notifErr: any) {
        console.error('Failed to send alert notifications:', notifErr?.message || notifErr);
      }

      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
