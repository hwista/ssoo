# Workflow Spec — Close Condition Workflow

## 구현 상태

- 상태: ⬜ 미구현 (스펙 문서)
- 최종 검증일: 2026-02-02
- 현재 기준:
  - 종료조건 관련 API/화면/서비스 전체 미구현


## 1. 범위
- pr_project_close_condition_r_m: 종료 조건 체크리스트(프로젝트+status별)
- pr_close_condition_group_m + pr_close_condition_group_item_r_m: 종료조건 템플릿 그룹

## 2. 핵심 규칙(Validation)
- requires_deliverable = true 인 종료 조건은
  - 해당 프로젝트+status의 산출물 제출상태가 “확정(confirmed)”을 만족해야만 `is_checked=true` 허용

## 3. 주요 액션(요약)
- C01. 종료조건 템플릿 적용(프로젝트+status에 조건 자동 생성)
- C02. 종료조건 체크(검증 통과 시)
- C03. 종료조건 체크 해제(옵션)

## Changelog

| Date | Change |
|------|--------|
| 2026-02-09 | Add changelog section. |

