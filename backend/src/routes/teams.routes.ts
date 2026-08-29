import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';

const router = Router();
router.use(authenticate);

const MANAGE_ROLES = ['home_manager', 'group_admin', 'deputy_manager', 'admin'];

function fromToken(req: Request, field: string): string {
  const token = req.headers.authorization?.substring(7);
  if (token) { const d = jwt.decode(token) as any; return (req.staff as any)?.[field] || d?.[field] || ''; }
  return (req.staff as any)?.[field] || '';
}

// Ensure table exists (idempotent, in case ensureColumns() migration hasn't run yet)
async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS teams (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      leader_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
      created_by UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `, []);
}
router.use(async (_req, _res, next) => {
  try { await ensureTable(); } catch (_) {}
  next();
});

// GET /api/teams?homeId=
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    if (!homeId) return res.json({ success: true, data: [] } as ApiResponse);
    const rows = await query<any>(
      `SELECT t.*, s.first_name || ' ' || s.last_name as leader_name,
              (SELECT COUNT(*) FROM staff m WHERE m.team_id = t.id) as member_count
       FROM teams t
       LEFT JOIN staff s ON s.id = t.leader_staff_id
       WHERE t.home_id = $1
       ORDER BY t.name`,
      [homeId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/teams/:id/members
router.get('/:id/members', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query<any>(
        `SELECT id, first_name, last_name, preferred_name, role, photo_url
         FROM staff WHERE team_id = $1
         ORDER BY last_name, first_name`,
        [req.params.id]
      );
      res.json({ success: true, data: rows } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/teams
router.post('/', requireRole(...MANAGE_ROLES),
  [body('name').notEmpty().trim(), body('leaderStaffId').optional({ checkFalsy: true }).isUUID()],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = req.body.homeId || fromToken(req, 'homeId');
      const createdBy = fromToken(req, 'staffId');
      const { name, leaderStaffId } = req.body;
      if (!homeId) return res.status(400).json({ success: false, error: 'homeId required' } as ApiResponse);
      const rows = await query<any>(
        `INSERT INTO teams (home_id, name, leader_staff_id, created_by)
         VALUES ($1,$2,$3,$4) RETURNING *`,
        [homeId, name, leaderStaffId || null, createdBy || null]
      );
      const team = rows[0];
      if (leaderStaffId) {
        await query('UPDATE staff SET team_id=$1 WHERE id=$2', [team.id, leaderStaffId]);
      }
      res.status(201).json({ success: true, data: team } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// PUT /api/teams/:id
router.put('/:id', requireRole(...MANAGE_ROLES),
  [param('id').isUUID(), body('name').optional({ checkFalsy: true }).trim(),
   body('leaderStaffId').optional({ checkFalsy: true, nullable: true }).isUUID()],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, leaderStaffId } = req.body;
      const rows = await query<any>(
        `UPDATE teams SET
           name = COALESCE($1, name),
           leader_staff_id = CASE WHEN $2::boolean THEN $3::uuid ELSE leader_staff_id END
         WHERE id = $4
         RETURNING *`,
        [name || null, leaderStaffId !== undefined, leaderStaffId || null, req.params.id]
      );
      if (!rows.length) return res.status(404).json({ success: false, error: 'Team not found' } as ApiResponse);
      if (leaderStaffId) {
        await query('UPDATE staff SET team_id=$1 WHERE id=$2', [req.params.id, leaderStaffId]);
      }
      res.json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// DELETE /api/teams/:id
router.delete('/:id', requireRole(...MANAGE_ROLES), param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await query('UPDATE staff SET team_id=NULL WHERE team_id=$1', [req.params.id]);
      await query('DELETE FROM teams WHERE id=$1', [req.params.id]);
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// PUT /api/teams/:id/members/:staffId — assign a staff member to a team
router.put('/:id/members/:staffId', requireRole(...MANAGE_ROLES),
  [param('id').isUUID(), param('staffId').isUUID()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query<any>(
        'UPDATE staff SET team_id=$1 WHERE id=$2 RETURNING id, first_name, last_name, team_id',
        [req.params.id, req.params.staffId]
      );
      if (!rows.length) return res.status(404).json({ success: false, error: 'Staff not found' } as ApiResponse);
      res.json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// DELETE /api/teams/:id/members/:staffId — remove a staff member from a team
router.delete('/:id/members/:staffId', requireRole(...MANAGE_ROLES),
  [param('id').isUUID(), param('staffId').isUUID()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query<any>(
        'UPDATE staff SET team_id=NULL WHERE id=$1 AND team_id=$2 RETURNING id, first_name, last_name',
        [req.params.staffId, req.params.id]
      );
      if (!rows.length) return res.status(404).json({ success: false, error: 'Staff not found in this team' } as ApiResponse);
      res.json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
