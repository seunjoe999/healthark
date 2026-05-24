import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';

const router = Router();

function nd(v: any): string | null { return v && String(v).trim() ? String(v).trim() : null; }

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
         prescribedBy || null, nd(startDate), nd(endDate),
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
                s.first_name || ' ' || s.last_name as given_by_name
         FROM mar_records mr
         JOIN su_medications m ON m.id = mr.medication_id
         LEFT JOIN staff s ON s.id = mr.given_by
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
      const { suId, medicationId, given, refused, reason, notes, scheduledTime, recordDate } = req.body;
      const rows = await query(
        `INSERT INTO mar_records (su_id, home_id, medication_id, given_by, given, refused,
          refused_reason, notes, scheduled_time, record_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [suId, homeId, medicationId, staffId, given ?? null, refused || false,
         reason || null, notes || null, scheduledTime || null,
         recordDate || new Date().toISOString().split('T')[0]]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// GET /api/mar/chart-report/:suId?startDate=&endDate= — MAR chart report for date range
router.get('/chart-report/:suId', param('suId').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { startDate, endDate } = req.query as Record<string, string>;
      const now = new Date();
      const start = startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const end = endDate || now.toISOString().split('T')[0];

      const suRows = await query(
        `SELECT su.*, h.name as home_name, h.address1 as home_address, h.postcode as home_postcode,
                h.phone as home_phone
         FROM service_users su LEFT JOIN homes h ON h.id = su.home_id WHERE su.id = $1`,
        [req.params.suId]
      );
      if (!suRows.length) throw new AppError('Service user not found', 404);

      const meds = await query(
        'SELECT * FROM su_medications WHERE su_id = $1 AND is_active = true ORDER BY medication_name',
        [req.params.suId]
      );

      const records = await query(
        `SELECT mr.*,
                LEFT(mr.scheduled_time::text, 5) as scheduled_time,
                s.first_name || ' ' || s.last_name as given_by_name,
                UPPER(LEFT(s.first_name,1) || LEFT(s.last_name,1)) as initials
         FROM mar_records mr
         LEFT JOIN staff s ON s.id = mr.given_by
         WHERE mr.su_id = $1 AND mr.record_date BETWEEN $2 AND $3
         ORDER BY mr.record_date, mr.scheduled_time NULLS LAST`,
        [req.params.suId, start, end]
      );

      // Build array of dates in range
      const dates: string[] = [];
      const cur = new Date(start + 'T00:00:00Z');
      const endD = new Date(end + 'T00:00:00Z');
      while (cur <= endD) {
        dates.push(cur.toISOString().split('T')[0]);
        cur.setUTCDate(cur.getUTCDate() + 1);
      }

      // Group records by medication_id → date → array
      const recordMap: Record<string, Record<string, any[]>> = {};
      for (const rec of records as any[]) {
        const medId = rec.medication_id;
        if (!medId) continue;
        const d = rec.record_date instanceof Date
          ? rec.record_date.toISOString().split('T')[0]
          : String(rec.record_date).split('T')[0];
        if (!recordMap[medId]) recordMap[medId] = {};
        if (!recordMap[medId][d]) recordMap[medId][d] = [];
        recordMap[medId][d].push(rec);
      }

      // Derive expected time slots from frequency
      const freqTimes: Record<string, string[]> = {
        once_daily: ['08:00'],
        twice_daily: ['08:00', '20:00'],
        three_times_daily: ['08:00', '14:00', '20:00'],
        four_times_daily: ['08:00', '12:00', '16:00', '20:00'],
        weekly: ['08:00'],
        as_required: ['PRN'],
        other: [''],
      };

      const medsWithRecords = (meds as any[]).map(med => ({
        ...med,
        time_slots: freqTimes[med.frequency] || ['08:00'],
        records: recordMap[med.id] || {},
      }));

      res.json({
        success: true,
        data: { serviceUser: suRows[0], startDate: start, endDate: end, dates, medications: medsWithRecords },
      } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// DELETE /api/mar/records/:id — delete a MAR record
router.delete('/records/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await query('DELETE FROM mar_records WHERE id = $1', [req.params.id]);
      res.json({ success: true, message: 'MAR record deleted' } as ApiResponse);
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
      const existing = await query<any>(
        'SELECT id FROM medication_stock WHERE su_id=$1 AND medication_id=$2',
        [suId, req.params.medicationId]
      );
      if (existing.length) {
        await query(
          `UPDATE medication_stock SET current_count=$1, last_counted_by=$2, last_counted_at=NOW(), notes=$3 WHERE su_id=$4 AND medication_id=$5`,
          [currentCount, staffId, notes || null, suId, req.params.medicationId]
        );
      } else {
        await query(
          `INSERT INTO medication_stock (su_id, medication_id, current_count, last_counted_by, last_counted_at, notes) VALUES ($1,$2,$3,$4,NOW(),$5)`,
          [suId, req.params.medicationId, currentCount, staffId, notes || null]
        );
      }
      res.json({ success: true, message: 'Stock count updated' } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
