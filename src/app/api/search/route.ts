/**
 * Search API Route - 벡터 유사도 검색
 * 비즈니스 로직은 @/server/handlers/search.handler.ts 참조
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchDocuments, getIndexStatus } from '@/server/handlers/search.handler';

export async function POST(request: NextRequest) {
  const { query, limit = 5 } = await request.json();
  const result = await searchDocuments(query, limit);

  if (result.success) {
    return NextResponse.json({ success: true, ...result.data });
  }
  return NextResponse.json({ error: result.error }, { status: result.status });
}

export async function GET() {
  const result = await getIndexStatus();

  if (result.success) {
    return NextResponse.json({ success: true, ...result.data });
  }
  return NextResponse.json({ error: result.error }, { status: result.status });
}
