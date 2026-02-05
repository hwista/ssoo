# 상태 관리 (State Management)

> 최종 업데이트: 2026-02-02

DMS의 Zustand 기반 상태 관리 구조를 정의합니다.

---

## 상태 관리 패턴

DMS는 PMS 패턴을 따르되, 서버 인증/권한 관련 상태는 제외합니다.

```
src/stores/
├── index.ts                # 스토어 통합 export
├── layout.store.ts         # 디바이스/문서 타입 상태
├── sidebar.store.ts        # 사이드바 섹션/폴더 상태
├── tab.store.ts            # 탭 관리 (persist)
├── file.store.ts           # 파일 트리 데이터 (persist)
├── editor.store.ts         # 에디터 상태
└── confirm.store.ts        # 전역 확인 다이얼로그
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
- 윈도우 리사이즈 리스너로 자동 디바이스 타입 감지
- 디바운스(100ms) 적용
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

탭 관리 - localStorage 영속화

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

마크다운 에디터 상태 관리

```typescript
interface EditorStore {
  // State
  content: string;                  // 에디터 내용
  currentFilePath: string | null;   // 현재 파일 경로
  isEditing: boolean;               // 편집 모드
  fileMetadata: FileMetadata;       // 파일 메타데이터
  isLoading: boolean;
  error: string | null;

  // Actions
  setContent: (content: string) => void;
  setIsEditing: (editing: boolean) => void;
  loadFile: (path: string) => Promise<void>;
  saveFile: (path: string, content: string) => Promise<void>;
  saveFileKeepEditing: (path: string, content: string) => Promise<void>;
  refreshFileMetadata: (path: string) => Promise<void>;
  reset: () => void;
}
```

**특징:**
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

---

## 영속화 (Persist)

LocalStorage에 영속화되는 스토어:

| Store | Storage Key | 영속화 데이터 |
|-------|-------------|--------------|
| `useTabStore` | `dms-tab-storage` | tabs, activeTabId |
| `useFileStore` | `dms-file-storage` | bookmarks |

**Persist 설정:**
```typescript
persist(
  (set, get) => ({ ... }),
  {
    name: 'dms-tab-storage',
    storage: createJSONStorage(() => localStorage),
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
