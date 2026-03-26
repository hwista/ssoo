/**
 * API Response 공통 타입
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string;
}

/**
 * 페이지네이션 응답
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 페이지네이션 요청 파라미터
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

/**
 * 정렬 파라미터
 */
export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 목록 조회 공통 파라미터
 */
export interface ListParams extends PaginationParams, SortParams {
  search?: string;
}

/**
 * API 에러 타입
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
