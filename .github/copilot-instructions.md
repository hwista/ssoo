# SSOO 모노레포 - GitHub Copilot 전역 가이드라인

> 이 파일은 Copilot이 SSOO를 처음 읽을 때 보는 repo-wide 진입점입니다.
> 경로별 상세 규칙은 `.github/instructions/*.md`가 우선합니다.
> `.github` 규칙을 바꾸면 `pnpm run codex:verify-sync`로 CLAUDE/Codex mirror marker를 확인하세요.

---

## 저장소 개요

SSOO(삼삼오오)는 SI/SM 조직의 **Opportunity -> Project -> System** 흐름을 하나로 묶는 pnpm workspace + Turborepo 모노레포입니다. 서버와 세 개의 웹 앱이 공유 타입, 공용 인증 런타임, 공용 웹 셸을 함께 사용하고, 프로세스 정본은 `.github/`, 산출물 문서는 `docs/`와 `docs/dms/`에 둡니다.

| 영역 | 위치 | 역할 |
|------|------|------|
| Server | `apps/server` | NestJS REST API, JWT 인증, Swagger/OpenAPI, 공통 백엔드 진입점 |
| PMS | `apps/web/pms` | 프로젝트 관리 프론트엔드, keep-alive MDI 탭 셸 |
| CMS | `apps/web/cms` | 콘텐츠 관리 프론트엔드, App Router 기반 피드/게시판/프로필 셸 |
| DMS | `apps/web/dms` | 문서 관리 프론트엔드, same-origin Next API 프록시를 통해 서버 DMS 모듈과 통신 |
| Database | `packages/database` | Prisma Client, multi-schema PostgreSQL, request-context 기반 감사 메타데이터 |
| Types | `packages/types` | `common/`, `pms/`, `cms/`, `dms/` 서브패스 중심의 type-only 공유 계약 |
| Web Auth | `packages/web-auth` | 공통 auth storage, auth API adapter, auth store factory, bootstrap UI |
| Web Shell | `packages/web-shell` | PMS/CMS/DMS가 공통으로 쓰는 `ShellFrame`, `ShellPageContainer` |

핵심 도메인 키워드: `Project`, `Customer`, `Menu`, `Post`, `Skill`, `Document`.

---

## 빌드, 테스트, 린트, 검증 명령

### 기본 세팅 및 실행

| 작업 | 명령 | 비고 |
|------|------|------|
| 초기 세팅 | `cp .env.example .env && pnpm install` | 루트 워크스페이스 설치 |
| DMS 로컬 env | `cp apps/web/dms/.env.example apps/web/dms/.env.local` | DMS runtime env가 필요할 때 |
| Docker 전체 스택 | `pnpm docker:up` | postgres + server + PMS + DMS + CMS |
| DB 부트스트랩 | `pnpm db:setup` | DB 생성/스키마/시드/트리거 초기화 |
| 전체 개발 서버 | `pnpm dev` | Turborepo 개발 서버 |
| 서버 개발 서버 | `pnpm dev:server` | `http://localhost:4000` |
| PMS 개발 서버 | `pnpm dev:web-pms` | `http://localhost:3000` |
| DMS 개발 서버 | `pnpm dev:web-dms` | `http://localhost:3001` |
| CMS 개발 서버 | `pnpm dev:web-cms` | `http://localhost:3002` |
| Health check | `curl http://localhost:4000/api/health` | 서버 기동 확인 |
| OpenAPI JSON | `curl http://localhost:4000/api/openapi.json` | Swagger 문서 원본 |

### 빌드, 린트, 타입 체크

| 작업 | 명령 | 비고 |
|------|------|------|
| 전체 빌드 | `pnpm build` | 관측형 wrapper (`pnpm run build:raw` = `turbo build`) |
| 전체 린트 | `pnpm lint` | 관측형 wrapper (`pnpm run lint:raw` = `turbo lint`) |
| 서버 빌드 | `pnpm build:server` | |
| PMS 빌드 | `pnpm build:web-pms` | |
| DMS 빌드 | `pnpm build:web-dms` | |
| CMS 빌드 | `pnpm build:web-cms` | |
| 서버 타입 체크 | `pnpm --filter server exec tsc --noEmit` | |
| PMS 타입 체크 | `pnpm --filter web-pms exec tsc --noEmit` | |
| DMS 타입 체크 | `pnpm --filter web-dms exec tsc --noEmit` | |
| CMS 타입 체크 | `pnpm --filter web-cms exec tsc --noEmit` | |
| Types 패키지 빌드 | `pnpm --filter @ssoo/types build` | |
| Database 패키지 빌드 | `pnpm --filter @ssoo/database build` | |
| Web Auth 패키지 빌드 | `pnpm --filter @ssoo/web-auth build` | |
| Web Shell 패키지 빌드 | `pnpm --filter @ssoo/web-shell build` | |
| DB 시작 | `pnpm db:up` | Docker Compose postgres |
| DB 스키마 반영 | `pnpm db:push` | Prisma `db push` |
| DB 시드 | `pnpm db:seed` | `.codex/scripts/db-seed.sh` |
| DB 트리거 설치 | `pnpm db:triggers` | 히스토리 트리거 적용 |

### 테스트와 타깃 검증

- 현재 **Jest/Vitest/Playwright 기반 테스트 러너는 구성되어 있지 않습니다**. `pnpm test`가 없고, 단일 테스트 케이스를 실행하는 표준 명령도 없습니다.
- 이 저장소의 실질적인 검증 표면은 **lint + app별 type-check + build + access verification + `.github/scripts/*` 검증**입니다.
- 가장 좁은 범위의 검증 명령은 다음과 같습니다.
  - `pnpm verify:access-smoke`
  - `pnpm verify:access-admin`
  - `pnpm verify:access-dms`
  - `pnpm -C apps/web/dms run check:golden-example`
  - `pnpm -C apps/web/dms run check:shell-body-contract`

### 규칙/문서 검증

| 작업 | 명령 | 비고 |
|------|------|------|
| Preflight | `pnpm run codex:preflight` | 작업 전 기본 게이트 |
| Sync 검증 | `pnpm run codex:verify-sync` | `.github` <-> `.codex`/`CLAUDE` marker 확인 |
| Push guard | `pnpm run codex:push-guard` | push 전 게이트 |
| DMS 가드 | `pnpm run codex:dms-guard` | DMS 변경 시 |
| 문서 검증 | `node .github/scripts/check-docs.js --all` | 문서/규칙 변경 시 |
| 패턴 검증 | `node .github/scripts/check-patterns.js [파일경로]` | `export *`, `any`, 패턴 금지 검사 |
| 디자인 검증 | `node .github/scripts/check-design.js [파일경로]` | UI 변경 시 |
| SDD 구조 검증 | `node .github/scripts/sdd-verify.js --quick` | 구조/문서 점검 |
| Access verification pack | `pnpm verify:access-ci` | CI에서 DB + 서버 기동 후 실행 |

기본 계정: `admin` / `admin123!`

CI 기준선: `.github/workflows/pr-validation.yml`

---

## 핵심 원칙

1. **기존 패턴 우선**: 같은 도메인에 이미 있는 store/API/layout/auth 패턴을 먼저 재사용합니다.
2. **패키지 경계 엄수**: `apps/ -> packages/` 방향만 허용하며 역방향 참조와 순환 참조를 금지합니다.
3. **공용 런타임 우선**: 인증은 `@ssoo/web-auth`, 셸 레이아웃은 `@ssoo/web-shell`, 공유 계약은 `@ssoo/types`를 우선 확장합니다.
4. **기존 결과 보존**: 새 작업이 기존 기능, 동작, UI 외형을 훼손하면 안 됩니다.
5. **코드-문서 동기화**: 규칙이나 동작을 바꾸면 관련 `.github/` 또는 `docs/` 문서도 함께 갱신합니다.
6. **관측성 포함 작업**: 의미 있는 repo-scoped 작업은 `.hermes` harness 흐름을 따르며, 루트의 관측형 script(`build`, `lint`, `codex:preflight` 등)를 우선 사용합니다.

---

## 아키텍처

### 워크스페이스 경계

```text
apps/server   -> packages/database, packages/types
apps/web/pms  -> packages/types, packages/web-auth, packages/web-shell
apps/web/cms  -> packages/types, packages/web-auth, packages/web-shell
apps/web/dms  -> packages/types, packages/web-auth, packages/web-shell
packages/*    -> never import apps/*
```

- `packages/`는 `apps/`를 참조하지 않습니다.
- DMS는 workspace 앱이지만 **`@ssoo/database`를 직접 import하지 않고**, Next API 프록시를 통해 서버 DMS 모듈로만 접근합니다.

### 서버 요청/응답 흐름

- `apps/server/src/main.ts`는 `/api` 전역 prefix, CORS, `ValidationPipe`, `/api/openapi.json` 노출을 설정합니다.
- `apps/server/src/app.module.ts`는 `CommonModule`, `PmsModule`, `CmsModule`, `DmsModule`을 조합하고 `RequestContextInterceptor`, `GlobalHttpExceptionFilter`, `ThrottlerGuard`를 전역 등록합니다.
- 일반적인 백엔드 호출 경로는 **Controller -> Service -> DatabaseService** 입니다.
- `DatabaseService`는 `@ssoo/database`의 `createPrismaClient()`를 감싸며, 새 모델 접근은 보통 `db.client.<model>` 패턴을 사용합니다.
- `apps/server/src/common/responses.ts`의 `success`, `paginated`, `error`, `notFound`, `deleted`가 공통 응답 모양의 기준입니다.

### Prisma Client Extensions

- `packages/database/src/index.ts`의 `createPrismaClient()`는 현재 **`commonColumnsExtension`만 기본 적용**합니다.
- `RequestContextInterceptor`는 요청별 `userId`, `source`, `transactionId`를 `AsyncLocalStorage`에 넣고, `commonColumnsExtension`이 이를 읽어 `createdBy`, `updatedBy`, `lastSource`, `lastActivity`, `transactionId`를 자동 세팅합니다.
- `softDeleteExtension`, `activeFilterExtension`도 같은 파일에서 export되지만 **기본 클라이언트에 자동으로 붙지는 않습니다**. 필요하면 명시적으로 opt-in 해야 합니다.
- PostgreSQL 히스토리 테이블/트리거는 row 기록을 담당하고, Prisma extension은 감사 메타데이터를 채우는 역할입니다.

### 공유 인증 구조

- `packages/web-auth`는 shared storage, `createAuthApiAdapter`, `createAuthStore`, `useProtectedAppBootstrap`, 로그인/로딩 UI를 제공합니다.
- PMS/CMS/DMS의 `src/stores/auth.store.ts`는 모두 `createAuthStore(...)`를 감싼 thin wrapper입니다.
- 각 앱의 `src/app/(main)/layout.tsx`는 `useProtectedAppBootstrap(...)`로 hydration, auth 확인, access hydrate, redirect를 공통 처리합니다.
- PMS/DMS는 기본 `AuthIdentity`를 그대로 쓰고, CMS만 profile display 필드를 덧붙인 `AuthUser`를 씁니다.

### 프론트엔드 앱별 큰 흐름

- **PMS**: URL을 `/`에 고정한 keep-alive MDI 구조입니다. `apps/web/pms/src/components/layout/ContentArea.tsx`의 `pageComponents` 맵이 메뉴 path를 실제 페이지에 연결하고, 열린 탭은 unmount 하지 않은 채 숨깁니다.
- **CMS**: App Router 기반 페이지 라우팅을 사용하지만, auth bootstrap/store 패턴은 PMS/DMS와 동일합니다. 공통 프레임은 `@ssoo/web-shell`의 `ShellFrame`과 `ShellPageContainer`로 맞춥니다.
- **DMS**: 브라우저는 `apps/web/dms/src/app/api/*/route.ts`를 호출하고, 이 라우트는 `serverApiProxy.ts`로 `authorization`/`cookie`를 전달해 서버 `/dms/*` 엔드포인트로 프록시합니다. `apps/server/src/modules/dms/dms.module.ts`가 access/search/ask/create/chat/git/file/storage/ingest/template 등 서버 기능 모듈을 묶습니다.
- DMS의 binary route는 `serverApiProxy.ts`에서 `/auth/session`으로 access token을 복원해 upstream 요청을 재시도할 수 있습니다.

### 공유 계약과 직렬화

- `packages/types`는 runtime 로직이 없는 **type-only 패키지**이며, 루트와 `common/`, `pms/`, `cms/`, `dms/` 서브패스를 모두 제공합니다.
- `packages/types`는 `export *` 대신 **명시적 re-export**를 사용합니다.
- Prisma의 BigInt PK/FK는 서버에서 `toBigInt`, `toIdString`, `serializeBigInt*` 헬퍼로 변환하고, API와 `@ssoo/types` 경계에서는 **문자열**로 직렬화합니다.

---

## 핵심 관례

| 주제 | 관례 |
|------|------|
| 프론트엔드 레이어 | `pages -> templates -> common -> ui`, `hooks -> lib/api -> stores` 방향만 허용합니다. |
| PMS 페이지 추가 | 메뉴 path를 만들었으면 `apps/web/pms/src/components/layout/ContentArea.tsx`의 `pageComponents` 맵에도 등록해야 실제 탭이 열립니다. |
| PMS/CMS API 패턴 | 도메인 API 함수는 `lib/api/endpoints/*`, 캐싱/조회는 `hooks/queries/use{Domain}.ts` 패턴을 우선 따릅니다. |
| DMS API 패턴 | 브라우저 로직은 `src/`에 두고, 서버 접근은 `src/app/api/*/route.ts -> serverApiProxy -> apps/server/src/modules/dms/*` 경계를 유지합니다. |
| Auth 공통화 | 앱별 auth store/login/logout/checkAuth 흐름을 새로 만들기보다 `@ssoo/web-auth` adapter/store/bootstrap을 확장합니다. |
| Shell 공통화 | 앱 프레임 레이아웃은 `@ssoo/web-shell`의 `ShellFrame`, `ShellPageContainer`를 우선 사용합니다. |
| 서버 접근 | Controller에서 Prisma를 직접 쓰지 않고 `DatabaseService`를 통해 접근합니다. |
| 서버 응답 형식 | 서버는 공통 response helper 형식을 유지하고, BigInt ID는 문자열로 내보냅니다. |
| 공유 타입 | `packages/types`에는 런타임 로직을 넣지 않고, 명시적 re-export만 사용합니다. |
| 관측형 루트 스크립트 | `pnpm build`, `pnpm lint`, `pnpm run codex:preflight`, `pnpm run docs:verify`는 `.hermes` 관측 wrapper를 거칩니다. raw 실행이 필요하면 `*:raw` 스크립트를 사용합니다. |

---

## 문서 관리 규칙

- `.github/copilot-instructions.md`와 `.github/instructions/*.md`는 **프로세스/규칙 정본**입니다.
- 경로별 상세 규칙은 이 파일보다 더 구체적이므로, 실제 수정 경로가 정해지면 해당 instruction 파일을 먼저 확인합니다.
- `docs/`와 `docs/dms/`는 시스템/도메인/디자인 산출물 정본입니다.
- Diataxis 구조를 따르며 `reference/` 폴더는 자동 생성 영역으로 취급합니다.
- `.github` 규칙을 바꾸면 `pnpm run codex:verify-sync`를 실행해 mirror marker를 확인합니다.

---

## 경로별 상세 규칙

| 경로 | 참조 인스트럭션 |
|------|----------------|
| `apps/server/**` | `.github/instructions/server.instructions.md` |
| `apps/web/pms/**` | `.github/instructions/pms.instructions.md` |
| `apps/web/cms/**` | `.github/instructions/cms.instructions.md` |
| `apps/web/dms/**` | `.github/instructions/dms.instructions.md` |
| `packages/database/**` | `.github/instructions/database.instructions.md` |
| `packages/types/**` | `.github/instructions/types.instructions.md` |
| `docs/**` | `.github/instructions/docs.instructions.md` |
| `**/*.test.*`, `**/*.spec.*` | `.github/instructions/testing.instructions.md` |
| SDD 브리핑/검증 프로토콜 | `.github/instructions/workflow.instructions.md` |

---

## 금지 사항

1. `export * from` 사용
2. `any` 타입 남용
3. 역방향 의존성(`packages -> apps`, `ui -> pages/templates`)
4. Controller에서 Prisma 직접 사용
5. DMS에서 `@ssoo/database` 직접 import 또는 Next API 프록시 경계 우회
6. `@ssoo/web-auth`/`@ssoo/web-shell`로 흡수 가능한 기능을 앱별로 중복 구현
7. BigInt ID를 API/공유 타입 경계에서 number로 다루기
8. PMS에서 새 페이지 path를 추가하고 `ContentArea.tsx` 매핑을 누락하기
9. BaseService 같은 불필요한 추상화와 미사용 코드 추가
10. `.github` 규칙 변경 후 `pnpm run codex:verify-sync` 누락

---

> 관련 세부 구현 규칙은 `.github/instructions/*.md`가 우선하며, 이 파일은 미래 Copilot 세션이 저장소를 빠르게 이해하기 위한 전역 진입점입니다.
