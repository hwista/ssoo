/**
 * API 클라이언트 유틸리티
 * 중복된 fetch API 호출 패턴을 표준화하고 일관된 에러 처리를 제공
 */

import { ERROR_MESSAGES } from './constants';

/**
 * API 응답 타입 정의
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * API 요청 옵션
 */
export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

/**
 * 파일 API 액션 타입
 */
export type FileAction = 
  | 'create' 
  | 'read' 
  | 'update' 
  | 'delete' 
  | 'rename' 
  | 'createFolder'
  | 'deleteFolder';

/**
 * 파일 API 요청 인터페이스
 */
export interface FileApiRequest {
  action: FileAction;
  path?: string;
  content?: string;
  name?: string;
  parent?: string;
  oldPath?: string;
  newPath?: string;
}

/**
 * HTTP 요청을 수행하는 기본 클라이언트 함수
 */
async function request<T = unknown>(
  url: string, 
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const {
    method = 'GET',
    headers = {},
    body,
    timeout = 30000
  } = options;

  try {
    // 기본 헤더 설정
    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };

    // AbortController로 타임아웃 처리
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // fetch 요청 실행
    const response = await fetch(url, {
      method,
      headers: defaultHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // 응답 처리
    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText || response.statusText}`
      };
    }

    // JSON 응답 파싱 시도
    const contentType = response.headers.get('content-type');
    let data: T;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text() as unknown as T;
    }

    return {
      success: true,
      data
    };

  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: '요청 시간이 초과되었습니다.'
        };
      }
      return {
        success: false,
        error: error.message || ERROR_MESSAGES.NETWORK_ERROR
      };
    }
    
    return {
      success: false,
      error: ERROR_MESSAGES.NETWORK_ERROR
    };
  }
}

/**
 * 파일 API 클라이언트
 */
export const fileApi = {
  /**
   * 파일 생성
   */
  create: async (path: string, content: string): Promise<ApiResponse> => {
    return request('/api/file', {
      method: 'POST',
      body: { action: 'create', path, content }
    });
  },

  /**
   * 파일 읽기
   */
  read: async (path: string): Promise<ApiResponse<string>> => {
    return request('/api/file', {
      method: 'POST',
      body: { action: 'read', path }
    });
  },

  /**
   * 파일 메타데이터만 가져오기
   */
  getMetadata: async (path: string): Promise<ApiResponse> => {
    return request('/api/file', {
      method: 'POST',
      body: { action: 'metadata', path }
    });
  },

  /**
   * 파일 내용 업데이트
   */
  update: async (path: string, content: string): Promise<ApiResponse> => {
    console.log('fileApi.update 호출:', { path, contentLength: content.length });
    const response = await request('/api/file', {
      method: 'POST',
      body: { action: 'write', path, content }
    });
    console.log('fileApi.update 응답:', response);
    return response;
  },

  /**
   * 파일 삭제
   */
  delete: async (path: string): Promise<ApiResponse> => {
    return request('/api/file', {
      method: 'POST',
      body: { action: 'delete', path }
    });
  },

  /**
   * 파일 이름 변경
   */
  rename: async (oldPath: string, newPath: string): Promise<ApiResponse> => {
    return request('/api/file', {
      method: 'POST',
      body: { action: 'rename', oldPath, newPath }
    });
  },

  /**
   * 폴더 생성
   */
  createFolder: async (path: string): Promise<ApiResponse> => {
    return request('/api/file', {
      method: 'POST',
      body: { action: 'createFolder', path }
    });
  },

  /**
   * 폴더 삭제
   */
  deleteFolder: async (path: string): Promise<ApiResponse> => {
    return request('/api/file', {
      method: 'POST',
      body: { action: 'deleteFolder', path }
    });
  },

  /**
   * 파일과 함께 작업하는 범용 API 호출
   */
  executeAction: async (actionData: FileApiRequest): Promise<ApiResponse> => {
    return request('/api/file', {
      method: 'POST',
      body: actionData
    });
  }
};

/**
 * 파일 목록 API 클라이언트
 */
export const filesApi = {
  /**
   * 파일 트리 조회
   */
  getFileTree: async (): Promise<ApiResponse> => {
    return request('/api/files');
  },

  /**
   * 특정 경로의 파일 목록 조회
   */
  getFiles: async (path?: string): Promise<ApiResponse> => {
    const url = path ? `/api/files?path=${encodeURIComponent(path)}` : '/api/files';
    return request(url);
  }
};

/**
 * HTTP GET 요청
 */
export const get = <T = unknown>(url: string, headers?: Record<string, string>): Promise<ApiResponse<T>> => {
  return request<T>(url, { method: 'GET', headers });
};

/**
 * HTTP POST 요청
 */
export const post = <T = unknown>(url: string, body?: unknown, headers?: Record<string, string>): Promise<ApiResponse<T>> => {
  return request<T>(url, { method: 'POST', body, headers });
};

/**
 * HTTP PUT 요청
 */
export const put = <T = unknown>(url: string, body?: unknown, headers?: Record<string, string>): Promise<ApiResponse<T>> => {
  return request<T>(url, { method: 'PUT', body, headers });
};

/**
 * HTTP DELETE 요청
 */
export const del = <T = unknown>(url: string, headers?: Record<string, string>): Promise<ApiResponse<T>> => {
  return request<T>(url, { method: 'DELETE', headers });
};

/**
 * 헤더가 있는 파일 읽기 (특별한 헤더가 필요한 경우)
 */
export const getFileWithHeaders = async (filePath: string): Promise<ApiResponse<string>> => {
  return request('/api/file', {
    method: 'GET',
    headers: {
      'x-file-path': filePath
    }
  });
};

/**
 * API 에러를 사용자 친화적 메시지로 변환
 */
export function formatApiError(error: string | undefined): string {
  if (!error) return ERROR_MESSAGES.NETWORK_ERROR;
  
  // HTTP 상태 코드별 메시지 매핑
  if (error.includes('404')) return ERROR_MESSAGES.FILE_NOT_FOUND;
  if (error.includes('409')) return ERROR_MESSAGES.FILE_ALREADY_EXISTS;
  if (error.includes('413')) return ERROR_MESSAGES.FILE_TOO_LARGE;
  if (error.includes('timeout') || error.includes('시간')) return '요청 시간이 초과되었습니다.';
  
  return error;
}

/**
 * API 응답에서 에러 메시지 추출
 */
export function getErrorMessage(response: ApiResponse): string {
  return formatApiError(response.error || response.message);
}