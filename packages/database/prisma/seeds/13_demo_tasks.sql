-- =========================================================
-- Seed: 13_demo_tasks.sql
-- 프로젝트별 태스크 (WBS 계층 구조)
-- =========================================================

begin;

-- ─────────────────────────────────────────────────────────
-- 900001: LS ERP 고도화 — 분석/설계/개발 WBS
-- ─────────────────────────────────────────────────────────

-- Level 1: 단계
insert into pms.pr_task_m (task_id, project_id, parent_task_id, task_code, task_name, task_type_code, status_code, priority_code, assignee_user_id, planned_start_at, planned_end_at, progress_rate, depth, sort_order, is_active, created_at, updated_at, last_source)
values
  (1001, 900001, null,  'T1-001', '요구사항 분석',  'analysis',    'completed',   'high',   2, '2026-02-10', '2026-02-28', 100, 0, 1,  true, now(), now(), 'SEED'),
  (1002, 900001, null,  'T1-002', '시스템 설계',    'design',      'in_progress', 'high',   2, '2026-03-01', '2026-03-31', 60,  0, 2,  true, now(), now(), 'SEED'),
  (1003, 900001, null,  'T1-003', '개발',           'development', 'not_started', 'normal', 3, '2026-04-01', '2026-06-30', 0,   0, 3,  true, now(), now(), 'SEED')
on conflict (task_id) do nothing;

-- Level 2: 세부 태스크 (T1-001 하위)
insert into pms.pr_task_m (task_id, project_id, parent_task_id, task_code, task_name, task_type_code, status_code, priority_code, assignee_user_id, planned_start_at, planned_end_at, progress_rate, depth, sort_order, is_active, created_at, updated_at, last_source)
values
  (1011, 900001, 1001, 'T1-001-1', '현행 프로세스 분석',   'analysis', 'completed', 'high', 6, '2026-02-10', '2026-02-17', 100, 1, 1, true, now(), now(), 'SEED'),
  (1012, 900001, 1001, 'T1-001-2', 'To-Be 프로세스 설계',  'analysis', 'completed', 'high', 6, '2026-02-17', '2026-02-28', 100, 1, 2, true, now(), now(), 'SEED')
on conflict (task_id) do nothing;

-- Level 2: 세부 태스크 (T1-002 하위)
insert into pms.pr_task_m (task_id, project_id, parent_task_id, task_code, task_name, task_type_code, status_code, priority_code, assignee_user_id, planned_start_at, planned_end_at, progress_rate, depth, sort_order, is_active, created_at, updated_at, last_source)
values
  (1021, 900001, 1002, 'T1-002-1', 'DB 설계',      'design', 'completed',   'high',   3, '2026-03-01', '2026-03-10', 100, 1, 1, true, now(), now(), 'SEED'),
  (1022, 900001, 1002, 'T1-002-2', '화면 설계',    'design', 'in_progress', 'normal', 3, '2026-03-10', '2026-03-20', 40,  1, 2, true, now(), now(), 'SEED'),
  (1023, 900001, 1002, 'T1-002-3', 'API 설계',     'design', 'not_started', 'normal', 3, '2026-03-20', '2026-03-31', 0,   1, 3, true, now(), now(), 'SEED')
on conflict (task_id) do nothing;

-- ─────────────────────────────────────────────────────────
-- 900002: 통합 포털 리뉴얼 — UX/프론트/백엔드
-- ─────────────────────────────────────────────────────────
insert into pms.pr_task_m (task_id, project_id, parent_task_id, task_code, task_name, task_type_code, status_code, priority_code, assignee_user_id, planned_start_at, planned_end_at, progress_rate, depth, sort_order, is_active, created_at, updated_at, last_source)
values
  (2001, 900002, null, 'T2-001', 'UX 리서치',       'analysis',    'completed',   'high',   6, '2026-02-10', '2026-02-25', 100, 0, 1, true, now(), now(), 'SEED'),
  (2002, 900002, null, 'T2-002', '프론트엔드 개발', 'development', 'in_progress', 'high',   3, '2026-02-25', '2026-04-15', 35,  0, 2, true, now(), now(), 'SEED'),
  (2003, 900002, null, 'T2-003', 'API 개발',        'development', 'in_progress', 'normal', 3, '2026-03-01', '2026-04-30', 20,  0, 3, true, now(), now(), 'SEED'),
  (2004, 900002, null, 'T2-004', '통합 테스트',     'test',        'not_started', 'normal', 3, '2026-05-01', '2026-05-20', 0,   0, 4, true, now(), now(), 'SEED')
on conflict (task_id) do nothing;

-- ─────────────────────────────────────────────────────────
-- 900003: 모바일 오더 — 요구분석/설계/개발
-- ─────────────────────────────────────────────────────────
insert into pms.pr_task_m (task_id, project_id, parent_task_id, task_code, task_name, task_type_code, status_code, priority_code, assignee_user_id, planned_start_at, planned_end_at, progress_rate, depth, sort_order, is_active, created_at, updated_at, last_source)
values
  (3001, 900003, null, 'T3-001', '주문 프로세스 분석', 'analysis',    'in_progress', 'high',   6, '2026-02-15', '2026-03-05', 70,  0, 1, true, now(), now(), 'SEED'),
  (3002, 900003, null, 'T3-002', '모바일 UI 설계',     'design',      'not_started', 'normal', 3, '2026-03-05', '2026-03-25', 0,   0, 2, true, now(), now(), 'SEED'),
  (3003, 900003, null, 'T3-003', '앱 개발',            'development', 'not_started', 'normal', 3, '2026-03-25', '2026-05-30', 0,   0, 3, true, now(), now(), 'SEED')
on conflict (task_id) do nothing;

-- ─────────────────────────────────────────────────────────
-- 900004: 데이터 레이크 — ETL/검증/배포
-- ─────────────────────────────────────────────────────────
insert into pms.pr_task_m (task_id, project_id, parent_task_id, task_code, task_name, task_type_code, status_code, priority_code, assignee_user_id, planned_start_at, planned_end_at, progress_rate, depth, sort_order, is_active, created_at, updated_at, last_source)
values
  (4001, 900004, null,  'T4-001', '데이터 소스 분석',  'analysis',    'completed',   'high',   6, '2026-02-10', '2026-02-28', 100, 0, 1, true, now(), now(), 'SEED'),
  (4002, 900004, null,  'T4-002', 'ETL 파이프라인 개발','development','in_progress', 'high',   3, '2026-03-01', '2026-04-15', 50,  0, 2, true, now(), now(), 'SEED'),
  (4003, 900004, null,  'T4-003', '데이터 품질 검증',  'test',        'not_started', 'normal', 3, '2026-04-15', '2026-05-10', 0,   0, 3, true, now(), now(), 'SEED'),
  (4004, 900004, null,  'T4-004', '운영 배포',         'deployment',  'not_started', 'normal', 5, '2026-05-10', '2026-05-30', 0,   0, 4, true, now(), now(), 'SEED')
on conflict (task_id) do nothing;

-- Level 2 for 900004 T4-002
insert into pms.pr_task_m (task_id, project_id, parent_task_id, task_code, task_name, task_type_code, status_code, priority_code, assignee_user_id, planned_start_at, planned_end_at, progress_rate, depth, sort_order, is_active, created_at, updated_at, last_source)
values
  (4021, 900004, 4002, 'T4-002-1', '수집 모듈 개발',   'development', 'completed',   'high',   3, '2026-03-01', '2026-03-15', 100, 1, 1, true, now(), now(), 'SEED'),
  (4022, 900004, 4002, 'T4-002-2', '정제 모듈 개발',   'development', 'in_progress', 'normal', 3, '2026-03-15', '2026-04-01', 60,  1, 2, true, now(), now(), 'SEED'),
  (4023, 900004, 4002, 'T4-002-3', '적재 모듈 개발',   'development', 'not_started', 'normal', 3, '2026-04-01', '2026-04-15', 0,   1, 3, true, now(), now(), 'SEED')
on conflict (task_id) do nothing;

-- ─────────────────────────────────────────────────────────
-- 900005: 현장 설비 모니터링 — 센서/대시보드/알람
-- ─────────────────────────────────────────────────────────
insert into pms.pr_task_m (task_id, project_id, parent_task_id, task_code, task_name, task_type_code, status_code, priority_code, assignee_user_id, planned_start_at, planned_end_at, progress_rate, depth, sort_order, is_active, created_at, updated_at, last_source)
values
  (5001, 900005, null, 'T5-001', '센서 데이터 연동',    'development', 'in_progress', 'high',   3, '2026-02-15', '2026-03-15', 45,  0, 1, true, now(), now(), 'SEED'),
  (5002, 900005, null, 'T5-002', '실시간 대시보드 개발','development', 'not_started', 'high',   3, '2026-03-15', '2026-04-30', 0,   0, 2, true, now(), now(), 'SEED'),
  (5003, 900005, null, 'T5-003', '알람 정책 설정',      'management',  'not_started', 'normal', 5, '2026-04-15', '2026-05-15', 0,   0, 3, true, now(), now(), 'SEED')
on conflict (task_id) do nothing;

-- ─────────────────────────────────────────────────────────
-- 900006: CRM 마이그레이션 — 분석/매핑/이관/검증
-- ─────────────────────────────────────────────────────────
insert into pms.pr_task_m (task_id, project_id, parent_task_id, task_code, task_name, task_type_code, status_code, priority_code, assignee_user_id, planned_start_at, planned_end_at, progress_rate, depth, sort_order, is_active, created_at, updated_at, last_source)
values
  (6001, 900006, null, 'T6-001', '현행 CRM 데이터 분석','analysis',    'completed',   'high',   6, '2026-02-10', '2026-02-28', 100, 0, 1, true, now(), now(), 'SEED'),
  (6002, 900006, null, 'T6-002', '데이터 매핑 설계',    'design',      'in_progress', 'high',   3, '2026-03-01', '2026-03-20', 80,  0, 2, true, now(), now(), 'SEED'),
  (6003, 900006, null, 'T6-003', '이관 스크립트 개발',  'development', 'not_started', 'normal', 3, '2026-03-20', '2026-04-15', 0,   0, 3, true, now(), now(), 'SEED'),
  (6004, 900006, null, 'T6-004', '정합성 검증',         'test',        'not_started', 'high',   3, '2026-04-15', '2026-05-10', 0,   0, 4, true, now(), now(), 'SEED')
on conflict (task_id) do nothing;

-- Reset sequence
select setval(
  pg_get_serial_sequence('pms.pr_task_m', 'task_id'),
  greatest(
    (select coalesce(max(task_id),0) from pms.pr_task_m),
    6004
  )
);

commit;
