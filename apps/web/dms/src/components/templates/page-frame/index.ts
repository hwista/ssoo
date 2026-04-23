/**
 * Page Frame Primitives
 *
 * `templates/page-frame` 는 PageTemplate 과 문서형 page 구현을 위한 frame building block 모음입니다.
 * broad common 이 아니라 template-facing primitive 레이어로 취급합니다.
 */

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

export { PanelFrame, CollapsibleSection } from './panel';
export type { PanelFrameProps, CollapsibleSectionProps, CollapsibleSectionVariant } from './panel';
export { TextSection, ChipListSection, ActivityListSection, KeyValueSection } from './panel';
export type {
  TextSectionProps,
  ChipListSectionProps,
  ChipItem,
  ActivityListSectionProps,
  ActivityItem,
  ActivityAction,
  KeyValueSectionProps,
  KeyValueItem,
} from './panel';

export { DOCUMENT_WIDTHS, DEFAULT_DOCUMENT_ORIENTATION } from './documentDimensions';
export type { DocumentOrientation } from './documentDimensions';
