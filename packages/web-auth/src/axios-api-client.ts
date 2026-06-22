import axios, {
  type AxiosError,
  type AxiosInstance,
  type CreateAxiosDefaults,
  type InternalAxiosRequestConfig,
} from 'axios';
import { readSharedAuthSnapshot } from './storage';
import { restoreSharedAuthSession } from './session-bootstrap';

export class SharedApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export interface CreateSharedAxiosApiClientOptions {
  baseURL: string;
  timeout?: number;
  headers?: CreateAxiosDefaults['headers'];
  defaultErrorMessage?: string;
  expiredSessionMessage?: string;
  sessionRestoreErrorMessage?: string;
}

function getAxiosErrorMessage(error: AxiosError, fallback: string): string {
  const errorData = error.response?.data as { message?: string } | undefined;
  return errorData?.message || error.message || fallback;
}

export function createSharedAxiosApiClient({
  baseURL,
  timeout = 5000,
  headers,
  defaultErrorMessage = '요청 처리 중 오류가 발생했습니다.',
  expiredSessionMessage = '인증이 만료되었습니다.',
  sessionRestoreErrorMessage = '세션 복원 중 오류가 발생했습니다.',
}: CreateSharedAxiosApiClientOptions): AxiosInstance {
  const apiClient = axios.create({
    baseURL,
    timeout,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    withCredentials: true,
  });

  apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      if (typeof window === 'undefined') {
        return config;
      }

      const snapshot = readSharedAuthSnapshot();
      if (snapshot?.accessToken && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${snapshot.accessToken}`;
      }
      return config;
    },
    (error) => Promise.reject(error),
  );

  apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as
        | (InternalAxiosRequestConfig & { _retry?: boolean })
        | undefined;

      if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
        originalRequest._retry = true;

        if (typeof window !== 'undefined') {
          const restored = await restoreSharedAuthSession();

          if (restored.success) {
            originalRequest.headers.Authorization = `Bearer ${restored.accessToken}`;
            return apiClient(originalRequest);
          }

          if (restored.clearedAuth) {
            return Promise.reject(new SharedApiError(expiredSessionMessage, 401));
          }

          return Promise.reject(
            new SharedApiError(
              restored.error || sessionRestoreErrorMessage,
              restored.status ?? error.response?.status,
            ),
          );
        }
      }

      return Promise.reject(
        new SharedApiError(getAxiosErrorMessage(error, defaultErrorMessage), error.response?.status),
      );
    },
  );

  return apiClient;
}
