import { apiClient } from '../client';
import type { CmsVisibilityScopeCode } from '@ssoo/types/cms';
import type { ApiResponse, PaginatedResponse } from '../types';

export interface PostItem {
  id: string;
  authorUserId: string;
  title: string | null;
  content: string;
  contentType: string;
  visibilityScopeCode: CmsVisibilityScopeCode;
  targetOrgId: string | null;
  isPinned: boolean;
  viewCount: number;
  boardId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FeedItem {
  post: PostItem;
  author: {
    id: string;
    userName: string;
    displayName: string | null;
    avatarUrl: string | null;
    departmentCode: string | null;
    positionCode: string | null;
  };
  reactionCount: number;
  commentCount: number;
  isLiked: boolean;
  isBookmarked: boolean;
  tags: string[];
}

export const postsApi = {
  feed: (params?: {
    cursor?: string;
    limit?: number;
    feedType?: string;
  }) =>
    apiClient.get<
      ApiResponse<{ items: FeedItem[]; nextCursor: string | null }>
    >('/cms/feed', { params }),

  list: (params?: {
    page?: number;
    pageSize?: number;
    boardId?: string;
    search?: string;
  }) =>
    apiClient.get<PaginatedResponse<PostItem>>('/cms/posts', { params }),

  detail: (id: string) =>
    apiClient.get<ApiResponse<PostItem>>(`/cms/posts/${id}`),

  create: (data: {
    title?: string;
    content: string;
    contentType?: string;
    boardId?: string;
    visibilityScopeCode?: CmsVisibilityScopeCode;
    tagNames?: string[];
  }) => apiClient.post<ApiResponse<PostItem>>('/cms/posts', data),

  update: (
    id: string,
    data: { title?: string; content?: string; visibilityScopeCode?: CmsVisibilityScopeCode },
  ) =>
    apiClient.put<ApiResponse<PostItem>>(`/cms/posts/${id}`, data),

  remove: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/cms/posts/${id}`),

  addReaction: (postId: string, data?: { reactionType?: string }) =>
    apiClient.post<ApiResponse<void>>(
      `/cms/posts/${postId}/reactions`,
      data || {}
    ),

  removeReaction: (postId: string) =>
    apiClient.delete<ApiResponse<void>>(`/cms/posts/${postId}/reactions`),

  addBookmark: (postId: string) =>
    apiClient.post<ApiResponse<void>>(`/cms/posts/${postId}/bookmark`),

  removeBookmark: (postId: string) =>
    apiClient.delete<ApiResponse<void>>(`/cms/posts/${postId}/bookmark`),
};
