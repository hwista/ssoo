/**
 * API 클라이언트 유틸리티
 * 중복된 fetch API 호출 패턴을 표준화하고 일관된 에러 처리를 제공
 */

import { ERROR_MESSAGES } from './constants';
import type { DocumentMetadata } from '@/types/file';
import type { TemplateItem } from '@/types/template';

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
 * AI 검색 결과 타입
 */
export interface AiSearchResultItem {
  id: string;
  title: string;
  excerpt: string;
  path: string;
  score: number;
  summary?: string;
  snippets?: string[];
  totalSnippetCount?: number;
}

export interface AiSearchResponse {
  query: string;
  results: AiSearchResultItem[];
  contextMode?: 'wiki' | 'deep';
  confidence?: 'high' | 'medium' | 'low';
  citations?: Array<{
    title: string;
    storageUri: string;
    versionId?: string;
    webUrl?: string;
  }>;
}

export interface AiAskResponse {
  query: string;
  answer: string;
  sources: AiSearchResultItem[];
  confidence?: 'high' | 'medium' | 'low';
  citations?: Array<{
    title: string;
    storageUri: string;
    versionId?: string;
    webUrl?: string;
  }>;
}

export interface AssistantSessionPayload {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: unknown[];
  persistedToDb?: boolean;
}

/**
 * AI 임베딩 통계 타입
 */
export interface AiEmbeddingStats {
  totalDocuments: number;
  totalChunks: number;
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
    const response = await request('/api/file', {
      method: 'POST',
      body: { action: 'write', path, content }
    });
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
   * 문서 메타데이터 업데이트 (사이드카)
   */
  updateMetadata: async (path: string, metadata: Partial<DocumentMetadata>): Promise<ApiResponse<DocumentMetadata>> => {
    return request('/api/file', {
      method: 'POST',
      body: { action: 'updateMetadata', path, metadata }
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
 * AI API 클라이언트
 * - ask: useChat (Vercel AI SDK)이 직접 /api/ask 호출 → 여기서 관리 안 함
 * - search: JSON 응답이므로 apiClient로 관리
 * - create/doc-assist: 문서 작성 보조 API
 */
export const aiApi = {
  search: async (
    query: string,
    options?: { contextMode?: 'wiki' | 'deep'; activeDocPath?: string }
  ): Promise<ApiResponse<AiSearchResponse>> => {
    return request('/api/search', {
      method: 'POST',
      body: { query, ...options },
    });
  },

  ask: async (
    query: string,
    options?: { contextMode?: 'wiki' | 'deep'; activeDocPath?: string; stream?: boolean }
  ): Promise<ApiResponse<AiAskResponse>> => {
    return request('/api/ask', {
      method: 'POST',
      body: { query, ...options },
    });
  },
};

export const assistantSessionApi = {
  list: async (clientId: string, limit = 100): Promise<ApiResponse<AssistantSessionPayload[]>> => {
    const query = new URLSearchParams({ clientId, limit: String(limit) });
    return request<AssistantSessionPayload[]>(`/api/chat-sessions?${query.toString()}`);
  },

  save: async (
    clientId: string,
    session: AssistantSessionPayload
  ): Promise<ApiResponse<{ id: string }>> => {
    return request<{ id: string }>('/api/chat-sessions', {
      method: 'POST',
      body: { clientId, session },
    });
  },

  remove: async (clientId: string, sessionId: string): Promise<ApiResponse<{ id: string }>> => {
    return request<{ id: string }>('/api/chat-sessions', {
      method: 'DELETE',
      body: { clientId, sessionId },
    });
  },
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

// ============================================================================
// Git API
// ============================================================================

/** Git 변경 파일 상태 */
export type GitFileStatus = 'added' | 'modified' | 'deleted' | 'renamed' | 'untracked';

/** Git 변경 파일 항목 */
export interface GitChangeEntry {
  path: string;
  status: GitFileStatus;
  oldPath?: string;
}

/** Git 커밋 로그 항목 */
export interface GitLogEntry {
  hash: string;
  hashShort: string;
  author: string;
  date: string;
  message: string;
}

/**
 * Git API 클라이언트
 */
export const gitApi = {
  /** 변경 사항 목록 조회 */
  getChanges: async (): Promise<ApiResponse<GitChangeEntry[]>> => {
    return request<GitChangeEntry[]>('/api/git');
  },

  /** 전체 커밋 */
  commitAll: async (message: string, author?: string): Promise<ApiResponse<{ hash: string }>> => {
    return request('/api/git', {
      method: 'POST',
      body: { action: 'commit', message, author },
    });
  },

  /** 선택 파일 커밋 */
  commitFiles: async (files: string[], message: string, author?: string): Promise<ApiResponse<{ hash: string }>> => {
    return request('/api/git', {
      method: 'POST',
      body: { action: 'commitFiles', files, message, author },
    });
  },

  /** 특정 파일 변경 취소 */
  discardFile: async (filePath: string): Promise<ApiResponse<{ message: string }>> => {
    return request('/api/git', {
      method: 'POST',
      body: { action: 'discard', path: filePath },
    });
  },

  /** 전체 변경 취소 */
  discardAll: async (): Promise<ApiResponse<{ message: string }>> => {
    return request('/api/git', {
      method: 'POST',
      body: { action: 'discardAll' },
    });
  },

  /** 전체 히스토리 */
  getHistory: async (maxCount?: number): Promise<ApiResponse<GitLogEntry[]>> => {
    return request('/api/git', {
      method: 'POST',
      body: { action: 'history', maxCount },
    });
  },

  /** 파일별 히스토리 */
  getFileHistory: async (filePath: string, maxCount?: number): Promise<ApiResponse<GitLogEntry[]>> => {
    return request('/api/git', {
      method: 'POST',
      body: { action: 'fileHistory', path: filePath, maxCount },
    });
  },

  /** 파일 복원 */
  restoreFile: async (filePath: string, commitHash: string): Promise<ApiResponse<{ message: string }>> => {
    return request('/api/git', {
      method: 'POST',
      body: { action: 'restore', path: filePath, commitHash },
    });
  },

  /** 파일 diff */
  getFileDiff: async (filePath: string): Promise<ApiResponse<string>> => {
    return request('/api/git', {
      method: 'POST',
      body: { action: 'diff', path: filePath },
    });
  },

  /** 초기화 */
  initialize: async (): Promise<ApiResponse<{ isNew: boolean }>> => {
    return request('/api/git', {
      method: 'POST',
      body: { action: 'init' },
    });
  },
};

// ============================================================================
// Settings API
// ============================================================================

/** Git 설정 */
export interface GitConfigClient {
  repositoryPath: string;
  author: { name: string; email: string };
  autoInit: boolean;
}

/** DMS 설정 */
export interface DmsConfigClient {
  git: GitConfigClient;
  storage: {
    defaultProvider: 'local' | 'sharepoint' | 'nas';
    local: { enabled: boolean; basePath: string; webBaseUrl?: string };
    sharepoint: { enabled: boolean; basePath: string; webBaseUrl?: string };
    nas: { enabled: boolean; basePath: string; webBaseUrl?: string };
  };
  ingest: {
    queuePath: string;
    autoPublish: boolean;
    maxConcurrentJobs: number;
  };
}

/** 깊은 부분 타입 */
export type DeepPartialClient<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartialClient<T[P]> : T[P];
};

/** 설정 조회 응답 */
export interface SettingsResponse {
  config: DmsConfigClient;
  wikiDir: string;
}

/**
 * Settings API 클라이언트
 */
export const settingsApi = {
  /** 현재 설정 조회 */
  getSettings: async (): Promise<ApiResponse<SettingsResponse>> => {
    return request<SettingsResponse>('/api/settings');
  },

  /** 설정 업데이트 */
  updateSettings: async (config: DeepPartialClient<DmsConfigClient>): Promise<ApiResponse<SettingsResponse>> => {
    return request<SettingsResponse>('/api/settings', {
      method: 'POST',
      body: { action: 'update', config },
    });
  },

  /** Git 저장소 경로 변경 (파일 복사 + Git init 포함) */
  updateGitPath: async (newPath: string, copyFiles: boolean): Promise<ApiResponse<SettingsResponse>> => {
    return request<SettingsResponse>('/api/settings', {
      method: 'POST',
      body: { action: 'updateGitPath', newPath, copyFiles },
    });
  },
};

// ============================================================================
// Storage API
// ============================================================================

export interface StorageReferenceClient {
  storageUri: string;
  provider: 'local' | 'sharepoint' | 'nas';
  path: string;
  name: string;
  size: number;
  versionId: string;
  etag: string;
  checksum: string;
  origin: 'manual' | 'ingest' | 'teams' | 'network_drive';
  status: 'draft' | 'pending_confirm' | 'published';
  webUrl?: string;
}

export interface StorageOpenResultClient {
  provider: 'local' | 'sharepoint' | 'nas';
  path: string;
  storageUri: string;
  openUrl: string;
  webUrl?: string;
}

export const storageApi = {
  upload: async (payload: {
    fileName: string;
    content: string;
    provider?: 'local' | 'sharepoint' | 'nas';
    relativePath?: string;
    origin?: 'manual' | 'ingest' | 'teams' | 'network_drive';
    status?: 'draft' | 'pending_confirm' | 'published';
  }): Promise<ApiResponse<StorageReferenceClient>> => {
    return request('/api/storage/upload', {
      method: 'POST',
      body: payload,
    });
  },

  open: async (payload: {
    storageUri?: string;
    provider?: 'local' | 'sharepoint' | 'nas';
    path?: string;
  }): Promise<ApiResponse<StorageOpenResultClient>> => {
    return request('/api/storage/open', {
      method: 'POST',
      body: payload,
    });
  },
};

// ============================================================================
// Ingest API
// ============================================================================

export interface IngestJobClient {
  id: string;
  title: string;
  content: string;
  provider: 'local' | 'sharepoint' | 'nas';
  relativePath: string;
  requestedBy: string;
  origin: 'manual' | 'ingest' | 'teams' | 'network_drive';
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'pending_confirm' | 'published' | 'failed';
  error?: string;
  storageUri?: string;
  wikiPath?: string;
}

export const ingestApi = {
  submit: async (payload: {
    title: string;
    content: string;
    requestedBy?: string;
    provider?: 'local' | 'sharepoint' | 'nas';
    relativePath?: string;
    origin?: 'manual' | 'ingest' | 'teams' | 'network_drive';
  }): Promise<ApiResponse<IngestJobClient>> => {
    return request('/api/ingest/submit', {
      method: 'POST',
      body: payload,
    });
  },

  jobs: async (): Promise<ApiResponse<{ jobs: IngestJobClient[] }>> => {
    return request('/api/ingest/jobs');
  },

  confirm: async (id: string): Promise<ApiResponse<IngestJobClient>> => {
    return request(`/api/ingest/jobs/${encodeURIComponent(id)}/confirm`, {
      method: 'POST',
    });
  },
};

// ============================================================================
// Template API
// ============================================================================

export const templateApi = {
  list: async (): Promise<ApiResponse<{ global: TemplateItem[]; personal: TemplateItem[] }>> => {
    return request('/api/templates');
  },
  upsert: async (
    template: Partial<TemplateItem> & Pick<TemplateItem, 'name' | 'scope' | 'kind' | 'content'>
  ): Promise<ApiResponse<TemplateItem>> => {
    return request('/api/templates', {
      method: 'POST',
      body: template,
    });
  },
  remove: async (id: string, scope: 'global' | 'personal'): Promise<ApiResponse<{ id: string }>> => {
    return request('/api/templates', {
      method: 'DELETE',
      body: { id, scope },
    });
  },
};

// ============================================================================
// Doc Assist API
// ============================================================================

export interface DocAssistSummaryFileClient {
  id?: string;
  name: string;
  type?: string;
  textContent: string;
}

export interface DocAssistComposeResponse {
  text: string;
  suggestedPath: string;
  relevanceWarnings: string[];
}

export interface DocAssistRecommendResponse {
  suggestedPath: string;
  relevanceWarnings: string[];
}

export const docAssistApi = {
  compose: async (payload: {
    instruction: string;
    currentContent: string;
    selectedText?: string;
    activeDocPath?: string;
    templates?: TemplateItem[];
    summaryFiles?: DocAssistSummaryFileClient[];
  }): Promise<ApiResponse<DocAssistComposeResponse>> => {
    return request('/api/doc-assist', {
      method: 'POST',
      body: payload,
    });
  },
  recommendPath: async (payload: {
    instruction: string;
    activeDocPath?: string;
    selectedText?: string;
    templates?: TemplateItem[];
    summaryFiles?: DocAssistSummaryFileClient[];
  }): Promise<ApiResponse<DocAssistRecommendResponse>> => {
    return request('/api/doc-assist', {
      method: 'POST',
      body: { action: 'recommendPath', ...payload },
    });
  },
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
