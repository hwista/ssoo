# Action Spec — A02 요청/제안 진행 시작(request/proposal in_progress)

## 구현 상태

- 상태: ⬜ 미구현 (스펙 문서)
- 최종 검증일: 2026-02-02
- 현재 기준:
  - 관련 API/화면/서비스 미구현
  - ProjectService.update()에서 stageCode 필드 업데이트는 가능하나 비즈니스 로직 검증 없음


## 1) 목적
RFP/제안서 작업 등 “실제 일이 발생”하는 시점부터 진행으로 전환

## 2) Actor
- 영업/AM(기회 오너)

## 3) 입력
- project_id
- (선택) 스테이터스 상세 갱신(goal, expected dates 등)

## 4) 상태 변경
- pr_project_m: stage_code = in_progress (status_code=request 또는 proposal 유지)

## 5) DB 영향
- UPDATE pr_project_m
- INSERT pr_project_h (U)

## 6) Validation
- 현재 status_code in {request, proposal}
- 현재 stage_code in {waiting, in_progress} (idempotent 허용 여부 정책 결정)

## Changelog

| Date | Change |
|------|--------|
| 2026-02-09 | Add changelog section. |

