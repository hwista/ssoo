---
applyTo: "apps/web/dms/**"
---

# Codex DMS Instructions

> 최종 업데이트: 2026-04-06
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
// Handler: 단순 라우팅, 로직은 서비스로 위임
export async function GET(request: NextRequest) {
  const result = await fileSystemService.getFileTree();
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json(result.data);
}

// Service: BaseService 없이 싱글톤 export
class FileSystemService {
  async getFileTree(): Promise<ServiceResult<FileNode[]>> { /* ... */ }
}
export const fileSystemService = new FileSystemService();
```

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

- block editor 런타임은 `components/common/editor/block-editor/*` 에 둔다
- `Editor` 는 page/editor orchestration, `BlockEditor` 는 CodeMirror bridge 역할만 가진다
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
| GitLab workspace sync | `pnpm run codex:workspace-sync-from-gitlab` |
| 배포 | `pnpm run codex:workspace-publish` (GitHub + GitLab workspace 동시) |

## 양방향 배포

- 모노레포 변경을 GitLab workspace branch와 함께 공유할 때 `pnpm run codex:workspace-publish` 사용
- GitLab workspace branch fast-forward 가능 여부를 먼저 검사한 뒤 GitHub 브랜치 push + GitLab workspace branch push + 해시 검증 수행
- GitLab workspace branch가 앞서 있으면 `pnpm run codex:workspace-sync-from-gitlab`로 monorepo에 먼저 재통합
- 기존 `pnpm run codex:dms-sync-from-gitlab`, `pnpm run codex:dms-publish`는 당분간 호환 래퍼로 유지
- 인증: `GL_USER`/`GL_TOKEN` 또는 `git config --local codex.gitlabUser`/`codex.gitlabToken`

## Changelog

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-04-06 | GitLab 기본 흐름을 full-workspace `development` branch 기준으로 전환하고 `codex:workspace-*` 명령/호환 래퍼를 추가 |
| 2026-04-02 | `codex:dms-sync-from-gitlab` 추가, `codex:dms-publish` GitLab 선검사 및 git config 인증 fallback 반영 |
| 2026-02-27 | 독립성/기술스택/폴더구조/서버패턴/스토어/에디터/TreeView/타입/Export/치수/크기가이드/금지사항 추가 |
| 2026-02-22 | Codex DMS 정본 신설 |
