# Workflow Spec — Project Lifecycle (Request/Proposal ↔ Execution/Transition)

## 구현 상태

- 상태: ⬜ 미구현 (스펙 문서)
- 최종 검증일: 2026-02-02
- 현재 기준:
  - 프로젝트 상태 전환 비즈니스 로직 미구현
  - ProjectService.update()에서 단순 필드 업데이트만 가능


## 1. 범위
- 대상 테이블
  - pr_project_m / pr_project_h
  - pr_project_status_m(or phase) / pr_project_status_h (너가 만든 프로젝트_스테이터스)
  - pr_project_request_d / pr_project_request_d_h
  - pr_project_proposal_d / pr_project_proposal_d_h
  - pr_project_execution_d / pr_project_execution_d_h
  - pr_project_transition_d / pr_project_transition_d_h
  - pr_project_close_condition_r_m / pr_project_close_condition_r_h
  - pr_project_deliverable_r_m / pr_project_deliverable_r_h
- 관련 코드(예시)
  - PROJECT_STATUS: request, proposal, execution, transition
  - PROJECT_STAGE: waiting, in_progress, done
  - PROJECT_DONE_RESULT: accepted, rejected, won, lost, completed, transfer_pending, linked, cancelled, transferred, hold

## 2. 핵심 원칙
1) Project는 단일 엔티티(통합)이며, 현재 상태는 `pr_project_m.status_code + stage_code`가 표현한다.  
2) 상태 전환 이벤트는 **추적성**을 위해 한 번에 뭉치지 않고 **필요 시 2회 업데이트**로 쪼개어 기록한다.
   - 예) proposal done(won) → execution waiting 전환은 2개의 업데이트(2개의 히스토리 스냅샷)
3) 상세(목표/오너/일정/종료조건/산출물)는 status별 하위 테이블(프로젝트_스테이터스, 릴레이션)에서 관리한다.
4) 단계별 특화 정보는 stage detail 테이블로 분리해 조인한다.

## 3. 상태 머신(상태/단계)
- request: waiting → in_progress → done(accepted|rejected|hold)
- proposal: waiting → in_progress → done(won|lost|hold)
- execution: waiting → in_progress → done(completed|transfer_pending|linked|cancelled|hold)
- transition: waiting → in_progress → done(transferred|cancelled|hold)

## 4. 주요 액션(요약)
- A01. 프로젝트(요청) 등록
- A02. 요청/제안 진행 시작
- A03. 요청/제안 종료 처리
- A04. 계약 확정(제안→실행 전환: execution waiting)
- A05. 실행 착수(킥오프/PM 인수: execution in_progress)
- A06. 실행 종료(완료: execution done)

## Changelog

| Date | Change |
|------|--------|
| 2026-02-09 | Add changelog section. |

