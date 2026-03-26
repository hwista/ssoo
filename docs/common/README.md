````mdc
# 공용 문서 (Common)

> 최종 업데이트: 2026-02-05

PMS와 DMS 모두에 공통 적용되는 개발 표준, 가이드, 아키텍처 문서입니다.

---

## 🔗 깃헙독스 참조

> **📌 개발 프로세스 표준**은 [깃헙독스 (.github/)](../../.github/)에서 관리됩니다.
>
> 이 문서들(레포독스)은 **SSOO 프로젝트의 결과물**을 설명하며,  
> **개발 방법론**은 깃헙독스에 정본으로 존재합니다.

### SDD Framework 핵심 개념

| 개념 | 설명 | 참조 |
|------|------|------|
| **점검 우선 원칙** | 변경 전 반드시 현황 분석 | [inspect-first.prompt.md](../../.github/templates/inspect-first.prompt.md) |
| **품질 수렴 루프** | 측정→분석→개선→재측정 | [quality-loop.prompt.md](../../.github/templates/quality-loop.prompt.md) |
| **4단계 검증** | 스택별 재현 가능성 검증 | [sdd-verify.js](../../scripts/sdd-verify.js) |
| **증거 기반 작업** | 추정 금지, 사실만 기술 | [copilot-instructions.md](../../.github/copilot-instructions.md) |

---

## 📁 문서 구조

### 루트 문서

| 문서 | 설명 |
|------|------|
| [AGENTS.md](AGENTS.md) | 모노레포 에이전트 학습 가이드 (필독) |

### explanation/architecture/ - 아키텍처 & 개발 표준

| 문서 | 설명 |
|------|------|
| [tech-stack.md](explanation/architecture/tech-stack.md) | 공용 기술 스택 (백엔드, DB, 개발도구) |
| [development-standards.md](explanation/architecture/development-standards.md) | 개발 표준 (계층 구조, SRP, 컴포넌트 설계) |
| [security-standards.md](explanation/architecture/security-standards.md) | 보안 표준 (인증, 인가, 데이터 보호) |
| [auth-system.md](explanation/architecture/auth-system.md) | 인증 시스템 (JWT, 토큰 갱신, 보안 정책) |
| [workflow-process.md](explanation/architecture/workflow-process.md) | 개발 작업 프로세스 (코드→문서→커밋) |
| [docs-management.md](explanation/architecture/docs-management.md) | 문서 관리 전략 (자동/수동 구분) |
| [docs-structure-plan.md](explanation/architecture/docs-structure-plan.md) | 문서 구조 계획 |
| [refactoring-audit-prompt.md](explanation/architecture/refactoring-audit-prompt.md) | 리팩토링 감사 프롬프트 |
| [modular-monolith.md](explanation/architecture/modular-monolith.md) | 모듈러 모놀리스 아키텍처 (백엔드) |
| [server-package-spec.md](explanation/architecture/server-package-spec.md) | Server 패키지 명세 |
| [database-package-spec.md](explanation/architecture/database-package-spec.md) | Database 패키지 명세 |
| [types-package-spec.md](explanation/architecture/types-package-spec.md) | Types 패키지 명세 |

### guides/ - 사용 가이드

| 문서 | 설명 |
|------|------|
| [api-guide.md](guides/api-guide.md) | REST API 사용 가이드 |
| [database-guide.md](guides/database-guide.md) | 데이터베이스 사용 가이드 |
| [rules.md](guides/rules.md) | 데이터베이스 설계 규칙 |
| [bigint-guide.md](guides/bigint-guide.md) | BigInt 처리 가이드 |

### reference/ - 자동 생성 문서

| 폴더 | 설명 | 생성 도구 |
|------|------|----------|
| api/ | REST API 명세 | OpenAPI/Redoc |
| db/ | ERD, DBML | Prisma DBML |
| typedoc/ | 코드 API 레퍼런스 | TypeDoc |

---

## 시스템별 문서

- [PMS 문서](../pms/README.md) - 프로젝트 관리 시스템
- [DMS 문서](../dms/README.md) - 도큐먼트 관리 시스템

````