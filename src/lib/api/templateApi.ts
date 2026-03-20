import type { TemplateItem } from '@/types/template';
import { request, type ApiResponse } from './core';

export const templateApi = {
  list: async (): Promise<ApiResponse<{ global: TemplateItem[]; personal: TemplateItem[] }>> => {
    return request('/api/templates');
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
};
