/**
 * 템플릿 API
 * @description 얇은 라우팅 레이어 - 핸들러로 위임
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getTemplates, 
  applyTemplate 
} from '@/server/handlers/templates.handler';

// 템플릿 목록 조회
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const result = await getTemplates({
    category: searchParams.get('category') || undefined,
    id: searchParams.get('id') || undefined
  });

  if (result.success) {
    return NextResponse.json({ success: true, ...(result.data as object) });
  }
  return NextResponse.json({ error: result.error }, { status: result.status });
}

// 템플릿 적용 (변수 치환 포함)
export async function POST(request: NextRequest) {
  const body = await request.json();
  
  const result = await applyTemplate(body);

  if (result.success) {
    return NextResponse.json({ success: true, ...(result.data as object) });
  }
  return NextResponse.json({ error: result.error }, { status: result.status });
}
