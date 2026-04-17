-- =========================================================
-- History Trigger: common.cm_user_auth_m -> common.cm_user_auth_h
-- Schema: common
-- =========================================================

CREATE OR REPLACE FUNCTION fn_cm_user_auth_h_trigger()
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
  FROM common.cm_user_auth_h
  WHERE user_id = v_record.user_id;

  INSERT INTO common.cm_user_auth_h (
    user_id, history_seq, event_type, event_at,
    login_id, password_hash, account_status_code,
    last_login_at, login_fail_count, locked_until,
    created_by, created_at, updated_by, updated_at,
    last_source, last_activity, transaction_id
  ) VALUES (
    v_record.user_id, v_history_seq, v_event_type, NOW(),
    v_record.login_id, v_record.password_hash, v_record.account_status_code,
    v_record.last_login_at, v_record.login_fail_count, v_record.locked_until,
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

DROP TRIGGER IF EXISTS trg_cm_user_auth_h ON common.cm_user_auth_m;

CREATE TRIGGER trg_cm_user_auth_h
AFTER INSERT OR UPDATE OR DELETE ON common.cm_user_auth_m
FOR EACH ROW EXECUTE FUNCTION fn_cm_user_auth_h_trigger();

COMMENT ON FUNCTION fn_cm_user_auth_h_trigger() IS '사용자 인증 계정 히스토리 트리거 함수';
