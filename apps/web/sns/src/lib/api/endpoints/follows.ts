import { apiClient } from '../client';
import type { ApiResponse, PaginatedResponse } from '../types';

interface FollowUser {
  id: string;
  userName: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export const followsApi = {
  follow: (userId: string) =>
    apiClient.post<ApiResponse<void>>(`/sns/follows/${userId}`),

  unfollow: (userId: string) =>
    apiClient.delete<ApiResponse<void>>(`/sns/follows/${userId}`),

  followers: (params?: { page?: number; pageSize?: number }) =>
    apiClient.get<PaginatedResponse<FollowUser>>('/sns/follows/followers', {
      params,
    }),

  following: (params?: { page?: number; pageSize?: number }) =>
    apiClient.get<PaginatedResponse<FollowUser>>('/sns/follows/following', {
      params,
    }),
};
