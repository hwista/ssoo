/**
 * hooks/index.ts - 커스텀 훅 통합 export
 * 
 * Phase 3.1에서 구현된 커스텀 훅들을 중앙에서 관리합니다.
 * Phase 6에서 레거시 훅 정리됨
 */

// 에디터 관련 훅 (유일하게 활성)
export { useEditor } from './useEditor';
export type { 
  EditorCursorPosition,
  EditorSelection,
  UseEditorOptions, 
  UseEditorReturn 
} from './useEditor';

// Tab
export { useOpenTabWithConfirm } from './useOpenTabWithConfirm';