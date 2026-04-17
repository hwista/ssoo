/**
 * Custom Hooks
 *
 * 애플리케이션 전체에서 사용하는 커스텀 훅
 */

// Tab
export { useOpenTabWithConfirm } from './useOpenTabWithConfirm';
export { useOpenDocumentTab } from './useOpenDocumentTab';
export type { OpenDocumentTabOptions } from './useOpenDocumentTab';

// Layout
export { useLayoutViewportSync } from './useLayoutViewportSync';

// Content
export { useBodyLinks } from './useBodyLinks';
export { useContentClickHandler } from './useContentClickHandler';
export type { ContentClickHandlerOptions } from './useContentClickHandler';

// Queries
export { useAiSearchQuery } from './queries/useAiSearch';
export { useFileTreeQuery } from './queries/useFileTree';
export {
  useAssistantSessionsQuery,
  useRemoveAssistantSessionMutation,
  useSaveAssistantSessionMutation,
} from './queries/useAssistantSessions';
export { useTemplateList, useTemplatesByReferenceDocument } from './queries/useTemplates';
