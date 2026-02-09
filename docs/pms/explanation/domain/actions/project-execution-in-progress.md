# Action Spec — A05 실행 착수(킥오프/PM 인수: execution in_progress)

## 구현 상태

- 상태: ⬜ 미구현 (스펙 문서)
- 최종 검증일: 2026-02-02
- 현재 기준:
  - 관련 API/화면/서비스 미구현
  - 핸드오프 트랙 미구현


## 1) 목적
PM이 인수하고 실제 수행 시작(킥오프 등) 시점을 기록

## 2) Actor
- PM

## 3) 입력
- project_id
- (선택) actual_start_at, execution goal/owner 등 상세 갱신

## 4) 상태 변경
- pr_project_m: status_code=execution 유지, stage_code=in_progress
- pr_project_m.current_owner_user_id = PM (오너 전환)

## 5) DB 영향
- UPDATE pr_project_m (+ 히스토리)
- UPDATE/UPSERT 프로젝트_스테이터스 상세(execution row) 실제 시작일 등
- (선택) 핸드오프 완료 처리(H03)와 연계 가능

## 6) Validation
- status_code=execution
- stage_code in {waiting, in_progress} (재착수 정책에 따라)

## Changelog

| Date | Change |
|------|--------|
| 2026-02-09 | Add changelog section. |

