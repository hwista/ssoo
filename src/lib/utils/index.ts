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

// 파일명 생성
export { generateUniqueFilename } from './generateFilename';

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

// 마크다운 링크 추출
export { extractMarkdownLinks } from './extractMarkdownLinks';
export type { BodyLink } from './extractMarkdownLinks';

// 파일 트리 필터
export { filterFileTree } from './fileTree';
