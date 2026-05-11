import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';

const router = Router();
router.use(authenticate);

function fromToken(req: Request, field: string): string {
  const token = req.headers.authorization?.substring(7);
  if (token) { const d = jwt.decode(token) as any; return (req.staff as any)?.[field] || d?.[field] || ''; }
  return (req.staff as any)?.[field] || '';
}

// GET /api/mar/medications/:suId — list medications for a service user
router.get('/medications/:suId', param('suId').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query(
        'SELECT * FROM su_medications WHERE su_id = $1 AND is_active = true ORDER BY medication_name',
        [req.params.suId]
      );
      res.json({ success: true, data: rows } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/mar/medications — add medication
router.post('/medications', [body('suId').isUUID(), body('medicationName').notEmpty()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      const homeId = fromToken(req, 'homeId');
      const { suId, medicationName, dose, frequency, route, prescribedBy,
              startDate, endDate, instructions, isPrn } = req.body;
      const rows = await query(
        `INSERT INTO su_medications (su_id, home_id, medication_name, dose, frequency, route,
          prescribed_by, start_date, end_date, instructions, is_prn, added_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [suId, homeId, medicationName, dose || null, frequency || null, route || null,
         prescribedBy || null, startDate || null, endDate || null,
         instructions || null, isPrn || false, staffId]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// DELETE /api/mar/medications/:id
router.delete('/medications/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await query('UPDATE su_medications SET is_active = false WHERE id = $1', [req.params.id]);
      res.json({ success: true, message: 'Medication discontinued' } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// GET /api/mar/records/:suId?date=2026-05-11
router.get('/records/:suId', param('suId').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
      const rows = await query(
        `SELECT mr.*, m.medication_name, m.dose, m.frequency, m.route, m.instructions, m.is_prn,
                s.first_name || ' ' || s.last_name as administered_by_name
         FROM mar_records mr
         JOIN su_medications m ON m.id = mr.medication_id
         LEFT JOIN staff s ON s.id = mr.administered_by
         WHERE mr.su_id = $1 AND mr.record_date = $2
         ORDER BY mr.scheduled_time`,
        [req.params.suId, date]
      );
      res.json({ success: true, data: rows } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/mar/records — log MAR entry
router.post('/records', [body('suId').isUUID(), body('medicationId').isUUID()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      const homeId = fromToken(req, 'homeId');
      const { suId, medicationId, given, refused, reason, notes, scheduledTime } = req.body;
      const rows = await query(
        `INSERT INTO mar_records (su_id, home_id, medication_id, administered_by, given, refused,
          reason, notes, scheduled_time, record_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,CURRENT_DATE) RETURNING *`,
        [suId, homeId, medicationId, staffId, given ?? null, refused || false,
         reason || null, notes || null, scheduledTime || null]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// GET /api/mar/stock/:suId — medication stock counts
router.get('/stock/:suId', param('suId').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query(
        `SELECT ms.*, m.medication_name, m.dose
         FROM medication_stock ms JOIN su_medications m ON m.id = ms.medication_id
         WHERE ms.su_id = $1`,
        [req.params.suId]
      );
      res.json({ success: true, data: rows } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/mar/stock/:medicationId/count — update stock count
router.post('/stock/:medicationId/count', param('medicationId').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      const { suId, currentCount, notes } = req.body;
      await query(
        `INSERT INTO medication_stock (su_id, medication_id, current_count, last_counted_by, last_counted_at, notes)
         VALUES ($1,$2,$3,$4,NOW(),$5)
         ON CONFLICT (su_id, medication_id) DO UPDATE SET
           current_count=$3, last_counted_by=$4, last_counted_at=NOW(), notes=$5`,
        [suId, req.params.medicationId, currentCount, staffId, notes || null]
      );
      res.json({ success: true, message: 'Stock count updated' } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
