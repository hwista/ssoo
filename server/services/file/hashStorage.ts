import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { configService } from '@/server/services/config/ConfigService';

/**
 * Content-hash 기반 파일 저장
 *
 * 동일 내용 → 같은 해시 → 기존 파일 재사용 (중복 제거)
 * 다른 내용 → 다른 해시 → 별도 저장
 *
 * @returns 상대 경로 (wikiDir 기준)
 */
export function saveFileByHash(
  buffer: Buffer,
  originalName: string,
  storageDir: string,
): { relativePath: string; fileName: string; reused: boolean } {
  const ext = path.extname(originalName).toLowerCase() || '';
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  const fileName = `${hash}${ext}`;

  const wikiDir = configService.getWikiDir();
  const targetDir = path.join(wikiDir, storageDir);

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
