/**
 * Common Components
 *
 * `common/` 루트 배럴은 pure common 만 노출합니다.
 * domain-common feature modules(viewer/, editor/, assistant/) 는 하위 레이어에서 직접 import 합니다.
 */

// 상태 표시
export { LoadingState, LoadingSpinner, ErrorState, EmptyState } from './StateDisplay';
export type { LoadingStateProps, LoadingSpinnerProps, ErrorStateProps, EmptyStateProps } from './StateDisplay';

// 다이얼로그
export { ConfirmDialog } from './ConfirmDialog';
