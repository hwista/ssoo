# 02. 기존 프로젝트 마이그레이션 가이드

> 이미 개발 중인 프로젝트에 SDD Framework를 적용하는 방법

---

## 개요

### 신규 vs 마이그레이션

| 시나리오 | 가이드 |
|----------|--------|
| 빈 폴더에서 시작 | [01-new-project.md](01-new-project.md) |
| **기존 프로젝트에 SDD 적용** | 이 문서 |

### 마이그레이션 원칙

1. **점검 우선** - 현재 코드베이스 상태 파악이 먼저
2. **점진적 적용** - 한 번에 모든 것을 바꾸지 않음
3. **기존 패턴 존중** - SDD 원칙을 기존 코드 스타일에 맞게 적용
4. **품질 수렴 루프** - 100% 달성까지 반복

---

## 마이그레이션 흐름

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 0: 현황 파악                                                      │
│          └── 기존 코드베이스 분석, 기술 스택 확인                         │
│                  ↓                                                       │
│  Phase 1: .github 세팅                                                   │
│          ├── Tier 1 복사 (agents/, prompts/core/)                        │
│          ├── copilot-instructions.md 작성                                │
│          └── instructions/*.md 작성                                      │
│                  ↓                                                       │
│  Phase 2: 검증 체계 구축                                                  │
│          ├── ESLint 규칙 강화                                            │
│          ├── scripts/sdd-verify.js 세팅                                  │
│          └── Git Hooks (husky + lint-staged)                             │
│                  ↓                                                       │
│  Phase 3: 기존 코드 점진적 정리                                           │
│          ├── 와일드카드 export 제거                                       │
│          ├── any 타입 제거                                               │
│          └── Dead Code 제거                                              │
│                  ↓                                                       │
│  Phase 4: 문서 구조 정립                                                  │
│          └── docs/ Diátaxis 구조화                                       │
│                  ↓                                                       │
│  ✅ 마이그레이션 완료 - SDD 워크플로우 시작                                │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 0: 현황 파악

### 0.1 기존 코드베이스 분석

AI에게 요청:

```markdown
@reviewer

## 현황 분석 요청

### 분석 대상
현재 프로젝트 전체

### 분석 항목
1. 기술 스택 식별
2. 폴더 구조 파악
3. 코딩 컨벤션 파악 (기존 패턴)
4. 문제점 식별
   - 와일드카드 export 사용 여부
   - any 타입 사용 현황
   - Dead Code 의심 지점

### 출력 형식
표로 요약 + 상세 목록
```

### 0.2 분석 결과 예시

```markdown
## 분석 결과

### 기술 스택
| 레이어 | 기술 |
|--------|------|
| 백엔드 | Express.js, TypeScript |
| 프론트엔드 | React (CRA), Redux |
| 데이터베이스 | MongoDB, Mongoose |

### 폴더 구조
\`\`\`
src/
├── controllers/
├── models/
├── routes/
├── services/
└── utils/
\`\`\`

### 현재 문제점
| 항목 | 현황 | 심각도 |
|------|------|--------|
| 와일드카드 export | 15개 파일 | 중 |
| any 타입 | 32곳 | 높 |
| 린트 오류 | 47개 | 중 |
```

---

## Phase 1: .github 세팅

### 1.1 코어 파일 선택적 복사

> ⚠️ **중요**: 전체 `.github/`를 복사하면 레포 특화 파일도 포함됩니다.
> **코어만 선택적으로 복사**하세요.

```bash
# 기존 .github가 있으면 백업
[ -d .github ] && mv .github .github.backup

# 새 .github 폴더 생성
mkdir -p .github/prompts

# 코어 파일만 선택적 복사
cp -r [SDD_SOURCE]/.github/scripts .github/
cp -r [SDD_SOURCE]/.github/agents .github/
cp -r [SDD_SOURCE]/.github/prompts/core .github/prompts/
cp -r [SDD_SOURCE]/.github/guides .github/
cp -r [SDD_SOURCE]/.github/templates .github/
cp [SDD_SOURCE]/.github/README.md .github/

# 첫 커밋
git add .github
git commit -m "chore: SDD Framework 코어 추가"
```

### 1.2 코어 vs 레포 특화 파일

| 구분 | 경로 | 복사 방법 |
|------|------|----------|
| ✅ **코어** | `scripts/`, `agents/`, `prompts/core/`, `guides/`, `templates/` | 그대로 복사 |
| 🔶 **레포 특화** | `copilot-instructions.md`, `instructions/`, `prompts/[project]/` | 템플릿에서 생성 |

### 1.3 copilot-instructions.md 작성

**템플릿에서 생성:**

```bash
# 템플릿 복사
cp .github/templates/copilot-instructions/_base.md .github/copilot-instructions.md

# 또는 기술 스택별 템플릿 사용
cp .github/templates/copilot-instructions/typescript-web.md .github/copilot-instructions.md
```

**AI에게 커스터마이징 요청:**

```markdown
@architect

#file:.github/copilot-instructions.md
#file:templates/copilot-instructions/_base.md

## copilot-instructions.md 커스터마이징 요청

### 분석된 기술 스택
[Phase 0 분석 결과 붙여넣기]

### 기존 코딩 컨벤션
[Phase 0에서 파악된 패턴]

### 요청
위 정보를 기반으로 이 프로젝트에 맞게 copilot-instructions.md를 수정해주세요.
기존 패턴을 존중하면서 SDD 원칙을 적용해주세요.
```

### 1.4 instructions/*.md 작성

**템플릿에서 생성:**

```bash
# instructions 폴더 생성
mkdir -p .github/instructions

# 템플릿에서 복사
cp .github/templates/instructions/_base.server.md .github/instructions/server.instructions.md
cp .github/templates/instructions/_base.web.md .github/instructions/web.instructions.md
cp .github/templates/instructions/_base.database.md .github/instructions/database.instructions.md
```

경로별 규칙 파일 커스터마이징:

```markdown
@architect

## instructions 파일 작성 요청

### 프로젝트 구조
[폴더 구조]

### 각 경로별 역할
- src/controllers/: API 컨트롤러
- src/services/: 비즈니스 로직
- ...

### 요청
각 경로에 맞는 .instructions.md 파일을 작성해주세요.

### 형식
---
applyTo: "[경로]/**"
---

# [경로명] 개발 규칙
...
```

---

## Phase 2: 검증 체계 구축

### 2.1 검증 스크립트 확인

```bash
# .github/scripts/에 sdd-verify.js가 있는지 확인
ls .github/scripts/sdd-verify.js

# 실행 테스트
node .github/scripts/sdd-verify.js --quick
```

### 2.2 package.json에 스크립트 추가

```json
"scripts": {
  "sdd:verify": "node .github/scripts/sdd-verify.js",
  "sdd:verify:quick": "node .github/scripts/sdd-verify.js --quick",
  "sdd:verify:report": "node .github/scripts/sdd-verify.js --quick --report"
}
```

### 2.3 ESLint 규칙 강화

```javascript
// eslint.config.mjs 또는 .eslintrc
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "no-restricted-syntax": [
      "error",
      {
        "selector": "ExportAllDeclaration",
        "message": "와일드카드 export 금지. 명시적 re-export를 사용하세요."
      }
    ]
  }
}
```

### 2.2 검증 스크립트 세팅

```bash
# 검증 스크립트 실행
node .github/scripts/sdd-verify.js --quick

# package.json에 추가
"scripts": {
  "sdd:verify": "node .github/scripts/sdd-verify.js",
  "sdd:verify:quick": "node .github/scripts/sdd-verify.js --quick"
}
```

### 2.3 Git Hooks 설정

```bash
# husky 설치
npm install -D husky lint-staged
npx husky init

# pre-commit hook
echo 'npx lint-staged' > .husky/pre-commit

# lint-staged 설정 (package.json)
"lint-staged": {
  "*.{ts,tsx}": [
    "eslint --fix",
    "node .github/scripts/sdd-verify.js --quick"
  ]
}
```

---

## Phase 3: 기존 코드 점진적 정리

### 3.1 우선순위 결정

| 우선순위 | 항목 | 이유 |
|----------|------|------|
| **P0** | 빌드 오류 | 개발 블로킹 |
| **P1** | 와일드카드 export | 트리 쉐이킹, 순환 참조 |
| **P2** | any 타입 | 타입 안정성 |
| **P3** | Dead Code | 유지보수성 |

### 3.2 점진적 수정 프롬프트

```markdown
@developer

#file:prompts/core/refactor.prompt.md

## 리팩토링 요청

### 대상
[파일 또는 폴더]

### 수정 항목
1. 와일드카드 export → 명시적 re-export

### 제약
- 기능 변경 없음
- 기존 public API 유지
- 단계별 수정 (한 파일씩)

### 검증
수정 후 빌드/린트 확인
```

### 3.3 품질 수렴 루프

```
while (sdd-verify 실패) {
  1. 실패 항목 확인
  2. 해당 항목 수정 요청
  3. 수정 후 재검증
}
```

---

## Phase 4: 문서 구조 정립

### 4.1 docs/ 구조 생성

```
docs/
├── README.md              # 문서 허브
├── CHANGELOG.md           # 변경 이력
├── getting-started.md     # 빠른 시작
│
├── common/                # 공통 문서
│   ├── architecture/      # 아키텍처 결정
│   ├── guides/            # 개발 가이드
│   └── reference/         # 자동 생성 참조 (API, DB)
│
└── [domain]/              # 도메인별 문서
    ├── domain/            # 도메인 개념
    │   ├── concepts.md
    │   ├── workflows/
    │   └── actions/
    ├── planning/          # 기획 문서
    │   ├── backlog.md
    │   ├── changelog.md
    │   └── roadmap.md
    └── tests/             # 테스트 문서
```

### 4.2 문서 역할 구분

| 위치 | 역할 | 정본 대상 |
|------|------|----------|
| **`.github/`** | 개발 프로세스 표준 | SDD Framework (방법론) |
| **`docs/`** | 개발 결과물 문서 | 서비스/시스템 (산출물) |

```
.github/ (프로세스 정본)         docs/ (결과물 정본)
┌─────────────────────┐          ┌─────────────────────┐
│ "이렇게 개발한다"   │          │ "이걸 만들었다"     │
│                     │          │                     │
│ - 에이전트 정의    │          │ - 서비스 설명       │
│ - 프롬프트 템플릿  │          │ - API 문서          │
│ - 코딩 규칙       │          │ - 도메인 개념       │
│ - 검증 기준       │          │ - 기술 결정         │
└─────────────────────┘          └─────────────────────┘
        ↓                                 ↓
  어디에든 가져가면              이 프로젝트에서만
  동일 품질 보장                  의미 있음
```

---

## 마이그레이션 체크리스트

### Phase 1 완료 기준

- [ ] `.github/agents/` 복사됨
- [ ] `.github/prompts/core/` 복사됨
- [ ] `.github/copilot-instructions.md` 작성됨
- [ ] `.github/instructions/*.md` 작성됨 (최소 1개)
- [ ] `scripts/sdd-verify.js` 복사됨

### Phase 2 완료 기준

- [ ] ESLint 규칙에 any 금지 추가
- [ ] `node .github/scripts/sdd-verify.js --quick` 실행 가능
- [ ] Git hooks 설정됨

### Phase 3 완료 기준

- [ ] 와일드카드 export 0개
- [ ] 린트 오류 0개
- [ ] 빌드 성공

### Phase 4 완료 기준

- [ ] `docs/README.md` 존재
- [ ] 도메인별 폴더 구조 생성
- [ ] 기존 문서 정리 및 이동

### 최종 검증

```bash
# 전체 검증
node .github/scripts/sdd-verify.js

# 기대 결과: 품질 점수 95% 이상
```

---

## 레거시 코드 리팩토링 전략

### 리팩토링 우선순위

```
1. 브리지 패턴 적용 (기존 코드 감싸기)
   └── 새 코드는 SDD 규칙, 기존 코드는 점진적 수정

2. 신규 기능은 SDD 규칙 100%
   └── 기존 코드는 건드리지 않고 새 패턴으로

3. 기존 코드 수정 시 SDD 규칙 적용
   └── 수정하는 파일만 규칙 적용

4. 전체 리팩토링 (리소스 있을 때)
   └── 모듈 단위로 순차 적용
```

### 리팩토링 프롬프트

```markdown
@developer

#file:prompts/core/refactor.prompt.md

## 레거시 리팩토링

### 대상 모듈
[모듈명/경로]

### 현재 상태
- 패턴: [기존 패턴 설명]
- 문제점: [any 타입 N개, 와일드카드 export M개 등]

### 목표 상태
- SDD 규칙 100% 준수
- 기존 public API 유지

### 단계별 계획
1. 타입 정리 (any → 구체적 타입)
2. export 정리 (와일드카드 → 명시적)
3. Dead Code 제거
4. 문서 업데이트

### 제약
- 기능 변경 없음
- 테스트 통과 유지
- 한 단계씩 커밋
```

---

## 부록: 서브프로젝트 분리 시나리오

> 모노레포의 일부가 독립 저장소로 분리될 때 SDD 적용

### 일반적인 분리 절차

```bash
# 1. 새 저장소 준비
git init [project-name]
cd [project-name]

# 2. 기존 코드 복사 (git subtree 또는 복사)
cp -r [monorepo]/[path-to-app]/* ./

# 3. SDD 코어 복사
mkdir -p .github/prompts
cp -r [SDD_SOURCE]/.github/scripts .github/
cp -r [SDD_SOURCE]/.github/agents .github/
cp -r [SDD_SOURCE]/.github/prompts/core .github/prompts/
cp -r [SDD_SOURCE]/.github/guides .github/
cp -r [SDD_SOURCE]/.github/templates .github/
cp [SDD_SOURCE]/.github/README.md .github/

# 4. 템플릿에서 레포 특화 파일 생성
cp .github/templates/copilot-instructions/_base.md .github/copilot-instructions.md

# 기술 스택에 맞는 config 선택 (기존 설정 파일 백업 후)
# cp -r .github/templates/config/typescript-monorepo/* ./
# cp -r .github/templates/config/typescript-npm/* ./
# cp -r .github/templates/config/python-poetry/* ./
# cp -r .github/templates/config/dotnet/* ./

mkdir -p .github/instructions
# 프로젝트 유형에 맞는 템플릿 선택
cp .github/templates/instructions/_base.web.md .github/instructions/[app].instructions.md

mkdir -p docs
cp -r .github/templates/docs/* ./docs/

# 5. 커스터마이징
# - copilot-instructions.md 수정 (프로젝트 기술 스택)
# - instructions/*.md 수정 (프로젝트 경로)
# - package.json 수정 (프로젝트명, 의존성)

# 6. 모노레포 의존성 제거
# - 내부 패키지 참조 제거 (@myorg/*)
# - workspace 설정 제거

# 7. 검증
node .github/scripts/sdd-verify.js --quick
```

### 분리 검증 체크리스트

```markdown
## 서브프로젝트 분리 검증

### 구조 검증
- [ ] .github/scripts/sdd-verify.js 존재
- [ ] .github/copilot-instructions.md 존재
- [ ] .github/instructions/*.md 존재

### 독립성 검증
- [ ] package.json에 모노레포 내부 의존성 없음
- [ ] import에서 내부 패키지 참조 없음
- [ ] workspace 설정 없음 (단독 실행 가능)

### 빌드 검증
- [ ] 의존성 설치 성공
- [ ] 빌드 성공
- [ ] 린트 성공

### SDD 검증
- [ ] node .github/scripts/sdd-verify.js --quick 통과
```

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-02-05 | 코어 선택적 복사, templates 경로 업데이트, 서브프로젝트 분리 가이드 일반화 |
| [DATE] | 초기 버전 |
|------|----------|
| 2026-02-05 | 초기 버전 - 마이그레이션 가이드 |

