import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { configService } from '../runtime/dms-config.service.js';

export function saveFileByHash(
  buffer: Buffer,
  originalName: string,
  storageDir: string,
): { relativePath: string; fileName: string; reused: boolean } {
  const ext = path.extname(originalName).toLowerCase() || '';
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  const fileName = `${hash}${ext}`;

  const docDir = configService.getDocDir();
  const targetDir = path.join(docDir, storageDir);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const filePath = path.join(targetDir, fileName);
  const relativePath = `${storageDir}/${fileName}`;
  if (fs.existsSync(filePath)) {
    return { relativePath, fileName, reused: true };
  }

  fs.writeFileSync(filePath, buffer);
  return { relativePath, fileName, reused: false };
}
