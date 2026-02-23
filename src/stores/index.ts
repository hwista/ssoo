// ============================================
// Stores Index
// 스토어 통합 export (PMS 컨벤션)
// ============================================

// Layout & Navigation
export { useLayoutStore } from './layout.store';
export { useSidebarStore } from './sidebar.store';
export { useTabStore, HOME_TAB } from './tab.store';

// Data (PMS menu.store 대응)
export { useFileStore } from './file.store';

// Editor (문서 편집 상태 - 탭별 멀티 스토어)
export { useEditorStore, useActiveEditorFilePath } from './editor.store';

// UI
export { useConfirmStore } from './confirm.store';

// Git
export { useGitStore } from './git.store';

// Settings
export { useSettingsStore } from './settings.store';

// Assistant
export { useAssistantStore } from './assistant.store';
export type { AssistantMessage, AssistantSearchResult, AssistantSession } from './assistant.store';
