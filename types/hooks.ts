/**
 * types/hooks.ts - 커스텀 훅 전용 타입 정의
 * 
 * Phase 3.3: 타입 시스템 강화
 * 커스텀 훅의 옵션과 반환 타입을 명확히 정의합니다.
 */

// ============================================================================
// 공통 훅 타입
// ============================================================================

export interface HookOptions {
  /** 디버그 모드 활성화 */
  debug?: boolean;
  /** 에러 발생 시 콜백 */
  onError?: (error: Error) => void;
}

export interface AsyncHookState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

// ============================================================================
// useFileSystem 관련 타입
// ============================================================================

export interface FileSystemHookOptions extends HookOptions {
  /** 성공 시 알림 콜백 */
  onSuccess?: (message: string) => void;
  /** 작업 후 자동 새로고침 */
  autoRefresh?: boolean;
}

// ============================================================================
// useTreeData 관련 타입
// ============================================================================

export interface TreeDataHookOptions extends HookOptions {
  /** 초기 확장된 폴더 */
  initialExpandedFolders?: Set<string>;
  /** 초기 선택된 파일 */
  initialSelectedFile?: string | null;
  /** 검색 디바운스 딜레이 (ms) */
  searchDebounceMs?: number;
}

// ============================================================================
// useEditor 관련 타입
// ============================================================================

export interface EditorHookOptions extends HookOptions {
  /** 자동 저장 간격 (ms) */
  autoSaveInterval?: number;
  /** 히스토리 최대 크기 */
  maxHistorySize?: number;
  /** 내용 변경 시 콜백 */
  onContentChange?: (content: string) => void;
  /** 저장 시 콜백 */
  onSave?: (content: string) => Promise<void>;
  /** 자동 저장 시 콜백 */
  onAutoSave?: (content: string) => Promise<void>;
}

export interface EditorCursorInfo {
  line: number;
  column: number;
  position: number;
}

export interface EditorSelectionInfo {
  start: EditorCursorInfo;
  end: EditorCursorInfo;
  text: string;
}

// ============================================================================
// useResize 관련 타입
// ============================================================================

export interface ResizeHookOptions extends HookOptions {
  /** 초기 크기 (px) */
  initial: number;
  /** 최소 크기 (px) */
  min?: number;
  /** 최대 크기 (px) */
  max?: number;
  /** 크기 변경 시 콜백 */
  onChange?: (size: number) => void;
  /** 크기 변경 완료 시 콜백 */
  onCommit?: (size: number) => void;
}

// ============================================================================
// useAutoScroll 관련 타입
// ============================================================================

export interface AutoScrollHookOptions extends HookOptions {
  /** 동기화 활성화 여부 */
  enabled?: boolean;
  /** 동기화 비율 (0-1) */
  syncRatio?: number;
  /** 디바운스 딜레이 (ms) */
  debounceMs?: number;
}
