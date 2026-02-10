// ============================================
// Page Common Components
// 페이지 레이아웃 빌딩블록 (DocPageTemplate 구성요소)
// ============================================

export { Breadcrumb } from './Breadcrumb';
export type { BreadcrumbProps } from './Breadcrumb';

export { Header } from './Header';
export type { HeaderProps, HeaderAction } from './Header';

export { Content } from './Content';
export type { ContentProps } from './Content';

export { Sidecar } from './Sidecar';
export type { SidecarProps, SidecarMetadata, TocItem } from './Sidecar';

export { DOCUMENT_WIDTHS, DEFAULT_DOCUMENT_ORIENTATION } from './documentDimensions';
export type { DocumentOrientation } from './documentDimensions';

// Viewer, LineNumbers는 common/viewer/로 이동됨
// import { Viewer } from '@/components/common/viewer';

