/**
 * Library Module
 *
 * 애플리케이션 공통 유틸리티 및 설정
 */

// 유틸리티 함수
export {
  cn,
  // fileUtils
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
  // pathUtils
  normalizePath,
  isValidPath,
  resolveRelativePath,
  getFileName,
  getDirectoryPath,
  joinPaths,
  getPathDepth,
  isSubPath,
  // errorUtils
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
  // constants
  FILE_EXTENSIONS,
  PATH_SEPARATORS,
  INVALID_FILENAME_CHARS,
  LIMITS,
  MIME_TYPES,
  REGEX_PATTERNS,
  DEFAULT_CONFIG,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from './utils';
export type {
  ErrorContext,
} from './utils';

export {
  fileApi,
  filesApi,
  aiApi,
  docAssistApi,
  assistantSessionApi,
  gitApi,
  settingsApi,
  storageApi,
  ingestApi,
  templateApi,
  get,
  post,
  put,
  del,
  getFileWithHeaders,
  formatApiError,
  getErrorMessage,
} from './api';
export type {
  ApiResponse,
  ApiRequestOptions,
  FileAction,
  FileApiRequest,
  GitFileStatus,
  GitChangeEntry,
  GitLogEntry,
  DmsConfigClient,
  DeepPartialClient,
} from './api';

// 토스트 알림
export { toast, useToast } from './toast';

// 마크다운 변환
export { markdownToHtmlSync } from './markdownConverter';
