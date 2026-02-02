# DMS 커스텀 훅 가이드

> 최종 업데이트: 2026-02-02

DMS 프로젝트에서 사용되는 커스텀 훅에 대한 가이드입니다.

---

## 훅 개요

| 훅 | 파일 | 용도 |
|----|------|------|
| `useEditor` | useEditor.ts | 에디터 상태 관리 |
| `useOpenTabWithConfirm` | useOpenTabWithConfirm.ts | 탭 초과 시 확인 다이얼로그 |

---

## 1. useEditor

에디터 상태 및 기능을 관리하는 핵심 훅입니다.

### 소스 위치

`src/hooks/useEditor.ts`

### 주요 기능

- 에디터 내용 관리
- 커서 위치 및 선택 영역 관리
- 실행 취소/다시 실행 (Undo/Redo)
- 자동 저장
- 임시 저장 및 복원

### 인터페이스

```typescript
interface UseEditorOptions {
  autoSaveInterval?: number;      // 자동 저장 간격 (ms)
  maxHistorySize?: number;        // 실행 취소 히스토리 최대 크기
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
  
  // 커서 및 선택
  cursorPosition: EditorCursorPosition | null;
  selection: EditorSelection | null;
  
  // 실행 취소/다시 실행
  canUndo: boolean;
  canRedo: boolean;
  
  // 저장 상태
  isSaving: boolean;
  
  // 에디터 참조
  editorRef: React.RefObject<HTMLTextAreaElement | null>;
  
  // 내용 관리
  setContent: (content: string) => void;
  updateContent: (content: string) => void;
  resetContent: (newContent: string) => void;
  
  // 저장 관리
  save: () => Promise<void>;
  autoSave: () => Promise<void>;
  setAutoSaveEnabled: (enabled: boolean) => void;
  
  // 유틸리티
  undo: () => void;
  redo: () => void;
  markAsSaved: () => void;
  clearHistory: () => void;
}
```

### 사용 예제

```typescript
import { useEditor } from '@/hooks';

function MarkdownEditor({ initialContent, onSave }) {
  const {
    content,
    hasUnsavedChanges,
    canUndo,
    canRedo,
    updateContent,
    save,
    undo,
    redo,
  } = useEditor(initialContent, {
    autoSaveInterval: 30000,
    onSave: async (content) => {
      await onSave(content);
    },
  });

  return (
    <div>
      <div className="toolbar">
        <button onClick={undo} disabled={!canUndo}>Undo</button>
        <button onClick={redo} disabled={!canRedo}>Redo</button>
        <button onClick={save} disabled={!hasUnsavedChanges}>Save</button>
      </div>
      <textarea
        value={content}
        onChange={(e) => updateContent(e.target.value)}
      />
    </div>
  );
}
```

---

## 2. useOpenTabWithConfirm

탭 개수 초과 시 확인 다이얼로그를 표시하는 훅입니다.

### 소스 위치

`src/hooks/useOpenTabWithConfirm.ts`

### 주요 기능

- 탭 열기 시 최대 개수 초과 확인
- 사용자 확인 후 가장 오래된 탭 자동 닫기
- 확인 다이얼로그 연동

### 인터페이스

```typescript
function useOpenTabWithConfirm(): (options: OpenTabOptions) => Promise<string>;

interface OpenTabOptions {
  title: string;
  path: string;
}
```

### 사용 예제

```typescript
import { useOpenTabWithConfirm } from '@/hooks';

function FileTree() {
  const openTabWithConfirm = useOpenTabWithConfirm();

  const handleFileClick = async (file: FileNode) => {
    const tabId = await openTabWithConfirm({
      title: file.name,
      path: file.path,
    });

    if (tabId) {
      console.log('탭 열림:', tabId);
    } else {
      console.log('탭 열기 취소됨');
    }
  };

  return (
    <ul>
      {files.map((file) => (
        <li key={file.path} onClick={() => handleFileClick(file)}>
          {file.name}
        </li>
      ))}
    </ul>
  );
}
```

### 동작 흐름

```
1. openTabWithConfirm 호출
   └─ 탭 개수 < maxTabs → 탭 열기 → tabId 반환
   └─ 탭 개수 >= maxTabs
      └─ 확인 다이얼로그 표시
         └─ 확인 → 가장 오래된 탭 닫기 → 새 탭 열기 → tabId 반환
         └─ 취소 → '' 반환
```

---

## 훅 사용 가이드라인

### Do's ✅

- 컴포넌트 최상위에서 훅 호출
- 의존성 배열 정확히 지정
- 에러 처리 구현

### Don'ts ❌

- 조건문 안에서 훅 호출
- 반복문 안에서 훅 호출
- 콜백 함수 안에서 훅 호출
