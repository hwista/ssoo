import fs from 'fs';
import path from 'path';
import { generateText, streamText } from 'ai';
import { logger } from '@/lib/utils/errorUtils';
import { normalizePath } from '@/server/utils/pathUtils';
import { configService } from '@/server/services/config/ConfigService';
import { getChatModel } from './provider';
import { buildCitations, inferConfidence, searchDocuments, searchDocumentsKeyword } from './searchService';
import type { AiContextOptions, AskResponse, HandlerResult, SearchResultItem } from './types';

const IMPLEMENTATION_CONTEXT = [
  'DMS 실제 구현 기능 스냅샷(코드 기준):',
  '- 라우트/API: /api/search(문서 검색), /api/ask(대화형 답변), /api/create(요약 API), /api/doc-assist(인라인 문서작성), /api/file, /api/files, /api/git, /api/settings',
  '- 주요 화면 경로: /home, /doc/{path}, /doc/new(직접 작성+인라인 AI), /ai/search(AI 검색), /settings',
  '- 상단 헤더 기능: 검색 입력(Enter 시 /ai/search 탭), 새 도큐먼트(/doc/new)',
  '- 플로팅 AI 어시스턴트: 질문/검색 의도 분기, 문서 검색 결과 카드, 헬프 액션 버튼(기능 화면으로 즉시 이동)',
  '- 문서 검색 방식: pgvector 시맨틱 검색 우선, 실패/무결과 시 키워드 검색 폴백',
  '- 답변 생성 방식: RAG(검색 문맥 주입) + 대화형 응답, 문맥 부족 시 보조 설명 제공',
].join('\n');

function getRootDir(): string {
  return configService.getDocDir();
}

function buildAssistantSystemPrompt(options?: { attachmentOnly?: boolean }): string {
  const attachmentOnlyRule = options?.attachmentOnly
    ? `
- 현재 대화는 "첨부 파일 기반 모드"입니다.
- 답변은 반드시 사용자가 첨부한 파일 컨텍스트만 근거로 작성하세요.
- 전역 문서 검색 결과, 시스템 구현 지식, 일반 추측을 근거로 단정하지 마세요.
- 첨부 내용에서 확인되지 않으면 "첨부 파일 기준 확인되지 않음"이라고 명시하세요.`
    : '';

  return `당신은 DMS(문서 관리 시스템)의 AI 어시스턴트입니다.
사용자의 질문에 대해 "실제 구현 컨텍스트"와 "문서 컨텍스트"를 우선 활용하고, 대화 맥락을 반영해 실무적으로 답변하세요.

규칙:
- 답변 우선순위는 1) 실제 구현 컨텍스트 2) 문서 컨텍스트 3) 일반 보조 설명 순서입니다.
- 이전 대화 흐름(직전 질문/답변)을 이어받아 답변하세요.
- 기능/사용법 질문에는 실제 경로, 버튼명, 동작 흐름을 단계로 제시하세요.
- 답변은 한국어 마크다운으로 작성하되, 과한 장식 없이 읽기 쉬운 수준만 사용하세요.
- 첫 문단은 짧게 요지를 정리하고, 필요할 때만 목록/번호 목록/표/코드블록을 사용하세요.
- 문서 컨텍스트에 근거가 있으면 이를 사용하고, 답변 마지막에 "## 근거 문서" 섹션으로 제목과 경로를 짧게 정리하세요.
- 문서 컨텍스트가 부족해도 대화를 중단하지 말고, 일반적인 보조 설명을 제공하세요.
- 단, 문서에 없는 내용은 "문서 기준 확인되지 않은 보조 설명"임을 짧게 구분해 표현하세요.
- 구현 컨텍스트로 답할 수 있는데 "관련 문서를 찾지 못했습니다"라고 답하지 마세요.
- 구현/문서 모두에서 확인 불가한 사실은 "현재 코드/문서 기준 미확인"이라고 명시하세요.
- 문서 근거를 실제로 사용하지 않았으면 "## 근거 문서" 섹션은 생략하세요.${attachmentOnlyRule}`;
}

async function gatherRAGContext(
  query: string,
  options?: AiContextOptions
): Promise<{ context: string; sources: SearchResultItem[] }> {
  const keywordResult = await searchDocumentsKeyword(query, options);
  const semanticResult = await searchDocuments(query, options);
  const preferred = semanticResult.success ? semanticResult : keywordResult;

  if (preferred.success && preferred.data.results.length > 0) {
    const topResults = preferred.data.results.slice(0, 3);
    const context = topResults
      .map((result, index) => {
        try {
          const fullPath = path.join(getRootDir(), normalizePath(result.path));
          const content = fs.readFileSync(fullPath, 'utf-8').slice(0, 2000);
          return `[문서 ${index + 1}: ${result.title}]\n경로: ${result.path}\n${content}`;
        } catch {
          return `[문서 ${index + 1}: ${result.title}]\n경로: ${result.path}\n${result.excerpt}`;
        }
      })
      .join('\n\n---\n\n');

    return { context, sources: topResults };
  }

  return { context: '', sources: [] };
}

export async function askQuestionStream(
  _query: string,
  messages: Array<{ role: string; content: string }>,
  options?: { attachmentOnly?: boolean; signal?: AbortSignal }
) {
  const model = await getChatModel();

  return streamText({
    model,
    system: buildAssistantSystemPrompt(options),
    abortSignal: options?.signal,
    messages: messages.map((message) => ({
      role: message.role as 'user' | 'assistant' | 'system',
      content: message.content,
    })),
    onError: (error: unknown) => {
      if (options?.signal?.aborted) return;
      const err = error instanceof Error ? error : (error as Record<string, unknown>)?.error;
      const errObj = err instanceof Error ? err : null;
      logger.error('AI 스트리밍 에러', {
        message: errObj?.message ?? String(error),
        name: errObj?.name,
        cause: errObj?.cause,
        stack: errObj?.stack?.split('\n').slice(0, 3).join('\n'),
        raw: JSON.stringify(error, null, 2),
      });
    },
  });
}

export async function askQuestion(
  query: string,
  messages: Array<{ role: string; content: string }>,
  options?: { contextMode?: 'doc' | 'deep'; activeDocPath?: string }
): Promise<HandlerResult<AskResponse>> {
  try {
    const model = await getChatModel();
    const completion = await generateText({
      model,
      temperature: 0.2,
      maxOutputTokens: 512,
      system: buildAssistantSystemPrompt(),
      messages: messages.map((item) => ({
        role: item.role as 'user' | 'assistant' | 'system',
        content: item.content,
      })),
    });

    const sourceResult = await searchDocuments(query, options);
    const sources = sourceResult.success ? sourceResult.data.results.slice(0, 5) : [];

    return {
      success: true,
      data: {
        query,
        answer: completion.text,
        sources,
        confidence: inferConfidence(sources.length),
        citations: options?.contextMode === 'deep' ? buildCitations(sources) : [],
      },
    };
  } catch (error) {
    logger.error('질문 응답 생성 실패', error, { query });
    return {
      success: false,
      error: '질문 처리 중 오류가 발생했습니다.',
      status: 500,
    };
  }
}

export async function buildRAGMessages(
  query: string,
  chatHistory: Array<{ role: string; content: string }>,
  options?: { skipSearch?: boolean; includeImplementationContext?: boolean; contextMode?: 'doc' | 'deep'; activeDocPath?: string; templates?: Array<{ name: string; content: string }> }
): Promise<{
  messages: Array<{ role: string; content: string }>;
  sources: SearchResultItem[];
}> {
  const includeImplementationContext = options?.includeImplementationContext ?? true;
  const { context, sources } = options?.skipSearch
    ? { context: '', sources: [] as SearchResultItem[] }
    : await gatherRAGContext(query, { contextMode: options?.contextMode, activeDocPath: options?.activeDocPath });

  const messages = chatHistory.map((msg, index) => {
    if (index === chatHistory.length - 1 && msg.role === 'user') {
      const sections: string[] = [];
      if (includeImplementationContext) {
        sections.push(`[시스템 구현 컨텍스트]\n${IMPLEMENTATION_CONTEXT}`);
      }
      if (context) {
        sections.push(`[참조 문서]\n${context}`);
      }
      if (options?.templates && options.templates.length > 0) {
        const templateSections = options.templates
          .slice(0, 3)
          .map((t) => `[문서 템플릿: ${t.name}]\n${t.content.slice(0, 1500)}`)
          .join('\n\n');
        sections.push(templateSections);
      }
      if (sections.length === 0) return msg;
      return {
        role: msg.role,
        content: `${sections.join('\n\n')}\n\n[사용자 질문]\n${msg.content}`,
      };
    }
    return msg;
  });

  return { messages, sources };
}
