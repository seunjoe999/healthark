import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';

const router = Router();

function nd(v: any): string | null { return v && String(v).trim() ? String(v).trim() : null; }

router.use(authenticate);

function fromToken(req: Request, field: string): string {
  const token = req.headers.authorization?.substring(7);
  if (token) { const d = jwt.decode(token) as any; return d?.[field] || ''; }
  return '';
}

// GET /api/shifts?homeId=&date=&week=
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const date = req.query.date as string;
    const weekStart = req.query.weekStart as string;

    let sql = `SELECT sh.*, 
      s.first_name || ' ' || s.last_name as staff_name, s.role as staff_role, s.photo_url as staff_photo,
      su.first_name || ' ' || su.last_name as su_name
      FROM staff_shifts sh
      JOIN staff s ON s.id = sh.staff_id
      LEFT JOIN service_users su ON su.id = sh.su_id
      WHERE sh.home_id = $1`;
    const params: unknown[] = [homeId];

    if (date) { sql += ` AND sh.shift_date = $${params.length+1}`; params.push(date); }
    else if (weekStart) {
      sql += ` AND sh.shift_date >= $${params.length+1} AND sh.shift_date < $${params.length+1}::date + interval '7 days'`;
      params.push(weekStart);
    }
    sql += ' ORDER BY sh.shift_date, sh.start_time';

    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/shifts
router.post('/', [body('staffId').isUUID(), body('shiftDate').isDate(), body('startTime').notEmpty(), body('endTime').notEmpty()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = req.body.homeId || fromToken(req, 'homeId');
      const createdBy = fromToken(req, 'staffId');
      const { staffId, suId, shiftDate, startTime, endTime, shiftType, notes } = req.body;
      const rows = await query(
        `INSERT INTO staff_shifts (home_id, staff_id, su_id, shift_date, start_time, end_time, shift_type, notes, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [homeId, staffId, suId || null, shiftDate, startTime, endTime, shiftType || 'regular', notes || null, createdBy]
      );
      // Create notification for staff member
      await query(
        `INSERT INTO notifications (recipient_id, home_id, title, body, type, link)
         VALUES ($1,$2,$3,$4,'shift','/staff')`,
        [staffId, homeId, 'New shift assigned', `You have been assigned a shift on ${shiftDate} from ${startTime} to ${endTime}`]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// DELETE /api/shifts/:id
router.delete('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await query('DELETE FROM staff_shifts WHERE id = $1', [req.params.id]);
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
