# SSOO 모노레포 - GitHub Copilot 전역 가이드라인

> 경로별 상세 규칙은 `.github/instructions/` 폴더를 참조하세요.
> 이 파일이 **정본**. `CLAUDE.md`, `.codex/instructions/`는 미러.

---

## 프로젝트 개요

SSOO(삼삼오오)는 SI/SM 조직의 **Opportunity → Project → System** 통합 업무 허브.
영업→PM 인계 시 히스토리 단절, 파이프라인 가시성 부족, 수작업 보고 비용을 해결한다.

| 앱 | 위치 | 역할 |
|---|---|---|
| **Server** (NestJS) | `apps/server` | REST API 백엔드, JWT 인증 |
| **PMS** (Next.js) | `apps/web/pms` | 프로젝트 관리 프론트엔드 |
| **DMS** (Next.js) | `apps/web/dms` | 문서 관리 (npm 독립 프로젝트) |
| **CHS** (Next.js) | `apps/web/chs` | 커뮤니티 허브 (SNS, 게시판, 인력풀) |
| **@ssoo/database** | `packages/database` | Prisma ORM, Multi-Schema PostgreSQL |
| **@ssoo/types** | `packages/types` | Server ↔ Web 공유 타입 (순수 타입, 런타임 코드 없음) |

핵심 도메인 개념: `Project` (기회+실행 통합, `statusCode`+`stageCode`로 단계 관리), `Customer` (고객사/플랜트), `Menu` (권한 기반 메뉴 트리), `Post` (피드/게시판 통합 게시물), `Skill` (전문가 스킬맵)

---

## 환경 요구사항

- **Node.js** ≥ 20 (`.nvmrc`: 24), **pnpm** ≥ 9.0 (DMS만 npm 독립)
- **PostgreSQL** ≥ 15 — Docker: `pnpm db:up` (pgvector/pgvector:pg17)

## 개발 명령어

### 개발 서버

| 앱 | 명령어 | 포트 |
|---|---|---|
| **전체** | `pnpm dev` | - |
| **서버 (NestJS)** | `pnpm dev:server` | 4000 |
| **PMS (Next.js)** | `pnpm dev:web-pms` | 3000 |
| **DMS (Next.js, npm 독립)** | `pnpm dev:web-dms` | 3001 |
| **CHS (Next.js)** | `pnpm dev:web-chs` | 3002 |

Health check: `curl http://localhost:4000/api/health`
테스트 계정: `admin` / `admin123!` (role: admin)

### 빌드 / 린트 / 타입 체크

```bash
pnpm build                                    # 전체 빌드 (Turborepo, packages 먼저)
pnpm lint                                     # 전체 린트
turbo lint --filter=server                    # 서버만 린트
turbo lint --filter=web-pms                   # PMS만 린트
pnpm -C apps/server exec tsc --noEmit        # 서버 타입 체크
pnpm -C apps/web/pms exec tsc --noEmit       # PMS 타입 체크
cd apps/web/dms && npx tsc --noEmit           # DMS 타입 체크 (npm 독립)
```

### 테스트

현재 테스트 프레임워크 미도입 상태. `pnpm test` 명령 없음.

### 코드 검증

```bash
node .github/scripts/check-patterns.js [파일경로]   # 코드 패턴 검증
node .github/scripts/check-design.js [파일경로]     # 디자인 패턴 검증
node .github/scripts/check-docs.js --all             # 문서 검증
node .github/scripts/sdd-verify.js --quick           # SDD 구조 검증
```

### 초기 세팅 (순서대로)

```bash
cp .env.example .env        # 1. 환경변수 파일 생성 후 편집
pnpm install                # 2. 모노레포 의존성 설치
cd apps/web/dms && npm ci   # 3. DMS 의존성 별도 설치 (npm 독립)
cd ../../..
pnpm db:up                  # 4. PostgreSQL Docker 시작
pnpm db:push                # 5. Prisma 스키마 → DB 반영
pnpm db:seed                # 6. 기초 데이터 삽입
pnpm db:triggers            # 7. 히스토리 트리거 설치
```

필수 환경변수 (`.env.example` 참조):

```env
DATABASE_URL="postgresql://ssoo:ssoo_dev_pw@localhost:5432/ssoo_dev?schema=public"
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
JWT_SECRET=your-jwt-secret-key-change-in-production
JWT_REFRESH_SECRET=your-jwt-refresh-secret-change-in-production
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

PMS 프론트엔드는 `NEXT_PUBLIC_API_URL` 환경변수로 API 주소를 설정 (기본값: `http://localhost:4000/api`).

### CI

PR 생성/업데이트 시 `.github/workflows/pr-validation.yml` 자동 실행 (린트 + 타입 체크 + 빌드 + 패턴 검증). 변경 경로에 따라 server/pms/dms 조건부 빌드.

---

## 아키텍처

### 패키지 의존성 방향

```
apps/server  ──→  packages/database, packages/types
apps/web/pms ──→  packages/types
apps/web/chs ──→  packages/types
apps/web/dms ──→  (독립, @ssoo/* 금지)
```

역방향 참조 및 순환 참조 금지. `packages/`는 `apps/`를 절대 참조하지 않습니다.

> **DMS (`apps/web/dms`)는 `pnpm-workspace.yaml`에 포함되지 않는 독립 프로젝트입니다.** npm을 사용하며, `@ssoo/*` 패키지를 import하면 안 됩니다. 별도 저장소 분리가 예정되어 있습니다.

### 서버 (NestJS): Controller → Service → DatabaseService

- `DatabaseService`(`apps/server/src/database/database.service.ts`)는 Prisma 래퍼. Controller에서 직접 Prisma 사용 금지.
  - 모델 접근: `db.user`, `db.project`, `db.menu` 등 getter 사용, 새 모델은 `db.client.<model>`로 접근 가능
- 도메인 모듈: `modules/common/` (auth, user, health), `modules/pms/` (project, menu), `modules/dms/`
- 인증 데코레이터/가드: `JwtAuthGuard`, `RolesGuard`, `@CurrentUser()`, `@Public()` (`modules/common/auth/`)
  - `@Public()`: 엔드포인트에 붙이면 JWT 인증 건너뜀 (예: 로그인)
  - `@CurrentUser()`: JWT payload에서 사용자 정보 추출 (`@CurrentUser('userId')` 등 필드 선택 가능)
- 새 모듈 추가: 해당 도메인 폴더 아래 module/controller/service/dto 생성 → 도메인 module에 등록
- 응답 헬퍼 (`common/responses.ts`): `success(data)`, `paginated(data, page, limit, total)`, `error(code, msg)`, `notFound(entity)` — Controller에서 일관된 응답 형식 사용
- `GlobalHttpExceptionFilter` (`common/filters/`): 모든 에러를 `{ success, error: { code, message, path }, timestamp }` 형식으로 통일
- `RequestContextInterceptor` (`common/interceptors/`): JWT 사용자 ID를 `@ssoo/database`의 `runWithContext`로 주입 → Prisma Extension에서 감사 컬럼(`createdBy`, `updatedBy`, `transactionId`) 자동 기록
- 전역 `ValidationPipe`: `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true` — DTO에 class-validator 데코레이터 필수
- `ThrottlerGuard`: 전역 Rate Limiting (100 req / 60s)
- 전역 prefix: `/api` — 모든 엔드포인트가 `/api/...`
- Swagger: `/api/openapi.json`에서 OpenAPI 스펙 제공

### PMS: MDI Keep-Alive 탭 (ContentArea)

URL은 항상 `/` 고정. `ContentArea`가 메뉴 path 기반으로 페이지를 동적 로딩.

- 모든 열린 탭을 동시에 마운트 → 비활성 탭은 CSS `display:none` (DOM 유지)
- **새 페이지 추가**: `src/components/layout/ContentArea.tsx`의 `pageComponents` 맵에 lazy import 등록
- 탭 상태: `tab.store.ts` (Zustand + sessionStorage persist)
- 서버 상태: TanStack Query (`hooks/queries/`). useQuery/useMutation 패턴.
- Zustand 스토어: `auth.store.ts`, `tab.store.ts`, `menu.store.ts`, `sidebar.store.ts`, `layout.store.ts`, `confirm.store.ts`

### PMS: API 클라이언트 패턴

- Axios 인스턴스 (`lib/api/client.ts`) + 인터셉터로 토큰 자동 주입 (localStorage `ssoo-auth` 키)
- 401 응답 시 refreshToken으로 자동 갱신 → 원래 요청 재시도
- 도메인별 API 함수: `lib/api/endpoints/{도메인}.ts` (예: `projectsApi.list()`, `menusApi.getMyMenus()`)
- React Query 훅: `hooks/queries/use{Domain}.ts` (예: `useProjectList()`, `useCreateProject()`)
  - 계층적 캐시 키 패턴: `projectKeys.all → lists() → list(filters) → details() → detail(id)`
  - Mutation 성공 시 관련 쿼리 자동 invalidate
- Import alias: `@/*` → `./src/*` (tsconfig paths)

### DMS: npm 독립 프로젝트

- `@ssoo/*` 패키지 import 금지 (별도 저장소 분리 예정)
- 패키지 매니저: **npm** (pnpm이 아님), `package-lock.json` 사용
- API 클라이언트: **fetch** 기반 (`lib/api/core.ts`), Axios 미사용
- 서버 로직: `server/` 디렉토리 (`src/` 외부에 위치)
- API 레이어: `src/app/api/[route]/route.ts` → handler (`server/handlers/`) → service (`server/services/`)
- Import alias: `@/*` → `./src/*`, `@/server/*` → `./server/*`
- 빌드: `pnpm run build:web-dms`, 가드: `pnpm run codex:dms-guard`

### 데이터베이스: Multi-Schema Prisma

PostgreSQL 3개 스키마 (`packages/database/prisma/schema.prisma`):

| 스키마 | 접두사 | 예시 | 용도 |
|--------|--------|------|------|
| `common` | `cm_` | `cm_user_m`, `cm_code_m` | 공통 (사용자, 코드, 메뉴) |
| `pms` | `pr_` | `pr_project_m`, `pr_task_m` | 프로젝트 관리 |
| `dms` | `dm_` | (예약) | 문서 관리 |
| `chs` | `ch_` | `ch_post_m`, `ch_skill_m` | 커뮤니티 허브 |

- 히스토리 테이블: 원본 `cm_code_m` → 이력 `cm_code_m_h` (PostgreSQL 트리거 자동 기록, `prisma/triggers/`)
- 공통 감사 컬럼: `createdBy`, `createdAt`, `updatedBy`, `updatedAt`, `lastSource`, `transactionId`
- BigInt PK → API 응답에서 반드시 `string`으로 직렬화 (`common/utils/bigint.util.ts`의 `toIdString()`, `serializeBigIntShallow()`)
- 스키마 간 FK 금지 → 애플리케이션 레벨 조인
- 새 테이블 추가 시: 마스터 모델 + 히스토리 모델 + 트리거 SQL + `apply-triggers.ts` 등록

### Prisma Client Extensions (`packages/database/src/extensions/`)

`createPrismaClient()`에 **`commonColumnsExtension`**이 체이닝되어 자동 동작: create/update 시 감사 컬럼(`createdBy`, `updatedBy`, `lastSource`, `transactionId`)을 `AsyncLocalStorage` 기반 요청 컨텍스트(`runWithContext`)로 자동 세팅. History 접미사 모델과 `UserFavorite`는 제외.

`DatabaseService`가 `createPrismaClient()`를 사용하므로, Service를 통한 DB 접근 시 자동 적용됨.

### 프론트엔드 레이어 아키텍처 (PMS/DMS 공통)

```
pages → templates → common → ui
  ↓
hooks → lib/api → stores
```

상위 → 하위만 참조 가능. 역방향·순환 참조 금지.

---

## 코드 규칙

### Git Hooks (Husky)

| Hook | 동작 |
|------|------|
| `pre-commit` | `pnpm lint` + `codex:preflight` |
| `commit-msg` | commitlint 메시지 형식 검증 |
| `pre-push` | `codex:push-guard` 실행 |

lint-staged: `apps/**/*.{ts,tsx}` 및 `packages/**/*.{ts,tsx}` → lint + check-patterns, `docs/**/*.md` → check-docs

### 네이밍

| 대상 | 규칙 | 예시 |
|------|------|------|
| 컴포넌트 | PascalCase | `ProjectCard.tsx` |
| 훅 | use 접두사 + camelCase | `useAuth.ts` |
| 유틸 | camelCase | `formatDate.ts` |
| 타입/인터페이스 | PascalCase | `User`, `ProjectDto` |
| 상수 | UPPER_SNAKE_CASE | `DEFAULT_PAGE_SIZE` |
| 스토어 | kebab-case + `.store.ts` | `tab.store.ts` |
| DB 테이블 | `{스키마접두사}_{도메인}_m` | `cm_user_m`, `pr_project_m` |

디렉토리 하위 컴포넌트는 디렉토리명을 파일명 prefix로 사용하지 않음:
- ✅ `editor/Toolbar.tsx` — ❌ `editor/EditorToolbar.tsx`

### 금지 사항

1. `export * from` — 명시적 re-export만 사용
2. `any` 타입 — `unknown` 또는 구체적 타입 사용
3. 역방향 의존성 — ui→pages, packages→apps
4. 미사용 코드 커밋 — Dead Code 즉시 삭제
5. 불필요한 추상화 — BaseService 등 YAGNI
6. 기존 기능·동작·UI 외형 왜곡/축소/변형
7. 역할/책임 경계 무시한 비대 모듈
8. DMS에서 `@ssoo/*` 패키지 import

### 커밋 메시지

```
<type>(<scope>): <subject>
```

Type: `feat` | `fix` | `docs` | `style` | `refactor` | `perf` | `test` | `build` | `ci` | `chore` | `revert`
Scope: `server` | `web-pms` | `web-chs` | `web-dms` | `database` | `types` | `docs`
`commitlint.config.mjs`로 자동 검증 (subject 최대 100자).

### 문서-코드 동기화

코드 변경 시 관련 문서 수정 + Changelog 필수.
문서는 Diátaxis 4분류: `tutorials/` | `guides/` | `reference/` (자동생성, 직접 수정 금지) | `explanation/`
상세: `.github/instructions/docs.instructions.md`

---

## 경로별 상세 규칙

> `.github/instructions/` 내 파일들은 `applyTo` front matter로 경로 패턴이 지정되어 있으며, 해당 경로 작업 시 GitHub Copilot이 **자동으로 로드**합니다.

| 경로 | 인스트럭션 |
|------|-----------|
| `apps/server/**` | `server.instructions.md` |
| `apps/web/pms/**` | `pms.instructions.md` |
| `apps/web/dms/**` | `dms.instructions.md` |
| `apps/web/chs/**` | `chs.instructions.md` |
| `packages/database/**` | `database.instructions.md` |
| `packages/types/**` | `types.instructions.md` |
| `**/*.test.*` | `testing.instructions.md` |
| SDD 프로토콜/양식 | `workflow.instructions.md` |
| 문서 관리 규칙 | `docs.instructions.md` |

---

## 규칙 동기화

이 파일이 **정본**. 규칙 변경 시: 정본 먼저 → `CLAUDE.md`/`.codex/instructions/` 미러 반영 → `node .codex/scripts/verify-codex-sync.js`
