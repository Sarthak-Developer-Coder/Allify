const multer = require('multer');
const path = require('path');
const fs = require('fs');

const MUSIC_DIR = path.join(__dirname, '..', 'uploads', 'music');
if (!fs.existsSync(MUSIC_DIR)) fs.mkdirSync(MUSIC_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, MUSIC_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || (file.fieldname === 'cover' ? '.jpg' : '.mp3');
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9-_]+/gi, '_').slice(0, 80) || file.fieldname;
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, `${base}-${unique}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'file' && (file.mimetype || '').startsWith('audio/')) return cb(null, true);
  if (file.fieldname === 'cover' && (file.mimetype || '').startsWith('image/')) return cb(null, true);
  cb(new Error('Unexpected field'));
};

module.exports = multer({ storage, fileFilter, limits: { fileSize: 200 * 1024 * 1024 } });
