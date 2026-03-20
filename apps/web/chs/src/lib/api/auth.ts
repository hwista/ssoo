import { apiClient } from './client';
import type { ApiResponse } from './types';

interface LoginRequest {
  loginId: string;
  password: string;
}

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

interface AuthUser {
  userId: string;
  loginId: string;
  roleCode: string;
  userTypeCode: string;
  isAdmin: boolean;
}

export const authApi = {
  login: async (data: LoginRequest): Promise<ApiResponse<TokenResponse>> => {
    const res = await apiClient.post('/auth/login', data);
    return res.data;
  },

  logout: async (token: string): Promise<void> => {
    await apiClient.post('/auth/logout', null, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  refresh: async (refreshToken: string): Promise<ApiResponse<TokenResponse>> => {
    const res = await apiClient.post('/auth/refresh', { refreshToken });
    return res.data;
  },

  me: async (token: string): Promise<ApiResponse<AuthUser>> => {
    const res = await apiClient.get('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },
};
