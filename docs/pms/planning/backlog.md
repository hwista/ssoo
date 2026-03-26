# SSOO 프로젝트 백로그 - 인덱스

> 전체 백로그 요약 및 영역별 문서 링크

**마지막 업데이트**: 2026-02-02

---

## 📍 영역별 Backlog 위치

각 문서 하단에 해당 영역의 상세 백로그가 있습니다.

| 영역 | 문서 위치 | 설명 |
|------|----------|------|
| **작업 프로세스** | [workflow-process.md](../../common/explanation/architecture/workflow-process.md#backlog) | 작업 프로세스/커밋/Git (공용) |
| **프론트엔드 표준** | [architecture/frontend-standards.md](../explanation/architecture/frontend-standards.md#backlog) | 컴포넌트 계층/표준 |
| **API** | [api/README.md](../api/README.md#backlog) | API 추가/개선 |
| **레이아웃** | [design/layout-system.md](../explanation/design/layout-system.md#backlog) | 레이아웃/모바일 |
| **상태 관리** | [architecture/state-management.md](../explanation/architecture/state-management.md#backlog) | Store 개선 |
| **UI 컴포넌트** | [design/ui-components.md](../explanation/design/ui-components.md#backlog) | 컴포넌트 추가 |
| **유틸리티** | [architecture/utilities.md](../explanation/architecture/utilities.md#backlog) | 헬퍼 함수 |
| **데이터베이스** | [database-guide.md](../../common/guides/database-guide.md) | 테이블 변경 (공용) |

---

## 🎯 리팩토링 목적 (Why)

> 모든 백로그 항목은 아래 목적에 부합해야 합니다.

| # | 목적 | 설명 |
|:-:|------|------|
| 1 | **코드 품질 유지** | 무분별한 코드 방지, 유지보수/운영 용이성 확보 |
| 2 | **표준/패턴 선구축** | 덩치 커지기 전에 기반 구축, 일관된 개발 가이드 |
| 3 | **문서화 기반 작업** | 이력 관리, 충돌 방지, 협업 효율 |
| 4 | **주기적 재정립** | 간결하고 명확한 구조 유지 |
| 5 | **개발 생산성** | 표준이 있으면 고민 없이 빠르게 개발 |
| 6 | **온보딩 용이성** | 새 개발자 합류 시 문서/패턴으로 빠른 적응 |
| 7 | **자동화된 품질 게이트** | 사람이 아닌 시스템이 품질을 강제 |

---

## 📋 상태 범례

| 상태 | 설명 |
|------|------|
| 🔲 | 대기 |
| 🔄 | 진행중 |
| ✅ | 완료 |
| ⏸️ | 보류 |

---

## 🚨 우선순위 높은 항목 요약

> 각 영역에서 P1-P2 우선순위 항목만 모아서 표시

### P1 (High) - 핵심 기초

| ID | 영역 | 항목 | 상태 |
|----|------|------|------|
| - | 전체 | 대형 컴포넌트 분리 완료 | ✅ |

### P2 (Medium) - 품질 개선

| ID | 영역 | 항목 | 상태 |
|----|------|------|------|
| LAY-01 | 레이아웃 | 모바일 레이아웃 구현 | 🔲 |
| STM-01 | 상태관리 | 즐겨찾기 순서 변경 API 연동 | 🔲 |
| UTL-01 | 유틸리티 | 날짜/숫자/금액 포맷 유틸리티 | 🔲 |
| API-02 | API | 에러 응답 상세 코드 정의 | 🔲 |

### P3 (Low) - 추후 개선

| ID | 영역 | 항목 | 상태 |
|----|------|------|------|
| LAY-02 | 레이아웃 | 페이지 컴포넌트 문서화 | 🔲 |
| LAY-03 | 레이아웃 | Header 브레드크럼 구현 | 🔲 |
| STM-02 | 상태관리 | 타입 정의 전용 문서 | 🔲 |
| UIC-01 | UI컴포넌트 | 개별 컴포넌트 상세 문서 | 🔲 |
| UTL-02 | 유틸리티 | 디바운스/쓰로틀 유틸리티 | 🔲 |
| API-01 | API | Health Check API 문서화 | 🔲 |

---

## ✅ 최근 완료 항목

| 완료일 | ID | 항목 |
|--------|-----|------|
| 2026-01-21 | - | 즐겨찾기 DB 연동 |
| 2026-01-21 | - | 커스텀 스크롤바 시스템 |
| 2026-01-21 | - | API/아키텍처 문서화 |
| 2026-01-20 | IMM-01 | 자동 품질 게이트 구축 |
| 2026-01-20 | IMM-02 | 하드코딩 URL 수정 |
| 2026-01-20 | IMM-03 | 인증 가드 타입 개선 |
| 2026-01-20 | WEB-05 | DataTable 분리 |
| 2026-01-20 | WEB-06 | MainSidebar 분리 |

---

## 🗃️ 아카이브

> 완료된 항목 중 30일 이상 지난 것은 아카이브로 이동합니다.

- [완료된 백로그 아카이브](../_archive/backlog-completed.md) *(예정)*

## Changelog

| Date | Change |
|------|--------|
| 2026-02-09 | Add changelog section. |

