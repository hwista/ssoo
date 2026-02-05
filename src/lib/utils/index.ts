/**
 * Utility Functions
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind CSS 클래스 병합 유틸리티
 * clsx로 조건부 클래스 처리 후 tailwind-merge로 충돌 해결
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 파일 처리
export {
  isMarkdownFile,
  isTextFile,
  isImageFile,
  getFileExtension,
  removeFileExtension,
  ensureFileExtension,
  normalizeMarkdownFileName,
  getMimeType,
  sanitizeFileName,
  formatFileSize,
} from './fileUtils';

// 경로 처리
export {
  normalizePath,
  isValidPath,
  resolveRelativePath,
  getFileName,
  getDirectoryPath,
  joinPaths,
  getPathDepth,
  isSubPath,
} from './pathUtils';

// 에러 처리
export {
  LogLevel,
  setLogConfig,
  extractErrorMessage,
  logger,
  safeSync,
  handleError,
  handleApiError,
  handleFileError,
  handleValidationError,
  debugOnly,
  PerformanceTimer,
  getErrorInfo,
} from './errorUtils';
export type { ErrorContext } from './errorUtils';

// 상수
export {
  FILE_EXTENSIONS,
  PATH_SEPARATORS,
  INVALID_FILENAME_CHARS,
  LIMITS,
  MIME_TYPES,
  REGEX_PATTERNS,
  DEFAULT_CONFIG,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from './constants';

// API 클라이언트
export {
  fileApi,
  filesApi,
  get,
  post,
  put,
  del,
  getFileWithHeaders,
  formatApiError,
  getErrorMessage,
} from './apiClient';
export type {
  ApiResponse,
  ApiRequestOptions,
  FileAction,
  FileApiRequest,
} from './apiClient';
