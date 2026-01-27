/**
 * 사용자 API
 * @description 얇은 라우팅 레이어 - 핸들러로 위임
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getUsers, 
  createOrLoginUser, 
  editUser, 
  removeUser 
} from '@/server/handlers/users.handler';

// 사용자 목록 조회
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const result = await getUsers({
    id: searchParams.get('id') || undefined,
    activity: searchParams.get('activity') || undefined,
    limit: searchParams.get('limit') || undefined
  });

  if (result.success) {
    return NextResponse.json({ success: true, ...(result.data as object) });
  }
  return NextResponse.json({ error: result.error }, { status: result.status });
}

// 사용자 생성 / 로그인
export async function POST(request: NextRequest) {
  const body = await request.json();
  
  const result = await createOrLoginUser(body);

  if (result.success) {
    return NextResponse.json({ success: true, ...(result.data as object) });
  }
  return NextResponse.json({ error: result.error }, { status: result.status });
}

// 사용자 업데이트
export async function PUT(request: NextRequest) {
  const body = await request.json();
  
  const result = await editUser(body);

  if (result.success) {
    return NextResponse.json({ success: true, ...(result.data as object) });
  }
  return NextResponse.json({ error: result.error }, { status: result.status });
}

// 사용자 삭제
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const result = await removeUser({
    id: searchParams.get('id') || undefined
  });

  if (result.success) {
    return NextResponse.json({ success: true, ...(result.data as object) });
  }
  return NextResponse.json({ error: result.error }, { status: result.status });
}
