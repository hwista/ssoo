import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { configService } from '@/server/services/config/ConfigService';
import { getMimeType } from '@/lib/constants/file';

export async function GET(req: NextRequest) {
  const filePath = req.nextUrl.searchParams.get('path');
  const download = req.nextUrl.searchParams.get('download');
  const originalName = req.nextUrl.searchParams.get('name');

  if (!filePath) {
    return NextResponse.json({ error: 'path 파라미터가 필요합니다.' }, { status: 400 });
  }

  // path traversal 방지
  const normalizedPath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
  if (normalizedPath !== filePath || filePath.includes('..')) {
    return NextResponse.json({ error: '유효하지 않은 경로입니다.' }, { status: 400 });
  }

  const wikiDir = configService.getWikiDir();
  const absolutePath = path.join(wikiDir, filePath);

  // wikiDir 범위 내인지 확인
  if (!absolutePath.startsWith(path.resolve(wikiDir))) {
    return NextResponse.json({ error: '접근이 허용되지 않는 경로입니다.' }, { status: 403 });
  }

  if (!fs.existsSync(absolutePath)) {
    return NextResponse.json({ error: '파일을 찾을 수 없습니다.' }, { status: 404 });
  }

  const buffer = fs.readFileSync(absolutePath);
  // 원본 파일명이 제공되면 사용, 없으면 디스크 파일명
  const displayName = originalName || path.basename(filePath);
  const mimeType = getMimeType(displayName);

  const headers: Record<string, string> = {
    'Content-Type': mimeType,
    'Content-Length': String(buffer.length),
  };

  if (download === '1') {
    headers['Content-Disposition'] = `attachment; filename="${encodeURIComponent(displayName)}"`;
  } else {
    headers['Content-Disposition'] = `inline; filename="${encodeURIComponent(displayName)}"`;
  }

  return new NextResponse(buffer, { status: 200, headers });
}
