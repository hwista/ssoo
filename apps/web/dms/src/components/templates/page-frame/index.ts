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

export { SidecarFrame, CollapsibleSection } from './sidecar';
export type { SidecarFrameProps, CollapsibleSectionProps, CollapsibleSectionVariant } from './sidecar';
export { TextSection, ChipListSection, ActivityListSection, KeyValueSection } from './sidecar';
export type {
  TextSectionProps,
  ChipListSectionProps,
  ChipItem,
  ActivityListSectionProps,
  ActivityItem,
  ActivityAction,
  KeyValueSectionProps,
  KeyValueItem,
} from './sidecar';

export { DOCUMENT_WIDTHS, DEFAULT_DOCUMENT_ORIENTATION } from './documentDimensions';
export type { DocumentOrientation } from './documentDimensions';
