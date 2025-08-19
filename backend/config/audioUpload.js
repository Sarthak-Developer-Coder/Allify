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
    const ext = path.extname(file.originalname) || '.mp3';
    const name = path.basename(file.originalname, ext).replace(/[^a-z0-9-_]+/gi, '_').slice(0, 80);
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, `${name}-${unique}${ext}`);
  }
});

const audioFilter = (req, file, cb) => {
  if ((file.mimetype || '').startsWith('audio/')) return cb(null, true);
  cb(new Error('Only audio files are allowed'));
};

module.exports = multer({ storage, fileFilter: audioFilter, limits: { fileSize: 200 * 1024 * 1024 } });
