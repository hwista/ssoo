/**
 * 협업 세션 API
 * @description 얇은 라우팅 레이어 - 핸들러로 위임
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getCollaborationStatus, 
  handleCollaborateAction 
} from '@/server/handlers/collaborate.handler';

// 세션 상태 조회 / 활성 세션 목록
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const result = await getCollaborationStatus({
    filePath: searchParams.get('filePath') || undefined,
    sinceVersion: searchParams.get('sinceVersion') || undefined,
    listActive: searchParams.get('listActive') || undefined
  });

  if (result.success) {
    return NextResponse.json({ success: true, ...result.data });
  }
  return NextResponse.json({ error: result.error }, { status: result.status });
}

// 세션 참가 / 작업 수행
export async function POST(request: NextRequest) {
  const body = await request.json();
  
  const result = await handleCollaborateAction(body);

  if (result.success) {
    return NextResponse.json({ success: true, ...result.data });
  }
  return NextResponse.json({ error: result.error }, { status: result.status });
}
