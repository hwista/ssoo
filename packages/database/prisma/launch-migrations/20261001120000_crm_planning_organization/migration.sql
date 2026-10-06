-- Existing test/legacy snapshots keep NULL organization; no inferred ownership migration.
ALTER TABLE crm.crm_report_confirmation_m ADD COLUMN owner_organization_id BIGINT;
CREATE INDEX ix_crm_report_confirmation_m_org_year ON crm.crm_report_confirmation_m(owner_organization_id, target_year, is_active);
ALTER TABLE crm.crm_business_plan_m ADD COLUMN owner_organization_id BIGINT;
ALTER TABLE crm.crm_business_plan_h ADD COLUMN owner_organization_id BIGINT;
ALTER TABLE crm.crm_business_plan_performance_actual_d ADD COLUMN owner_organization_id BIGINT;
ALTER TABLE crm.crm_cost_plan_internal_monthly_d ADD COLUMN owner_organization_id BIGINT;
ALTER TABLE crm.crm_cost_plan_ams_external_monthly_d ADD COLUMN owner_organization_id BIGINT;
DROP INDEX crm.crm_business_plan_m_base_year_version_no_key;
CREATE UNIQUE INDEX ux_crm_business_plan_m_org_year_version ON crm.crm_business_plan_m(owner_organization_id, base_year, version_no);
CREATE UNIQUE INDEX ux_crm_business_plan_m_legacy_year_version ON crm.crm_business_plan_m(base_year, version_no) WHERE owner_organization_id IS NULL;
DROP INDEX crm.ux_crm_business_plan_performance_actual_d_basis;
CREATE UNIQUE INDEX ux_crm_business_plan_performance_actual_d_basis ON crm.crm_business_plan_performance_actual_d(owner_organization_id, target_year, business_type, industry_line, owner_name, region_code, wbs_code);
CREATE UNIQUE INDEX ux_crm_business_plan_performance_actual_d_legacy ON crm.crm_business_plan_performance_actual_d(target_year, business_type, industry_line, owner_name, region_code, wbs_code) WHERE owner_organization_id IS NULL;
CREATE OR REPLACE FUNCTION "crm"."fn_crm_business_plan_h_record"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_row "crm"."crm_business_plan_m"%ROWTYPE;
  v_event_type CHAR(1);
  v_history_seq BIGINT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_row := OLD;
    v_event_type := 'D';
  ELSIF TG_OP = 'INSERT' THEN
    v_row := NEW;
    v_event_type := 'C';
  ELSE
    v_row := NEW;
    v_event_type := 'U';
  END IF;

  SELECT COALESCE(MAX(history_seq), 0) + 1
    INTO v_history_seq
    FROM "crm"."crm_business_plan_h"
   WHERE business_plan_id = v_row.business_plan_id;

  INSERT INTO "crm"."crm_business_plan_h" (
    business_plan_id, history_seq, event_type, event_at, event_by,
    owner_organization_id, business_plan_code, plan_name, base_year, version_no, status_code,
    confirmed, confirmed_at, business_type_filter, industry_line_filter,
    region_filter, search_filter, pipeline_amount_total, contract_plan_amount_total,
    contract_actual_amount_total, plan_candidate_amount_total, actual_gap_amount_total,
    row_count, is_active, memo, created_by, created_at, updated_by, updated_at,
    last_source, last_activity, transaction_id
  )
  VALUES (
    v_row.business_plan_id, v_history_seq, v_event_type, NOW(), v_row.updated_by,
    v_row.owner_organization_id, v_row.business_plan_code, v_row.plan_name, v_row.base_year, v_row.version_no, v_row.status_code,
    v_row.confirmed, v_row.confirmed_at, v_row.business_type_filter, v_row.industry_line_filter,
    v_row.region_filter, v_row.search_filter, v_row.pipeline_amount_total, v_row.contract_plan_amount_total,
    v_row.contract_actual_amount_total, v_row.plan_candidate_amount_total, v_row.actual_gap_amount_total,
    v_row.row_count, v_row.is_active, v_row.memo, v_row.created_by, v_row.created_at,
    v_row.updated_by, v_row.updated_at, v_row.last_source, v_row.last_activity, v_row.transaction_id
  );

  RETURN v_row;
END;
$$;

ALTER TABLE crm.crm_cost_plan_internal_item_monthly_d ADD COLUMN owner_organization_id BIGINT;
ALTER TABLE crm.crm_cost_plan_ams_vendor_wbs_r ADD COLUMN owner_organization_id BIGINT;
ALTER TABLE crm.crm_cost_plan_ams_source_vendor_m ADD COLUMN owner_organization_id BIGINT;
ALTER TABLE crm.crm_cost_plan_accounting_handoff_m ADD COLUMN owner_organization_id BIGINT;
DROP INDEX crm.crm_cost_plan_internal_monthly_d_target_year_business_type__key;
CREATE UNIQUE INDEX ux_crm_cost_internal_org_basis ON crm.crm_cost_plan_internal_monthly_d(owner_organization_id, target_year, business_type, industry_line, owner_name, region_code, wbs_code);
CREATE UNIQUE INDEX ux_crm_cost_internal_org_basis_legacy ON crm.crm_cost_plan_internal_monthly_d(target_year, business_type, industry_line, owner_name, region_code, wbs_code) WHERE owner_organization_id IS NULL;
ALTER TABLE crm.crm_cost_plan_internal_item_monthly_d DROP CONSTRAINT crm_cost_plan_internal_item_monthly_d_target_year_item_code_key;
CREATE UNIQUE INDEX ux_crm_cost_internal_item_org_basis ON crm.crm_cost_plan_internal_item_monthly_d(owner_organization_id, target_year, item_code);
CREATE UNIQUE INDEX ux_crm_cost_internal_item_org_basis_legacy ON crm.crm_cost_plan_internal_item_monthly_d(target_year, item_code) WHERE owner_organization_id IS NULL;
DROP INDEX crm.crm_cost_plan_ams_vendor_wbs_r_target_year_business_type_in_key;
CREATE UNIQUE INDEX ux_crm_cost_ams_mapping_org_basis ON crm.crm_cost_plan_ams_vendor_wbs_r(owner_organization_id, target_year, business_type, industry_line, owner_name, region_code, wbs_code);
CREATE UNIQUE INDEX ux_crm_cost_ams_mapping_org_basis_legacy ON crm.crm_cost_plan_ams_vendor_wbs_r(target_year, business_type, industry_line, owner_name, region_code, wbs_code) WHERE owner_organization_id IS NULL;
DROP INDEX crm.crm_cost_plan_ams_external_monthly_d_target_year_business_t_key;
CREATE UNIQUE INDEX ux_crm_cost_ams_external_org_basis ON crm.crm_cost_plan_ams_external_monthly_d(owner_organization_id, target_year, business_type, industry_line, owner_name, region_code, wbs_code, vendor_name);
CREATE UNIQUE INDEX ux_crm_cost_ams_external_org_basis_legacy ON crm.crm_cost_plan_ams_external_monthly_d(target_year, business_type, industry_line, owner_name, region_code, wbs_code, vendor_name) WHERE owner_organization_id IS NULL;

-- Keep the old unassigned series constraint. Organization-owned series retain
-- confirmed historical versions; readers select the highest confirmed version.
-- The organization/year/version unique key above still forbids duplicate versions.
DROP INDEX crm.ux_crm_business_plan_m_confirmed_year;
CREATE UNIQUE INDEX ux_crm_business_plan_m_confirmed_year
  ON crm.crm_business_plan_m(base_year)
  WHERE owner_organization_id IS NULL AND confirmed = true AND is_active = true;
CREATE INDEX ix_crm_business_plan_m_org_confirmed
  ON crm.crm_business_plan_m(owner_organization_id, base_year, version_no DESC)
  WHERE confirmed = true AND is_active = true;

DROP INDEX crm.ux_crm_report_confirmation_m_active_basis;
CREATE UNIQUE INDEX ux_crm_report_confirmation_m_active_basis
  ON crm.crm_report_confirmation_m(owner_organization_id, target_year, business_type, industry_line, region_code, search_text) NULLS NOT DISTINCT
  WHERE is_active = true AND status_code = 'confirmed';

DROP INDEX crm.ux_crm_cost_plan_accounting_handoff_m_active_basis;
CREATE UNIQUE INDEX ux_crm_cost_plan_accounting_handoff_m_active_basis
  ON crm.crm_cost_plan_accounting_handoff_m(owner_organization_id, target_year, business_type_filter, industry_line_filter, region_filter, search_filter) NULLS NOT DISTINCT
  WHERE is_active = true;
