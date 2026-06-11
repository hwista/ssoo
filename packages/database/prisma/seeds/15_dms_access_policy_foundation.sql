-- =========================================================
-- Seed: 15_dms_access_policy_foundation.sql
-- DMS feature access vocabulary / baseline
-- =========================================================

begin;

insert into common.cm_permission_m (
  permission_code, permission_name, domain_code, permission_axis,
  description, sort_order, is_active, memo,
  last_source, last_activity, updated_at
)
values
  ('dms.document.read', 'DMS 문서 조회', 'dms', 'action', 'DMS 문서와 파일 트리를 조회하는 권한', 300, true, 'DMS access policy seed', 'dms-access-policy-seed', 'seed.dms-access-policy', current_timestamp),
  ('dms.document.write', 'DMS 문서 작성', 'dms', 'action', 'DMS 문서 생성/수정/삭제와 첨부 업로드를 수행하는 권한', 301, true, 'DMS access policy seed', 'dms-access-policy-seed', 'seed.dms-access-policy', current_timestamp),
  ('dms.template.manage', 'DMS 템플릿 관리', 'dms', 'action', 'DMS 템플릿 목록/저장/삭제/변환을 수행하는 권한', 302, true, 'DMS access policy seed', 'dms-access-policy-seed', 'seed.dms-access-policy', current_timestamp),
  ('dms.assistant.use', 'DMS AI 기능 사용', 'dms', 'action', 'DMS AI 대화/검색 보조/문서 작성 보조를 사용하는 권한', 303, true, 'DMS access policy seed', 'dms-access-policy-seed', 'seed.dms-access-policy', current_timestamp),
  ('dms.search.use', 'DMS 검색 사용', 'dms', 'action', 'DMS 검색과 검색 결과 탐색을 사용하는 권한', 304, true, 'DMS access policy seed', 'dms-access-policy-seed', 'seed.dms-access-policy', current_timestamp),
  ('dms.settings.manage', 'DMS 시스템 설정 관리', 'dms', 'action', 'DMS 시스템/운영 설정 변경과 DMS admin control surface 사용 권한', 305, true, 'DMS access policy seed', 'dms-access-policy-seed', 'seed.dms-access-policy', current_timestamp),
  ('dms.storage.manage', 'DMS 외부 저장소 관리', 'dms', 'action', 'DMS 외부 저장소/수집 작업을 관리하는 권한', 306, true, 'DMS access policy seed', 'dms-access-policy-seed', 'seed.dms-access-policy', current_timestamp),
  ('dms.git.use', 'DMS Git 기능 사용', 'dms', 'action', 'DMS Git 변경사항/커밋/복원 기능을 사용하는 권한', 307, true, 'DMS access policy seed', 'dms-access-policy-seed', 'seed.dms-access-policy', current_timestamp)
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
  'Seeded DMS role baseline permission' as memo,
  'dms-access-policy-seed' as last_source,
  'seed.dms-access-policy' as last_activity,
  current_timestamp as updated_at
from (
  values
    ('admin', 'dms.document.read'),
    ('admin', 'dms.document.write'),
    ('admin', 'dms.template.manage'),
    ('admin', 'dms.assistant.use'),
    ('admin', 'dms.search.use'),
    ('admin', 'dms.settings.manage'),
    ('admin', 'dms.storage.manage'),
    ('admin', 'dms.git.use'),
    ('manager', 'dms.document.read'),
    ('manager', 'dms.document.write'),
    ('manager', 'dms.template.manage'),
    ('manager', 'dms.assistant.use'),
    ('manager', 'dms.search.use'),
    ('manager', 'dms.git.use'),
    ('user', 'dms.document.read'),
    ('user', 'dms.document.write'),
    ('user', 'dms.template.manage'),
    ('user', 'dms.assistant.use'),
    ('user', 'dms.search.use'),
    ('viewer', 'dms.document.read'),
    ('viewer', 'dms.search.use')
) as mapping(role_code, permission_code)
join common.cm_role_m r on r.role_code = mapping.role_code
join common.cm_permission_m p on p.permission_code = mapping.permission_code
on conflict (role_id, permission_id) do update
set is_active = true,
    memo = excluded.memo,
    last_source = excluded.last_source,
    last_activity = excluded.last_activity,
    updated_at = current_timestamp;

update common.cm_role_permission_r role_permission
set is_active = false,
    memo = 'DMS system settings are admin-only; personal settings do not require this baseline permission',
    last_source = 'dms-access-policy-seed',
    last_activity = 'seed.dms-access-policy.revoke-non-admin-settings',
    updated_at = current_timestamp
from common.cm_role_m r
join common.cm_permission_m p
  on p.permission_code = 'dms.settings.manage'
where role_permission.role_id = r.role_id
  and role_permission.permission_id = p.permission_id
  and r.role_code <> 'admin'
  and role_permission.is_active = true;

commit;
