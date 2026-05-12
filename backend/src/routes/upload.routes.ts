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

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
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

export default router;
