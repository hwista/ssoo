# PMS 아키텍처 문서

> 최종 업데이트: 2026-02-02

PMS 시스템의 아키텍처 및 개발 기준 문서입니다.

---

## 핵심 문서

| 문서 | 설명 |
|------|------|
| [tech-stack.md](tech-stack.md) | 기술 스택 - 프론트엔드 기술 및 버전 |
| [tech-decisions.md](tech-decisions.md) | 기술 결정 기록 (ADR) |
| [frontend-package-strategy.md](frontend-package-strategy.md) | **프론트엔드 패키지 전략** - PMS/DMS 공용화 계획 |
| [package-spec.md](package-spec.md) | 패키지 명세서 - 의존성 상세 |

## 개발 표준

| 문서 | 설명 |
|------|------|
| [frontend-standards.md](frontend-standards.md) | 프론트엔드 표준 - 컴포넌트 계층, API 클라이언트 |
| [development-standards.md](../../common/explanation/architecture/development-standards.md) | 개발 표준 (공용) |
| [security-standards.md](../../common/explanation/architecture/security-standards.md) | 보안 표준 (공용) |

## 상태 관리 & 라우팅

| 문서 | 설명 |
|------|------|
| [state-management.md](state-management.md) | 상태 관리 - Zustand Store 구조 |
| [page-routing.md](page-routing.md) | 페이지 라우팅 - 보안 라우팅 전략 |
| [app-initialization-flow.md](app-initialization-flow.md) | 앱 초기화 흐름 |
| [utilities.md](utilities.md) | 유틸리티 함수 - API 클라이언트, 헬퍼 |

## UI/레이아웃

> UI 및 레이아웃 관련 문서는 [design/](../explanation/design/README.md) 폴더로 이동했습니다.

| 문서 | 설명 |
|------|------|
| [design-system.md](../explanation/design/design-system.md) | 디자인 시스템 - 색상, 타이포그래피 |
| [layout-system.md](../explanation/design/layout-system.md) | 레이아웃 시스템 - 사이드바, 탭, 컨텐츠 |
| [ui-components.md](../explanation/design/ui-components.md) | UI 컴포넌트 - shadcn/ui 기반 |
| [scrollbar.md](../explanation/design/scrollbar.md) | 스크롤바 - 커스텀 스크롤바 |

## 공용 문서 (common/)

| 문서 | 설명 |
|------|------|
| [modular-monolith.md](../../common/explanation/architecture/modular-monolith.md) | 모듈러 모놀리스 아키텍처 (백엔드) |
| [auth-system.md](../../common/explanation/architecture/auth-system.md) | 인증 시스템 - JWT, 토큰 갱신 |
| [workflow-process.md](../../common/explanation/architecture/workflow-process.md) | 개발 작업 프로세스 |
| [docs-structure-plan.md](../../common/explanation/architecture/docs-structure-plan.md) | 문서 구조 계획 |

## DMS 연동

| 문서 | 설명 |
|------|------|
| [wiki-integration-plan.md](../../dms/explanation/architecture/wiki-integration-plan.md) | DMS 통합 계획 |
