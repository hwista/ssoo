// ============================================
// Viewer Components
// 문서 읽기 관련 컴포넌트 (DMS 전용)
// Editor와 대응하는 슬롯 컴포넌트
// ============================================

export { Viewer } from './Viewer';
export type { ViewerProps } from './Viewer';

export { ViewerToolbar } from './ViewerToolbar';
export type { ViewerToolbarProps } from './ViewerToolbar';

export { ViewerContent, DOCUMENT_WIDTH } from './ViewerContent';
export type { ViewerContentProps } from './ViewerContent';

export { LineNumbers, countLines } from './LineNumbers';
export type { LineNumbersProps } from './LineNumbers';

// 상수 re-export
export { ZOOM_LEVELS, DEFAULT_ZOOM } from './ViewerToolbar';
