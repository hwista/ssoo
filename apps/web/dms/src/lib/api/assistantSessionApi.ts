import { request, type ApiResponse } from './core';

export interface AssistantSessionPayload {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: unknown[];
  persistedToDb?: boolean;
}

export const assistantSessionApi = {
  list: async (_clientId: string, limit = 100): Promise<ApiResponse<AssistantSessionPayload[]>> => {
    const query = new URLSearchParams({ limit: String(limit) });
    return request<AssistantSessionPayload[]>(`/api/chat-sessions?${query.toString()}`);
  },

  save: async (
    _clientId: string,
    session: AssistantSessionPayload
  ): Promise<ApiResponse<{ id: string }>> => {
    return request<{ id: string }>('/api/chat-sessions', {
      method: 'POST',
      body: { session },
    });
  },

  remove: async (_clientId: string, sessionId: string): Promise<ApiResponse<{ id: string }>> => {
    return request<{ id: string }>('/api/chat-sessions', {
      method: 'DELETE',
      body: { sessionId },
    });
  },
};
