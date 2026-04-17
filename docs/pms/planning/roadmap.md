# SSOO 제품 로드맵

> 최종 업데이트: 2026-04-17

단계별 구축 전략 (Progressive Delivery)

---

## MVP-0: "일을 모으는 마스터 허브"

> 보고/템플릿/자동화보다 먼저 아래 목록을 한 곳에 모아 검색/필터/연결 조회가 가능하도록 한다.

### 마스터 오브젝트 (최초 범위)

| # | 오브젝트 | 설명 |
|---|----------|------|
| 1 | Customer | 고객 |
| 2 | Plant/Site | 플랜트/사이트 |
| 3 | System Catalog | 시스템 종류/계층 |
| 4 | System Instance | 고객/플랜트별 시스템 인스턴스 + 운영 주체 구분 |
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

| 단계 | 상태 | 비고 |
|------|------|------|
| MVP-0 | 🔄 진행중 | `Customer`, `Project`, `User/Role/Menu` 축은 구현됨. `Plant/Site`, `System Catalog`, `System Instance`, `Integration`은 후속 범위 |
| MVP-1 | 🔄 부분 구현 | `status/stage`, `doneResult`, 단계별 상세, 상태 전이 로직이 이미 구현됨 |
| MVP-2 | 🔲 대기 | handoff/log 트랙은 아직 미구현 |
| MVP-3 | 🔄 부분 구현 | 산출물/종료조건 CRUD와 완료 전 검증은 존재하나 템플릿 체계는 미구현 |
| MVP-4 | 🔄 부분 구현 | task/milestone/issue/basic dashboard는 존재하나 reporting/자동화는 미구현 |

### 현재 기준 정리

- PMS는 아직 **MVP-0 전체 완료** 단계는 아니지만, 실제 구현은 MVP-1과 MVP-3 일부를 선행 포함하고 있습니다.
- 동시에 worktree 기준으로는 lifecycle bridge / org-orgmember foundation / project membership-access / objective-WBS / control quartet+issue / project org-relation / handoff-contract foundation 이 구현 쪽까지 상당 부분 진행된 상태입니다.
- 따라서 현재 우선순위는 새 feature 확장이 아니라 **baseline close** 입니다.
- 2026-04-17 기준 PMS 병렬 축의 기준선은 [current-baseline-close-brief.md](./current-baseline-close-brief.md) 를 정본으로 삼습니다.
- 다음 PMS 작업은 아래 순서로 봅니다.
  1. reconciliation baseline 공식화
  2. migration / trigger installer gap 확인
  3. backlog / roadmap / changelog 재정렬
  4. 이후에 handoff/contract/payment surface 또는 verification tranche 로 이동

---

## 관련 문서

- [BACKLOG.md](BACKLOG.md) - 상세 백로그
- [../domain/service-overview.md](../explanation/domain/service-overview.md) - 서비스 개요

## Changelog

| Date | Change |
|------|--------|
| 2026-04-17 | current-baseline-close-brief 를 planning 기준선에 연결하고, PMS 우선순위를 새 feature 확장보다 baseline close / migration / validation gap 정리로 재정렬 |
| 2026-04-07 | Rebaseline roadmap status to match implemented PMS scope. |
| 2026-02-09 | Add changelog section. |
