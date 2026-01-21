/**
 * 공통 기본 타입 정의
 * 전역적으로 사용되는 기본 타입들
 */

// 🔧 유틸리티 타입들
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// 📅 시간 관련
export type Timestamp = number;
export type ISODateString = string;

// 🔤 문자열 리터럴 타입들
export type SortOrder = 'asc' | 'desc';
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';
export type ActionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

// 🎯 이벤트 핸들러 타입들
export type EventHandler<T = void> = (event: T) => void;
export type AsyncEventHandler<T = void> = (event: T) => Promise<void>;
export type CancellableEventHandler<T = void> = (event: T) => boolean | void;

// 🔍 검색/필터 관련
export interface FilterOptions<T = unknown> {
  query?: string;
  field?: keyof T;
  operator?: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex';
  caseSensitive?: boolean;
}

export interface SortOptions<T = unknown> {
  field: keyof T;
  order: SortOrder;
}

// 📊 상태 관리 관련
export interface AsyncState<T = unknown, E = Error> {
  data: T | null;
  loading: boolean;
  error: E | null;
  lastUpdated: Date | null;
}

// 🔒 권한 관련
export type Permission = 'read' | 'write' | 'delete' | 'admin';
export type Role = 'viewer' | 'editor' | 'admin';

export interface UserPermissions {
  role: Role;
  permissions: Permission[];
  restrictions?: string[];
}