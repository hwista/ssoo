# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Claude Code 세션 시작 시 자동 로드되는 전역 규칙입니다.
> 경로별 상세 규칙은 `.github/instructions/` 및 각 서브디렉토리 `CLAUDE.md`를 참조하세요.

---

## 환경 요구사항

- **Node.js** ≥ 20.0.0, **pnpm** ≥ 9.0.0 (DMS는 npm 독립)
- **PostgreSQL** ≥ 15 (또는 Docker: `docker compose up -d`)
- 환경변수: `.env` 파일 참조 (아래 "데이터베이스 명령" 섹션)
- Health check: `curl http://localhost:4000/api/health`
- 테스트 계정: `admin` / `admin123!` (role: admin)

---

## 프로젝트 개요

| 항목 | 값 |
|------|-----|
| 구조 | pnpm workspace + Turborepo |
| 앱 | `apps/server` (NestJS), `apps/web/pms` (Next.js), `apps/web/chs` (Next.js), `apps/web/dms` (Next.js, npm 독립) |
| 공유 패키지 | `packages/database` (Prisma), `packages/types` |
| 아키텍처 | 모듈러 모놀리스 (도메인별 모듈 분리: common/pms/dms/chs) |

---

## 핵심 원칙 (12개)

1. **코드 정리**: 사용 코드만 유지, 미사용 코드 즉시 삭제, 조기 추상화 금지
2. **코드-문서 동기화**: 코드 변경 → 문서 갱신 → 커밋 (항상 동시 반영)
3. **증거 기반**: 추정 금지, 파일 경로/라인번호 명시, "~일 것 같음" 금지
4. **승인 프로세스**: 탐색 → 분석 → 계획 → 사용자 승인 → 실행
5. **점검 우선**: 수정 전 반드시 탐색, "점검 → 분석 → 실행" 순서
6. **패키지 경계**: `apps/` → `packages/` 방향만, 역방향/순환 참조 금지
7. **일관성**: 기존 코드 패턴 참조 우선, 새 패턴 도입 시 사용자 승인 필요
8. **불확실성**: 추정 대신 `[NEEDS CLARIFICATION: ...]` 사용 (최대 3개)
9. **사전 게이트**: Simplicity, Anti-Abstraction, Integration 체크
10. **비판적 수용**: 사용자 요청도 기술적 타당성 검증 후 수행, 무조건 긍정 금지
11. **기존 결과 보존**: 새 작업이 기존 기능·동작·UI 외형을 왜곡·축소·변형 금지
12. **패턴 최우선 + 경계 관리**: 워크스페이스 패턴 동일 적용, 역할/책임 경계 명확, 비대화 방지

---

## 네이밍 규칙

| 대상 | 규칙 | 예시 |
|------|------|------|
| 컴포넌트 | PascalCase | `ProjectCard.tsx` |
| 훅 | use 접두사 + camelCase | `useAuth.ts` |
| 유틸 | camelCase | `formatDate.ts` |
| 타입/인터페이스 | PascalCase | `User`, `ProjectDto` |
| 상수 | UPPER_SNAKE_CASE | `DEFAULT_PAGE_SIZE` |
| 스토어 | kebab-case + `.store.ts` | `tab.store.ts` |

### 디렉토리-파일 명명 규칙

디렉토리 하위 컴포넌트는 디렉토리명을 파일명 prefix로 사용하지 않음:

```
✅ editor/Toolbar.tsx
❌ editor/EditorToolbar.tsx
```

---

## 레이어 아키텍처

```
pages → templates → common → ui
  ↓
hooks → lib/api → stores
```

- 상위 → 하위만 참조 가능
- 역방향 참조 금지 (ui → pages ❌)
- 순환 참조 금지

---

## 아키텍처 패턴

### PMS MDI Keep-Alive (탭 시스템)

```
URL은 항상 `/` → ContentArea가 탭 기반으로 페이지 동적 로드
TabBar ↔ tab.store → ContentArea가 활성 탭의 컴포넌트 렌더링
```

- 탭 전환 시 URL 변경 없음, 컴포넌트 keep-alive 방식
- 탭 상태는 `tab.store.ts`에서 관리
- 새 페이지 추가 시 `src/components/layout/ContentArea.tsx`의 `pageComponents` 맵에 lazy import를 등록
- Zustand 스토어는 `auth.store.ts`, `tab.store.ts`, `menu.store.ts`, `sidebar.store.ts`, `layout.store.ts`, `confirm.store.ts`를 사용

### DMS 서버 레이어 (3계층 위임)

```
src/app/api/*/route.ts → server/handlers/*.handler.ts → server/services/*/
```

- API route는 handler 호출만 수행 (로직 금지)
- Handler는 요청 파싱 + 서비스 위임 (비즈니스 로직 금지)
- Service가 실제 비즈니스 로직 담당

### 데이터베이스 (Multi-Schema Prisma)

- PostgreSQL 4개 스키마: `common`, `pms`, `dms`, `chs`
- 히스토리 테이블 패턴: 주 테이블 `cm_code` → 이력 테이블 `cm_code_h` (historySeq 복합 PK)
- 공통 감사 컬럼: `createdBy`, `createdAt`, `updatedBy`, `updatedAt`
- DB 테이블 네이밍은 `{스키마접두사}_{도메인}_m` 패턴을 사용
- BigInt PK는 API 응답에서 `string`으로 직렬화해야 함
- 스키마 간 FK는 금지하고 애플리케이션 레벨 조인을 사용

### 서버 아키텍처 핵심

- `DatabaseService`는 Prisma 래퍼이며 Controller에서 직접 Prisma를 사용하지 않음
- 도메인 모듈은 `modules/common/`, `modules/pms/`, `modules/dms/`, `modules/chs/` 구조를 따른다
- 인증은 `JwtAuthGuard`, `RolesGuard`, `@CurrentUser()`, `@Public()` 패턴을 사용
- `GlobalHttpExceptionFilter`, `RequestContextInterceptor`, 전역 `ValidationPipe`를 기본 전제로 한다
- 모든 엔드포인트는 `/api` prefix를 사용하고, OpenAPI 스펙은 `/api/openapi.json`에서 제공한다

### PMS API 클라이언트 패턴

- Axios 인스턴스와 인터셉터로 토큰을 자동 주입한다
- 401 응답 시 refreshToken으로 자동 갱신 후 원 요청을 재시도한다
- 서버 상태는 TanStack Query 훅(`hooks/queries/`) 패턴으로 관리한다
- Import alias는 `@/*` → `./src/*` 를 사용한다

### CHS (Community Hub System)

- Next.js App Router 기반, 포트 3002
- 컬러 테마: Teal (hue 180°) — PMS Navy (hue 213°)와 구분
- 서버 모듈: `modules/chs/` (board, comment, feed, follow, notification, post, profile, skill)
- PMS와 인증 토큰 공유, 라우팅은 표준 Next.js 방식 (PMS MDI 탭과 다름)

### Prisma Client Extensions

- `commonColumnsExtension`: 감사 컬럼 자동 세팅 (History 모델, `UserFavorite` 제외)
- `softDeleteExtension`: `delete()`를 soft delete로 변환
- `activeFilterExtension`: 활성 데이터 필터 자동 적용 (읽기 시 soft-deleted 데이터 자동 제외)
- 이 Extension들은 `DatabaseService`를 통해서만 적용된다

---

## 금지 사항 (13개)

1. **와일드카드 export** (`export * from`)
2. **any 타입 사용** - `unknown` 또는 구체적 타입 사용
3. **역방향 의존성** - ui가 pages 참조, packages가 apps 참조
4. **미사용 코드 커밋** - Dead Code는 삭제
5. **불필요한 추상화** - BaseService 등
6. **문서 갱신 없이 코드 커밋**
7. **근거 없는 추정** - 증거 없이 "~일 것 같음" 금지
8. **요청하지 않은 컨테이너 래핑** - 컨트롤 요청 시 컨트롤만 생성
9. **디렉토리명 접두사 파일명 중복** - `editor/EditorToolbar.tsx` 금지
10. **사용자 요청의 무조건적 수용/긍정** - 기술적 타당성 검증 없이 그대로 수행
11. **기존 기능·동작·UI 외형의 왜곡/축소/변형** - 새 작업이 기존 결과물을 훼손
12. **역할/책임 경계 무시한 비대 모듈** - 하나의 파일/컴포넌트에 과도한 책임 집중
13. **DMS에서 `@ssoo/*` 패키지 import** - DMS는 독립 프로젝트

---

## 커밋 메시지 형식

```
<type>(<scope>): <subject>
```

- **Type**: `feat` | `fix` | `docs` | `style` | `refactor` | `perf` | `test` | `build` | `ci` | `chore` | `revert`
- **Scope**: `server` | `web-pms` | `web-chs` | `web-dms` | `database` | `types` | `docs`
- `commitlint.config.mjs`로 자동 검증 (subject 최대 100자)

---

## 개발 서버 실행

| 앱 | 명령어 | 포트 | 비고 |
|----|--------|------|------|
| 전체 (server + pms) | `pnpm dev` | - | Turborepo 병렬 실행 |
| server만 | `pnpm dev:server` | 4000 | NestJS |
| web-pms만 | `pnpm dev:web-pms` | 3000 | Next.js |
| web-chs | `pnpm dev:web-chs` | 3002 | Next.js App Router |
| web-dms | `pnpm dev:web-dms` | 3001 | 내부적으로 `npm run dev` 실행 |

### 앱별 빌드 / 린트 / 타입 체크

```bash
pnpm build                                    # 전체 빌드
pnpm lint                                     # 전체 린트
turbo lint --filter=server                    # 서버만 린트
turbo lint --filter=web-pms                   # PMS만 린트
turbo lint --filter=web-chs                   # CHS만 린트
pnpm -C apps/server exec tsc --noEmit         # 서버 타입 체크
pnpm -C apps/web/pms exec tsc --noEmit        # PMS 타입 체크
pnpm -C apps/web/chs exec tsc --noEmit        # CHS 타입 체크
cd apps/web/dms && npx tsc --noEmit           # DMS 타입 체크
```

### 데이터베이스 명령

```bash
pnpm db:up          # PostgreSQL (pgvector/pgvector:pg17) Docker 컨테이너 시작
pnpm db:push        # Prisma 스키마를 DB에 반영
pnpm db:seed        # 기초 데이터 삽입 (SQL 시드)
pnpm db:triggers    # 히스토리 트리거 설치
```

필수 환경변수 (`.env`):
```
DATABASE_URL="postgresql://ssoo:ssoo_dev_pw@localhost:5432/ssoo_dev?schema=public"
PORT=4000
JWT_SECRET=...
JWT_REFRESH_SECRET=...
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

환경 설정:

```bash
cp .env.example .env
pnpm install
```

---

## 빌드 & 검증 명령

| 용도 | 명령어 |
|------|--------|
| 타입 체크 | `npx tsc --noEmit` (앱별) 또는 `pnpm build` |
| 린트 | `pnpm lint` |
| DMS 빌드 | `pnpm run build:web-dms` |
| DMS 가드 | `pnpm run codex:dms-guard` |
| DMS 배포 | `pnpm run codex:dms-publish` (GitHub + GitLab 동시) |
| 문서 점검 | `node .github/scripts/check-docs.js` |
| 패턴 점검 | `node .github/scripts/check-patterns.js` |
| 디자인 점검 | `node .github/scripts/check-design.js` |
| SDD 구조 점검 | `node .github/scripts/sdd-verify.js --quick` |
| Codex 동기화 검증 | `node .codex/scripts/verify-codex-sync.js` |
| Codex preflight | `pnpm run codex:preflight` |

### 테스트

현재 테스트 프레임워크 미도입 상태. `pnpm test` 명령 없음. 테스트 관련 규칙은 `.github/instructions/testing.instructions.md`를 참조합니다.

### Pre-commit Hooks (lint-staged)

- TypeScript/JS 파일: `pnpm lint` + `check-patterns.js` 자동 실행
- Markdown 파일: `check-docs.js --strict` 자동 실행
- Husky + lint-staged로 관리, 훅 실패 시 커밋 차단

### CI

PR 생성/업데이트 시 `.github/workflows/pr-validation.yml` 자동 실행 (린트 + 타입 체크 + 빌드 + 패턴 검증)

---

## 문서 관리

### 계층 구조

| 계층 | 경로 | 역할 |
|------|------|------|
| 깃헙독스 코어 | `.github/` | 프로세스 표준 (정본, 이식 가능) |
| 깃헙독스 서비스 | `.github/instructions/` | 서비스별 규칙 |
| 레포독스 | `docs/` | 산출물 문서 (레포 전용) |

### Diataxis 분류

- `tutorials/` - 학습 (step-by-step)
- `guides/` - 문제 해결 (How-to)
- `reference/` - 기술 명세 (자동 생성)
- `explanation/` - 개념 이해 (architecture/domain/design)

### 코드 변경 시 필수

- Changelog 항목 추가
- 관련 문서 동시 업데이트

---

## 경로별 상세 규칙

| 경로 | 참조 인스트럭션 |
|------|----------------|
| `apps/server/**` | `.github/instructions/server.instructions.md` |
| `apps/web/pms/**` | `.github/instructions/pms.instructions.md` |
| `apps/web/chs/**` | `.github/instructions/chs.instructions.md` |
| `apps/web/dms/**` | `.github/instructions/dms.instructions.md` + `apps/web/dms/CLAUDE.md` |
| `packages/database/**` | `.github/instructions/database.instructions.md` |
| `packages/types/**` | `.github/instructions/types.instructions.md` |

---

## 멀티 에이전트 동기화

### 정본 계층

| 계층 | 위치 | 에이전트 |
|------|------|---------|
| 정본 | `.github/` | GitHub Copilot |
| 미러 | `.codex/instructions/` | Codex CLI |
| 미러 | `CLAUDE.md` | Claude Code |

### 규칙 변경 시 순서

1. `.github/` (정본) 먼저 수정
2. `.codex/instructions/` 미러 반영
3. `CLAUDE.md` 미러 반영
4. `node .codex/scripts/verify-codex-sync.js` 실행
5. 검증 실패 시 커밋 불가

체크리스트 상세: `.github/guides/agent-sync-checklist.md`
