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
    const orgId = fromToken(req, 'organisationId');
    const staffId = fromToken(req, 'staffId');
    const rows = await query(
      `SELECT p.*, s.first_name || ' ' || s.last_name as uploaded_by_name,
              EXISTS(SELECT 1 FROM policy_sign_offs pso WHERE pso.policy_id = p.id AND pso.staff_id = $1) as signed_by_me,
              (SELECT COUNT(*) FROM policy_sign_offs pso WHERE pso.policy_id = p.id) as signed_count
       FROM policies p LEFT JOIN staff s ON s.id = p.uploaded_by
       WHERE p.organisation_id = $2 ORDER BY p.created_at DESC`,
      [staffId, orgId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

router.post('/',
  requireRole('group_admin', 'home_manager'),
  [body('title').notEmpty(), body('documentUrl').optional()],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      const orgId = fromToken(req, 'organisationId');
      const { title, version, documentUrl, effectiveDate, reviewDate, requiresSign, homeId } = req.body;
      const rows = await query(
        `INSERT INTO policies (organisation_id, home_id, title, version, document_url, effective_date, review_date, uploaded_by, requires_sign)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [orgId, homeId || null, title, version || '1.0', documentUrl,
         effectiveDate || new Date().toISOString().split('T')[0],
         nd(reviewDate), staffId, requiresSign ?? true]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.post('/:id/sign', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      const { signatureUrl } = req.body;
      // Try insert with signature_url; fall back to basic insert if column doesn't exist
      try {
        await query(
          `INSERT INTO policy_sign_offs (policy_id, staff_id, signature_url)
           VALUES ($1,$2,$3) ON CONFLICT (policy_id, staff_id) DO UPDATE SET signature_url = EXCLUDED.signature_url`,
          [req.params.id, staffId, signatureUrl || null]
        );
      } catch {
        await query(
          `INSERT INTO policy_sign_offs (policy_id, staff_id)
           VALUES ($1,$2) ON CONFLICT (policy_id, staff_id) DO NOTHING`,
          [req.params.id, staffId]
        );
      }
      res.json({ success: true, message: 'Policy signed' } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.get('/:id/sign-offs', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query(
        `SELECT pso.*, s.first_name || ' ' || s.last_name as staff_name, s.role
         FROM policy_sign_offs pso JOIN staff s ON s.id = pso.staff_id
         WHERE pso.policy_id = $1 ORDER BY pso.signed_at DESC`,
        [req.params.id]
      );
      res.json({ success: true, data: rows } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.get('/:id/attachments', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query(
        `SELECT pa.*, s.first_name || ' ' || s.last_name as uploaded_by_name
         FROM policy_attachments pa LEFT JOIN staff s ON s.id = pa.uploaded_by
         WHERE pa.policy_id = $1 ORDER BY pa.created_at DESC`,
        [req.params.id]
      );
      res.json({ success: true, data: rows } as ApiResponse);
    } catch (err) { next(err); }
  }
);


router.post('/:id/send-signoff-requests',
  requireRole('group_admin', 'home_manager'),
  [param('id').isUUID(), body('staffIds').isArray({ min: 1 })],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const senderId = fromToken(req, 'staffId');
      const homeId = fromToken(req, 'homeId');
      const policyId = req.params.id;
      const { staffIds } = req.body as { staffIds: string[] };

      const policyRows = await query('SELECT title FROM policies WHERE id = $1', [policyId]);
      if (!policyRows.length) throw new AppError('Policy not found', 404);
      const policyTitle = policyRows[0].title as string;

      const subject = `Policy Sign-off Required: ${policyTitle}`;
      const messageBody = `You are required to read and sign off the following policy: ${policyTitle}. Please go to Policies & Procedures to complete your sign-off.`;

      let sent = 0;
      for (const staffId of staffIds) {
        await query(
          `INSERT INTO staff_messages (sender_id, recipient_id, home_id, subject, body, message)
           VALUES ($1, $2, $3, $4, $5, $5)`,
          [senderId, staffId, homeId || null, subject, messageBody]
        );
        sent++;
      }

      res.json({ success: true, sent } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.delete('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await query('DELETE FROM policy_sign_offs WHERE policy_id=$1', [req.params.id]);
      await query('DELETE FROM policies WHERE id=$1', [req.params.id]);
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
