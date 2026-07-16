import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';

const router = Router();
router.use(authenticate);

function tok(req: Request, field: string): string {
  const t = req.headers.authorization?.substring(7);
  if (t) { const d = jwt.decode(t) as any; return (req.staff as any)?.[field] || d?.[field] || ''; }
  return (req.staff as any)?.[field] || '';
}

async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS waiting_list (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      home_id UUID NOT NULL,
      full_name TEXT NOT NULL,
      date_of_birth DATE,
      contact_name TEXT,
      contact_phone TEXT,
      contact_email TEXT,
      care_needs TEXT,
      funding_type TEXT CHECK (funding_type IN ('local_authority','self_funded','nhs','unknown')),
      priority TEXT DEFAULT 'standard' CHECK (priority IN ('urgent','high','standard','low')),
      enquiry_date DATE NOT NULL DEFAULT CURRENT_DATE,
      expected_admission_date DATE,
      preferred_room TEXT,
      status TEXT DEFAULT 'enquiry' CHECK (status IN ('enquiry','assessment_booked','assessment_complete','offer_made','accepted','declined','withdrawn')),
      notes TEXT,
      assigned_to UUID,
      created_by UUID NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

// GET /api/waiting-list?homeId=&status=
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureTable();
    const homeId = (req.query.homeId as string) || tok(req, 'homeId');
    const { status, priority, funding_type } = req.query as Record<string, string>;

    let sql = `
      SELECT wl.*,
             s.first_name || ' ' || s.last_name AS assigned_to_name,
             c.first_name || ' ' || c.last_name AS created_by_name
      FROM waiting_list wl
      LEFT JOIN staff s ON s.id = wl.assigned_to
      LEFT JOIN staff c ON c.id = wl.created_by
      WHERE wl.home_id = $1
        AND wl.status NOT IN ('declined','withdrawn')
    `;
    const params: any[] = [homeId];
    let idx = 2;

    if (status) { sql += ` AND wl.status = $${idx++}`; params.push(status); }
    if (priority) { sql += ` AND wl.priority = $${idx++}`; params.push(priority); }
    if (funding_type) { sql += ` AND wl.funding_type = $${idx++}`; params.push(funding_type); }

    sql += ` ORDER BY
      CASE wl.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'standard' THEN 3 ELSE 4 END,
      wl.enquiry_date ASC`;

    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/waiting-list/stats?homeId=
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureTable();
    const homeId = (req.query.homeId as string) || tok(req, 'homeId');
    const rows = await query(
      `SELECT status, priority, COUNT(*) AS count
       FROM waiting_list
       WHERE home_id = $1
       GROUP BY status, priority`,
      [homeId]
    );

    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    let total = 0;

    for (const row of rows as any[]) {
      byStatus[row.status] = (byStatus[row.status] || 0) + Number(row.count);
      byPriority[row.priority] = (byPriority[row.priority] || 0) + Number(row.count);
      total += Number(row.count);
    }

    // Expected this month
    const expectedRows = await query(
      `SELECT COUNT(*) AS count FROM waiting_list
       WHERE home_id = $1
         AND expected_admission_date >= date_trunc('month', CURRENT_DATE)
         AND expected_admission_date < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'`,
      [homeId]
    );
    const expectedThisMonth = Number(expectedRows[0]?.count || 0);

    res.json({
      success: true,
      data: { total, byStatus, byPriority, expectedThisMonth },
    } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/waiting-list
router.post('/', [
  body('fullName').notEmpty().withMessage('Full name is required'),
  body('enquiryDate').optional().isISO8601(),
], validateRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureTable();
    const homeId = tok(req, 'homeId');
    const staffId = tok(req, 'staffId');
    const {
      fullName, dateOfBirth, contactName, contactPhone, contactEmail,
      careNeeds, fundingType, priority, enquiryDate, expectedAdmissionDate,
      preferredRoom, status, notes, assignedTo,
    } = req.body;

    const rows = await query(
      `INSERT INTO waiting_list
         (home_id, full_name, date_of_birth, contact_name, contact_phone, contact_email,
          care_needs, funding_type, priority, enquiry_date, expected_admission_date,
          preferred_room, status, notes, assigned_to, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING *`,
      [
        homeId, fullName, dateOfBirth || null, contactName || null, contactPhone || null,
        contactEmail || null, careNeeds || null, fundingType || 'unknown',
        priority || 'standard', enquiryDate || new Date().toISOString().slice(0, 10),
        expectedAdmissionDate || null, preferredRoom || null, status || 'enquiry',
        notes || null, assignedTo || null, staffId,
      ]
    );
    res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
  } catch (err) { next(err); }
});

// PUT /api/waiting-list/:id
router.put('/:id', [
  param('id').isUUID(),
], validateRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureTable();
    const homeId = tok(req, 'homeId');
    const { id } = req.params;
    const {
      fullName, dateOfBirth, contactName, contactPhone, contactEmail,
      careNeeds, fundingType, priority, enquiryDate, expectedAdmissionDate,
      preferredRoom, status, notes, assignedTo,
    } = req.body;

    const rows = await query(
      `UPDATE waiting_list SET
         full_name = COALESCE($1, full_name),
         date_of_birth = COALESCE($2, date_of_birth),
         contact_name = COALESCE($3, contact_name),
         contact_phone = COALESCE($4, contact_phone),
         contact_email = COALESCE($5, contact_email),
         care_needs = COALESCE($6, care_needs),
         funding_type = COALESCE($7, funding_type),
         priority = COALESCE($8, priority),
         enquiry_date = COALESCE($9, enquiry_date),
         expected_admission_date = COALESCE($10, expected_admission_date),
         preferred_room = COALESCE($11, preferred_room),
         status = COALESCE($12, status),
         notes = COALESCE($13, notes),
         assigned_to = COALESCE($14, assigned_to),
         updated_at = NOW()
       WHERE id = $15 AND home_id = $16
       RETURNING *`,
      [
        fullName || null, dateOfBirth || null, contactName || null, contactPhone || null,
        contactEmail || null, careNeeds || null, fundingType || null, priority || null,
        enquiryDate || null, expectedAdmissionDate || null, preferredRoom || null,
        status || null, notes || null, assignedTo || null, id, homeId,
      ]
    );
    if (!rows.length) {
      res.status(404).json({ success: false, error: 'Not found' } as ApiResponse);
      return;
    }
    res.json({ success: true, data: rows[0] } as ApiResponse);
  } catch (err) { next(err); }
});

// DELETE /api/waiting-list/:id
router.delete('/:id', [
  param('id').isUUID(),
], validateRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureTable();
    const homeId = tok(req, 'homeId');
    await query(
      `DELETE FROM waiting_list WHERE id = $1 AND home_id = $2`,
      [req.params.id, homeId]
    );
    res.json({ success: true } as ApiResponse);
  } catch (err) { next(err); }
});

export default router;
