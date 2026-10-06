-- =========================================================
-- History Trigger: crm.crm_customer_m -> crm.crm_customer_h
-- Schema: crm
-- =========================================================

CREATE OR REPLACE FUNCTION fn_crm_customer_h_trigger()
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
  FROM crm.crm_customer_h
  WHERE customer_id = v_record.customer_id;

  INSERT INTO crm.crm_customer_h (
    customer_id, history_seq, event_type, event_at, event_by,
    customer_code, customer_name, customer_type_code, industry_line, region_code,
    owner_name, owner_user_id, owner_organization_id, contact_name, contact_email, contact_phone,
    source_opportunity_id, latest_opportunity_code, latest_activity_at,
    last_interaction_summary, next_action, admin_boundary_code,
    is_active, memo, created_by, created_at, updated_by, updated_at,
    last_source, last_activity, transaction_id
  ) VALUES (
    v_record.customer_id, v_history_seq, v_event_type, NOW(), v_record.updated_by,
    v_record.customer_code, v_record.customer_name, v_record.customer_type_code, v_record.industry_line, v_record.region_code,
    v_record.owner_name, v_record.owner_user_id, v_record.owner_organization_id, v_record.contact_name, v_record.contact_email, v_record.contact_phone,
    v_record.source_opportunity_id, v_record.latest_opportunity_code, v_record.latest_activity_at,
    v_record.last_interaction_summary, v_record.next_action, v_record.admin_boundary_code,
    v_record.is_active, v_record.memo, v_record.created_by, v_record.created_at, v_record.updated_by, v_record.updated_at,
    v_record.last_source, v_record.last_activity, v_record.transaction_id
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_crm_customer_h ON crm.crm_customer_m;

CREATE TRIGGER trg_crm_customer_h
AFTER INSERT OR UPDATE OR DELETE ON crm.crm_customer_m
FOR EACH ROW EXECUTE FUNCTION fn_crm_customer_h_trigger();

COMMENT ON FUNCTION fn_crm_customer_h_trigger() IS 'CRM 고객 원장 히스토리 트리거 함수';
