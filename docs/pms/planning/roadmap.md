# SSOO 제품 로드맵

> 최종 업데이트: 2026-03-23

단계별 구축 전략 (Progressive Delivery)

---

## MVP-0: "일을 모으는 마스터 허브"

> 보고/템플릿/자동화보다 먼저 아래 목록을 한 곳에 모아 검색/필터/연결 조회가 가능하도록 한다.

### 마스터 오브젝트 (최초 범위)

| # | 오브젝트 | 설명 |
|---|----------|------|
| 1 | Customer | 고객 |
| 2 | Site | 고객 사이트/플랜트 |
| 3 | System Catalog | 시스템 종류/계층 |
| 4 | System Instance | 고객/사이트별 시스템 인스턴스 + 운영 주체 구분 |
| 5 | Integration | 시스템 간 인터페이스 |
| 6 | Project | 통합 단일 엔티티 (request/proposal/execution/transition 상태로 표현) |
| 7 | User | 사람 (내부 직원 + 외부 이해관계자, 시스템 사용 여부로 구분) |

> MVP-0에서는 "단계/핸드오프/종료조건/산출물/태스크"를 강하게 도입하지 않는다.  
> 우선 **"어디에 어떤 일이 있고 누가 들고 있는지"**를 보이게 한다.

---

## MVP-1: 상태/단계 + 전환/종료 이벤트 적용

- `status_code(request/proposal/execution/transition)` + `stage_code(waiting/in_progress/done)` 적용
- 요청/제안 완료 시 `done_result(accepted/rejected/won/lost/hold)`로 결과 구분
- 계약 체결 시 execution으로 전환
- 종료 시점에 운영 전환 여부 선택 (운영 전환이면 SM 지정)

---

## MVP-2: 핸드오프(Handoff) 트랙/로그 적용

- 기회 → PM (실행 인계)
- 기회 → 계약담당 (AM 등) (계약 진행 인계)
- 실행 → 계약이행 담당 (중도금/정산 등)
- 실행 → SM (운영 전환)
- 필요 시 인계 패킷/체크리스트로 확장

---

## MVP-3: 산출물/종료조건 (프로젝트 관리 실체화)

- 산출물 마스터/템플릿/프로젝트 제출 상태 관리
- 종료조건 체크리스트/템플릿 관리
- `requires_deliverable=true` 종료조건에 대해 산출물 `confirmed` 기반 검증(Validation) 적용

---

## MVP-4: 태스크/이슈/리스크 + 자동 리포트/대시보드

- 마일스톤/태스크/이슈/리스크는 "핵심 프로젝트부터" 단계적으로 적용
- 데이터가 쌓이면 수작업 PPT 취합/보고 비용이 자연스럽게 감소한다.

---

## 현재 진행 상황

| 단계 | 상태 | 완료일 |
|------|------|--------|
| MVP-0 | 🔄 진행중 | - |
| MVP-1 | 🔲 대기 | - |
| MVP-2 | 🔲 대기 | - |
| MVP-3 | 🔲 대기 | - |
| MVP-4 | 🔲 대기 | - |

---

## 관련 문서

- [BACKLOG.md](BACKLOG.md) - 상세 백로그
- [../domain/service-overview.md](../explanation/domain/service-overview.md) - 서비스 개요

## Changelog

| Date | Change |
|------|--------|
| 2026-02-09 | Add changelog section. |
| 2026-03-23 | Update MVP-0 terminology from Plant/Site to Site and reflect current master object structure. |
