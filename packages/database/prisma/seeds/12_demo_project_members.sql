-- =========================================================
-- Seed: 12_demo_project_members.sql
-- 프로젝트별 멤버 배정 (3~5명씩)
-- =========================================================

begin;

-- ─────────────────────────────────────────────────────────
-- 900001: LS ERP 고도화 — PM(김프로), AM(박영업), 개발(이개발), 컨설턴트(정컨설)
-- ─────────────────────────────────────────────────────────
insert into pms.pr_project_member_r_m (project_id, user_id, role_code, assigned_at, allocation_rate, sort_order, is_active, created_at, updated_at, last_source, last_activity)
values
  (900001, 2, 'pm',         '2026-02-01', 80,  1, true, now(), now(), 'SEED', 'demo_seed'),
  (900001, 4, 'am',         '2026-02-01', 30,  2, true, now(), now(), 'SEED', 'demo_seed'),
  (900001, 3, 'developer',  '2026-02-01', 100, 3, true, now(), now(), 'SEED', 'demo_seed'),
  (900001, 6, 'consultant', '2026-02-01', 50,  4, true, now(), now(), 'SEED', 'demo_seed')
on conflict do nothing;

-- ─────────────────────────────────────────────────────────
-- 900002: 통합 포털 리뉴얼 — PM(김프로), 개발(이개발), AM(박영업)
-- ─────────────────────────────────────────────────────────
insert into pms.pr_project_member_r_m (project_id, user_id, role_code, assigned_at, allocation_rate, sort_order, is_active, created_at, updated_at, last_source, last_activity)
values
  (900002, 2, 'pm',        '2026-02-03', 60,  1, true, now(), now(), 'SEED', 'demo_seed'),
  (900002, 3, 'developer', '2026-02-03', 100, 2, true, now(), now(), 'SEED', 'demo_seed'),
  (900002, 4, 'am',        '2026-02-03', 20,  3, true, now(), now(), 'SEED', 'demo_seed')
on conflict do nothing;

-- ─────────────────────────────────────────────────────────
-- 900003: 모바일 오더 시스템 — PM(김프로), 개발(이개발), SM(최서비), 컨설(정컨설)
-- ─────────────────────────────────────────────────────────
insert into pms.pr_project_member_r_m (project_id, user_id, role_code, assigned_at, allocation_rate, sort_order, is_active, created_at, updated_at, last_source, last_activity)
values
  (900003, 2, 'pm',         '2026-02-04', 40,  1, true, now(), now(), 'SEED', 'demo_seed'),
  (900003, 3, 'developer',  '2026-02-04', 80,  2, true, now(), now(), 'SEED', 'demo_seed'),
  (900003, 5, 'sm',         '2026-02-04', 30,  3, true, now(), now(), 'SEED', 'demo_seed'),
  (900003, 6, 'consultant', '2026-02-04', 40,  4, true, now(), now(), 'SEED', 'demo_seed')
on conflict do nothing;

-- ─────────────────────────────────────────────────────────
-- 900004: 데이터 레이크 구축 — PM(김프로), 개발(이개발), AM(박영업), SM(최서비), 컨설(정컨설)
-- ─────────────────────────────────────────────────────────
insert into pms.pr_project_member_r_m (project_id, user_id, role_code, assigned_at, allocation_rate, sort_order, is_active, created_at, updated_at, last_source, last_activity)
values
  (900004, 2, 'pm',         '2026-02-05', 50,  1, true, now(), now(), 'SEED', 'demo_seed'),
  (900004, 3, 'developer',  '2026-02-05', 100, 2, true, now(), now(), 'SEED', 'demo_seed'),
  (900004, 4, 'am',         '2026-02-05', 20,  3, true, now(), now(), 'SEED', 'demo_seed'),
  (900004, 5, 'sm',         '2026-02-05', 30,  4, true, now(), now(), 'SEED', 'demo_seed'),
  (900004, 6, 'consultant', '2026-02-05', 60,  5, true, now(), now(), 'SEED', 'demo_seed')
on conflict do nothing;

-- ─────────────────────────────────────────────────────────
-- 900005: 현장 설비 모니터링 — PM(김프로), 개발(이개발), SM(최서비)
-- ─────────────────────────────────────────────────────────
insert into pms.pr_project_member_r_m (project_id, user_id, role_code, assigned_at, allocation_rate, sort_order, is_active, created_at, updated_at, last_source, last_activity)
values
  (900005, 2, 'pm',        '2026-02-06', 60,  1, true, now(), now(), 'SEED', 'demo_seed'),
  (900005, 3, 'developer', '2026-02-06', 100, 2, true, now(), now(), 'SEED', 'demo_seed'),
  (900005, 5, 'sm',        '2026-02-06', 50,  3, true, now(), now(), 'SEED', 'demo_seed')
on conflict do nothing;

-- ─────────────────────────────────────────────────────────
-- 900006: CRM 마이그레이션 — PM(김프로), AM(박영업), 개발(이개발), 컨설(정컨설)
-- ─────────────────────────────────────────────────────────
insert into pms.pr_project_member_r_m (project_id, user_id, role_code, assigned_at, allocation_rate, sort_order, is_active, created_at, updated_at, last_source, last_activity)
values
  (900006, 2, 'pm',         '2026-02-07', 40,  1, true, now(), now(), 'SEED', 'demo_seed'),
  (900006, 4, 'am',         '2026-02-07', 30,  2, true, now(), now(), 'SEED', 'demo_seed'),
  (900006, 3, 'developer',  '2026-02-07', 80,  3, true, now(), now(), 'SEED', 'demo_seed'),
  (900006, 6, 'consultant', '2026-02-07', 50,  4, true, now(), now(), 'SEED', 'demo_seed')
on conflict do nothing;

commit;
