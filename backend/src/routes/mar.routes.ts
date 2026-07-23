import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';
import { assertResidentAccess } from '../utils/residentAccess';

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
      await assertResidentAccess(req, req.params.suId);
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
              startDate, endDate, instructions, isPrn, isControlled, pharmacyName, pharmacyPhone,
              gpName, gpPhone, medicationCode, atcCode,
              locationAccessCode, medicineWarning } = req.body;
      const bodyHomeId = req.body.homeId;
      const effectiveHomeId = bodyHomeId || homeId;
      const rows = await query(
        `INSERT INTO su_medications (su_id, home_id, medication_name, dose, frequency, route,
          prescriber, start_date, end_date, notes, is_prn, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [suId, effectiveHomeId, medicationName, dose || null, frequency || null, route || null,
         prescribedBy || null, nd(startDate), nd(endDate),
         instructions || null, isPrn || false, staffId]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// PATCH /api/mar/medications/:id — update medication
router.patch('/medications/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { dose, frequency, route, prescribedBy, startDate, endDate, instructions, isPrn } = req.body;
      const updates = [
        { field: 'dose', val: dose },
        { field: 'frequency', val: frequency },
        { field: 'route', val: route },
        { field: 'prescriber', val: prescribedBy },
        { field: 'start_date', val: nd(startDate) },
        { field: 'end_date', val: nd(endDate) },
        { field: 'notes', val: instructions },
        { field: 'is_prn', val: isPrn },
      ].filter(u => u.val !== undefined);
      if (!updates.length) { res.status(400).json({ success: false, error: 'No fields to update' }); return; }
      const setClauses = updates.map((u, i) => `${u.field}=$${i + 1}`).join(', ');
      const vals = updates.map(u => u.val);
      const rows = await query(`UPDATE su_medications SET ${setClauses} WHERE id=$${vals.length + 1} RETURNING *`, [...vals, req.params.id]);
      res.json({ success: true, data: rows[0] } as ApiResponse);
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

// GET /api/mar/records/today?homeId=<uuid> — dashboard summary for today
router.get('/records/today', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = req.query.homeId as string;
    if (!homeId) {
      res.status(400).json({ success: false, error: 'homeId query parameter is required' });
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    // Count total scheduled doses and given doses for today across the home
    const rows = await query<any>(
      `SELECT
         COUNT(*) AS due,
         COUNT(CASE WHEN mr.given = true THEN 1 END) AS given
       FROM mar_records mr
       WHERE mr.home_id = $1 AND mr.record_date = $2`,
      [homeId, today]
    );
    const row = rows[0] || { due: 0, given: 0 };
    res.json({ success: true, data: { due: Number(row.due), given: Number(row.given) } });
  } catch (err) { next(err); }
});

// GET /api/mar/records/:suId?date=2026-05-11
router.get('/records/:suId', param('suId').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
      const rows = await query(
        `SELECT mr.*, m.medication_name, m.dose, m.frequency, m.route,
                m.notes AS instructions, m.is_prn,
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
      const homeId = req.body.homeId || fromToken(req, 'homeId');
      const { suId, medicationId, given, refused, reason, notes, scheduledTime, recordDate, marCode,
              controlledWitnessId, controlledWitnessName } = req.body;
      const rows = await query(
        `INSERT INTO mar_records (su_id, home_id, medication_id, given_by, given, refused,
          refused_reason, notes, scheduled_time, record_date, mar_code,
          controlled_witness_id, controlled_witness_name)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
        [suId, homeId, medicationId, staffId, given ?? null, refused || false,
         reason || null, notes || null, scheduledTime || null,
         recordDate || new Date().toISOString().split('T')[0],
         marCode || null,
         controlledWitnessId || null, controlledWitnessName || null]
      );
      const record = rows[0] as any;

      // Send notification to witness if controlled medication
      if (controlledWitnessId) {
        try {
          const staffRows = await query('SELECT first_name, last_name FROM staff WHERE id = $1', [staffId]);
          const adminName = staffRows.length ? `${(staffRows[0] as any).first_name} ${(staffRows[0] as any).last_name}` : 'Staff';
          const medRows = await query('SELECT medication_name FROM su_medications WHERE id = $1', [medicationId]);
          const medName = medRows.length ? (medRows[0] as any).medication_name : 'medication';
          await query(
            'INSERT INTO notifications (recipient_id, home_id, title, body, type, link) VALUES ($1,$2,$3,$4,$5,$6)',
            [controlledWitnessId, homeId,
             'Controlled Medication — Witness Sign-Off Required',
             `${adminName} administered ${medName} on ${recordDate || new Date().toISOString().split('T')[0]} and selected you as a witness. Please sign off.`,
             'controlled_med_witness',
             `/mar?witnessRecord=${record.id}`]
          );
        } catch (notifErr) { /* non-fatal */ }
      }

      res.status(201).json({ success: true, data: record } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/mar/records/:id/witness-signoff
router.post('/records/:id/witness-signoff', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      const { mgmt } = req.body; // true = management sign-off, false = witness sign-off
      if (mgmt) {
        const staffRows = await query('SELECT first_name, last_name FROM staff WHERE id = $1', [staffId]);
        const name = staffRows.length ? `${(staffRows[0] as any).first_name} ${(staffRows[0] as any).last_name}` : 'Staff';
        await query(
          `UPDATE mar_records SET mgmt_sign_off_by = $1, mgmt_sign_off_at = NOW() WHERE id = $2`,
          [name, req.params.id]
        );
      } else {
        await query(
          `UPDATE mar_records SET controlled_witness_signed = true, controlled_witness_signed_at = NOW() WHERE id = $1`,
          [req.params.id]
        );
      }
      res.json({ success: true, message: 'Sign-off recorded' } as ApiResponse);
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
      // medication_stock has no medication_id FK — query directly by su_id
      const rows = await query(
        `SELECT * FROM medication_stock WHERE su_id = $1`,
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
      const homeId = fromToken(req, 'homeId');
      const { suId, currentCount, notes } = req.body;
      // medication_stock is keyed by (su_id, medication_name) — look up name first
      const medRows = await query<any>('SELECT medication_name FROM su_medications WHERE id=$1', [req.params.medicationId]);
      if (!medRows.length) { res.status(404).json({ success: false, error: 'Medication not found' }); return; }
      const medName = medRows[0].medication_name;
      const existing = await query<any>(
        'SELECT id FROM medication_stock WHERE su_id=$1 AND medication_name=$2',
        [suId, medName]
      );
      if (existing.length) {
        await query(
          `UPDATE medication_stock SET current_stock=$1, last_updated_by=$2, updated_at=NOW() WHERE su_id=$3 AND medication_name=$4`,
          [currentCount, staffId, suId, medName]
        );
      } else {
        await query(
          `INSERT INTO medication_stock (su_id, home_id, medication_name, current_stock, last_updated_by) VALUES ($1,$2,$3,$4,$5)`,
          [suId, homeId, medName, currentCount, staffId]
        );
      }
      res.json({ success: true, message: 'Stock count updated' } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
