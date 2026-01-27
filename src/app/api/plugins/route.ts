/**
 * 플러그인 API
 * @description 얇은 라우팅 레이어 - 핸들러로 위임
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getPlugins, 
  handlePluginAction 
} from '@/server/handlers/plugins.handler';

// 플러그인 목록 조회
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const result = await getPlugins({
    id: searchParams.get('id') || undefined
  });

  if (result.success) {
    return NextResponse.json({ success: true, ...result.data });
  }
  return NextResponse.json({ error: result.error }, { status: result.status });
}

// 플러그인 훅 실행 / 설정 변경
export async function POST(request: NextRequest) {
  const body = await request.json();
  
  const result = await handlePluginAction(body);

  if (result.success) {
    return NextResponse.json({ success: true, ...result.data });
  }
  return NextResponse.json({ error: result.error }, { status: result.status });
}
