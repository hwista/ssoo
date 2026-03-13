# SSOO 모노레포 - GitHub Copilot 전역 가이드라인

> 이 파일은 GitHub Copilot이 코드 생성/수정 시 **항상** 참조하는 전역 규칙입니다.
> 경로별 상세 규칙은 `.github/instructions/` 폴더를 참조하세요.

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

### 개발 서버

| 앱 | 명령어 | 포트 |
|---|---|---|
| **전체** | `pnpm dev` | - |
| **서버 (NestJS)** | `pnpm dev:server` | 4000 |
| **PMS (Next.js)** | `pnpm dev:web-pms` | 3000 |
| **DMS (Next.js, 독립)** | `pnpm dev:web-dms` | 3001 |

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

> DB URL 기본값: `postgresql://ssoo:ssoo_dev_pw@localhost:5432/ssoo_dev`

### 커밋 전 4단계 검증 (필수)

```bash
node .github/scripts/sdd-verify.js --quick           # 1. SDD 구조 검증
node .github/scripts/check-docs.js --all             # 2. 문서 검증
node .github/scripts/check-patterns.js [파일경로]   # 3. 코드 패턴 검증
node .github/scripts/check-design.js [파일경로]     # 4. 디자인 패턴 검증
```

---

## 🏗️ 핵심 아키텍처 패턴

### PMS: MDI Keep-Alive 탭 (ContentArea)

URL은 항상 `/` 고정. `ContentArea`가 메뉴 path 기반으로 페이지를 동적 로딩.

- 모든 열린 탭을 동시에 마운트 → 비활성 탭은 CSS `display:none` (DOM 유지)
- 새 페이지 추가 시 `src/components/layout/ContentArea.tsx`의 `pageComponents` 맵에 등록

### DMS: 서버 레이어 패턴

```
app/api/[route]/route.ts → server/handlers/*.handler.ts → server/services/*.service.ts
```

- DMS는 npm 독립 프로젝트: `@ssoo/*` 패키지 import 금지

### 패키지 의존성 방향

```
apps/server  ──→  packages/database, packages/types
apps/web/pms ──→  packages/types
apps/web/dms ──→  (독립, @ssoo/* 금지)
```

역방향 참조 및 순환 참조 금지. `packages/`는 `apps/`를 절대 참조하지 않습니다.

---

## ⛔ 필수 프로토콜

> **프로토콜 상세 양식과 템플릿**: `.github/instructions/workflow.instructions.md` 참조
> SDD 키워드 사용 시 해당 파일의 정확한 양식을 출력하세요.

### 요청 해석 원칙

- 사용자 지시 범위만 수행, 임의 확장 금지
- 애매하면 추정 대신 확인 질문
- 과대 해석 금지

### SDD 키워드 시스템

| 키워드 | 실행 내용 |
|--------|----------|
| `SDD 실행` | 전체 6단계: 브리핑 → 작업 → 문서화 → 검증 → 현황 → 커밋 |
| `브리핑 필수` | 작업 시작 브리핑 양식 출력 |
| `문서화` | 문서화 작업 매핑 |
| `검증 실행` | 4단계 검증 스크립트 실행 |
| `진행현황` | 진행 현황 양식 출력 |
| `커밋 전 확인` | 완료 체크리스트 출력 |

### 승인 프로세스

| 작업 | AI | 사용자 |
|------|-----|------|
| 점검/분석 | ✅ 수행 | 결과 확인 |
| 브리핑/제안 | ✅ 수행 | 검토 |
| **삭제/변경 결정** | 판단 제시 | 🔒 **최종 승인** |
| **실행** | ⏸️ 대기 | 🔒 **컨펌 후 지시** |

---

## 🔴 핵심 원칙 (12개)

| # | 원칙 | 핵심 내용 |
|---|------|----------|
| 1 | 코드 클렌징 | 미사용 코드 즉시 삭제, 불필요한 추상화 금지, 미래 기능 선제작 금지 |
| 2 | 문서-코드 동기화 | 코드 변경 → 문서 업데이트 → 커밋. Changelog 필수 |
| 3 | 증거 기반 | 파일 경로·라인번호 명시. "~일 것 같음" 금지 |
| 4 | 승인 프로세스 | 점검 → 분석 → 계획 → 사용자 승인 → 실행 |
| 5 | 점검 우선 | 수정 전 반드시 현재 상태 탐색. "점검 → 분석 → 실행" |
| 6 | 패키지 경계 | apps/ → packages/ 방향만. 역방향/순환 참조 금지 |
| 7 | 기존 코드 일관성 | 기존 패턴 참조 우선. 새 패턴 도입 시 사용자 승인 |
| 8 | 불확실성 명시 | `[NEEDS CLARIFICATION: ...]` 사용 (최대 3개), 나머지는 합리적 기본값 |
| 9 | 구현 전 Gate | Simplicity / Anti-Abstraction / Integration 체크 |
| 10 | 비판적 수용 | 사용자 요청도 기술적 타당성 검증 후 수행. 무조건 긍정 금지 |
| 11 | 기존 결과 보존 | 기존 기능·동작·UI 외형 왜곡/축소/변형 금지. 영향 분석 선행 |
| 12 | 패턴 최우선 | 워크스페이스 패턴 동일 적용, 역할/책임 경계 명확, 비대화 방지 |

### Gate 체크 (복잡한 기능 구현 전)

- **Simplicity**: 모듈 ≤3개? 미래 기능 선제작 없음? YAGNI?
- **Anti-Abstraction**: 불필요한 래퍼 없음? 동일 엔티티 중복 정의 없음?
- **Integration**: API 계약 정의됨? 테스트 시나리오 식별됨?

위반 시 Complexity Tracking 정당화 필수:

| 위반 | 필요 이유 | 더 단순한 대안을 거부한 이유 |
|------|----------|---------------------------|

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
| chore | 기타 | — |

> `commitlint.config.mjs`로 커밋 메시지 자동 검증됩니다.

---

## 🏆 품질 체크포인트

| 도메인 | 검증 방법 | 정의 위치 |
|--------|----------|-----------|
| 파일 명명 | check-patterns.js | instructions/*.md |
| 디렉토리 구조 | check-patterns.js | instructions/*.md |
| 디자인 시스템 | check-design.js | docs/*/design/ |
| 코드 패턴 | check-patterns.js | instructions/*.md |
| 레이어 의존성 | ESLint | instructions/*.md |

### 예외 보고

규칙 위반이 불가피한 경우: 위반 규칙, 파일, 사유, 영향 범위 명시 → 사용자 승인 요청

> 예외 보고 양식: `workflow.instructions.md` 참조

---

## 📊 백로그 우선순위

| 우선순위 | 설명 | 처리 시점 |
|----------|------|----------|
| **IMM** | 배포/보안 차단 | 즉시 |
| **P1** | 핵심 기능 | 다음 스프린트 |
| **P2** | 품질 개선 | 2주 내 |
| **P3** | 추후 개선 | 여유 시 |
| **P4** | 선택적 | 미정 |

---

## 📖 문서 관리

> **상세 규칙**: `.github/instructions/docs.instructions.md` 참조

### 핵심 원칙

- **계층 구조**: 깃헙독스 코어(.github/) → 서비스(.github/instructions/) → 레포독스(docs/)
- **역참조 금지**: 코어→서비스, 깃헙독스→레포독스 참조 불가
- **Diátaxis 4분류**: tutorials/ | guides/ | reference/ (자동생성) | explanation/
- **reference/ 폴더**: 자동 생성 전용, 직접 수정 금지 (`pnpm docs:all`)

### 코드 변경 시 문서 탐색

```bash
grep -r "[함수명|컴포넌트명]" docs/ .github/
```

- 문서 존재 → 수정 + Changelog
- 문서 없음 → Diátaxis 분류 후 신규 생성

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
| 2026-03-10 | 🔄 구조 개선: SDD 프로토콜→workflow.instructions.md, 문서 관리→docs.instructions.md 분리. 1190줄→~370줄 |
| 2026-03-10 | ⚡ 개발 빠른 참조, 🏗️ 핵심 아키텍처 패턴 추가 |
| 2026-02-27 | 핵심 원칙 3개 추가 (비판적 수용, 기존 결과 보존, 패턴 최우선), 멀티 에이전트 동기화 |
| 2026-02-06 | SDD 실행 프로세스, 문서화 매핑, 4단계 검증, Diátaxis 하이브리드 구조 |
| 2026-02-05 | 점검 우선 원칙, 문서 역할 구분, 불확실성 명시/Gate 시스템 |
