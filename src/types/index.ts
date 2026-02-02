// ============================================
// Types Index
// 타입 통합 export
// ============================================

// File (PMS menu.ts 대응)
export type {
  FileNode,
  FileType,
  FilePermissions,
  FileMetadata,
  FileEvent,
  FileEntry,
  DirectoryEntry,
  FileTreeNode,
  FileTree,
  BookmarkItem,
} from './file';

// Tab
export type {
  TabItem,
  OpenTabOptions,
  TabStoreState,
  TabStoreActions
} from './tab';

// Layout
export type {
  DeviceType,
  DocumentType,
  AISearchType,
  LayoutState,
  LayoutActions,
} from './layout';
export { BREAKPOINTS, LAYOUT_SIZES, DOCUMENT_TYPE_LABELS, AI_SEARCH_TYPE_LABELS } from './layout';

// Sidebar
export type {
  SidebarSection,
  SidebarState,
  SidebarActions,
} from './sidebar';
export {
  SIDEBAR_SECTION_ICONS,
  SIDEBAR_SECTION_LABELS,
} from './sidebar';