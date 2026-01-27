/**
 * 권한 API
 * @description 얇은 라우팅 레이어 - 핸들러로 위임
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getPermissionInfo, 
  handlePermissionAction 
} from '@/server/handlers/permissions.handler';

// 권한 조회
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const result = await getPermissionInfo({
    action: searchParams.get('action') as Parameters<typeof getPermissionInfo>[0]['action'],
    userId: searchParams.get('userId') || undefined,
    roleId: searchParams.get('roleId') || undefined,
    resourceType: searchParams.get('resourceType') || undefined,
    resourceAction: searchParams.get('resourceAction') || undefined,
    resourceId: searchParams.get('resourceId') || undefined,
    groupId: searchParams.get('groupId') || undefined,
    targetUserId: searchParams.get('targetUserId') || undefined,
    limit: searchParams.get('limit') || undefined
  });

  if (result.success) {
    return NextResponse.json({ success: true, ...(result.data as object) });
  }
  return NextResponse.json({ error: result.error }, { status: result.status });
}

// 권한 설정/변경
export async function POST(request: NextRequest) {
  const body = await request.json();
  
  const result = await handlePermissionAction(body);

  if (result.success) {
    return NextResponse.json({ success: true, ...(result.data as object) });
  }
  return NextResponse.json({ error: result.error }, { status: result.status });
}
