# 📚 SOOO Documentation Hub

> 프로젝트 전체 문서 허브 - PMS(Project Management System)와 DMS(Document Management System)를 위한 통합 문서 저장소

---

## ⚠️ 문서 역할 구분

| 폴더 | 역할 | 정본 내용 | 이식성 |
|------|------|----------|--------|
| **`.github/` (코어)** | 개발 **프로세스** 표준 | AI 협업, 코드 원칙, 워크플로우 | 100% 이식 |
| **`.github/instructions/`** | **서비스별** 규칙 | pms, dms, server 등 경로별 규칙 | 레포 특화 |
| **`docs/`** (이 폴더) | 개발 **결과물** 문서 | 시스템 아키텍처, 도메인, API | 레포 특화 |

> **`.github/` 코어만으로 새 프로젝트를 빌드**할 수 있어야 합니다.  
> `docs/`는 **이 프로젝트의 산출물**을 설명하는 **배포용 문서**입니다.

### 깃헙독스 참조

규칙/표준 확인이 필요한 경우 **깃헙독스**를 참조하세요:

| 내용 | 깃헙독스 위치 |
|------|-------------|
| 전역 코딩 규칙 | [.github/copilot-instructions.md](../.github/copilot-instructions.md) |
| 서비스별 규칙 | [.github/instructions/*.md](../.github/instructions/) |
| 검증 스크립트 | [.github/scripts/](../.github/scripts/) |
| 에이전트 정의 | [.github/agents/](../.github/agents/) |

### DMS 정본 구조

DMS 문서는 모노레포 내에서 `docs/dms/` 단일 정본으로 관리합니다.

| 위치 | 역할 | 언제 참조? |
|------|------|----------|
| `docs/dms/` | **DMS 정본** | DMS 개발/통합 작업 시 |
| `apps/web/dms/dms.config.default.json`, `compose.yaml`, `DMS_*` | **런타임 문서/스토리지 경로 계약** | DMS markdown working tree (템플릿은 `_templates/` 하위 포함), ingest queue, binary storage |

---

## 📖 문서 구조 (Diátaxis 하이브리드)

```
docs/
├── common/                 # 🔗 공용 문서 (PMS/DMS 공통)
│   ├── tutorials/          # Tutorial: 학습 자료
│   ├── guides/             # How-to: 공통 가이드
│   ├── reference/          # Reference: 자동 생성 (API, ERD, TypeDoc)
│   └── explanation/        # Explanation: 개념 이해
│       └── architecture/   # 공통 아키텍처 및 표준
├── pms/                    # 📋 PMS 문서
│   ├── tutorials/          # Tutorial: 학습 자료
│   ├── guides/             # How-to: 개발 가이드
│   ├── reference/          # Reference: 자동 생성 (Storybook, TypeDoc, DB)
│   ├── explanation/        # Explanation: 개념 이해
│   │   ├── architecture/   # PMS 아키텍처 (상태관리, 라우팅, 유틸리티)
│   │   ├── domain/         # 도메인 모델링 (actions, workflows)
│   │   └── design/         # UI/UX 설계 (디자인 시스템, 레이아웃)
│   ├── planning/           # 기획 및 로드맵 (backlog, changelog)
│   └── tests/              # 테스트 문서
└── dms/                    # 📄 DMS 문서 (정본)
    ├── tutorials/          # Tutorial: 학습 자료
    ├── guides/             # How-to: 개발 가이드
    ├── reference/          # Reference: 참조/생성 문서
    ├── explanation/        # Explanation: 개념 이해
    │   ├── architecture/
    │   ├── domain/
    │   └── design/
    ├── planning/           # 로드맵/백로그/변경이력
    └── tests/              # 테스트 문서
```

> ⚠️ **DMS 정본 문서**: `docs/dms/`에 있습니다.

## 🔗 문서 바로가기

### 공용 문서 (Common)

| 문서 | 설명 |
|------|------|
| [공용 README](./common/README.md) | 공용 문서 인덱스 |
| [**AGENTS 가이드**](./common/AGENTS.md) | 모노레포 에이전트 학습 가이드 |
| [리팩토링 표준](./common/explanation/architecture/refactoring-audit-prompt.md) | 리팩토링 감사 기준 |
| [공통 기술 스택](./common/explanation/architecture/tech-stack.md) | 백엔드, 데이터베이스, 공통 도구 |
| [개발 표준](./common/explanation/architecture/development-standards.md) | 코딩 규칙 및 표준 |
| [보안 표준](./common/explanation/architecture/security-standards.md) | 보안 정책 |
| [워크플로우](./common/explanation/architecture/workflow-process.md) | 개발 프로세스 |

### PMS (Project Management System)

| 문서 | 설명 |
|------|------|
| [PMS README](./pms/README.md) | PMS 문서 인덱스 |
| [PMS 기술 스택](./pms/explanation/architecture/tech-stack.md) | PMS 프론트엔드 기술 |
| [개발 환경 설정](./getting-started.md) | 개발 환경 설정 가이드 |
| [디자인 시스템](./pms/explanation/design/design-system.md) | UI/UX 디자인 표준 |
| [변경 이력](./pms/planning/changelog.md) | 최신 변경사항 |
| [백로그](./pms/planning/backlog.md) | 작업 현황 |

### DMS (Document Management System)

> ⚠️ **DMS 정본 문서는 `docs/dms/`에 있습니다.**  
> DMS는 pnpm workspace 앱이며 `@ssoo/types`, `@ssoo/web-auth`를 재사용합니다. 단, `@ssoo/database` 직접 import는 금지입니다.

| 문서 | 설명 |
|------|------|
| [DMS AGENTS](./dms/AGENTS.md) | DMS 에이전트 가이드 (정본) |
| [DMS 기술 스택](./dms/explanation/architecture/tech-stack.md) | DMS 기술 스택 |
| [DMS 패키지 명세](./dms/explanation/architecture/package-spec.md) | DMS 패키지 구조 |

## 📋 문서 카테고리 설명

### 🔗 Common (공용)

PMS와 DMS에서 공통으로 적용되는 문서들:

- **explanation/architecture/**: 개발 표준, 보안 정책, 백엔드 아키텍처, 패키지 명세
- **guides/**: API 사용법, 데이터베이스 가이드, 코딩 규칙

### 📋 PMS (프로젝트 관리)

- **explanation/architecture/**: PMS 프론트엔드 아키텍처 (상태관리, 라우팅, 유틸리티)
- **explanation/design/**: UI/UX 설계 (디자인 시스템, 레이아웃, 컴포넌트)
- **explanation/domain/**: 비즈니스 도메인 (actions, workflows)
- **guides/**: PMS 개발 가이드 (history-management 등)
- **planning/**: 백로그, 로드맵, 변경 이력
- **reference/**: TypeDoc, Storybook, DB ERD 등 자동 생성 문서
- **tests/**: 테스트 전략 및 문서

### 📄 DMS (문서 관리)

> DMS 정본 문서는 `docs/dms/`에 있습니다.

- **explanation/architecture/**: DMS 통합 계획 및 비교 분석
- **planning/**: DMS 로드맵, 백로그, 변경 이력
- **reference/**: DMS 참조 자료 (DB 스키마 등)

## 🔄 문서 관리

### 자동 생성 문서

프로젝트에서 자동으로 생성되는 문서들:

| 유형 | 위치 | 생성 도구 |
|------|------|-----------|
| Common ERD | `common/reference/db/` | Prisma DBML |
| Common TypeDoc | `common/reference/typedoc/` | TypeDoc |
| Common API | `common/reference/api/` | OpenAPI |
| PMS ERD | `pms/reference/db/` | Prisma DBML |
| PMS TypeDoc | `pms/reference/typedoc/` | TypeDoc |
| PMS API | `pms/reference/api/` | Swagger/OpenAPI |
| PMS Storybook | `pms/reference/storybook/` | Storybook |
| DMS ERD | `dms/reference/db/` | Prisma DBML |

### 문서 작성 규칙

1. **언어**: 한국어 기본 (코드/기술 용어는 영문 유지)
2. **파일명**: kebab-case 사용 (예: `auth-system.md`)
3. **링크**: 상대 경로 사용, 공용 문서 참조 시 `../common/` 경로
4. **구조**: 각 카테고리의 README.md에서 하위 문서 인덱싱

## 🚀 빠른 시작

1. **신규 개발자**: [개발 환경 설정](./getting-started.md) → [개발 표준](./common/explanation/architecture/development-standards.md)
2. **API 개발**: [API 가이드](./common/guides/api-guide.md) → [API 명세](./pms/api/README.md)
3. **데이터베이스 작업**: [DB 가이드](./common/guides/database-guide.md) → [DB 규칙](./common/guides/rules.md)
4. **프론트엔드 개발**: [PMS 기술 스택](./pms/explanation/architecture/tech-stack.md) → [UI 설계](./pms/explanation/design/README.md)
