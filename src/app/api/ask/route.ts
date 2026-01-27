/**
 * Ask API Route - AI 질문 응답 (벡터 검색 기반 RAG)
 * 비즈니스 로직은 @/server/handlers/ask.handler.ts 참조
 */

import { NextRequest, NextResponse } from 'next/server';
import { askQuestion } from '@/server/handlers/ask.handler';

export async function POST(request: NextRequest) {
  const { question, limit = 5 } = await request.json();
  const result = await askQuestion(question, limit);

  if (result.success) {
    return NextResponse.json({ success: true, ...result.data });
  }
  return NextResponse.json({ error: result.error }, { status: result.status });
}
