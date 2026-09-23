import { apiClient } from '../client';
import type { SnsVisibilityScopeCode } from '@ssoo/types/sns';
import type { ApiResponse, PaginatedResponse } from '../types';

export interface PostItem {
  attachments?: PostImage[];
  id: string;
  authorUserId: string;
  title: string | null;
  content: string;
  contentType: string;
  visibilityScopeCode: SnsVisibilityScopeCode;
  targetOrgId: string | null;
  isPinned: boolean;
  viewCount: number;
  boardId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PostImage { id: string; fileName: string; mimeType: string; fileSize: string }

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
  image: (postId: string, imageId: string, signal?: AbortSignal) =>
    apiClient.get<Blob>(`/sns/posts/${encodeURIComponent(postId)}/images/${encodeURIComponent(imageId)}`, { responseType: 'blob', signal }),

  createWithImages: (data: { content: string; visibilityScopeCode?: SnsVisibilityScopeCode; submissionId: string; images: File[] }) => {
    const form = new FormData();
    form.append('content', data.content);
    form.append('visibilityScopeCode', data.visibilityScopeCode ?? 'public');
    form.append('submissionId', data.submissionId);
    for (const file of data.images) form.append('images', file);
    return apiClient.post<ApiResponse<PostItem>>('/sns/posts/with-images', form, { headers: { 'Content-Type': undefined }, timeout: 60_000 });
  },
  feed: (params?: {
    cursor?: string;
    limit?: number;
    feedType?: string;
    authorUserId?: string;
  }) =>
    apiClient.get<
      ApiResponse<{ items: FeedItem[]; nextCursor: string | null }>
    >('/sns/feed', { params }),

  list: (params?: {
    page?: number;
    pageSize?: number;
    boardId?: string;
    search?: string;
  }) =>
    apiClient.get<PaginatedResponse<PostItem>>('/sns/posts', { params }),

  detail: (id: string) =>
    apiClient.get<ApiResponse<PostItem>>(`/sns/posts/${id}`),

  sharedPost: (id: string, signal?: AbortSignal) =>
    apiClient.get<ApiResponse<FeedItem>>(`/sns/feed/posts/${encodeURIComponent(id)}`, { signal }),

  create: (data: {
    title?: string;
    content: string;
    contentType?: string;
    boardId?: string;
    visibilityScopeCode?: SnsVisibilityScopeCode;
    tagNames?: string[];
  }) => apiClient.post<ApiResponse<PostItem>>('/sns/posts', data),

  update: (
    id: string,
    data: { title?: string; content?: string; visibilityScopeCode?: SnsVisibilityScopeCode },
  ) =>
    apiClient.put<ApiResponse<PostItem>>(`/sns/posts/${id}`, data),

  remove: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/sns/posts/${id}`),

  addReaction: (postId: string, data?: { reactionType?: string }) =>
    apiClient.post<ApiResponse<void>>(
      `/sns/posts/${postId}/reactions`,
      data || {}
    ),

  removeReaction: (postId: string) =>
    apiClient.delete<ApiResponse<void>>(`/sns/posts/${postId}/reactions`),

  addBookmark: (postId: string) =>
    apiClient.post<ApiResponse<void>>(`/sns/posts/${postId}/bookmark`),

  removeBookmark: (postId: string) =>
    apiClient.delete<ApiResponse<void>>(`/sns/posts/${postId}/bookmark`),
};
