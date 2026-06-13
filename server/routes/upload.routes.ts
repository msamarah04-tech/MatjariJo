import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { mkdirSync } from 'fs';
import { authenticate } from '../auth.js';
import { asyncRoute } from '../http.js';
import { badRequest } from '../errors.js';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'ticket-attachments');
mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`;
    cb(null, safeName);
  },
});

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
]);

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only images (JPEG, PNG, GIF, WebP) and PDFs are allowed.'));
    }
  },
});

export const uploadRouter = Router();

uploadRouter.post('/uploads/ticket-attachment', authenticate, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return next(badRequest(err.code === 'LIMIT_FILE_SIZE' ? 'File is too large. Maximum size is 5 MB.' : err.message));
    }
    if (err) return next(badRequest((err as Error).message));
    next();
  });
}, asyncRoute(async (req, res) => {
  if (!req.file) throw badRequest('No file uploaded.');
  const url = `/uploads/ticket-attachments/${req.file.filename}`;
  res.status(201).json({ url });
}));
