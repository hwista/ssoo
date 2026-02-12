/**
 * AI 모델 프로바이더 설정
 * Vercel AI SDK 기반 - 프로바이더 스위칭 가능한 구조
 *
 * 현재: Azure OpenAI
 * 향후: Google Gemini, Anthropic Claude 등으로 교체 가능
 */

import { createAzure } from '@ai-sdk/azure';
import type { LanguageModel, EmbeddingModel } from 'ai';

/**
 * Azure OpenAI 프로바이더 인스턴스
 */
function getAzureProvider() {
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const resourceName = process.env.AZURE_OPENAI_ENDPOINT;

  if (!apiKey || !resourceName) {
    throw new Error(
      'Azure OpenAI 환경변수가 설정되지 않았습니다. ' +
      'AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT를 확인하세요.'
    );
  }

  return createAzure({
    apiKey,
    resourceName: extractResourceName(resourceName),
  });
}

/**
 * Azure 엔드포인트 URL에서 리소스 이름 추출
 * https://xxx.openai.azure.com/ → xxx
 */
function extractResourceName(endpoint: string): string {
  try {
    const url = new URL(endpoint);
    return url.hostname.split('.')[0];
  } catch {
    return endpoint;
  }
}

/**
 * 채팅/생성용 언어 모델
 * - Ask(질문): RAG 기반 답변 생성
 * - Create(작성): 문서 요약/변환
 */
export function getChatModel(): LanguageModel {
  const azure = getAzureProvider();
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini';
  return azure(deployment);
}

/**
 * 임베딩 모델
 * - Search(검색): 문서 임베딩 생성
 * - Ask(질문): 쿼리 임베딩 생성
 */
export function getEmbeddingModel(): EmbeddingModel {
  const azure = getAzureProvider();
  const deployment = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || 'text-embedding-3-small';
  return azure.textEmbeddingModel(deployment);
}
