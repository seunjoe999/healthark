import { Router, Request, Response, NextFunction } from 'express';
import { param } from 'express-validator';
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

function nd(v: any): string | null { return v && String(v).trim() ? String(v).trim() : null; }

router.use(authenticate);

function fromToken(req: Request, field: string): string {
  const token = req.headers.authorization?.substring(7);
  if (token) { const d = jwt.decode(token) as any; return d?.[field] || ''; }
  return '';
}

const uploadDir = path.join(process.cwd(), 'uploads', 'photos');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const docsDir = path.join(process.cwd(), 'uploads', 'docs');
if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

const photoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});
const storage = photoStorage;

const docStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, docsDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only image files allowed'));
  },
});

const docUpload = multer({
  storage: docStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.jpg', '.jpeg', '.png'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('File type not allowed'));
  },
});

// POST /api/upload/staff-photo/:staffId
router.post('/staff-photo/:staffId', param('staffId').isUUID(), validateRequest,
  upload.single('photo'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw new AppError('No file uploaded', 400);
      const photoUrl = `/uploads/photos/${req.file.filename}`;
      await query('UPDATE staff SET photo_url=$1 WHERE id=$2', [photoUrl, req.params.staffId]);
      res.json({ success: true, data: { photoUrl } } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/upload/su-photo/:suId
router.post('/su-photo/:suId', param('suId').isUUID(), validateRequest,
  upload.single('photo'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw new AppError('No file uploaded', 400);
      const photoUrl = `/uploads/photos/${req.file.filename}`;
      await query('UPDATE service_users SET photo_url=$1 WHERE id=$2', [photoUrl, req.params.suId]);
      res.json({ success: true, data: { photoUrl } } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/upload/policy-doc/:policyId — upload a file attachment for a policy
router.post('/policy-doc/:policyId', param('policyId').isUUID(), validateRequest,
  docUpload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw new AppError('No file uploaded', 400);
      const staffId = fromToken(req, 'staffId');
      const fileUrl = `/uploads/docs/${req.file.filename}`;
      const rows = await query(
        `INSERT INTO policy_attachments (policy_id, file_name, file_url, mime_type, uploaded_by)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [req.params.policyId, req.file.originalname, fileUrl, req.file.mimetype, staffId || null]
      );
      res.json({ success: true, data: { fileUrl, attachment: rows[0] } } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
