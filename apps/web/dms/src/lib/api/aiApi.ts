import type { TemplateItem } from '@/types/template';
import { request, type ApiResponse } from './core';
import { streamSSE, type SSEEvent } from './streaming';

export interface AiSearchResultItem {
  id: string;
  title: string;
  excerpt: string;
  path: string;
  score: number;
  summary?: string;
  snippets?: string[];
  totalSnippetCount?: number;
}

export interface AiSearchResponse {
  query: string;
  results: AiSearchResultItem[];
  contextMode?: 'doc' | 'deep';
  confidence?: 'high' | 'medium' | 'low';
  citations?: Array<{
    title: string;
    storageUri: string;
    versionId?: string;
    webUrl?: string;
  }>;
}

export interface AiAskResponse {
  query: string;
  answer: string;
  sources: AiSearchResultItem[];
  confidence?: 'high' | 'medium' | 'low';
  citations?: Array<{
    title: string;
    storageUri: string;
    versionId?: string;
    webUrl?: string;
  }>;
}

export interface DocAssistSummaryFileClient {
  id?: string;
  name: string;
  type?: string;
  textContent: string;
  images?: { base64: string; mimeType: string; name: string }[];
}

export interface DocAssistComposeResponse {
  text: string;
  applyMode: 'replace-document' | 'replace-selection' | 'append' | 'insert';
  suggestedPath: string;
  relevanceWarnings: string[];
}

export interface DocAssistRecommendResponse {
  suggestedPath: string;
  relevanceWarnings: string[];
}

export const aiApi = {
  search: async (
    query: string,
    options?: { contextMode?: 'doc' | 'deep'; activeDocPath?: string; signal?: AbortSignal }
  ): Promise<ApiResponse<AiSearchResponse>> => {
    const { signal, ...body } = options ?? {};
    return request('/api/search', {
      method: 'POST',
      body: { query, ...body },
      signal,
    });
  },

  ask: async (
    query: string,
    options?: { contextMode?: 'doc' | 'deep'; activeDocPath?: string; stream?: boolean }
  ): Promise<ApiResponse<AiAskResponse>> => {
    return request('/api/ask', {
      method: 'POST',
      body: { query, ...options },
    });
  },
};

export interface DocAssistTitleAndPathResponse {
  suggestedTitle: string;
  suggestedDirectory: string;
  suggestedFileName: string;
}

export interface DocAssistComposeCallbacks {
  onMeta?: (meta: { applyMode: string; suggestedPath: string; relevanceWarnings: string[] }) => void;
  onTextDelta?: (delta: string) => void;
}

export const docAssistApi = {
  /**
   * 스트리밍 기반 compose. SSE reader 루프 + abort 체크로 즉시 중단 가능.
   * @returns 완료 시 true, abort 시 false
   */
  composeStream: async (
    payload: {
      instruction: string;
      currentContent: string;
      selectedText?: string;
      activeDocPath?: string;
      templates?: TemplateItem[];
      summaryFiles?: DocAssistSummaryFileClient[];
      contentType?: 'document' | 'template';
    },
    callbacks: DocAssistComposeCallbacks,
    options?: { signal?: AbortSignal },
  ): Promise<boolean> => {
    return streamSSE({
      url: '/api/doc-assist',
      body: payload,
      signal: options?.signal,
      onEvent: (event: SSEEvent) => {
        if (event.type === 'meta') {
          callbacks.onMeta?.({
            applyMode: event.applyMode as string,
            suggestedPath: event.suggestedPath as string,
            relevanceWarnings: event.relevanceWarnings as string[],
          });
        } else if (event.type === 'text-delta' && typeof event.delta === 'string') {
          callbacks.onTextDelta?.(event.delta);
        }
      },
    });
  },
  /** 비스트리밍 compose — 태그 추출, 요약 등 짧은 요청용 */
  compose: async (payload: {
    instruction: string;
    currentContent: string;
    selectedText?: string;
    activeDocPath?: string;
    templates?: TemplateItem[];
    summaryFiles?: DocAssistSummaryFileClient[];
    contentType?: 'document' | 'template';
  }, options?: { signal?: AbortSignal }): Promise<ApiResponse<DocAssistComposeResponse>> => {
    return request('/api/doc-assist', {
      method: 'POST',
      body: { ...payload, stream: false },
      timeout: 120000,
      signal: options?.signal,
    });
  },
  recommendPath: async (payload: {
    instruction: string;
    activeDocPath?: string;
    selectedText?: string;
    templates?: TemplateItem[];
    summaryFiles?: DocAssistSummaryFileClient[];
  }, options?: { signal?: AbortSignal }): Promise<ApiResponse<DocAssistRecommendResponse>> => {
    return request('/api/doc-assist', {
      method: 'POST',
      body: { action: 'recommendPath', ...payload },
      signal: options?.signal,
    });
  },
  recommendTitleAndPath: async (payload: {
    currentContent: string;
    activeDocPath?: string;
    contentType?: 'document' | 'template';
  }, options?: { signal?: AbortSignal }): Promise<ApiResponse<DocAssistTitleAndPathResponse>> => {
    return request('/api/doc-assist', {
      method: 'POST',
      body: { action: 'recommendTitleAndPath', ...payload },
      signal: options?.signal,
    });
  },
};
