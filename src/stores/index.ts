// ============================================
// Stores Index
// DMS 스토어 통합 export
// ============================================

// Layout & Navigation
export { useLayoutStore } from './layout.store';
export { useSidebarStore } from './sidebar.store';
export { useTabStore, HOME_TAB } from './tab.store';

// Data
export { useFileStore } from './file.store';

// Editor (문서 편집 상태 - core store + React adapter 분리)
export { useEditorStore, useActiveEditorFilePath } from './editor.store';

// UI
export { useConfirmStore } from './confirm.store';

// Git
export { useGitStore } from './git.store';

// Settings
export { useSettingsStore } from './settings.store';

// Assistant
export { useAssistantSessionStore } from './assistant-session.store';
export { useAssistantPanelStore } from './assistant-panel.store';
export { useAssistantContextStore } from './assistant-context.store';
export type { AssistantMessage, AssistantSearchResult, AssistantSession } from './assistant-session.store';

// AI Search
export { useAiSearchStore } from './ai-search.store';
export type { AiSearchHistoryItem } from './ai-search.store';
