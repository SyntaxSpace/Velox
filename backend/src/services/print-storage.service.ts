import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import { UPLOAD_DIR } from '../config/upload';
import { logger } from '../config/logger';
import { AppError } from '../utils/app-error';

type SupabaseClient = ReturnType<typeof createClient>;

interface PrintStorageOptions {
  mode?: 'local' | 'supabase';
  uploadDir?: string;
  bucket?: string;
  supabaseClient?: SupabaseClient;
}

const EXTENSIONS: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/png': '.png',
  'image/jpeg': '.jpg',
};

export class PrintStorageService {
  private readonly mode: 'local' | 'supabase';
  private readonly uploadDir: string;
  private readonly bucket: string;
  private supabaseClient: SupabaseClient | null;

  constructor(options: PrintStorageOptions = {}) {
    this.mode = options.mode ?? env.UPLOAD_STORAGE;
    this.uploadDir = options.uploadDir ?? UPLOAD_DIR;
    this.bucket = options.bucket ?? env.SUPABASE_STORAGE_BUCKET;
    this.supabaseClient = options.supabaseClient ?? null;
  }

  async saveUploadedFile(file: Express.Multer.File): Promise<string> {
    if (this.mode === 'local') {
      if (!file.filename) throw AppError.internal('Uploaded file is missing its local filename');
      return file.filename;
    }

    const extension = EXTENSIONS[file.mimetype];
    if (!extension || !file.buffer) {
      throw AppError.badRequest('Uploaded document is invalid or unsupported');
    }

    const objectKey = `${crypto.randomUUID()}${extension}`;
    const { error } = await this.client().storage.from(this.bucket).upload(objectKey, file.buffer, {
      contentType: file.mimetype,
      cacheControl: '0',
      upsert: false,
    });

    if (error) {
      logger.error({ error, bucket: this.bucket }, 'Failed to upload print document to Supabase');
      throw AppError.internal('Unable to store the print document');
    }

    return objectKey;
  }

  async readFile(objectKey: string): Promise<Buffer> {
    if (this.mode === 'local') {
      const filePath = path.resolve(this.uploadDir, objectKey);
      const safeRoot = `${path.resolve(this.uploadDir)}${path.sep}`;
      if (!filePath.startsWith(safeRoot)) throw AppError.badRequest('Invalid file path');
      if (!fs.existsSync(filePath)) throw AppError.notFound('Document file not found on disk');
      return fs.readFileSync(filePath);
    }

    this.validateObjectKey(objectKey);
    const { data, error } = await this.client().storage.from(this.bucket).download(objectKey);
    if (error) {
      logger.error({ error, bucket: this.bucket, objectKey }, 'Failed to download print document');
      throw AppError.internal('Unable to download the print document');
    }
    if (!data) {
      throw AppError.notFound('Document file not found in storage');
    }
    return Buffer.from(await data.arrayBuffer());
  }

  async deleteFile(objectKey: string): Promise<boolean> {
    if (this.mode === 'local') {
      const filePath = path.resolve(this.uploadDir, objectKey);
      const safeRoot = `${path.resolve(this.uploadDir)}${path.sep}`;
      if (!filePath.startsWith(safeRoot)) throw AppError.badRequest('Invalid file path');
      if (!fs.existsSync(filePath)) return false;
      fs.unlinkSync(filePath);
      return true;
    }

    this.validateObjectKey(objectKey);
    const { error } = await this.client().storage.from(this.bucket).remove([objectKey]);
    if (error) {
      logger.error({ error, bucket: this.bucket, objectKey }, 'Failed to delete print document');
      throw AppError.internal('Unable to delete the print document');
    }
    return true;
  }

  private client(): SupabaseClient {
    if (this.supabaseClient) return this.supabaseClient;
    if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
      throw AppError.internal('Supabase Storage is not configured');
    }
    this.supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    return this.supabaseClient;
  }

  private validateObjectKey(objectKey: string): void {
    if (!/^[a-f0-9-]+\.(pdf|png|jpg)$/.test(objectKey)) {
      throw AppError.badRequest('Invalid storage object key');
    }
  }
}

export const printStorageService = new PrintStorageService();
