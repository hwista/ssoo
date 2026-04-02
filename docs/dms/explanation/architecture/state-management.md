# 상태 관리 (State Management)

> 최종 업데이트: 2026-04-02

DMS의 Zustand 기반 상태 관리 구조를 정의합니다.

---

## 상태 관리 패턴

DMS는 PMS 패턴을 따르되, 서버 인증/권한 관련 상태는 제외합니다.

``` 
src/stores/
├── index.ts                # 스토어 통합 export
├── layout.store.ts         # 디바이스/문서 타입 상태
├── sidebar.store.ts        # 사이드바 섹션/폴더 상태
├── tab.store.ts            # 탭 관리 (sessionStorage persist)
├── file.store.ts           # 파일 트리 데이터 (persist)
├── editor-core.store.ts    # 탭별 멀티 에디터 core store
├── editor.store.ts         # 에디터 React hook adapter
├── confirm.store.ts        # 전역 확인 다이얼로그
├── git.store.ts            # Git 변경/히스토리 상태
├── settings.store.ts       # 시스템+개인 설정 조회/저장 상태
├── settings-shell.store.ts # settings shell UI 상태
├── assistant-session.store.ts   # AI 세션/메시지 persist
├── assistant-panel.store.ts     # AI 패널 UI transient 상태
├── assistant-context.store.ts   # AI 첨부/템플릿/요약 컨텍스트
└── ai-search.store.ts      # AI 검색 기록
```

---

## 스토어 분류

### 1. Layout & Navigation (UI 상태)

#### `useLayoutStore`

디바이스 타입 및 문서 타입 관리

```typescript
interface LayoutStore {
  // State
  deviceType: DeviceType;       // 'desktop' | 'mobile'
  documentType: DocumentType;   // 'wiki' | 'blog' | 'dev'
  aiSearchType: AISearchType;   // 'rag' | 'summary'
  
  // Actions
  setDeviceType: (type: DeviceType) => void;
  setDocumentType: (type: DocumentType) => void;
  setAISearchType: (type: AISearchType) => void;
}
```

**특징:**
- viewport 동기화는 `useLayoutViewportSync()` 훅에서 React lifecycle로 수행
- SSR 호환 (typeof window 체크)

#### `useSidebarStore`

사이드바 UI 상태 관리

```typescript
interface SidebarStore {
  // State
  expandedSections: SidebarSection[];  // 펼쳐진 섹션
  searchQuery: string;                 // 검색어
  expandedFolders: Set<string>;        // 펼쳐진 폴더 경로
  isCompactMode: boolean;              // 컴팩트 모드
  sidebarOpen: boolean;                // 사이드바 표시

  // Actions
  toggleSection: (section: SidebarSection) => void;
  setSearchQuery: (query: string) => void;
  toggleFolder: (path: string) => void;
  expandFolder: (path: string) => void;
  collapseAllFolders: () => void;
  setCompactMode: (isCompact: boolean) => void;
  toggleSidebar: () => void;
}
```

**섹션 타입:**
- `bookmarks`: 북마크
- `openTabs`: 열린 탭
- `fileTree`: 파일 트리

#### `useTabStore` (persist)

탭 관리 - sessionStorage 영속화

```typescript
interface TabStore {
  // State
  tabs: TabItem[];
  activeTabId: string | null;
  maxTabs: number;  // 기본 16

  // Actions
  openTab: (options: OpenTabOptions) => string;
  closeTab: (tabId: string) => void;
  activateTab: (tabId: string) => void;
  closeOtherTabs: (tabId: string) => void;
  closeAllTabs: () => void;
  updateTabTitle: (tabId: string, title: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
}
```

**특징:**
- Home 탭은 닫기 불가 (`closable: false`)
- 최대 탭 수 초과 시 확인 다이얼로그 표시
- 탭 순서 드래그 앤 드롭 지원 (reorderTabs)

### 2. Data Store (데이터 상태)

#### `useFileStore` (persist)

파일 트리 및 북마크 관리 - PMS `useMenuStore` 대응

```typescript
interface FileStore {
  // State
  files: FileNode[];              // 파일 트리
  fileMap: Map<string, FileNode>; // 플랫 맵 (빠른 조회)
  bookmarks: BookmarkItem[];      // 북마크 목록
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  lastUpdatedAt: Date | null;

  // Actions
  loadFileTree: () => Promise<{ success: boolean; error?: string }>;
  refreshFileTree: () => Promise<void>;
  getFileByPath: (path: string) => FileNode | undefined;
  addBookmark: (bookmark: Omit<BookmarkItem, 'addedAt'>) => void;
  removeBookmark: (bookmarkId: string) => void;
  isBookmarked: (id: string) => boolean;
}
```

**특징:**
- 플랫 맵으로 O(1) 조회 (`buildFileMap`)
- 북마크 영속화 (persist)
- 초기화 상태로 중복 로드 방지

### 3. Editor Store (에디터 상태)

#### `useEditorStore`

탭 인스턴스에 바인딩된 에디터 멀티 스토어 훅입니다. 실제 Zustand store core는 `editor-core.store.ts` 에 두고, 이 파일은 React adapter만 담당합니다.

```typescript
interface EditorStore {
  content: string;
  currentFilePath: string | null;
  isEditing: boolean;
  fileMetadata: FileMetadata;
  documentMetadata: DocumentMetadata | null;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  isLoading: boolean;
  error: string | null;

  loadFile: (path: string) => Promise<void>;
  saveFile: (path: string, content: string) => Promise<void>;
  saveFileKeepEditing: (path: string, content: string) => Promise<void>;
  refreshFileMetadata: (path: string) => Promise<void>;
  updateDocumentMetadata: (update: Partial<DocumentMetadata>) => Promise<void>;
  setLocalDocumentMetadata: (update: Partial<DocumentMetadata>) => void;
  flushPendingMetadata: () => Promise<void>;
  discardPendingMetadata: () => Promise<void>;
  reset: () => void;
}
```

**특징:**
- keep-alive 탭마다 독립 상태를 유지하는 internal multi-store 구조
- public hook은 `TabInstanceProvider` 내부에서만 사용
- `saveFile`: 저장 후 편집 모드 종료
- `saveFileKeepEditing`: 저장 후 편집 모드 유지
- 에러 로깅 및 성능 측정 (PerformanceTimer)

### 4. UI Store

#### `useConfirmStore`

전역 확인 다이얼로그

```typescript
interface ConfirmStore {
  // State
  isOpen: boolean;
  options: ConfirmOptions | null;

  // Actions
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  handleConfirm: () => void;
  handleCancel: () => void;
}
```

**사용 예:**
```typescript
const { confirm } = useConfirmStore();

const result = await confirm({
  title: '탭 초과',
  description: '탭이 최대 개수에 도달했습니다.',
});

if (result) {
  // 확인 클릭
}
```

#### `useSettingsStore`

시스템 설정과 개인 설정을 합친 설정 snapshot, access 정보, 저장 API 상태를 관리합니다.

```typescript
interface SettingsStore {
  isLoaded: boolean;
  isLoading: boolean;
  isSaving: boolean;
  config: {
    system: DmsSystemConfigClient;
    personal: DmsPersonalSettingsClient;
  } | null;
  access: SettingsAccessClient | null;
  docDir: string;

  loadSettings: () => Promise<void>;
  updateSettings: (partial: DeepPartialClient<DmsSettingsConfigClient>) => Promise<boolean>;
  updateGitPath: (newPath: string, copyFiles: boolean) => Promise<boolean>;
}
```

#### `useSettingsShellStore`

workspace shell ↔ settings shell 전환과 active scope/section/view mode를 관리합니다.

```typescript
interface SettingsShellStore {
  isActive: boolean;
  activeScope: 'system' | 'personal';
  activeSectionId: string;
  activeViewMode: 'structured' | 'json' | 'diff';
  lastSectionByScope: Record<'system' | 'personal', string>;

  enterSettings: (scope?: SettingsScope) => void;
  exitSettings: () => void;
  openSection: (scope: SettingsScope, sectionId: string) => void;
  setScope: (scope: SettingsScope) => void;
  setSection: (sectionId: string) => void;
  setViewMode: (mode: SettingsViewMode) => void;
  applyWorkspacePreferences: (...) => void;
}
```

**특징:**
- `activeScope` 는 outer settings sidebar의 `시스템 설정` / `개인 설정` 선택 상태를 담당
- `activeSectionId` 는 `SettingsPage` 내부 좌측 navigation의 active section을 담당
- settings 검색 UI는 workspace 파일 검색과 input primitive를 공유하지만, query/result 상태는 `useSidebarStore.searchQuery` 와 분리된 shell 로컬 상태로 유지

### 5. Assistant Stores

#### `useAssistantSessionStore`

세션 영속 상태와 메시지 히스토리를 관리합니다.

```typescript
interface AssistantSessionStore {
  clientId: string;
  messages: AssistantMessage[];
  sessions: AssistantSession[];
  activeSessionId: string | null;
  sessionsLoaded: boolean;

  startNewSession: () => void;
  selectSession: (sessionId: string) => void;
  hydrateSessions: (sessions: AssistantSession[]) => void;
  mergeSessions: (sessions: AssistantSession[]) => void;
  markSessionsLoaded: () => void;
  setSessionPersisted: (sessionId: string, persisted: boolean) => void;
  appendMessage: (message: AssistantMessage) => AssistantMessage[];
  updateTextMessage: (id: string, updater: (prev: string) => string, pending?: boolean) => void;
}
```

#### `useAssistantPanelStore`

패널 열림 상태와 draft/processing/suggestions 같은 UI 상태를 관리합니다.

```typescript
interface AssistantPanelStore {
  isOpen: boolean;
  inputDraft: string;
  isProcessing: boolean;
  suggestions: string[];
  suggestionsCollapsed: boolean;

  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  setInputDraft: (value: string) => void;
  setIsProcessing: (value: boolean) => void;
  regenerateSuggestions: (count?: number) => void;
  setSuggestionsCollapsed: (value: boolean) => void;
  resetDraftState: () => void;
}
```

#### `useAssistantContextStore`

첨부 문서, 선택 템플릿, 요약 파일, relevance warning 같은 작성 컨텍스트를 관리합니다.

```typescript
interface AssistantContextStore {
  attachedReferences: Array<{ path: string; title: string }>;
  selectedTemplates: TemplateItem[];
  summaryFiles: Array<{ id: string; name: string; textContent: string; size: number }>;
  relevanceWarnings: string[];

  toggleReference: (reference: { path: string; title: string }) => void;
  setReferences: (references: Array<{ path: string; title: string }>) => void;
  removeReference: (path: string) => void;
  clearReferences: () => void;
  toggleTemplate: (template: TemplateItem) => void;
  removeTemplate: (id: string) => void;
  clearTemplates: () => void;
  upsertSummaryFiles: (files: AssistantSummaryFile[]) => void;
  removeSummaryFile: (id: string) => void;
  clearSummaryFiles: () => void;
  setRelevanceWarnings: (warnings: string[]) => void;
  resetContext: () => void;
}
```

---

## PMS 대응표

| PMS Store | DMS Store | 설명 |
|-----------|-----------|------|
| `useAuthStore` | - | DMS는 인증 없음 |
| `useMenuStore` | `useFileStore` | 메뉴 → 파일 트리 |
| `useLayoutStore` | `useLayoutStore` | 동일 패턴 |
| `useSidebarStore` | `useSidebarStore` | 동일 패턴 |
| `useTabStore` | `useTabStore` | 동일 패턴 |
| - | `useEditorStore` | DMS 전용 (마크다운 편집) |
| - | `useConfirmStore` | DMS 전용 (전역 다이얼로그) |
| - | `useAssistantSessionStore` | DMS 전용 (세션/메시지 영속 상태) |
| - | `useAssistantPanelStore` | DMS 전용 (패널 UI transient 상태) |
| - | `useAssistantContextStore` | DMS 전용 (assistant 작성 컨텍스트) |

---

## 영속화 (Persist)

영속화되는 스토어:

| Store | Storage Key | 영속화 데이터 |
|-------|-------------|--------------|
| `useTabStore` | `dms-tab-storage` | `sessionStorage`: tabs, activeTabId |
| `useFileStore` | `dms-file-storage` | `localStorage`: bookmarks |
| `useAssistantSessionStore` | `dms-assistant-session-store` | `localStorage`: clientId, sessions, messages, activeSessionId |

**Persist 설정:**
```typescript
persist(
  (set, get) => ({ ... }),
  {
    name: 'dms-tab-storage',
    storage: createJSONStorage(() => sessionStorage),
    partialize: (state) => ({
      tabs: state.tabs,
      activeTabId: state.activeTabId,
    }),
  }
)
```

---

## 관련 문서

- [app-initialization-flow.md](app-initialization-flow.md) - 초기화 시 스토어 로드 순서
- [page-routing.md](page-routing.md) - 탭과 라우팅 연동

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-04-02 | `useSettingsShellStore` 기준으로 outer scope navigation과 `SettingsPage` inner section navigation 책임을 분리 |
| 2026-04-02 | `useSettingsStore`를 system/personal/access snapshot 기반으로 확장하고 `useSettingsShellStore`를 추가해 settings shell 전환 상태를 분리 |
| 2026-03-12 | assistant session/panel/context store 분리, editor 멀티 스토어 구조, tab sessionStorage 정책 반영 |
| 2026-02-24 | Codex 품질 게이트 엄격 모드 적용에 맞춰 문서 메타 섹션 보강 |
