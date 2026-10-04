import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { env } from './env';
import { AppError } from '../utils/app-error';

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];

const UPLOAD_DIR = path.resolve(process.cwd(), env.UPLOAD_DIR);

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

const storage = env.UPLOAD_STORAGE === 'supabase' ? multer.memoryStorage() : diskStorage;

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(AppError.badRequest(`Unsupported file type: ${file.mimetype}. Allowed: PDF, PNG, JPG`));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.UPLOAD_MAX_SIZE,
  },
});

export { UPLOAD_DIR, ALLOWED_MIME_TYPES };
