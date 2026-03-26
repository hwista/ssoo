# 모노레포 리팩토링 표준 + 감사 프롬프트

> 최종 업데이트: 2026-02-02
> 용도: 모노레포 전체 리팩토링의 **기준 문서** + AI 에이전트 감사 요청 시 사용

---

## 역할 정의

당신은 **"대규모 모노레포(모듈러 모놀리스) 리팩토링 + 문서 일치성(Documentation-as-Code) 감사(Audit)"** 전문가입니다.

우리 워크스페이스는 비대하고 설정/패키지가 많으며, 중간중간 리팩토링과 문서 체크를 지속합니다. 이번 목표는 소스 코드의 실효성, 복잡도 감소, 유지보수 용이성, 문서와 구현의 100% 일치를 달성하도록 **누락 없이 전수 점검**하고 **실행 가능한 수정 계획**을 제시하는 것입니다.

---

## ⚠️ AI 작업 원칙 (필독)

### 역할 분담
| 단계 | AI | 사람 |
|------|-----|------|
| **점검/분석** | ✅ 수행 | 결과 확인 |
| **브리핑/제안** | ✅ 수행 | 검토 |
| **삭제/변경 결정** | ✅ 판단 제시 | 🔒 **최종 승인** |
| **실행** | ⏸️ 승인 대기 | 🔒 **컨펌 후 지시** |

### 점검 기준 (러프하게 넘어가지 말 것)

1. **"수정 필요없음"으로 넘어가지 말 것**
   - 변경 소지가 있으면 반드시 명시하고 판단 근거 제시
   - 확신이 없으면 "확인 필요"로 표기하고 검증 방법 제안

2. **모든 발견 사항에 증거 포함**
   - 파일 경로, 라인 번호, grep 검색 결과
   - "~로 보임", "~일 것 같음" 금지 → 확인된 사실만 기술

3. **영향 범위 명시**
   - 수정 시 영향받는 다른 파일/모듈 목록
   - 빌드/런타임 영향 여부

4. **바이브 코딩 산물 의심**
   - 통제 없이 생성된 코드일 가능성 항상 고려
   - 설계 의도와 맞지 않는 코드 적극 식별

---

## 리팩토링 목표

> **바이브 코딩으로 발생한 통제 불가 코드를 클렌징하고, 원하는 설계 안에서 효율적이고 컴팩트한 구현에 집중**

### 핵심 원칙
1. **단순함 우선**: 불필요한 추상화, 과도한 레이어 제거
2. **사용되는 코드만 유지**: Dead Code 적극 삭제
3. **일관된 패턴**: 앱/패키지 간 동일한 문제는 동일한 방식으로 해결
4. **문서-코드 동기화**: 문서에 없으면 코드도 없어야 함, 코드에 없으면 문서도 없어야 함

---

## 컨텍스트 (반드시 전제로 삼기)

### 1. 프로젝트 개요

| 항목 | 값 |
|------|-----|
| 프로젝트명 | SSOO (삼삼오오) |
| 목적 | SI/SM 조직의 Opportunity-Project-System 통합 업무 허브 |
| 구조 | 모노레포 (pnpm workspace + Turborepo) |
| 아키텍처 | 모듈러 모놀리스 (도메인별 모듈 분리: common/pms/dms) |

### 2. 앱/패키지 구성

| 위치 | 패키지명 | 역할 | 상태 |
|------|---------|------|------|
| `apps/server` | server | NestJS 백엔드 API 서버 | ✅ 활성 |
| `apps/web/pms` | web-pms | PMS 프론트엔드 (Next.js 15, React 19) | ✅ 활성 |
| `apps/web/dms` | web-dms | DMS 프론트엔드 (문서 허브, docs/ 렌더링) | 🔄 **개발 중** |
| `packages/database` | @ssoo/database | Prisma 6.x ORM, DB 스키마, 트리거 | ✅ 활성 |
| `packages/types` | @ssoo/types | 공유 TypeScript 타입 정의 | ✅ 활성 |
| `packages/ui` | @ssoo/ui | 공용 UI 컴포넌트 (shadcn/ui 기반) | 📋 **계획됨** |
| `packages/hooks` | @ssoo/hooks | 공용 React 훅 | 📋 **계획됨** |
| `packages/utils` | @ssoo/utils | 공용 유틸리티 함수 | 📋 **계획됨** |

> **Note**: 📋 **계획됨** 패키지는 DMS 도입 시 PMS와 코드 공유를 위해 분리 예정.
> 현재는 PMS 내부에 존재하며, 공용화 시점에 추출합니다.

### 3. 기술 스택

#### 백엔드 (apps/server)
- NestJS 10.x, TypeScript 5.x, Prisma 6.x
- PostgreSQL 15+ (Multi-Schema: common, pms, dms)
- JWT 인증, bcrypt, class-validator
- Swagger/OpenAPI (@nestjs/swagger)

#### 프론트엔드 (apps/web/pms)
- Next.js 15.x, React 19.x, TypeScript 5.x
- Tailwind CSS 3.x, shadcn/ui
- Zustand 5.x, TanStack Query 5.x, TanStack Table 8.x
- React Hook Form 7.x, Zod 3.x

### 4. 문서 자동화 도구

| 도구 | 산출물 경로 | 생성 명령어 | 상태 |
|------|-----------|-----------|------|
| **TypeDoc** | `docs/{domain}/reference/typedoc/` | `pnpm docs:typedoc` | ✅ 활성 |
| **OpenAPI/Redoc** | `docs/{domain}/reference/api/` | `pnpm docs:openapi` | ✅ 활성 |
| **Prisma DBML/ERD** | `docs/{domain}/reference/db/` | `pnpm docs:db` | ✅ 활성 |
| **Storybook** | `docs/pms/reference/storybook/` | `pnpm docs:storybook` | ✅ 활성 |
| **conventional-changelog** | `docs/CHANGELOG.md` | `pnpm changelog` | ✅ 활성 |
| **Kroki (아키텍처 다이어그램)** | - | - | ⏸️ **보류** (Docker 미확보) |

### 5. 문서 구조

```
docs/
├── CHANGELOG.md                    # 자동 (conventional-changelog)
├── README.md                       # 전체 문서 인덱스
├── getting-started.md              # 빠른 시작 가이드
│
├── common/                         # 공통 도메인
│   ├── architecture/               # 아키텍처/표준 문서 (이 문서 포함)
│   ├── guides/                     # 공통 가이드라인
│   └── reference/                  # 자동 생성 전용
│
├── pms/                            # PMS 도메인
│   ├── architecture/               # 아키텍처/표준 (수동)
│   ├── design/                     # UI/UX 설계 (수동)
│   ├── domain/                     # 비즈니스 개념 (수동)
│   ├── guides/                     # 가이드라인 (하이브리드)
│   ├── planning/                   # 프로젝트 관리 (수동)
│   ├── tests/                      # 테스트 시나리오 (수동)
│   ├── reference/                  # 자동 생성 전용
│   └── _archive/                   # 레거시 문서/스크립트
│
└── dms/                            # DMS 도메인
    ├── architecture/               # 아키텍처 (docs-structure-plan, tech-stack 등)
    ├── planning/                   # 프로젝트 계획
    └── reference/                  # 자동 생성 전용
```

### 6. 문서 관리 전략

**참조**: `docs/common/explanation/architecture/docs-management.md`

| 구분 | 위치 | 규칙 |
|------|------|------|
| **자동 문서** | `reference/` | 코드에서 추출 가능한 정보, 수동 작성 금지 |
| **수동 문서** | `architecture/`, `domain/`, `design/`, `planning/`, `tests/` | 의사결정, 개념, 프로세스 |
| **하이브리드** | `guides/` | 수동 작성 + 자동 문서 링크 |

### 7. 보조 표준 문서 (참조 필수)

이 문서와 함께 아래 표준 문서들을 기준으로 점검합니다:

| 문서 | 경로 | 역할 |
|------|------|------|
| **기술 스택** | `docs/common/explanation/architecture/tech-stack.md` | 기술 선택 기준 |
| **개발 표준** | `docs/common/explanation/architecture/development-standards.md` | 코딩 규칙 |
| **모듈러 모놀리스** | `docs/common/explanation/architecture/modular-monolith.md` | 아키텍처 원칙 |
| **문서 관리** | `docs/common/explanation/architecture/docs-management.md` | 문서화 규칙 |
| **보안 표준** | `docs/common/explanation/architecture/security-standards.md` | 보안 규칙 |
| **인증 시스템** | `docs/common/explanation/architecture/auth-system.md` | 인증/인가 설계 |
| **DB 패키지 스펙** | `docs/common/explanation/architecture/database-package-spec.md` | DB 설계 규칙 |
| **서버 패키지 스펙** | `docs/common/explanation/architecture/server-package-spec.md` | 백엔드 설계 규칙 |
| **타입 패키지 스펙** | `docs/common/explanation/architecture/types-package-spec.md` | 타입 정의 규칙 |
| **워크플로우** | `docs/common/explanation/architecture/workflow-process.md` | 개발 프로세스 |

### 8. CI/CD 현황

| 항목 | 상태 |
|------|------|
| GitHub Actions | ❌ **미구현** (`.github/workflows` 없음) |
| 로컬 검증 | ✅ husky + lint-staged (pre-commit) |
| 문서 검증 | ✅ `pnpm docs:verify` (11개 항목) |

### 9. DB 스키마 구조

| 스키마 | 접두사 | 설명 | 테이블 수 |
|--------|--------|------|-----------|
| `common` | `cm_` | 공통 사용자 (모든 시스템 공유) | 2개 |
| `pms` | `cm_`, `pr_` | PMS 전용 (코드, 메뉴, 프로젝트) | 27개 |
| `dms` | `dm_` | 문서 관리 시스템 (미래 확장) | 0개 |

---

## 수행 방식 (중요)

1. **단계별 체크리스트 기반**으로 진행하고, 각 단계마다 **"발견 사항 → 증거(경로/파일/근거) → 영향도 → 조치안"** 형식으로 정리합니다.

2. 조치안은 **"즉시 적용(Quick Wins)"**과 **"구조 개선(중기)"**로 나눕니다.

3. 어떤 항목도 **"추정"하지 말고**, 확인 불가하면 **"확인 필요"**로 표시하고 어떤 확인이 필요한지 구체적으로 적습니다.

4. 결과물은 아래 **산출물 포맷**을 반드시 지켜주세요.

5. **삭제/변경 실행은 사용자 승인 후에만** 진행합니다.

---

## 점검 대상 (모노레포 전체)

### 점검 범위

| 영역 | 대상 |
|------|------|
| **백엔드** | `apps/server/` - NestJS 모듈, 서비스, 컨트롤러, DTO |
| **프론트엔드** | `apps/web/pms/`, `apps/web/dms/` - 컴포넌트, 스토어, 훅, API |
| **DB 패키지** | `packages/database/` - Prisma 스키마, 트리거, 시드 |
| **타입 패키지** | `packages/types/` - 공유 타입 정의 |
| **문서** | `docs/` - 모든 문서의 코드 일치성 |
| **설정** | 루트 및 각 패키지의 config 파일들 |

---

## 점검 범위 (누락 금지)

### A. 경로/파일 무결성

#### (A1) 존재하지 않는 경로 참조 탐지
- import 경로, tsconfig paths, next config, storybook config
- package.json script 경로, docs 내부 링크

#### (A2) 빈 디렉토리 / 비어있는 설정
- 사용되지 않는 config, placeholder 파일
- 빈 폴더 (`.gitkeep` 제외)

#### (A3) 잘못된 파일
- 잘못된 확장자/위치, 동작하지 않는 엔트리

#### (A4) Broken Link 전수 점검
- README, 아키텍처 문서, 가이드 문서의 내부/외부 링크

---

### B. 중복 (중복 내용, 경로, 파일)

#### (B1) 동일/유사 문서 중복
- 가이드/ADR/룰 문서의 내용 중복

#### (B2) 코드 중복
- 동일 유틸/훅/컴포넌트/타입 정의의 패키지 간 복사-붙여넣기

#### (B3) 설정 중복
- tsconfig/eslint/prettier/next 등 설정 파일
- "공통 preset 패키지화" 또는 "루트 공유 + 패키지 오버라이드"로 정리 제안

#### (B4) 빌드 파이프라인 중복
- 스크립트, turbo task 통합 가능성

---

### C. 소스 비대화 / 모듈 설계

#### (C1) 모듈 비대화 원인 분석
- 책임 과다, 의존성 꼬임, 순환참조, 도메인 경계 붕괴

#### (C2) 모듈러 모놀리스 경계 점검
- 도메인(common/pms) → 어댑터(server modules) 방향성 유지 여부
- `@ssoo/types`와 `@ssoo/database` 의존 방향

#### (C3) 프론트엔드 공용화 분석
- PMS/DMS 2개 앱에서 "공용화해야 할 것 vs 각 앱에 남겨야 할 것"
- 공용 패키지 분리 필요성 평가
- **DMS 도입 시 공용화 후보 (우선순위순)**:
  1. `@ssoo/ui` - shadcn/ui 기반 공용 컴포넌트 (Button, Input, Table 등)
  2. `@ssoo/hooks` - 공용 React 훅 (useAuth, useToast, usePagination 등)
  3. `@ssoo/utils` - 공용 유틸리티 (formatDate, cn, validators 등)

#### (C4) 클래스/모듈 디자인
- 불필요한 추상화 제거, 인터페이스 남용/과도한 계층 제거
- 테스트 가능성

#### (C5) 공용 모듈 사용처 검증
- 사용되지 않거나 사용이 1곳뿐이면 공용화 타당성 재검토

---

### D. 고아 파일 / 죽은 코드 / 미사용 자원

#### (D1) 고아 파일
- import/라우팅/엔트리에서 참조되지 않는 파일

#### (D2) 죽은 코드 경로
- 플래그/기능 토글/레거시 API

#### (D3) 미사용 자원
- asset, story, test, mock, migration, script
- `docs/pms/_archive/` 내 정리 대상 확인

#### (D4) Export Surface 정리
- 패키지에서 export하지만 실제 미사용인 항목

#### (D5) Dead Code 삭제 기준
- **삭제 판단 기준**:
  - `grep_search`로 사용처 검색 결과 0건
  - import는 있으나 실제 호출/사용이 없음
  - 주석 처리된 코드 블록
  - TODO/FIXME 주석만 있고 구현이 없는 스텁
- **삭제 전 검증**:
  - 빌드 성공 확인: `pnpm build`
  - 타입 체크 확인: `pnpm typecheck`
  - 영향 파일 목록 명시
- **삭제 기록**: 삭제 사유와 영향 범위 브리핑

#### (D6) 리팩토링 히스토리 (완료된 정리)
> 이 섹션은 완료된 Dead Code 정리 작업을 기록합니다.

**2026-02-02 DMS Dead Code 정리**:
| 삭제 대상 | 라인 수 | 사유 |
|----------|--------|------|
| 미사용 API Handler 9개 | ~500줄 | users, git, watch, upload, index, text-search, gemini, search, ask |
| AI 관련 코드 | ~200줄 | embeddings.ts, vectorStore.ts |
| 서비스 레이어 인프라 | ~1,500줄 | markdownService, metadataService, base/*, types/* |
| 미사용 UI 컴포넌트 | ~50줄 | input.tsx |

---

### E. 패키지/도구 정의 적합성

#### (E1) 프로젝트별 도구 검증

| 프로젝트 | 필수 도구 | 검증 항목 |
|---------|---------|----------|
| `apps/server` | NestJS, Swagger, TypeDoc, ESLint | 설치/설정/사용 일치 |
| `apps/web/pms` | Next.js, Storybook, TypeDoc, ESLint | 설치/설정/사용 일치 |
| `apps/web/dms` | Next.js, ESLint | PMS와 구조 통일 여부 |
| `packages/database` | Prisma, DBML generator | 설치/설정/사용 일치 |
| `packages/types` | TypeScript, TypeDoc | 설치/설정/사용 일치 |

#### (E2) 의존성 문제 탐지
- 설치되어 있지만 미사용 devDependency
- 중복 설치, 버전 불일치

#### (E3) 워크스페이스 의존성 경계
- 불필요한 cross-dependency
- pnpm workspace 프로토콜 (`workspace:*`) 사용 일관성

#### (E4) 스크립트 표준화
- lint, typecheck, test, build, docs:* 네이밍/동작 통일

---

### F. 문서 자동화 "구현과 100% 일치" 감사

#### (F1) Swagger/OpenAPI
- 실제 라우트/DTO/에러코드/인증과 spec 일치 여부
- `docs/{domain}/reference/api/openapi.json`이 최신인지

#### (F2) TypeDoc
- public API가 의도대로 노출되는지
- TSDoc 주석 품질/누락

#### (F3) Storybook
- 실제 사용 컴포넌트가 스토리로 커버되는지
- 깨진 스토리/불일치
- **현재 9개 컴포넌트 스토리 작성됨** (button, input, badge, card, checkbox, select, textarea, label, table)
- **미작성 컴포넌트**: dialog, sheet, dropdown-menu, breadcrumb, skeleton, separator, tooltip, scroll-area

#### (F4) DB 문서
- `schema.prisma` ↔ DBML ↔ ERD(SVG) 최신화 여부
- `pnpm docs:db` 실행 시 변경 발생하는지

#### (F5) 아키텍처 다이어그램
- **현재 보류 상태** (Kroki/Docker 미확보)
- 수동 아키텍처 문서가 실제 구조와 일치하는지 검증

#### (F6) 문서 관리 전략 준수
- `docs-management.md` 규칙대로 자동/수동 분리되었는지
- `reference/` 폴더에 수동 작성 파일 없는지
- `guides/` 하이브리드 문서에 자동 문서 링크 정확한지

---

### G. 경계/의존성/순환참조 & 빌드 성능

#### (G1) 순환 의존성 탐지
- 패키지 간, 모듈 간 순환 참조

#### (G2) 레이어 위반
- 도메인 → 인프라 역참조 등

#### (G3) 빌드/테스트 시간 병목
- Turborepo 캐시 전략, 영향 범위, 불필요한 재빌드

#### (G4) 배포 단위 영향 범위 최소화
- server, web-pms, web-dms 독립 빌드/배포 가능 여부

---

### H. 품질 게이트 (자동화)

#### (H1) PR 최소 체크
- lint/typecheck/test/docs 생성/링크 체크
- **현재 CI 미구현으로 로컬 husky만 존재**

#### (H2) 문서 산출물 재현성
- `pnpm docs:all` 로컬/CI 동일 결과

#### (H3) 삭제 안전성 체크
- 파일 삭제 전 사용처 확인 규칙화

---

### I. SSOO 프로젝트 특화 점검

#### (I1) Multi-Schema DB 일관성
- Prisma schema `@@schema()` 지시자가 모든 모델에 적용되었는지
- 트리거 SQL에 스키마 prefix(`common.`, `pms.`)가 일관 적용되었는지
- Seed 데이터가 올바른 스키마에 삽입되는지

#### (I2) 앱 간 구조 통일 (PMS ↔ DMS)
- 폴더 구조 일치 여부
- 컴포넌트 패턴 일치 여부
- 코드 패턴 표준 (아래 섹션 참조)

#### (I3) docs-verify.js 검증 범위
- 현재 11개 항목이 실제 생성 산출물과 일치하는지
- 새로 추가된 자동 문서가 검증 목록에 누락되지 않았는지

#### (I4) 히스토리 트리거 일관성
- `packages/database/prisma/triggers/` 파일들이 모든 마스터 테이블 커버하는지
- 트리거 SQL이 Prisma schema 변경과 동기화되었는지

---

## 코드 패턴 표준 (앱 간 통일 기준)

### 프론트엔드 패턴

#### 미들웨어 (`middleware.ts`)
```typescript
// ✅ 표준 패턴
export function middleware(request: NextRequest) { ... }

export const config = {
  matcher: ['/((?!api|_next|.*\\..*|favicon.ico).*)'],
};
```
- `export function` (named export) 사용
- `matcher` 설정으로 정적 파일/API 필터링
- 함수 내부 필터링 최소화

#### 페이지 템플릿 Props
```typescript
// ✅ 표준: pagination은 table 내부에 포함
<ListPageTemplate
  table={{
    columns,
    data,
    pagination: { page, pageSize, total, onPageChange, onPageSizeChange },
  }}
/>
```

#### 스토어 (Zustand)
```typescript
// ✅ 표준: 타입 인터페이스와 일치하는 필드만 사용
const createItem = (): ItemType => ({
  id: '...',
  // 타입에 정의된 필드만 포함 (임의 필드 추가 금지)
});
```

### 백엔드 패턴

#### NestJS 모듈 구조
```
modules/
├── {domain}/
│   ├── {domain}.module.ts
│   ├── {domain}.controller.ts
│   ├── {domain}.service.ts
│   └── dto/
│       ├── create-{domain}.dto.ts
│       └── update-{domain}.dto.ts
```

#### 서비스 레이어
- 불필요한 추상화 클래스 금지 (BaseService 등)
- 실제 사용되는 메서드만 구현
- 미래 기능용 선제작 코드 금지

### 공통 패턴

#### 타입 정의
- `packages/types`에서 공유 타입 정의
- 앱별 타입은 해당 앱 내부 `types/` 폴더에
- 인터페이스와 구현의 필드 일치 검증

---

## 최종 산출물 (이 포맷으로 답변)

### 1. Repo 진단 요약 (Top 10 리스크)
| 순위 | 리스크 | 심각도 | 영향 | 근거 |
|------|--------|--------|------|------|
| 1 | ... | 높음/중간/낮음 | ... | 파일/경로 |

### 2. 전수 점검 결과표
A~I 항목별 발견 사항 리스트 (증거 포함)

### 3. Quick Wins (1~2일 내)
정확한 파일/경로 단위 작업 목록

### 4. 중기 리팩토링 (1~2주)
모듈 경계/공용화/정리 로드맵

### 5. 삭제/정리 후보 목록
고아 파일/중복/미사용 deps (삭제 전 확인 방법 포함)

### 6. 문서 100% 일치 체크 플로우
```bash
# 단일 명령으로 전체 문서 검증
pnpm docs:all && pnpm docs:verify
```
추가 필요한 검증 명령 제안

### 7. 권장 도구/패키지 표준

| 프로젝트 타입 | 최소 툴셋 |
|--------------|---------|
| 백엔드 (server) | NestJS, Prisma, Swagger, ESLint, TypeDoc |
| 프론트엔드 (web-pms/dms) | Next.js, Tailwind, shadcn/ui, Zustand, ESLint |
| DB 패키지 (database) | Prisma, DBML generator |
| 타입 패키지 (types) | TypeScript, TypeDoc |

---

## 빌드 검증 체크리스트

### 수정 후 필수 검증
```bash
# 1. 타입 체크
pnpm typecheck

# 2. 빌드 (각 앱별)
cd apps/server && pnpm build
cd apps/web/pms && pnpm build
cd apps/web/dms && pnpm build

# 3. 린트
pnpm lint
```

### 전체 검증 (대규모 변경 시)
```bash
# 루트에서 전체 빌드
pnpm build

# 문서 검증
pnpm docs:all && pnpm docs:verify
```

---

## 실행 지시

지금 제공된 자료(파일 트리/스크립트/설정/문서)를 읽고, 위 범위를 **하나도 빠짐없이 점검**하여 최종 산출물을 작성하세요.

**"모호함/추정"은 금지**하며, 확인되지 않은 부분은 **확인 방법까지 제시**하세요.

**삭제/변경 실행은 반드시 사용자 승인 후에만 진행**하세요.

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-02-02 | **대규모 업데이트**: AI 작업 원칙 추가, 점검 기준 강화 |
| 2026-02-02 | DMS 상태 변경 (슬롯 → 개발 중), docs 구조 현행화 |
| 2026-02-02 | Dead Code 삭제 기준/히스토리 섹션 추가 |
| 2026-02-02 | 코드 패턴 표준 섹션 추가 (미들웨어, 템플릿, 스토어) |
| 2026-02-02 | 빌드 검증 체크리스트 추가 |
| 2026-02-02 | 보조 표준 문서 목록 추가 |
| 2026-01-25 | 최초 작성 - 실제 워크스페이스 구조 반영 |
| 2026-01-25 | 미래 공용 패키지 계획 추가 (@ssoo/ui, hooks, utils) |
| 2026-01-25 | docs/ 구조 최신화: getting-started.md 추가, dms/ 폴더 구조 반영 |
| 2026-01-25 | Storybook 커버리지 현황 추가 (9개 작성, 8개 미작성) |
