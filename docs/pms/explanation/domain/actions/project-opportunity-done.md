# Action Spec — A03 요청/제안 종료 처리(request/proposal done + done_result)

## 구현 상태

- 상태: ⬜ 미구현 (스펙 문서)
- 최종 검증일: 2026-02-02
- 현재 기준:
  - 관련 API/화면/서비스 미구현
  - ProjectService.update()에서 doneResultCode 필드 업데이트는 가능하나 비즈니스 로직 검증 없음


## 1) 목적
요청/제안 단계 종료 결과 확정

## 2) Actor
- 영업/AM(기회 오너)

## 3) 입력
- project_id
- done_result_code in {accepted, rejected, won, lost, hold}

## 4) 상태 변경
- pr_project_m:
  - status_code=request 또는 proposal 유지
  - stage_code=done
  - done_result_code=입력값

## 5) DB 영향
- UPDATE pr_project_m
- INSERT pr_project_h (U)

## 6) Validation
- status_code in {request, proposal}
- done_result_code 필수

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

