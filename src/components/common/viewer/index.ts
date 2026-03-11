// ============================================
// Domain-Common Viewer Modules
// `common/viewer` 는 pure common 보다는 DMS 문서 읽기 도메인에 특화된 공통 기능 모듈입니다.
// 여러 pages/template 에서 재사용되지만, viewer UX와 탐색 규약을 함께 캡슐화합니다.
// ============================================

export { Viewer } from './Viewer';
export type { ViewerProps } from './Viewer';

export { Toolbar } from './toolbar/Toolbar';
export type { ToolbarProps } from './toolbar/Toolbar';

export { Content, DOCUMENT_WIDTH } from './Content';
export type { ContentProps } from './Content';

// 상수 re-export
export { ZOOM_LEVELS, DEFAULT_ZOOM } from './toolbar/Toolbar';
