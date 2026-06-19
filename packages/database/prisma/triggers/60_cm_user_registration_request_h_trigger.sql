-- =========================================================
-- History Trigger: common.cm_user_registration_request_m -> common.cm_user_registration_request_h
-- Schema: common
-- =========================================================

CREATE OR REPLACE FUNCTION fn_cm_user_registration_request_h_trigger()
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
  FROM common.cm_user_registration_request_h
  WHERE registration_request_id = v_record.registration_request_id;

  INSERT INTO common.cm_user_registration_request_h (
    registration_request_id, history_seq, event_type, event_at,
    provider_code, tenant_id, subject_id, email, user_principal_name,
    display_name, raw_claims, status_code, requested_at,
    decided_at, decided_by_user_id, decision_memo, created_user_id,
    created_by, created_at, updated_by, updated_at,
    last_source, last_activity, transaction_id
  ) VALUES (
    v_record.registration_request_id, v_history_seq, v_event_type, NOW(),
    v_record.provider_code, v_record.tenant_id, v_record.subject_id, v_record.email, v_record.user_principal_name,
    v_record.display_name, v_record.raw_claims, v_record.status_code, v_record.requested_at,
    v_record.decided_at, v_record.decided_by_user_id, v_record.decision_memo, v_record.created_user_id,
    v_record.created_by, v_record.created_at, v_record.updated_by, v_record.updated_at,
    v_record.last_source, v_record.last_activity, v_record.transaction_id
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cm_user_registration_request_h ON common.cm_user_registration_request_m;

CREATE TRIGGER trg_cm_user_registration_request_h
AFTER INSERT OR UPDATE OR DELETE ON common.cm_user_registration_request_m
FOR EACH ROW EXECUTE FUNCTION fn_cm_user_registration_request_h_trigger();

COMMENT ON FUNCTION fn_cm_user_registration_request_h_trigger() IS '사용자 가입 신청 히스토리 트리거 함수';
