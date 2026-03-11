/**
 * Common Components
 * 
 * `common/` 은 현재 단일 성격의 레이어가 아닙니다.
 * - pure common: StateDisplay, ConfirmDialog 등
 * - domain-common feature modules: viewer/, editor/, assistant/
 * 
 * 구조:
 * - viewer/: DMS 공통 viewer 기능
 * - editor/: DMS 공통 editor 기능
 * - assistant/: DMS 공통 assistant 기능
 * - StateDisplay: 로딩/에러/빈 상태 표시
 * - ConfirmDialog: 확인 다이얼로그
 */

// Viewer 슬롯 컴포넌트 (문서 읽기)
export { Viewer, Toolbar as ViewerToolbar, Content as ViewerContent, DOCUMENT_WIDTH, ZOOM_LEVELS, DEFAULT_ZOOM } from './viewer';
export type { ViewerProps, ToolbarProps, ContentProps as ViewerContentProps } from './viewer';

// Editor 슬롯 컴포넌트 (문서 편집)
export { Editor, Content as EditorContent, BlockEditor, DOCUMENT_WIDTH as EDITOR_DOCUMENT_WIDTH } from './editor';
export type { EditorProps, ContentProps as EditorContentProps, BlockEditorProps, BlockEditorRef } from './editor';

// 상태 표시
export { LoadingState, LoadingSpinner, ErrorState, EmptyState } from './StateDisplay';
export type { LoadingStateProps, LoadingSpinnerProps, ErrorStateProps, EmptyStateProps } from './StateDisplay';

// 다이얼로그
export { ConfirmDialog } from './ConfirmDialog';
