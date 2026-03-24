import { apiClient } from '../client';
import type { ApiResponse, PaginatedResponse } from '../types';

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
  list: (params?: { page?: number; pageSize?: number }) =>
    apiClient.get<PaginatedResponse<BoardItem>>('/chs/boards', { params }),

  detail: (id: string) =>
    apiClient.get<ApiResponse<BoardItem>>(`/chs/boards/${id}`),

  create: (data: {
    boardCode: string;
    boardName: string;
    boardType: string;
    description?: string;
  }) => apiClient.post<ApiResponse<BoardItem>>('/chs/boards', data),

  update: (
    id: string,
    data: { boardName?: string; description?: string; sortOrder?: number }
  ) => apiClient.put<ApiResponse<BoardItem>>(`/chs/boards/${id}`, data),

  remove: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/chs/boards/${id}`),
};
