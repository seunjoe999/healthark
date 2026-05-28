import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { ApiResponse } from '../types';

const router = Router();

// POST /api/public/apply
router.post('/apply',
  [
    body('firstName').notEmpty(),
    body('lastName').notEmpty(),
    body('position').notEmpty()
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { firstName, lastName, email, phone, position } = req.body;
      
      // We need to attach this to a home. For simplicity, we can fetch the first home.
      const homes = await query('SELECT id FROM homes LIMIT 1');
      if (!homes.length) return res.status(400).json({ success: false, error: 'No homes configured' });
      const homeId = homes[0].id;

      const rows = await query(
        `INSERT INTO recruitment_candidates 
          (home_id, first_name, last_name, email, phone, position, applied_date, status, pipeline_stage, training_done, dbs_cleared, references_done, fully_compliant, ready_to_start)
         VALUES ($1,$2,$3,$4,$5,$6,CURRENT_DATE,'applied','applied',false,false,false,false,false) RETURNING *`,
        [homeId, firstName, lastName, email || null, phone || null, position]
      );

      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
