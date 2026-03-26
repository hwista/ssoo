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
- Tailwind CSS 3.x + Radix UI
- Zustand 5.x
- CodeMirror 6 기반 block editor
- react-markdown 기반 viewer / markdown rendering

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
│   ├── common/            # 공통 (ConfirmDialog, StateDisplay, editor/viewer/assistant)
│   ├── layout/            # AppLayout, Sidebar, Header, TabBar
│   ├── templates/         # 페이지 템플릿 + page-frame building blocks
│   └── pages/             # 페이지별 컴포넌트
│       ├── home/
│       ├── markdown/
│       ├── ai/
│       └── settings/
├── hooks/                 # 앱 범용 훅 (도메인 전용 editor runtime 제외)
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
| **DMS Document 런타임 자산** | `apps/web/dms/data/documents/` | 파일 시스템/Git 데이터 |
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
- 문서 데이터 경로 확인 시 → `apps/web/dms/data/documents/` 참조

---

## UI 디자인 규칙

> **전역 규칙**: `.github/copilot-instructions.md` 참조
> **세부 값**: `docs/dms/explanation/design/design-system.md` 참조

- 요청한 컨트롤만 생성 (컨테이너 금지)
- 컨트롤 높이 표준 준수 (`h-control-h`)
- 폰트/타이포그래피 표준 준수
- semantic typography token 사용 우선:
  - `text-title-page`, `text-title-section`, `text-title-subsection`, `text-title-card`
  - `text-body-md`, `text-body-sm`
  - `text-control-lg`
  - `text-label-md`, `text-label-sm`, `text-label-strong`
  - `text-caption`, `text-badge`
  - `text-code-inline`, `text-code-block`, `text-code-line-number`
- document content 계층은 별도 유지:
  - viewer `prose-base`, editor, diff 본문은 `16px` 유지
  - `--doc-content-font-size`, `--doc-content-line-height`, `--doc-line-number-font-size`, `--doc-line-number-font-weight` CSS 변수 사용
- typography 선택 순서: `slot 역할 -> density -> 허용 token`
- role layer: `header`, `title`, `body`, `detail`, `label`, `badge`, `code`, `annotation`
- `label-*`는 조작/식별용 텍스트의 독립 역할 계층입니다.
- `caption`은 detail 계층 기본값입니다.
- 컨트롤 primitive는 `text-xs`, `text-sm`, `text-base` 단독 raw class도 수동 정리 대상입니다.
- raw 타이포 조합(`text-sm font-medium`, `text-xs font-medium`, `text-sm font-semibold`, `text-lg font-semibold`, `text-xs font-semibold`, `text-lg font-medium`, `body-text font-medium`) 금지
- `text-[Npx]` arbitrary font-size 금지
- standalone `text-xl`, `text-2xl`, `font-bold` 금지
- semantic token + raw weight override(`text-title-card font-bold`, `text-label-md font-semibold`) 금지
- `badge/chip/chart/table cell` 내부 텍스트도 역할/밀도 기준 정규화 대상입니다.
- container-scaled text는 semantic intent를 token으로 정의하고, 실제 size는 컨테이너 비례 스케일을 허용합니다.
- 개별 `fontFamily`/`font-family` 하드코딩 금지, 예외는 bridge/fallback만 허용
- DMS 문서 표면의 단독 `text-sm`, `text-xs`, `font-medium`과 editor/diff literal typography는 수동 정리 대상입니다.

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
    { name: 'tab-store', storage: createJSONStorage(() => sessionStorage) }
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

## 페이지 엔트리 네이밍

- `components/pages/**` 엔트리 파일은 `{Feature}Page.tsx` 규칙을 사용합니다.
- `Page.tsx` 는 Next App Router의 `src/app/**/page.tsx` 전용 이름으로 취급합니다.
- 페이지 엔트리는 named export만 유지하고 `default export` 는 두지 않습니다.

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

## 검증

| 용도 | 명령어 |
|------|--------|
| 빌드 | `pnpm run build:web-dms` |
| DMS 가드 | `pnpm run codex:dms-guard` |
| 골든 기준선 검사 | `pnpm -C apps/web/dms run check:golden-example` |
| 배포 | `pnpm run codex:dms-publish` |

---

## Block Editor 규칙

DMS의 핵심 에디터는 `CodeMirror 6` 기반 block editor입니다.

### 책임 분리

```typescript
// Editor: page/editor orchestration
// BlockEditor: CodeMirror bridge + command wiring
// useEditorState: editor 도메인 내부 상태 훅
// useEditorInteractions: 브라우저 imperative interaction contract
```

### 상태/선택 규칙

- 선택 범위와 커서는 editor runtime이 직접 보존
- 전체 reset은 실제 markdown content 변경 시에만 수행
- AI 작성/삽입은 현재 editor markdown + selection 기준으로 적용

### 금지 사항

- ❌ `window.prompt()` / `window.open()` 직접 호출
- ❌ 에디터 selection을 리렌더마다 초기화
- ✅ interaction contract와 dialog 기반 입력 사용

---

## 파일 트리 규칙

- 현재 파일 트리는 MUI Tree View가 아니라 커스텀 renderer 기준입니다.
- 파일/폴더 액션은 `/api/file` 의 action vocabulary와 동일해야 합니다.
- 트리 렌더 컴포넌트는 presentation 역할만 맡고, 상태/액션은 store와 API 계층에 둡니다.

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
