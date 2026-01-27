# DMS 커스텀 훅 가이드

> 최종 업데이트: 2026-01-27

DMS 프로젝트에서 사용되는 커스텀 훅에 대한 상세 가이드입니다.

---

## 훅 개요

| 훅 | 파일 | 라인 | 용도 |
|----|------|------|------|
| `useFileSystem` | useFileSystem.ts | 272 | 파일 CRUD 작업 |
| `useTreeData` | useTreeData.ts | 259 | 트리 구조 관리 |
| `useEditor` | useEditor.ts | 435 | 에디터 상태 관리 |
| `useResize` | useResize.ts | 117 | 리사이즈 기능 |
| `useAutoScroll` | useAutoScroll.ts | 115 | 자동 스크롤 |
| `useMessage` | useMessage.ts | 95 | 메시지 표시 |
| `useContextMenu` | useContextMenu.ts | 72 | 컨텍스트 메뉴 |
| `useNotification` | useNotification.ts | 52 | 알림 관리 |
| `useFileOperations` | useFileOperations.ts | 194 | 파일 작업 유틸리티 |

---

## 1. useFileSystem

파일 시스템 관련 로직을 관리하는 핵심 훅입니다.

### 소스 위치
`hooks/useFileSystem.ts` (272 라인)

### 인터페이스

```typescript
interface UseFileSystemOptions {
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  autoRefresh?: boolean;  // 기본값: true
}

interface UseFileSystemReturn {
  // 상태
  files: FileNode[];
  loading: boolean;
  error: string | null;
  
  // 파일 CRUD 작업
  createFile: (path: string, content?: string) => Promise<void>;
  createFolder: (path: string) => Promise<void>;
  readFile: (path: string) => Promise<string>;
  updateFile: (path: string, content: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  renameFile: (oldPath: string, newPath: string) => Promise<void>;
  
  // 파일 목록 관리
  loadFiles: () => Promise<void>;
  refreshFiles: () => Promise<void>;
  
  // 유틸리티
  findNodeByPath: (path: string) => FileNode | null;
  isFileExists: (path: string) => boolean;
  getFileExtension: (path: string) => string;
  
  // 상태 관리
  clearError: () => void;
  setFiles: (files: FileNode[]) => void;
}
```

### 사용 예제

```typescript
import { useFileSystem } from '@/hooks';
import { useNotification } from '@/contexts/NotificationContext';

function WikiSidebar() {
  const { showNotification } = useNotification();
  
  const {
    files,
    loading,
    error,
    loadFiles,
    createFile,
    deleteFile,
    findNodeByPath
  } = useFileSystem({
    onSuccess: (msg) => showNotification('success', msg),
    onError: (msg) => showNotification('error', msg),
    autoRefresh: true
  });
  
  // 초기 로드
  useEffect(() => {
    loadFiles();
  }, [loadFiles]);
  
  // 파일 생성
  const handleCreate = async (path: string) => {
    await createFile(path, '# 새 문서\n');
  };
  
  // 파일 삭제
  const handleDelete = async (path: string) => {
    await deleteFile(path);
  };
  
  if (loading) return <Spinner />;
  if (error) return <ErrorMessage message={error} />;
  
  return <TreeComponent data={files} />;
}
```

### 주요 기능

| 기능 | 설명 |
|------|------|
| 파일 CRUD | 생성, 읽기, 수정, 삭제, 이름 변경 |
| 자동 새로고침 | `autoRefresh: true`시 작업 후 자동 갱신 |
| 에러 처리 | 에러 상태 관리 및 콜백 |
| 중복 요청 방지 | `operationInProgress` ref로 관리 |

---

## 2. useTreeData

트리 구조 데이터의 확장/축소, 검색, 선택 상태를 관리합니다.

### 소스 위치
`hooks/useTreeData.ts` (259 라인)

### 인터페이스

```typescript
interface UseTreeDataOptions {
  initialExpandedFolders?: Set<string>;
  initialSelectedFile?: string | null;
  searchDebounceMs?: number;
}

interface UseTreeDataReturn {
  // 상태
  expandedFolders: Set<string>;
  selectedFile: string | null;
  searchTerm: string;
  filteredData: FileNode[];
  
  // 노드 확장/축소
  toggleFolder: (path: string) => void;
  expandFolder: (path: string) => void;
  collapseFolder: (path: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  
  // 선택 관리
  selectFile: (path: string | null) => void;
  
  // 검색
  setSearchTerm: (term: string) => void;
  clearSearch: () => void;
  
  // 트리 네비게이션
  getParentPath: (path: string) => string | null;
  getNodeDepth: (path: string) => number;
  isNodeExpanded: (path: string) => boolean;
  isNodeSelected: (path: string) => boolean;
  
  // 유틸리티
  findNodeByPath: (path: string, nodes?: FileNode[]) => FileNode | null;
  getAllPaths: (nodes?: FileNode[]) => string[];
  getExpandedPaths: () => string[];
}
```

### 사용 예제

```typescript
import { useTreeData } from '@/hooks';

function FileTree({ files }: { files: FileNode[] }) {
  const {
    filteredData,
    expandedFolders,
    selectedFile,
    searchTerm,
    setSearchTerm,
    toggleFolder,
    selectFile,
    expandAll,
    collapseAll
  } = useTreeData(files, {
    initialExpandedFolders: new Set(['docs']),
    initialSelectedFile: null
  });
  
  return (
    <div>
      {/* 검색 */}
      <input
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="파일 검색..."
      />
      
      {/* 전체 확장/축소 */}
      <button onClick={expandAll}>모두 펼치기</button>
      <button onClick={collapseAll}>모두 접기</button>
      
      {/* 트리 렌더링 */}
      {filteredData.map(node => (
        <TreeNode
          key={node.path}
          node={node}
          isExpanded={expandedFolders.has(node.path)}
          isSelected={selectedFile === node.path}
          onToggle={() => toggleFolder(node.path)}
          onSelect={() => selectFile(node.path)}
        />
      ))}
    </div>
  );
}
```

### 주요 기능

| 기능 | 설명 |
|------|------|
| 검색 필터링 | `useMemo`로 캐싱된 검색 결과 |
| 확장/축소 | Set 기반 폴더 상태 관리 |
| 전체 확장/축소 | 모든 폴더 일괄 처리 |
| 선택 상태 | 단일 파일 선택 관리 |

---

## 3. useEditor

에디터 상태, 자동저장, Undo/Redo 기능을 관리합니다.

### 소스 위치
`hooks/useEditor.ts` (435 라인)

### 인터페이스

```typescript
interface EditorCursorPosition {
  line: number;
  column: number;
  position: number;  // 절대 위치
}

interface EditorSelection {
  start: EditorCursorPosition;
  end: EditorCursorPosition;
  text: string;
}

interface UseEditorOptions {
  autoSaveInterval?: number;  // 기본값: 30000 (30초)
  maxHistorySize?: number;    // 기본값: 50
  onContentChange?: (content: string) => void;
  onSave?: (content: string) => Promise<void>;
  onAutoSave?: (content: string) => Promise<void>;
}

interface UseEditorReturn {
  // 에디터 상태
  content: string;
  originalContent: string;
  hasUnsavedChanges: boolean;
  isAutoSaveEnabled: boolean;
  lastSaveTime: Date | null;
  autoSaveCountdown: number;
  isSaving: boolean;
  
  // 커서 및 선택
  cursorPosition: EditorCursorPosition | null;
  selection: EditorSelection | null;
  
  // Undo/Redo
  canUndo: boolean;
  canRedo: boolean;
  
  // 에디터 참조
  editorRef: React.RefObject<HTMLTextAreaElement | null>;
  
  // 내용 관리
  setContent: (content: string) => void;
  updateContent: (content: string) => void;
  resetContent: (newContent: string) => void;
  
  // 커서 및 선택 관리
  setCursorPosition: (position: number) => void;
  setSelection: (start: number, end: number) => void;
  getSelectedText: () => string;
  insertText: (text: string, replaceSelection?: boolean) => void;
  
  // Undo/Redo
  undo: () => void;
  redo: () => void;
  
  // 저장 관리
  save: () => Promise<void>;
  autoSave: () => Promise<void>;
  setAutoSaveEnabled: (enabled: boolean) => void;
  
  // 유틸리티
  getLineAtPosition: (position: number) => number;
  getColumnAtPosition: (position: number) => number;
  getPositionFromLineColumn: (line: number, column: number) => number;
  
  // 상태 관리
  markAsSaved: () => void;
  clearHistory: () => void;
}
```

### 사용 예제

```typescript
import { useEditor } from '@/hooks';

function MarkdownEditor({ 
  initialContent, 
  onSave 
}: EditorProps) {
  const {
    content,
    updateContent,
    hasUnsavedChanges,
    autoSaveCountdown,
    canUndo,
    canRedo,
    undo,
    redo,
    save,
    setAutoSaveEnabled
  } = useEditor(initialContent, {
    autoSaveInterval: 30000,  // 30초
    maxHistorySize: 100,
    onSave: async (content) => {
      await onSave(content);
    },
    onAutoSave: async (content) => {
      await onSave(content);
    }
  });
  
  return (
    <div>
      {/* 툴바 */}
      <div className="toolbar">
        <button onClick={undo} disabled={!canUndo}>Undo</button>
        <button onClick={redo} disabled={!canRedo}>Redo</button>
        <button onClick={save} disabled={!hasUnsavedChanges}>저장</button>
        
        {hasUnsavedChanges && (
          <span>자동 저장: {autoSaveCountdown}초</span>
        )}
      </div>
      
      {/* 에디터 */}
      <textarea
        value={content}
        onChange={(e) => updateContent(e.target.value)}
      />
    </div>
  );
}
```

### 주요 기능

| 기능 | 설명 |
|------|------|
| 자동 저장 | 설정된 간격으로 자동 저장 |
| Undo/Redo | 히스토리 기반 실행 취소/다시 실행 |
| 변경 추적 | 원본과 현재 내용 비교 |
| 커서 관리 | 위치 및 선택 영역 추적 |

---

## 4. useResize

리사이즈 가능한 패널을 위한 훅입니다.

### 인터페이스

```typescript
interface UseResizeOptions {
  minWidth?: number;
  maxWidth?: number;
  initialWidth?: number;
  direction?: 'horizontal' | 'vertical';
}

interface UseResizeReturn {
  width: number;
  isResizing: boolean;
  startResize: (e: React.MouseEvent) => void;
  resetWidth: () => void;
}
```

### 사용 예제

```typescript
import { useResize } from '@/hooks';

function ResizableSidebar() {
  const { width, isResizing, startResize } = useResize({
    minWidth: 200,
    maxWidth: 500,
    initialWidth: 280
  });
  
  return (
    <div style={{ width }}>
      <div className="content">사이드바 내용</div>
      <div 
        className="resize-handle"
        onMouseDown={startResize}
        style={{ cursor: isResizing ? 'col-resize' : 'ew-resize' }}
      />
    </div>
  );
}
```

---

## 5. useAutoScroll

자동 스크롤 기능을 제공합니다.

### 인터페이스

```typescript
interface UseAutoScrollOptions {
  behavior?: 'smooth' | 'instant';
  offset?: number;
}

interface UseAutoScrollReturn {
  containerRef: React.RefObject<HTMLDivElement>;
  scrollToElement: (selector: string) => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
}
```

---

## 6. useContextMenu

컨텍스트 메뉴 상태를 관리합니다.

### 인터페이스

```typescript
interface ContextMenuState {
  isOpen: boolean;
  position: { x: number; y: number };
  targetNode: FileNode | null;
}

interface UseContextMenuReturn {
  menuState: ContextMenuState;
  openMenu: (e: React.MouseEvent, node: FileNode) => void;
  closeMenu: () => void;
}
```

### 사용 예제

```typescript
import { useContextMenu } from '@/hooks';

function TreeComponent() {
  const { menuState, openMenu, closeMenu } = useContextMenu();
  
  return (
    <>
      <div onContextMenu={(e) => openMenu(e, selectedNode)}>
        {/* 트리 내용 */}
      </div>
      
      {menuState.isOpen && (
        <ContextMenu
          position={menuState.position}
          targetNode={menuState.targetNode}
          onClose={closeMenu}
        />
      )}
    </>
  );
}
```

---

## Import 방법

모든 훅은 `hooks/index.ts`를 통해 중앙에서 export됩니다:

```typescript
// 개별 import
import { useFileSystem } from '@/hooks/useFileSystem';
import { useTreeData } from '@/hooks/useTreeData';
import { useEditor } from '@/hooks/useEditor';

// 통합 import (권장)
import { 
  useFileSystem, 
  useTreeData, 
  useEditor,
  useResize,
  useAutoScroll
} from '@/hooks';

// 타입 import
import type { 
  UseFileSystemOptions, 
  UseFileSystemReturn,
  UseTreeDataOptions,
  UseTreeDataReturn,
  UseEditorOptions,
  UseEditorReturn
} from '@/hooks';
```

---

## 관련 문서

- [components.md](components.md) - 컴포넌트 가이드
- [service-overview.md](../domain/service-overview.md) - 서비스 개요
