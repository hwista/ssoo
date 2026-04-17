-- =========================================================
-- Seed: 17_demo_project_access_context.sql
-- PMS demo project owner/org baseline for runtime access verification
-- =========================================================

begin;

with resolved(project_id, owner_user_id, owner_org_code) as (
  values
    (900001::bigint, 3::bigint, 'DEV'::text),
    (900002::bigint, 2::bigint, 'PM'::text),
    (900003::bigint, 5::bigint, 'SM'::text),
    (900004::bigint, 2::bigint, 'PM'::text),
    (900005::bigint, 5::bigint, 'SM'::text),
    (900006::bigint, 4::bigint, 'SALES'::text)
),
resolved_org as (
  select
    resolved.project_id,
    resolved.owner_user_id,
    org.org_id as owner_org_id
  from resolved
  join common.cm_organization_m org
    on org.org_code = resolved.owner_org_code
   and org.org_type = 'internal'
)
update pms.pr_project_m project
set current_owner_user_id = resolved_org.owner_user_id,
    owner_organization_id = resolved_org.owner_org_id,
    created_by = coalesce(project.created_by, resolved_org.owner_user_id),
    updated_at = current_timestamp,
    last_source = 'SEED',
    last_activity = 'demo_project_access_context'
from resolved_org
where project.project_id = resolved_org.project_id;

commit;
