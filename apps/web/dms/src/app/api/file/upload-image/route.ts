import { NextResponse } from 'next/server';
import { logger } from '@/lib/utils';
import { configService } from '@/server/services/config/ConfigService';
import { saveFileByHash } from '@/server/services/file/hashStorage';

const IMAGES_DIR = '_assets/images';
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'];

export async function POST(req: Request) {
  try {
    const imageMaxSizeMb = configService.getConfig().uploads.imageMaxSizeMb;
    const maxFileSize = imageMaxSizeMb * 1024 * 1024;
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: '파일이 필요합니다.' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `허용되지 않는 파일 형식입니다: ${file.type}` }, { status: 400 });
    }

    if (file.size > maxFileSize) {
      return NextResponse.json({ error: `파일 크기는 ${imageMaxSizeMb}MB 이하여야 합니다.` }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { relativePath, fileName, reused } = saveFileByHash(buffer, file.name, IMAGES_DIR);

    logger.info('이미지 업로드 완료', { relativePath, size: file.size, reused });

    return NextResponse.json({
      success: true,
      path: relativePath,
      fileName,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '이미지 업로드 중 오류가 발생했습니다.';
    logger.error('이미지 업로드 실패', { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
