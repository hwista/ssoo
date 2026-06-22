import type {
  CommonSearchRequest,
  CommonSearchResponse,
  CommonSearchSourceApp,
} from '@ssoo/types/common';
import { createSharedAxiosApiClient } from './axios-api-client';

export interface CommonSearchApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  status?: number;
  details?: unknown;
}

export interface CreateCommonSearchApiOptions {
  baseURL: string;
  searchPath?: string;
  timeout?: number;
}

export interface CommonSearchApi {
  search: (request: CommonSearchRequest) => Promise<CommonSearchApiResult<CommonSearchResponse>>;
}

function normalizeSearchPath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

function getErrorPayload(error: unknown): CommonSearchApiResult<CommonSearchResponse> {
  if (error instanceof Error) {
    const status = (error as { status?: unknown }).status;
    return {
      success: false,
      error: error.message,
      status: typeof status === 'number' ? status : undefined,
    };
  }

  return {
    success: false,
    error: '검색 요청 처리 중 오류가 발생했습니다.',
  };
}

export function createCommonSearchApi({
  baseURL,
  searchPath = '/search',
  timeout = 15000,
}: CreateCommonSearchApiOptions): CommonSearchApi {
  const client = createSharedAxiosApiClient({
    baseURL,
    timeout,
    defaultErrorMessage: '검색 요청 처리 중 오류가 발생했습니다.',
  });
  const endpoint = normalizeSearchPath(searchPath);

  return {
    async search(request) {
      try {
        const params: Record<string, string> = {
          q: request.query,
        };

        if (request.sourceApp) {
          params.sourceApp = request.sourceApp;
        }
        if (request.entityTypes && request.entityTypes.length > 0) {
          params.entityTypes = request.entityTypes.join(',');
        }
        if (request.limit) {
          params.limit = String(request.limit);
        }

        const response = await client.get<CommonSearchApiResult<CommonSearchResponse>>(endpoint, { params });
        return response.data;
      } catch (error) {
        return getErrorPayload(error);
      }
    },
  };
}

export function buildCommonSearchRequest(
  query: string,
  sourceApp?: CommonSearchSourceApp,
): CommonSearchRequest {
  const request: CommonSearchRequest = { query };
  if (sourceApp) {
    request.sourceApp = sourceApp;
  }
  return request;
}
