/**
 * Index API Route - 벡터 인덱싱 작업
 * 비즈니스 로직은 @/server/handlers/index.handler.ts 참조
 */

import { NextRequest, NextResponse } from 'next/server';
import { indexWikiDocuments, getIndexStats, resetIndex } from '@/server/handlers/index.handler';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { reindex = false } = body;

  const result = await indexWikiDocuments(reindex);

  if (result.success) {
    return NextResponse.json({ success: true, ...result.data });
  }
  return NextResponse.json({ error: result.error }, { status: result.status });
}

export async function GET() {
  const result = await getIndexStats();

  if (result.success) {
    return NextResponse.json({ success: true, ...result.data });
  }
  return NextResponse.json({ error: result.error }, { status: result.status });
}

export async function DELETE() {
  const result = await resetIndex();

  if (result.success) {
    return NextResponse.json({ success: true, ...result.data });
  }
  return NextResponse.json({ error: result.error }, { status: result.status });
}
