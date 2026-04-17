# SSOO 모노레포 - GitHub Copilot 전역 가이드라인

> 경로별 상세 규칙은 `.github/instructions/`를 참조하세요.
> 이 파일이 정본이며, 규칙을 바꾸면 `CLAUDE.md`와 `.codex/instructions/` 미러도 함께 확인한 뒤 `pnpm run codex:verify-sync`로 검증합니다.

---

## 저장소 개요

SSOO(삼삼오오)는 SI/SM 조직의 **Opportunity -> Project -> System** 흐름을 하나로 묶는 pnpm workspace + Turborepo 모노레포입니다. 서버, PMS, CMS, DMS가 공통 데이터 모델과 인증 체계를 공유하고, 프로세스 정본은 `.github/`, 산출물 문서는 `docs/`에 둡니다.

| 영역 | 위치 | 역할 |
|------|------|------|
| Server | `apps/server` | NestJS REST API, JWT 인증, Swagger/OpenAPI, 공통 백엔드 진입점 |
| PMS | `apps/web/pms` | 프로젝트 관리 프론트엔드, keep-alive MDI 탭 셸 |
| CMS | `apps/web/cms` | 콘텐츠 관리 시스템, App Router 기반 피드/게시판/프로필 셸 |
| DMS | `apps/web/dms` | 문서 관리 프론트엔드, Next API 프록시를 통해 서버 DMS 모듈과 통신 |
| Database | `packages/database` | Prisma Client, multi-schema PostgreSQL, request-context/extension/trigger 기반 감사 흐름 |
| Types | `packages/types` | `common/`, `pms/`, `dms/` 공유 타입 패키지 (런타임 코드 없음) |
| Web Auth | `packages/web-auth` | PMS/CMS/DMS가 공통으로 쓰는 auth store, persisted auth contract, 로그인 UI |

핵심 도메인 키워드: `Project`, `Customer`, `Menu`, `Post`, `Skill`, `Document`.

---

## 빌드, 테스트, 린트, 검증 명령

| 작업 | 명령 | 비고 |
|------|------|------|
| 초기 세팅 | `cp .env.example .env && pnpm install` | 루트 워크스페이스 설치 |
| DMS 로컬 env | `cp apps/web/dms/.env.example apps/web/dms/.env.local` | DMS runtime env가 필요할 때 |
| 전체 개발 서버 | `pnpm dev` | Turborepo 개발 서버 |
| 서버 개발 서버 | `pnpm dev:server` | `http://localhost:4000` |
| PMS 개발 서버 | `pnpm dev:web-pms` | `http://localhost:3000` |
| CMS 개발 서버 | `pnpm dev:web-cms` | `http://localhost:3002` |
| DMS 개발 서버 | `pnpm dev:web-dms` | `http://localhost:3001` |
| 전체 빌드 | `pnpm build` | `turbo build` |
| 서버 빌드 | `pnpm build:server` | NestJS |
| PMS 빌드 | `pnpm build:web-pms` | Next.js |
| CMS 빌드 | `pnpm build:web-cms` | Next.js |
| DMS 빌드 | `pnpm build:web-dms` | Next.js |
| Types 패키지 빌드 | `pnpm --filter @ssoo/types build` | 공유 타입 패키지 |
| Database 패키지 빌드 | `pnpm --filter @ssoo/database build` | Prisma wrapper 패키지 |
| Web Auth 패키지 빌드 | `pnpm --filter @ssoo/web-auth build` | shared auth runtime/UI |
| 전체 린트 | `pnpm lint` | `turbo lint` |
| 서버 린트 | `turbo lint --filter=server` | |
| PMS 린트 | `turbo lint --filter=web-pms` | |
| CMS 린트 | `turbo lint --filter=web-cms` | |
| DMS 린트 | `turbo lint --filter=web-dms` | |
| 서버 타입 체크 | `pnpm --filter server exec tsc --noEmit` | |
| PMS 타입 체크 | `pnpm --filter web-pms exec tsc --noEmit` | |
| CMS 타입 체크 | `pnpm --filter web-cms exec tsc --noEmit` | |
| DMS 타입 체크 | `pnpm --filter web-dms exec tsc --noEmit` | |
| DB 시작 | `pnpm db:up` | Docker Compose postgres |
| DB 스키마 반영 | `pnpm db:push` | Prisma `db push` |
| DB 시드 | `pnpm db:seed` | `.codex/scripts/db-seed.sh` |
| DB 트리거 설치 | `pnpm db:triggers` | 히스토리 트리거 적용 |
| Preflight | `pnpm run codex:preflight` | 작업 전 검증 훅 |
| Sync 검증 | `pnpm run codex:verify-sync` | `.github` <-> `.codex`/`CLAUDE` |
| DMS 가드 | `pnpm run codex:dms-guard` | DMS 변경 시 |
| 문서 검증 | `node .github/scripts/check-docs.js --all` | instruction/docs 변경 시 |
| 패턴 검증 | `node .github/scripts/check-patterns.js [파일경로]` | `export *`, `any` 등 |
| 디자인 검증 | `node .github/scripts/check-design.js [파일경로]` | UI 변경 시 |
| SDD 구조 검증 | `node .github/scripts/sdd-verify.js --quick` | 문서/구조 점검 |
| DMS workspace sync | `pnpm run codex:workspace-sync-from-gitlab` | GitLab workspace branch 재통합 |
| DMS workspace publish | `pnpm run codex:workspace-publish` | GitHub + GitLab publish 흐름 |

### 테스트

- 현재 **자동 테스트 러너는 구성되어 있지 않습니다**. `pnpm test`가 없고, 단일 테스트 실행 명령도 없습니다.
- 이 저장소의 기본 검증 표면은 **lint + type-check + build + `.github/scripts/*` + PR Validation workflow** 입니다.

### 빠른 확인

- Health check: `curl http://localhost:4000/api/health`
- OpenAPI JSON: `curl http://localhost:4000/api/openapi.json`
- 기본 계정: `admin` / `admin123!`
- CI 기준선: `.github/workflows/pr-validation.yml`

---

## 핵심 원칙

1. **Dead Code 금지**: 미사용 코드와 조기 추상화(BaseService 등)는 두지 않습니다.
2. **패키지 경계 엄수**: `apps/ -> packages/` 방향만 허용하며 역방향/순환 참조를 금지합니다.
3. **기존 패턴 우선**: 같은 도메인에 이미 있는 구현 패턴을 먼저 따릅니다.
4. **기존 결과 보존**: 새 작업이 기존 기능, 동작, UI 외형을 훼손하면 안 됩니다.
5. **코드-문서 동기화**: 코드와 규칙을 바꾸면 관련 문서와 changelog도 함께 갱신합니다.
6. **역할/책임 경계 유지**: 하나의 파일이나 컴포넌트에 과도한 책임을 몰아넣지 않습니다.

---

## 아키텍처

### 워크스페이스 경계

```text
apps/server   -> packages/database, packages/types
apps/web/pms  -> packages/types, packages/web-auth
apps/web/cms  -> packages/types, packages/web-auth
apps/web/dms  -> packages/types, packages/web-auth
```

- `packages/`는 `apps/`를 참조하지 않습니다.
- DMS는 workspace 앱이지만 **`@ssoo/database`를 직접 import하지 않고**, same-origin Next API 프록시와 서버 DMS 모듈을 통해 백엔드 기능에 접근합니다.

### 서버 요청/감사 흐름

- `apps/server/src/main.ts`는 `/api` 전역 prefix, CORS, `ValidationPipe`, OpenAPI JSON 노출을 설정합니다.
- `apps/server/src/app.module.ts`는 `CommonModule`, `PmsModule`, `CmsModule`, `DmsModule`을 조합하고 `RequestContextInterceptor`, `GlobalHttpExceptionFilter`, `ThrottlerGuard`를 전역 등록합니다.
- 서버 구현의 기본 경로는 **Controller -> Service -> DatabaseService** 입니다.
- `DatabaseService`는 `@ssoo/database`의 `createPrismaClient()`를 감싼 래퍼이고, 새 모델은 보통 `db.client.<model>`로 접근합니다.
- 요청 단위의 `userId` / `transactionId`는 `RequestContextInterceptor`가 `runWithContext()`로 주입하고, Prisma extension과 PostgreSQL 히스토리 트리거가 감사 컬럼과 이력 row를 채웁니다.
- Controller 응답은 `apps/server/src/common/responses.ts`의 공통 헬퍼(`success`, `paginated`, `error`, `notFound`, `deleted`) 형식을 따릅니다.

### Prisma Client Extensions

- `commonColumnsExtension`은 요청 컨텍스트에서 감사 컬럼과 transaction metadata를 채웁니다.
- `softDeleteExtension`은 공통 delete 동작을 soft delete 업데이트로 바꿉니다.
- `activeFilterExtension`은 기본 조회에서 활성 데이터만 보도록 필터를 적용합니다.
- 이 확장 흐름은 `RequestContextInterceptor -> Prisma extension -> PostgreSQL trigger` 체인으로 동작합니다.

### 공유 인증 구조

- 인증의 백엔드 권한원은 `apps/server/src/modules/common/auth/*` 입니다.
- 프론트엔드의 공통 auth 런타임은 `packages/web-auth`가 담당합니다.
  - `createAuthStore(...)`
  - shared persisted auth snapshot
  - 공통 로그인 UI / 로딩 UI / 사용자 메뉴
- PMS, CMS, DMS는 각자 transport adapter를 유지하되, **auth 상태 shape와 로그인/로그아웃/checkAuth 흐름은 공유 패키지에 맞춥니다**.

### 프론트엔드 앱별 큰 흐름

- **PMS**: URL을 `/`에 고정한 keep-alive MDI 구조입니다. `src/components/layout/ContentArea.tsx`의 `pageComponents` 맵이 메뉴 path를 실제 페이지에 연결하고, 열린 탭은 모두 마운트된 상태로 유지됩니다.
- **CMS**: PMS와 auth/runtime 패턴은 공유하지만, MDI가 아니라 Next App Router 페이지 라우팅을 사용합니다.
- **DMS**: 브라우저는 `apps/web/dms/src/app/api/*/route.ts`로 요청하고, 이 라우트는 `src/app/api/_shared/serverApiProxy.ts`를 통해 헤더를 전달하며 `apps/server/src/modules/dms/*` 엔드포인트로 프록시합니다. 따라서 파일/Git/AI 로직의 실제 권한 경계는 서버 쪽 DMS 모듈에 있습니다.

### 공유 계약과 문서 계층

- `packages/types`는 `common/`, `pms/`, `dms/` 서브패스 중심의 **type-only 패키지**입니다.
- BigInt PK는 API와 `@ssoo/types` 경계에서 **문자열**로 직렬화합니다.
- `.github/`는 프로세스/규칙 정본, `docs/`와 `docs/dms/`는 시스템/도메인/디자인 산출물 정본입니다.
- `reference/` 문서는 자동 생성 영역으로 취급하고 직접 수정하지 않습니다.

---

## 핵심 관례

| 주제 | 관례 |
|------|------|
| 프론트엔드 레이어 | `pages -> templates -> common -> ui`, `hooks -> lib/api -> stores` 방향만 허용합니다. |
| PMS 페이지 추가 | 메뉴 path를 만들었으면 `ContentArea.tsx`의 `pageComponents` 맵에도 등록해야 실제 탭이 열립니다. |
| PMS/CMS API 패턴 | 도메인 API 함수는 `lib/api/endpoints/*`, 캐싱/조회는 `hooks/queries/use{Domain}.ts` 패턴을 우선 따릅니다. |
| DMS API 패턴 | 브라우저 로직은 `src/`에 두고, 서버 접근은 `src/app/api/*/route.ts -> serverApiProxy -> apps/server/src/modules/dms/*` 경계를 유지합니다. |
| Auth 공통화 | 앱별 auth store/login/logout UI를 새로 만들기보다 `@ssoo/web-auth`를 확장합니다. |
| 서버 응답 형식 | 서버는 공통 response helper 형식을 유지하고, BigInt ID는 문자열로 내보냅니다. |
| 공유 타입 | `packages/types`에는 런타임 로직을 넣지 않고, 명시적 re-export만 사용합니다. |
| 문서/규칙 정본 | 규칙은 `.github/`, 산출물 문서는 `docs/`; `.github`를 바꾸면 mirror sync 검증까지 맞춥니다. |
| Planning 문서 | PMS는 `docs/pms/planning/`, DMS는 `docs/dms/planning/`, CMS는 `docs/cms/` 아래 문서를 먼저 봅니다. |
| DMS 배포 워크플로우 | DMS workspace 동기화/배포는 `codex:workspace-sync-from-gitlab`, `codex:workspace-publish` 흐름을 우선 사용합니다. |

---

## 문서 관리 규칙

- `.github/`는 Copilot/Codex/Claude가 공통으로 참조하는 **프로세스 정본**입니다.
- `.github/instructions/*.md`는 경로별 상세 규칙이며, 구현 시 이 파일보다 더 구체적인 기준으로 취급합니다.
- `docs/`와 `docs/dms/`는 시스템/도메인/디자인 산출물 정본입니다.
- 문서 구조는 Diataxis(`tutorials`, `guides`, `reference`, `explanation`)를 따르며, `reference/`는 자동 생성 영역으로 봅니다.
- 규칙 문서를 바꾸면 `pnpm run codex:verify-sync`로 미러 상태를 확인합니다.

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
3. 역방향 의존성(`ui -> pages`, `packages -> apps`)
4. 미사용 코드와 BaseService 같은 불필요한 추상화 추가
5. 기존 기능/동작/UI 외형 왜곡
6. 역할 경계를 무시한 비대 모듈
7. DMS에서 `@ssoo/database` 직접 import
8. 코드/규칙 변경 후 관련 문서와 mirror sync 검증 누락

---

> 관련 세부 구현 규칙은 `.github/instructions/*.md`가 우선하며, 이 파일은 미래 Copilot 세션이 저장소를 빠르게 이해하기 위한 전역 진입점입니다.
