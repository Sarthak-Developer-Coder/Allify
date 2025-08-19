const multer = require('multer');
const path = require('path');
const fs = require('fs');

const MEDIA_DIR = path.join(__dirname, '..', 'uploads', 'media');
if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) { cb(null, MEDIA_DIR); },
  filename: function (_req, file, cb) {
    // Only images are allowed for snaps; default to .jpg if missing
    const origExt = path.extname(file.originalname);
    const ext = origExt && origExt.length <= 5 ? origExt : '.jpg';
    const base = path.basename(file.originalname, origExt).replace(/[^a-z0-9-_]+/gi, '_').slice(0, 80) || 'snap';
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, `${base}-${unique}${ext}`);
  }
});

const fileFilter = (_req, file, cb) => {
  const ok = (file.mimetype || '').startsWith('image/');
  cb(ok ? null : new Error('Only images are allowed'), ok);
};

module.exports = multer({ storage, fileFilter, limits: { fileSize: 200 * 1024 * 1024 } });
