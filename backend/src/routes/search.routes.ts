import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { query } from '../config/database';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';

const router = Router();
router.use(authenticate);

function fromToken(req: Request, field: string): string {
  const token = req.headers.authorization?.substring(7);
  if (token) { const d = jwt.decode(token) as any; return d?.[field] || ''; }
  return '';
}

// GET /api/search?q=...&homeId=...
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = `%${(req.query.q as string || '').toLowerCase()}%`;
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');

    const [residents, staff, carePlans] = await Promise.all([
      query(
        `SELECT id, first_name, last_name, status, date_of_birth, photo_url
         FROM service_users
         WHERE home_id=$1 AND (LOWER(first_name)||' '||LOWER(last_name)) LIKE $2
         LIMIT 10`,
        [homeId, q]
      ),
      query(
        `SELECT id, first_name, last_name, role, status, photo_url
         FROM staff
         WHERE home_id=$1 AND is_active=true AND (LOWER(first_name)||' '||LOWER(last_name)) LIKE $2
         LIMIT 10`,
        [homeId, q]
      ),
      query(
        `SELECT cp.id, cp.plan_type, cp.custom_name, su.first_name||' '||su.last_name as su_name
         FROM care_plans cp JOIN service_users su ON su.id=cp.su_id
         WHERE cp.home_id=$1 AND (LOWER(cp.plan_type) LIKE $2 OR LOWER(COALESCE(cp.custom_name,'')) LIKE $2
           OR LOWER(su.first_name||' '||su.last_name) LIKE $2)
         AND cp.is_active=true LIMIT 10`,
        [homeId, q]
      ),
    ]);

    res.json({ success: true, data: { residents, staff, carePlans } } as ApiResponse);
  } catch (err) { next(err); }
});

export default router;
