const fs = require('fs');
const path = require('path');
const multer = require('multer');

const ensureUploadDir = (folder) => {
  const uploadDir = path.join(__dirname, `../../uploads/${folder}`);
  fs.mkdirSync(uploadDir, { recursive: true });
  return uploadDir;
};

const createStorage = (folder) => multer.diskStorage({
  destination: (req, file, cb) => cb(null, ensureUploadDir(folder)),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}`);
  },
});

const allowedTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const fileFilter = (req, file, cb) => {
  if (!allowedTypes.has(file.mimetype)) {
    return cb(new Error('Only JPG, PNG, WEBP and PDF medical files are allowed.'));
  }
  cb(null, true);
};

const uploadRequestFiles = multer({
  storage: createStorage('requests'),
  fileFilter,
  limits: {
    files: 5,
    fileSize: 8 * 1024 * 1024,
  },
});

const uploadNurseDocuments = multer({
  storage: createStorage('nurses'),
  fileFilter,
  limits: {
    files: 3,
    fileSize: 8 * 1024 * 1024,
  },
});

module.exports = { uploadRequestFiles, uploadNurseDocuments };
