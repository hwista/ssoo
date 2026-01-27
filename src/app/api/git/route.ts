/**
 * Git API Route - Git 관련 작업
 * 비즈니스 로직은 @/server/handlers/git.handler.ts 참조
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleGitGet, handleGitPost } from '@/server/handlers/git.handler';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'status';
  const filePath = searchParams.get('filePath');
  const limit = searchParams.get('limit') || '20';

  const result = await handleGitGet(action, filePath ?? undefined, limit);

  if (result.success) {
    return NextResponse.json(result.data);
  }
  return NextResponse.json({ error: result.error }, { status: result.status });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = await handleGitPost(body);

  if (result.success) {
    return NextResponse.json(result.data);
  }
  return NextResponse.json({ error: result.error }, { status: result.status });
}
