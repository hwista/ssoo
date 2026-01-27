/**
 * 태그 API
 * @description 얇은 라우팅 레이어 - 핸들러로 위임
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getTags, 
  createOrAddTag, 
  editTag, 
  removeTag 
} from '@/server/handlers/tags.handler';

// 태그 조회
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const result = await getTags({
    filePath: searchParams.get('filePath') || undefined,
    tagId: searchParams.get('tagId') || undefined,
    stats: searchParams.get('stats') || undefined
  });

  if (result.success) {
    return NextResponse.json({ success: true, ...(result.data as object) });
  }
  return NextResponse.json({ error: result.error }, { status: result.status });
}

// 태그 생성 / 파일에 태그 추가
export async function POST(request: NextRequest) {
  const body = await request.json();
  
  const result = await createOrAddTag(body);

  if (result.success) {
    return NextResponse.json({ success: true, ...(result.data as object) });
  }
  return NextResponse.json({ error: result.error }, { status: result.status });
}

// 태그 수정
export async function PUT(request: NextRequest) {
  const body = await request.json();
  
  const result = await editTag(body);

  if (result.success) {
    return NextResponse.json({ success: true, ...(result.data as object) });
  }
  return NextResponse.json({ error: result.error }, { status: result.status });
}

// 태그 삭제 / 파일에서 태그 제거
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const result = await removeTag({
    id: searchParams.get('id') || undefined,
    filePath: searchParams.get('filePath') || undefined,
    tagId: searchParams.get('tagId') || undefined
  });

  if (result.success) {
    return NextResponse.json({ success: true, ...(result.data as object) });
  }
  return NextResponse.json({ error: result.error }, { status: result.status });
}
