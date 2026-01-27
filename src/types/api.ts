/**
 * API 관련 타입 정의
 * 요청/응답, 에러 처리, 상태 관리 등
 */

import type { FileType } from './fileSystem';

// 🌐 기본 API 응답 (기존 유지, 확장)
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  // 확장 속성
  timestamp?: number;
  requestId?: string;
  pagination?: PaginationInfo;
}

// 📄 페이지네이션 정보
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// 🔧 API 요청 옵션 (기존 확장)
export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  retries?: number;
  cache?: boolean;
}

// 📁 파일 API 액션 (기존 확장)
export type FileAction = 
  | 'create' 
  | 'read' 
  | 'update' 
  | 'delete' 
  | 'rename' 
  | 'createFolder'
  | 'deleteFolder'
  | 'copy'
  | 'move'
  | 'search';

// 📝 파일 API 요청 (기존 확장)
export interface FileApiRequest {
  action: FileAction;
  path?: string;
  content?: string;
  name?: string;
  parent?: string;
  oldPath?: string;
  newPath?: string;
  // 새로운 확장 속성
  recursive?: boolean;
  force?: boolean;
  backup?: boolean;
}

// 🔍 검색 관련 API
export interface SearchApiRequest {
  query: string;
  path?: string;
  fileTypes?: FileType[];
  caseSensitive?: boolean;
  includeContent?: boolean;
  maxResults?: number;
}

export interface SearchResult {
  path: string;
  name: string;
  type: FileType;
  matches: SearchMatch[];
}

export interface SearchMatch {
  line: number;
  column: number;
  text: string;
  context: string;
}

// 📊 API 상태 관리
export interface ApiState<T = unknown> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

// 🔄 API 캐시
export interface ApiCache<T = unknown> {
  key: string;
  data: T;
  timestamp: number;
  ttl: number;
}