-- =========================================================
-- Seed: 13_permission_foundation.sql
-- common permission / role foundation vocabulary
-- =========================================================

begin;

insert into common.cm_role_m (
  role_code, role_name, role_scope_code, description, sort_order,
  is_active, memo, last_source, last_activity, updated_at
)
select
  c.code_value,
  c.display_name_ko,
  'system' as role_scope_code,
  c.description,
  c.sort_order,
  c.is_active,
  'Backfilled from USER_ROLE code master' as memo,
  'legacy-role-bridge' as last_source,
  'seed.permission-foundation' as last_activity,
  current_timestamp as updated_at
from pms.cm_code_m c
where c.code_group = 'USER_ROLE'
on conflict (role_code) do update
set role_name = excluded.role_name,
    role_scope_code = excluded.role_scope_code,
    description = excluded.description,
    sort_order = excluded.sort_order,
    is_active = excluded.is_active,
    memo = excluded.memo,
    last_source = excluded.last_source,
    last_activity = excluded.last_activity,
    updated_at = current_timestamp;

insert into common.cm_permission_m (
  permission_code, permission_name, domain_code, permission_axis,
  description, sort_order, is_active, memo,
  last_source, last_activity, updated_at
)
values
  ('system.override', '시스템 관리자 override', 'common', 'action', '도메인 권한 계산을 우회하는 시스템 관리자 override 권한', 10, true, 'Permission foundation seed', 'permission-foundation-seed', 'seed.permission-foundation', current_timestamp),
  ('common.user.manage', '사용자 관리', 'common', 'action', '공통 사용자 및 계정 관리 권한', 20, true, 'Permission foundation seed', 'permission-foundation-seed', 'seed.permission-foundation', current_timestamp),
  ('pms.code.manage', 'PMS 코드 관리', 'pms', 'action', 'PMS 코드 마스터 관리 권한', 100, true, 'Permission foundation seed', 'permission-foundation-seed', 'seed.permission-foundation', current_timestamp),
  ('pms.customer.manage', 'PMS 고객사 관리', 'pms', 'action', 'PMS 고객사 관리 권한', 110, true, 'Permission foundation seed', 'permission-foundation-seed', 'seed.permission-foundation', current_timestamp),
  ('pms.menu.manage', 'PMS 메뉴 권한 관리', 'pms', 'action', 'PMS 메뉴/역할 권한 관리 권한', 120, true, 'Permission foundation seed', 'permission-foundation-seed', 'seed.permission-foundation', current_timestamp),
  ('cms.board.manage', 'CMS 게시판 관리', 'cms', 'action', 'CMS 게시판 관리 권한', 200, true, 'Permission foundation seed', 'permission-foundation-seed', 'seed.permission-foundation', current_timestamp),
  ('cms.skill.manage', 'CMS 스킬 관리', 'cms', 'action', 'CMS 스킬 관리 권한', 210, true, 'Permission foundation seed', 'permission-foundation-seed', 'seed.permission-foundation', current_timestamp)
on conflict (permission_code) do update
set permission_name = excluded.permission_name,
    domain_code = excluded.domain_code,
    permission_axis = excluded.permission_axis,
    description = excluded.description,
    sort_order = excluded.sort_order,
    is_active = excluded.is_active,
    memo = excluded.memo,
    last_source = excluded.last_source,
    last_activity = excluded.last_activity,
    updated_at = current_timestamp;

insert into common.cm_role_permission_r (
  role_id, permission_id, is_active, memo, last_source, last_activity, updated_at
)
select
  r.role_id,
  p.permission_id,
  true as is_active,
  'Seeded admin baseline permission' as memo,
  'permission-foundation-seed' as last_source,
  'seed.permission-foundation' as last_activity,
  current_timestamp as updated_at
from common.cm_role_m r
join common.cm_permission_m p
  on p.permission_code in (
    'system.override',
    'common.user.manage',
    'pms.code.manage',
    'pms.customer.manage',
    'pms.menu.manage',
    'cms.board.manage',
    'cms.skill.manage'
  )
where r.role_code = 'admin'
on conflict (role_id, permission_id) do update
set is_active = true,
    memo = excluded.memo,
    last_source = excluded.last_source,
    last_activity = excluded.last_activity,
    updated_at = current_timestamp;

commit;
