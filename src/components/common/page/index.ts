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

export { SectionedShell } from './SectionedShell';
export type { SectionedShellProps, SectionedShellVariant } from './SectionedShell';
export {
  DOC_PAGE_SURFACE_PRESETS,
  PAGE_BACKGROUND_PRESETS,
  SHELL_BODY_WRAPPER_PRESETS,
} from './layoutPresets';

export type { TocItem } from './toc';

export { SidecarFrame, CollapsibleSection } from './sidecar';
export type { SidecarFrameProps, CollapsibleSectionProps, CollapsibleSectionVariant } from './sidecar';
export { TextSection, ChipListSection, ActivityListSection } from './sidecar';
export type {
  TextSectionProps,
  ChipListSectionProps,
  ChipItem,
  ActivityListSectionProps,
  ActivityItem,
  ActivityAction,
} from './sidecar';

export { DOCUMENT_WIDTHS, DEFAULT_DOCUMENT_ORIENTATION } from './documentDimensions';
export type { DocumentOrientation } from './documentDimensions';

// Viewer, LineNumbers는 common/viewer/로 이동됨
// import { Viewer } from '@/components/common/viewer';
