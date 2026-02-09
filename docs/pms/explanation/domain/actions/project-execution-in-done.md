# Action Spec — A06 실행 종료(execution done)

## 구현 상태

- 상태: ⬜ 미구현 (스펙 문서)
- 최종 검증일: 2026-02-02
- 현재 기준:
  - 관련 API/화면/서비스 미구현
  - 종료조건 검증 로직 미구현


## 1) 목적
프로젝트 수행 종료(검수/정산/종료보고 등 종료 이벤트 충족 후)

## 2) Actor
- PM(주), AM(정산 확인 입력 가능)

## 3) 입력
- project_id
- (선택) actual_end_at
- (필수) done_result_code
- (선택) 종료 조건 체크리스트 완료 여부 확인

## 4) 상태 변경
- pr_project_m: status_code=execution 유지, stage_code=done
- done_result_code:
  - completed (프로젝트 종료)
  - transfer_pending (운영 전환 필요)
  - linked (다음 프로젝트 연계)
  - cancelled
  - hold

## 5) DB 영향
- UPDATE pr_project_m (+ 히스토리)
- 프로젝트_스테이터스 상세(execution row)에 actual_end_at 기록
- done_result_code=transfer_pending 인 경우 transition waiting 전환 이벤트는 별도 처리

## 6) Validation(권장)
- (정책) execution 종료 전 종료조건(pr_project_close_condition_r_m) 미체크 항목이 있으면 종료 불가/경고
- (정책) requires_deliverable 조건이 존재하면 산출물 confirmed 충족 여부 검증

# Action Spec — C02 종료조건 체크(Validation 포함)

## 1) 목적
종료조건 항목을 충족 처리(is_checked=true)

## 2) Actor
- PM(실행), 영업/AM(기회) — 정책 결정

## 3) 입력
- project_id, status_code, condition_code

## 4) DB 영향
- UPDATE pr_project_close_condition_r_m:
  - is_checked=true
  - checked_at=now()
  - checked_by=actor

## 5) Validation(핵심)
- requires_deliverable=false → 바로 체크 가능
- requires_deliverable=true →
  - pr_project_deliverable_r_m에서 (project_id, status_code) 산출물 중
  - submission_status_code='confirmed' 충족 여부 확인 후 체크 허용
  - (정책) “1개 이상 confirmed 존재” 또는 “필수 목록 모두 confirmed”는 추후 고도화

## 6) 실패/에러
- 산출물 confirmed 미충족 시 체크 불가(에러 메시지에 부족 항목 안내 권장)

## Changelog

| Date | Change |
|------|--------|
| 2026-02-09 | Add changelog section. |

