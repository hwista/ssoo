-- =========================================================
-- History Trigger: pms.pr_contract_m -> pms.pr_contract_h
-- Schema: pms
-- =========================================================

CREATE OR REPLACE FUNCTION fn_pr_contract_h_trigger()
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
  FROM pms.pr_contract_h
  WHERE contract_id = v_record.contract_id;

  INSERT INTO pms.pr_contract_h (
    contract_id, history_seq, event_type, event_at,
    project_id, contract_code, title, contract_type_code,
    total_amount, currency_code, contract_status_code,
    contract_date, start_date, end_date, manager_user_id,
    billing_type_code, delivery_method_code, is_primary,
    is_active, memo, created_by, created_at, updated_by, updated_at,
    last_source, last_activity, transaction_id
  ) VALUES (
    v_record.contract_id, v_history_seq, v_event_type, NOW(),
    v_record.project_id, v_record.contract_code, v_record.title, v_record.contract_type_code,
    v_record.total_amount, v_record.currency_code, v_record.contract_status_code,
    v_record.contract_date, v_record.start_date, v_record.end_date, v_record.manager_user_id,
    v_record.billing_type_code, v_record.delivery_method_code, v_record.is_primary,
    v_record.is_active, v_record.memo, v_record.created_by, v_record.created_at, v_record.updated_by, v_record.updated_at,
    v_record.last_source, v_record.last_activity, v_record.transaction_id
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pr_contract_h ON pms.pr_contract_m;

CREATE TRIGGER trg_pr_contract_h
AFTER INSERT OR UPDATE OR DELETE ON pms.pr_contract_m
FOR EACH ROW EXECUTE FUNCTION fn_pr_contract_h_trigger();

COMMENT ON FUNCTION fn_pr_contract_h_trigger() IS '프로젝트 계약 히스토리 트리거 함수';
