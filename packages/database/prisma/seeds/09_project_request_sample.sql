-- =========================================================
-- Seed: 09_project_request_sample.sql
-- 프로젝트 요청 샘플 데이터
-- =========================================================

begin;

insert into pms.pr_project_m (
  project_id,
  project_name,
  status_code,
  stage_code,
  customer_id,
  memo,
  created_by,
  updated_at,
  last_source,
  last_activity
)
values
  (900001, 'LS ERP 고도화', 'request', 'waiting', 1001, '요청: ERP 프로세스 표준화 및 화면 개선', null, CURRENT_TIMESTAMP, 'SEED', 'project_request_sample'),
  (900002, '통합 포털 리뉴얼', 'request', 'in_progress', 1002, '요청: 포털 UI/UX 리뉴얼 및 접근성 개선', null, CURRENT_TIMESTAMP, 'SEED', 'project_request_sample'),
  (900003, '모바일 오더 시스템', 'request', 'waiting', 1003, '요청: 모바일 주문 프로세스 개선', null, CURRENT_TIMESTAMP, 'SEED', 'project_request_sample'),
  (900004, '데이터 레이크 구축', 'request', 'done', 1004, '요청: 데이터 수집/정제 파이프라인 구축', null, CURRENT_TIMESTAMP, 'SEED', 'project_request_sample'),
  (900005, '현장 설비 모니터링', 'request', 'in_progress', 1005, '요청: 실시간 알람 및 대시보드 개선', null, CURRENT_TIMESTAMP, 'SEED', 'project_request_sample'),
  (900006, 'CRM 마이그레이션', 'request', 'waiting', 1006, '요청: 데이터 이관 및 이력 정합성 확보', null, CURRENT_TIMESTAMP, 'SEED', 'project_request_sample')
on conflict (project_id) do nothing;

insert into pms.pr_project_request_d (
  project_id,
  request_source_code,
  request_channel_code,
  request_summary,
  request_received_at,
  request_priority_code,
  request_owner_user_id,
  memo,
  created_by,
  updated_at,
  last_source,
  last_activity
)
values
  (900001, 'RFP', 'email', 'ERP 고도화 범위 및 일정 협의', '2026-02-01', 'high', null, '요청 상세: 프로세스 표준화 범위 확인', null, CURRENT_TIMESTAMP, 'SEED', 'project_request_sample'),
  (900002, 'RFI', 'meeting', '포털 리뉴얼 요구사항 정리', '2026-02-03', 'normal', null, '요청 상세: 사용자 여정 및 IA 재구성', null, CURRENT_TIMESTAMP, 'SEED', 'project_request_sample'),
  (900003, 'RFP', 'phone', '모바일 주문 프로세스 개선', '2026-02-04', 'normal', null, '요청 상세: 주문 단계 단축 및 승인 UX 개선', null, CURRENT_TIMESTAMP, 'SEED', 'project_request_sample'),
  (900004, 'RFP', 'email', '데이터 레이크 PoC 요청', '2026-02-05', 'low', null, '요청 상세: ETL 프로토타입 검증', null, CURRENT_TIMESTAMP, 'SEED', 'project_request_sample'),
  (900005, 'RFI', 'meeting', '설비 모니터링 개선 범위', '2026-02-06', 'high', null, '요청 상세: 알람 임계값 정책 재정의', null, CURRENT_TIMESTAMP, 'SEED', 'project_request_sample'),
  (900006, 'RFP', 'email', 'CRM 데이터 이전 계획', '2026-02-07', 'normal', null, '요청 상세: 이관 대상 필드/마이그레이션 일정 확정', null, CURRENT_TIMESTAMP, 'SEED', 'project_request_sample')
on conflict (project_id) do nothing;

select setval(
  pg_get_serial_sequence('pms.pr_project_m', 'project_id'),
  (select max(project_id) from pms.pr_project_m)
);

commit;
