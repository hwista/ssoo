import path from 'node:path';
import { logger } from '@/lib/utils';
import { fail, ok, toNextResponse } from '@/server/shared/result';
import {
  ATTACHMENT_ALLOWED_EXTENSIONS,
  ATTACHMENT_MAX_SIZE,
  ATTACHMENT_STORAGE_DIR,
} from '@/lib/constants/file';
import { getMimeType } from '@/lib/utils/fileUtils';
import { saveFileByHash } from '@/server/services/file/hashStorage';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return toNextResponse(fail('파일이 필요합니다.', 400));
    }

    const ext = path.extname(file.name).toLowerCase();
    if (!ATTACHMENT_ALLOWED_EXTENSIONS.has(ext)) {
      return toNextResponse(fail(`허용되지 않는 파일 형식입니다: ${ext}`, 400));
    }

    if (file.size > ATTACHMENT_MAX_SIZE) {
      return toNextResponse(fail('파일 크기는 20MB 이하여야 합니다.', 400));
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { relativePath, fileName, reused } = saveFileByHash(buffer, file.name, ATTACHMENT_STORAGE_DIR);

    logger.info('첨부파일 업로드 완료', { relativePath, size: file.size, reused });

    return toNextResponse(ok({
      path: relativePath,
      fileName,
      size: file.size,
      type: getMimeType(file.name),
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : '첨부파일 업로드 중 오류가 발생했습니다.';
    logger.error('첨부파일 업로드 실패', { error: message });
    return toNextResponse(fail(message, 500));
  }
}
