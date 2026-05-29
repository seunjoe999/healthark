import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../config/database';
import { ApiResponse } from '../types';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

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

const appUpload = multer({
  storage: appStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
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

export default router;
