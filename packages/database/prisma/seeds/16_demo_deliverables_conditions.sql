-- =========================================================
-- Seed: 16_demo_deliverables_conditions.sql
-- 산출물 마스터 + 프로젝트별 산출물/종료조건
-- =========================================================

begin;

-- ─────────────────────────────────────────────────────────
-- 산출물 마스터 (pr_deliverable_m)
-- ─────────────────────────────────────────────────────────
insert into pms.pr_deliverable_m (deliverable_id, deliverable_code, deliverable_name, description, sort_order, is_active, created_at, updated_at, last_source)
values
  (1, 'DLV-REQ-001', '요구사항 정의서',    '고객 요구사항을 정리한 문서',             1, true, now(), now(), 'SEED'),
  (2, 'DLV-REQ-002', '요청 검토 보고서',   '요청 단계 검토 결과 보고서',              2, true, now(), now(), 'SEED'),
  (3, 'DLV-PRO-001', '제안서',             '고객 제안 문서',                          3, true, now(), now(), 'SEED'),
  (4, 'DLV-PRO-002', '견적서',             '견적 금액 및 상세 내역서',                4, true, now(), now(), 'SEED'),
  (5, 'DLV-PRO-003', '프로젝트 계획서',    '프로젝트 수행 계획 문서',                 5, true, now(), now(), 'SEED'),
  (6, 'DLV-EXE-001', '설계서',             '시스템/화면 설계 문서',                   6, true, now(), now(), 'SEED'),
  (7, 'DLV-EXE-002', '테스트 결과 보고서', '테스트 수행 및 결과 보고서',              7, true, now(), now(), 'SEED'),
  (8, 'DLV-EXE-003', '사용자 매뉴얼',      '최종 사용자 가이드 문서',                 8, true, now(), now(), 'SEED'),
  (9, 'DLV-TRN-001', '인수인계서',         '운영 전환 인수인계 문서',                 9, true, now(), now(), 'SEED'),
  (10,'DLV-TRN-002', '운영 가이드',        '시스템 운영/유지보수 가이드',             10, true, now(), now(), 'SEED')
on conflict (deliverable_id) do nothing;

select setval(
  pg_get_serial_sequence('pms.pr_deliverable_m', 'deliverable_id'),
  greatest(
    (select coalesce(max(deliverable_id),0) from pms.pr_deliverable_m),
    10
  )
);

-- ─────────────────────────────────────────────────────────
-- 프로젝트별 산출물 (pr_project_deliverable_r_m)
-- request 단계: 요구사항 정의서 + 요청 검토 보고서
-- ─────────────────────────────────────────────────────────

-- 900001: 요구사항 정의서(submitted), 요청 검토 보고서(before_submit)
insert into pms.pr_project_deliverable_r_m (project_id, status_code, deliverable_code, submission_status_code, submitted_at, submitted_by, is_active, created_at, updated_at, last_source)
values
  (900001, 'request', 'DLV-REQ-001', 'submitted',     '2026-02-25', 6, true, now(), now(), 'SEED'),
  (900001, 'request', 'DLV-REQ-002', 'before_submit', null,         null, true, now(), now(), 'SEED')
on conflict (project_id, status_code, deliverable_code) do nothing;

-- 900002: 요구사항 정의서(confirmed), 요청 검토 보고서(submitted)
insert into pms.pr_project_deliverable_r_m (project_id, status_code, deliverable_code, submission_status_code, submitted_at, submitted_by, is_active, created_at, updated_at, last_source)
values
  (900002, 'request', 'DLV-REQ-001', 'confirmed',  '2026-02-20', 6, true, now(), now(), 'SEED'),
  (900002, 'request', 'DLV-REQ-002', 'submitted',  '2026-02-22', 2, true, now(), now(), 'SEED')
on conflict (project_id, status_code, deliverable_code) do nothing;

-- 900004 (done 상태): 모두 confirmed
insert into pms.pr_project_deliverable_r_m (project_id, status_code, deliverable_code, submission_status_code, submitted_at, submitted_by, is_active, created_at, updated_at, last_source)
values
  (900004, 'request', 'DLV-REQ-001', 'confirmed', '2026-02-15', 6, true, now(), now(), 'SEED'),
  (900004, 'request', 'DLV-REQ-002', 'confirmed', '2026-02-18', 2, true, now(), now(), 'SEED')
on conflict (project_id, status_code, deliverable_code) do nothing;

-- ─────────────────────────────────────────────────────────
-- 프로젝트별 종료 조건 (pr_project_close_condition_r_m)
-- request 단계: 산출물 제출 + 검수확인
-- ─────────────────────────────────────────────────────────

-- 900001: 산출물 미제출(unchecked), 검수 미완료(unchecked)
insert into pms.pr_project_close_condition_r_m (project_id, status_code, condition_code, requires_deliverable, is_checked, sort_order, is_active, created_at, updated_at, last_source)
values
  (900001, 'request', 'DELIVERABLE_SUBMITTED',       true,  false, 1, true, now(), now(), 'SEED'),
  (900001, 'request', 'CUSTOMER_ACCEPTANCE_SIGNED',  false, false, 2, true, now(), now(), 'SEED')
on conflict (project_id, status_code, condition_code) do nothing;

-- 900002: 산출물 제출(checked), 검수 미완료
insert into pms.pr_project_close_condition_r_m (project_id, status_code, condition_code, requires_deliverable, is_checked, checked_at, checked_by, sort_order, is_active, created_at, updated_at, last_source)
values
  (900002, 'request', 'DELIVERABLE_SUBMITTED',       true,  true, '2026-02-23', 2, 1, true, now(), now(), 'SEED'),
  (900002, 'request', 'CUSTOMER_ACCEPTANCE_SIGNED',  false, false, null, null, 2, true, now(), now(), 'SEED')
on conflict (project_id, status_code, condition_code) do nothing;

-- 900004 (done): 모두 checked
insert into pms.pr_project_close_condition_r_m (project_id, status_code, condition_code, requires_deliverable, is_checked, checked_at, checked_by, sort_order, is_active, created_at, updated_at, last_source)
values
  (900004, 'request', 'DELIVERABLE_SUBMITTED',       true,  true, '2026-02-19', 2, 1, true, now(), now(), 'SEED'),
  (900004, 'request', 'CUSTOMER_ACCEPTANCE_SIGNED',  false, true, '2026-02-20', 2, 2, true, now(), now(), 'SEED')
on conflict (project_id, status_code, condition_code) do nothing;

commit;
