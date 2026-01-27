/**
 * 버전 히스토리 API
 * @description 얇은 라우팅 레이어 - 핸들러로 위임
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFileVersions } from '@/server/handlers/versions.handler';

// 버전 목록 조회
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const result = await getFileVersions({
    filePath: searchParams.get('filePath') || undefined,
    versionId: searchParams.get('versionId') || undefined,
    compareWith: searchParams.get('compareWith') || undefined
  });

  if (result.success) {
    return NextResponse.json({ success: true, ...(result.data as object) });
  }
  return NextResponse.json({ error: result.error }, { status: result.status });
}
