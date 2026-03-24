---
applyTo: "apps/web/dms/**"
---

# Codex DMS Instructions

> 최종 업데이트: 2026-03-23
> 정본: `.github/instructions/dms.instructions.md`

## 독립성 원칙

| 항목 | DMS | PMS |
|------|-----|-----|
| 패키지 매니저 | **npm** | pnpm |
| @ssoo/* 패키지 | **사용 금지** | 사용 |
| 포트 | **3001** | 3000 |

DMS는 별도 저장소로 분리될 가능성이 있어 모노레포 의존성을 갖지 않습니다.

## 기술 스택

- Next.js 15.x (App Router), React 19.x, TypeScript 5.x
- Tailwind CSS 3.x + Radix UI
- Zustand 5.x
- CodeMirror 6 기반 block editor, react-markdown 기반 viewer

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
├── hooks/                 # 앱 범용 훅 (도메인 전용 editor 런타임 제외)
├── lib/                   # 유틸리티
├── stores/                # Zustand 스토어
├── types/                 # 타입 정의
server/                    # 서버 레이어 (handlers, services) - src 외부
```

## 서버 레이어 패턴

```typescript
// Route: wire parsing + HTTP response only
export async function GET(request: NextRequest) {
  return toNextResponse(await handleFilesRequest());
}

// Handler: facade only
export async function handleFilesRequest(): Promise<AppResult<FileNode[]>> {
  return fileSystemService.getFileTree();
}

// Service: BaseService 없이 싱글톤 export
class FileSystemService {
  async getFileTree(): Promise<AppResult<FileNode[]>> { /* ... */ }
}
export const fileSystemService = new FileSystemService();
```

- JSON API 표준 결과 타입은 `server/shared/result.ts` 의 `AppResult<T>` 하나만 사용합니다.
- non-stream JSON API 는 성공/실패 모두 envelope 로 응답합니다.
- 표준 helper:
  - `ok(data, status?)`
  - `fail(error, status, code?)`
  - `toNextResponse(result)`
- stream/binary route (`/api/ask`, `/api/create`, `/api/doc-assist` SSE, `/api/storage/open`, 파일 raw/attachment) 는 본문 형식 예외를 유지합니다.
- 단, stream 시작 전 JSON 실패 응답은 envelope 를 사용합니다.

## Zustand 스토어 패턴

```typescript
// State/Actions 인터페이스 분리
interface TabStoreState { tabs: TabItem[]; activeTabId: string | null; }
interface TabStoreActions { openTab: (options: OpenTabOptions) => string; }

const useTabStore = create<TabStoreState & TabStoreActions>()(
  persist((set, get) => ({ /* ... */ }), { name: 'tab-store' })
);
```

## Block Editor 규칙

- 현재 block editor 런타임 정본은 `components/pages/markdown/_components/editor/**` 의 page-local 구조입니다.
- `Editor` 는 markdown page orchestration, `BlockEditor` 는 CodeMirror bridge 역할만 가집니다.
- `window.prompt/open` 같은 브라우저 imperative API 는 직접 호출하지 않고 interaction contract 뒤로 숨긴다
- 편집기 전체 reset은 실제 content 변경 시에만 수행하고, selection/cursor 상태를 불필요하게 초기화하지 않는다

## 파일 트리 규칙

- 파일 트리는 MUI Tree View가 아니라 현재 커스텀 tree renderer 기준으로 유지한다
- 트리 상태는 `file.store.ts` 가 소유하고, 렌더 컴포넌트는 presentation 역할만 맡는다
- 폴더 생성/이동/이름변경 액션은 `/api/file` 계약과 동일한 action vocabulary를 사용한다

## 타입 정의 규칙

```typescript
// 인터페이스와 구현 일치 - 타입에 없는 필드 추가 금지
export interface TabItem {
  id: string;
  title: string;
  closable: boolean;
  openedAt: Date;
}
```

## 페이지 엔트리 네이밍

- `components/pages/**` 엔트리 파일은 `{Feature}Page.tsx` 규칙을 사용합니다.
- `Page.tsx` 는 Next App Router의 `src/app/**/page.tsx` 전용 이름으로 취급합니다.
- 페이지 엔트리는 named export만 유지하고 `default export` 는 두지 않습니다.

## Export 규칙

```typescript
// ✅ 명시적 re-export
export { Button } from './Button';
// ❌ 와일드카드 금지
export * from './components';
```

## 레이아웃 치수

| 영역 | 값 |
|------|-----|
| Header | 56px |
| Sidebar (펼침) | 280px |
| Sidebar (접힘) | 48px |
| TabBar | 40px |

## 컴포넌트 크기 가이드

| 유형 | 권장 라인 | 초과 시 |
|------|----------|---------|
| UI 컴포넌트 | ~50줄 | 분리 검토 |
| Common 컴포넌트 | ~150줄 | 책임 분리 |
| Template | ~200줄 | 하위 추출 |
| Page | ~150줄 | 훅/스토어 이동 |

## 금지 사항

1. **@ssoo/* 패키지 import** - DMS는 독립 프로젝트
2. **BaseService 등 불필요한 추상화**
3. **any 타입 사용**
4. **와일드카드 export**
5. **미사용 코드 커밋**
6. **타입에 없는 필드 추가**

## 검증

| 용도 | 명령어 |
|------|--------|
| 빌드 | `pnpm run build:web-dms` |
| DMS 가드 | `pnpm run codex:dms-guard` |
| 골든 기준선 검사 | `pnpm -C apps/web/dms run check:golden-example` |
| 배포 | `pnpm run codex:dms-publish` (GitHub + GitLab 동시) |

## 양방향 배포

- DMS 변경 커밋을 외부 공유할 때 `pnpm run codex:dms-publish` 사용
- GitHub 브랜치 push + GitLab subtree push + 해시 검증 한 번에 수행
- 필수 환경 변수: `GL_USER`, `GL_TOKEN`

## Changelog

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-03-23 | `AppResult`/JSON envelope 표준, stream-binary 예외 정책, page-local editor runtime 기준으로 현행화 |
| 2026-02-27 | 독립성/기술스택/폴더구조/서버패턴/스토어/에디터/TreeView/타입/Export/치수/크기가이드/금지사항 추가 |
| 2026-02-22 | Codex DMS 정본 신설 |
