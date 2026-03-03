---
applyTo: "apps/web/dms/**"
---

# DMS 프론트엔드 개발 규칙

> 이 규칙은 `apps/web/dms/` 경로의 파일 작업 시 적용됩니다.
> ⚠️ **DMS는 독립 프로젝트입니다. @ssoo/* 패키지를 참조하지 마세요.**

---

## 독립성 원칙

| 항목 | DMS | PMS |
|------|-----|-----|
| 패키지 매니저 | **npm** | pnpm |
| @ssoo/* 패키지 | ❌ 사용 금지 | ✅ 사용 |
| 포트 | 3001 | 3000 |

DMS는 별도 저장소로 분리될 가능성이 있어 모노레포 의존성을 갖지 않습니다.

## 양방향 배포 표준

- DMS 변경을 외부 공유할 때는 개별 `git push` 대신 `pnpm run codex:dms-publish`를 우선 사용합니다.
- `codex:dms-publish`는 GitHub 브랜치 push + GitLab subtree push + 해시 검증까지 한 번에 수행합니다.
- DMS 변경 상태에서 `origin` push 시 `codex:dms-publish` 마커가 없으면 pre-push가 차단됩니다.
- 실행 전 필수 환경 변수:
  - `GL_USER`: GitLab username
  - `GL_TOKEN`: GitLab personal access token

---

## 기술 스택

- Next.js 15.x (App Router), React 19.x, TypeScript 5.x
- Tailwind CSS 3.x + Radix UI + MUI (Tree View)
- Zustand 5.x, React Hook Form + Zod
- Tiptap (리치 텍스트 에디터)
- Marked, react-markdown (마크다운 처리)

---

## 폴더 구조

```
src/
├── app/                    # Next.js App Router
│   ├── (main)/            # 메인 레이아웃 그룹
│   ├── api/               # API Routes
│   └── layout.tsx
├── components/
│   ├── ui/                # Radix UI 기반 원자
│   ├── common/            # 공통 (ConfirmDialog, StateDisplay)
│   ├── layout/            # AppLayout, Sidebar, Header, TabBar
│   └── pages/             # 페이지별 컴포넌트
│       ├── home/
│       └── markdown/
├── hooks/                 # 커스텀 훅
├── lib/                   # 유틸리티
├── stores/                # Zustand 스토어
├── types/                 # 타입 정의
└── server/                # 서버 레이어 (handlers, services)
```

---

## 레이어 의존성

```
pages → templates → common → ui
  ↓
hooks → lib/api → stores
```

- 상위 → 하위만 참조
- 역방향 참조 금지 (ui → pages ❌)
- 순환 참조 금지

---

## 🔴 문서 정본 위치

> DMS는 별도 저장소로 분리될 가능성이 있어 **독자적 문서 정본**을 유지합니다.

| 문서 유형 | 정본 위치 | 역할 |
|----------|----------|------|
| **DMS 레포독스** | `docs/dms/` | DMS 정본 |
| **DMS Wiki 런타임 자산** | `apps/web/dms/data/wiki/` | 파일 시스템/Git 데이터 |
| **깃헙독스 규칙** | `.github/instructions/dms.instructions.md` | 개발 규칙 (이 파일) |

### 참조 규칙

```
깃헙독스 코어 (.github/copilot-instructions.md)
        ↓ 참조
깃헙독스 서비스 (.github/instructions/dms.instructions.md) ← 이 파일
        ↓ 작업 시 참조
레포독스 (docs/dms/)
```

- DMS 작업 시 → `docs/dms/` 참조
- 디자인 시스템 세부 값 → `docs/dms/explanation/design/design-system.md`
- 위키 데이터 경로 확인 시 → `apps/web/dms/data/wiki/` 참조

---

## UI 디자인 규칙

> **전역 규칙**: `.github/copilot-instructions.md` 참조
> **세부 값**: `docs/dms/explanation/design/design-system.md` 참조

- 요청한 컨트롤만 생성 (컨테이너 금지)
- 컨트롤 높이 표준 준수 (`h-control-h`)
- 폰트/타이포그래피 표준 준수

---

## 네이밍 규칙

> **전역 규칙**: [copilot-instructions.md](.github/copilot-instructions.md) 참조

| 유형 | 규칙 | 예시 |
|------|------|------|
| 컴포넌트 | PascalCase | `FileTree.tsx` |
| 훅 | camelCase (use 접두사) | `useEditor.ts` |
| 유틸리티 | camelCase | `pathUtils.ts` |
| 스토어 | kebab-case (store 접미사) | `tab.store.ts` |
| 상수 | SCREAMING_SNAKE_CASE | `HOME_TAB`, `MAX_TABS` |

---

## 서버 레이어 패턴 (server/)

```typescript
// ✅ Handler: 단순 라우팅, 로직은 서비스로 위임
export async function GET(request: NextRequest) {
  const result = await fileSystemService.getFileTree();
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json(result.data);
}

// ✅ Service: BaseService 없이 단순 구조
class FileSystemService {
  async getFileTree(): Promise<ServiceResult<FileNode[]>> {
    // 실제 로직만 구현
  }
}

export const fileSystemService = new FileSystemService();
```

**왜 이 패턴인가:**
- 불필요한 추상화 제거 → 코드 이해 용이
- 싱글톤 export → 인스턴스 관리 단순화
- 실제 사용 메서드만 → Dead Code 방지

---

## Zustand 스토어 패턴

```typescript
// ✅ 표준: State/Actions 인터페이스 분리
interface TabStoreState {
  tabs: TabItem[];
  activeTabId: string | null;
}

interface TabStoreActions {
  openTab: (options: OpenTabOptions) => string;
  closeTab: (id: string) => void;
}

const useTabStore = create<TabStoreState & TabStoreActions>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,
      openTab: (options) => { /* ... */ },
      closeTab: (id) => { /* ... */ },
    }),
    { name: 'tab-store', storage: createJSONStorage(() => localStorage) }
  )
);
```

---

## 미들웨어 패턴

```typescript
// ✅ 표준: named export, matcher로 필터링
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  const allowedPaths = ['/'];
  if (allowedPaths.some((path) => pathname === path)) {
    return NextResponse.next();
  }
  
  return NextResponse.redirect(new URL('/', request.url));
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*|favicon.ico).*)'],
};
```

---

## 타입 정의 규칙

```typescript
// ✅ 인터페이스와 구현 일치
export interface TabItem {
  id: string;
  title: string;
  closable: boolean;
  openedAt: Date;
}

// 구현 시 타입에 없는 필드 추가 금지
const createTab = (): TabItem => ({
  id: '...',
  title: '...',
  closable: true,
  openedAt: new Date(),
  // ❌ status: 'active' → 타입에 없음
});
```

---

## Export 규칙

```typescript
// ✅ 명시적 re-export
export { Button } from './Button';
export { Input } from './Input';

// ❌ 와일드카드 export 금지
export * from './components';
```

---

## Tiptap 에디터 설정

DMS의 핵심 컴포넌트인 Tiptap 에디터 규칙:

### 필수 익스텐션

```typescript
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';

const editor = useEditor({
  extensions: [
    StarterKit,
    Placeholder.configure({ placeholder: '내용을 입력하세요...' }),
    Link.configure({ openOnClick: false }),
    Image,
    CodeBlockLowlight.configure({ lowlight }),
  ],
});
```

### 에디터 상태 관리

```typescript
// useEditor 훅과 editorStore 연동
// - content: 현재 내용
// - hasUnsavedChanges: 저장 필요 여부
// - autoSave: 자동 저장 (5초 디바운스)
```

### 금지 사항

- ❌ 에디터 내용 직접 DOM 조작
- ❌ innerHTML 직접 설정
- ✅ editor.commands 사용

---

## MUI Tree View 패턴

```typescript
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';

// ✅ 파일 트리 구현
<SimpleTreeView
  expandedItems={expandedFolders}
  onExpandedItemsChange={(_, ids) => setExpandedFolders(ids)}
  selectedItems={selectedFile}
  onSelectedItemsChange={(_, id) => handleFileSelect(id)}
>
  {renderTree(fileNodes)}
</SimpleTreeView>
```

---

## 파일 시스템 서비스

```typescript
// server/services/fileSystemService.ts
// ✅ 실제 파일 시스템 접근은 서버 사이드에서만
// ✅ API Route를 통해 클라이언트에 데이터 제공

class FileSystemService {
  private basePath: string;

  async getFileTree(): Promise<ServiceResult<FileNode[]>> {
    // fs.readdir 등 사용
  }

  async readFile(path: string): Promise<ServiceResult<string>> {
    // fs.readFile 사용
  }

  async writeFile(path: string, content: string): Promise<ServiceResult<void>> {
    // fs.writeFile 사용
  }
}
```

---

## 탭 관리 규칙

```typescript
// 최대 탭 수: 16개 (MAX_TABS)
// 초과 시: useOpenTabWithConfirm 훅으로 확인 다이얼로그

const { openTabWithConfirm } = useOpenTabWithConfirm();

// 탭 열기
const tabId = await openTabWithConfirm({
  title: '새 문서',
  path: '/docs/new.md',
  type: 'markdown',
});
```

---

## 레이아웃 치수

| 영역 | 값 | 비고 |
|------|-----|------|
| Header | 56px | 상단 고정 |
| Sidebar (펼침) | 280px | 확장 상태 |
| Sidebar (접힘) | 48px | 컴팩트 상태 |
| TabBar | 40px | 탭 컨테이너 |

---

## 컴포넌트 크기 가이드

| 유형 | 권장 라인 | 초과 시 조치 |
|------|----------|-------------|
| UI 컴포넌트 | ~50줄 | 분리 검토 |
| Common 컴포넌트 | ~150줄 | 책임 분리 |
| Template | ~200줄 | 하위 컴포넌트 추출 |
| Page | ~150줄 | 로직을 훅/스토어로 이동 |

---

## Dead Code 삭제 기준

1. **grep 검색 결과 0건** → 어디서도 참조 안 됨
2. **import는 있으나 실제 호출 없음** → 사용 안 됨
3. **주석 처리된 코드 블록** → 필요하면 git에서 복원
4. **TODO/FIXME만 있고 구현 없는 스텁** → 미래 기능 선제작

---

## 금지 사항

1. **@ssoo/* 패키지 import** - DMS는 독립 프로젝트
2. **BaseService 등 불필요한 추상화**
3. **any 타입 사용**
4. **와일드카드 export**
5. **미사용 코드 커밋**
6. **타입에 없는 필드 추가**

---

## AI 통합 패턴

### API 라우트 구조

| 라우트 | 용도 | Handler |
|--------|------|---------|
| `/api/doc-assist/` | 문서 작성 AI 보조 | `docAssist.handler.ts` |
| `/api/templates/` | 템플릿 관리 | `template.handler.ts` |
| `/api/ask/` | AI 질의응답 | `ai.handler.ts` |
| `/api/search/` | AI 검색 | `ai.handler.ts` |
| `/api/chat-sessions/` | 채팅 세션 관리 | `chatSessions.handler.ts` |

### 스트리밍 응답 처리

```typescript
// API Route에서 ReadableStream 반환
return new Response(stream, {
  headers: { 'Content-Type': 'text/event-stream' },
});
```

### Assistant 컴포넌트 아키텍처

```
components/common/assistant/
├── FloatingAssistantButton.tsx  # 플로팅 버튼
├── FloatingAssistantPanel.tsx   # 패널 컨테이너
├── Composer.tsx                 # 메시지 입력
├── MessageList.tsx              # 메시지 목록
└── ReferencePicker.tsx          # 참조 선택기
```

---

## 양방향 배포 워크플로우

- DMS 변경을 외부 공유할 때 `pnpm run codex:dms-publish` 우선 사용
- 수행 내용: GitHub 브랜치 push + GitLab subtree push + 해시 검증
- DMS 변경 상태에서 `origin` push 시 `codex:dms-publish` 마커가 없으면 pre-push 차단
- 필수 환경 변수: `GL_USER` (GitLab username), `GL_TOKEN` (GitLab PAT)

---

## 관련 문서

**에이전트/온보딩**:
- [DMS 에이전트 가이드](../../docs/dms/AGENTS.md) - 작업 프로세스, 체크리스트

**아키텍처**:
- [기술 스택](../../docs/dms/explanation/architecture/tech-stack.md)
- [패키지 구조](../../docs/dms/explanation/architecture/package-spec.md)
- [상태 관리](../../docs/dms/explanation/architecture/state-management.md)

**개발 가이드**:
- [컴포넌트 가이드](../../docs/dms/guides/components.md)
- [훅 가이드](../../docs/dms/guides/hooks.md)
- [API 가이드](../../docs/dms/guides/api.md)

**디자인**:
- [디자인 시스템](../../docs/dms/explanation/design/design-system.md)
