-- =========================================================
-- Seed: 12_org_foundation_bridge.sql
-- legacy cm_user_m / cm_customer_m 기준 org foundation bridge backfill
-- =========================================================

begin;

insert into common.cm_organization_m (
  org_code, org_name, org_type, is_active,
  memo, last_source, last_activity, updated_at
)
select distinct
  trim(u.department_code) as org_code,
  trim(u.department_code) as org_name,
  'internal' as org_type,
  true as is_active,
  'Legacy department bridge organization' as memo,
  'legacy-user-bridge' as last_source,
  'user.service.sync-organization-foundation' as last_activity,
  current_timestamp as updated_at
from common.cm_user_m u
where u.department_code is not null
  and trim(u.department_code) <> ''
on conflict (org_code) do update
set org_name = excluded.org_name,
    org_type = excluded.org_type,
    is_active = true,
    memo = excluded.memo,
    last_source = excluded.last_source,
    last_activity = excluded.last_activity,
    updated_at = current_timestamp;

insert into common.cm_organization_m (
  org_code, org_name, org_type, is_active,
  memo, last_source, last_activity, updated_at
)
select
  c.customer_code as org_code,
  c.customer_name as org_name,
  'external' as org_type,
  coalesce(c.is_active, true) as is_active,
  'Backfilled from legacy customer organization' as memo,
  'legacy-user-bridge' as last_source,
  'user.service.sync-organization-foundation' as last_activity,
  current_timestamp as updated_at
from pms.cm_customer_m c
on conflict (org_code) do update
set org_name = excluded.org_name,
    org_type = excluded.org_type,
    is_active = excluded.is_active,
    memo = excluded.memo,
    last_source = excluded.last_source,
    last_activity = excluded.last_activity,
    updated_at = current_timestamp;

insert into common.cm_organization_m (
  org_code, org_name, org_type, is_active,
  memo, last_source, last_activity, updated_at
)
select distinct
  'EXT-' || coalesce(nullif(regexp_replace(upper(trim(u.company_name)), '[^A-Z0-9]+', '-', 'g'), ''), 'UNKNOWN') as org_code,
  trim(u.company_name) as org_name,
  'external' as org_type,
  true as is_active,
  'Backfilled from legacy company affiliation' as memo,
  'legacy-user-bridge' as last_source,
  'user.service.sync-organization-foundation' as last_activity,
  current_timestamp as updated_at
from common.cm_user_m u
where u.customer_id is null
  and u.company_name is not null
  and trim(u.company_name) <> ''
on conflict (org_code) do update
set org_name = excluded.org_name,
    org_type = excluded.org_type,
    is_active = true,
    memo = excluded.memo,
    last_source = excluded.last_source,
    last_activity = excluded.last_activity,
    updated_at = current_timestamp;

delete from common.cm_user_org_r
where memo like 'Backfilled from legacy%';

insert into common.cm_user_org_r (
  user_id, org_id, is_primary, affiliation_role, position_code, employee_number,
  effective_from, effective_to, is_active, memo,
  last_source, last_activity, updated_at
)
select
  u.user_id,
  o.org_id,
  true as is_primary,
  'internal' as affiliation_role,
  nullif(trim(u.position_code), '') as position_code,
  nullif(trim(u.employee_number), '') as employee_number,
  null as effective_from,
  null as effective_to,
  coalesce(u.is_active, true) as is_active,
  'Backfilled from legacy internal affiliation' as memo,
  'legacy-user-bridge' as last_source,
  'user.service.sync-organization-foundation' as last_activity,
  current_timestamp as updated_at
from common.cm_user_m u
join common.cm_organization_m o
  on o.org_code = trim(u.department_code)
 and o.org_type = 'internal'
where u.department_code is not null
  and trim(u.department_code) <> '';

insert into common.cm_user_org_r (
  user_id, org_id, is_primary, affiliation_role, position_code, employee_number,
  effective_from, effective_to, is_active, memo,
  last_source, last_activity, updated_at
)
select
  u.user_id,
  o.org_id,
  case
    when u.department_code is null or trim(coalesce(u.department_code, '')) = '' then true
    else false
  end as is_primary,
  'external' as affiliation_role,
  nullif(trim(u.position_code), '') as position_code,
  nullif(trim(u.employee_number), '') as employee_number,
  null as effective_from,
  null as effective_to,
  coalesce(u.is_active, true) as is_active,
  case
    when c.customer_id is not null then 'Backfilled from legacy external customer affiliation'
    else 'Backfilled from legacy external company affiliation'
  end as memo,
  'legacy-user-bridge' as last_source,
  'user.service.sync-organization-foundation' as last_activity,
  current_timestamp as updated_at
from common.cm_user_m u
left join pms.cm_customer_m c
  on c.customer_id = u.customer_id
join common.cm_organization_m o
  on o.org_code = case
    when c.customer_code is not null then c.customer_code
    else 'EXT-' || coalesce(nullif(regexp_replace(upper(trim(u.company_name)), '[^A-Z0-9]+', '-', 'g'), ''), 'UNKNOWN')
  end
 and o.org_type = 'external'
where (u.customer_id is not null)
   or (u.company_name is not null and trim(u.company_name) <> '');

commit;
