import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

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
    // 클라이언트 사이드에서만 토큰 추가
    if (typeof window !== 'undefined') {
      const authStorage = localStorage.getItem('ssoo-auth');
      if (authStorage) {
        try {
          const { state } = JSON.parse(authStorage);
          if (state?.accessToken && !config.headers.Authorization) {
            config.headers.Authorization = `Bearer ${state.accessToken}`;
          }
        } catch {
          // 파싱 실패 무시
        }
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

    // 401 에러 & 재시도 안한 경우 -> 토큰 갱신 시도
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (typeof window !== 'undefined') {
        const authStorage = localStorage.getItem('ssoo-auth');
        if (authStorage) {
          try {
            const { state, version } = JSON.parse(authStorage);
            if (state?.refreshToken) {
              // 토큰 갱신 요청
              const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                refreshToken: state.refreshToken,
              });

              if (refreshResponse.data?.success && refreshResponse.data?.data) {
                const { accessToken, refreshToken } = refreshResponse.data.data;

                // 스토어 업데이트 (Zustand persist 형식 유지)
                const newState = {
                  ...state,
                  accessToken,
                  refreshToken,
                };
                localStorage.setItem('ssoo-auth', JSON.stringify({ state: newState, version: version ?? 0 }));

                // 원래 요청 재시도
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return apiClient(originalRequest);
              }
            }
          } catch {
            // 토큰 갱신 실패 - 인증 정보 제거 (React 라우터에서 리다이렉트 처리)
            localStorage.removeItem('ssoo-auth');
            return Promise.reject(new ApiError('인증이 만료되었습니다.', 401));
          }
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
