import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
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

const MANDATORY_TRAINING = [
  { label: 'Manual Handling',      keyword: 'manual handling' },
  { label: 'Fire Safety',          keyword: 'fire safety' },
  { label: 'First Aid',            keyword: 'first aid' },
  { label: 'Safeguarding',         keyword: 'safeguarding' },
  { label: 'Food Hygiene',         keyword: 'food hygiene' },
  { label: 'Infection Control',    keyword: 'infection control' },
  { label: 'MCA/DoLS',             keyword: 'mental capacity' },
  { label: 'Medication',           keyword: 'medication' },
  { label: 'Dementia Care',        keyword: 'dementia' },
];

// GET /api/training-matrix?homeId=
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const today = new Date();
    const in30Days = new Date(today);
    in30Days.setDate(in30Days.getDate() + 30);

    // Get all active staff for the home
    const staffRows = await query(
      `SELECT id, first_name || ' ' || last_name AS name, role
       FROM staff
       WHERE home_id = $1 AND is_active = TRUE
       ORDER BY first_name, last_name`,
      [homeId]
    );

    // Get all relevant training records for those staff
    const staffIds = staffRows.map((s: any) => s.id);
    if (staffIds.length === 0) {
      return res.json({
        success: true,
        data: { staff: [], trainingTypes: MANDATORY_TRAINING.map(t => t.label), matrix: {} },
      } as ApiResponse);
    }

    // Build OR conditions for training name matching
    const conditions = MANDATORY_TRAINING.map(
      (_, i) => `LOWER(t.training_name) LIKE $${i + 2}`
    ).join(' OR ');

    const params: any[] = [homeId, ...MANDATORY_TRAINING.map(t => `%${t.keyword}%`)];

    const trainingRows = await query(
      `SELECT t.staff_id, t.training_name, t.expiry_date, t.completion_date
       FROM staff_training t
       WHERE t.home_id = $1 AND (${conditions})
       ORDER BY t.expiry_date DESC NULLS LAST`,
      params
    );

    // Build matrix: staffId -> trainingLabel -> status
    const matrix: Record<string, Record<string, { status: string; expiry_date: string | null }>> = {};

    for (const s of staffRows as any[]) {
      matrix[s.id] = {};
      for (const t of MANDATORY_TRAINING) {
        matrix[s.id][t.label] = { status: 'missing', expiry_date: null };
      }
    }

    for (const row of trainingRows as any[]) {
      const staffId = row.staff_id;
      if (!matrix[staffId]) continue;

      for (const t of MANDATORY_TRAINING) {
        if (!row.training_name || !String(row.training_name).toLowerCase().includes(t.keyword)) continue;

        const current = matrix[staffId][t.label];
        const expiryDate = row.expiry_date ? new Date(row.expiry_date) : null;
        let status: string;

        if (!expiryDate) {
          status = row.completion_date ? 'current' : 'missing';
        } else if (expiryDate < today) {
          status = 'expired';
        } else if (expiryDate <= in30Days) {
          status = 'expiring';
        } else {
          status = 'current';
        }

        const priority: Record<string, number> = { current: 3, expiring: 2, expired: 1, missing: 0 };
        if (priority[status] > priority[current.status]) {
          matrix[staffId][t.label] = {
            status,
            expiry_date: expiryDate ? expiryDate.toISOString().split('T')[0] : null,
          };
        }
      }
    }

    res.json({
      success: true,
      data: {
        staff: staffRows,
        trainingTypes: MANDATORY_TRAINING.map(t => t.label),
        matrix,
      },
    } as ApiResponse);
  } catch (err) { next(err); }
});

export default router;
