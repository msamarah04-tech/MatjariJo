import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { mkdirSync, readFileSync, unlinkSync } from 'fs';
import { authenticate } from '../auth.js';
import { asyncRoute } from '../http.js';
import { badRequest } from '../errors.js';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'ticket-attachments');
mkdirSync(UPLOAD_DIR, { recursive: true });

// Extension is always derived from the server-validated MIME — never from the
// client-supplied filename, which can be spoofed.
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

const ALLOWED_MIME = new Set(Object.keys(MIME_TO_EXT));

// Magic-byte signatures for each allowed MIME type.
// Returns true when the buffer starts with at least one of the given signatures.
function checkMagicBytes(buf: Buffer, mime: string): boolean {
  if (mime === 'image/jpeg' || mime === 'image/jpg') {
    return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  }
  if (mime === 'image/png') {
    return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  }
  if (mime === 'image/gif') {
    const sig = buf.slice(0, 6).toString('ascii');
    return sig === 'GIF87a' || sig === 'GIF89a';
  }
  if (mime === 'image/webp') {
    // RIFF????WEBP
    return (
      buf.slice(0, 4).toString('ascii') === 'RIFF' &&
      buf.slice(8, 12).toString('ascii') === 'WEBP'
    );
  }
  if (mime === 'application/pdf') {
    return buf.slice(0, 4).toString('ascii') === '%PDF';
  }
  return false;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = MIME_TO_EXT[file.mimetype] ?? '.bin';
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`;
    cb(null, safeName);
  },
});

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

  // Verify magic bytes match the declared MIME — reject spoofed uploads.
  const filePath = req.file.path;
  let header: Buffer;
  try {
    header = readFileSync(filePath).slice(0, 12);
  } catch {
    throw badRequest('Could not read uploaded file.');
  }
  if (!checkMagicBytes(header, req.file.mimetype)) {
    try { unlinkSync(filePath); } catch { /* best-effort cleanup */ }
    throw badRequest('File content does not match its declared type.');
  }

  const url = `/uploads/ticket-attachments/${req.file.filename}`;
  res.status(201).json({ url });
}));
