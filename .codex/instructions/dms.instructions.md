---
applyTo: "apps/web/dms/**"
---

# Codex DMS Instructions

> 최종 업데이트: 2026-07-16
> 정본: `.github/instructions/dms.instructions.md`

## 독립 배포 고려사항

| 항목 | DMS | PMS |
|------|-----|-----|
| 패키지 매니저 | **pnpm workspace** | pnpm |
| 공유 패키지 | `@ssoo/types`, `@ssoo/web-auth`, `@ssoo/web-shell`, `@ssoo/web-ui` 사용 (`@ssoo/database` 직접 참조 금지) | 사용 |
| 포트 | **3003** | 3002 |

DMS는 workspace 앱으로 통합되었지만, 파일/Git/스토리지 런타임과 `src/app/api/* -> server/*` 구조는 독립 배포 가능성을 고려해 유지합니다.

Docker/compose도 DMS 런타임 계약의 일부입니다. DMS 포트, runtime path, 설정 노출 문구, server proxy/env 계약을 바꾸면 `apps/web/dms/Dockerfile`, 루트 `compose.yaml`과 환경별 overlay(`compose.local.yaml`, `compose.local-test.yaml`, `compose.production.yaml`), 루트 env example, Docker/E2E 스크립트, `docs/dms/guides/deployment.md`를 같은 변경 범위에서 확인하고 같이 갱신합니다.

## 양방향 배포 표준

- 모노레포 변경을 외부 공유할 때는 개별 `git push` 대신 `pnpm run codex:workspace-publish`를 우선 사용합니다.
- GitLab issue branch가 `development`에 병합되는 병행 개발 단계에서는 작업 시작 전과 push 직전에 `pnpm run codex:workspace-sync-from-gitlab`를 실행해 원격 workspace branch를 로컬에 먼저 재통합합니다.
- 로컬 변경이 있으면 먼저 체크포인트 커밋 또는 stash를 만들고 sync합니다. 더러운 작업트리 위에서 GitLab workspace branch를 병합하지 않습니다.
- `codex:workspace-publish`는 GitHub 브랜치 push 전에 GitLab workspace branch fast-forward 가능 여부를 먼저 검사한 뒤, GitHub 브랜치 push + GitLab workspace branch push + 해시 검증까지 수행합니다.
- origin push 시 `codex:workspace-publish` marker가 없으면 pre-push가 차단됩니다.
- GitLab workspace branch가 로컬 HEAD보다 앞서 있으면 먼저 `pnpm run codex:workspace-sync-from-gitlab`로 monorepo에 재통합합니다.
- sync가 merge commit 또는 충돌 해결을 만들면 `pnpm run codex:preflight`, DMS 변경 시 `pnpm run codex:dms-guard`, push 전 `pnpm run codex:push-guard`를 다시 실행합니다.
- 기존 `pnpm run codex:dms-sync-from-gitlab`, `pnpm run codex:dms-publish`는 당분간 호환 래퍼로 유지합니다.
- 인증은 환경 변수 또는 local git config 중 하나를 사용합니다.
  - 환경 변수: `GL_USER`, `GL_TOKEN`
  - local git config: `codex.gitlabUser`, `codex.gitlabToken`

## 운영 런칭 증거 계약

- 현행 DMS Go-live는 release artifact, production infrastructure, recovery proof, isolated operational control, deployed browser Ralph의 다섯 blocking 트랙입니다.
- 각 실행은 release SHA/run ID 전용 bundle에 step 전후 atomic checkpoint, 로그, Playwright artifact, 최종 report와 SHA-256 manifest를 남깁니다.
- 중단 실행의 `--resume`은 run ID, release SHA, HEAD, worktree fingerprint, gate plan hash가 모두 같은 경우에만 허용합니다. 불일치하거나 깨진 checkpoint는 새 실행으로 fail-closed합니다.
- 격리 runtime은 run ID 소유 manifest를 사용하며 소유권이 불명확한 PID, PostgreSQL data dir, 프로세스를 삭제하거나 종료하지 않습니다.
- AI/RAG 외부 provider 예외는 provider-backed retrieval/summary에만 적용하며 다른 다섯 트랙 실패를 면제하지 않습니다.
- 현행 track, spec, 문서 정합성은 `pnpm run verify:dms-launch-contract`로 검증합니다.

## DMS 런타임 프로필·기동 계약

- 공통 `compose.yaml`은 `DMS_INSTANCE_ENV` 역할을 소유하지 않고 빈 값으로 fail-closed합니다. `compose.local.yaml=dev`, `compose.local-test.yaml=local-test`, `compose.production.yaml=prod`만 역할을 결정합니다.
- local/local-test overlay의 역할과 `DMS_GIT_BOOTSTRAP_REMOTE_URL`은 literal로 고정해 root `.env`가 운영 역할이나 remote를 주입하지 못하게 합니다.
- `local-test` Docker 런타임은 remote-empty와 PostgreSQL·문서·ingest·storage 전용 named volume을 사용하며 운영/개발 DB나 문서 working tree를 mount하지 않습니다.
- `local-test`는 Playwright/Ralph, 실패주입, mutation 회귀 전용입니다. 기존 문서와 실제 로컬 사용 상태를 확인하는 사용자 인수 테스트나 로컬 Docker 인계 대상으로 사용하지 않습니다.
- 사용자 인수 테스트와 로컬 Docker 인계의 정본은 `compose.yaml + compose.local.yaml`의 `dev`입니다. `local-test` 검증 후에는 `pnpm docker:up`으로 `dev`를 복구하고 active profile, readiness, 기존 dev 파일 트리를 확인한 뒤 인계합니다.
- 기존 working tree의 `origin`이 선택한 역할과 다르면 remote를 제자리에서 바꾸지 않습니다. 기존 tree를 보존하고 역할에 맞는 별도 working tree를 준비해 `DMS_MARKDOWN_HOST_PATH`로 명시합니다.
- Docker server가 HTTPS 문서 remote를 사용할 때 credential을 URL, Compose env, 저장소 `.git/config`에 넣지 않습니다. `pnpm run dms:git-http-auth:prepare`로 mode `0600` Docker secret을 만들고 `DMS_GIT_HTTP_AUTH_SCOPE`를 해당 origin으로 제한합니다.
- readiness는 활성 storage provider의 실제 경로를 필수로 검사합니다. dev에서 사용하지 않는 NAS는 비활성화하고, NAS를 활성화할 때는 실제 host/NAS mount를 먼저 준비합니다.
- Git 초기화 결과 실패·예외와 최초 document control-plane 동기화 실패는 startup-fatal입니다. 실패한 서버를 liveness만으로 정상 취급하지 않습니다.
- `/api/health`는 liveness, `/api/health/core-readiness`는 공통 DB/auth 테이블 접근 준비, `/api/health/apps/:app`은 앱별 준비 상태입니다. `/api/health/readiness`는 공통 서버와 Admin/CRM/PMS/DMS/SNS 전체가 ready일 때만 `200`입니다. DMS settings persistence, Git parity, control-plane, runtime path 검사는 그대로 유지합니다.
- 배포 공통 정적·빌드 검사는 `pnpm run codex:platform-guard`로 서버와 5개 웹 전체를 검사합니다. `codex:dms-guard`는 DMS 전용 계약의 호환 명령으로 유지합니다. 실제 배포 완료에는 추가로 release manifest·백업 복원·플랫폼 인증 및 도메인 runtime 검증이 필요합니다.
- 기동 후 일시적인 문서 목록 오류에는 기존 error state와 visible retry 동선을 유지합니다. fail-fast/readiness는 사용자 복구 UI를 삭제하는 근거가 아닙니다.
- 프로필 계약은 `pnpm run verify:dms-runtime-profile-contract:self-test`의 오염 실패주입과 `pnpm run codex:dms-guard`로 검증합니다.

## 기술 스택

- Next.js 15.x (App Router), React 19.x, TypeScript 5.x
- Tailwind CSS 3.x + Radix UI + `@ssoo/web-ui`
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
│   ├── ui/                # @ssoo/web-ui thin re-export adapter + Radix UI 기반 원자
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
- 로그인 후 파일 트리 preload 는 auth/access hydrate 이후 `canReadDocuments === true` 일 때만 수행한다
- 문서 0건은 오류가 아니며 신규 사용자/권한 내 문서 없음은 empty state 로 종료한다
- API/control-plane sync 실패는 error state 로 표시하되, 사용자가 `refreshFileTree({ forceSync: true })` 를 다시 실행할 수 있는 visible retry 동선을 유지한다
- 정상 로그인 사용자를 문서 목록 전용 full-page blocking recovery 화면에 가두지 않는다

## UI primitive 사용법

- Button/Badge/Card/Input/NativeSelect/Table/Textarea 등 inventory 원자는 `@ssoo/web-ui`가 소유하고 DMS `components/ui/*`는 thin re-export adapter로 유지한다.
- `components/ui/*`에서 앱별 primitive variant recipe를 재정의하지 않는다.
- DMS TSX surface에서는 원시 `button/input/textarea/select/table/thead/tbody/tfoot/tr/th/td`를 직접 렌더링하지 않고 공용 primitive 또는 앱 thin adapter를 사용한다.
- 이 기준은 `pnpm run verify:ui-consumption`에서 전역 검증된다.

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
| Header | 60px |
| Sidebar (펼침) | 340px |
| Sidebar (접힘) | 56px |
| TabBar | 53px |

## 컴포넌트 크기 가이드

| 유형 | 권장 라인 | 초과 시 |
|------|----------|---------|
| UI 컴포넌트 | ~50줄 | 분리 검토 |
| Common 컴포넌트 | ~150줄 | 책임 분리 |
| Template | ~200줄 | 하위 추출 |
| Page | ~150줄 | 훅/스토어 이동 |

## 금지 사항

1. **`@ssoo/database` 직접 import** - DMS는 웹 앱이며 DB 접근은 서버/플랫폼 경계를 통해 관리
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
| 2026-08-19 | 환경별 DMS Compose 역할 격리, Git/control-plane startup-fatal, DB+DMS readiness와 프로필 실패주입 검증 계약 추가 |
| 2026-06-17 | `@ssoo/web-ui`를 DMS 공유 패키지 기준에 추가하고 access-requests/settings 선별 UI 기준선 검증 규칙 명시 |
| 2026-06-15 | DMS 공유 패키지 기준을 `@ssoo/types`, `@ssoo/web-auth`, `@ssoo/web-shell`로 보정하고 SSOO 공용 frame 레이아웃 치수와 동기화 |
| 2026-04-06 | GitLab 기본 흐름을 full-workspace `development` branch 기준으로 전환하고 `codex:workspace-*` 명령/호환 래퍼를 추가 |
| 2026-04-02 | `codex:dms-sync-from-gitlab` 추가, `codex:dms-publish` GitLab 선검사 및 git config 인증 fallback 반영 |
| 2026-02-27 | 독립성/기술스택/폴더구조/서버패턴/스토어/에디터/TreeView/타입/Export/치수/크기가이드/금지사항 추가 |
| 2026-02-22 | Codex DMS 정본 신설 |
