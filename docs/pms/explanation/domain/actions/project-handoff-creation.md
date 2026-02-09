# Action Spec — H01 핸드오프 생성

## 구현 상태

- 상태: ⬜ 미구현 (스펙 문서)
- 최종 검증일: 2026-02-02
- 현재 기준:
  - 핸드오프 관련 API/화면/서비스 전체 미구현
  - pr_project_m에 handoff 컬럼은 스키마에 정의되어 있음


## 1) 목적
역할 간 인계 요청 생성(대상자 지정 + 타입 지정)

## 2) Actor
- 현재 오너(영업/AM/PM)

## 3) 입력
- project_id
- handoff_type_code
- handoff_user_id(수신자)

## 4) 상태 변경
- pr_project_m:
  - handoff_type_code=입력
  - handoff_stage_code=waiting
  - handoff_user_id=입력

## 5) DB 영향
- UPDATE pr_project_m (+ 히스토리)

## 6) Validation
- handoff_user_id 필수
- handoff_type_code 유효값(코드 정책)

## Changelog

| Date | Change |
|------|--------|
| 2026-02-09 | Add changelog section. |

