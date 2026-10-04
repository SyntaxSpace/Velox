import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PrintStorageService } from '../src/services/print-storage.service';

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'velox-print-storage-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('PrintStorageService', () => {
  it('uploads, downloads, and removes objects through the configured private bucket', async () => {
    const content = Buffer.from('print document');
    const storageApi = {
      upload: vi.fn().mockResolvedValue({ data: { path: 'file.pdf' }, error: null }),
      download: vi.fn().mockResolvedValue({ data: new Blob([content]), error: null }),
      remove: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const supabaseClient = {
      storage: { from: vi.fn().mockReturnValue(storageApi) },
    } as never;
    const storage = new PrintStorageService({
      mode: 'supabase',
      bucket: 'private-print-files',
      supabaseClient,
    });

    const fileKey = await storage.saveUploadedFile({
      buffer: content,
      filename: undefined,
      originalname: 'sample.pdf',
      mimetype: 'application/pdf',
      size: content.length,
    } as Express.Multer.File);

    expect(fileKey).toMatch(/^[a-f0-9-]+\.pdf$/);
    expect(supabaseClient.storage.from).toHaveBeenCalledWith('private-print-files');
    expect(storageApi.upload).toHaveBeenCalledWith(
      fileKey,
      content,
      expect.objectContaining({ contentType: 'application/pdf', upsert: false }),
    );
    await expect(storage.readFile(fileKey)).resolves.toEqual(content);
    expect(await storage.deleteFile(fileKey)).toBe(true);
    expect(storageApi.remove).toHaveBeenCalledWith([fileKey]);
  });

  it('keeps local development uploads on disk and rejects path traversal', async () => {
    const uploadDir = makeTempDir();
    const content = Buffer.from('local document');
    const filePath = path.join(uploadDir, 'local.pdf');
    fs.writeFileSync(filePath, content);
    const storage = new PrintStorageService({ mode: 'local', uploadDir });

    await expect(storage.readFile('local.pdf')).resolves.toEqual(content);
    await expect(storage.readFile('../outside.pdf')).rejects.toThrow('Invalid file path');
    expect(await storage.deleteFile('local.pdf')).toBe(true);
    expect(fs.existsSync(filePath)).toBe(false);
  });
});
