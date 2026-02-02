/**
 * Common Components (Level 2 - Composite/분자)
 * 
 * 비즈니스 로직 없이 재사용 가능한 복합 컴포넌트
 * shadcn/ui 원자 컴포넌트를 조합하여 구성
 * 
 * 구조:
 * - page/: 레이아웃 빌딩블록 (Breadcrumb, Header, Content, Sidecar)
 * - viewer/: 읽기 슬롯 컴포넌트 (Viewer, ViewerToolbar, ViewerContent)
 * - editor/: 편집 슬롯 컴포넌트 (MarkdownEditor, BlockEditor, EditorToolbar)
 * - StateDisplay: 로딩/에러/빈 상태 표시
 * - ConfirmDialog: 확인 다이얼로그
 */

// 페이지 레이아웃 빌딩블록
export * from './page';

// Viewer 슬롯 컴포넌트 (문서 읽기)
export * from './viewer';

// Editor 슬롯 컴포넌트 (문서 편집)
export * from './editor';

// 상태 표시
export { LoadingState, LoadingSpinner, ErrorState, EmptyState } from './StateDisplay';
export type { LoadingStateProps, LoadingSpinnerProps, ErrorStateProps, EmptyStateProps } from './StateDisplay';

// 다이얼로그
export { ConfirmDialog } from './ConfirmDialog';
