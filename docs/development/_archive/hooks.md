# 🪝 Custom Hooks Reference

Markdown Wiki System의 모든 커스텀 훅과 사용법을 설명합니다.

## 📋 목차

1. [개요](#-개요)
2. [파일 시스템 훅](#-파일-시스템-훅)
3. [트리 데이터 훅](#-트리-데이터-훅)
4. [에디터 훅](#-에디터-훅)
5. [리사이즈 훅](#-리사이즈-훅)
6. [자동 스크롤 훅](#-자동-스크롤-훅)
7. [사용 예제](#-사용-예제)

---

## 🎯 개요

Phase 3 리팩토링에서 추출된 5개의 커스텀 훅은 컴포넌트에서 비즈니스 로직을 분리하여 재사용성과 유지보수성을 향상시킵니다.

### 훅 목록

| 훅 | 파일 | 라인 수 | 용도 | 통합 여부 |
|---|---|---------|------|-----------|
| `useFileSystem` | hooks/useFileSystem.ts | 274 | 파일 CRUD 작업 | ✅ Context |
| `useTreeData` | hooks/useTreeData.ts | 274 | 트리 검색/확장/선택 | ✅ WikiSidebar |
| `useEditor` | hooks/useEditor.ts | 471 | 에디터 상태 및 자동저장 | ✅ WikiEditor |
| `useResize` | hooks/useResize.ts | 120 | 리사이즈 핸들링 | ✅ WikiApp |
| `useAutoScroll` | hooks/useAutoScroll.ts | 142 | 스크롤 동기화 | ⏳ Phase 4 |

### 타입 정의

모든 훅의 타입 정의는 `types/hooks.ts`에 중앙화되어 있습니다 (111라인).

---

## 📁 파일 시스템 훅

### useFileSystem

**파일**: `hooks/useFileSystem.ts` (274라인)  
**목적**: 파일 트리 CRUD 로직 캡슐화

#### 인터페이스

```typescript
interface UseFileSystemOptions extends HookOptions {
  autoLoad?: boolean;
  onSuccess?: (action: string, data?: any) => void;
  onError?: (action: string, error: Error) => void;
}

interface UseFileSystemReturn {
  // 상태
  files: FileNode[];
  selectedFile: string | null;
  expandedFolders: Set<string>;
  isLoading: boolean;
  
  // 작업
  loadFiles: () => Promise<void>;
  createFile: (path: string, name: string) => Promise<void>;
  createFolder: (path: string, name: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  deleteFolder: (path: string) => Promise<void>;
  moveFile: (oldPath: string, newPath: string) => Promise<void>;
  moveFolder: (oldPath: string, newPath: string) => Promise<void>;
  
  // 조회
  getFileContent: (path: string) => Promise<string>;
  
  // 상태 관리
  setSelectedFile: (path: string | null) => void;
  toggleFolder: (path: string) => void;
}
```

#### 사용 예제

```typescript
import { useFileSystem } from '@/hooks/useFileSystem';

function FileManager() {
  const {
    files,
    selectedFile,
    isLoading,
    createFile,
    deleteFile,
    getFileContent
  } = useFileSystem({
    autoLoad: true,
    onSuccess: (action, data) => {
      console.log(`${action} 성공:`, data);
    },
    onError: (action, error) => {
      console.error(`${action} 실패:`, error);
    }
  });
  
  // 파일 생성
  const handleCreateFile = async () => {
    await createFile('docs', 'new-file.md');
  };
  
  // 파일 내용 로드
  const handleLoadFile = async (path: string) => {
    const content = await getFileContent(path);
    console.log(content);
  };
  
  return (
    <div>
      {isLoading ? '로딩 중...' : `파일 ${files.length}개`}
      <button onClick={handleCreateFile}>파일 생성</button>
    </div>
  );
}
```

#### 주요 기능

- ✅ 파일/폴더 생성, 삭제, 이동
- ✅ 파일 내용 조회
- ✅ 선택/확장 상태 관리
- ✅ 자동 로딩 옵션
- ✅ 성공/에러 콜백

---

## 🌳 트리 데이터 훅

### useTreeData

**파일**: `hooks/useTreeData.ts` (274라인)  
**목적**: 트리 검색/확장/선택 로직 최적화

#### 인터페이스

```typescript
interface UseTreeDataOptions extends HookOptions {
  initialExpanded?: Set<string>;
  initialSelected?: string | null;
  onSelect?: (path: string | null) => void;
}

interface UseTreeDataReturn {
  // 데이터
  treeData: FileNode[];
  filteredData: FileNode[];
  
  // 검색
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
  // 확장/축소
  expandedFolders: Set<string>;
  toggleFolder: (path: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  
  // 선택
  selectedFile: string | null;
  selectFile: (path: string | null) => void;
  
  // 유틸리티
  findNode: (path: string) => FileNode | null;
  getAllPaths: () => string[];
}
```

#### 사용 예제

```typescript
import { useTreeData } from '@/hooks/useTreeData';

function FileTree({ files }: { files: FileNode[] }) {
  const {
    filteredData,
    searchQuery,
    setSearchQuery,
    expandedFolders,
    toggleFolder,
    selectedFile,
    selectFile
  } = useTreeData(files, {
    initialExpanded: new Set(['docs', 'src']),
    onSelect: (path) => {
      console.log('선택된 파일:', path);
    }
  });
  
  return (
    <div>
      {/* 검색 */}
      <input
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="파일 검색..."
      />
      
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

#### 주요 기능

- ✅ 실시간 검색 (메모이제이션)
- ✅ 폴더 확장/축소 (Set 기반)
- ✅ 파일 선택 관리
- ✅ 전체 확장/축소
- ✅ 노드 찾기 유틸리티

#### 성능 최적화

```typescript
// useMemo로 검색 결과 캐싱
const filteredData = useMemo(() => {
  if (!searchQuery) return treeData;
  return filterTreeData(treeData, searchQuery);
}, [treeData, searchQuery]);
```

---

## ✍️ 에디터 훅

### useEditor

**파일**: `hooks/useEditor.ts` (471라인)  
**목적**: 에디터 상태 및 자동저장 통합

#### 인터페이스

```typescript
interface UseEditorOptions extends HookOptions {
  initialContent?: string;
  autoSaveInterval?: number; // 기본 30초
  maxHistorySize?: number;   // 기본 50
  onSave?: (content: string) => Promise<void>;
  onAutoSave?: (content: string) => Promise<void>;
}

interface UseEditorReturn {
  // 내용
  content: string;
  updateContent: (newContent: string) => void;
  
  // 변경 추적
  hasUnsavedChanges: boolean;
  lastSavedContent: string;
  
  // 자동 저장
  saveCountdown: number;
  resetAutoSave: () => void;
  
  // 히스토리
  history: string[];
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  
  // 커서/선택
  cursorPosition: { line: number; column: number } | null;
  selectionRange: { start: number; end: number } | null;
  setCursorPosition: (pos: { line: number; column: number }) => void;
  setSelectionRange: (range: { start: number; end: number }) => void;
  
  // 저장
  save: () => Promise<void>;
}
```

#### 사용 예제

```typescript
import { useEditor } from '@/hooks/useEditor';

function MarkdownEditor({ initialContent, onSave }: EditorProps) {
  const {
    content,
    updateContent,
    hasUnsavedChanges,
    saveCountdown,
    canUndo,
    canRedo,
    undo,
    redo,
    save
  } = useEditor({
    initialContent,
    autoSaveInterval: 30000, // 30초
    onSave: async (content) => {
      await onSave(content);
    },
    onAutoSave: async (content) => {
      console.log('자동 저장:', content.length, '글자');
    }
  });
  
  return (
    <div>
      {/* 저장 상태 */}
      <div className="status-bar">
        {hasUnsavedChanges && `자동 저장: ${saveCountdown}초 후`}
      </div>
      
      {/* 도구 모음 */}
      <div className="toolbar">
        <button onClick={undo} disabled={!canUndo}>Undo</button>
        <button onClick={redo} disabled={!canRedo}>Redo</button>
        <button onClick={save} disabled={!hasUnsavedChanges}>Save</button>
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

#### 주요 기능

- ✅ 내용 변경 추적
- ✅ 자동 저장 타이머 (30초 간격)
- ✅ 저장 카운트다운 표시
- ✅ 히스토리 스택 (undo/redo)
- ✅ 커서/선택 위치 관리
- ✅ Cleanup 자동화 (useEffect)

#### 자동 저장 동작

```typescript
// 30초 간격으로 자동 저장
useEffect(() => {
  if (!hasUnsavedChanges) return;
  
  const timer = setInterval(() => {
    setCountdown(prev => {
      if (prev <= 1) {
        handleAutoSave();
        return autoSaveInterval / 1000;
      }
      return prev - 1;
    });
  }, 1000);
  
  return () => clearInterval(timer); // Cleanup
}, [hasUnsavedChanges]);
```

---

## 📏 리사이즈 훅

### useResize

**파일**: `hooks/useResize.ts` (120라인)  
**목적**: 리사이즈 패널 로직 추상화

#### 인터페이스

```typescript
interface UseResizeOptions extends HookOptions {
  minSize?: number;
  maxSize?: number;
  initialSize?: number;
  onResizeStart?: () => void;
  onResize?: (size: number) => void;
  onResizeEnd?: () => void;
}

interface UseResizeReturn {
  size: number;
  isResizing: boolean;
  handleMouseDown: (e: React.MouseEvent) => void;
}
```

#### 사용 예제

```typescript
import { useResize } from '@/hooks/useResize';

function ResizablePanel() {
  const {
    size,
    isResizing,
    handleMouseDown
  } = useResize({
    minSize: 200,
    maxSize: 600,
    initialSize: 300,
    onResize: (newSize) => {
      console.log('패널 크기:', newSize);
    }
  });
  
  return (
    <div className="resizable-container">
      {/* 좌측 패널 */}
      <div style={{ width: size }}>
        사이드바
      </div>
      
      {/* 리사이즈 핸들 */}
      <div
        className={`resize-handle ${isResizing ? 'active' : ''}`}
        onMouseDown={handleMouseDown}
      />
      
      {/* 우측 패널 */}
      <div style={{ flex: 1 }}>
        메인 컨텐츠
      </div>
    </div>
  );
}
```

#### 주요 기능

- ✅ 최소/최대 크기 제한
- ✅ 드래그 상태 추적
- ✅ requestAnimationFrame 쓰로틀링
- ✅ 이벤트 리스너 자동 제거

#### 성능 최적화

```typescript
// rAF로 리사이즈 이벤트 쓰로틀링
const handleMouseMove = useCallback((e: MouseEvent) => {
  if (!rafRef.current) {
    rafRef.current = requestAnimationFrame(() => {
      const newSize = calculateSize(e.clientX);
      setSize(clamp(newSize, minSize, maxSize));
      rafRef.current = null;
    });
  }
}, [minSize, maxSize]);
```

---

## 🔄 자동 스크롤 훅

### useAutoScroll

**파일**: `hooks/useAutoScroll.ts` (142라인)  
**목적**: 에디터-미리보기 스크롤 동기화

> **참고**: 현재 구현 완료되었으나 Split View UI가 필요하여 Phase 4에서 통합 예정

#### 인터페이스

```typescript
interface UseAutoScrollOptions extends HookOptions {
  enabled?: boolean;
  syncDirection?: 'editor-to-preview' | 'preview-to-editor' | 'both';
  debounceMs?: number; // 기본 50ms
}

interface UseAutoScrollReturn {
  editorRef: React.RefObject<HTMLTextAreaElement>;
  previewRef: React.RefObject<HTMLDivElement>;
  isSyncing: boolean;
  enable: () => void;
  disable: () => void;
  toggle: () => void;
}
```

#### 사용 예제 (Phase 4 예정)

```typescript
import { useAutoScroll } from '@/hooks/useAutoScroll';

function SplitViewEditor() {
  const {
    editorRef,
    previewRef,
    isSyncing,
    toggle
  } = useAutoScroll({
    enabled: true,
    syncDirection: 'both',
    debounceMs: 50
  });
  
  return (
    <div className="split-view">
      {/* 좌측 에디터 */}
      <textarea
        ref={editorRef}
        className="editor"
      />
      
      {/* 우측 미리보기 */}
      <div
        ref={previewRef}
        className="preview"
      />
      
      {/* 동기화 토글 */}
      <button onClick={toggle}>
        {isSyncing ? '동기화 활성화' : '동기화 비활성화'}
      </button>
    </div>
  );
}
```

#### 주요 기능

- ✅ 양방향 스크롤 동기화
- ✅ 디바운스 (50ms)
- ✅ 활성화/비활성화
- ✅ Cleanup 자동화

#### 동기화 알고리즘

```typescript
// 스크롤 비율 계산 및 동기화
const syncScroll = (sourceRef: HTMLElement, targetRef: HTMLElement) => {
  const scrollRatio = sourceRef.scrollTop / 
    (sourceRef.scrollHeight - sourceRef.clientHeight);
  
  const targetScrollTop = scrollRatio * 
    (targetRef.scrollHeight - targetRef.clientHeight);
  
  targetRef.scrollTo({
    top: targetScrollTop,
    behavior: 'smooth'
  });
};
```

---

## 💡 사용 예제

### 전체 통합 예제

```typescript
import { useFileSystem } from '@/hooks/useFileSystem';
import { useTreeData } from '@/hooks/useTreeData';
import { useEditor } from '@/hooks/useEditor';

function WikiPage() {
  // 파일 시스템 관리
  const {
    files,
    selectedFile,
    setSelectedFile,
    getFileContent,
    createFile
  } = useFileSystem({ autoLoad: true });
  
  // 트리 검색/확장
  const {
    filteredData,
    searchQuery,
    setSearchQuery,
    expandedFolders,
    toggleFolder
  } = useTreeData(files, {
    onSelect: setSelectedFile
  });
  
  // 에디터 상태
  const {
    content,
    updateContent,
    hasUnsavedChanges,
    save
  } = useEditor({
    initialContent: '',
    onSave: async (content) => {
      if (selectedFile) {
        await saveFile(selectedFile, content);
      }
    }
  });
  
  // 파일 선택 시 내용 로드
  useEffect(() => {
    if (selectedFile) {
      getFileContent(selectedFile).then(updateContent);
    }
  }, [selectedFile]);
  
  return (
    <div className="wiki-page">
      {/* 사이드바 */}
      <aside>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <FileTree
          data={filteredData}
          expanded={expandedFolders}
          selected={selectedFile}
          onToggle={toggleFolder}
          onSelect={setSelectedFile}
        />
      </aside>
      
      {/* 에디터 */}
      <main>
        <textarea
          value={content}
          onChange={(e) => updateContent(e.target.value)}
        />
        <button onClick={save} disabled={!hasUnsavedChanges}>
          저장
        </button>
      </main>
    </div>
  );
}
```

### Context와 함께 사용

```typescript
// Context에서 훅 래핑
export function WikiProvider({ children }: { children: ReactNode }) {
  const fileSystem = useFileSystem({ autoLoad: true });
  
  return (
    <WikiContext.Provider value={fileSystem}>
      {children}
    </WikiContext.Provider>
  );
}

// 컴포넌트에서 Context 사용
function WikiSidebar() {
  const { files, createFile } = useContext(WikiContext);
  const treeData = useTreeData(files);
  
  return <TreeView {...treeData} />;
}
```

---

## 🎨 타입 정의

### 공통 옵션 인터페이스

```typescript
// types/hooks.ts
interface HookOptions {
  debug?: boolean;
  onError?: (error: Error) => void;
}
```

### 파일 노드 타입

```typescript
// types/wiki.ts
interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}
```

---

## 🔧 개발자 도구

### 디버그 모드

모든 훅은 `debug` 옵션을 지원합니다:

```typescript
const editor = useEditor({
  debug: true, // 콘솔에 상태 변화 로그 출력
  initialContent: 'test'
});
```

### 성능 프로파일링

```typescript
// React DevTools Profiler와 함께 사용
import { Profiler } from 'react';

<Profiler id="Editor" onRender={onRenderCallback}>
  <EditorComponent />
</Profiler>
```

---

## 📈 성능 메트릭

### 최적화 적용 항목

| 훅 | 최적화 | 효과 |
|---|--------|------|
| useTreeData | useMemo (filteredData) | 검색 성능 향상 |
| useEditor | useCallback (29개) | 불필요한 리렌더링 방지 |
| useResize | rAF 쓰로틀링 | 60fps 유지 |
| useAutoScroll | debounce (50ms) | 스크롤 이벤트 부하 감소 |
| 전체 | Cleanup 자동화 | 메모리 누수 방지 |

---

## 🔗 관련 문서

- [타입 정의 가이드](./DEVELOPMENT_STANDARDS.md#-타입-정의-규칙)
- [컴포넌트 가이드](./components.md)
- [리팩토링 v1 문서](./refactoring/v1/README.md)
- [Phase 3 완료 보고서](./refactoring/v1/phases/phase3/phase3-overall-summary.md)

---

**📅 마지막 업데이트**: 2025-10-29  
**👤 작성자**: GitHub Copilot  
**🔗 리팩토링**: Phase 3 (Logic Extraction & Optimization)
