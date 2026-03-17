import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import nodePath from 'node:path';
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
 * 위키 디렉토리 내 이미지 파일을 raw 바이너리로 반환
 * GET /api/file/raw?path=_assets/images/xxx.png
 */
export async function GET(req: NextRequest) {
  const filePath = req.nextUrl.searchParams.get('path');

  if (!filePath) {
    return NextResponse.json({ error: 'path 파라미터가 필요합니다.' }, { status: 400 });
  }

  // path traversal 방지
  const normalized = nodePath.normalize(filePath);
  if (normalized.startsWith('..') || nodePath.isAbsolute(normalized)) {
    return NextResponse.json({ error: '잘못된 경로입니다.' }, { status: 400 });
  }

  const wikiDir = configService.getWikiDir();
  const fullPath = nodePath.join(wikiDir, normalized);

  // wikiDir 외부 접근 차단
  if (!fullPath.startsWith(wikiDir)) {
    return NextResponse.json({ error: '잘못된 경로입니다.' }, { status: 400 });
  }

  if (!fs.existsSync(fullPath)) {
    return NextResponse.json({ error: '파일을 찾을 수 없습니다.' }, { status: 404 });
  }

  const ext = nodePath.extname(fullPath).toLowerCase();
  const contentType = MIME_MAP[ext];

  if (!contentType) {
    return NextResponse.json({ error: '지원하지 않는 파일 형식입니다.' }, { status: 415 });
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
