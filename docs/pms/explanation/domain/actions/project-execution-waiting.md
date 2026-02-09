# Action Spec — A04 계약 확정/실행 전환(execution waiting)

## 구현 상태

- 상태: ⬜ 미구현 (스펙 문서)
- 최종 검증일: 2026-02-02
- 현재 기준:
  - 관련 API/화면/서비스 미구현
  - ProjectService.update()에서 statusCode/stageCode 필드 업데이트는 가능하나 상태 전환 검증 없음


## 1) 목적
계약 체결(합의)로 제안 → 실행으로 전환. (추적성 위해 이벤트 분리 권장)

## 2) Actor
- AM(주), 또는 영업/AM

## 3) 입력
- project_id
- (선택) execution 상세(예상 시작/종료, execution 오너=PM 예정 등)

## 4) 상태 변경(권장 2-step)
- Step1: (이미 A03에서) proposal done(won)
- Step2: execution waiting 전환
  - pr_project_m:
    - status_code=execution
    - stage_code=waiting
    - done_result_code=NULL (또는 유지하되 의미 없음으로 운영해도 됨. 권장은 NULL)
    - current_owner_user_id=PM 예정(또는 기존 유지 후 핸드오프로 변경)

## 5) DB 영향
- UPDATE pr_project_m (2번째 업데이트)
- INSERT pr_project_h (U)

## 6) Validation
- 직전 상태가 proposal done(won) 인지 확인(정책)
- 또는 계약 이벤트가 존재하면 강제 전환 가능(추후 계약 테이블 생기면 그 이벤트로 판단)

## Changelog

| Date | Change |
|------|--------|
| 2026-02-09 | Add changelog section. |

