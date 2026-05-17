import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
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

// Initialise tables on first load
(async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS medication_stock (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        home_id UUID NOT NULL REFERENCES homes(id),
        su_id UUID REFERENCES service_users(id),
        medication_name VARCHAR(255) NOT NULL,
        form VARCHAR(50),
        strength VARCHAR(100),
        quantity_remaining DECIMAL(10,2) NOT NULL DEFAULT 0,
        unit VARCHAR(50) DEFAULT 'tablets',
        expiry_date DATE,
        reorder_threshold DECIMAL(10,2) DEFAULT 7,
        batch_number VARCHAR(100),
        supplier VARCHAR(255),
        last_updated_by UUID REFERENCES staff(id),
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `, []);
    await query(`
      CREATE TABLE IF NOT EXISTS medication_stock_log (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        stock_id UUID NOT NULL REFERENCES medication_stock(id) ON DELETE CASCADE,
        adjusted_by UUID REFERENCES staff(id),
        adjustment_type VARCHAR(50),
        quantity_change DECIMAL(10,2),
        quantity_before DECIMAL(10,2),
        quantity_after DECIMAL(10,2),
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `, []);
  } catch (err) {
    // Tables may already exist — non-fatal
    console.warn('medication_stock table init warning:', err);
  }
})();

// GET /api/medication-stock?homeId=&suId=
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const suId = req.query.suId as string | undefined;

    const params: any[] = [homeId];
    let suFilter = '';
    if (suId) {
      params.push(suId);
      suFilter = `AND ms.su_id = $${params.length}`;
    }

    const rows = await query(
      `SELECT ms.*,
              su.first_name || ' ' || su.last_name AS su_name,
              s.first_name || ' ' || s.last_name AS updated_by_name,
              ms.quantity_remaining <= ms.reorder_threshold AS low_stock,
              ms.expiry_date IS NOT NULL AND ms.expiry_date < CURRENT_DATE AS expired,
              ms.expiry_date IS NOT NULL AND ms.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '14 days' AS expiring_soon
       FROM medication_stock ms
       LEFT JOIN service_users su ON su.id = ms.su_id
       LEFT JOIN staff s ON s.id = ms.last_updated_by
       WHERE ms.home_id = $1 ${suFilter}
       ORDER BY ms.medication_name`,
      params
    );

    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/medication-stock
router.post('/',
  [body('medicationName').notEmpty(), body('homeId').optional()],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = req.body.homeId || fromToken(req, 'homeId');
      const staffId = fromToken(req, 'staffId');
      const {
        suId, medicationName, form, strength,
        quantityRemaining, unit, expiryDate,
        reorderThreshold, batchNumber, supplier, notes,
      } = req.body;

      const rows = await query(
        `INSERT INTO medication_stock
           (home_id, su_id, medication_name, form, strength, quantity_remaining,
            unit, expiry_date, reorder_threshold, batch_number, supplier,
            last_updated_by, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING *`,
        [
          homeId, suId || null, medicationName, form || null, strength || null,
          quantityRemaining ?? 0, unit || 'tablets',
          expiryDate || null, reorderThreshold ?? 7,
          batchNumber || null, supplier || null, staffId || null, notes || null,
        ]
      );

      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// PUT /api/medication-stock/:id
router.put('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      const {
        suId, medicationName, form, strength,
        quantityRemaining, unit, expiryDate,
        reorderThreshold, batchNumber, supplier, notes,
      } = req.body;

      const rows = await query(
        `UPDATE medication_stock SET
           su_id = COALESCE($1, su_id),
           medication_name = COALESCE($2, medication_name),
           form = COALESCE($3, form),
           strength = COALESCE($4, strength),
           quantity_remaining = COALESCE($5, quantity_remaining),
           unit = COALESCE($6, unit),
           expiry_date = COALESCE($7, expiry_date),
           reorder_threshold = COALESCE($8, reorder_threshold),
           batch_number = COALESCE($9, batch_number),
           supplier = COALESCE($10, supplier),
           notes = COALESCE($11, notes),
           last_updated_by = $12,
           updated_at = NOW()
         WHERE id = $13
         RETURNING *`,
        [
          suId || null, medicationName || null, form || null, strength || null,
          quantityRemaining ?? null, unit || null, expiryDate || null,
          reorderThreshold ?? null, batchNumber || null, supplier || null,
          notes || null, staffId || null, req.params.id,
        ]
      );

      if (!rows.length) {
        res.status(404).json({ success: false, message: 'Stock record not found' } as ApiResponse);
        return;
      }
      res.json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// DELETE /api/medication-stock/:id
router.delete('/:id', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await query('DELETE FROM medication_stock WHERE id = $1', [req.params.id]);
      res.json({ success: true, message: 'Medication stock deleted' } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/medication-stock/:id/adjust
router.post('/:id/adjust',
  param('id').isUUID(),
  body('adjustmentType').isIn(['administered', 'disposed', 'received', 'correction']),
  body('quantityChange').isNumeric(),
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      const { adjustmentType, quantityChange, notes } = req.body;
      const change = parseFloat(quantityChange);

      // Fetch current quantity
      const existing = await query<{ quantity_remaining: string }>(
        'SELECT quantity_remaining FROM medication_stock WHERE id = $1',
        [req.params.id]
      );

      if (!existing.length) {
        res.status(404).json({ success: false, message: 'Stock record not found' } as ApiResponse);
        return;
      }

      const before = parseFloat(existing[0].quantity_remaining);
      const after = Math.max(0, before + change);

      // Update stock
      await query(
        'UPDATE medication_stock SET quantity_remaining = $1, last_updated_by = $2, updated_at = NOW() WHERE id = $3',
        [after, staffId || null, req.params.id]
      );

      // Insert log
      await query(
        `INSERT INTO medication_stock_log
           (stock_id, adjusted_by, adjustment_type, quantity_change, quantity_before, quantity_after, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [req.params.id, staffId || null, adjustmentType, change, before, after, notes || null]
      );

      res.json({ success: true, data: { quantityBefore: before, quantityAfter: after } } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
