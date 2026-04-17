# SSOO 프로젝트 백로그 - 인덱스

> 전체 백로그 요약 및 영역별 문서 링크

**마지막 업데이트**: 2026-04-17

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

### P1 (High) - 바로 착수할 항목

| ID | 영역 | 항목 | 상태 |
|----|------|------|------|
| FLOW-01 | UI 흐름 | 상태별 목록/상세 탭 계약 안정화 | ✅ |
| RULE-01 | 비즈니스 규칙 | `requiresDeliverable` 종료조건 체크 가드 보강 | ✅ |
| DOC-01 | Planning | roadmap/backlog/changelog 기준선 현행화 | ✅ |
| DOC-02 | Planning | current baseline-close brief 기준으로 PMS foundation/migration/validation gap 재고정 | 🔄 |

### P2 (Medium) - 다음 배치

| ID | 영역 | 항목 | 상태 |
|----|------|------|------|
| ROLE-01 | 멤버 관리 | 멤버 역할 하드코딩을 코드 테이블 기반으로 정리 | 🔲 |
| MVP0-01 | 도메인 | `Plant/Site`, `System Catalog`, `System Instance`, `Integration` 도메인 착수 | 🔲 |
| HAND-01 | 프로젝트 흐름 | Handoff/log 트랙 설계 및 1차 구현 | 🔲 |
| LAY-01 | 레이아웃 | 모바일 레이아웃 구현 | 🔲 |

### P3 (Low) - 추후 개선

| ID | 영역 | 항목 | 상태 |
|----|------|------|------|
| DASH-01 | 대시보드 | 리스크/리포트/집계 위젯 확장 | 🔲 |
| LAY-02 | 레이아웃 | Header 브레드크럼 구현 | 🔲 |
| UTL-01 | 유틸리티 | 날짜/숫자/금액 포맷 유틸리티 정리 | 🔲 |
| API-01 | API | 에러 응답 상세 코드 정의 | 🔲 |

---

## ✅ 최근 완료 항목

> 현재 PMS의 foundation 정합화 상태와 다음 baseline close 기준은 [current-baseline-close-brief.md](./current-baseline-close-brief.md) 를 함께 참조합니다.

| 완료일 | ID | 항목 |
|--------|-----|------|
| 2026-04-07 | FLOW-01 | 대시보드 프로젝트 상세 진입 계약을 목록 화면 규약에 맞춤 |
| 2026-04-07 | RULE-01 | 종료조건 체크 시 산출물 필요 조건 검증 추가 |
| 2026-04-07 | DOC-01 | planning 문서를 실제 PMS 구현 단계에 맞게 재기준화 |
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
| 2026-04-07 | Reorganized backlog around the next executable PMS batches. |
| 2026-02-09 | Add changelog section. |
