const fs = require('fs');
const path = require('path');
const multer = require('multer');

const MAX_REQUEST_FILE_SIZE = Number(process.env.MAX_REQUEST_FILE_SIZE_BYTES || 8 * 1024 * 1024);
const MAX_NURSE_DOCUMENT_SIZE = Number(process.env.MAX_NURSE_DOCUMENT_SIZE_BYTES || 8 * 1024 * 1024);

const ensureUploadDir = (folder) => {
  const uploadDir = path.join(__dirname, `../../uploads/${folder}`);
  fs.mkdirSync(uploadDir, { recursive: true });
  return uploadDir;
};

const createStorage = (folder) => multer.diskStorage({
  destination: (req, file, cb) => cb(null, ensureUploadDir(folder)),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const baseName = path.basename(file.originalname || 'upload', ext).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${baseName || 'upload'}${ext}`);
  },
});

const allowedFiles = new Map([
  ['image/jpeg', new Set(['.jpg', '.jpeg'])],
  ['image/png', new Set(['.png'])],
  ['image/webp', new Set(['.webp'])],
  ['application/pdf', new Set(['.pdf'])],
]);

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const allowedExts = allowedFiles.get(file.mimetype);
  if (!allowedExts || !allowedExts.has(ext)) {
    return cb(new Error('Only JPG, PNG, WEBP and PDF medical files are allowed.'));
  }
  cb(null, true);
};

const uploadRequestFiles = multer({
  storage: createStorage('requests'),
  fileFilter,
  limits: {
    files: 5,
    fileSize: MAX_REQUEST_FILE_SIZE,
  },
});

const uploadNurseDocuments = multer({
  storage: createStorage('nurses'),
  fileFilter,
  limits: {
    files: 3,
    fileSize: MAX_NURSE_DOCUMENT_SIZE,
  },
});

module.exports = { uploadRequestFiles, uploadNurseDocuments };
