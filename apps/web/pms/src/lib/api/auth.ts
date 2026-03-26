import { apiClient } from './client';
import type { ApiResponse } from './types';

export interface LoginRequest {
  loginId: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserInfo {
  userId: string;
  loginId: string;
  roleCode: string;
  userTypeCode: string;
  isAdmin: boolean; // 관리자 여부 (관리자 메뉴 접근 권한)
}

export const authApi = {
  /**
   * 로그인
   */
  login: async (data: LoginRequest): Promise<ApiResponse<AuthTokens>> => {
    const response = await apiClient.post<ApiResponse<AuthTokens>>('/auth/login', data);
    return response.data;
  },

  /**
   * 토큰 갱신
   */
  refresh: async (refreshToken: string): Promise<ApiResponse<AuthTokens>> => {
    const response = await apiClient.post<ApiResponse<AuthTokens>>('/auth/refresh', {
      refreshToken,
    });
    return response.data;
  },

  /**
   * 로그아웃
   */
  logout: async (accessToken: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.post<ApiResponse<null>>(
      '/auth/logout',
      {},
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    return response.data;
  },

  /**
   * 현재 사용자 정보
   */
  me: async (accessToken: string): Promise<ApiResponse<UserInfo>> => {
    const response = await apiClient.post<ApiResponse<UserInfo>>(
      '/auth/me',
      {},
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    return response.data;
  },
};
