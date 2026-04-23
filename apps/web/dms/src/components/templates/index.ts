/**
 * Page Templates
 * 
 * `templates/` 는 page 구현을 위한 공통 frame 레이어입니다.
 * 개별 page 비즈니스 로직을 담지 않고, breadcrumb/header/content/panel 구조를 일관되게 제공합니다.
 * 
 * 포함 템플릿:
 * - PageTemplate: 범용 페이지 frame (breadcrumb/header/content/panel)
 */

// 페이지 템플릿
export { PageTemplate } from './PageTemplate';
export type { PageTemplateProps } from './PageTemplate';

// template-facing page frame primitives
export { Breadcrumb } from './page-frame';
export type { BreadcrumbProps } from './page-frame';
export { Header } from './page-frame';
export type { HeaderProps, HeaderAction } from './page-frame';
export { Content } from './page-frame';
export type { ContentProps } from './page-frame';
export { SectionedShell } from './page-frame';
export type { SectionedShellProps, SectionedShellVariant } from './page-frame';
export {
  DOC_PAGE_SURFACE_PRESETS,
  PAGE_BACKGROUND_PRESETS,
  SHELL_BODY_WRAPPER_PRESETS,
} from './page-frame';
export type { TocItem } from './page-frame';
export { PanelFrame, CollapsibleSection } from './page-frame';
export type { PanelFrameProps, CollapsibleSectionProps, CollapsibleSectionVariant } from './page-frame';
export { TextSection, ChipListSection, ActivityListSection } from './page-frame';
export type {
  TextSectionProps,
  ChipListSectionProps,
  ChipItem,
  ActivityListSectionProps,
  ActivityItem,
  ActivityAction,
} from './page-frame';
export { DOCUMENT_WIDTHS, DEFAULT_DOCUMENT_ORIENTATION } from './page-frame';
export type { DocumentOrientation } from './page-frame';
