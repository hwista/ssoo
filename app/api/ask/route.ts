import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { searchSimilar } from '@/lib/vectorStore';

// Gemini API 클라이언트 초기화
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Gemini 모델 (gemini-1.5-flash 사용)
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export async function POST(request: NextRequest) {
  try {
    const { question, limit = 5 } = await request.json();

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: '질문이 필요합니다' },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY가 설정되지 않았습니다' },
        { status: 500 }
      );
    }

    // 1. 벡터 검색으로 관련 문서 찾기
    const searchResults = await searchSimilar(question, limit);

    if (searchResults.length === 0) {
      return NextResponse.json({
        success: true,
        question,
        answer: '관련 문서를 찾을 수 없습니다. 먼저 문서를 인덱싱해주세요.',
        sources: [],
        hasContext: false
      });
    }

    // 2. 컨텍스트 구성
    const context = searchResults
      .map((result, index) => {
        return `[문서 ${index + 1}: ${result.document.fileName}]\n${result.document.content}`;
      })
      .join('\n\n---\n\n');

    // 3. AI 프롬프트 구성
    const prompt = `당신은 LS그룹 위키 시스템의 AI 어시스턴트입니다.
사용자의 질문에 대해 아래 제공된 문서 컨텍스트를 기반으로 정확하고 도움이 되는 답변을 해주세요.

## 지침
- 제공된 문서 내용만을 기반으로 답변하세요
- 문서에 없는 내용은 추측하지 마세요
- 답변 시 참고한 문서를 명시하세요
- 한국어로 답변하세요
- 답변은 명확하고 구조적으로 작성하세요

## 컨텍스트 문서
${context}

## 사용자 질문
${question}

## 답변`;

    // 4. Gemini로 답변 생성
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const answer = response.text();

    // 5. 소스 정보 정리
    const sources = searchResults.map(r => ({
      fileName: r.document.fileName,
      filePath: r.document.filePath,
      preview: r.document.content.substring(0, 100) + '...',
      score: r.score
    }));

    return NextResponse.json({
      success: true,
      question,
      answer,
      sources,
      hasContext: true,
      contextCount: searchResults.length
    });

  } catch (error) {
    console.error('AI 답변 생성 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'AI 답변 생성 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
