# SSOO 모노레포 - GitHub Copilot 전역 가이드라인

> 경로별 상세 규칙은 `.github/instructions/` 폴더를 참조하세요.
> SDD 워크플로 프로토콜: `.github/instructions/workflow.instructions.md` 참조

---

## 환경 요구사항

| 항목 | 요구사항 |
|------|---------|
| Node.js | ≥ 20.0.0 |
| pnpm | ≥ 10.0.0 (DMS는 npm 독립) |
| PostgreSQL | ≥ 15 (또는 Docker: `docker compose up -d`) |
| 테스트 | Jest 미도입 — 수동 테스트만 (`testing.instructions.md` 참조) |

---

## ⚡ 개발 빠른 참조

### 환경 설정

```bash
cp .env.example .env   # 환경변수 파일 생성 후 편집
pnpm install           # 의존성 설치
```

필수 환경변수 (`.env`):

```env
DATABASE_URL="postgresql://ssoo:ssoo_dev_pw@localhost:5432/ssoo_dev?schema=public"
PORT=4000
JWT_SECRET=your-jwt-secret-key-change-in-production
JWT_REFRESH_SECRET=your-jwt-refresh-secret-change-in-production
```

개발용 테스트 계정: `admin` / `admin123!` (role: admin)

### 개발 서버

| 앱 | 명령어 | 포트 |
|---|---|---|
| **전체** | `pnpm dev` | - |
| **서버 (NestJS)** | `pnpm dev:server` | 4000 |
| **PMS (Next.js)** | `pnpm dev:web-pms` | 3000 |
| **DMS (Next.js, 독립)** | `pnpm dev:web-dms` | 3001 |

Health check: `curl http://localhost:4000/api/health`

### 빌드 / 린트 / 타입 체크

```bash
pnpm build          # 전체 빌드 (Turborepo, packages 먼저)
pnpm lint           # 전체 린트
pnpm lint:docs      # 문서 린트 (check-docs.js)
```

개별 타입 체크:

```bash
pnpm -C apps/server exec tsc --noEmit     # 서버
pnpm -C apps/web/pms exec tsc --noEmit    # PMS
cd apps/web/dms && npx tsc --noEmit        # DMS (npm 독립)
```

### DB 초기 세팅 (순서 중요)

```bash
pnpm db:up          # PostgreSQL Docker 컨테이너 시작
pnpm db:push        # Prisma 스키마를 DB에 반영
pnpm db:seed        # 기초 데이터 삽입 (SQL 시드 파일 실행)
pnpm db:triggers    # 히스토리 트리거 설치
```

### 커밋 전 4단계 검증 (필수)

```bash
node .github/scripts/sdd-verify.js --quick           # 1. SDD 구조 검증
node .github/scripts/check-docs.js --all             # 2. 문서 검증
node .github/scripts/check-patterns.js [파일경로]   # 3. 코드 패턴 검증
node .github/scripts/check-design.js [파일경로]     # 4. 디자인 패턴 검증
```

---

## 🏗️ 핵심 아키텍처 패턴

### 패키지 의존성 방향

```
apps/server  ──→  packages/database, packages/types
apps/web/pms ──→  packages/types
apps/web/dms ──→  (독립, @ssoo/* 금지)
```

역방향 참조 및 순환 참조 금지. `packages/`는 `apps/`를 절대 참조하지 않습니다.

### PMS: MDI Keep-Alive 탭 (ContentArea)

URL은 항상 `/` 고정. `ContentArea`가 메뉴 path 기반으로 페이지를 동적 로딩.

- 모든 열린 탭을 동시에 마운트 → 비활성 탭은 CSS `display:none` (DOM 유지)
- 새 페이지 추가 시 `src/components/layout/ContentArea.tsx`의 `pageComponents` 맵에 등록
- 탭 상태는 `tab.store.ts`에서 관리 (Zustand + sessionStorage persist)

### DMS: 서버 레이어 패턴 (3계층 위임)

```
app/api/[route]/route.ts → server/handlers/*.handler.ts → server/services/*.service.ts
```

- API route → handler 호출만 (로직 금지)
- Handler → 요청 파싱 + 서비스 위임 (비즈니스 로직 금지)
- Service → 실제 비즈니스 로직 (싱글톤 export)
- DMS는 npm 독립 프로젝트: `@ssoo/*` 패키지 import 금지

### 서버 (NestJS): Controller → Service → DatabaseService

- `DatabaseService`는 Prisma 래퍼 (Controller에서 직접 Prisma 사용 금지)
- 도메인 모듈: `modules/common/` (auth, user, health), `modules/pms/` (project, menu)
- 인증: `JwtAuthGuard`, `RolesGuard`, `@CurrentUser()`, `@Public()` 데코레이터

### 데이터베이스: Multi-Schema Prisma

PostgreSQL 3개 스키마, 테이블 접두사 규칙:

| 스키마 | 접두사 | 예시 | 용도 |
|--------|--------|------|------|
| `common` | `cm_` | `cm_user_m`, `cm_code_m` | 공통 (사용자, 코드, 메뉴) |
| `pms` | `pr_` | `pr_project_m`, `pr_task_m` | 프로젝트 관리 |
| `dms` | `dm_` | (예약) | 문서 관리 |

- 히스토리 테이블: 원본 `cm_code_m` → 이력 `cm_code_m_h` (PostgreSQL 트리거 자동 기록)
- 공통 감사 컬럼: `created_by_id`, `created_at`, `updated_by_id`, `updated_at`
- BigInt PK → API 응답에서 반드시 `string`으로 직렬화
- 스키마 간 FK 금지 → 애플리케이션 레벨 조인 사용

---

## 🔴 핵심 원칙

| 원칙 | 핵심 내용 |
|------|----------|
| 코드 클렌징 | 미사용 코드 즉시 삭제, 불필요한 추상화 금지, YAGNI |
| 문서-코드 동기화 | 코드 변경 → 문서 업데이트 → 커밋. Changelog 필수 |
| 증거 기반 | 파일 경로·라인번호 명시. "~일 것 같음" 금지 |
| 점검 우선 | 수정 전 반드시 현재 상태 탐색. "점검 → 분석 → 실행" |
| 패키지 경계 | apps/ → packages/ 방향만. 역방향/순환 참조 금지 |
| 기존 코드 일관성 | 기존 패턴 참조 우선. 새 패턴 도입 시 사용자 승인 |
| 기존 결과 보존 | 기존 기능·동작·UI 외형 왜곡/축소/변형 금지. 영향 분석 선행 |
| 패턴 최우선 | 워크스페이스 패턴 동일 적용, 역할/책임 경계 명확, 비대화 방지 |

---

## 📏 네이밍 규칙

| 대상 | 규칙 | 예시 |
|------|------|------|
| 컴포넌트 | PascalCase | `ProjectCard.tsx` |
| 훅 | use 접두사 + camelCase | `useAuth.ts` |
| 유틸 | camelCase | `formatDate.ts` |
| 타입/인터페이스 | PascalCase | `User`, `ProjectDto` |
| 상수 | UPPER_SNAKE_CASE | `DEFAULT_PAGE_SIZE` |
| 스토어 | kebab-case + `.store.ts` | `tab.store.ts` |

> 레포 특화 네이밍 (DB 테이블, NestJS 클래스): `project.instructions.md` 참조

### 디렉토리-파일 명명 규칙

디렉토리 하위 컴포넌트는 디렉토리명을 파일명 prefix로 사용하지 않음:
- ✅ `editor/Toolbar.tsx` — ❌ `editor/EditorToolbar.tsx`
- 예외: 동일 디렉토리 내 유사 컴포넌트 구분 필요 시 (사용자 승인 필요)

---

## 📁 레이어 아키텍처

```
pages → templates → common → ui
  ↓
hooks → lib/api → stores
```

- 상위 → 하위만 참조 가능. 역방향·순환 참조 금지

---

## 🎨 UI 디자인 규칙

> 세부 디자인 값: 각 도메인의 `docs/*/design/design-system.md` 참조

- **요청한 것만 생성**: 컨트롤 요청 시 컨트롤만 생성, 요청하지 않은 컨테이너 래핑 금지
- **컨트롤 높이 표준**: `h-control-h` (36px) 기본
- **폰트 표준**: 전역 정의(`tailwind.config.js`) 상속. 개별 폰트 정의 금지
  - 허용: `font-sans` (기본, 생략 가능), `font-mono` (코드)
  - 예외: `// design/font-override` 주석 + 사용자 승인

---

## ✅ Export 규칙

```typescript
// ✅ 명시적 re-export
export { Button } from './Button';
export type { ButtonProps } from './Button';

// ❌ 와일드카드 export 금지
export * from './components';
```

---

## 🚫 금지 사항 (12개)

1. 와일드카드 export (`export * from`)
2. `any` 타입 사용 — `unknown` 또는 구체적 타입
3. 역방향 의존성 — ui→pages, packages→apps
4. 미사용 코드 커밋
5. 불필요한 추상화 (BaseService 등)
6. 문서 업데이트 없이 코드만 커밋
7. 추정/추측으로 판단 — 증거 없이 "~일 것 같음"
8. 요청하지 않은 컨테이너 래핑
9. 디렉토리명 prefix 파일명 — `editor/EditorToolbar.tsx`
10. 무조건적 수용/긍정 — 기술적 타당성 검증 필수
11. 기존 기능·동작·UI 외형 왜곡/축소/변형
12. 비대 모듈 — 역할/책임 경계 무시

> 레포 특화 금지 사항: `project.instructions.md` 참조

---

## ✅ 작업 완료 조건

- [ ] 코드 변경 완료 + 린트/빌드 오류 없음
- [ ] 관련 문서 Changelog 업데이트
- [ ] Dead Code·any 타입 없음
- [ ] 4단계 검증 통과 (⚡ 빠른 참조 섹션 명령어)
- [ ] 기능별 필수 문서 존재 (아래 표 참조)

### 기능별 필수 문서

| 기능 유형 | 위치 |
|----------|------|
| 주요 컴포넌트 | `docs/[domain]/explanation/architecture/` |
| 비즈니스 로직 | `docs/[domain]/explanation/domain/` |
| UI 패턴/시스템 | `docs/[domain]/explanation/design/` |
| API 엔드포인트 | `docs/[domain]/reference/api/` (자동생성) |

---

## 📝 커밋 메시지 규칙

```
<type>(<scope>): <subject>
```

| Type | 설명 | Scope 예시 |
|------|------|-----------|
| feat | 새 기능 | server, web-pms, web-dms |
| fix | 버그 수정 | database, types |
| docs | 문서 변경 | docs, .github |
| style | 포맷팅 | — |
| refactor | 리팩토링 | — |
| perf | 성능 개선 | — |
| test | 테스트 | — |
| build | 빌드 설정 | — |
| ci | CI 설정 | — |
| chore | 기타 | — |
| revert | 커밋 되돌리기 | — |

> `commitlint.config.mjs`로 커밋 메시지 자동 검증됩니다.

---

## 📖 문서 관리

> **상세 규칙**: `.github/instructions/docs.instructions.md` 참조

- **Diátaxis 4분류**: tutorials/ | guides/ | reference/ (자동생성) | explanation/
- **reference/ 폴더**: 자동 생성 전용, 직접 수정 금지 (`pnpm docs:all`)
- 코드 변경 → 관련 문서 수정 + Changelog 필수

---

## 멀티 에이전트 규칙 동기화

| 에이전트 | 정본/미러 | 위치 |
|---------|----------|------|
| GitHub Copilot | 정본 | `.github/copilot-instructions.md`, `.github/instructions/` |
| Codex CLI | 미러 | `.codex/instructions/` |
| Claude Code | 미러 | `CLAUDE.md`, `apps/web/dms/CLAUDE.md` |

변경 프로세스: 정본(.github/) 먼저 → Codex/Claude 미러 반영 → `node .codex/scripts/verify-codex-sync.js`

---

## 📚 상세 규칙 참조

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
| 2026-03-15 | 리팩토링: .env 설정/테스트 계정 추가, DB 스키마 접두사 규칙 추가, NestJS DatabaseService 패턴 추가, SDD 프로토콜→workflow.instructions.md 위임, 백로그/품질체크→per-path instructions 위임 |
| 2026-03-10 | 🔄 구조 개선: SDD 프로토콜→workflow.instructions.md, 문서 관리→docs.instructions.md 분리. 1190줄→~370줄 |
| 2026-03-10 | ⚡ 개발 빠른 참조, 🏗️ 핵심 아키텍처 패턴 추가 |
| 2026-02-27 | 핵심 원칙 3개 추가 (비판적 수용, 기존 결과 보존, 패턴 최우선), 멀티 에이전트 동기화 |
| 2026-02-06 | SDD 실행 프로세스, 문서화 매핑, 4단계 검증, Diátaxis 하이브리드 구조 |
| 2026-02-05 | 점검 우선 원칙, 문서 역할 구분, 불확실성 명시/Gate 시스템 |
