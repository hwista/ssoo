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

// API 관련 타입
export type {
  ApiResponse,
  PaginationInfo,
  ApiRequestOptions,
  FileAction,
  FileApiRequest,
  SearchApiRequest,
  SearchResult,
  SearchMatch,
  ApiState,
  ApiCache
} from './api';

// UI 컴포넌트 타입
export type {
  NotificationData,
  NotificationAction,
  ContextMenuState,
  ContextMenuItem,
  CreateDialogState,
  CreateFileParams,
  ValidationRules,
  ValidationResult,
  MessageType,
  MessageConfig,
  MessageState,
  ThemeConfig,
  LayoutState,
  BaseComponentProps,
  ControlProps
} from './ui';

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
  SidebarSection
} from './layout';
export { BREAKPOINTS, LAYOUT_SIZES, DOCUMENT_TYPE_LABELS, AI_SEARCH_TYPE_LABELS } from './layout';

// 공통 기본 타입
export type {
  Optional,
  RequiredFields,
  DeepPartial,
  Timestamp,
  ISODateString,
  SortOrder,
  LoadingState,
  ActionStatus,
  EventHandler,
  AsyncEventHandler,
  CancellableEventHandler,
  FilterOptions,
  SortOptions,
  AsyncState,
  Permission,
  Role,
  UserPermissions
} from './common';

// 기존 errorUtils 타입들도 re-export (일관성을 위해)
export type { LogLevel, ErrorContext } from '@/lib/utils/errorUtils';