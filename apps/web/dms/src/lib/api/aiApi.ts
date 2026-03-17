import type { TemplateItem } from '@/types/template';
import { request, type ApiResponse } from './core';

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
  contextMode?: 'wiki' | 'deep';
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
    options?: { contextMode?: 'wiki' | 'deep'; activeDocPath?: string }
  ): Promise<ApiResponse<AiSearchResponse>> => {
    return request('/api/search', {
      method: 'POST',
      body: { query, ...options },
    });
  },

  ask: async (
    query: string,
    options?: { contextMode?: 'wiki' | 'deep'; activeDocPath?: string; stream?: boolean }
  ): Promise<ApiResponse<AiAskResponse>> => {
    return request('/api/ask', {
      method: 'POST',
      body: { query, ...options },
    });
  },
};

export const docAssistApi = {
  compose: async (payload: {
    instruction: string;
    currentContent: string;
    selectedText?: string;
    activeDocPath?: string;
    templates?: TemplateItem[];
    summaryFiles?: DocAssistSummaryFileClient[];
  }): Promise<ApiResponse<DocAssistComposeResponse>> => {
    return request('/api/doc-assist', {
      method: 'POST',
      body: payload,
    });
  },
  recommendPath: async (payload: {
    instruction: string;
    activeDocPath?: string;
    selectedText?: string;
    templates?: TemplateItem[];
    summaryFiles?: DocAssistSummaryFileClient[];
  }): Promise<ApiResponse<DocAssistRecommendResponse>> => {
    return request('/api/doc-assist', {
      method: 'POST',
      body: { action: 'recommendPath', ...payload },
    });
  },
};
