/**
 * hooks/index.ts - 커스텀 훅 통합 export
 * 
 * Phase 3.1에서 구현된 커스텀 훅들을 중앙에서 관리합니다.
 */

// 파일 시스템 관련 훅
export { useFileSystem } from './useFileSystem';
export type { 
  UseFileSystemOptions, 
  UseFileSystemReturn 
} from './useFileSystem';

// 트리 데이터 관련 훅
export { useTreeData } from './useTreeData';
export type { 
  UseTreeDataOptions, 
  UseTreeDataReturn 
} from './useTreeData';

// 에디터 관련 훅
export { useEditor } from './useEditor';
export type { 
  EditorCursorPosition,
  EditorSelection,
  UseEditorOptions, 
  UseEditorReturn 
} from './useEditor';

// UI 인터랙션 훅
export { useResize } from './useResize';
export type { UseResizeOptions, UseResizeReturn } from './useResize';

export { useAutoScroll } from './useAutoScroll';
export type { UseAutoScrollOptions, UseAutoScrollReturn } from './useAutoScroll';

// 기존 훅들
export { useMessage } from './useMessage';
export { useContextMenu } from './useContextMenu';