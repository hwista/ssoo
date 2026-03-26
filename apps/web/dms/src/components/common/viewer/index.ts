// ============================================
// Cross-Page Viewer Modules
// DocumentPage·SearchPage 에서 공유하는 문서 뷰어 공개 API.
// 내부 전용(Content, ZOOM_LEVELS, DEFAULT_ZOOM)은 노출하지 않습니다.
// ============================================

export { Viewer } from './Viewer';
export type { ViewerProps } from './Viewer';

export { Toolbar } from './toolbar/Toolbar';
export type { ToolbarProps } from './toolbar/Toolbar';

export { DOCUMENT_WIDTH } from './Content';
