const multer = require('multer');

const storage = multer.memoryStorage();

const imageFilter = (req, file, cb) => {
  if ((file.mimetype || '').startsWith('image/')) return cb(null, true);
  cb(new Error('Only image files are allowed'));
};

module.exports = multer({ storage, fileFilter: imageFilter, limits: { fileSize: 20 * 1024 * 1024 } });
