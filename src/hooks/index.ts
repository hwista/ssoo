/**
 * Custom Hooks
 *
 * 애플리케이션 전체에서 사용하는 커스텀 훅
 */

// 에디터 관련 훅 (DMS 전용)
export { useEditor } from './useEditor';
export type { 
  EditorCursorPosition,
  EditorSelection,
  UseEditorOptions, 
  UseEditorReturn 
} from './useEditor';

// Tab
export { useOpenTabWithConfirm } from './useOpenTabWithConfirm';