# GitHub Copilot Customization

> AI 에이전트 및 프롬프트 기반 개발 자동화 설정

---

## 개요

이 폴더는 GitHub Copilot Customization을 통해 **Spec-Driven Development (SDD)** 방법론을 적용합니다.

### 핵심 원리

```
스펙 → 검증 → 계획 → 검증 → 실행 → 검증 → 분석 → 핸드오프
```

### 핵심 원칙

1. **점검 우선** - 모든 작업에서 현황 파악이 먼저 ([체크리스트](prompts/core/inspect-first.prompt.md))
2. **품질 수렴 루프** - 100% 달성까지 반복 ([가이드](prompts/core/quality-loop.prompt.md))
3. **정본 = .github** - 이 문서들만으로 프로젝트 빌드 가능

### 문서 역할 구분

| 명칭 | 경로 | 역할 | 정본 여부 | 이식성 |
|------|------|------|----------|--------|
| **깃헙독스 코어** | `.github/` (루트) | 프로세스 **표준** | ✅ 정본 | 100% 이식 |
| **깃헙독스 서비스** | `.github/instructions/` | 서비스별 **규칙** | ✅ 정본 | 레포 특화 |
| **레포독스** | `docs/` | **산출물** 문서 | ✅ 정본 | 레포 특화 |

> **깃헙독스 코어**만 있으면 **어떤 프로젝트든** SDD로 고품질 개발 가능  
> **깃헙독스 서비스**는 이 레포의 서비스별 규칙 (pms, dms, server 등)  
> **레포독스**는 이 프로젝트의 산출물(아키텍처, 도메인)을 설명

### 코어 vs 서비스 문서

```
깃헙독스 코어 (.github/)
├── copilot-instructions.md   # 전역 규칙 (기술 독립)
├── README.md                 # 이 파일
├── agents/                   # 에이전트 정의
├── prompts/core/             # 범용 프롬프트
├── templates/                # 템플릿 (새 프로젝트용)
└── scripts/                  # 검증 스크립트

깃헙독스 서비스 (.github/instructions/)
├── server.instructions.md    # NestJS 백엔드 규칙
├── pms.instructions.md       # PMS 프론트엔드 규칙
├── dms.instructions.md       # DMS 프론트엔드 규칙
├── database.instructions.md  # 데이터베이스 규칙
└── types.instructions.md     # 타입 패키지 규칙
```

**참조 규칙**:
- ✅ 서비스 → 코어 참조 가능 (예: dms.instructions.md → copilot-instructions.md)
- ❌ 코어 → 서비스 참조 금지 (역참조)
- ❌ 깃헙독스 → 레포독스 참조 금지 (역참조)

**이유**: 깃헙독스 코어만으로 새 프로젝트를 빌드할 수 있어야 함

**예외**: 레포독스 **링크(바로가기)**는 허용 (아래 섹션 참조)
- `<!-- SSOO-SPECIFIC-START/END -->` 주석으로 구분
- 내용 의존 금지, 순수 링크만 허용

### 레포독스 바로가기

> 아래 링크는 **이 프로젝트(SSOO)**에만 해당됩니다.
> 새 프로젝트에서는 이 섹션을 프로젝트에 맞게 수정하세요.

<!-- SSOO-SPECIFIC-START -->
- [시스템 아키텍처](../docs/common/architecture/)
- [도메인 명세](../docs/pms/domain/)
- [API 참조](../docs/common/reference/api/)
<!-- SSOO-SPECIFIC-END -->

---

## 🚀 빠른 시작

> **AI에게 뭐라고 말하면 되나요?**

👉 **[00-quick-start.md](guides/00-quick-start.md)** - 먼저 이것부터 읽으세요!

### 시나리오별 가이드

| 시나리오 | 가이드 |
|----------|--------|
| 빈 폴더에서 새 프로젝트 | [01-new-project.md](guides/01-new-project.md) |
| 기존 레포에 SDD 적용 | [02-migration.md](guides/02-migration.md) |
| 기술 스택 선정 | [03-tech-stack.md](guides/03-tech-stack.md) |
| 팀에 새로 합류 | [04-onboarding.md](guides/04-onboarding.md) |

### 검증

```bash
node .github/scripts/sdd-verify.js --quick  # 빠른 검증
node .github/scripts/sdd-verify.js          # 전체 검증
```

---

## 구조

```
.github/
├── copilot-instructions.md      # 전역 Copilot 지침 (🔶 레포 특화)
│
├── scripts/                      # 🆕 검증 스크립트 (✅ 코어)
│   ├── sdd-verify.js             # SDD Framework 통합 검증
│   ├── check-patterns.js         # 코드 패턴 검증 (any, export *)
│   └── check-docs.js             # 문서 구조 검증 (Diátaxis)
│
├── agents/                       # 🤖 에이전트 (✅ 코어)
│   ├── common-workflow.md        # 공통 워크플로우 정의
│   ├── orchestrator.agent.md     # 작업 분석 및 에이전트 체인 구성
│   ├── planner.agent.md          # 요구사항 분석 및 스펙 작성
│   ├── architect.agent.md        # 시스템/API 설계
│   ├── dba.agent.md              # 데이터베이스 설계 및 마이그레이션
│   ├── developer.agent.md        # 코드 구현
│   ├── tester.agent.md           # 테스트 설계 및 작성
│   ├── security.agent.md         # 보안 점검
│   └── reviewer.agent.md         # 코드 리뷰 및 문서 검증
│
├── prompts/                      # 📝 프롬프트 템플릿
│   ├── core/                     # ✅ 코어 (범용)
│   │   ├── project-init.prompt.md
│   │   ├── feature-dev.prompt.md
│   │   └── ...
│   └── [project]/                # 🔶 프로젝트 특화
│       └── ...
│
├── instructions/                 # 📋 경로별 인스트럭션 (🔶 레포 특화)
│   └── *.instructions.md
│
├── guides/                       # 📖 가이드 (✅ 코어)
│   ├── 00-quick-start.md         # 🧑 빠른 시작 (먼저 읽기)
│   ├── 01-new-project.md         # 빈 폴더에서 시작
│   ├── 02-migration.md           # 기존 프로젝트 마이그레이션
│   ├── 03-tech-stack.md          # 기술 스택 선정
│   └── 04-onboarding.md          # 새 개발자 온보딩
│
├── templates/                    # 📄 템플릿 (✅ 코어)
│   ├── copilot-instructions/     # copilot-instructions 템플릿
│   │   ├── _base.md              # 기술 독립 공통 원칙
│   │   └── typescript-web.md, dotnet.md, python.md
│   ├── folder-structure/         # 폴더 구조 템플릿
│   ├── instructions/             # 🆕 instructions 템플릿
│   │   ├── _base.server.md
│   │   ├── _base.web.md
│   │   └── _base.database.md
│   ├── config/                   # 🆕 설정 파일 템플릿 (기술 스택별)
│   │   ├── typescript-monorepo/  # pnpm + Turborepo
│   │   ├── typescript-npm/       # npm 단일 레포
│   │   ├── python-poetry/        # Poetry
│   │   └── dotnet/               # .NET Clean Architecture
│   ├── docs/                     # 🆕 docs 초기 구조
│   │   ├── README.md, getting-started.md
│   │   └── CHANGELOG.md
│   └── workflows/                # 🆕 CI/CD 템플릿
│       └── pr-validation.yml
│
└── workflows/                    # 🔶 레포 특화 CI/CD
    └── pr-validation.yml
```

---

## 코어 vs 레포 특화 분류

### ✅ 코어 (100% 이식 가능)

새 프로젝트에 **그대로 복사**하면 됩니다:

| 경로 | 설명 |
|------|------|
| `scripts/` | 검증 스크립트 |
| `agents/` | 역할별 에이전트 |
| `prompts/core/` | 범용 SDD 프롬프트 |
| `guides/` | 프레임워크 가이드 |
| `templates/` | 모든 템플릿 |

### 🔶 레포 특화 (커스터마이징 필요)

템플릿에서 **생성 후 수정**합니다:

| 경로 | 생성 방법 |
|------|----------|
| `copilot-instructions.md` | `templates/copilot-instructions/_base.md` 복사 후 수정 |
| `instructions/` | `templates/instructions/_base.*.md` 복사 후 수정 |
| `prompts/[project]/` | 필요 시 직접 생성 |
| `workflows/` | `templates/workflows/` 복사 후 수정 |

---

## 🚀 코어만 복사해서 새 프로젝트 시작

```bash
# 1. 빈 폴더 준비
mkdir my-project && cd my-project
git init

# 2. 코어만 선택적 복사
mkdir -p .github
cp -r [SDD_SOURCE]/.github/scripts .github/
cp -r [SDD_SOURCE]/.github/agents .github/
cp -r [SDD_SOURCE]/.github/prompts/core .github/prompts/
cp -r [SDD_SOURCE]/.github/guides .github/
cp -r [SDD_SOURCE]/.github/templates .github/
cp [SDD_SOURCE]/.github/README.md .github/

# 3. 템플릿에서 프로젝트 특화 파일 생성
cp .github/templates/copilot-instructions/_base.md .github/copilot-instructions.md

# 기술 스택에 맞는 config 선택
cp -r .github/templates/config/typescript-monorepo/* ./  # 또는 typescript-npm, python-poetry, dotnet

cp -r .github/templates/docs ./docs/

# 4. 커스터마이징
# - .github/copilot-instructions.md 수정 (프로젝트명, 기술 스택 등)
# - .github/instructions/*.md 생성 (경로별 규칙)
# - package.json 수정

# 5. 검증
node .github/scripts/sdd-verify.js --quick
```

👉 **상세 가이드**: [guides/01-new-project.md](guides/01-new-project.md)

---

## 3-Tier 분리 아키텍처

### Tier 1: Universal (100% 이식 가능)
- `agents/` - 역할별 에이전트 정의
- `prompts/core/` - 범용 SDD 프롬프트
- `guides/` - 프레임워크 가이드
- `templates/` - 설정 템플릿

### Tier 2: Tech Preset (기술 스택별)
- TypeScript: `typescript-web.md`, `typescript-monorepo.md`
- .NET: `dotnet.md`, `dotnet-clean.md`
- Python: `python.md`, `python-fastapi.md`

### Tier 3: Repo Specific (레포 고유)
- `copilot-instructions.md` - 프로젝트 전역 규칙
- `instructions/` - 경로별 상세 규칙
- `prompts/[project]/` - 프로젝트 특화 프롬프트

---

## 에이전트 사용법

### 개별 에이전트 호출

채팅에서 `@에이전트명`으로 호출:

```
@planner 사용자 프로필 수정 기능을 기획해주세요
@architect 파일 업로드 API를 설계해주세요
@developer 프로젝트 목록 페이지를 구현해주세요
@reviewer 마지막 커밋을 리뷰해주세요
```

### 오케스트레이터 기반 자동화

복잡한 요청은 오케스트레이터가 적절한 에이전트 체인을 구성:

```
@orchestrator 프로젝트 멤버 관리 기능을 추가해주세요

→ @orchestrator가 분석 후 에이전트 체인 제안:
  @planner → @architect → @dba → @developer → @tester → @reviewer
```

### 🔒 프로토콜 강제 호출

> **중요**: `SDD 실행` 키워드 하나로 전체 프로세스가 실행됩니다.

#### 마스터 키워드: `SDD 실행`

```
@orchestrator SDD 실행. [요청 내용]
```

→ 브리핑 → 확인 → 작업 → 검증 → 진행현황 → 커밋 제안 **전체 프로세스** 자동 실행

#### 부분 실행 키워드

| 키워드 | 실행 단계 | 정의 위치 |
|--------|----------|----------|
| `SDD 실행` | **전체** (1~5단계) | copilot-instructions.md > 마스터 키워드 |
| `브리핑 필수` | 1번만 | copilot-instructions.md > 작업 시작 프로토콜 |
| `검증 실행` | 3번만 | copilot-instructions.md > 검증 실행 순서 |
| `진행현황` | 4번만 | copilot-instructions.md > 작업 완료 프로토콜 |
| `커밋 전 확인` | 5번만 | copilot-instructions.md > 작업 종료 시 필수 출력 |

#### 프로토콜 미이행 시 대응

에이전트가 프로토콜을 따르지 않으면:

```
프로토콜 미이행. copilot-instructions.md의 "SDD 실행" 프로세스 전체를 따라주세요.
```

---

## 🚀 실전 작업 가이드

일상적인 개발 작업에서 사용하는 핵심 프롬프트입니다.

### 1. 새 기능 개발

```markdown
@orchestrator.agent.md

## 작업: [기능명]

### 요구사항
- [스펙 1]
- [스펙 2]

### 참조 (기존 패턴)
- 유사 기능: [기존 파일/모듈]

### 완료 조건
1. ✅ 기능 구현
2. ✅ 기존 패턴과 100% 일치
3. ✅ Dead Code 없음
4. ✅ 문서 업데이트
```

👉 상세: [feature-dev.prompt.md](prompts/core/feature-dev.prompt.md)

### 2. 코드 검증

```markdown
@reviewer.agent.md

## 검토 대상
[파일 경로]

## 검토 기준
1. 기능 동작 정확성
2. 기존 코드 패턴 일치
3. Dead Code 없음
```

👉 상세: [review.prompt.md](prompts/core/review.prompt.md)

### 3. 리팩토링

```markdown
@developer.agent.md

## 리팩토링 대상
[파일/모듈 경로]

## 참조 패턴
[일치시킬 기존 파일]

## 제약
- 기능 변경 없음
- 변경점 최소화
```

👉 상세: [refactor.prompt.md](prompts/core/refactor.prompt.md)

### 단축 프롬프트

| 작업 | 단축 프롬프트 |
|------|-------------|
| 빠른 구현 | `@developer [기능] 구현. 참조: [기존 파일]. 패턴 일치 필수.` |
| 빠른 검증 | `@reviewer [파일] 검토. 패턴 일치 + Dead Code 확인.` |
| 빠른 리팩토링 | `@developer [파일] 리팩토링. [기존 파일] 패턴에 맞춤.` |

---

## 개발 사이클

### 작업 순서 (필수)

```
┌─────────────────────────────────────────────────────────┐
│  1. 코드 작업      →  기능 구현 / 버그 수정 / 리팩토링   │
├─────────────────────────────────────────────────────────┤
│  2. 문서 업데이트  →  관련 문서 Changelog 추가          │
├─────────────────────────────────────────────────────────┤
│  3. 검증          →  린트, 타입체크, 빌드 확인          │
├─────────────────────────────────────────────────────────┤
│  4. 커밋          →  컨벤션에 맞는 커밋 메시지           │
└─────────────────────────────────────────────────────────┘
```

### AI와 협업 시 사이클

```
┌─────────────────────────────────────────────────────────┐
│  1. 기능 개발                                            │
│     @orchestrator → 에이전트 체인 자동 구성              │
├─────────────────────────────────────────────────────────┤
│  2. 결과 검증                                            │
│     @reviewer → 패턴 일치, Dead Code, 문서 동기화 확인   │
├─────────────────────────────────────────────────────────┤
│  3. 리팩토링 (필요시)                                    │
│     @developer → 기존 패턴에 맞춰 수정                   │
├─────────────────────────────────────────────────────────┤
│  4. 반복                                                 │
│     → 일관성 유지, 코드 품질 향상                        │
└─────────────────────────────────────────────────────────┘
```

### 대원칙

> 코드는 항상 **일관적이고 효율적**이며, **불필요한 코드가 없고**, 
> **유지보수와 확장에 용이**하며, **사람이 직접 읽고 수정하기 좋아야** 한다.

---

## 에이전트 체인 예시

### 새 기능 개발

```
@orchestrator
    ↓
@planner        # 스펙 작성
    ↓
@architect      # 시스템 설계
    ↓
@dba            # DB 스키마 (필요시)
    ↓
@developer      # 코드 구현
    ↓
@tester         # 테스트 작성
    ↓
@reviewer       # 최종 리뷰
```

### 버그 수정

```
@developer → @tester → @reviewer
```

### 보안 점검

```
@security → @reviewer
```

---

## 공통 워크플로우

모든 에이전트는 다음 8단계를 따릅니다:

1. **스펙** - 내 직무 범위 정의
2. **검증 ⏸️** - 사용자 확인
3. **계획** - 실행 계획 수립
4. **검증 ⏸️** - 사용자 확인
5. **실행** - 태스크 수행
6. **검증 ⏸️** - 결과 확인
7. **분석** - 이슈 식별
8. **핸드오프** - 다음 에이전트로 전달

---

## 다른 레포로 마이그레이션

### 요약

| Tier | 파일/폴더 | 작업 |
|------|----------|------|
| **Tier 1** | `agents/`, `prompts/core/` | 그대로 복사 |
| **Tier 2** | `prompts/[project]/` | 기술 스택에 맞게 작성 |
| **Tier 3** | `copilot-instructions.md`, `instructions/` | 프로젝트에 맞게 작성 |

👉 **상세 가이드**: [MIGRATION.md](MIGRATION.md)

- copilot-instructions.md 템플릿
- instructions 파일 형식
- 에이전트-프롬프트 연결 규칙
- AI에게 세팅 요청하는 프롬프트
- 기술 스택별 Tier 2 예시
- 세팅 확인 체크리스트

---

## 🛡️ 자동화 검증 시스템

난개발 방지를 위한 다층 검증 체계입니다.

### 검증 레이어

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: 에이전트 필수 참조                                  │
│  → common-workflow.md에서 필수 문서 참조 강제                 │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: Pre-commit Hook (husky + lint-staged)             │
│  → 커밋 시점에 린트 + 패턴 검증                               │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: ESLint 규칙                                        │
│  → any 타입 금지, 와일드카드 export 금지                      │
├─────────────────────────────────────────────────────────────┤
│  Layer 4: GitHub Actions PR 검증                             │
│  → PR 생성 시 자동 빌드/린트/타입체크/패턴 검증               │
└─────────────────────────────────────────────────────────────┘
```

### 강제 규칙

| 규칙 | 검증 시점 | 위반 시 |
|------|----------|--------|
| 와일드카드 export 금지 | ESLint, pre-commit | 커밋 차단 |
| any 타입 금지 | ESLint, pre-commit | 오류 발생 |
| console.log 잔류 | pre-commit | 경고 |
| 모듈 의존성 방향 | ESLint | 오류 발생 |

### 패턴 검증 스크립트

```bash
# 수동 실행
node .github/scripts/check-patterns.js [files...]

# 자동 실행 (pre-commit)
# → lint-staged에 의해 자동 호출
```

---

## 프롬프트 변수 규칙

`prompts/core/` 프롬프트는 다음 변수를 사용합니다:

| 변수 | 설명 | 예시 |
|------|------|------|
| `[backend-path]` | 백엔드 경로 | `apps/server/src` |
| `[frontend-path]` | 프론트엔드 경로 | `apps/web/pms/src` |
| `[database-path]` | 데이터베이스 경로 | `packages/database` |
| `[module-path]` | 모듈 경로 | `modules/pms` |
| `[domain]` | 도메인명 | `project`, `user` |

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-02-06 | 마스터 키워드 `SDD 실행` 도입 - 전체 프로세스 단일 트리거 |
| 2026-02-06 | 에이전트 프로토콜 강제 호출 가이드 추가 (강제 키워드, 미이행 시 대응) |
| 2026-02-05 | 00-quick-start.md 추가 - 사람용 빠른 시작 가이드 (AI에게 뭐라고 말하면 되나요?) |
| 2026-02-05 | 코어 스크립트를 .github/scripts/로 통일 (check-patterns.js, check-docs.js 추가) |
| 2026-02-05 | 작업 완료 프로토콜 순서 수정 (검증→문서 최신화→커밋), 문서 전수 최신화 강조 |
| 2026-02-05 | 작업 완료 프로토콜 추가 (매 작업 후 필수 실행: 문서 업데이트, 커밋 제안, 검증) |
| 2026-02-05 | templates/config/ 기술 스택별 분리 (typescript-monorepo, typescript-npm, python-poetry, dotnet) |
| 2026-02-05 | 코어 범용화 완료 (SSOO 특화 내용 제거) |
| 2026-02-05 | 자동화 검증 시스템 추가 (pre-commit, ESLint, GitHub Actions) |
| 2026-02-05 | 에이전트 필수 참조 섹션 추가 (common-workflow.md) |
| 2026-02-05 | 실전 작업 가이드, 개발 사이클 섹션 추가 |
| 2026-02-05 | 실전 프롬프트 추가 (feature-dev, review, refactor) |
| 2026-02-05 | 초기 버전 - 에이전트 및 프롬프트 구조 정리 |
| 2026-02-05 | 3-Tier 분리 아키텍처 적용 (Universal/Tech Preset/Repo Specific) |
