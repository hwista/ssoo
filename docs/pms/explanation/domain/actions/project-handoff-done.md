# Action Spec — H03 핸드오프 완료

## 구현 상태

- 상태: ✅ 구현됨
- 최종 검증일: 2026-03-23
- 현재 기준:
  - `POST /projects/:id/handoffs/complete` 구현
  - 완료 시 수신자를 현재 오너로 자동 승계


## 1) 목적
인계 완료 처리 + 필요 시 오너 변경/상태 전환 연계

## 2) Actor
- handoff_user_id(수신자)

## 3) 입력
- project_id
- (선택) 오너 변경 여부/변경 대상(보통 수신자=오너)

## 4) 상태 변경
- pr_project_m.handoff_stage_code=done
- (정책) current_owner_user_id를 수신자로 변경할 수 있음

## 5) DB 영향
- UPDATE pr_project_m (+ 히스토리)

## 6) Validation
- handoff_stage_code in {waiting, in_progress} (정책)

## Changelog

| Date | Change |
|------|--------|
| 2026-03-23 | H03 핸드오프 완료 API/UI 구현 및 자동 오너 승계 반영 |
| 2026-02-09 | Add changelog section. |
