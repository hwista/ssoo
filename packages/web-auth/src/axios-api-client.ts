import axios, {
  type AxiosError,
  type AxiosInstance,
  type CreateAxiosDefaults,
  type InternalAxiosRequestConfig,
} from 'axios';
import { readSharedAuthSnapshot } from './storage';
import { restoreSharedAuthSession } from './session-bootstrap';
import { getSsooErrorMessage, readSsooErrorMetadata, parseSsooRetryAfter, type SsooErrorMetadata } from '@ssoo/web-shell';

export class SharedApiError extends Error implements SsooErrorMetadata {
  status?: number;
  code?: string;
  details?: unknown;
  retryAfterSeconds?: number;
  requestId?: string;

  constructor(message: string, status?: number, metadata: Omit<SsooErrorMetadata, 'status'> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = metadata.code;
    this.details = metadata.details;
    this.retryAfterSeconds = metadata.retryAfterSeconds;
    this.requestId = metadata.requestId;
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
  const errorData = error.response?.data as
    | { message?: string; error?: { message?: string } }
    | undefined;
  return getSsooErrorMessage({
    message: errorData?.error?.message || errorData?.message || error.message,
    status: error.response?.status ?? 0,
  }, fallback);
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

      const metadata = readSsooErrorMetadata(error);
      return Promise.reject(
        new SharedApiError(getAxiosErrorMessage(error, defaultErrorMessage), error.response?.status ?? 0, {
          ...metadata,
          retryAfterSeconds: parseSsooRetryAfter(error.response?.headers?.['retry-after']?.toString() ?? null) ?? metadata.retryAfterSeconds,
        }),
      );
    },
  );

  return apiClient;
}
