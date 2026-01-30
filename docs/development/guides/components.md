# DMS 컴포넌트 가이드

> 최종 업데이트: 2026-01-27

DMS 프로젝트의 React 컴포넌트 구조와 사용법에 대한 가이드입니다.

---

## 컴포넌트 개요

### 폴더 구조

```
components/
├── WikiApp.tsx              # 메인 앱 컨테이너
├── WikiSidebar.tsx          # 사이드바 (트리 + 검색)
├── WikiEditor.tsx           # 에디터 영역
├── WikiModals.tsx           # 모달 컨테이너
├── TreeComponent.tsx        # 파일 트리 (464줄)
├── CreateFileModal.tsx      # 파일/폴더 생성 모달
├── MessageModal.tsx         # 범용 메시지 모달
├── SearchPanel.tsx          # 검색 패널
├── GeminiChat.tsx           # Gemini AI 채팅
├── AIChat.tsx               # RAG 기반 AI 검색
├── Notification.tsx         # 알림 컴포넌트
├── NotificationContainer.tsx # 알림 컨테이너
├── ThemeToggle.tsx          # 테마 토글
├── VersionHistory.tsx       # 버전 히스토리
├── TagManager.tsx           # 태그 관리
├── TemplateSelector.tsx     # 템플릿 선택
├── PluginManager.tsx        # 플러그인 관리
├── PermissionEditor.tsx     # 권한 편집
├── RoleManager.tsx          # 역할 관리
├── editor/                  # 에디터 컴포넌트
│   ├── BlockEditor.tsx
│   ├── EditorToolbar.tsx
│   └── SlashCommand.tsx
├── ui/                      # 기본 UI 컴포넌트
│   ├── button.tsx
│   ├── card.tsx
│   └── input.tsx
└── wiki/
    └── ContextMenu.tsx
```

---

## 1. 핵심 컴포넌트

### 1.1 WikiApp

메인 앱 컨테이너로, 전체 레이아웃과 Context Provider를 관리합니다.

**소스**: `components/WikiApp.tsx` (183 라인)

```tsx
interface WikiAppProps {
  initialFiles?: FileNode[];
}

// 사용
<WikiApp initialFiles={[]} />
```

**구조**:
```
┌────────────────────────────────────────────────────┐
│                      WikiApp                        │
├─────┬────────────────────┬─────────────────────────┤
│Side │    WikiSidebar     │      WikiEditor          │
│ Bar │   (Resizable)      │                          │
│     │   - TreeComponent  │   - BlockEditor          │
│     │   - SearchPanel    │   - EditorToolbar        │
│     │                    │                          │
├─────┴────────────────────┴─────────────────────────┤
│              WikiModals + Notifications             │
└────────────────────────────────────────────────────┘
```

**Provider 계층**:
```tsx
<WikiProvider>
  <TreeDataProvider>
    <NotificationProvider>
      <WikiAppWithTreeData />
    </NotificationProvider>
  </TreeDataProvider>
</WikiProvider>
```

---

### 1.2 TreeComponent

파일 시스템을 트리 형태로 표시하는 핵심 컴포넌트입니다.

**소스**: `components/TreeComponent.tsx` (464 라인)

```tsx
interface TreeComponentProps {
  // 데이터
  treeData: FileNode[];
  selectedFile?: string | null;
  
  // 이벤트 핸들러
  onFileSelect?: (path: string) => void;
  onContextMenu?: (event: React.MouseEvent, node: FileNode | null) => void;
  onToggleFolder?: (path: string) => void;
  
  // 검색 기능
  showSearch?: boolean;
  searchPlaceholder?: string;
  
  // 확장/접기
  showExpandCollapseButtons?: boolean;
  defaultExpanded?: boolean;
  expandedFolders?: Set<string>;
  onExpandedFoldersChange?: (folders: Set<string>) => void;
  
  // 컨텍스트 메뉴
  enableContextMenu?: boolean;
  
  // 표시 옵션
  showOnlyFolders?: boolean;
  showFileIcons?: boolean;
  
  // 시각적 피드백
  newlyCreatedItems?: Set<string>;
  updatedItems?: Set<string>;
  
  // 인라인 편집
  renamingItem?: { path: string; newName: string } | null;
  onRename?: (oldPath: string, newName: string) => void;
  onCancelRename?: () => void;
  onRenamingNameChange?: (newName: string) => void;
  
  // 스타일링
  className?: string;
  height?: string;
}
```

**사용 예제**:
```tsx
<TreeComponent
  treeData={files}
  selectedFile={currentFile}
  onFileSelect={handleFileSelect}
  showSearch={true}
  enableContextMenu={true}
  newlyCreatedItems={newItems}
  updatedItems={modifiedItems}
  expandedFolders={expanded}
  onExpandedFoldersChange={setExpanded}
/>
```

**주요 기능**:
| 기능 | 설명 |
|------|------|
| 검색 | 실시간 파일명 검색 |
| 컨텍스트 메뉴 | 우클릭 파일 관리 |
| 시각적 피드백 | NEW/UPDATE 뱃지 |
| 인라인 편집 | 파일명 즉시 수정 |
| 자동 스크롤 | 선택/생성 항목으로 스크롤 |
| 키보드 지원 | Enter/Esc 키 |

---

### 1.3 WikiEditor

마크다운 에디터 영역을 관리합니다.

```tsx
interface WikiEditorProps {
  className?: string;
}

// WikiContext에서 상태 가져옴
const {
  currentFile,
  content,
  setContent,
  saveFile,
  isModified
} = useWikiContext();
```

---

## 2. 모달 컴포넌트

### 2.1 CreateFileModal

파일/폴더 생성 모달입니다.

```tsx
interface CreateFileModalProps {
  isOpen: boolean;
  mode: 'file' | 'folder';
  initialPath: string;
  treeData: FileNode[];
  onConfirm: (params: CreateParams) => void;
  onClose: () => void;
}

interface CreateParams {
  name: string;
  extension: string;
  path: string;
  type: 'file' | 'folder';
}
```

**사용 예제**:
```tsx
<CreateFileModal
  isOpen={showCreateModal}
  mode="file"
  initialPath="docs"
  treeData={files}
  onConfirm={handleCreate}
  onClose={() => setShowCreateModal(false)}
/>
```

---

### 2.2 MessageModal

범용 메시지 모달입니다.

```tsx
interface MessageModalProps {
  isOpen: boolean;
  type: 'info' | 'warning' | 'error';
  title: string;
  message: string;
  details?: string;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
  onClose: () => void;
}
```

**사용 예제**:
```tsx
<MessageModal
  isOpen={showDeleteConfirm}
  type="warning"
  title="파일 삭제"
  message="정말로 이 파일을 삭제하시겠습니까?"
  confirmText="삭제"
  cancelText="취소"
  showCancel={true}
  onConfirm={handleDelete}
  onCancel={() => setShowDeleteConfirm(false)}
  onClose={() => setShowDeleteConfirm(false)}
/>
```

---

## 3. 알림 컴포넌트

### 3.1 Notification

개별 알림을 표시합니다.

```tsx
interface NotificationProps {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
  index?: number;
  onClose: (id: string) => void;
}
```

### 3.2 NotificationContainer

모든 알림을 관리하는 컨테이너입니다.

```tsx
// NotificationContext와 연동
const { notifications, removeNotification } = useNotification();

return (
  <div className="fixed top-4 right-4 z-50 space-y-2">
    {notifications.map((notif, index) => (
      <Notification
        key={notif.id}
        {...notif}
        index={index}
        onClose={removeNotification}
      />
    ))}
  </div>
);
```

---

## 4. 에디터 컴포넌트

### 4.1 BlockEditor

Tiptap 기반 블록 에디터입니다.

**소스**: `components/editor/BlockEditor.tsx`

```tsx
interface BlockEditorProps {
  content: string;
  onChange: (content: string) => void;
  editable?: boolean;
}
```

**포함 확장**:
- StarterKit (기본 에디터 기능)
- CodeBlockLowlight (코드 구문 강조)
- Image (이미지 삽입)
- Link (링크)
- Table (테이블)
- TaskList (체크리스트)
- Highlight (텍스트 하이라이트)
- Placeholder (플레이스홀더)

### 4.2 EditorToolbar

에디터 상단 툴바입니다.

```tsx
interface EditorToolbarProps {
  editor: Editor | null;
}

// 제공 기능
- Bold, Italic, Strikethrough
- Headings (H1, H2, H3)
- Lists (Bullet, Numbered, Task)
- Code Block
- Link, Image
- Table
- Undo/Redo
```

### 4.3 SlashCommand

슬래시(/) 명령어 메뉴입니다.

```tsx
// 사용법: 에디터에서 "/" 입력
// 제공 명령어:
- /h1, /h2, /h3 - 제목
- /bullet - 목록
- /number - 번호 목록
- /task - 체크리스트
- /code - 코드 블록
- /image - 이미지
- /table - 테이블
```

---

## 5. AI 컴포넌트

### 5.1 GeminiChat

Google Gemini API와 연동되는 채팅 컴포넌트입니다.

```tsx
interface GeminiChatProps {
  onClose?: () => void;
}

// GeminiChatContext 사용
const {
  messages,
  sendMessage,
  isLoading,
  clearMessages
} = useGeminiChat();
```

### 5.2 AIChat

RAG 기반 문서 검색 AI입니다.

```tsx
interface AIChatProps {
  onClose?: () => void;
}

// 벡터 검색 + Gemini 결합
// LanceDB 임베딩 사용
```

---

## 6. UI 컴포넌트

### 6.1 Button

```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
}

// 사용
<Button variant="default" size="md">저장</Button>
<Button variant="outline">취소</Button>
<Button variant="destructive">삭제</Button>
```

### 6.2 Input

```tsx
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

// 사용
<Input 
  placeholder="검색어 입력..." 
  value={query}
  onChange={(e) => setQuery(e.target.value)}
/>
```

### 6.3 Card

```tsx
interface CardProps {
  className?: string;
  children: React.ReactNode;
}

// 사용
<Card className="p-4">
  <CardHeader>제목</CardHeader>
  <CardContent>내용</CardContent>
</Card>
```

---

## 7. Context 연동

### 7.1 WikiContext

```tsx
// WikiContext에서 제공하는 값
interface WikiContextValue {
  files: FileNode[];
  currentFile: string | null;
  content: string;
  isModified: boolean;
  loadFile: (path: string) => Promise<void>;
  saveFile: () => Promise<void>;
  setContent: (content: string) => void;
  createFile: (path: string, content?: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  refreshFiles: () => Promise<void>;
}

// 사용
const { files, loadFile, saveFile } = useWikiContext();
```

### 7.2 TreeDataContext

```tsx
// TreeDataContext에서 제공하는 값
interface TreeDataContextValue {
  selectedFile: string | null;
  expandedFolders: Set<string>;
  selectFile: (path: string | null) => void;
  toggleFolder: (path: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
}

// 사용
const { selectedFile, selectFile, toggleFolder } = useTreeDataContext();
```

### 7.3 NotificationContext

```tsx
// NotificationContext에서 제공하는 값
interface NotificationContextValue {
  notifications: NotificationData[];
  addNotification: (type: NotificationType, title: string, message?: string) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

// 사용
const { addNotification } = useNotification();
addNotification('success', '저장 완료', '파일이 저장되었습니다.');
```

---

## 로딩 스피너 표준

DMS는 PMS 기준에 맞춰 로딩 스피너를 공통으로 사용합니다.

| 컴포넌트 | 용도 | 사용 위치 |
|----------|------|----------|
| `LoadingState` | 페이지/섹션 로딩 | `ContentArea`, `DocPageTemplate` |
| `LoadingSpinner` | 버튼/인라인 로딩 | 헤더 액션, AI 검색 버튼 |

**가이드**
- 페이지/템플릿 로딩: `LoadingState` 사용
- 버튼 내부 로딩: `LoadingSpinner` 사용
- 개별 컴포넌트 커스텀 스피너는 지양

---

## 관련 문서

- [hooks.md](hooks.md) - 커스텀 훅 가이드
- [api.md](api.md) - API 가이드
- [design-system.md](../design/design-system.md) - 디자인 시스템
