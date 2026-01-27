/**
 * Gemini API Route - Gemini AI 질문 응답
 * 비즈니스 로직은 @/server/handlers/gemini.handler.ts 참조
 */

import { NextRequest } from 'next/server';
import { askGemini } from '@/server/handlers/gemini.handler';

export const runtime = 'nodejs';

// 하드코딩된 API 키 (보안 주의: 프로덕션에서는 환경변수 사용 필요)
const API_KEY = 'AIzaSyBiQlQTNkQF3uO7V5ttiQm6oDCa2obGkHk';

export async function POST(req: NextRequest) {
  const { question } = await req.json();
  
  const result = await askGemini(question, API_KEY);

  if (result.success) {
    return new Response(JSON.stringify(result.data), { status: 200 });
  }
  return new Response(JSON.stringify({ answer: result.error }), { status: result.status });
}
