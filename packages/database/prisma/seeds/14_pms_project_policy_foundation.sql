-- =========================================================
-- Seed: 14_pms_project_policy_foundation.sql
-- PMS project object policy vocabulary / baseline
-- =========================================================

begin;

insert into common.cm_permission_m (
  permission_code, permission_name, domain_code, permission_axis,
  description, sort_order, is_active, memo,
  last_source, last_activity, updated_at
)
values
  ('pms.project.manage', 'PMS 프로젝트 기본 정보 관리', 'pms', 'action', '프로젝트 기본 정보와 상태 상세를 수정하는 권한', 130, true, 'PMS project policy seed', 'pms-project-policy-seed', 'seed.pms-project-policy', current_timestamp),
  ('pms.project.member.manage', 'PMS 프로젝트 멤버 관리', 'pms', 'action', '프로젝트 멤버를 추가/수정/삭제하는 권한', 131, true, 'PMS project policy seed', 'pms-project-policy-seed', 'seed.pms-project-policy', current_timestamp),
  ('pms.project.work.manage', 'PMS 프로젝트 작업 관리', 'pms', 'action', '프로젝트 태스크/마일스톤/이슈를 관리하는 권한', 132, true, 'PMS project policy seed', 'pms-project-policy-seed', 'seed.pms-project-policy', current_timestamp),
  ('pms.project.deliverable.manage', 'PMS 프로젝트 산출물 관리', 'pms', 'action', '프로젝트 산출물을 등록/수정/삭제하는 권한', 133, true, 'PMS project policy seed', 'pms-project-policy-seed', 'seed.pms-project-policy', current_timestamp),
  ('pms.project.close-condition.manage', 'PMS 프로젝트 종료조건 관리', 'pms', 'action', '프로젝트 종료조건을 등록/수정/삭제하는 권한', 134, true, 'PMS project policy seed', 'pms-project-policy-seed', 'seed.pms-project-policy', current_timestamp),
  ('pms.project.stage.advance', 'PMS 프로젝트 단계 진행', 'pms', 'action', '프로젝트 단계를 시작/완료/전이하는 권한', 135, true, 'PMS project policy seed', 'pms-project-policy-seed', 'seed.pms-project-policy', current_timestamp)
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
  'Seeded admin PMS project policy permission' as memo,
  'pms-project-policy-seed' as last_source,
  'seed.pms-project-policy' as last_activity,
  current_timestamp as updated_at
from common.cm_role_m r
join common.cm_permission_m p
  on p.permission_code in (
    'pms.project.manage',
    'pms.project.member.manage',
    'pms.project.work.manage',
    'pms.project.deliverable.manage',
    'pms.project.close-condition.manage',
    'pms.project.stage.advance'
  )
where r.role_code = 'admin'
on conflict (role_id, permission_id) do update
set is_active = true,
    memo = excluded.memo,
    last_source = excluded.last_source,
    last_activity = excluded.last_activity,
    updated_at = current_timestamp;

insert into pms.pr_project_role_permission_r (
  role_code, permission_id, is_active, memo, last_source, last_activity, updated_at
)
select
  mapping.role_code,
  p.permission_id,
  true as is_active,
  'Seeded PMS project role capability baseline' as memo,
  'pms-project-policy-seed' as last_source,
  'seed.pms-project-policy' as last_activity,
  current_timestamp as updated_at
from (
  values
    ('pm', 'pms.project.manage'),
    ('pm', 'pms.project.member.manage'),
    ('pm', 'pms.project.work.manage'),
    ('pm', 'pms.project.deliverable.manage'),
    ('pm', 'pms.project.close-condition.manage'),
    ('pm', 'pms.project.stage.advance'),
    ('pmo', 'pms.project.manage'),
    ('pmo', 'pms.project.member.manage'),
    ('pmo', 'pms.project.work.manage'),
    ('pmo', 'pms.project.deliverable.manage'),
    ('pmo', 'pms.project.close-condition.manage'),
    ('pmo', 'pms.project.stage.advance'),
    ('am', 'pms.project.manage'),
    ('am', 'pms.project.deliverable.manage'),
    ('am', 'pms.project.close-condition.manage'),
    ('am', 'pms.project.stage.advance'),
    ('sm', 'pms.project.manage'),
    ('sm', 'pms.project.deliverable.manage'),
    ('sm', 'pms.project.close-condition.manage'),
    ('sm', 'pms.project.stage.advance'),
    ('developer', 'pms.project.work.manage'),
    ('consultant', 'pms.project.work.manage'),
    ('architect', 'pms.project.work.manage'),
    ('qa', 'pms.project.work.manage'),
    ('reviewer', 'pms.project.deliverable.manage'),
    ('reviewer', 'pms.project.close-condition.manage')
) as mapping(role_code, permission_code)
join common.cm_permission_m p on p.permission_code = mapping.permission_code
on conflict (role_code, permission_id) do update
set is_active = true,
    memo = excluded.memo,
    last_source = excluded.last_source,
    last_activity = excluded.last_activity,
    updated_at = current_timestamp;

with resolved_owner_org as (
  select
    p.project_id,
    coalesce(owner_org.org_id, creator_org.org_id) as owner_org_id
  from pms.pr_project_m p
  left join lateral (
    select uor.org_id
    from common.cm_user_org_r uor
    where uor.user_id = p.current_owner_user_id
      and uor.is_active = true
    order by uor.is_primary desc, uor.updated_at desc
    limit 1
  ) owner_org on true
  left join lateral (
    select uor.org_id
    from common.cm_user_org_r uor
    where uor.user_id = p.created_by
      and uor.is_active = true
    order by uor.is_primary desc, uor.updated_at desc
    limit 1
  ) creator_org on true
)
update pms.pr_project_m project
set owner_organization_id = resolved_owner_org.owner_org_id,
    updated_at = current_timestamp
from resolved_owner_org
where project.project_id = resolved_owner_org.project_id
  and resolved_owner_org.owner_org_id is not null
  and project.owner_organization_id is distinct from resolved_owner_org.owner_org_id;

commit;
