# SSOO 모노레포 - Claude Code 가이드

> Claude Code 세션 시작 시 자동 로드되는 전역 규칙입니다.
> 경로별 상세 규칙은 `.github/instructions/` 및 각 서브디렉토리 `CLAUDE.md`를 참조하세요.

---

## 프로젝트 개요

| 항목 | 값 |
|------|-----|
| 구조 | pnpm workspace + Turborepo |
| 앱 | `apps/server` (NestJS), `apps/web/pms` (Next.js), `apps/web/dms` (Next.js, npm 독립) |
| 공유 패키지 | `packages/database` (Prisma), `packages/types` |
| 아키텍처 | 모듈러 모놀리스 (도메인별 모듈 분리: common/pms/dms) |

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

## 금지 사항 (12개)

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

---

## 커밋 메시지 형식

```
<type>(<scope>): <subject>
```

- **Type**: `feat` | `fix` | `docs` | `style` | `refactor` | `perf` | `test` | `chore`
- **Scope**: `server` | `web-pms` | `web-dms` | `database` | `types` | `docs`

---

## 빌드 & 검증 명령

| 용도 | 명령어 |
|------|--------|
| 타입 체크 | `npx tsc --noEmit` (앱별) 또는 `pnpm build` |
| 린트 | `pnpm lint` |
| 테스트 | `pnpm test` |
| 문서 점검 | `node .github/scripts/check-docs.js` |
| 패턴 점검 | `node .github/scripts/check-patterns.js` |
| 디자인 점검 | `node .github/scripts/check-design.js` |
| Codex 동기화 검증 | `node .codex/scripts/verify-codex-sync.js` |
| Codex preflight | `pnpm run codex:preflight` |

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
