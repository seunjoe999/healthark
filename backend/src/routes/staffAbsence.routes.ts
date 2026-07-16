import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth';
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

// Ensure table exists
async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS staff_absences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      home_id UUID NOT NULL,
      staff_id UUID NOT NULL,
      absence_start DATE NOT NULL,
      absence_end DATE,
      absence_type TEXT NOT NULL CHECK (absence_type IN ('sick','unauthorised','emergency','bereavement','other')),
      reason TEXT,
      return_to_work_date DATE,
      return_to_work_completed BOOLEAN DEFAULT false,
      return_to_work_notes TEXT,
      fit_note_provided BOOLEAN DEFAULT false,
      fit_note_end_date DATE,
      logged_by UUID NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `, []);
}

// Initialise table on first request (idempotent)
router.use(async (_req, _res, next) => {
  try { await ensureTable(); } catch (_) {}
  next();
});

// ── GET /api/staff-absence?homeId=&staffId=&year= ─────────────────
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const staffId = req.query.staffId as string | undefined;
    const year = req.query.year as string | undefined;

    let sql = `
      SELECT a.*,
             s.first_name || ' ' || s.last_name AS staff_name,
             s.role AS staff_role,
             s.photo_url,
             COALESCE(a.absence_end::date - a.absence_start::date + 1, (CURRENT_DATE - a.absence_start::date + 1)) AS days_so_far
      FROM staff_absences a
      JOIN staff s ON s.id = a.staff_id
      WHERE a.home_id = $1`;
    const params: any[] = [homeId];
    let idx = 2;

    if (staffId) { sql += ` AND a.staff_id = $${idx++}`; params.push(staffId); }
    if (year) {
      sql += ` AND EXTRACT(YEAR FROM a.absence_start) = $${idx++}`;
      params.push(parseInt(year));
    }
    sql += ' ORDER BY a.absence_start DESC';

    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// ── GET /api/staff-absence/bradford?homeId= ───────────────────────
router.get('/bradford', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 364);

    const rows = await query(
      `SELECT
         s.id AS staff_id,
         s.first_name || ' ' || s.last_name AS staff_name,
         s.role,
         s.photo_url,
         COUNT(a.id)::int AS spells,
         COALESCE(SUM(
           COALESCE(a.absence_end::date, CURRENT_DATE) - a.absence_start::date + 1
         ), 0)::int AS total_days
       FROM staff s
       LEFT JOIN staff_absences a
         ON a.staff_id = s.id
         AND a.home_id = $1
         AND a.absence_start >= $2
       WHERE s.home_id = $1 AND s.is_active = TRUE
       GROUP BY s.id, s.first_name, s.last_name, s.role, s.photo_url
       ORDER BY s.first_name, s.last_name`,
      [homeId, cutoff.toISOString().split('T')[0]]
    );

    const result = rows.map((r: any) => {
      const S = r.spells;
      const D = r.total_days;
      const bradford = S * S * D;
      let level: string;
      if (bradford >= 400) level = 'very_high';
      else if (bradford >= 200) level = 'high';
      else if (bradford >= 100) level = 'medium';
      else level = 'low';
      return { ...r, bradford_score: bradford, bradford_level: level };
    });

    result.sort((a: any, b: any) => b.bradford_score - a.bradford_score);
    res.json({ success: true, data: result } as ApiResponse);
  } catch (err) { next(err); }
});

// ── GET /api/staff-absence/stats?homeId= ─────────────────────────
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const monthStart = new Date();
    monthStart.setDate(1);

    const [currentRows, monthRows, rtwRows] = await Promise.all([
      // Currently absent (no end date or end date >= today)
      query(
        `SELECT COUNT(*)::int AS count FROM staff_absences
         WHERE home_id = $1 AND (absence_end IS NULL OR absence_end >= CURRENT_DATE)
         AND absence_start <= CURRENT_DATE`,
        [homeId]
      ),
      // Days lost this month
      query(
        `SELECT COALESCE(SUM(
           LEAST(COALESCE(absence_end, CURRENT_DATE), CURRENT_DATE)::date
           - GREATEST(absence_start, $2::date)::date + 1
         ), 0)::int AS days
         FROM staff_absences
         WHERE home_id = $1
         AND absence_start <= CURRENT_DATE
         AND (absence_end IS NULL OR absence_end >= $2)`,
        [homeId, monthStart.toISOString().split('T')[0]]
      ),
      // RTW interviews due (absence ended but interview not completed)
      query(
        `SELECT COUNT(*)::int AS count FROM staff_absences
         WHERE home_id = $1
         AND absence_end IS NOT NULL
         AND return_to_work_completed = false`,
        [homeId]
      ),
    ]);

    res.json({
      success: true,
      data: {
        currently_absent: currentRows[0]?.count ?? 0,
        days_lost_this_month: monthRows[0]?.days ?? 0,
        rtw_interviews_due: rtwRows[0]?.count ?? 0,
      },
    } as ApiResponse);
  } catch (err) { next(err); }
});

// ── POST /api/staff-absence ───────────────────────────────────────
router.post('/',
  [
    body('staffId').isUUID(),
    body('absenceStart').isDate(),
    body('absenceType').isIn(['sick', 'unauthorised', 'emergency', 'bereavement', 'other']),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = req.body.homeId || fromToken(req, 'homeId');
      const loggedBy = fromToken(req, 'staffId');
      const {
        staffId, absenceStart, absenceEnd, absenceType, reason,
        fitNoteProvided, fitNoteEndDate,
      } = req.body;

      const rows = await query(
        `INSERT INTO staff_absences
           (home_id, staff_id, absence_start, absence_end, absence_type, reason,
            fit_note_provided, fit_note_end_date, logged_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING *`,
        [
          homeId, staffId, absenceStart,
          absenceEnd || null, absenceType, reason || null,
          fitNoteProvided || false, fitNoteEndDate || null, loggedBy,
        ]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// ── PUT /api/staff-absence/:id ────────────────────────────────────
router.put('/:id',
  [param('id').isUUID()],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        absenceEnd, returnToWorkDate, returnToWorkCompleted,
        returnToWorkNotes, fitNoteProvided, fitNoteEndDate, reason, absenceType,
      } = req.body;

      await query(
        `UPDATE staff_absences SET
           absence_end = COALESCE($1, absence_end),
           absence_type = COALESCE($2, absence_type),
           reason = COALESCE($3, reason),
           return_to_work_date = COALESCE($4, return_to_work_date),
           return_to_work_completed = COALESCE($5, return_to_work_completed),
           return_to_work_notes = COALESCE($6, return_to_work_notes),
           fit_note_provided = COALESCE($7, fit_note_provided),
           fit_note_end_date = COALESCE($8, fit_note_end_date),
           updated_at = NOW()
         WHERE id = $9`,
        [
          absenceEnd || null, absenceType || null, reason || null,
          returnToWorkDate || null, returnToWorkCompleted ?? null,
          returnToWorkNotes || null, fitNoteProvided ?? null,
          fitNoteEndDate || null, req.params.id,
        ]
      );
      const updated = await query('SELECT * FROM staff_absences WHERE id = $1', [req.params.id]);
      res.json({ success: true, data: updated[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
