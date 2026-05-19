import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth';
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

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const rows = await query(
      `SELECT sc.*, sc.description as overview,
              su.first_name || ' ' || su.last_name as su_name,
              s.first_name || ' ' || s.last_name as created_by_name
       FROM safeguarding_concerns sc
       JOIN service_users su ON su.id = sc.su_id
       JOIN staff s ON s.id = sc.created_by
       WHERE sc.home_id = $1 ORDER BY sc.created_at DESC`,
      [homeId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

router.get('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query(
        `SELECT sc.*, su.first_name || ' ' || su.last_name as su_name,
                s.first_name || ' ' || s.last_name as created_by_name
         FROM safeguarding_concerns sc
         JOIN service_users su ON su.id = sc.su_id
         JOIN staff s ON s.id = sc.created_by
         WHERE sc.id = $1`,
        [req.params.id]
      );
      if (!rows.length) throw new AppError('Safeguarding concern not found', 404);
      res.json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.post('/',
  [body('suId').isUUID(), body('overview').notEmpty(), body('immediateActions').notEmpty(), body('incidentDate').isDate()],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      const homeId = req.body.homeId || fromToken(req, 'homeId');
      const { suId, suLocation, incidentLocation, incidentDate, incidentTime, overview,
              witnesses, medicalRequired, medicalDetails, injuryDetails, immediateActions,
              decisionsBReached, lessonsLearnt, outsideAgency, agencyDetails,
              managementRecs, preventionActions, reportedTo } = req.body;

      const rows = await query(
        `INSERT INTO safeguarding_concerns (su_id, home_id, created_by, su_location,
          incident_location, incident_date, incident_time, description, witnesses,
          medical_required, medical_details, injury_details, immediate_actions,
          decisions_breached, lessons_learnt, outside_agency, agency_details,
          management_recs, prevention_actions, reported_to, reported_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,NOW())
         RETURNING *, description as overview`,
        [suId, homeId, staffId, suLocation || null, incidentLocation || null,
         incidentDate, incidentTime || null, overview, witnesses || null,
         medicalRequired || false, medicalDetails || null, injuryDetails || null,
         immediateActions, decisionsBReached || null, lessonsLearnt || null,
         outsideAgency || false, agencyDetails || null, managementRecs || null,
         preventionActions || null, reportedTo || null]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.put('/:id/acknowledge', requireRole('home_manager', 'group_admin'),
  param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      await query(
        `UPDATE safeguarding_concerns SET manager_ack=true, manager_ack_by=$1, manager_ack_at=NOW() WHERE id=$2`,
        [staffId, req.params.id]
      );
      res.json({ success: true, message: 'Acknowledged' } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
