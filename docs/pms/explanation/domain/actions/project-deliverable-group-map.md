# Action Spec — D01 산출물 템플릿 적용(프로젝트+status)

## 구현 상태

- 상태: ⬜ 미구현 (스펙 문서)
- 최종 검증일: 2026-02-02
- 현재 기준:
  - 산출물 템플릿/그룹 관련 API/화면/서비스 전체 미구현


## 1) 목적
템플릿 그룹 선택으로 프로젝트 산출물 목록 자동 생성

## 2) Actor
- PM(실행), 영업/AM(요청/제안) — 정책 결정

## 3) 입력
- project_id
- status_code(request|proposal|execution|transition)
- deliverable_group_code

## 4) DB 영향
- pr_deliverable_group_item_r_m에서 (group_code=입력값) 산출물 목록 조회
- 각 deliverable_code를 pr_project_deliverable_r_m에 UPSERT
  - 기본 submission_status_code=before_submit

## 5) Validation
- deliverable_code는 pr_deliverable_m에 존재해야 함(논리 검증)

## Changelog

| Date | Change |
|------|--------|
| 2026-02-09 | Add changelog section. |

