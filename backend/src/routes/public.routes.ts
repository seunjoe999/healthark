import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../config/database';
import { ApiResponse } from '../types';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { sendEmail } from '../services/email.service';

const router = Router();

// Application document storage
const appDocsDir = path.join(process.cwd(), 'uploads', 'applications');
if (!fs.existsSync(appDocsDir)) fs.mkdirSync(appDocsDir, { recursive: true });

const appStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, appDocsDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const ALLOWED_APP_EXTS = new Set(['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png']);
const ALLOWED_APP_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
]);

const appUpload = multer({
  storage: appStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_APP_EXTS.has(ext) && ALLOWED_APP_MIMES.has(file.mimetype)) cb(null, true);
    else cb(new Error('Only PDF, Word documents, and images are allowed'));
  },
});

function generateRef(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `CCH-${year}-${rand}`;
}

// POST /api/public/apply — accepts multipart/form-data with optional file uploads
router.post('/apply',
  appUpload.fields([
    { name: 'cv', maxCount: 1 },
    { name: 'certificates', maxCount: 5 },
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { firstName, lastName, email, phone, position, experienceSummary, yearsExperience, rightToWork } = req.body;

      if (!firstName || !lastName || !email || !position) {
        res.status(400).json({ success: false, error: 'firstName, lastName, email, and position are required' });
        return;
      }
      if (!/\S+@\S+\.\S+/.test(email)) {
        res.status(400).json({ success: false, error: 'Invalid email address' });
        return;
      }

      const homes = await query('SELECT id FROM homes LIMIT 1');
      if (!homes.length) { res.status(400).json({ success: false, error: 'No homes configured' }); return; }
      const homeId = homes[0].id;

      let ref = generateRef();
      const existing = await query('SELECT id FROM recruitment_candidates WHERE reference_number = $1', [ref]);
      if (existing.length) ref = generateRef();

      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const cvFile = files?.['cv']?.[0];
      const certFiles = files?.['certificates'] || [];

      const cvUrl = cvFile ? `/uploads/applications/${cvFile.filename}` : null;
      const certUrls = certFiles.map(f => ({
        name: f.originalname,
        url: `/uploads/applications/${f.filename}`,
      }));

      const rows = await query(
        `INSERT INTO recruitment_candidates
          (home_id, first_name, last_name, email, phone, position, applied_date, status, pipeline_stage,
           training_done, dbs_cleared, references_done, fully_compliant, ready_to_start,
           reference_number, experience_summary, years_experience, right_to_work, cv_url, certificates_urls)
         VALUES ($1,$2,$3,$4,$5,$6,CURRENT_DATE,'applied','applied',false,false,false,false,false,
                 $7,$8,$9,$10,$11,$12)
         RETURNING *`,
        [homeId, firstName, lastName, email, phone || null, position,
         ref, experienceSummary || null, yearsExperience || null,
         rightToWork !== 'false' && rightToWork !== false,
         cvUrl, JSON.stringify(certUrls)]
      );

      res.status(201).json({ success: true, data: { referenceNumber: ref, candidate: rows[0] } } as ApiResponse);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/public/apply/:ref — applicant checks their own status
router.get('/apply/:ref',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ref = req.params.ref.toUpperCase();
      const rows = await query(
        `SELECT reference_number, first_name, position, pipeline_stage, status, applied_date, interview_date
         FROM recruitment_candidates WHERE reference_number = $1`,
        [ref]
      );
      if (!rows.length) { res.status(404).json({ success: false, error: 'Reference not found' }); return; }

      const stageLabels: Record<string, string> = {
        applied: 'Application Received',
        screening: 'CV Under Review',
        interview: 'Interview Scheduled',
        offer: 'Offer Made',
        hired: 'Hired',
        rejected: 'Unsuccessful',
      };

      const r = rows[0] as any;
      res.json({
        success: true,
        data: {
          referenceNumber: r.reference_number,
          firstName: r.first_name,
          position: r.position,
          stage: r.pipeline_stage,
          stageLabel: stageLabels[r.pipeline_stage] || r.pipeline_stage,
          appliedDate: r.applied_date,
          interviewDate: r.interview_date || null,
        }
      } as ApiResponse);
    } catch (err) {
      next(err);
    }
  }
);

// ── Notification helpers ──────────────────────────────────────────────────────

const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER || '';

function wrap(body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:0}
    .card{background:#fff;max-width:620px;margin:32px auto;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)}
    .header{background:#7c42b4;padding:28px 32px}
    .header h1{color:#fff;margin:0;font-size:20px;font-weight:700}
    .header p{color:#e9d5ff;margin:4px 0 0;font-size:13px}
    .body{padding:32px}
    .body p{color:#374151;line-height:1.6;margin:0 0 14px}
    .row{display:flex;gap:8px;margin-bottom:10px}
    .label{font-weight:700;color:#5a2d8a;min-width:160px;font-size:13px}
    .value{color:#374151;font-size:13px}
    .footer{background:#f1f5f9;padding:20px 32px;font-size:12px;color:#94a3b8;text-align:center}
  </style></head><body><div class="card">
    <div class="header"><h1>Comprehensive Care</h1><p>Website Notification</p></div>
    <div class="body">${body}</div>
    <div class="footer">Comprehensive Care Ltd · compcarehub.onrender.com</div>
  </div></body></html>`;
}

// POST /api/public/referral ─────────────────────────────────────────────────
router.post('/referral', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      referrerName, referrerOrg, referrerPhone, referrerEmail,
      personName, dob, nhsNumber, address, personPhone,
      nextOfKin, emergencyContact, referralDetails, fileName,
    } = req.body;

    if (!referrerName || !personName) {
      res.status(400).json({ success: false, error: 'referrerName and personName are required' });
      return;
    }

    // Notify company
    if (NOTIFY_EMAIL) {
      const rows = [
        ['Referrer Name', referrerName],
        ['Referrer Organisation', referrerOrg || '—'],
        ['Referrer Phone', referrerPhone || '—'],
        ['Referrer Email', referrerEmail || '—'],
        ['Person Being Referred', personName],
        ['Date of Birth', dob || '—'],
        ['NHS Number', nhsNumber || '—'],
        ['Address', address || '—'],
        ['Person Phone', personPhone || '—'],
        ['Next of Kin', nextOfKin || '—'],
        ['Emergency Contact', emergencyContact || '—'],
        ['Attached File', fileName || 'None'],
      ].map(([l, v]) => `<div class="row"><span class="label">${l}</span><span class="value">${v}</span></div>`).join('');

      await sendEmail({
        to: NOTIFY_EMAIL,
        subject: `New Referral: ${personName}`,
        html: wrap(`
          <p><strong>A new referral has been submitted via the website.</strong></p>
          ${rows}
          ${referralDetails ? `<p><strong>Referral Details:</strong><br/>${referralDetails.replace(/\n/g, '<br/>')}</p>` : ''}
        `),
      });
    }

    // Confirmation to referrer
    if (referrerEmail) {
      await sendEmail({
        to: referrerEmail,
        subject: 'Referral Received — Comprehensive Care',
        html: wrap(`
          <p>Dear ${referrerName},</p>
          <p>Thank you for submitting a referral for <strong>${personName}</strong>. We have received your referral and our team will review it promptly.</p>
          <p>We aim to respond to all referrals within <strong>2 working days</strong>. If your referral is urgent, please contact us directly on <strong>0161 123 4567</strong>.</p>
          <p>Kind regards,<br/><strong>The Referrals Team</strong><br/>Comprehensive Care Ltd</p>
        `),
      });
    }

    res.status(201).json({ success: true, data: { message: 'Referral submitted successfully' } } as ApiResponse);
  } catch (err) {
    next(err);
  }
});

// POST /api/public/job-application ────────────────────────────────────────────
router.post('/job-application', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { firstName, lastName, phone, email, description } = req.body;

    if (!firstName || !lastName || !email) {
      res.status(400).json({ success: false, error: 'firstName, lastName, and email are required' });
      return;
    }

    // Notify company
    if (NOTIFY_EMAIL) {
      const rows = [
        ['Name', `${firstName} ${lastName}`],
        ['Email', email],
        ['Phone', phone || '—'],
      ].map(([l, v]) => `<div class="row"><span class="label">${l}</span><span class="value">${v}</span></div>`).join('');

      await sendEmail({
        to: NOTIFY_EMAIL,
        subject: `New Job Application: ${firstName} ${lastName}`,
        html: wrap(`
          <p><strong>A new job application has been submitted via the website.</strong></p>
          ${rows}
          ${description ? `<p><strong>About the Applicant:</strong><br/>${description.replace(/\n/g, '<br/>')}</p>` : ''}
        `),
      });
    }

    // Confirmation to applicant
    if (email) {
      await sendEmail({
        to: email,
        subject: 'Application Received — Comprehensive Care',
        html: wrap(`
          <p>Dear ${firstName},</p>
          <p>Thank you for your interest in joining <strong>Comprehensive Care Ltd</strong>. We have received your application and a member of our recruitment team will be in touch within <strong>5–7 working days</strong>.</p>
          <p>In the meantime, if you have any questions please don't hesitate to contact us.</p>
          <p>Kind regards,<br/><strong>The Recruitment Team</strong><br/>Comprehensive Care Ltd</p>
        `),
      });
    }

    res.status(201).json({ success: true, data: { message: 'Application submitted successfully' } } as ApiResponse);
  } catch (err) {
    next(err);
  }
});

export default router;
