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
  last_source,
  last_activity
)
values
  (900001, 'LS ERP 고도화', 'request', 'waiting', 1001, '요청 테스트 데이터', null, 'SEED', 'project_request_sample'),
  (900002, '통합 포털 리뉴얼', 'request', 'in_progress', 1002, '요청 테스트 데이터', null, 'SEED', 'project_request_sample'),
  (900003, '모바일 오더 시스템', 'request', 'waiting', 1003, '요청 테스트 데이터', null, 'SEED', 'project_request_sample'),
  (900004, '데이터 레이크 구축', 'request', 'done', 1004, '요청 테스트 데이터', null, 'SEED', 'project_request_sample'),
  (900005, '현장 설비 모니터링', 'request', 'in_progress', 1005, '요청 테스트 데이터', null, 'SEED', 'project_request_sample'),
  (900006, 'CRM 마이그레이션', 'request', 'waiting', 1006, '요청 테스트 데이터', null, 'SEED', 'project_request_sample')
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
  last_source,
  last_activity
)
values
  (900001, 'RFP', 'email', 'ERP 고도화 범위 및 일정 협의', '2026-02-01', 'high', null, '요청 상세 테스트 데이터', null, 'SEED', 'project_request_sample'),
  (900002, 'RFI', 'meeting', '포털 리뉴얼 요구사항 정리', '2026-02-03', 'normal', null, '요청 상세 테스트 데이터', null, 'SEED', 'project_request_sample'),
  (900003, 'RFP', 'phone', '모바일 주문 프로세스 개선', '2026-02-04', 'normal', null, '요청 상세 테스트 데이터', null, 'SEED', 'project_request_sample'),
  (900004, 'RFP', 'email', '데이터 레이크 PoC 요청', '2026-02-05', 'low', null, '요청 상세 테스트 데이터', null, 'SEED', 'project_request_sample'),
  (900005, 'RFI', 'meeting', '설비 모니터링 개선 범위', '2026-02-06', 'high', null, '요청 상세 테스트 데이터', null, 'SEED', 'project_request_sample'),
  (900006, 'RFP', 'email', 'CRM 데이터 이전 계획', '2026-02-07', 'normal', null, '요청 상세 테스트 데이터', null, 'SEED', 'project_request_sample')
on conflict (project_id) do nothing;

select setval(
  pg_get_serial_sequence('pms.pr_project_m', 'project_id'),
  (select max(project_id) from pms.pr_project_m)
);

commit;
