import { apiClient } from '../client';
import type { ApiResponse } from '../types';

export interface BoardItem {
  id: string;
  boardCode: string;
  boardName: string;
  boardType: string;
  description: string | null;
  sortOrder: number;
  isDefault: boolean;
}

export const boardsApi = {
  list: () => apiClient.get<ApiResponse<BoardItem[]>>('/sns/boards'),

  detail: (id: string) =>
    apiClient.get<ApiResponse<BoardItem>>(`/sns/boards/${id}`),

  create: (data: {
    boardCode: string;
    boardName: string;
    boardType: string;
    description?: string;
  }) => apiClient.post<ApiResponse<BoardItem>>('/sns/boards', data),

  update: (
    id: string,
    data: { boardName?: string; description?: string; sortOrder?: number }
  ) => apiClient.put<ApiResponse<BoardItem>>(`/sns/boards/${id}`, data),

  remove: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/sns/boards/${id}`),
};
