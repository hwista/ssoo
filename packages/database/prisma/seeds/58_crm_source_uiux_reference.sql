-- =========================================================
-- CRM Source UI/UX Reference Fixture
-- Source: scripts/capture-crm-source-uiux-reference.mjs::makeFixture
-- Purpose: deterministic normal-state evidence for the source-compatible CRM
-- surfaces. These records use a dedicated crm-uiux-* namespace and never
-- replace the authoritative source SQL snapshots in seeds 52 and 56.
-- =========================================================

begin;

insert into common.cm_code_m (
  code_group, code_value, display_name_ko, description, sort_order,
  is_active, memo, last_source, last_activity, updated_at
)
values
  ('payment_term', 'monthly', '월별', 'CRM source UI/UX reference', 1, true, 'REF-01 normal state', 'crm-source-uiux-reference', 'seed.crm-source-uiux-reference', current_timestamp),
  ('payment_term', 'quarterly', '분기별', 'CRM source UI/UX reference', 2, true, 'REF-01 normal state', 'crm-source-uiux-reference', 'seed.crm-source-uiux-reference', current_timestamp),
  ('biz_type', 'SI', 'SI', 'CRM source UI/UX reference', 1, true, 'REF-01 normal state', 'crm-source-uiux-reference', 'seed.crm-source-uiux-reference', current_timestamp),
  ('biz_type', 'SM', 'SM', 'CRM source UI/UX reference', 2, true, 'REF-01 normal state', 'crm-source-uiux-reference', 'seed.crm-source-uiux-reference', current_timestamp),
  ('group_type', '삼성', '삼성', 'CRM source UI/UX reference', 1, true, 'REF-01 normal state', 'crm-source-uiux-reference', 'seed.crm-source-uiux-reference', current_timestamp),
  ('group_type', '현대자동차', '현대자동차', 'CRM source UI/UX reference', 2, true, 'REF-01 normal state', 'crm-source-uiux-reference', 'seed.crm-source-uiux-reference', current_timestamp)
on conflict (code_group, code_value) do update
set display_name_ko = excluded.display_name_ko,
    description = excluded.description,
    sort_order = excluded.sort_order,
    is_active = excluded.is_active,
    memo = excluded.memo,
    last_source = excluded.last_source,
    last_activity = excluded.last_activity,
    updated_at = current_timestamp;

insert into crm.crm_business_year_m (year, display_name, sort_order, is_active, memo, last_source, last_activity)
values (2026, '2026년', 2026, true, 'REF-01 normal state', 'crm-source-uiux-reference', 'seed.crm-source-uiux-reference'),
       (2025, '2025년', 2025, false, 'REF-01 normal state', 'crm-source-uiux-reference', 'seed.crm-source-uiux-reference')
on conflict (year) do update
set display_name = excluded.display_name,
    sort_order = excluded.sort_order,
    is_active = excluded.is_active,
    memo = excluded.memo,
    last_source = excluded.last_source,
    last_activity = excluded.last_activity,
    updated_at = current_timestamp;

insert into common.cm_user_m (
  user_name, display_name, email, phone,
  department_code, position_code, employee_number,
  role_code, is_active, memo, created_at, updated_at, last_source, last_activity
)
values
  ('김민준', '김민준', 'kim@example.invalid', '010-0000-0001', '영업1팀', '팀장', 'CRM-UIUX-001', 'user', true, 'CRM source UI/UX reference owner', current_timestamp, current_timestamp, 'crm-source-uiux-reference', 'seed.crm-source-uiux-reference'),
  ('이서연', '이서연', 'lee@example.invalid', '010-0000-0002', '영업1팀', '영업사원', 'CRM-UIUX-002', 'user', true, 'CRM source UI/UX reference owner', current_timestamp, current_timestamp, 'crm-source-uiux-reference', 'seed.crm-source-uiux-reference')
on conflict (email) do update set
  user_name = excluded.user_name,
  display_name = excluded.display_name,
  phone = excluded.phone,
  department_code = excluded.department_code,
  position_code = excluded.position_code,
  employee_number = excluded.employee_number,
  role_code = excluded.role_code,
  is_active = true,
  memo = excluded.memo,
  updated_at = current_timestamp,
  last_source = excluded.last_source,
  last_activity = excluded.last_activity;

insert into common.cm_user_auth_m (
  user_id, login_id, password_hash, account_status_code,
  created_at, updated_at, last_source, last_activity
)
select u.user_id, v.login_id,
       '$2b$12$skh0QQm3kLdI/TRo70l5PelEFJYej6yelhhCICEau3J0V/DcLYI56',
       'active', current_timestamp, current_timestamp,
       'crm-source-uiux-reference', 'seed.crm-source-uiux-reference'
  from common.cm_user_m u
  join (values
    ('kim@example.invalid', 'crm.uiux.kim'),
    ('lee@example.invalid', 'crm.uiux.lee')
  ) as v(email, login_id) on v.email = u.email
on conflict (user_id) do update set
  login_id = excluded.login_id,
  password_hash = excluded.password_hash,
  account_status_code = excluded.account_status_code,
  updated_at = current_timestamp,
  last_source = excluded.last_source,
  last_activity = excluded.last_activity;

insert into crm.crm_quote_seller_profile_m (
  profile_code, company_name, ceo_name, business_registration_no,
  address, tel, fax, website, email, ci_status_code, ci_storage_ref,
  is_active, memo, created_at, updated_at, last_source, last_activity
)
values (
  'default', '주식회사 SSOO', '대표이사', '000-00-00000',
  '서울특별시', '02-0000-0000', '02-0000-0001', 'https://example.invalid',
  'admin@example.invalid', 'dms-planned', 'assets/images/ci.png', true,
  'CRM source UI/UX reference company profile', current_timestamp, current_timestamp,
  'crm-source-uiux-reference', 'seed.crm-source-uiux-reference'
)
on conflict (profile_code) do update set
  company_name = excluded.company_name,
  ceo_name = excluded.ceo_name,
  business_registration_no = excluded.business_registration_no,
  address = excluded.address,
  tel = excluded.tel,
  fax = excluded.fax,
  website = excluded.website,
  email = excluded.email,
  ci_status_code = excluded.ci_status_code,
  ci_storage_ref = excluded.ci_storage_ref,
  is_active = true,
  memo = excluded.memo,
  updated_at = current_timestamp,
  last_source = excluded.last_source,
  last_activity = excluded.last_activity;

update crm.crm_business_plan_m
   set status_code = 'confirmed',
       confirmed = true,
       confirmed_at = coalesce(confirmed_at, timestamp with time zone '2026-01-02T00:00:00Z'),
       updated_at = current_timestamp,
       last_source = 'crm-source-uiux-reference',
       last_activity = 'seed.crm-source-uiux-reference'
 where business_plan_code = 'BP-2026-DEMO-001';

insert into crm.crm_opportunity_m (
  opportunity_code, opportunity_group_code, customer_name, opportunity_name,
  owner_name, owner_user_id, business_type, industry_line, region_code,
  status_code, priority_code, version_no, confirmed,
  contract_created, contract_created_at, contract_code,
  expected_start_date, expected_end_date, payment_term_code,
  quote_status_code, revenue_subtotal, special_discount_type_code,
  special_discount_value, special_discount_amount, revenue_total, cost_total,
  pms_handoff_status_code, dms_link_status_code, admin_boundary_code,
  next_action, is_active, created_at, updated_at, last_source, last_activity
)
values
  (
    'crm-uiux-opp-001', 'crm-uiux-opp-001', '삼성전자', 'ERP 시스템 구축 프로젝트',
    '김민준',
    (select u.user_id from common.cm_user_m u join common.cm_user_auth_m a on a.user_id = u.user_id where a.login_id = 'crm.uiux.kim' limit 1),
    'SI', '삼성', 'domestic', 'won', 'high', 1, true,
    true, timestamp with time zone '2026-01-15T00:00:00Z', 'crm-uiux-ct-001',
    date '2026-01-01', date '2026-12-31', 'monthly',
    'accepted', 162000000, 'amount', 5000000.00, 5000000,
    157000000, 114300000, 'planned', 'planned', 'shared-admin',
    '원천 UI/UX 기준 계약 청구실적 확인', true,
    timestamp with time zone '2026-01-10T00:00:00Z',
    timestamp with time zone '2026-01-10T00:00:00Z',
    'crm-source-uiux-reference', 'seed.crm-source-uiux-reference'
  ),
  (
    'crm-uiux-opp-002', 'crm-uiux-opp-002', '현대자동차', 'SCM 플랫폼 고도화',
    '이서연',
    (select u.user_id from common.cm_user_m u join common.cm_user_auth_m a on a.user_id = u.user_id where a.login_id = 'crm.uiux.lee' limit 1),
    'SM', '현대자동차', 'domestic', 'proposal', 'high', 1, true,
    false, null, null,
    date '2026-04-01', date '2027-03-31', 'quarterly',
    'accepted', 95000000, 'rate', 5.00, 4750000,
    90250000, 66500000, 'planned', 'planned', 'shared-admin',
    '원천 UI/UX 기준 계약 전환 범위 확인', true,
    timestamp with time zone '2026-04-01T00:00:00Z',
    timestamp with time zone '2026-04-01T00:00:00Z',
    'crm-source-uiux-reference', 'seed.crm-source-uiux-reference'
  )
on conflict (opportunity_code) do update set
  opportunity_group_code = excluded.opportunity_group_code,
  customer_name = excluded.customer_name,
  opportunity_name = excluded.opportunity_name,
  owner_name = excluded.owner_name,
  owner_user_id = excluded.owner_user_id,
  business_type = excluded.business_type,
  industry_line = excluded.industry_line,
  region_code = excluded.region_code,
  status_code = excluded.status_code,
  priority_code = excluded.priority_code,
  version_no = excluded.version_no,
  confirmed = excluded.confirmed,
  contract_created = excluded.contract_created,
  contract_created_at = excluded.contract_created_at,
  contract_code = excluded.contract_code,
  expected_start_date = excluded.expected_start_date,
  expected_end_date = excluded.expected_end_date,
  payment_term_code = excluded.payment_term_code,
  quote_status_code = excluded.quote_status_code,
  revenue_subtotal = excluded.revenue_subtotal,
  special_discount_type_code = excluded.special_discount_type_code,
  special_discount_value = excluded.special_discount_value,
  special_discount_amount = excluded.special_discount_amount,
  revenue_total = excluded.revenue_total,
  cost_total = excluded.cost_total,
  pms_handoff_status_code = excluded.pms_handoff_status_code,
  dms_link_status_code = excluded.dms_link_status_code,
  admin_boundary_code = excluded.admin_boundary_code,
  next_action = excluded.next_action,
  is_active = true,
  updated_at = excluded.updated_at,
  last_source = excluded.last_source,
  last_activity = excluded.last_activity;

delete from crm.crm_opportunity_line_d
 where opportunity_id in (
   select opportunity_id
     from crm.crm_opportunity_m
    where opportunity_code in ('crm-uiux-opp-001', 'crm-uiux-opp-002')
 )
   and last_source = 'crm-source-uiux-reference';

insert into crm.crm_opportunity_line_d (
  opportunity_id, line_code, line_kind_code, category_code, line_label,
  quantity, unit_price, amount, margin_rate, trunc_unit,
  department, member_name, grade, service_type_code,
  revenue_linked, linked_cost_line_code, revenue_unit_price,
  sort_order, is_active, created_at, updated_at, last_source, last_activity
)
select o.opportunity_id, v.line_code, v.line_kind_code, v.category_code, v.line_label,
       v.quantity, v.unit_price, v.amount, v.margin_rate, v.trunc_unit,
       v.department, v.member_name, v.grade, v.service_type_code,
       v.revenue_linked, v.linked_cost_line_code, v.revenue_unit_price,
       v.sort_order, true, current_timestamp, current_timestamp,
       'crm-source-uiux-reference', 'seed.crm-source-uiux-reference'
  from crm.crm_opportunity_m o
  join (
    values
      ('crm-uiux-opp-001', 'rev-product-01', 'revenue', 'product', '서버 장비 (HP DL380)', 5.00::numeric, 18000000::bigint, 90000000::bigint, 25.00::numeric, 100000::bigint, null, null, null, null, false, null, null::bigint, 10),
      ('crm-uiux-opp-001', 'rev-service-01', 'revenue', 'service', '김민준', 6.00::numeric, 12000000::bigint, 72000000::bigint, 35.00::numeric, 100000::bigint, '영업1팀', '김민준', '특급', 'internal', false, null, null::bigint, 20),
      ('crm-uiux-opp-001', 'cost-product-01', 'cost', 'product', '서버 장비 (HP DL380)', 5.00::numeric, 13500000::bigint, 67500000::bigint, null::numeric, null::bigint, null, null, null, null, true, null, 18000000::bigint, 30),
      ('crm-uiux-opp-001', 'cost-internal-01', 'cost', 'internal-cost', '김민준', 6.00::numeric, 7800000::bigint, 46800000::bigint, null::numeric, null::bigint, '영업1팀', '김민준', '특급', 'internal', true, null, 12000000::bigint, 40),
      ('crm-uiux-opp-002', 'rev-service-01', 'revenue', 'service', '이서연', 10.00::numeric, 9500000::bigint, 95000000::bigint, 30.00::numeric, 100000::bigint, '영업1팀', '이서연', '고급', 'internal', false, null, null::bigint, 10),
      ('crm-uiux-opp-002', 'cost-internal-01', 'cost', 'internal-cost', '이서연', 10.00::numeric, 6650000::bigint, 66500000::bigint, null::numeric, null::bigint, '영업1팀', '이서연', '고급', 'internal', true, null, 9500000::bigint, 20)
  ) as v(opportunity_code, line_code, line_kind_code, category_code, line_label,
         quantity, unit_price, amount, margin_rate, trunc_unit,
         department, member_name, grade, service_type_code,
         revenue_linked, linked_cost_line_code, revenue_unit_price, sort_order)
    on o.opportunity_code = v.opportunity_code
on conflict (opportunity_id, line_code) do update set
  line_kind_code = excluded.line_kind_code,
  category_code = excluded.category_code,
  line_label = excluded.line_label,
  quantity = excluded.quantity,
  unit_price = excluded.unit_price,
  amount = excluded.amount,
  margin_rate = excluded.margin_rate,
  trunc_unit = excluded.trunc_unit,
  department = excluded.department,
  member_name = excluded.member_name,
  grade = excluded.grade,
  service_type_code = excluded.service_type_code,
  revenue_linked = excluded.revenue_linked,
  linked_cost_line_code = excluded.linked_cost_line_code,
  revenue_unit_price = excluded.revenue_unit_price,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = current_timestamp,
  last_source = excluded.last_source,
  last_activity = excluded.last_activity;

insert into crm.crm_contract_m (
  contract_code, source_opportunity_id, source_opportunity_code,
  customer_name, contract_name, owner_name, owner_user_id,
  business_type, industry_line, region_code, status_code, confirmed,
  contract_start_date, contract_end_date, wbs_code, payment_term_code,
  revenue_subtotal, special_discount_type_code, special_discount_value,
  special_discount_amount, revenue_total, cost_total, external_cost_total,
  pms_handoff_status_code, dms_link_status_code, admin_boundary_code, next_action,
  is_active, created_at, updated_at, last_source, last_activity
)
values (
  'crm-uiux-ct-001',
  (select opportunity_id from crm.crm_opportunity_m where opportunity_code = 'crm-uiux-opp-001' limit 1),
  'crm-uiux-opp-001',
  '삼성전자', 'ERP 시스템 구축 계약', '김민준',
  (select u.user_id from common.cm_user_m u join common.cm_user_auth_m a on a.user_id = u.user_id where a.login_id = 'crm.uiux.kim' limit 1),
  'SI', '삼성', 'domestic', 'active', true,
  date '2026-01-01', date '2026-12-31', 'WBS-ERP-2026-001', 'monthly',
  162000000, 'amount', 5000000.00, 5000000, 157000000, 114300000, 72000000,
  'planned', 'planned', 'shared-admin', '원천 UI/UX 기준 계약 청구실적 확인',
  true, timestamp with time zone '2026-01-10T00:00:00Z', current_timestamp,
  'crm-source-uiux-reference', 'seed.crm-source-uiux-reference'
)
on conflict (contract_code) do update set
  source_opportunity_id = excluded.source_opportunity_id,
  source_opportunity_code = excluded.source_opportunity_code,
  customer_name = excluded.customer_name,
  contract_name = excluded.contract_name,
  owner_name = excluded.owner_name,
  owner_user_id = excluded.owner_user_id,
  business_type = excluded.business_type,
  industry_line = excluded.industry_line,
  region_code = excluded.region_code,
  status_code = excluded.status_code,
  confirmed = excluded.confirmed,
  contract_start_date = excluded.contract_start_date,
  contract_end_date = excluded.contract_end_date,
  wbs_code = excluded.wbs_code,
  payment_term_code = excluded.payment_term_code,
  revenue_subtotal = excluded.revenue_subtotal,
  special_discount_type_code = excluded.special_discount_type_code,
  special_discount_value = excluded.special_discount_value,
  special_discount_amount = excluded.special_discount_amount,
  revenue_total = excluded.revenue_total,
  cost_total = excluded.cost_total,
  external_cost_total = excluded.external_cost_total,
  is_active = true,
  updated_at = current_timestamp,
  last_source = excluded.last_source,
  last_activity = excluded.last_activity;

-- 원천 AMS 화면의 다중 WBS 매핑을 독립적으로 검증하기 위한 두 번째 확정 계약입니다.
-- source contract 목록은 crm-uiux-ct-*만 노출하므로 UX-05/07의 단일 기준 계약에는 포함되지 않습니다.
insert into crm.crm_contract_m (
  contract_code, source_opportunity_id, source_opportunity_code,
  customer_name, contract_name, owner_name, owner_user_id,
  business_type, industry_line, region_code, status_code, confirmed,
  contract_start_date, contract_end_date, wbs_code, payment_term_code,
  revenue_subtotal, special_discount_type_code, special_discount_value,
  special_discount_amount, revenue_total, cost_total, external_cost_total,
  pms_handoff_status_code, dms_link_status_code, admin_boundary_code, next_action,
  is_active, created_at, updated_at, last_source, last_activity
)
values (
  'crm-uiux-ams-wbs-002', null, null,
  '현대자동차', 'SCM 플랫폼 고도화 지원 계약', '이서연',
  (select u.user_id from common.cm_user_m u join common.cm_user_auth_m a on a.user_id = u.user_id where a.login_id = 'crm.uiux.lee' limit 1),
  'SI', '현대', 'domestic', 'active', true,
  date '2026-02-01', date '2026-11-30', 'WBS-SCM-2026-002', 'monthly',
  95000000, 'amount', 0.00, 0, 95000000, 66500000, 30000000,
  'planned', 'planned', 'shared-admin', '원천 AMS 다중 WBS 매핑 확인',
  true, timestamp with time zone '2026-01-11T00:00:00Z', current_timestamp,
  'crm-source-uiux-reference', 'seed.crm-source-uiux-reference'
)
on conflict (contract_code) do update set
  customer_name = excluded.customer_name,
  contract_name = excluded.contract_name,
  owner_name = excluded.owner_name,
  owner_user_id = excluded.owner_user_id,
  business_type = excluded.business_type,
  industry_line = excluded.industry_line,
  region_code = excluded.region_code,
  status_code = excluded.status_code,
  confirmed = excluded.confirmed,
  contract_start_date = excluded.contract_start_date,
  contract_end_date = excluded.contract_end_date,
  wbs_code = excluded.wbs_code,
  payment_term_code = excluded.payment_term_code,
  revenue_subtotal = excluded.revenue_subtotal,
  special_discount_type_code = excluded.special_discount_type_code,
  special_discount_value = excluded.special_discount_value,
  special_discount_amount = excluded.special_discount_amount,
  revenue_total = excluded.revenue_total,
  cost_total = excluded.cost_total,
  external_cost_total = excluded.external_cost_total,
  is_active = true,
  updated_at = current_timestamp,
  last_source = excluded.last_source,
  last_activity = excluded.last_activity;

delete from crm.crm_contract_line_d
 where contract_id = (select contract_id from crm.crm_contract_m where contract_code = 'crm-uiux-ct-001')
   and last_source = 'crm-source-uiux-reference';

insert into crm.crm_contract_line_d (
  contract_id, line_code, line_kind_code, category_code, line_label,
  quantity, unit_price, amount, margin_rate, trunc_unit,
  department, member_name, grade, service_type_code,
  revenue_linked, revenue_unit_price, sort_order, is_active,
  last_source, last_activity
)
select c.contract_id, v.line_code, v.line_kind_code, v.category_code, v.line_label,
       v.quantity, v.unit_price, v.amount, v.margin_rate, v.trunc_unit,
       v.department, v.member_name, v.grade, v.service_type_code,
       v.revenue_linked, v.revenue_unit_price, v.sort_order, true,
       'crm-source-uiux-reference', 'seed.crm-source-uiux-reference'
  from crm.crm_contract_m c
  join (
    values
      ('crm-uiux-ct-001', 'rev-product-01', 'revenue', 'product', '서버 장비 (HP DL380)', 5.00::numeric, 18000000::bigint, 90000000::bigint, 25.00::numeric, 100000::bigint, null, null, null, null, false, null::bigint, 10),
      ('crm-uiux-ct-001', 'rev-service-01', 'revenue', 'service', '김민준', 6.00::numeric, 12000000::bigint, 72000000::bigint, 35.00::numeric, 100000::bigint, '영업1팀', '김민준', '특급', 'internal', false, null::bigint, 20),
      ('crm-uiux-ct-001', 'cost-product-01', 'cost', 'product', '서버 장비 (HP DL380)', 5.00::numeric, 13500000::bigint, 67500000::bigint, null::numeric, null::bigint, null, null, null, null, true, 18000000::bigint, 30),
      ('crm-uiux-ct-001', 'cost-internal-01', 'cost', 'internal-cost', '김민준', 6.00::numeric, 7800000::bigint, 46800000::bigint, null::numeric, null::bigint, '영업1팀', '김민준', '특급', 'internal', true, 12000000::bigint, 40)
  ) as v(contract_code, line_code, line_kind_code, category_code, line_label, quantity, unit_price, amount, margin_rate, trunc_unit, department, member_name, grade, service_type_code, revenue_linked, revenue_unit_price, sort_order)
    on c.contract_code = v.contract_code
on conflict (contract_id, line_code) do update set
  line_kind_code = excluded.line_kind_code,
  category_code = excluded.category_code,
  line_label = excluded.line_label,
  quantity = excluded.quantity,
  unit_price = excluded.unit_price,
  amount = excluded.amount,
  margin_rate = excluded.margin_rate,
  trunc_unit = excluded.trunc_unit,
  department = excluded.department,
  member_name = excluded.member_name,
  grade = excluded.grade,
  service_type_code = excluded.service_type_code,
  revenue_linked = excluded.revenue_linked,
  revenue_unit_price = excluded.revenue_unit_price,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = current_timestamp,
  last_source = excluded.last_source,
  last_activity = excluded.last_activity;

insert into crm.crm_contract_billing_plan_d (
  contract_id, billing_ym, revenue_amount, external_cost_amount, sort_order,
  is_active, last_source, last_activity
)
select c.contract_id, v.billing_ym, v.revenue_amount, v.external_cost_amount, v.sort_order,
       true, 'crm-source-uiux-reference', 'seed.crm-source-uiux-reference'
  from crm.crm_contract_m c
  join (values
    ('crm-uiux-ct-001', '2026/03', 54000000::bigint, 36000000::bigint, 10),
    ('crm-uiux-ct-001', '2026/06', 54000000::bigint, 36000000::bigint, 20)
  ) as v(contract_code, billing_ym, revenue_amount, external_cost_amount, sort_order)
    on c.contract_code = v.contract_code
on conflict (contract_id, billing_ym) do update set
  revenue_amount = excluded.revenue_amount,
  external_cost_amount = excluded.external_cost_amount,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = current_timestamp,
  last_source = excluded.last_source,
  last_activity = excluded.last_activity;

insert into crm.crm_contract_billing_actual_d (
  contract_id, billing_ym, revenue_amount, external_cost_amount, sort_order,
  is_active, last_source, last_activity
)
select c.contract_id, '2026/03', 52000000::bigint, 35000000::bigint, 10,
       true, 'crm-source-uiux-reference', 'seed.crm-source-uiux-reference'
  from crm.crm_contract_m c
 where c.contract_code = 'crm-uiux-ct-001'
on conflict (contract_id, billing_ym) do update set
  revenue_amount = excluded.revenue_amount,
  external_cost_amount = excluded.external_cost_amount,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = current_timestamp,
  last_source = excluded.last_source,
  last_activity = excluded.last_activity;

with source_vendor as (
  insert into crm.crm_cost_plan_ams_source_vendor_m (
    target_year, vendor_name, sort_order, is_active, last_source, last_activity
  )
  select 2026, '파트너사A', 0, true, 'crm-source-uiux-reference', 'seed.crm-source-uiux-reference'
   where not exists (
     select 1 from crm.crm_cost_plan_ams_source_vendor_m
      where target_year = 2026 and vendor_name = '파트너사A'
   )
  returning cost_plan_ams_source_vendor_id
), vendor as (
  select cost_plan_ams_source_vendor_id
    from source_vendor
  union all
  select cost_plan_ams_source_vendor_id
    from crm.crm_cost_plan_ams_source_vendor_m
   where target_year = 2026 and vendor_name = '파트너사A'
   order by cost_plan_ams_source_vendor_id
   limit 1
)
insert into crm.crm_cost_plan_ams_source_vendor_wbs_r (
  vendor_id, wbs_code, contract_id, sort_order, last_source, last_activity
)
select vendor.cost_plan_ams_source_vendor_id, 'WBS-ERP-2026-001', contract.contract_id,
       0, 'crm-source-uiux-reference', 'seed.crm-source-uiux-reference'
  from vendor
  cross join crm.crm_contract_m contract
 where contract.contract_code = 'crm-uiux-ct-001'
on conflict (vendor_id, wbs_code) do update set
  contract_id = excluded.contract_id,
  sort_order = excluded.sort_order,
  updated_at = current_timestamp,
  last_source = excluded.last_source,
  last_activity = excluded.last_activity;

insert into crm.crm_cost_plan_ams_source_external_monthly_d (
  vendor_id, wbs_code, monthly_plan_amounts, monthly_actual_amounts,
  plan_amount_total, actual_amount_total, difference_amount_total,
  sort_order, is_active, last_source, last_activity
)
select vendor.cost_plan_ams_source_vendor_id, 'WBS-ERP-2026-001',
       '[6000000,0,0,0,0,0,0,0,0,0,0,0]'::jsonb,
       '[5800000,0,0,0,0,0,0,0,0,0,0,0]'::jsonb,
       6000000, 5800000, -200000, 0, true,
       'crm-source-uiux-reference', 'seed.crm-source-uiux-reference'
  from crm.crm_cost_plan_ams_source_vendor_m vendor
 where vendor.target_year = 2026 and vendor.vendor_name = '파트너사A'
 order by vendor.cost_plan_ams_source_vendor_id
 limit 1
on conflict (vendor_id, wbs_code) do update set
  monthly_plan_amounts = excluded.monthly_plan_amounts,
  monthly_actual_amounts = excluded.monthly_actual_amounts,
  plan_amount_total = excluded.plan_amount_total,
  actual_amount_total = excluded.actual_amount_total,
  difference_amount_total = excluded.difference_amount_total,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = current_timestamp,
  last_source = excluded.last_source,
  last_activity = excluded.last_activity;

commit;
