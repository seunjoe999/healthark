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
