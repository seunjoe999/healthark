import { Router, Request, Response, NextFunction } from 'express';
import { param } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';

const router = Router();
router.use(authenticate);

function fromToken(req: Request, field: string): string {
  const token = req.headers.authorization?.substring(7);
  if (token) { const d = jwt.decode(token) as any; return (req.staff as any)?.[field] || d?.[field] || ''; }
  return (req.staff as any)?.[field] || '';
}

// GET /api/incidents — list incidents from records_incidents joined with daily_records
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const { start_date, end_date, incident_type, search } = req.query;

    let sql = `
      SELECT
        ri.*,
        dr.id as daily_record_id,
        dr.home_id,
        dr.su_id,
        dr.record_date,
        dr.created_at,
        dr.staff_id,
        su.first_name || ' ' || su.last_name as resident_name,
        s.first_name  || ' ' || s.last_name  as recorded_by_name
      FROM records_incidents ri
      JOIN daily_records dr ON dr.id = ri.daily_record_id
      LEFT JOIN service_users su ON su.id = dr.su_id
      LEFT JOIN staff s ON s.id = dr.staff_id
      WHERE dr.home_id = $1
    `;
    const params: any[] = [homeId];

    if (start_date) {
      params.push(start_date);
      sql += ` AND dr.record_date >= $${params.length}`;
    }
    if (end_date) {
      params.push(end_date);
      sql += ` AND dr.record_date <= $${params.length}`;
    }
    if (incident_type) {
      params.push(incident_type);
      sql += ` AND ri.incident_type = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (su.first_name || ' ' || su.last_name) ILIKE $${params.length}`;
    }

    sql += ' ORDER BY dr.created_at DESC';

    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/incidents/stats
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');

    const totalRows = await query(
      `SELECT COUNT(*) as total
       FROM records_incidents ri
       JOIN daily_records dr ON dr.id = ri.daily_record_id
       WHERE dr.home_id = $1
         AND date_trunc('month', dr.created_at) = date_trunc('month', NOW())`,
      [homeId]
    );

    const byTypeRows = await query(
      `SELECT ri.incident_type, COUNT(*) as count
       FROM records_incidents ri
       JOIN daily_records dr ON dr.id = ri.daily_record_id
       WHERE dr.home_id = $1
       GROUP BY ri.incident_type
       ORDER BY count DESC`,
      [homeId]
    );

    const trendRows = await query(
      `SELECT date_trunc('month', dr.created_at) as month, COUNT(*) as count
       FROM records_incidents ri
       JOIN daily_records dr ON dr.id = ri.daily_record_id
       WHERE dr.home_id = $1
         AND dr.created_at >= NOW() - INTERVAL '6 months'
       GROUP BY month ORDER BY month ASC`,
      [homeId]
    );

    res.json({
      success: true,
      data: {
        totalThisMonth: parseInt((totalRows[0] as any)?.total || '0'),
        byType: byTypeRows,
        trend: trendRows,
      }
    } as ApiResponse);
  } catch (err) { next(err); }
});

// DELETE /api/incidents/:id — delete an incident record (managers and admins only)
router.delete('/:id', requireRole('home_manager', 'group_admin'), param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Deletes the records_incidents row; the parent daily_record is kept for audit
      const rows = await query<{ daily_record_id: string }>(
        'DELETE FROM records_incidents WHERE id = $1 RETURNING daily_record_id', [req.params.id]
      );
      if (!rows.length) {
        // Try deleting by daily_record_id in case client sends the daily_record id
        await query('DELETE FROM records_incidents WHERE daily_record_id = $1', [req.params.id]);
      }
      res.json({ success: true, message: 'Incident deleted' } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
