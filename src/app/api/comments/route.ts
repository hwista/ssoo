/**
 * 댓글 API
 * @description 얇은 라우팅 레이어 - 핸들러로 위임
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getFileComments, 
  createComment, 
  editComment, 
  removeComment 
} from '@/server/handlers/comments.handler';

// 댓글 목록 조회
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const result = await getFileComments({
    filePath: searchParams.get('filePath') || undefined,
    asTree: searchParams.get('asTree') || undefined
  });

  if (result.success) {
    return NextResponse.json({ success: true, ...(result.data as object) });
  }
  return NextResponse.json({ error: result.error }, { status: result.status });
}

// 댓글 추가
export async function POST(request: NextRequest) {
  const body = await request.json();
  
  const result = await createComment(body);

  if (result.success) {
    return NextResponse.json({ success: true, ...(result.data as object) });
  }
  return NextResponse.json({ error: result.error }, { status: result.status });
}

// 댓글 수정
export async function PUT(request: NextRequest) {
  const body = await request.json();
  
  const result = await editComment(body);

  if (result.success) {
    return NextResponse.json({ success: true, ...(result.data as object) });
  }
  return NextResponse.json({ error: result.error }, { status: result.status });
}

// 댓글 삭제
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const result = await removeComment({
    filePath: searchParams.get('filePath') || undefined,
    commentId: searchParams.get('commentId') || undefined
  });

  if (result.success) {
    return NextResponse.json({ success: true, ...(result.data as object) });
  }
  return NextResponse.json({ error: result.error }, { status: result.status });
}
