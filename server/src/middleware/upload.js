import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { db } from '../config/database.js';

const uploadDirectory = path.resolve(process.env.UPLOAD_DIR || './storage/uploads');
fs.mkdirSync(uploadDirectory, { recursive: true });

const allowed = new Set(['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg', '.zip']);
const mimeTypes = new Set([
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png', 'image/jpeg', 'application/zip', 'application/x-zip-compressed'
]);

const storage = multer.diskStorage({
  destination: (req, file, callback) => callback(null, uploadDirectory),
  filename: (req, file, callback) => callback(null, randomUUID() + path.extname(file.originalname).toLowerCase())
});

const fileFilter = (req, file, callback) => {
  const extension = path.extname(file.originalname).toLowerCase();
  if (!allowed.has(extension) || !mimeTypes.has(file.mimetype)) {
    const error = new Error('Unsupported file type. Upload PDF, Office documents, images or ZIP files.');
    error.status = 400;
    return callback(error);
  }
  callback(null, true);
};

export const submissionUpload = {
  single(fieldName) {
    return (req, res, next) => {
      const setting = db.prepare("SELECT setting_value FROM system_settings WHERE setting_key = 'max_upload_mb'").get();
      const configured = Number(setting?.setting_value || 15);
      const maxMB = Number.isFinite(configured) ? Math.min(100, Math.max(1, configured)) : 15;
      const uploader = multer({
        storage, fileFilter,
        limits: { fileSize: maxMB * 1024 * 1024, files: 1 }
      }).single(fieldName);
      uploader(req, res, next);
    };
  }
};
