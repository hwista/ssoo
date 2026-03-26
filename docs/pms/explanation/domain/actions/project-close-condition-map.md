# Action Spec — C01 종료조건 템플릿 적용(프로젝트+status)

## 구현 상태

- 상태: ⬜ 미구현 (스펙 문서)
- 최종 검증일: 2026-02-02
- 현재 기준:
  - 종료조건 템플릿/그룹 관련 API/화면/서비스 전체 미구현


## 1) 목적
템플릿 그룹 선택으로 종료조건 체크리스트 자동 생성

## 2) Actor
- PM(실행), 영업/AM(요청/제안) — 정책 결정

## 3) 입력
- project_id
- status_code(request|proposal|execution|transition)
- close_condition_group_code (템플릿 그룹 코드)

## 4) DB 영향(권장 로직)
- pr_close_condition_group_item_r_m에서 (group_code=입력값) 목록 조회
- 각 condition_code를 pr_project_close_condition_r_m에 UPSERT
  - 기본: is_checked=false, requires_deliverable=템플릿/정책값(초기엔 수동 설정 가능)

## 5) Validation
- 해당 status_code row가 존재해야 함(프로젝트_스테이터스 row)
- 기존 생성된 조건이 있을 경우 덮어쓰기 정책(append/replace) 결정 필요

## Changelog

| Date | Change |
|------|--------|
| 2026-02-09 | Add changelog section. |

