/**
 * 서비스 전용 타입 정의
 */

import type { FileNode } from '@/types';

// 서비스 결과 타입
export interface ServiceResult<T = void> {
  success: boolean;
  data?: T;
  error?: ServiceError;
  message?: string;
  metadata?: ServiceMetadata;
}

// 서비스 에러 타입
export interface ServiceError {
  code: string;
  message: string;
  service?: string;
  timestamp?: Date;
  stack?: string;
  details?: Record<string, unknown>;
  cause?: Error;
}

// 서비스 설정 타입
export interface ServiceConfig {
  apiTimeout: number;
  retryAttempts: number;
  enableLogging: boolean;
  enableCaching: boolean;
  cacheTimeout: number;
}

// 서비스 메타데이터
export interface ServiceMetadata {
  timestamp: number;
  duration?: number;
  requestId?: string;
  context?: Record<string, unknown>;
}

// 유효성 검사 결과
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// 파일 작업 옵션들
export interface CreateFileOptions {
  overwrite?: boolean;
  createParentFolders?: boolean;
  template?: string;
}

export interface ReadFileOptions {
  encoding?: 'utf-8' | 'base64';
  useCache?: boolean;
}

export interface UpdateFileOptions {
  createBackup?: boolean;
  validateContent?: boolean;
}

export interface DeleteFileOptions {
  force?: boolean;
  moveToTrash?: boolean;
}

export interface CreateFolderOptions {
  recursive?: boolean;
  mode?: string;
}

export interface RenameOptions {
  overwrite?: boolean;
  createParentFolders?: boolean;
}

// 트리 관련 옵션들
export interface GetTreeOptions {
  depth?: number;
  includeHidden?: boolean;
  sortBy?: 'name' | 'type' | 'date';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchOptions {
  caseSensitive?: boolean;
  includeContent?: boolean;
  fileTypes?: string[];
  maxResults?: number;
}

// 파일 트리 타입
export type FileTree = FileNode[];