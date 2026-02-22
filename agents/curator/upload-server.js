import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { join } from 'node:path';
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';

const UPLOAD_DIR = '/root/unicorn-sovereign/vault/originals';
const UPLOAD_PASSWORD = process.env.UPLOAD_PASSWORD || 'unicorn2026';
const PORT = 3333;

const app = express();
app.use(express.json());

// Ensure upload directory exists
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

// ─── MULTER CONFIG ───────────────────────────────────────

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${timestamp}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  },
});

// ─── AUTH MIDDLEWARE ──────────────────────────────────────

function auth(req, res, next) {
  const pw = req.headers['x-upload-password'] || req.body?.password || req.query?.password;
  if (pw === UPLOAD_PASSWORD) return next();
  res.status(401).json({ error: 'Invalid password' });
}

// ─── UPLOAD ENDPOINT ─────────────────────────────────────

app.post('/api/upload', auth, upload.array('photos', 100), async (req, res) => {
  const results = [];

  for (const file of (req.files || [])) {
    try {
      // Convert HEIC/HEIF to JPEG
      if (file.mimetype === 'image/heic' || file.mimetype === 'image/heif') {
        const jpegPath = file.path.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg');
        await sharp(file.path).jpeg({ quality: 90 }).toFile(jpegPath);
        unlinkSync(file.path);
        results.push({ name: file.originalname, status: 'ok', converted: 'heic\u2192jpg' });
      } else {
        results.push({ name: file.originalname, status: 'ok' });
      }
    } catch (err) {
      results.push({ name: file.originalname, status: 'error', error: err.message });
    }
  }

  // Save batch metadata if note or brand provided
  const brandHint = req.body?.brand || 'auto';
  const note = req.body?.note || '';
  if (note || brandHint !== 'auto') {
    const metaPath = join(UPLOAD_DIR, `batch-${Date.now()}-meta.json`);
    writeFileSync(metaPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      brand_hint: brandHint,
      note,
      files: (req.files || []).map(f => f.filename),
    }, null, 2));
  }

  res.json({
    uploaded: results.filter(r => r.status === 'ok').length,
    errors: results.filter(r => r.status === 'error').length,
    results,
  });
});

// ─── STATUS ENDPOINT ─────────────────────────────────────

app.get('/api/status', auth, (_req, res) => {
  const imageFilter = /\.(jpg|jpeg|png|webp)$/i;

  const files = readdirSync(UPLOAD_DIR)
    .filter(f => imageFilter.test(f))
    .map(f => {
      const s = statSync(join(UPLOAD_DIR, f));
      return { name: f, size: s.size, uploaded: s.mtime };
    })
    .sort((a, b) => b.uploaded - a.uploaded)
    .slice(0, 20);

  const today = new Date().toISOString().slice(0, 10);
  const allImages = readdirSync(UPLOAD_DIR).filter(f => imageFilter.test(f));
  const todayCount = allImages.filter(f => {
    const mtime = statSync(join(UPLOAD_DIR, f)).mtime;
    return mtime.toISOString().slice(0, 10) === today;
  }).length;

  res.json({ todayCount, totalCount: allImages.length, recentFiles: files });
});

// ─── SERVE UPLOAD PAGE ───────────────────────────────────

app.use('/upload', express.static('/root/unicorn-sovereign/public/upload'));

// ─── SERVE THUMBNAIL PREVIEWS ────────────────────────────
// Serves images from vault/originals/ for the thumbnail grid

app.use('/media-upload', express.static(UPLOAD_DIR));

// ─── START ───────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[upload-server] Running on port ${PORT}`);
  console.log(`[upload-server] Upload dir: ${UPLOAD_DIR}`);
  console.log(`[upload-server] Password: ${UPLOAD_PASSWORD.slice(0, 3)}***`);
});
