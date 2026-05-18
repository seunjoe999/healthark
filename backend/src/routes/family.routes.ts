import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types';

const router = Router();

router.get('/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await query<any>(
      `SELECT su.id, su.first_name, su.last_name, su.preferred_name,
              su.date_of_birth, su.photo_url, su.admission_date,
              h.name as home_name, h.phone as home_phone, h.address1 as home_address
       FROM service_users su
       JOIN homes h ON h.id = su.home_id
       WHERE su.qr_token = $1 OR su.id::text = $1`,
      [req.params.token]
    );
    if (!rows.length) throw new AppError('Resident not found', 404);
    const su = rows[0];
    const records = await query<any>(
      `SELECT record_type, notes, record_date, shift FROM daily_records
       WHERE su_id = $1 AND record_date >= CURRENT_DATE - INTERVAL '7 days'
       ORDER BY record_date DESC LIMIT 20`,
      [su.id]
    );
    res.json({ success: true, data: { resident: su, records } } as ApiResponse);
  } catch (err) { next(err); }
});

export default router;
