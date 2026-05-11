import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();
router.use(authenticate);

function fromToken(req: Request, field: string): string {
  const token = req.headers.authorization?.substring(7);
  if (token) { const d = jwt.decode(token) as any; return (req.staff as any)?.[field] || d?.[field] || ''; }
  return (req.staff as any)?.[field] || '';
}

// File upload setup
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('File type not allowed'));
  },
});

// GET /api/documents/su/:suId
router.get('/su/:suId', param('suId').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query(
        `SELECT sd.*, s.first_name || ' ' || s.last_name as uploaded_by_name
         FROM su_documents sd LEFT JOIN staff s ON s.id = sd.uploaded_by
         WHERE sd.su_id = $1 ORDER BY sd.created_at DESC`,
        [req.params.suId]
      );
      res.json({ success: true, data: rows } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/documents/su/:suId
router.post('/su/:suId', param('suId').isUUID(), validateRequest,
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw new AppError('No file uploaded', 400);
      const staffId = fromToken(req, 'staffId');
      const homeId = fromToken(req, 'homeId');
      const { documentType, title, notes, expiryDate } = req.body;
      const fileUrl = `/uploads/${req.file.filename}`;

      const rows = await query(
        `INSERT INTO su_documents (su_id, home_id, uploaded_by, document_type, title,
          file_url, file_name, file_size, mime_type, notes, expiry_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [req.params.suId, homeId, staffId, documentType || 'other', title || req.file.originalname,
         fileUrl, req.file.originalname, req.file.size, req.file.mimetype,
         notes || null, expiryDate || null]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// DELETE /api/documents/su/:suId/:docId
router.delete('/su/:suId/:docId',
  [param('suId').isUUID(), param('docId').isUUID()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query<{ file_url: string }>(
        'SELECT file_url FROM su_documents WHERE id = $1 AND su_id = $2',
        [req.params.docId, req.params.suId]
      );
      if (!rows.length) throw new AppError('Document not found', 404);
      // Delete file from disk
      const filePath = path.join(process.cwd(), rows[0].file_url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      await query('DELETE FROM su_documents WHERE id = $1', [req.params.docId]);
      res.json({ success: true, message: 'Document deleted' } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// GET /api/documents/staff/:staffId
router.get('/staff/:staffId', param('staffId').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query(
        `SELECT sd.*, s.first_name || ' ' || s.last_name as uploaded_by_name
         FROM staff_documents sd LEFT JOIN staff s ON s.id = sd.uploaded_by
         WHERE sd.staff_id = $1 ORDER BY sd.created_at DESC`,
        [req.params.staffId]
      );
      res.json({ success: true, data: rows } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/documents/staff/:staffId
router.post('/staff/:staffId', param('staffId').isUUID(), validateRequest,
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw new AppError('No file uploaded', 400);
      const staffId = fromToken(req, 'staffId');
      const { documentType, title, notes, expiryDate } = req.body;
      const fileUrl = `/uploads/${req.file.filename}`;
      const rows = await query(
        `INSERT INTO staff_documents (staff_id, uploaded_by, document_type, title,
          file_url, file_name, file_size, mime_type, notes, expiry_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [req.params.staffId, staffId, documentType || 'other', title || req.file.originalname,
         fileUrl, req.file.originalname, req.file.size, req.file.mimetype,
         notes || null, expiryDate || null]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// DELETE /api/documents/staff/:staffId/:docId
router.delete('/staff/:staffId/:docId',
  [param('staffId').isUUID(), param('docId').isUUID()], validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query<{ file_url: string }>(
        'SELECT file_url FROM staff_documents WHERE id = $1 AND staff_id = $2',
        [req.params.docId, req.params.staffId]
      );
      if (!rows.length) throw new AppError('Document not found', 404);
      const filePath = path.join(process.cwd(), rows[0].file_url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      await query('DELETE FROM staff_documents WHERE id = $1', [req.params.docId]);
      res.json({ success: true, message: 'Document deleted' } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
