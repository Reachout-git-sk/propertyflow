import fs from 'fs';
import path from 'path';
import { Response } from 'express';
import { uploadDir } from '../config/multer';
import { AppError } from '../middleware/errorHandler';

const uploadRoot = path.resolve(uploadDir);

/**
 * Sends one stored upload (ticket photo, rent receipt, lease document) as a download.
 * Call it only AFTER checking that the viewer may see the record the file belongs to.
 *
 * - Only files inside the upload folder are ever sent. The path comes from the database,
 *   and a row can point anywhere (inspection findings store a photo path taken straight
 *   from the request body). Without this check, a path like ../.env would leak secrets.
 * - res.download marks the response as an "attachment", so the browser saves the file
 *   instead of opening it. An uploaded HTML or SVG file then cannot run scripts on our site.
 */
export function sendStoredFile(res: Response, storedPath: string, downloadName: string) {
  const fullPath = path.resolve(storedPath);

  if (!fullPath.startsWith(uploadRoot + path.sep) || !fs.existsSync(fullPath)) {
    throw new AppError('File not found on server', 404);
  }

  res.download(fullPath, downloadName);
}
