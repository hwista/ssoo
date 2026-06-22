// ============================================
// Cross-Page Viewer Modules
// DocumentPage 등 문서 표면에서 공유하는 문서 뷰어 공개 API.
// 내부 전용(Content, ZOOM_LEVELS, DEFAULT_ZOOM)은 노출하지 않습니다.
// ============================================

export { Viewer } from './Viewer';
export type { ViewerProps } from './Viewer';

export { Toolbar } from '@ssoo/web-shell';
export type { ToolbarProps } from '@ssoo/web-shell';

export { DOCUMENT_WIDTH } from './Content';
