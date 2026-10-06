-- =========================================================
-- Seed: 18_crm_access_policy_foundation.sql
-- CRM opportunity access vocabulary / baseline
-- =========================================================

begin;

insert into common.cm_permission_m (
  permission_code, permission_name, domain_code, permission_axis,
  description, sort_order, is_active, memo,
  last_source, last_activity, updated_at
)
values
  ('crm.business-year.read', 'CRM 사업연도 조회', 'crm', 'action', 'CRM 사업연도 목록 조회', 274, true, 'CRM business year policy', 'crm-access-policy-seed', 'seed.crm-access-policy', current_timestamp),
  ('crm.business-year.manage', 'CRM 사업연도 관리', 'crm', 'action', 'CRM 사업연도 등록·활성화·비활성화·삭제', 275, true, 'CRM business year policy', 'crm-access-policy-seed', 'seed.crm-access-policy', current_timestamp),
  ('crm.opportunity.read', 'CRM 영업기회 조회', 'crm', 'action', 'CRM 영업기회 목록, 상세, 차수, 변경 이력을 조회하는 권한', 240, true, 'CRM access policy seed', 'crm-access-policy-seed', 'seed.crm-access-policy', current_timestamp),
  ('crm.opportunity.write', 'CRM 영업기회 등록/수정', 'crm', 'action', 'CRM 영업기회를 등록하고 최신 미확정 차수를 수정하는 권한', 241, true, 'CRM access policy seed', 'crm-access-policy-seed', 'seed.crm-access-policy', current_timestamp),
  ('crm.opportunity.confirm', 'CRM 영업기회 확정 관리', 'crm', 'action', 'CRM 영업기회를 확정하거나 확정 해제하는 권한', 242, true, 'CRM access policy seed', 'crm-access-policy-seed', 'seed.crm-access-policy', current_timestamp),
  ('crm.opportunity.version.manage', 'CRM 영업기회 차수 관리', 'crm', 'action', '확정된 CRM 영업기회에서 새 차수를 추가하는 권한', 243, true, 'CRM access policy seed', 'crm-access-policy-seed', 'seed.crm-access-policy', current_timestamp),
  ('crm.customer.read', 'CRM 고객 조회', 'crm', 'action', 'CRM 고객 원장과 고객 상세를 조회하는 권한', 244, true, 'CRM access policy seed', 'crm-access-policy-seed', 'seed.crm-access-policy', current_timestamp),
  ('crm.customer.write', 'CRM 고객 등록/수정', 'crm', 'action', 'CRM 고객 원장을 등록하고 수정하는 권한', 245, true, 'CRM access policy seed', 'crm-access-policy-seed', 'seed.crm-access-policy', current_timestamp),
  ('crm.customer.activity.read', 'CRM 고객 활동 조회', 'crm', 'action', 'CRM 고객 활동 원장을 조회하는 권한', 246, true, 'CRM access policy seed', 'crm-access-policy-seed', 'seed.crm-access-policy', current_timestamp),
  ('crm.customer.activity.write', 'CRM 고객 활동 등록', 'crm', 'action', 'CRM 고객 활동 원장을 등록하는 권한', 247, true, 'CRM access policy seed', 'crm-access-policy-seed', 'seed.crm-access-policy', current_timestamp),
  ('crm.contract.read', 'CRM 계약 조회', 'crm', 'action', 'CRM 계약, 청구계획, 청구실적, 계약대비실적을 조회하는 권한', 260, true, 'CRM domain access policy seed', 'crm-access-policy-seed', 'seed.crm-access-policy', current_timestamp),
  ('crm.contract.write', 'CRM 계약 등록/수정', 'crm', 'action', 'CRM 계약과 청구실적, 문서 초안을 등록하거나 수정하는 권한', 261, true, 'CRM domain access policy seed', 'crm-access-policy-seed', 'seed.crm-access-policy', current_timestamp),
  ('crm.contract.confirm', 'CRM 계약 확정 관리', 'crm', 'action', 'CRM 계약을 확정하거나 확정 해제하는 권한', 262, true, 'CRM domain access policy seed', 'crm-access-policy-seed', 'seed.crm-access-policy', current_timestamp),
  ('crm.business-plan.read', 'CRM 사업계획 조회', 'crm', 'action', 'CRM 사업계획과 사업계획대비실적을 조회하는 권한', 263, true, 'CRM domain access policy seed', 'crm-access-policy-seed', 'seed.crm-access-policy', current_timestamp),
  ('crm.business-plan.write', 'CRM 사업계획 등록/수정', 'crm', 'action', 'CRM 사업계획 차수, 행, 월별 값을 등록하거나 수정하는 권한', 264, true, 'CRM domain access policy seed', 'crm-access-policy-seed', 'seed.crm-access-policy', current_timestamp),
  ('crm.business-plan.confirm', 'CRM 사업계획 확정 관리', 'crm', 'action', 'CRM 사업계획을 확정하거나 확정 해제하는 권한', 265, true, 'CRM domain access policy seed', 'crm-access-policy-seed', 'seed.crm-access-policy', current_timestamp),
  ('crm.business-plan.delete', 'CRM 사업계획 삭제', 'crm', 'action', 'CRM 최신 draft 사업계획 차수를 관리자 정책으로 삭제하는 권한', 273, true, 'CRM domain access policy seed', 'crm-access-policy-seed', 'seed.crm-access-policy', current_timestamp),
  ('crm.cost-plan.read', 'CRM 원가/AMS 조회', 'crm', 'action', 'CRM 내부원가와 AMS 업체·WBS·월별 원가를 조회하는 권한', 266, true, 'CRM domain access policy seed', 'crm-access-policy-seed', 'seed.crm-access-policy', current_timestamp),
  ('crm.cost-plan.write', 'CRM 원가/AMS 등록/수정', 'crm', 'action', 'CRM 내부원가와 AMS 업체·WBS·월별 원가를 등록하거나 수정하는 권한', 267, true, 'CRM domain access policy seed', 'crm-access-policy-seed', 'seed.crm-access-policy', current_timestamp),
  ('crm.cost-plan.confirm', 'CRM 원가/AMS 확정 관리', 'crm', 'action', 'CRM 내부원가와 AMS 정산을 확정하거나 확정 해제하는 권한', 268, true, 'CRM domain access policy seed', 'crm-access-policy-seed', 'seed.crm-access-policy', current_timestamp),
  ('crm.report.read', 'CRM 보고 조회', 'crm', 'action', 'CRM 보고 preview와 확정 snapshot을 조회하는 권한', 269, true, 'CRM domain access policy seed', 'crm-access-policy-seed', 'seed.crm-access-policy', current_timestamp),
  ('crm.report.confirm', 'CRM 보고 확정 관리', 'crm', 'action', 'CRM 보고 snapshot을 확정하거나 확정 해제하는 권한', 270, true, 'CRM domain access policy seed', 'crm-access-policy-seed', 'seed.crm-access-policy', current_timestamp),
  ('crm.quote-settings.read', 'CRM 공급자 설정 조회', 'crm', 'action', '견적·계약 문서 공급자 법인정보와 CI 상태를 조회하는 권한', 271, true, 'CRM domain access policy seed', 'crm-access-policy-seed', 'seed.crm-access-policy', current_timestamp),
  ('crm.quote-settings.manage', 'CRM 공급자 설정 관리', 'crm', 'action', '견적·계약 문서 공급자 법인정보와 CI를 변경하는 권한', 272, true, 'CRM domain access policy seed', 'crm-access-policy-seed', 'seed.crm-access-policy', current_timestamp),
  ('crm.operations.read', 'CRM 운영 현황 조회', 'crm', 'action', 'CRM readiness, 데이터 품질, 운영 작업 상태를 조회하는 권한', 250, true, 'CRM launch operations policy seed', 'crm-access-policy-seed', 'seed.crm-access-policy', current_timestamp),
  ('crm.operations.execute', 'CRM 운영 작업 실행', 'crm', 'action', '실패하거나 정체된 CRM 운영 작업을 안전하게 실행·재시도하는 권한', 251, true, 'CRM launch operations policy seed', 'crm-access-policy-seed', 'seed.crm-access-policy', current_timestamp),
  ('crm.settings.manage', 'CRM 시스템 설정 관리', 'crm', 'action', 'CRM 도메인 설정을 변경하고 변경 이력을 관리하는 권한', 252, true, 'CRM launch operations policy seed', 'crm-access-policy-seed', 'seed.crm-access-policy', current_timestamp)
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
  'Seeded CRM role baseline permission' as memo,
  'crm-access-policy-seed' as last_source,
  'seed.crm-access-policy' as last_activity,
  current_timestamp as updated_at
from (
  values
    ('admin', 'crm.business-year.read'),
    ('admin', 'crm.business-year.manage'),
    ('manager', 'crm.business-year.read'),
    ('user', 'crm.business-year.read'),
    ('viewer', 'crm.business-year.read'),
    ('admin', 'crm.opportunity.read'),
    ('admin', 'crm.opportunity.write'),
    ('admin', 'crm.opportunity.confirm'),
    ('admin', 'crm.opportunity.version.manage'),
    ('admin', 'crm.customer.read'),
    ('admin', 'crm.customer.write'),
    ('admin', 'crm.customer.activity.read'),
    ('admin', 'crm.customer.activity.write'),
    ('admin', 'crm.contract.read'),
    ('admin', 'crm.contract.write'),
    ('admin', 'crm.contract.confirm'),
    ('admin', 'crm.business-plan.read'),
    ('admin', 'crm.business-plan.write'),
    ('admin', 'crm.business-plan.confirm'),
    ('admin', 'crm.business-plan.delete'),
    ('admin', 'crm.cost-plan.read'),
    ('admin', 'crm.cost-plan.write'),
    ('admin', 'crm.cost-plan.confirm'),
    ('admin', 'crm.report.read'),
    ('admin', 'crm.report.confirm'),
    ('admin', 'crm.quote-settings.read'),
    ('admin', 'crm.quote-settings.manage'),
    ('admin', 'crm.operations.read'),
    ('admin', 'crm.operations.execute'),
    ('admin', 'crm.settings.manage'),
    ('manager', 'crm.opportunity.read'),
    ('manager', 'crm.opportunity.write'),
    ('manager', 'crm.opportunity.confirm'),
    ('manager', 'crm.opportunity.version.manage'),
    ('manager', 'crm.customer.read'),
    ('manager', 'crm.customer.write'),
    ('manager', 'crm.customer.activity.read'),
    ('manager', 'crm.customer.activity.write'),
    ('manager', 'crm.contract.read'),
    ('manager', 'crm.contract.write'),
    ('manager', 'crm.contract.confirm'),
    ('manager', 'crm.business-plan.read'),
    ('manager', 'crm.business-plan.write'),
    ('manager', 'crm.business-plan.confirm'),
    ('manager', 'crm.cost-plan.read'),
    ('manager', 'crm.cost-plan.write'),
    ('manager', 'crm.cost-plan.confirm'),
    ('manager', 'crm.report.read'),
    ('manager', 'crm.report.confirm'),
    ('manager', 'crm.quote-settings.read'),
    ('manager', 'crm.operations.read'),
    ('user', 'crm.opportunity.read'),
    ('user', 'crm.opportunity.write'),
    ('user', 'crm.customer.read'),
    ('user', 'crm.customer.write'),
    ('user', 'crm.customer.activity.read'),
    ('user', 'crm.customer.activity.write'),
    ('user', 'crm.contract.read'),
    ('user', 'crm.contract.write'),
    ('user', 'crm.business-plan.read'),
    ('user', 'crm.business-plan.write'),
    ('user', 'crm.cost-plan.read'),
    ('user', 'crm.cost-plan.write'),
    ('user', 'crm.report.read'),
    ('user', 'crm.quote-settings.read'),
    ('viewer', 'crm.opportunity.read'),
    ('viewer', 'crm.customer.read'),
    ('viewer', 'crm.customer.activity.read'),
    ('viewer', 'crm.contract.read'),
    ('viewer', 'crm.business-plan.read'),
    ('viewer', 'crm.cost-plan.read'),
    ('viewer', 'crm.report.read'),
    ('viewer', 'crm.quote-settings.read')
) as mapping(role_code, permission_code)
join common.cm_role_m r on r.role_code = mapping.role_code
join common.cm_permission_m p on p.permission_code = mapping.permission_code
on conflict (role_id, permission_id) do update
set is_active = true,
    memo = excluded.memo,
    last_source = excluded.last_source,
    last_activity = excluded.last_activity,
    updated_at = current_timestamp;

commit;
