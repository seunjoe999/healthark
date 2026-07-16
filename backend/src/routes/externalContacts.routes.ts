import { Router } from 'express';
import { query } from '../config/database';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

const init = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS external_contacts (
      id SERIAL PRIMARY KEY,
      home_id INTEGER NOT NULL,
      name VARCHAR(200) NOT NULL,
      organisation VARCHAR(200),
      role VARCHAR(100) NOT NULL,
      category VARCHAR(50) NOT NULL DEFAULT 'professional',
      phone VARCHAR(50),
      email VARCHAR(200),
      address TEXT,
      notes TEXT,
      is_active BOOLEAN DEFAULT true,
      created_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
};
init().catch(() => {});

// GET all contacts
router.get('/', async (req: any, res) => {
  try {
    const { category, search } = req.query;
    let sql = `SELECT * FROM external_contacts WHERE home_id = $1 AND is_active = true`;
    const params: any[] = [req.user.homeId];
    if (category) { params.push(category); sql += ` AND category = $${params.length}`; }
    if (search) { params.push(`%${search}%`); sql += ` AND (name ILIKE $${params.length} OR organisation ILIKE $${params.length} OR role ILIKE $${params.length})`; }
    sql += ' ORDER BY category, name';
    const rows = await query(sql, params);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST create
router.post('/', async (req: any, res) => {
  try {
    const { name, organisation, role, category, phone, email, address, notes } = req.body;
    const rows = await query(
      `INSERT INTO external_contacts (home_id, name, organisation, role, category, phone, email, address, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [req.user.homeId, name, organisation, role, category || 'professional', phone, email, address, notes, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update
router.put('/:id', async (req: any, res) => {
  try {
    const { name, organisation, role, category, phone, email, address, notes, is_active } = req.body;
    const rows = await query(
      `UPDATE external_contacts SET name=$1, organisation=$2, role=$3, category=$4, phone=$5, email=$6,
       address=$7, notes=$8, is_active=$9, updated_at=NOW()
       WHERE id=$10 AND home_id=$11 RETURNING *`,
      [name, organisation, role, category, phone, email, address, notes, is_active ?? true, req.params.id, req.user.homeId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE (soft delete)
router.delete('/:id', async (req: any, res) => {
  try {
    await query(`UPDATE external_contacts SET is_active=false WHERE id=$1 AND home_id=$2`, [req.params.id, req.user.homeId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
