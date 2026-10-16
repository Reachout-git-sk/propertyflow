import { AsyncLocalStorage } from 'async_hooks';
import { RequestHandler } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

// Ensure upload directory exists
export const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// File filter
const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|mp4|mov|avi/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, videos, PDFs, and documents are allowed.'));
  }
};

const multerUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
  },
});

// multer often finishes reading a file inside a LATER network event (the last chunk of a
// slow upload). Code that runs from there has lost the request's AsyncLocalStorage context,
// so the database would not know who is logged in and row-level security would hide the
// user's own rows. AsyncLocalStorage.bind(next) remembers the context that was active when
// the upload started and restores it when multer calls next().
export const upload = {
  single: (fieldName: string): RequestHandler => {
    const middleware = multerUpload.single(fieldName);
    return (req, res, next) => middleware(req, res, AsyncLocalStorage.bind(next));
  },
};