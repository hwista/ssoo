import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { readSharedAuthSnapshot, restoreSharedAuthSession } from '@ssoo/web-auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const snapshot = readSharedAuthSnapshot();
      if (snapshot?.accessToken && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${snapshot.accessToken}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (typeof window !== 'undefined') {
        const restored = await restoreSharedAuthSession();

        if (restored.success) {
          originalRequest.headers.Authorization = `Bearer ${restored.accessToken}`;
          return apiClient(originalRequest);
        }

        if (restored.clearedAuth) {
          return Promise.reject(new ApiError('인증이 만료되었습니다.', 401));
        }

        return Promise.reject(
          new ApiError(
            restored.error || '세션 복원 중 오류가 발생했습니다.',
            restored.status ?? error.response?.status,
          ),
        );
      }
    }

    const errorData = error.response?.data as { message?: string } | undefined;
    const message = errorData?.message || error.message || '요청 처리 중 오류가 발생했습니다.';

    return Promise.reject(new ApiError(message, error.response?.status));
  },
);
