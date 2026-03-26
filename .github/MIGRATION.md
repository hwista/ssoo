# SDD Framework 마이그레이션 가이드

> AI가 새 레포에 Spec-Driven Development 프레임워크를 세팅할 때 참고하는 문서

---

## 개요

이 문서는 `.github/agents/`와 `.github/prompts/core/`를 다른 프로젝트로 마이그레이션할 때 필요한 모든 정보를 담고 있습니다.

### 대상 독자
- 새 프로젝트에 SDD 프레임워크를 세팅하려는 **AI 에이전트**
- 마이그레이션을 수행하는 **개발자**

---

## 0. 부트스트랩 (빈 폴더에서 시작)

### 🚀 Quick Start

**새 레포 생성 후 AI에게 이 한마디로 시작:**

```
.github/ 폴더의 MIGRATION.md를 참고해서 SDD 프레임워크를 세팅해줘.
프로젝트: [프로젝트명]
기술 스택: [백엔드], [프론트엔드], [DB]
```

### 부트스트랩 순서

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Step 0: .github/ 폴더에서 시작                                          │
│          └── MIGRATION.md (이 문서)                                      │
│                  ↓                                                       │
│  Step 1: Tier 1 복사                                                     │
│          ├── agents/ (그대로)                                            │
│          └── prompts/core/ (그대로)                                      │
│                  ↓                                                       │
│  Step 2: Tier 3 작성 (프로젝트 특화)                                      │
│          ├── copilot-instructions.md                                     │
│          └── instructions/*.instructions.md                              │
│                  ↓                                                       │
│  Step 3: 검증 스크립트 세팅                                               │
│          ├── scripts/check-patterns.js (코드 패턴)                        │
│          └── scripts/check-docs.js (문서 규칙)                            │
│                  ↓                                                       │
│  Step 4: Git Hooks & CI                                                  │
│          ├── husky + lint-staged                                         │
│          └── .github/workflows/pr-validation.yml                         │
│                  ↓                                                       │
│  Step 5: 문서 구조 생성                                                   │
│          └── docs/ (Diátaxis 기반)                                       │
│                  ↓                                                       │
│  ✅ Ready! 이제 기능 개발 시작                                            │
└─────────────────────────────────────────────────────────────────────────┘
```

### 최소 구성 (Essential Files)

새 프로젝트에서 **반드시 필요한 파일**:

```
.github/
├── MIGRATION.md              # ← 이 문서 (복사 시작점)
├── copilot-instructions.md   # ← Step 2에서 작성
├── agents/                   # ← Step 1에서 복사
│   ├── common-workflow.md
│   ├── orchestrator.agent.md
│   ├── planner.agent.md
│   ├── architect.agent.md
│   ├── dba.agent.md
│   ├── developer.agent.md
│   ├── tester.agent.md
│   ├── security.agent.md
│   └── reviewer.agent.md
├── prompts/
│   └── core/                 # ← Step 1에서 복사
│       ├── analyze.prompt.md
│       ├── feature-dev.prompt.md
│       ├── feature-spec.prompt.md
│       ├── impl-plan.prompt.md
│       ├── refactor.prompt.md
│       ├── review.prompt.md
│       └── tasks.prompt.md
└── instructions/             # ← Step 2에서 작성
    └── (경로별 규칙)

scripts/
├── check-patterns.js         # ← Step 3에서 생성
└── check-docs.js             # ← Step 3에서 생성

docs/
└── (Diátaxis 구조)            # ← Step 5에서 생성
```

---

## 1. 마이그레이션 요약

### 파일 분류

| Tier | 폴더/파일 | 작업 | 설명 |
|------|----------|------|------|
| **Tier 1** | `agents/` | 그대로 복사 | 범용 에이전트 (수정 불필요) |
| **Tier 1** | `prompts/core/` | 그대로 복사 | 범용 프롬프트 (수정 불필요) |
| **Tier 2** | `prompts/[project]/` | 새로 작성 | 기술 스택 특화 프롬프트 |
| **Tier 3** | `copilot-instructions.md` | 새로 작성 | 프로젝트 전역 규칙 |
| **Tier 3** | `instructions/` | 새로 작성 | 경로별 상세 규칙 |

### prompts/ 폴더 구조

```
prompts/
├── core/                    # Tier 1: 범용 (그대로 복사)
│   ├── analyze.prompt.md      # 코드베이스 분석
│   ├── feature-dev.prompt.md  # 기능 개발 통합
│   ├── feature-spec.prompt.md # 기능 명세 작성
│   ├── impl-plan.prompt.md    # 구현 계획 수립
│   ├── refactor.prompt.md     # 리팩토링
│   ├── review.prompt.md       # 코드 검토
│   └── tasks.prompt.md        # 태스크 분해
│
└── [project]/               # Tier 2: 프로젝트 특화 (새로 작성)
    ├── api-design.prompt.md   # API 설계 (프로젝트 패턴)
    ├── component-design.prompt.md  # 컴포넌트 설계
    ├── db-migration.prompt.md # DB 마이그레이션
    ├── new-table-checklist.prompt.md # 테이블 생성
    └── test-generation.prompt.md # 테스트 생성
```

**Tier 1 (core/)**: 기술 스택에 무관한 워크플로우 프롬프트
- 경로는 `[backend-path]`, `[frontend-path]` 등 플레이스홀더 사용
- `copilot-instructions.md`에서 실제 경로 참조

**Tier 2 ([project]/)**: 프로젝트 기술 스택 특화
- 구체적인 프레임워크 패턴 (NestJS, Next.js 등)
- 프로젝트 코딩 표준 반영
- 예시: `myproject/`, `acme-app/`

---

## 2. Step-by-Step 마이그레이션

### Step 1: Tier 1 파일 복사

```bash
# 새 레포의 .github 폴더 생성
mkdir -p [new-repo]/.github/prompts

# 에이전트 복사 (수정 없이 그대로)
cp -r .github/agents/ [new-repo]/.github/agents/

# 범용 프롬프트 복사 (수정 없이 그대로)
cp -r .github/prompts/core/ [new-repo]/.github/prompts/core/
```

### Step 2: copilot-instructions.md 작성

아래 템플릿을 기반으로 프로젝트에 맞게 작성:

```markdown
# [프로젝트명] - GitHub Copilot 전역 가이드라인

> 이 파일은 GitHub Copilot이 코드 생성/수정 시 **항상** 참조하는 전역 규칙입니다.

---

## 프로젝트 개요

| 항목 | 값 |
|------|-----|
| **프로젝트명** | [프로젝트명] |
| **목적** | [프로젝트 목적] |
| **구조** | [모노레포/단일레포 등] |

---

## 🔴 핵심 원칙 (항상 준수)

### 1. 코드 클렌징 원칙
- **사용되는 코드만 유지** - 미사용 코드는 즉시 삭제
- **불필요한 추상화 제거** - 과도한 레이어 금지
- **미래 기능용 선제작 금지** - YAGNI 원칙
- **일관된 패턴 유지** - 동일 문제는 동일 방식으로

### 2. 문서-코드 동기화
- **코드 변경 → 문서 업데이트 → 커밋** 순서 준수
- 관련 문서의 Changelog 섹션에 변경 내용 추가 필수

### 3. 증거 기반 작업 (추정 금지)
- **모든 발견 사항에 증거 포함** - 파일 경로, 라인 번호
- **"~로 보임", "~일 것 같음" 금지** → 확인된 사실만
- **확신 없으면 "확인 필요"로 표기**
- **영향 범위 명시** - 수정 시 영향받는 파일 목록

### 4. 승인 프로세스

| 작업 | AI | 사용자 |
|------|-----|------|
| 점검/분석 | ✅ 수행 | 결과 확인 |
| 브리핑/제안 | ✅ 수행 | 검토 |
| **삭제/변경 결정** | 판단 제시 | 🔒 **최종 승인** |
| **실행** | ⏸️ 대기 | 🔒 **컨펌 후 지시** |

### 5. 기존 코드 기반 일관성 유지
- 새 코드 작성 시 **기존 코드베이스를 먼저 참조**
- 스타일, 구조, 네이밍이 **기존 코드와 일치**해야 함
- **새 패턴 도입 시**: 기존 패턴 대비 장점 명시 + 사용자 승인 필요

### 6. 불확실성 명시 (추측 금지)
정보가 부족할 때 **추측하지 말고 명시적으로 표기**:
```
[NEEDS CLARIFICATION: 구체적인 질문]
```
- **최대 3개**만 질문 - 나머지는 합리적 기본값 사용
- **우선순위**: scope > security > UX > technical

### 7. 구현 전 Gate 체크

#### Simplicity Gate
- [ ] 프로젝트/모듈 ≤3개 사용?
- [ ] 미래 기능 선제작 없음?
- [ ] YAGNI 원칙 준수?

#### Anti-Abstraction Gate
- [ ] 프레임워크 직접 사용 (불필요한 래퍼 없음)?
- [ ] 단일 모델 표현 (동일 엔티티 중복 정의 없음)?

---

## 🛠️ 기술 스택

### 백엔드
- [프레임워크], [언어], [ORM]
- [데이터베이스]
- [인증 방식]

### 프론트엔드
- [프레임워크], [언어]
- [UI 라이브러리]
- [상태 관리]

---

## 📏 네이밍 규칙

| 대상 | 규칙 | 예시 |
|------|------|------|
| 컴포넌트 | PascalCase | `UserCard.tsx` |
| 훅 | use 접두사 | `useAuth.ts` |
| 유틸 | camelCase | `formatDate.ts` |
| 상수 | UPPER_SNAKE_CASE | `DEFAULT_PAGE_SIZE` |
| DB 테이블 | [규칙] | [예시] |

---

## 📁 폴더 구조

```
[프로젝트 구조 트리]
```

### 의존성 방향
```
[레이어 의존성 다이어그램]
```

---

## 🚫 금지 사항

1. **any 타입 사용** - unknown 또는 구체적 타입 사용
2. **와일드카드 export** (`export * from`)
3. **미사용 코드 커밋** - Dead Code는 삭제
4. **문서 업데이트 없이 코드만 커밋**
5. **추정/추측으로 판단**

---

## ✅ 작업 완료 조건

- [ ] 코드 변경 완료
- [ ] 관련 문서 Changelog 업데이트
- [ ] 영향 범위 파악 및 테스트
- [ ] Dead Code 없음 확인
- [ ] any 타입 없음 확인
- [ ] 린트/빌드 오류 없음
```

### Step 3: instructions 폴더 작성

#### 파일 형식

```markdown
# [영역명] 개발 가이드라인

> 적용 경로: `[path/**]`

---

## 개요

[이 영역에 대한 설명]

---

## 파일 구조

```
[해당 영역 폴더 구조]
```

---

## 코딩 규칙

### [규칙 카테고리 1]
- [규칙 1]
- [규칙 2]

### [규칙 카테고리 2]
- [규칙 1]

---

## 패턴 예시

### [패턴명]

```[language]
// 예시 코드
```

---

## 금지 사항

- [금지 1]
- [금지 2]

---

## 체크리스트

- [ ] [확인 항목 1]
- [ ] [확인 항목 2]
```

#### VS Code 설정 (`.vscode/settings.json`)

instructions 파일이 특정 경로에 자동 적용되려면:

```json
{
  "github.copilot.chat.codeGeneration.instructions": [
    {
      "file": ".github/instructions/backend.instructions.md",
      "applyTo": "src/backend/**"
    },
    {
      "file": ".github/instructions/frontend.instructions.md",
      "applyTo": "src/frontend/**"
    }
  ]
}
```

### Step 4: 프로젝트 특화 프롬프트 작성

#### 폴더 생성

```bash
mkdir -p [new-repo]/.github/prompts/[project-name]/
```

#### 프롬프트 형식

```markdown
# [프롬프트 제목]

> [프롬프트 목적 한 줄 설명]

---

## 입력

사용자로부터 다음 정보를 받습니다:
- [입력 1]
- [입력 2]

---

## 출력 형식

```[language]
[출력 템플릿]
```

---

## 규칙

1. [규칙 1]
2. [규칙 2]

---

## 예시

### 입력
[예시 입력]

### 출력
[예시 출력]
```

#### 권장 프롬프트 목록

| 프롬프트 | 목적 |
|---------|------|
| `api-design.prompt.md` | API 엔드포인트 설계 |
| `component-design.prompt.md` | UI 컴포넌트 설계 |
| `db-migration.prompt.md` | DB 마이그레이션 작성 |
| `test-generation.prompt.md` | 테스트 코드 생성 |

---

## 3. 에이전트-프롬프트 연결

### 에이전트가 프롬프트를 참조하는 방식

각 에이전트는 관련 프롬프트를 다음과 같이 참조합니다:

```markdown
## 사용 프롬프트

- **스펙 작성**: [prompts/core/feature-spec.prompt.md](../prompts/core/feature-spec.prompt.md)
- **API 설계**: [prompts/[project]/api-design.prompt.md](../prompts/[project]/api-design.prompt.md)
```

### 에이전트별 프롬프트 매핑

| 에이전트 | Tier 1 프롬프트 | Tier 2 프롬프트 |
|---------|---------------|----------------|
| @planner | `feature-spec`, `impl-plan`, `tasks` | - |
| @architect | `impl-plan` | `api-design` |
| @dba | - | `db-migration` |
| @developer | - | `api-design`, `component-design` |
| @tester | - | `test-generation` |
| @reviewer | `analyze` | - |

---

## 4. 프롬프트 변수 규칙

`prompts/core/` 프롬프트는 플레이스홀더 변수를 사용합니다:

| 변수 | 설명 | 예시 |
|------|------|------|
| `[backend-path]` | 백엔드 소스 경로 | `src/server`, `apps/api/src` |
| `[frontend-path]` | 프론트엔드 소스 경로 | `src/client`, `apps/web/src` |
| `[database-path]` | DB/ORM 설정 경로 | `prisma/`, `src/database` |
| `[module-path]` | 모듈 경로 패턴 | `modules/`, `domains/` |
| `[domain]` | 도메인명 | `user`, `project`, `order` |

### 변수 치환 시점

- 프롬프트를 사용할 때 AI가 **프로젝트 구조를 분석**하여 자동 치환
- `copilot-instructions.md`의 폴더 구조 정보를 참고

---

## 5. AI에게 세팅 요청하기

### 세팅 요청 프롬프트 템플릿

새 프로젝트에서 AI에게 다음과 같이 요청하세요:

```
이 프로젝트에 SDD (Spec-Driven Development) 프레임워크를 세팅해주세요.

## 프로젝트 정보
- 프로젝트명: [프로젝트명]
- 목적: [목적]
- 기술 스택:
  - 백엔드: [프레임워크, 언어, ORM, DB]
  - 프론트엔드: [프레임워크, 언어, UI 라이브러리]
- 폴더 구조: [모노레포/단일레포, 주요 폴더]

## 요청사항
1. `.github/agents/`와 `.github/prompts/core/`는 SDD 코어에서 복사해주세요
2. `copilot-instructions.md`를 위 정보 기반으로 작성해주세요
3. 기술 스택에 맞는 `prompts/[project]/` 프롬프트를 작성해주세요
4. 폴더 구조에 맞는 `instructions/` 파일을 작성해주세요

## 참고
MIGRATION.md 가이드를 따라주세요.
```

### 세팅 확인 체크리스트

```markdown
## SDD 프레임워크 세팅 체크리스트

### Tier 1 (복사)
- [ ] `.github/agents/` 폴더 존재
  - [ ] common-workflow.md
  - [ ] orchestrator.agent.md
  - [ ] planner.agent.md
  - [ ] architect.agent.md
  - [ ] dba.agent.md
  - [ ] developer.agent.md
  - [ ] tester.agent.md
  - [ ] security.agent.md
  - [ ] reviewer.agent.md
- [ ] `.github/prompts/core/` 폴더 존재
  - [ ] feature-spec.prompt.md
  - [ ] impl-plan.prompt.md
  - [ ] tasks.prompt.md
  - [ ] analyze.prompt.md

### Tier 2 (작성)
- [ ] `.github/prompts/[project]/` 폴더 존재
  - [ ] api-design.prompt.md (또는 해당 스택용)
  - [ ] component-design.prompt.md
  - [ ] db-migration.prompt.md
  - [ ] test-generation.prompt.md

### Tier 3 (작성)
- [ ] `.github/copilot-instructions.md` 존재
  - [ ] 프로젝트 개요 섹션
  - [ ] 핵심 원칙 7개 섹션
  - [ ] 기술 스택 섹션
  - [ ] 네이밍 규칙 섹션
  - [ ] 폴더 구조 섹션
  - [ ] 금지 사항 섹션
- [ ] `.github/instructions/` 폴더 존재
  - [ ] 백엔드 규칙 (해당시)
  - [ ] 프론트엔드 규칙 (해당시)
  - [ ] 기타 영역별 규칙

### 기타
- [ ] `.github/README.md` 프로젝트에 맞게 수정
- [ ] 에이전트가 정상 호출되는지 테스트
```

---

## 6. 기술 스택별 Tier 2 예시

### JavaScript/TypeScript 생태계

#### 풀스택 (백엔드 + DB)

| 스택 | 프롬프트 |
|------|---------|
| NestJS + Prisma | `nestjs-controller`, `prisma-migration` |
| Express + TypeORM | `express-router`, `typeorm-entity` |
| Next.js + tRPC + Prisma | `trpc-router`, `prisma-migration` |

#### 프론트엔드 전용 / Next.js 기반

| 스택 | 프롬프트 |
|------|---------|
| Next.js (API Routes) | `api-route-design`, `server-action` |
| Next.js (App Router) | `nextjs-page`, `server-component` |
| React + TanStack Query | `react-component`, `tanstack-query` |
| Vue + Pinia | `vue-component`, `pinia-store` |

#### 리치 에디터 / 특수 UI

| 스택 | 프롬프트 |
|------|---------|
| Tiptap | `tiptap-extension`, `editor-plugin` |
| Slate | `slate-plugin`, `editor-config` |
| Monaco Editor | `monaco-config`, `editor-theme` |

### Python 생태계

| 스택 | 프롬프트 |
|------|---------|
| FastAPI + SQLAlchemy | `fastapi-endpoint`, `sqlalchemy-model` |
| Django + DRF | `drf-viewset`, `django-model` |
| Flask + SQLAlchemy | `flask-route`, `sqlalchemy-model` |

### Java/Kotlin 생태계

| 스택 | 프롬프트 |
|------|---------|
| Spring Boot + JPA | `spring-controller`, `jpa-entity` |
| Kotlin + Exposed | `kotlin-route`, `exposed-table` |

### 기타

| 스택 | 프롬프트 |
|------|---------|
| Go + GORM | `go-handler`, `gorm-model` |
| Rust + Diesel | `rust-handler`, `diesel-schema` |

---

## 7. 백엔드/DB 없는 프로젝트 가이드

### 해당 프로젝트 유형

다음과 같은 프로젝트는 별도 가이드를 따릅니다:

| 유형 | 예시 |
|------|------|
| **Next.js (API Routes만)** | DMS처럼 별도 백엔드 서버 없이 API Routes 사용 |
| **파일시스템 기반** | DB 없이 파일로 데이터 관리 |
| **정적 사이트** | 외부 API만 호출, 서버 로직 없음 |
| **프론트엔드 전용** | React/Vue SPA, 백엔드는 별도 서비스 |

### Tier 2 프롬프트 조정

| 풀스택 프롬프트 | 프론트엔드 전용 대체 |
|----------------|---------------------|
| `api-design.prompt.md` | `api-route-design.prompt.md` (Route Handlers) |
| `db-migration.prompt.md` | **제외** 또는 `file-structure.prompt.md` |
| `service-design.prompt.md` | `server-action.prompt.md` |

### 에이전트 체인 조정

```
# 풀스택 체인
@planner → @architect → @dba → @developer → @tester → @reviewer

# 프론트엔드 전용 체인 (DB 없음)
@planner → @architect → @developer → @tester → @reviewer
                 ↑
         파일 구조 설계도 담당
```

**@dba가 해당되지 않는 경우:**
- **파일시스템 기반**: @architect가 파일/폴더 구조 설계 담당
- **외부 API만 사용**: @architect가 API 클라이언트 설계 담당
- **정적 데이터**: 에이전트 체인에서 @dba 생략

### copilot-instructions.md 조정

**제거할 섹션:**
- 기술 스택의 "백엔드" 항목 (또는 "API Routes" 등으로 대체)
- 기술 스택의 "데이터베이스" 항목
- 네이밍 규칙의 "DB 테이블" 규칙

**추가/수정할 섹션:**
```markdown
## 🛠️ 기술 스택

### API Layer
- Next.js API Routes (Route Handlers)
- Server Actions

### 프론트엔드
- Next.js 15.x (App Router), React 19.x
- [UI 라이브러리]
- [상태 관리]

### 데이터 저장
- 파일시스템 기반 / 외부 API / 로컬스토리지
```

### 프롬프트 변수 처리

해당 없는 변수는 다음과 같이 처리:

| 프로젝트 상황 | 변수 | 처리 방법 |
|--------------|------|----------|
| 백엔드 없음 | `[backend-path]` | 해당 변수 사용 프롬프트 제외 |
| DB 없음 | `[database-path]` | 해당 변수 사용 프롬프트 제외 |
| 단일레포 | `[module-path]` | `src/` 등 단순 경로로 대체 |
| API Routes만 | `[backend-path]` | `app/api/` 또는 `src/app/api/`로 대체 |

### 프론트엔드 전용 copilot-instructions.md 템플릿 변형

```markdown
## 📁 폴더 구조

```
src/
├── app/                    # Next.js App Router
│   ├── (main)/            # 메인 레이아웃 그룹
│   ├── api/               # API Routes (Route Handlers)
│   └── layout.tsx
├── components/
│   ├── ui/                # 원자 컴포넌트
│   ├── common/            # 공통 컴포넌트
│   └── pages/             # 페이지별 컴포넌트
├── hooks/                 # 커스텀 훅
├── lib/                   # 유틸리티
├── stores/                # 상태 관리
└── types/                 # 타입 정의
```

### 레이어 의존성

```
app/pages → components/pages → components/common → components/ui
     ↓
   hooks → lib → stores
```

### Server/Client 컴포넌트 규칙

- `app/` 하위 page.tsx, layout.tsx → **Server Component** 기본
- `components/` → 필요시 `'use client'` 명시
- Server → Client 방향으로만 import
```

---

## 8. Tier 2 프롬프트 작성 가이드

Tier 1 (agents, prompts/core)만으로는 프로젝트에서 동작하지 않습니다.
에이전트가 실제로 코드를 생성하려면 **기술 스택에 맞는 Tier 2 프롬프트**가 필요합니다.

### 프롬프트 구조

```markdown
# [기능] 프롬프트

> [한 줄 목적 설명]

---

## 역할 정의

당신은 **[기술 스택] [역할] 전문가**입니다.
[프로젝트명] 프로젝트의 [영역] 표준을 따라 일관된 [산출물]을 생성합니다.

---

## [핵심 개념 1] (예: 응답 표준, 컴포넌트 계층 등)

[코드 예시 또는 규칙]

---

## [핵심 개념 2] (예: 네이밍 규칙, 파일 구조 등)

[코드 예시 또는 규칙]

---

## 코드 패턴

### [패턴 1]

```[language]
// ✅ 표준 패턴 코드
```

### [패턴 2]

```[language]
// ✅ 또 다른 패턴
```

---

## 금지 패턴

```[language]
// ❌ 이렇게 하지 말 것
```
```

### 핵심 포함 요소

| 요소 | 목적 | 예시 |
|------|------|------|
| **역할 정의** | AI가 어떤 전문가로 행동할지 | "NestJS REST API 설계 전문가" |
| **표준 포맷** | 일관된 출력 형식 | 응답 JSON 구조, 컴포넌트 Props |
| **네이밍 규칙** | 파일/함수/변수명 통일 | HTTP 메서드별 엔드포인트 패턴 |
| **코드 패턴** | 복사해서 수정할 수 있는 예시 | Controller, Service, Component 등 |
| **금지 패턴** | 피해야 할 안티패턴 | any 사용, 와일드카드 export |

### 기존 코드 기반 프롬프트 생성

AI에게 다음과 같이 요청하여 자동 생성:

```
이 프로젝트의 기존 코드를 분석해서 prompts/[project]/ 폴더에 들어갈 
기술 스택 특화 프롬프트를 생성해주세요.

분석할 내용:
1. API 엔드포인트 패턴 (Controller, Router)
2. 컴포넌트 작성 패턴 (Props, 스타일링)
3. DB/ORM 사용 패턴 (모델, 마이그레이션)
4. 테스트 작성 패턴 (구조, mock)

각 프롬프트에 포함할 것:
- 역할 정의
- 표준 포맷/구조
- 실제 코드에서 추출한 패턴 예시
- 금지 패턴
```

### 예시: NestJS API 프롬프트 핵심 섹션

```markdown
## 역할 정의

당신은 **NestJS REST API 설계 전문가**입니다.

---

## API 응답 표준

```typescript
// 성공
{ "success": true, "data": { ... } }

// 에러
{ "success": false, "error": { "code": "...", "message": "..." } }
```

---

## Controller 패턴

```typescript
@Controller('projects')
@ApiTags('Projects')
export class ProjectController {
  @Get()
  @ApiOperation({ summary: '목록 조회' })
  async findAll(@Query() query: FindProjectsDto) {
    return this.service.findAll(query);
  }
}
```

---

## DTO 패턴

```typescript
export class CreateProjectDto {
  @ApiProperty({ description: '프로젝트명' })
  @IsString()
  @IsNotEmpty()
  projectName: string;
}
```
```

---

## 9. Tier 3 Instructions 작성 가이드

Instructions는 **특정 경로**에서 작업할 때 자동 적용되는 규칙입니다.

### Instructions vs Prompts 차이

| 구분 | Instructions | Prompts |
|------|-------------|---------|
| **적용 방식** | 경로 기반 자동 적용 | 명시적 호출 |
| **용도** | 코딩 규칙, 패턴 가이드 | 특정 작업 수행 템플릿 |
| **예시** | "이 폴더에서는 이렇게 코딩해" | "API를 설계해줘" |

### Instructions 파일 구조

```markdown
---
applyTo: "[경로 패턴]"
---

# [영역명] 개발 규칙

> 이 규칙은 `[경로]` 경로의 파일 작업 시 적용됩니다.

---

## 폴더 구조

```
[해당 영역 폴더 트리]
```

---

## [패턴 카테고리 1] 패턴 (예: 모듈, 컴포넌트)

```[language]
// ✅ 표준 패턴
[실제 코드 예시]
```

---

## [패턴 카테고리 2] 패턴

```[language]
// ✅ 표준 패턴
[실제 코드 예시]
```

---

## 금지 사항

- ❌ [금지 1]
- ❌ [금지 2]

---

## 체크리스트

- [ ] [확인 항목 1]
- [ ] [확인 항목 2]
```

### 경로 기반 분리 원칙

| 분리 기준 | Instructions 예시 |
|----------|------------------|
| **레이어별** | `backend.instructions.md`, `frontend.instructions.md` |
| **앱별** (모노레포) | `api.instructions.md`, `web.instructions.md`, `mobile.instructions.md` |
| **도메인별** | `auth.instructions.md`, `payment.instructions.md` |
| **기술별** | `database.instructions.md`, `testing.instructions.md` |

### 기존 코드 기반 Instructions 생성

AI에게 다음과 같이 요청:

```
이 프로젝트의 기존 코드를 분석해서 .github/instructions/ 폴더에 들어갈
경로별 개발 규칙을 생성해주세요.

분석할 내용:
1. 폴더 구조 및 파일 배치 패턴
2. 모듈/컴포넌트 작성 패턴
3. 네이밍 컨벤션
4. import/export 패턴
5. 에러 처리 패턴

각 Instructions에 포함할 것:
- applyTo 경로 설정
- 폴더 구조 트리
- 패턴별 코드 예시 (기존 코드에서 추출)
- 금지 사항
- 체크리스트
```

### 예시: 백엔드 Instructions 핵심 섹션

```markdown
---
applyTo: "src/server/**"
---

# 백엔드 개발 규칙

---

## 폴더 구조

```
src/server/
├── modules/
│   └── [domain]/
│       ├── [domain].module.ts
│       ├── [domain].controller.ts
│       ├── [domain].service.ts
│       └── dto/
└── common/
    ├── guards/
    └── filters/
```

---

## Module 패턴

```typescript
@Module({
  imports: [DatabaseModule],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectModule {}
```

---

## Service 패턴

```typescript
@Injectable()
export class ProjectService {
  constructor(private readonly prisma: PrismaService) {}
  
  async findAll(query: FindProjectsDto) {
    // Prisma 직접 사용, 불필요한 추상화 없음
  }
}
```

---

## 금지 사항

- ❌ BaseService 등 불필요한 추상화
- ❌ any 타입
- ❌ console.log (logger 사용)
```

---

## 10. 난개발 방지 시스템 설정

> 문서만으로는 일관성을 100% 보장할 수 없습니다.  
> 아래 설정을 통해 **코드 레벨에서 패턴 위반을 차단**합니다.

### 10.1 필수 패키지 설치

```bash
# husky (pre-commit hooks)
pnpm add -D husky lint-staged

# commitlint (커밋 메시지 검증)
pnpm add -D @commitlint/cli @commitlint/config-conventional

# husky 초기화
pnpm exec husky init
```

### 10.2 package.json 설정

```json
{
  "scripts": {
    "prepare": "husky"
  },
  "lint-staged": {
    "**/*.{ts,tsx}": [
      "eslint --fix",
      "node .github/scripts/check-patterns.js"
    ]
  }
}
```

### 10.3 패턴 검증 스크립트 생성

`scripts/check-patterns.js` 파일 생성:

```javascript
#!/usr/bin/env node
/**
 * 코드 패턴 검증 스크립트
 * pre-commit hook에서 실행
 */

const fs = require('fs');

const RULES = [
  {
    name: 'wildcard-export',
    pattern: /export\s+\*\s+from/g,
    message: '와일드카드 export 금지: 명시적 re-export 사용',
    severity: 'error',
    exclude: ['node_modules', 'dist'],
    filePattern: /\.(ts|tsx|js|jsx)$/,
  },
  {
    name: 'any-type',
    pattern: /:\s*any\b(?!\s*\))/g,
    message: 'any 타입 금지: unknown 또는 구체적 타입 사용',
    severity: 'warning',
    exclude: ['node_modules', 'dist', '*.d.ts'],
    filePattern: /\.(ts|tsx)$/,
  },
  {
    name: 'console-log',
    pattern: /console\.(log|debug|info)\(/g,
    message: 'console.log 잔류: logger 사용 권장',
    severity: 'warning',
    exclude: ['node_modules', 'dist', 'scripts/'],
    filePattern: /\.(ts|tsx|js|jsx)$/,
  },
];

// ... (전체 스크립트는 .github/scripts/sdd-verify.js 또는 프로젝트의 scripts/check-patterns.js 참조)

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('✅ 검증할 파일 없음');
    process.exit(0);
  }
  
  // 파일별 검증 로직
  // 오류 발견 시 exit(1)로 커밋 차단
}

main();
```

### 10.4 ESLint 규칙 추가

프로젝트의 ESLint 설정에 다음 규칙 추가:

```javascript
// eslint.config.mjs 또는 .eslintrc.json
{
  "rules": {
    // any 타입 금지
    "@typescript-eslint/no-explicit-any": "error",
    
    // console.log 경고
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    
    // 와일드카드 export 금지
    "no-restricted-syntax": [
      "error",
      {
        "selector": "ExportAllDeclaration",
        "message": "와일드카드 export 금지: 명시적 re-export 사용"
      }
    ]
  }
}
```

### 10.5 Husky Hooks 설정

`.husky/pre-commit`:

```bash
#!/usr/bin/env sh
pnpm lint-staged
```

`.husky/commit-msg`:

```bash
#!/usr/bin/env sh
npx --no -- commitlint --edit "$1"
```

### 10.6 commitlint 설정

`commitlint.config.mjs`:

```javascript
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [2, 'always', [
      'server', 'web', 'database', 'types', 'docs', 'config'
    ]],
  },
};
```

### 10.7 GitHub Actions PR 검증 (선택)

`.github/workflows/pr-validation.yml` 생성:

```yaml
name: PR Validation

on:
  pull_request:
    branches: [main, develop]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - uses: pnpm/action-setup@v3
        with:
          version: 10
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm exec tsc --noEmit
      - name: Pattern Check
        run: |
          CHANGED=$(git diff --name-only origin/${{ github.base_ref }}...HEAD | grep -E '\.(ts|tsx)$' || true)
          if [ -n "$CHANGED" ]; then
            node .github/scripts/check-patterns.js $CHANGED
          fi
      - name: Docs Check
        run: |
          CHANGED_DOCS=$(git diff --name-only origin/${{ github.base_ref }}...HEAD | grep -E '^docs/.*\.md$' || true)
          if [ -n "$CHANGED_DOCS" ]; then
            node .github/scripts/check-docs.js $CHANGED_DOCS
          fi
```

### 10.7.1 문서 검증 스크립트 생성

`scripts/check-docs.js` 파일 생성 (문서 규칙 자동 검증):

```javascript
#!/usr/bin/env node
/**
 * 문서 검증 스크립트 (Document Linter)
 * 
 * 검증 항목:
 * 1. 파일 네이밍: kebab-case (소문자 + 하이픈)
 * 2. Changelog 섹션: 수동 문서에 필수
 * 3. 문서 위치: 허용된 디렉토리 구조
 * 4. 필수 헤더: 제목 (H1)
 */

const fs = require('fs');
const path = require('path');

const DOCS_ROOT = path.join(__dirname, '..', 'docs');

// 자동 생성 문서 (Changelog 검증 제외)
const AUTO_GENERATED_PATHS = [/\/reference\//, /^CHANGELOG\.md$/];

// 허용된 디렉토리
const ALLOWED_DIRECTORIES = {
  domain: ['architecture', 'design', 'domain', 'guides', 'planning', 
           'tests', 'reference', '_archive'],
  common: ['architecture', 'guides', 'reference'],
};

// 특수 파일 (대문자 허용)
const SPECIAL_FILES = ['CHANGELOG.md', 'AGENTS.md', 'README.md'];

// 파일 네이밍 패턴
const FILE_NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*\.md$/;

function validateFile(filePath) {
  const errors = [];
  const fileName = path.basename(filePath);
  
  // 네이밍 검증
  if (!SPECIAL_FILES.includes(fileName) && !FILE_NAME_PATTERN.test(fileName)) {
    errors.push({ type: 'naming', message: `kebab-case 필요: ${fileName}` });
  }
  
  // 헤더 검증
  const content = fs.readFileSync(filePath, 'utf-8');
  if (!/^#\s+.+/m.test(content)) {
    errors.push({ type: 'header', message: 'H1 제목 필요' });
  }
  
  // Changelog 검증 (수동 문서만)
  if (!SPECIAL_FILES.includes(fileName) && 
      !AUTO_GENERATED_PATHS.some(p => p.test(filePath))) {
    if (!/^##\s*Changelog/m.test(content)) {
      errors.push({ type: 'changelog', message: 'Changelog 섹션 필요', severity: 'warning' });
    }
  }
  
  return errors;
}

// 메인 함수 (전체 스크립트는 프로젝트의 scripts/check-docs.js 참조)
```

### 10.7.2 package.json lint-staged 설정

```json
{
  "lint-staged": {
    "**/*.{ts,tsx}": [
      "eslint --fix",
      "node .github/scripts/check-patterns.js"
    ],
    "docs/**/*.md": [
      "node .github/scripts/check-docs.js"
    ]
  }
}
```

### 10.8 검증 체계 요약

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
│  Layer 4: GitHub Actions PR 검증 (선택)                      │
│  → PR 생성 시 자동 빌드/린트/타입체크/패턴 검증               │
└─────────────────────────────────────────────────────────────┘
```

### 10.9 설정 완료 체크리스트

- [ ] husky, lint-staged, commitlint 설치
- [ ] scripts/check-patterns.js 생성
- [ ] package.json에 lint-staged 설정
- [ ] ESLint 규칙 추가
- [ ] .husky/pre-commit, commit-msg 설정
- [ ] commitlint.config.mjs 생성
- [ ] (선택) GitHub Actions 워크플로우 생성
- [ ] 테스트: 와일드카드 export 코드 커밋 시도 → 차단 확인

### 10.10 GitHub Branch Protection 설정

> 코드 레벨 검증만으로는 100% 방지 불가능. Branch Protection으로 추가 보호.

#### GitHub 웹 UI 설정 방법

1. **Repository → Settings → Branches** 이동
2. **Add branch protection rule** 클릭
3. **Branch name pattern**: `main` (또는 `develop`)

#### 권장 설정

```
✅ Require a pull request before merging
   ✅ Require approvals: 1 (또는 팀 규모에 따라 2)
   ✅ Dismiss stale pull request approvals when new commits are pushed
   ✅ Require review from Code Owners (선택)

✅ Require status checks to pass before merging
   ✅ Require branches to be up to date before merging
   검색하여 추가:
   - "Validate PR" (GitHub Actions job 이름)
   - "Lint"
   - "Type Check"

✅ Require conversation resolution before merging

✅ Do not allow bypassing the above settings
```

#### CODEOWNERS 파일 (선택)

`.github/CODEOWNERS` 생성:

```
# 전체 코드 오너
* @팀장-github-username

# 백엔드 전담
/apps/server/ @백엔드-리드

# 프론트엔드 전담
/apps/web/pms/ @프론트엔드-리드
/apps/web/dms/ @DMS-리드

# 데이터베이스 전담
/packages/database/ @DBA-리드

# 문서 전담
/docs/ @기술-문서-담당자
/.github/ @DevOps-리드
```

#### Branch Protection 설정 체크리스트

- [ ] `main` 브랜치 protection rule 생성
- [ ] `develop` 브랜치 protection rule 생성 (사용 시)
- [ ] PR 필수 + 최소 1명 승인 설정
- [ ] Status checks 필수 설정 (CI 통과 필수)
- [ ] 직접 푸시 차단 설정
- [ ] (선택) CODEOWNERS 파일 생성

#### 검증 레이어 최종 구조

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: 에이전트 필수 참조                                  │
│  → AI가 문서 참조 후 작업                                     │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: Pre-commit Hook (husky + lint-staged)             │
│  → 커밋 시점 린트/패턴 검증                                   │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: ESLint 규칙                                        │
│  → 코드 레벨 규칙 강제                                        │
├─────────────────────────────────────────────────────────────┤
│  Layer 4: GitHub Actions                                     │
│  → PR 생성 시 자동 검증                                       │
├─────────────────────────────────────────────────────────────┤
│  Layer 5: Branch Protection                                  │
│  → PR 필수 + 리뷰어 승인 + CI 통과 필수                       │
├─────────────────────────────────────────────────────────────┤
│  Layer 6: CODEOWNERS (선택)                                  │
│  → 영역별 전문가 리뷰 필수                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 11. AI에게 자동 생성 요청하기

### 전체 세팅 요청 (신규 프로젝트)

```
이 프로젝트에 SDD 프레임워크를 세팅해주세요.

## 프로젝트 정보
- 프로젝트명: [이름]
- 기술 스택: [백엔드], [프론트엔드], [DB]
- 폴더 구조: [구조 설명]

## 작업 순서
1. SDD 코어에서 agents/와 prompts/core/ 복사
2. 기존 코드 분석하여 코딩 패턴 추출
3. copilot-instructions.md 작성
4. prompts/[project]/ 프롬프트 작성
5. instructions/ 규칙 작성

## 참고
MIGRATION.md 가이드를 따라 Tier 2, 3 작성
```

### Tier 2만 요청 (기존 프로젝트에 추가)

```
이 프로젝트의 기존 코드를 분석해서 .github/prompts/[project]/ 폴더에
기술 스택 특화 프롬프트를 생성해주세요.

필요한 프롬프트:
- api-design.prompt.md (백엔드 API 설계)
- component-design.prompt.md (프론트엔드 컴포넌트)
- db-migration.prompt.md (DB 마이그레이션)
- test-generation.prompt.md (테스트 코드)

각 프롬프트에 포함:
- 역할 정의
- 기존 코드에서 추출한 표준 패턴
- 코드 예시
- 금지 패턴
```

### Tier 3만 요청 (기존 프로젝트에 추가)

```
이 프로젝트의 기존 코드를 분석해서 .github/instructions/ 폴더에
경로별 개발 규칙을 생성해주세요.

필요한 Instructions:
- [경로1].instructions.md
- [경로2].instructions.md

각 Instructions에 포함:
- applyTo 경로 설정
- 폴더 구조
- 패턴별 코드 예시
- 금지 사항
- 체크리스트
```

---

## 12. 트러블슈팅

### 에이전트가 인식되지 않을 때

1. `.github/agents/` 경로 확인
2. 파일명이 `*.agent.md` 형식인지 확인
3. VS Code Copilot 확장 재시작

### instructions가 적용되지 않을 때

1. `.vscode/settings.json`에 `applyTo` 설정 확인
2. 경로 패턴이 올바른지 확인 (glob 패턴)
3. 파일명이 `*.instructions.md` 형식인지 확인

### 프롬프트 변수가 치환되지 않을 때

1. `copilot-instructions.md`에 폴더 구조가 명시되어 있는지 확인
2. 변수 형식이 `[variable-name]`인지 확인

### 에이전트가 Tier 2 프롬프트를 찾지 못할 때

1. `prompts/[project]/` 폴더가 존재하는지 확인
2. 에이전트 파일에서 프롬프트 경로 참조 확인
3. 프롬프트 파일명이 `*.prompt.md` 형식인지 확인

### AI가 기존 패턴을 따르지 않을 때

1. Instructions에 충분한 코드 예시가 있는지 확인
2. copilot-instructions.md에 "기존 코드 참조" 원칙이 있는지 확인
3. 금지 패턴이 명확히 정의되어 있는지 확인

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-02-05 | [Added] GitHub Branch Protection 설정 가이드, CODEOWNERS, 6단계 검증 레이어 |
| 2026-02-05 | [Added] 난개발 방지 시스템 설정 가이드 (섹션 10) |
| 2026-02-05 | [Added] Tier 2/3 작성 가이드 (섹션 8, 9) |
| 2026-02-05 | [Added] 프론트엔드 전용 프로젝트 가이드 (섹션 7) - DMS 마이그레이션 대응 |
| 2026-02-05 | [Added] 초기 버전 - 마이그레이션 가이드 작성 |
