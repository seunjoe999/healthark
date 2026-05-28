import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';
import {
  sendEmail,
  interviewInviteEmail,
  applicationReceivedEmail,
  referenceRequestEmail,
  offerLetterEmail,
  rejectionEmail,
  customEmail,
} from '../services/email.service';

const router = Router();
router.use(authenticate);

function fromToken(req: Request, field: string): string {
  const token = req.headers.authorization?.substring(7);
  if (token) { const d = jwt.decode(token) as any; return (req.staff as any)?.[field] || d?.[field] || ''; }
  return (req.staff as any)?.[field] || '';
}

// GET /api/recruitment?homeId=
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const rows = await query(
      `SELECT * FROM recruitment_candidates WHERE home_id = $1 ORDER BY applied_date DESC, created_at DESC`,
      [homeId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/recruitment
router.post('/', [
  body('firstName').notEmpty(),
  body('lastName').notEmpty(),
  body('position').notEmpty(),
], validateRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = req.body.homeId || fromToken(req, 'homeId');
    const { firstName, lastName, email, phone, position, appliedDate, status, pipelineStage, interviewDate, notes, dbsCheck, referenceCheck, trainingDone, dbsCleared, referencesDone, fullyCompliant, readyToStart, startDate } = req.body;
    const rows = await query(
      `INSERT INTO recruitment_candidates (home_id, first_name, last_name, email, phone, position, applied_date, status, pipeline_stage, interview_date, notes, dbs_check, reference_check, training_done, dbs_cleared, references_done, fully_compliant, ready_to_start, start_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`,
      [homeId, firstName, lastName, email || null, phone || null, position, appliedDate || null, status || 'applied', pipelineStage || status || 'applied', interviewDate || null, notes || null, dbsCheck || null, referenceCheck || null, trainingDone || false, dbsCleared || false, referencesDone || false, fullyCompliant || false, readyToStart || false, startDate || null]
    );
    res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
  } catch (err) { next(err); }
});

// PUT /api/recruitment/:id
router.put('/:id', param('id').isUUID(), validateRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { firstName, lastName, email, phone, position, appliedDate, status, pipelineStage, interviewDate, notes, dbsCheck, referenceCheck, trainingDone, dbsCleared, referencesDone, fullyCompliant, readyToStart, startDate } = req.body;
    const rows = await query(
      `UPDATE recruitment_candidates SET
         first_name      = COALESCE($1, first_name),
         last_name       = COALESCE($2, last_name),
         email           = COALESCE($3, email),
         phone           = COALESCE($4, phone),
         position        = COALESCE($5, position),
         applied_date    = COALESCE($6, applied_date),
         status          = COALESCE($7, status),
         pipeline_stage  = COALESCE($8, pipeline_stage),
         interview_date  = COALESCE($9, interview_date),
         notes           = COALESCE($10, notes),
         dbs_check       = COALESCE($11, dbs_check),
         reference_check = COALESCE($12, reference_check),
         training_done   = COALESCE($13, training_done),
         dbs_cleared     = COALESCE($14, dbs_cleared),
         references_done = COALESCE($15, references_done),
         fully_compliant = COALESCE($16, fully_compliant),
         ready_to_start  = COALESCE($17, ready_to_start),
         start_date      = COALESCE($18, start_date),
         updated_at      = NOW()
       WHERE id=$19 RETURNING *`,
      [firstName || null, lastName || null, email || null, phone || null, position || null,
       appliedDate || null, status || null, pipelineStage || null, interviewDate || null, notes || null,
       dbsCheck || null, referenceCheck || null,
       trainingDone !== undefined ? trainingDone : null,
       dbsCleared !== undefined ? dbsCleared : null,
       referencesDone !== undefined ? referencesDone : null,
       fullyCompliant !== undefined ? fullyCompliant : null,
       readyToStart !== undefined ? readyToStart : null,
       startDate || null,
       req.params.id]
    );
    if (!rows.length) throw new AppError('Not found', 404);
    res.json({ success: true, data: rows[0] } as ApiResponse);
  } catch (err) { next(err); }
});

// DELETE /api/recruitment/:id
router.delete('/:id', param('id').isUUID(), validateRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await query('DELETE FROM recruitment_candidates WHERE id=$1', [req.params.id]);
    res.json({ success: true } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/recruitment/:id/email  — send email to candidate
// body: { type: 'interview_invite'|'application_received'|'reference_request'|'offer_letter'|'rejection'|'custom', ...templateData }
router.post('/:id/email', param('id').isUUID(), body('type').notEmpty(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query<any>('SELECT * FROM recruitment_candidates WHERE id=$1', [req.params.id]);
      if (!rows.length) throw new AppError('Candidate not found', 404);
      const c = rows[0];

      const toEmail: string = req.body.toEmail || c.email;
      if (!toEmail) throw new AppError('No email address for this candidate', 400);

      const { type, subject: customSubject, message } = req.body;
      const contactName = req.body.contactName || 'Recruitment Team';
      const contactEmail = req.body.contactEmail || (process.env.SMTP_USER || '');

      let html = '';
      let subject = '';

      switch (type) {
        case 'interview_invite':
          subject = customSubject || `Interview Invitation — ${c.position}`;
          html = interviewInviteEmail(c, {
            date: req.body.interviewDate || 'TBC',
            time: req.body.interviewTime || 'TBC',
            location: req.body.location || 'Our care home',
            contactName, contactEmail,
          });
          break;
        case 'application_received':
          subject = customSubject || `Application Received — ${c.position}`;
          html = applicationReceivedEmail(c);
          break;
        case 'reference_request':
          subject = customSubject || `Reference Request for ${c.first_name} ${c.last_name}`;
          html = referenceRequestEmail(c, { name: req.body.refereeName || 'Sir/Madam' });
          // Send to referee email if provided
          if (req.body.refereeEmail) {
            const result = await sendEmail({ to: req.body.refereeEmail, subject, html, replyTo: contactEmail, bcc: contactEmail });
            if (!result.ok) throw new AppError(result.error || 'Failed to send email', 500);
            res.json({ success: true, message: `Reference request sent to ${req.body.refereeEmail}` } as ApiResponse);
            return;
          }
          break;
        case 'offer_letter':
          subject = customSubject || `Job Offer — ${c.position}`;
          html = offerLetterEmail(c, {
            startDate: req.body.startDate || '',
            salary: req.body.salary || '',
            contactName, contactEmail,
          });
          break;
        case 'rejection':
          subject = customSubject || `Your Application — ${c.position}`;
          html = rejectionEmail(c);
          break;
        case 'custom':
          subject = customSubject || 'Message from CompCare Hub';
          html = customEmail(c, message ? `<p>${String(message).replace(/\n/g, '<br/>')}</p>` : '');
          break;
        default:
          throw new AppError('Unknown email type', 400);
      }

      const result = await sendEmail({ to: toEmail, subject, html, replyTo: contactEmail, bcc: contactEmail });
      if (!result.ok) throw new AppError(result.error || 'Failed to send email', 500);

      // Log the email in candidate notes
      await query(
        `UPDATE recruitment_candidates SET notes = CONCAT(COALESCE(notes,''), $1::text), updated_at = NOW() WHERE id = $2`,
        [`\n[${new Date().toLocaleDateString('en-GB')}] Email sent: ${type.replace(/_/g,' ')} to ${toEmail}`, req.params.id]
      );

      res.json({ success: true, message: `Email sent to ${toEmail}` } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// GET /api/recruitment/email-configured — check if email is set up
router.get('/email-configured', async (_req: Request, res: Response) => {
  const configured = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
  res.json({ success: true, data: { configured, smtpUser: process.env.SMTP_USER || null } } as ApiResponse);
});

export default router;
