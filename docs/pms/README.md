# PMS 문서

> 최종 업데이트: 2026-02-02

프로젝트 관리 시스템(PMS) 관련 문서를 관리합니다.

---

## 🚀 시작하기

- **[getting-started.md](../getting-started.md)** - 개발 환경 설정 가이드

---

## 📁 문서 구조

### 수동 관리 문서

| 폴더 | 설명 | 주요 내용 |
|------|------|----------|
| **[explanation/architecture/](explanation/architecture/)** | 아키텍처/개발 표준 | 기술 스택, 모듈 구조, 보안 정책 |
| **[explanation/domain/](explanation/domain/)** | 비즈니스 개념 | 서비스 개요, 워크플로우, 액션 |
| **[explanation/design/](explanation/design/)** | UI/UX 설계 | 디자인 시스템, 레이아웃, 컴포넌트 계층 |
| **[guides/](guides/)** | 사용 가이드 (How-to) | API, DB, BigInt 처리 가이드 |
| **[tutorials/](tutorials/)** | 학습 자료 | 튜토리얼 |
| **[planning/](planning/)** | 프로젝트 관리 | 백로그, 로드맵, 변경 이력 |
| **[tests/](tests/)** | 테스트 시나리오 | 인증 테스트 케이스 |

### 자동 생성 문서 (reference/)

| 문서 | 설명 | 생성 도구 |
|------|------|----------|
| **[API 문서](reference/api/index.html)** | REST API 명세 | OpenAPI/Redoc |
| **[ERD](reference/db/erd.svg)** | 테이블 구조도 | Prisma DBML |
| **[TypeDoc](reference/typedoc/server/index.html)** | 코드 API 레퍼런스 | TypeDoc |
| **[Storybook](reference/storybook/index.html)** | UI 컴포넌트 카탈로그 | Storybook |

---

## 📚 핵심 문서

| 문서 | 설명 |
|------|------|
| [docs-management.md](../common/explanation/architecture/docs-management.md) | **문서 관리 전략** - 자동/수동 구분, 중복 방지 (공용) |
| [tech-stack.md](explanation/architecture/tech-stack.md) | PMS 기술 스택 |
| [modular-monolith.md](../common/explanation/architecture/modular-monolith.md) | 모듈러 모놀리스 아키텍처 (공용) |
| [service-overview.md](explanation/domain/service-overview.md) | 서비스 개요 |

---

## 관련 링크

- [전체 CHANGELOG](/docs/CHANGELOG.md) - 자동 생성 릴리스 노트
- [공통 도메인 문서](../common/) - common 스키마 관련
