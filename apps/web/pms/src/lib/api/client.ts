import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { clearSharedAuthState, readSharedAuthSnapshot, setSharedAuthSession } from '@ssoo/web-auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

/** API 에러 (HTTP status 정보 보존) */
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
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request Interceptor
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

// Response Interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // 401 에러 & 재시도 안한 경우 -> 세션 복원 시도 (same-origin proxy)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (typeof window !== 'undefined') {
        try {
          const sessionResponse = await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            cache: 'no-store',
          });

          if (sessionResponse.ok) {
            const payload = await sessionResponse.json().catch(() => null) as
              | { accessToken?: string; user?: unknown }
              | null;

            if (typeof payload?.accessToken === 'string') {
              setSharedAuthSession(payload.accessToken, payload.user ?? null);
              originalRequest.headers.Authorization = `Bearer ${payload.accessToken}`;
              return apiClient(originalRequest);
            }
          }

          clearSharedAuthState();
          return Promise.reject(new ApiError('인증이 만료되었습니다.', 401));
        } catch {
          clearSharedAuthState();
          return Promise.reject(new ApiError('인증이 만료되었습니다.', 401));
        }
      }
    }

    // 에러 메시지 추출
    const errorData = error.response?.data as { message?: string } | undefined;
    const message =
      errorData?.message ||
      error.message ||
      '요청 처리 중 오류가 발생했습니다.';

    return Promise.reject(new ApiError(message, error.response?.status));
  },
);
