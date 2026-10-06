-- =========================================================
-- History Trigger: crm.crm_business_plan_m -> crm.crm_business_plan_h
-- Schema: crm
-- =========================================================

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

DROP TRIGGER IF EXISTS "trg_crm_business_plan_m_h_record" ON "crm"."crm_business_plan_m";
CREATE TRIGGER "trg_crm_business_plan_m_h_record"
AFTER INSERT OR UPDATE OR DELETE ON "crm"."crm_business_plan_m"
FOR EACH ROW EXECUTE FUNCTION "crm"."fn_crm_business_plan_h_record"();

COMMENT ON FUNCTION "crm"."fn_crm_business_plan_h_record"() IS 'CRM 사업계획 히스토리 트리거 함수';
