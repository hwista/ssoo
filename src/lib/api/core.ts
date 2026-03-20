import { ERROR_MESSAGES } from '@/lib/constants/common';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  signal?: AbortSignal;
}

/**
 * Promise.race 기반 abort 래퍼.
 * signal이 abort되면 즉시 reject하여 대기 중인 fetch를 건너뛴다.
 */
export function raceAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) {
    return Promise.reject(new DOMException('Aborted', 'AbortError'));
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new DOMException('Aborted', 'AbortError'));
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => { signal.removeEventListener('abort', onAbort); resolve(value); },
      (error) => { signal.removeEventListener('abort', onAbort); reject(error); },
    );
  });
}

export async function request<T = unknown>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const {
    method = 'GET',
    headers = {},
    body,
    timeout = 30000,
    signal: externalSignal,
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  try {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };

    const fetchPromise = fetch(url, {
      method,
      headers: defaultHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const response = externalSignal
      ? await raceAbort(fetchPromise, externalSignal)
      : await fetchPromise;

    if (externalSignal?.aborted) {
      return { success: false, error: '요청이 중단되었습니다.' };
    }

    if (!response.ok) {
      const contentType = response.headers.get('content-type') || '';
      let errorText = response.statusText;

      if (contentType.includes('application/json')) {
        try {
          const payload = await response.json() as { error?: string; message?: string };
          errorText = payload.error || payload.message || response.statusText;
        } catch {
          errorText = response.statusText;
        }
      } else {
        const raw = await response.text();
        errorText = raw || response.statusText;
      }

      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    const contentType = response.headers.get('content-type');
    let data: T | undefined;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else if (response.status !== 204) {
      data = await response.text() as unknown as T;
    } else {
      data = undefined;
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: externalSignal?.aborted ? '요청이 중단되었습니다.' : '요청 시간이 초과되었습니다.',
        };
      }

      return {
        success: false,
        error: error.message || ERROR_MESSAGES.NETWORK_ERROR,
      };
    }

    return {
      success: false,
      error: ERROR_MESSAGES.NETWORK_ERROR,
    };
  } finally {
    clearTimeout(timeoutId);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}

export const get = <T = unknown>(
  url: string,
  headers?: Record<string, string>
): Promise<ApiResponse<T>> => request<T>(url, { method: 'GET', headers });

export const post = <T = unknown>(
  url: string,
  body?: unknown,
  headers?: Record<string, string>
): Promise<ApiResponse<T>> => request<T>(url, { method: 'POST', body, headers });

export const put = <T = unknown>(
  url: string,
  body?: unknown,
  headers?: Record<string, string>
): Promise<ApiResponse<T>> => request<T>(url, { method: 'PUT', body, headers });

export const del = <T = unknown>(
  url: string,
  headers?: Record<string, string>
): Promise<ApiResponse<T>> => request<T>(url, { method: 'DELETE', headers });

export function formatApiError(error: string | undefined): string {
  if (!error) return ERROR_MESSAGES.NETWORK_ERROR;
  if (error.includes('404')) return ERROR_MESSAGES.FILE_NOT_FOUND;
  if (error.includes('409')) return ERROR_MESSAGES.FILE_ALREADY_EXISTS;
  if (error.includes('413')) return ERROR_MESSAGES.FILE_TOO_LARGE;
  if (error.includes('timeout') || error.includes('시간')) return '요청 시간이 초과되었습니다.';
  return error;
}

export function getErrorMessage(response: ApiResponse): string {
  return formatApiError(response.error || response.message);
}
