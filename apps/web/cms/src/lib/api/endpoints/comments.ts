import { apiClient } from '../client';
import type { ApiResponse } from '../types';

export interface CommentItem {
  id: string;
  postId: string;
  authorUserId: string;
  parentCommentId: string | null;
  content: string;
  depth: number;
  createdAt: string;
  author?: {
    id: string;
    userName: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export const commentsApi = {
  list: (postId: string) =>
    apiClient.get<ApiResponse<CommentItem[]>>(
      `/cms/posts/${postId}/comments`
    ),

  create: (
    postId: string,
    data: { content: string; parentCommentId?: string }
  ) =>
    apiClient.post<ApiResponse<CommentItem>>(
      `/cms/posts/${postId}/comments`,
      data
    ),

  update: (id: string, data: { content: string }) =>
    apiClient.put<ApiResponse<CommentItem>>(`/cms/comments/${id}`, data),

  remove: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/cms/comments/${id}`),
};
