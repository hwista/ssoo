# 프로젝트 사용자 설정 저장 계약

> 2026-09-17 · 승인-13

`pms.pr_user_settings_m`은 로그인 계정별 프로젝트 사용 설정을 저장한다. `user_id`의 고유 인덱스로 계정당 한 행을 보장하며 common 사용자 테이블과 새 교차 스키마 외래키를 만들지 않는다. `pms.pr_user_settings_h`와 `trg_pr_user_settings_m_h_record`는 생성·수정·삭제 이력을 기록한다.

| 필드 | 기본값·제약 |
|---|---|
| show_completed_tasks | true |
| default_project_view | board, list, timeline 중 하나. 기본 board, 데이터베이스 check 적용 |
| notify_task_assignment | true |
| notify_issue_update | true |

감사 필드는 기존 공통 열 확장을 적용한다. 클라이언트는 `GET /api/pms/settings`, `PATCH /api/pms/settings`를 호출하고 계정 식별자는 인증 사용자에서만 얻는다. 변경은 네 옵션의 부분 수정이며 임의 계정·추가 필드·null·잘못된 열거 값을 거부한다.

설정 수정과 알림 생성은 사용자별 트랜잭션 잠금을 공유한다. 여러 수신자는 식별자 순서대로 잠근다. 작업·이슈 수정은 해당 업무 행을 잠근 뒤 실제 이전 값과 비교한다. 알림은 업무 변경과 같은 트랜잭션에 기록하고 커밋 후 실시간 전달한다. 실시간 전달이 끊겨도 저장된 알림은 기존 목록에서 조회할 수 있다.

Launch migration: `20260917100000_add_pms_user_settings`. 기존 설치 이력은 수정하지 않았다. 전체 설치 기준은 migration 12개·애플리케이션 trigger 84개다. 신규 운영 배포 시 migration → trigger → runtime 검증 순서를 유지한다. 빈 데이터베이스와 데이터가 있는 백업 복원 검증에서 schema drift 0을 확인했다. 이번 적용 대상은 격리된 로컬 검토 환경이며 운영 배포를 수행하지 않았다.

- [사용 가이드](../../../pms/guides/project-settings.md)
