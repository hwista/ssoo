/**
 * Text Search API Route - 텍스트 검색
 * 비즈니스 로직은 @/server/handlers/text-search.handler.ts 참조
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchText } from '@/server/handlers/text-search.handler';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const caseSensitive = searchParams.get('caseSensitive') === 'true';
  const limit = parseInt(searchParams.get('limit') || '20');

  if (!query) {
    return NextResponse.json({ error: '검색어가 필요합니다' }, { status: 400 });
  }

  const result = await searchText(query, caseSensitive, limit);

  if (result.success) {
    return NextResponse.json({ success: true, ...result.data });
  }
  return NextResponse.json({ error: result.error }, { status: result.status });
}
