/**
 * 공통 상수 정의
 * 유틸리티 함수들에서 사용되는 상수들을 중앙 관리
 */

/**
 * 파일 확장자 상수
 */
export const FILE_EXTENSIONS = {
  MARKDOWN: ['.md', '.markdown'],
  TEXT: ['.txt', '.text'],
  IMAGE: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
  JSON: '.json',
  TYPESCRIPT: '.ts',
  TYPESCRIPT_REACT: '.tsx',
  JAVASCRIPT: '.js',
  JAVASCRIPT_REACT: '.jsx'
} as const;

/**
 * 경로 구분자 상수
 */
export const PATH_SEPARATORS = {
  UNIX: '/',
  WINDOWS: '\\'
} as const;

/**
 * 파일명에 허용되지 않는 문자들
 */
export const INVALID_FILENAME_CHARS = [
  '/', '\\', ':', '*', '?', '"', '<', '>', '|'
] as const;

/**
 * 시스템 제한값들
 */
export const LIMITS = {
  MAX_FILENAME_LENGTH: 255,
  MAX_PATH_DEPTH: 10,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_SEARCH_RESULTS: 100,
  MIN_SEARCH_QUERY_LENGTH: 1
} as const;

/**
 * MIME 타입 매핑
 */
export const MIME_TYPES = {
  MARKDOWN: 'text/markdown',
  TEXT: 'text/plain',
  IMAGE: 'image/*',
  JSON: 'application/json',
  HTML: 'text/html',
  CSS: 'text/css',
  JAVASCRIPT: 'application/javascript',
  DEFAULT: 'application/octet-stream',
  // 확장자별 상세 매핑
  'md': 'text/markdown',
  'txt': 'text/plain',
  'json': 'application/json',
  'ts': 'text/typescript',
  'tsx': 'text/typescript',
  'js': 'application/javascript',
  'jsx': 'application/javascript',
  'css': 'text/css',
  'html': 'text/html'
} as const;

/**
 * 정규식 패턴들
 */
export const REGEX_PATTERNS = {
  // 파일명 검증 (영문, 숫자, 한글, 일부 특수문자만 허용)
  VALID_FILENAME: /^[a-zA-Z0-9가-힣._\-\s]+$/,
  
  // 마크다운 링크 패턴
  MARKDOWN_LINK: /\[([^\]]+)\]\(([^)]+)\)/g,
  
  // URL 패턴 (간단한 버전)
  URL: /^https?:\/\/.+/,
  
  // 특수문자 제거용
  SPECIAL_CHARS: /[^\w가-힣\s.-]/g,
  
  // 공백 정규화용
  NORMALIZE_SPACES: /\s+/g
} as const;

/**
 * 기본 설정값들
 */
export const DEFAULT_CONFIG = {
  SIDEBAR_WIDTH: 320,
  NOTIFICATION_DURATION: 3000,
  DEBOUNCE_DELAY: 300,
  ANIMATION_DURATION: 200
} as const;

/**
 * 에러 메시지 상수
 */
export const ERROR_MESSAGES = {
  INVALID_PATH: '유효하지 않은 경로입니다.',
  INVALID_FILENAME: '유효하지 않은 파일명입니다.',
  FILE_NOT_FOUND: '파일을 찾을 수 없습니다.',
  FILE_ALREADY_EXISTS: '파일이 이미 존재합니다.',
  PATH_TOO_DEEP: '경로가 너무 깊습니다.',
  FILE_TOO_LARGE: '파일 크기가 너무 큽니다.',
  NETWORK_ERROR: '네트워크 오류가 발생했습니다.',
  PERMISSION_DENIED: '권한이 없습니다.'
} as const;

/**
 * 성공 메시지 상수
 */
export const SUCCESS_MESSAGES = {
  FILE_CREATED: '파일이 성공적으로 생성되었습니다.',
  FILE_SAVED: '파일이 성공적으로 저장되었습니다.',
  FILE_DELETED: '파일이 성공적으로 삭제되었습니다.',
  FILE_RENAMED: '파일 이름이 성공적으로 변경되었습니다.',
  FOLDER_CREATED: '폴더가 성공적으로 생성되었습니다.'
} as const;