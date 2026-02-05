# DMS 아키텍처 문서

> 최종 업데이트: 2026-02-02

DMS(Document Management System) 아키텍처 및 개발 기준 문서입니다.

---

## 핵심 문서

| 문서 | 설명 |
|------|------|
| [tech-stack.md](tech-stack.md) | 기술 스택 - 프론트엔드 기술 및 버전 |
| [package-spec.md](package-spec.md) | 패키지 명세서 - 의존성 상세 |
| [docs-structure-plan.md](docs-structure-plan.md) | 문서 구조 계획 |

## 개발 표준

| 문서 | 설명 |
|------|------|
| [frontend-standards.md](frontend-standards.md) | 프론트엔드 표준 - 컴포넌트 계층, 네이밍 규칙 |
| [development-standards.md](../../../../docs/common/architecture/development-standards.md) | 개발 표준 (공용) |

## 상태 관리 & 라우팅

| 문서 | 설명 |
|------|------|
| [state-management.md](state-management.md) | 상태 관리 - Zustand Store 구조 |
| [page-routing.md](page-routing.md) | 페이지 라우팅 - 탭 기반 네비게이션 |
| [app-initialization-flow.md](app-initialization-flow.md) | 앱 초기화 흐름 |
| [utilities.md](utilities.md) | 유틸리티 함수 - API 클라이언트, 헬퍼 |

## UI/레이아웃

> UI 및 레이아웃 관련 문서는 [design/](../design/README.md) 폴더를 참조하세요.

| 문서 | 설명 |
|------|------|
| [design-system.md](../design/design-system.md) | 디자인 시스템 - 색상, 타이포그래피 |
| [layout-system.md](../design/layout-system.md) | 레이아웃 시스템 - 사이드바, 탭, 컨텐츠 |
| [ui-components.md](../design/ui-components.md) | UI 컴포넌트 - Radix UI 기반 |

## PMS 대비 차이점

DMS는 독립 npm 프로젝트로, PMS와 다음 차이점이 있습니다:

| 항목 | PMS | DMS |
|------|-----|-----|
| 패키지 관리 | pnpm workspace | npm 독립 |
| 인증 | JWT 기반 | 없음 (로컬 전용) |
| 에디터 | 없음 | Tiptap 리치 텍스트 |
| 스토리지 | 서버 DB | 로컬 파일시스템 |
| 메뉴 구조 | Tree + 권한 | 파일 트리 직접 반영 |

## 관련 문서

- [DMS 서비스 개요](../domain/service-overview.md)
- [DMS 개발 가이드](../guides/README.md)
- [DMS 로드맵](../planning/roadmap.md)
