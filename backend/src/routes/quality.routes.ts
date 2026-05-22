import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
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

// GET /api/quality — list QA records
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const type = req.query.type as string;
    let sql = `SELECT qa.*, su.first_name || ' ' || su.last_name as su_name,
                      s.first_name || ' ' || s.last_name as created_by_name
               FROM quality_records qa
               LEFT JOIN service_users su ON su.id = qa.su_id
               LEFT JOIN staff s ON s.id = qa.created_by
               WHERE qa.home_id = $1`;
    const params: unknown[] = [homeId];
    if (type) { sql += ' AND qa.record_type = $2'; params.push(type); }
    sql += ' ORDER BY qa.created_at DESC LIMIT 100';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/quality — create QA record (complaint, compliment, feedback)
router.post('/', [body('recordType').notEmpty(), body('summary').notEmpty()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      const homeId = req.body.homeId || fromToken(req, 'homeId');
      const { recordType, suId, relatedStaffId, summary, detail, actionTaken } = req.body;
      const rows = await query(
        `INSERT INTO quality_records (home_id, su_id, related_staff_id, created_by, record_type,
          summary, detail, action_taken)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [homeId, suId || null, relatedStaffId || null, staffId, recordType,
         summary, detail || null, actionTaken || null]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// GET /api/quality/sensitive-notes/:suId
router.get('/sensitive-notes/:suId', param('suId').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query(
        `SELECT sn.*, s.first_name || ' ' || s.last_name as created_by_name
         FROM sensitive_notes sn JOIN staff s ON s.id = sn.created_by
         WHERE sn.su_id = $1 ORDER BY sn.created_at DESC`,
        [req.params.suId]
      );
      res.json({ success: true, data: rows } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/quality/sensitive-notes
router.post('/sensitive-notes', [body('suId').isUUID(), body('note').notEmpty()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      const homeId = fromToken(req, 'homeId');
      const rows = await query(
        `INSERT INTO sensitive_notes (su_id, home_id, created_by, note, category)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [req.body.suId, homeId, staffId, req.body.note, req.body.category || 'general']
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// GET /api/quality/capacity/:suId
router.get('/capacity/:suId', param('suId').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query(
        `SELECT ca.*, s.first_name || ' ' || s.last_name as assessed_by_name
         FROM capacity_assessments ca LEFT JOIN staff s ON s.id = ca.assessed_by
         WHERE ca.su_id = $1 ORDER BY ca.created_at DESC`,
        [req.params.suId]
      );
      res.json({ success: true, data: rows } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/quality/capacity
router.post('/capacity', [body('suId').isUUID(), body('decisionArea').notEmpty()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      const homeId = fromToken(req, 'homeId');
      const { suId, decisionArea, hasCapacity, bestInterestDecision,
              consultedWith, outcome, reviewDate } = req.body;
      const rows = await query(
        `INSERT INTO capacity_assessments (su_id, home_id, assessed_by, decision_area,
          has_capacity, best_interest_decision, consulted_with, outcome, review_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [suId, homeId, staffId, decisionArea, hasCapacity ?? null,
         bestInterestDecision || null, consultedWith || null,
         outcome || null, nd(reviewDate)]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// GET /api/quality/professionals/:suId
router.get('/professionals/:suId', param('suId').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query(
        'SELECT * FROM professional_involvement WHERE su_id = $1 ORDER BY role_title',
        [req.params.suId]
      );
      res.json({ success: true, data: rows } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/quality/professionals
router.post('/professionals', [body('suId').isUUID(), body('roleTitle').notEmpty(), body('fullName').notEmpty()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { suId, roleTitle, fullName, organisation, phone, email, notes } = req.body;
      const rows = await query(
        `INSERT INTO professional_involvement (su_id, role_title, full_name, organisation, phone, email, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [suId, roleTitle, fullName, organisation || null, phone || null, email || null, notes || null]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// DELETE /api/quality/:id
router.delete('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await query('DELETE FROM quality_records WHERE id = $1', [req.params.id]);
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.delete('/professionals/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await query('DELETE FROM professional_involvement WHERE id = $1', [req.params.id]);
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.delete('/capacity/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await query('DELETE FROM capacity_assessments WHERE id = $1', [req.params.id]);
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.delete('/sensitive-notes/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await query('DELETE FROM sensitive_notes WHERE id = $1', [req.params.id]);
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
