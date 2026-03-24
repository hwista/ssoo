# Action Spec — H02 핸드오프 수락/착수

## 구현 상태

- 상태: ✅ 구현됨
- 최종 검증일: 2026-03-23
- 현재 기준:
  - `POST /projects/:id/handoffs/confirm` 구현
  - 수신자 본인만 수락 가능


## 1) 목적
수신자가 인계를 수락하여 진행 단계로 전환

## 2) Actor
- handoff_user_id(수신자)

## 3) 입력
- project_id

## 4) 상태 변경
- pr_project_m.handoff_stage_code=in_progress

## 5) DB 영향
- UPDATE pr_project_m (+ 히스토리)

## 6) Validation
- 현재 handoff_stage_code=waiting
- 요청자가 아닌 수신자만 수행 가능

## Changelog

| Date | Change |
|------|--------|
| 2026-03-23 | H02 핸드오프 수락 API/UI 구현 |
| 2026-02-09 | Add changelog section. |
