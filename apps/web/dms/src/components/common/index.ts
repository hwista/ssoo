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

// 이미지 미리보기
export { ImagePreviewDialog } from './ImagePreviewDialog';
export type { ImagePreviewDialogProps } from './ImagePreviewDialog';

// 이미지 라이트박스 (미리보기 모달 없이 바로 전체화면)
export { ImageLightbox } from './ImageLightbox';
export type { ImageLightboxProps } from './ImageLightbox';

// 유저 아바타
export { UserAvatar } from './UserAvatar';
export type { UserAvatarProps } from './UserAvatar';
