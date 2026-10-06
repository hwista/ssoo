-- CRM launch operations settings and common-code foundation.

begin;

insert into crm.crm_config_m (
  config_code,
  quote_template_key,
  contract_template_key,
  dms_handoff_enabled,
  pms_handoff_enabled,
  accounting_handoff_enabled,
  accounting_provider_mode_code,
  stalled_after_minutes,
  attempt_retention_days,
  memo,
  last_source,
  last_activity,
  updated_at
)
values (
  'default',
  'crm-quote-v1',
  'crm-contract-v1',
  true,
  false,
  false,
  'disabled',
  30,
  90,
  'CRM launch operations default. Provider secrets are environment-owned.',
  'crm-launch-operations-seed',
  'seed.crm-launch-operations',
  current_timestamp
)
on conflict (config_code) do nothing;

with source_codes(code_group, code_value) as (
  select 'biz_type', business_type
    from crm.crm_opportunity_m
   where is_active = true and nullif(trim(business_type), '') is not null
  union
  select 'biz_type', business_type
    from crm.crm_contract_m
   where is_active = true and nullif(trim(business_type), '') is not null
  union
  select 'group_type', industry_line
    from crm.crm_opportunity_m
   where is_active = true and nullif(trim(industry_line), '') is not null
  union
  select 'group_type', industry_line
    from crm.crm_contract_m
   where is_active = true and nullif(trim(industry_line), '') is not null
  union
  select 'payment_term', payment_term_code
    from crm.crm_opportunity_m
   where is_active = true and nullif(trim(payment_term_code), '') is not null
  union
  select 'payment_term', payment_term_code
    from crm.crm_contract_m
   where is_active = true and nullif(trim(payment_term_code), '') is not null
), ranked as (
  select code_group, trim(code_value) as code_value,
         row_number() over (partition by code_group order by trim(code_value)) * 10 as sort_order
    from source_codes
)
insert into common.cm_code_m (
  code_group, code_value, display_name_ko, description, sort_order,
  is_active, memo, last_source, last_activity, updated_at
)
select
  code_group,
  code_value,
  code_value,
  'CRM 원천 실행 코드와 현재 원장에서 수집한 운영 코드',
  sort_order,
  true,
  'CRM launch operations required code',
  'crm-launch-operations-seed',
  'seed.crm-launch-operations',
  current_timestamp
from ranked
on conflict (code_group, code_value) do update
set is_active = true,
    last_source = excluded.last_source,
    last_activity = excluded.last_activity,
    updated_at = current_timestamp;

with years(value) as (
  select extract(year from expected_start_date)::integer
    from crm.crm_opportunity_m
   where is_active = true
  union
  select extract(year from contract_start_date)::integer
    from crm.crm_contract_m
   where is_active = true
  union
  select extract(year from current_date)::integer
)
insert into crm.crm_business_year_m (year, display_name, description, sort_order, is_active, memo, last_source, last_activity)
select value, value::text || '년', 'CRM 계획·실적 운영 사업연도', value, true,
 'CRM launch operations business year', 'crm-launch-operations-seed', 'seed.crm-launch-operations'
from years where value between 2000 and 2100
on conflict (year) do nothing;

commit;
