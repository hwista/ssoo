import { NextResponse } from 'next/server';
import path from 'node:path';
import { extractTextFromFile } from '@/server/services/file/textExtractor';
import { logger } from '@/lib/utils';
import { configService } from '@/server/services/config/ConfigService';
import { ATTACHMENT_ALLOWED_EXTENSIONS } from '@/lib/constants/file';

/**
 * POST /api/file/extract-text
 * 파일을 받아 서버사이드 파서로 텍스트를 추출해 반환한다.
 * 바이너리 파일(pdf, docx, pptx, xlsx)도 의미 있는 텍스트 추출 가능.
 */
export async function POST(req: Request) {
  try {
    const attachmentMaxSizeMb = configService.getConfig().uploads.attachmentMaxSizeMb;
    const attachmentMaxSize = attachmentMaxSizeMb * 1024 * 1024;
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: '파일이 필요합니다.' }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase();
    if (!ATTACHMENT_ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: `허용되지 않는 파일 형식입니다: ${ext}` },
        { status: 400 },
      );
    }

    if (file.size > attachmentMaxSize) {
      return NextResponse.json(
        { error: `파일 크기는 ${attachmentMaxSizeMb}MB 이하여야 합니다.` },
        { status: 400 },
      );
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

    return NextResponse.json({
      success: true,
      textContent: result.text,
      images: result.images,
      fileName: file.name,
      size: file.size,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '텍스트 추출 중 오류가 발생했습니다.';
    logger.error('텍스트 추출 실패', { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
