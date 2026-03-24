import path from 'node:path';
import { extractTextFromFile } from '@/server/services/file/textExtractor';
import { logger } from '@/lib/utils';
import { ATTACHMENT_ALLOWED_EXTENSIONS, ATTACHMENT_MAX_SIZE } from '@/lib/constants/file';
import { fail, ok, toNextResponse } from '@/server/shared/result';

/**
 * POST /api/file/extract-text
 * 파일을 받아 서버사이드 파서로 텍스트를 추출해 반환한다.
 * 바이너리 파일(pdf, docx, pptx, xlsx)도 의미 있는 텍스트 추출 가능.
 */
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
    const result = await extractTextFromFile(buffer, file.name);

    logger.info('텍스트 추출 완료', {
      fileName: file.name,
      ext,
      size: file.size,
      textLength: result.text.length,
      imageCount: result.images.length,
    });

    return toNextResponse(ok({
      textContent: result.text,
      images: result.images,
      fileName: file.name,
      size: file.size,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : '텍스트 추출 중 오류가 발생했습니다.';
    logger.error('텍스트 추출 실패', { error: message });
    return toNextResponse(fail(message, 500));
  }
}
