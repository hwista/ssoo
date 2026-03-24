import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import nodePath from 'node:path';
import { fail, toNextResponse } from '@/server/shared/result';
import { configService } from '@/server/services/config/ConfigService';
import { logger } from '@/lib/utils';

const MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

/**
 * 문서 디렉토리 내 이미지 파일을 raw 바이너리로 반환
 * GET /api/file/raw?path=_assets/images/xxx.png
 */
export async function GET(req: NextRequest) {
  const filePath = req.nextUrl.searchParams.get('path');

  if (!filePath) {
    return toNextResponse(fail('path 파라미터가 필요합니다.', 400));
  }

  // path traversal 방지
  const normalized = nodePath.normalize(filePath);
  if (normalized.startsWith('..') || nodePath.isAbsolute(normalized)) {
    return toNextResponse(fail('잘못된 경로입니다.', 400));
  }

  const docDir = configService.getDocDir();
  const fullPath = nodePath.join(docDir, normalized);

  // docDir 외부 접근 차단
  if (!fullPath.startsWith(docDir)) {
    return toNextResponse(fail('잘못된 경로입니다.', 400));
  }

  if (!fs.existsSync(fullPath)) {
    return toNextResponse(fail('파일을 찾을 수 없습니다.', 404));
  }

  const ext = nodePath.extname(fullPath).toLowerCase();
  const contentType = MIME_MAP[ext];

  if (!contentType) {
    return toNextResponse(fail('지원하지 않는 파일 형식입니다.', 415));
  }

  try {
    const buffer = fs.readFileSync(fullPath);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '파일 읽기 실패';
    logger.error('raw 파일 읽기 실패', { filePath, error: message });
    return toNextResponse(fail(message, 500));
  }
}
