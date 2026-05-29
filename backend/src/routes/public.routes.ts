import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { ApiResponse } from '../types';

const router = Router();

function generateRef(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `CCH-${year}-${rand}`;
}

// POST /api/public/apply
router.post('/apply',
  [
    body('firstName').notEmpty(),
    body('lastName').notEmpty(),
    body('position').notEmpty(),
    body('email').isEmail(),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { firstName, lastName, email, phone, position, experienceSummary, yearsExperience, rightToWork } = req.body;

      const homes = await query('SELECT id FROM homes LIMIT 1');
      if (!homes.length) return res.status(400).json({ success: false, error: 'No homes configured' });
      const homeId = homes[0].id;

      let ref = generateRef();
      // ensure uniqueness (retry once on collision)
      const existing = await query('SELECT id FROM recruitment_candidates WHERE reference_number = $1', [ref]);
      if (existing.length) ref = generateRef();

      const rows = await query(
        `INSERT INTO recruitment_candidates
          (home_id, first_name, last_name, email, phone, position, applied_date, status, pipeline_stage,
           training_done, dbs_cleared, references_done, fully_compliant, ready_to_start,
           reference_number, experience_summary, years_experience, right_to_work)
         VALUES ($1,$2,$3,$4,$5,$6,CURRENT_DATE,'applied','applied',false,false,false,false,false,$7,$8,$9,$10)
         RETURNING *`,
        [homeId, firstName, lastName, email, phone || null, position,
         ref, experienceSummary || null, yearsExperience || null, rightToWork !== false]
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
      if (!rows.length) return res.status(404).json({ success: false, error: 'Reference not found' });

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
