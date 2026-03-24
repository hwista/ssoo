# SSOO 핵심 개념 (Concepts)

> 최종 업데이트: 2026-02-02

SSOO 시스템의 핵심 도메인 개념을 정의합니다.

---

## 1. Opportunity (기회)

- "프로젝트가 될 가능성이 있는 일(계약 전)"을 담는 단위
- **자동 생성하지 않는다.**
  - 영업/AM의 모든 컨택 채널을 시스템이 모니터링할 수 없으므로 **영업/AM이 직접 등록**한다.
- 제안/요청 검토/딜/협상 과정이 여기에서 관리된다.
- 계약이 성사되면 **Execution(실행) 상태로 전환**된다.

> **구현 관점**: Opportunity는 별도 엔티티 분리 없이 **Project의 상태(status_code=request/proposal)** 로 표현한다.

---

## 2. Project (프로젝트) — 단일 엔티티

- "기회(계약 전)"와 "실행(계약 후)"을 **단일 Project 엔티티**로 통합 관리한다.
- 흐름은 `status_code` + `stage_code`로 표현한다.

### 상태 (status_code)
| 값 | 설명 |
|---|------|
| `request` | 요청 |
| `proposal` | 제안 |
| `execution` | 실행 |
| `transition` | 전환 |

### 단계 (stage_code)
| 값 | 설명 |
|---|------|
| `waiting` | 대기 |
| `in_progress` | 진행 중 |
| `done` | 완료 |

### 종료 결과 (done_result_code)
| 값 | 설명 |
|---|------|
| `accepted` | 수용 |
| `rejected` | 거부 |
| `won` | 수주 성공 |
| `lost` | 실주 |
| `completed` | 완료 |
| `cancelled` | 취소 |
| `transfer_pending` | 운영 전환 필요 |
| `transferred` | 운영 이관 완료 |
| `linked` | 다음 프로젝트 연계 |
| `hold` | 보류 |

> 사용 규칙: `status_code=request/proposal/execution/transition`에서 `stage_code=done`일 때 의미 있음

### 단계 특화 상세

공통 필드는 `pr_project_m`에 유지하고, 단계별 특화 항목은 상세 테이블로 분리한다.

| 단계 | 상세 테이블 | 설명 |
|---|---|---|
| request | `pr_project_request_d` | 요청 유입/채널/우선순위 등 |
| proposal | `pr_project_proposal_d` | 제안 기한/금액/범위 등 |
| execution | `pr_project_execution_d` | 계약/정산/납품 방식 등 |
| transition | `pr_project_transition_d` | 운영 이관 핸드오프 관리 |

---

## 3. Handoff (핸드오프) 트랙

- 역할 간 인계는 프로젝트의 별도 트랙(`handoff_*`)으로 관리한다.
- 핸드오프는 여러 번 발생 가능하며, 필요 시 이벤트를 분리 기록해 추적성을 강화한다.

### 핸드오프 타입 (handoff_type_code)
| 값 | 설명 |
|---|------|
| `PRE_TO_PM` | 기회 → PM (실행 인수) |
| `PRE_TO_CONTRACT_OWNER` | 기회 → 계약담당 (AM 등) |
| `EXEC_TO_CONTRACT_OWNER` | 실행 중 계약이행 (중도금/정산 등) |
| `EXEC_TO_SM` | 실행 → 운영 전환 (SM) |

### 핸드오프 단계 (handoff_stage_code)
- `waiting` / `in_progress` / `done`

---

## 4. System (시스템, 운영 자산)

- 프로젝트 결과로만 생기는 개념이 아니라 "우리가 관리해야 하는 자산"으로 존재할 수 있다.
  - 예: 타사가 구축한 시스템을 우리가 **운영만 인수**하는 경우 → System은 독립적으로 등록 가능
- Project와 System은 강결합일 필요가 없고, 필요할 때 선택적으로 매핑될 수 있다.

---

## 5. Customer / Plant / System Instance

- **Customer**: 고객사
- **Plant/Site**: 고객의 공장/사이트 (다수 보유 가능)
- **System Instance**: 고객/플랜트별 시스템 인스턴스
  - 시스템은 고객에 직접 붙을 수도 있고(전사 ERP), 플랜트별 인스턴스가 존재할 수도 있다(MES)
  - 시스템은 계층 구조를 가질 수 있다 (MES 하위 DAS/HMI 등)
- **Integration**: 시스템 간 인터페이스 (ERP↔MES 등)

---

## 6. User (사용자) — 단일 테이블

- 조직 내/외 모든 "사람"을 단일 테이블(`cm_user_m`)에서 관리한다.
- 프로젝트 리소스, 이해관계자, 담당자 등으로 매핑될 수 있다.
- **시스템 로그인 가능 여부**는 `is_system_user` 플래그로 구분한다.

### 사용자 유형 (user_type_code)
| 값 | 설명 |
|---|------|
| `internal` | 내부 직원 (우리 회사) |
| `external` | 외부 이해관계자 (고객사 담당자, 협력사 등) |

### 시스템 사용 여부 (is_system_user)
| 값 | 설명 |
|---|------|
| `false` (기본) | 프로젝트 리소스/이해관계자로만 기록됨. 로그인 불가. |
| `true` | 시스템 로그인 가능. login_id/password 필요. |

### 사용자 상태 (user_status_code)
| 값 | 설명 |
|---|------|
| `registered` | 리소스로만 등록됨 (시스템 미사용) |
| `invited` | 시스템 사용 초대됨 (아직 가입 미완료) |
| `active` | 정상 사용 중 |
| `inactive` | 일시 비활성 (휴직 등) |
| `suspended` | 정지됨 (보안 이슈 등) |

### 초대 플로우
```
registered(리소스 등록) → invited(초대 발송) → active(초대 수락/계정 설정)
```

---

## 7. Deliverable (산출물)

- "표준 산출물 사전"을 별도 마스터로 관리한다.
- 프로젝트에서는 "프로젝트 + 상태(status) + 산출물" 단위로 제출 상태/업로드 파일을 관리한다.
- 산출물 템플릿 그룹(방법론/유형별 세트)을 제공하여 프로젝트 산출물 목록을 자동 구성할 수 있다.

### 산출물 제출 상태 (3단계)
| 값 | 설명 |
|---|------|
| `before_submit` | 제출 전 |
| `submitted` | 제출 |
| `confirmed` | 확정 (고객 검수/확정 반영) |

---

## 8. Close Condition (종료조건)

- 프로젝트 종료를 객관화하기 위해 종료조건 체크리스트를 관리한다.
- 종료조건 템플릿 그룹을 제공하여 프로젝트+상태별 종료조건 목록을 자동 구성할 수 있다.

### 산출물 기반 종료 검증 (Validation)
- 종료조건 항목에 `requires_deliverable=true`가 설정된 경우:
  - 해당 프로젝트+상태의 산출물 제출 상태가 **confirmed**를 만족해야만
  - UI/업무 로직에서 해당 종료조건 `is_checked=true` 처리를 허용한다.

---

## 9. 데이터 모델 요약 (High-level)

```
Customer 1:N Plant
System Catalog (parent-child 계층)
Customer/Plant → System Instance
System Instance ↔ Integration (인터페이스)
Project → Customer (필수), Plant/System Instance (선택)
User → Project/System (오너/담당)
Opportunity = Project (status_code=request/proposal)
```

---

## 관련 문서

- [service-overview.md](service-overview.md) - 서비스 소개
- [actions/](actions/) - 액션 명세
- [workflows/](workflows/) - 워크플로우 명세
- [database-guide.md](../../common/guides/database-guide.md) - 데이터베이스 가이드 (공용)

## Changelog

| Date | Change |
|------|--------|
| 2026-02-09 | Add changelog section. |

