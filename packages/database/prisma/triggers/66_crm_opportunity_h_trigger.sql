-- =========================================================
-- History Trigger: crm.crm_opportunity_m -> crm.crm_opportunity_h
-- Schema: crm
-- =========================================================

CREATE OR REPLACE FUNCTION fn_crm_opportunity_h_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_history_seq BIGINT;
  v_record RECORD;
  v_event_type CHAR(1);
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'C';
    v_record := NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_event_type := 'U';
    v_record := NEW;
  ELSE
    v_event_type := 'D';
    v_record := OLD;
  END IF;

  SELECT COALESCE(MAX(history_seq), 0) + 1
  INTO v_history_seq
  FROM crm.crm_opportunity_h
  WHERE opportunity_id = v_record.opportunity_id;

  INSERT INTO crm.crm_opportunity_h (
    opportunity_id, history_seq, event_type, event_at, event_by,
    opportunity_code, opportunity_group_code, customer_name, opportunity_name, owner_name, owner_user_id, owner_organization_id,
    business_type, industry_line, region_code, status_code, priority_code,
    version_no, confirmed, contract_created, contract_created_at, contract_code,
    expected_start_date, expected_end_date,
    payment_term_code, quote_status_code, quote_client_contact_name, quote_issued_at, quote_valid_until, quote_memo,
    revenue_subtotal, special_discount_type_code, special_discount_value,
    special_discount_amount, revenue_total, cost_total, pms_handoff_status_code, dms_link_status_code,
    admin_boundary_code, next_action, is_active, memo, created_by, created_at,
    updated_by, updated_at, last_source, last_activity, transaction_id
  ) VALUES (
    v_record.opportunity_id, v_history_seq, v_event_type, NOW(), v_record.updated_by,
    v_record.opportunity_code, v_record.opportunity_group_code, v_record.customer_name, v_record.opportunity_name, v_record.owner_name, v_record.owner_user_id, v_record.owner_organization_id,
    v_record.business_type, v_record.industry_line, v_record.region_code, v_record.status_code, v_record.priority_code,
    v_record.version_no, v_record.confirmed, v_record.contract_created, v_record.contract_created_at, v_record.contract_code,
    v_record.expected_start_date, v_record.expected_end_date,
    v_record.payment_term_code, v_record.quote_status_code, v_record.quote_client_contact_name, v_record.quote_issued_at, v_record.quote_valid_until, v_record.quote_memo,
    v_record.revenue_subtotal, v_record.special_discount_type_code, v_record.special_discount_value,
    v_record.special_discount_amount, v_record.revenue_total, v_record.cost_total, v_record.pms_handoff_status_code, v_record.dms_link_status_code,
    v_record.admin_boundary_code, v_record.next_action, v_record.is_active, v_record.memo, v_record.created_by, v_record.created_at,
    v_record.updated_by, v_record.updated_at, v_record.last_source, v_record.last_activity, v_record.transaction_id
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_crm_opportunity_h ON crm.crm_opportunity_m;

CREATE TRIGGER trg_crm_opportunity_h
AFTER INSERT OR UPDATE OR DELETE ON crm.crm_opportunity_m
FOR EACH ROW EXECUTE FUNCTION fn_crm_opportunity_h_trigger();

COMMENT ON FUNCTION fn_crm_opportunity_h_trigger() IS 'CRM 영업기회 히스토리 트리거 함수';
