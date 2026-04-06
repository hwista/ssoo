import { NextResponse } from 'next/server';
import path from 'node:path';
import { logger } from '@/lib/utils';
import { configService } from '@/server/services/config/ConfigService';
import {
  ATTACHMENT_ALLOWED_EXTENSIONS,
  REFERENCE_STORAGE_DIR,
  getMimeType,
} from '@/lib/constants/file';
import { saveFileByHash } from '@/server/services/file/hashStorage';

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
    const { relativePath, fileName, reused } = saveFileByHash(buffer, file.name, REFERENCE_STORAGE_DIR);

    logger.info('참조 파일 업로드 완료', { relativePath, size: file.size, reused });

    return NextResponse.json({
      success: true,
      path: relativePath,
      fileName,
      size: file.size,
      type: getMimeType(file.name),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '참조 파일 업로드 중 오류가 발생했습니다.';
    logger.error('참조 파일 업로드 실패', { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
