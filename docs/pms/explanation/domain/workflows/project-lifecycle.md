# 프로젝트 라이프사이클 (Project Lifecycle)

## 구현 상태

- 상태: 미구현
- 현재 기준:
  - 관련 API/화면/서비스 미구현으로 문서가 스펙 상태입니다.


> 최종 업데이트: 2026-02-02

프로젝트의 전체 생애주기를 정의합니다.

---

## 전체 흐름

```
REQUEST (요청) → PROPOSAL (제안) → EXECUTION (실행)
                                   │
                                   ├─ 완료(종료) → 종료
                                   ├─ 운영 전환 필요 → TRANSITION (전환)
                                   └─ 다음 프로젝트 연계 → 신규 프로젝트
```

---

## 1. Request/Proposal (요청/제안) 단계

### 1.1 영업 베이스 프로젝트

1. **영업**: 요청 등록 → `request + waiting`
2. **영업**: 요청 검토/관리 → `request + in_progress`
3. **영업/AM**: 제안 단계 전환 → `proposal + waiting`
4. **영업/AM**: 제안 진행 → `proposal + in_progress`
5. **제안 종료**: `proposal + done + (won/lost/hold)`
6. **수주 확정 시**: `execution + waiting` 으로 전환

### 1.2 고객 요청 베이스 프로젝트

1. **고객**: 요청
2. **AM**: 요청 확인 후 request/proposal로 관리 (검토/딜/제안)
3. **AM**: 계약 체결
4. 이후 프로세스는 영업 베이스와 동일

---

## 2. Execution (실행) 단계

1. **PM**: 실행 전환 및 핸드오프 수령 → `execution + waiting`
2. **PM**: 프로젝트 실행 → `execution + in_progress`
3. **PM**: 실행 중 중도금/중간보고 필요 시 → AM에 핸드오프
4. **AM**: 중도금 등 계약 이행
5. **PM**: 프로젝트 종료 → `execution + done`
6. **실행 종료 결과**
  - 종료: 프로젝트 종료 처리
  - 운영 전환 필요: `transition + waiting` 으로 전환
  - 다음 프로젝트 연계: 신규 프로젝트 연결
7. **AM**: 최종 잔금 및 계약 관계 마무리
8. **(조건부) SM**: 운영 전환 프로젝트의 경우 핸드오프 수령 후 운영

---

## 3. Handoff (핸드오프)

역할 간 인계는 별도 트랙으로 관리됩니다.

| 타입 | 설명 |
|------|------|
| `PRE_TO_PM` | 요청/제안 → PM (실행 인수) |
| `PRE_TO_CONTRACT_OWNER` | 요청/제안 → 계약담당 |
| `EXEC_TO_CONTRACT_OWNER` | 실행 중 계약이행 |
| `EXEC_TO_SM` | 실행 → SM (운영 전환) |

---

## 4. Close (종료)

프로젝트 종료 시 검증 사항:

1. **종료조건 체크리스트** 완료 여부
2. **산출물 제출 상태** 확인 (confirmed)
3. **운영 전환 여부**는 실행 종료 결과에서 결정
  - 전환 필요 → transition 단계로 이동
  - 미전환 → 프로젝트 완료

---

## 관련 문서

- [../concepts.md](../concepts.md) - 핵심 개념
- [project-close.md](project-close.md) - 종료 상세
- [project-handoff.md](project-handoff.md) - 핸드오프 상세
- [project-deliverable.md](project-deliverable.md) - 산출물 관리

## Changelog

| Date | Change |
|------|--------|
| 2026-02-09 | Add changelog section. |

