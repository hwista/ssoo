/**
 * 타입 통합 Export
 * 모든 타입을 한 곳에서 import 가능
 */

// 파일 시스템 타입
export type {
  FileNode,
  FileType,
  FilePermissions,
  FileMetadata,
  FileEvent,
  FileEntry,
  DirectoryEntry,
  FileTreeNode,
  FileTree
} from './fileSystem';

// Tab 관련 타입 (PMS 컨벤션: 도메인별 분리)
export type {
  TabItem,
  OpenTabOptions,
  TabStoreState,
  TabStoreActions
} from './tab';

// 레이아웃 타입
export type {
  DeviceType,
  DocumentType,
  AISearchType,
} from './layout';
export { BREAKPOINTS, LAYOUT_SIZES, DOCUMENT_TYPE_LABELS, AI_SEARCH_TYPE_LABELS } from './layout';

// 사이드바 타입 (PMS 컨벤션: 별도 파일 분리)
export type {
  SidebarSection,
  SidebarState,
  SidebarActions,
} from './sidebar';
export {
  SIDEBAR_SECTION_ICONS,
  SIDEBAR_SECTION_LABELS,
} from './sidebar';

// 기존 errorUtils 타입들도 re-export (일관성을 위해)
export type { LogLevel, ErrorContext } from '@/lib/utils/errorUtils';