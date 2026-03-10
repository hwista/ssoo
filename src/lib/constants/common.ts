export const LIMITS = {
  MAX_FILENAME_LENGTH: 255,
  MAX_PATH_DEPTH: 10,
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  MAX_SEARCH_RESULTS: 100,
  MIN_SEARCH_QUERY_LENGTH: 1,
} as const;

export const ERROR_MESSAGES = {
  INVALID_PATH: '유효하지 않은 경로입니다.',
  INVALID_FILENAME: '유효하지 않은 파일명입니다.',
  FILE_NOT_FOUND: '파일을 찾을 수 없습니다.',
  FILE_ALREADY_EXISTS: '파일이 이미 존재합니다.',
  PATH_TOO_DEEP: '경로가 너무 깊습니다.',
  FILE_TOO_LARGE: '파일 크기가 너무 큽니다.',
  NETWORK_ERROR: '네트워크 오류가 발생했습니다.',
  PERMISSION_DENIED: '권한이 없습니다.',
} as const;
