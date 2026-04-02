import type { TemplateItem } from '@/types/template';
import { request, type ApiResponse } from './core';
import { streamSSE, type SSEEvent } from './streaming';

export const templateApi = {
  list: async (): Promise<ApiResponse<{ global: TemplateItem[]; personal: TemplateItem[] }>> => {
    return request('/api/templates');
  },

  listByReferenceDocument: async (docPath: string): Promise<ApiResponse<TemplateItem[]>> => {
    return request(`/api/templates?sourceDocumentPath=${encodeURIComponent(docPath)}`);
  },

  get: async (id: string, scope: 'global' | 'personal' = 'personal'): Promise<ApiResponse<TemplateItem>> => {
    return request(`/api/templates/${encodeURIComponent(id)}?scope=${scope}`);
  },

  upsert: async (
    template: Partial<TemplateItem> & Pick<TemplateItem, 'name' | 'scope' | 'kind' | 'content'>
  ): Promise<ApiResponse<TemplateItem>> => {
    return request('/api/templates', {
      method: 'POST',
      body: template,
    });
  },

  remove: async (id: string, scope: 'global' | 'personal'): Promise<ApiResponse<{ id: string }>> => {
    return request('/api/templates', {
      method: 'DELETE',
      body: { id, scope },
    });
  },

  convertToTemplateStream: async (
    payload: { documentContent: string; documentPath?: string },
    callbacks: { onTextDelta?: (delta: string) => void },
    options?: { signal?: AbortSignal },
  ): Promise<boolean> => {
    return streamSSE({
      url: '/api/templates/convert',
      body: payload,
      signal: options?.signal,
      onEvent: (event: SSEEvent) => {
        if (event.type === 'text-delta' && typeof event.delta === 'string') {
          callbacks.onTextDelta?.(event.delta);
        }
      },
    });
  },
};
