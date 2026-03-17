# SSOO 모노레포 - GitHub Copilot 전역 가이드라인

> 경로별 상세 규칙은 `.github/instructions/` 폴더를 참조하세요.
> SDD 워크플로 프로토콜: `.github/instructions/workflow.instructions.md` 참조

---

## 개발 명령어

### 개발 서버

| 앱 | 명령어 | 포트 |
|---|---|---|
| **전체** | `pnpm dev` | - |
| **서버 (NestJS)** | `pnpm dev:server` | 4000 |
| **PMS (Next.js)** | `pnpm dev:web-pms` | 3000 |
| **DMS (Next.js, npm 독립)** | `pnpm dev:web-dms` | 3001 |

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

### 코드 검증

```bash
node .github/scripts/check-patterns.js [파일경로]   # 코드 패턴 검증
node .github/scripts/check-design.js [파일경로]     # 디자인 패턴 검증
node .github/scripts/check-docs.js --all             # 문서 검증
node .github/scripts/sdd-verify.js --quick           # SDD 구조 검증
```

### DB 세팅 (순서 중요)

```bash
pnpm db:up          # PostgreSQL Docker 컨테이너 시작
pnpm db:push        # Prisma 스키마를 DB에 반영
pnpm db:seed        # 기초 데이터 삽입 (SQL 시드)
pnpm db:triggers    # 히스토리 트리거 설치
```

### 환경 설정

```bash
cp .env.example .env   # 생성 후 편집
pnpm install           # 의존성 설치
```

필수 환경변수 (`.env`):

```env
DATABASE_URL="postgresql://ssoo:ssoo_dev_pw@localhost:5432/ssoo_dev?schema=public"
PORT=4000
JWT_SECRET=your-jwt-secret-key-change-in-production
JWT_REFRESH_SECRET=your-jwt-refresh-secret-change-in-production
```

### CI

PR 생성/업데이트 시 `.github/workflows/pr-validation.yml` 자동 실행 (린트 + 타입 체크 + 빌드 + 패턴 검증). 변경 경로에 따라 server/pms/dms 조건부 빌드.

---

## 아키텍처

### 패키지 의존성 방향

```
apps/server  ──→  packages/database, packages/types
apps/web/pms ──→  packages/types
apps/web/dms ──→  (독립, @ssoo/* 금지)
```

역방향 참조 및 순환 참조 금지. `packages/`는 `apps/`를 절대 참조하지 않습니다.

### 서버 (NestJS): Controller → Service → DatabaseService

- `DatabaseService`(`apps/server/src/database/database.service.ts`)는 Prisma 래퍼. Controller에서 직접 Prisma 사용 금지.
- 도메인 모듈: `modules/common/` (auth, user, health), `modules/pms/` (project, menu), `modules/dms/`
- 인증 데코레이터/가드: `JwtAuthGuard`, `RolesGuard`, `@CurrentUser()`, `@Public()` (`modules/common/auth/`)
- 새 모듈 추가: 해당 도메인 폴더 아래 module/controller/service/dto 생성 → 도메인 module에 등록

### PMS: MDI Keep-Alive 탭 (ContentArea)

URL은 항상 `/` 고정. `ContentArea`가 메뉴 path 기반으로 페이지를 동적 로딩.

- 모든 열린 탭을 동시에 마운트 → 비활성 탭은 CSS `display:none` (DOM 유지)
- **새 페이지 추가**: `src/components/layout/ContentArea.tsx`의 `pageComponents` 맵에 lazy import 등록
- 탭 상태: `tab.store.ts` (Zustand + sessionStorage persist)
- 서버 상태: TanStack Query (`hooks/queries/`). useQuery/useMutation 패턴.
- Zustand 스토어: `auth.store.ts`, `tab.store.ts`, `menu.store.ts`, `sidebar.store.ts`, `layout.store.ts`, `confirm.store.ts`

### DMS: npm 독립 프로젝트

- `@ssoo/*` 패키지 import 금지 (별도 저장소 분리 예정)
- 패키지 매니저: **npm** (pnpm이 아님), `package-lock.json` 사용
- API 레이어: `app/api/[route]/route.ts` → handler(요청 파싱) → service(비즈니스 로직)
- 빌드: `pnpm run build:web-dms`, 가드: `pnpm run codex:dms-guard`

### 데이터베이스: Multi-Schema Prisma

PostgreSQL 3개 스키마 (`packages/database/prisma/schema.prisma`):

| 스키마 | 접두사 | 예시 | 용도 |
|--------|--------|------|------|
| `common` | `cm_` | `cm_user_m`, `cm_code_m` | 공통 (사용자, 코드, 메뉴) |
| `pms` | `pr_` | `pr_project_m`, `pr_task_m` | 프로젝트 관리 |
| `dms` | `dm_` | (예약) | 문서 관리 |

- 히스토리 테이블: 원본 `cm_code_m` → 이력 `cm_code_m_h` (PostgreSQL 트리거 자동 기록, `prisma/triggers/`)
- 공통 감사 컬럼: `created_by_id`, `created_at`, `updated_by_id`, `updated_at`
- BigInt PK → API 응답에서 반드시 `string`으로 직렬화 (`common/utils/bigint.util.ts`)
- 스키마 간 FK 금지 → 애플리케이션 레벨 조인
- 새 테이블 추가 시: 마스터 모델 + 히스토리 모델 + 트리거 SQL + `apply-triggers.ts` 등록

### 프론트엔드 레이어 아키텍처 (PMS/DMS 공통)

```
pages → templates → common → ui
  ↓
hooks → lib/api → stores
```

상위 → 하위만 참조 가능. 역방향·순환 참조 금지.

---

## 코드 규칙

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
Scope: `server` | `web-pms` | `web-dms` | `database` | `types` | `docs`
`commitlint.config.mjs`로 자동 검증 (subject 최대 100자).

### 문서-코드 동기화

코드 변경 시 관련 문서 수정 + Changelog 필수.
문서는 Diátaxis 4분류: `tutorials/` | `guides/` | `reference/` (자동생성, 직접 수정 금지) | `explanation/`
상세: `.github/instructions/docs.instructions.md`

---

## 멀티 에이전트 규칙 동기화

이 파일(`.github/copilot-instructions.md`)이 **정본**. `CLAUDE.md`, `.codex/instructions/`는 미러.
규칙 변경: 정본 먼저 → 미러 반영 → `node .codex/scripts/verify-codex-sync.js`

---

## 경로별 상세 규칙

| 경로 | 인스트럭션 |
|------|-----------|
| `apps/server/**` | `server.instructions.md` |
| `apps/web/pms/**` | `pms.instructions.md` |
| `apps/web/dms/**` | `dms.instructions.md` |
| `packages/database/**` | `database.instructions.md` |
| `packages/types/**` | `types.instructions.md` |
| `**/*.test.*` | `testing.instructions.md` |
| SDD 프로토콜/양식 | `workflow.instructions.md` |
| 문서 관리 규칙 | `docs.instructions.md` |

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-03-16 | 리팩토링: 핵심 원칙+금지 사항 통합 (8→코드 규칙 섹션), 앱별 린트 명령 추가, CI 참조 추가, PMS 상태관리/페이지 등록 상세 추가, DMS npm 독립 강조, DB 새 테이블 체크리스트 추가, 작업 완료 조건→workflow 위임, UI 디자인→per-path 위임. 322줄→~160줄 |
| 2026-03-15 | 리팩토링: .env 설정/테스트 계정 추가, DB 스키마 접두사 규칙 추가, NestJS DatabaseService 패턴 추가, SDD 프로토콜→workflow.instructions.md 위임, 백로그/품질체크→per-path instructions 위임 |
| 2026-03-10 | 🔄 구조 개선: SDD 프로토콜→workflow.instructions.md, 문서 관리→docs.instructions.md 분리. 1190줄→~370줄 |
| 2026-03-10 | ⚡ 개발 빠른 참조, 🏗️ 핵심 아키텍처 패턴 추가 |
| 2026-02-27 | 핵심 원칙 3개 추가 (비판적 수용, 기존 결과 보존, 패턴 최우선), 멀티 에이전트 동기화 |
| 2026-02-06 | SDD 실행 프로세스, 문서화 매핑, 4단계 검증, Diátaxis 하이브리드 구조 |
| 2026-02-05 | 점검 우선 원칙, 문서 역할 구분, 불확실성 명시/Gate 시스템 |
