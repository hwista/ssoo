-- =========================================================
-- History Trigger: common.cm_user_permission_exception_r -> common.cm_user_permission_exception_h
-- Schema: common
-- =========================================================

CREATE OR REPLACE FUNCTION fn_cm_user_permission_exception_h_trigger()
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
  FROM common.cm_user_permission_exception_h
  WHERE user_permission_exception_id = v_record.user_permission_exception_id;

  INSERT INTO common.cm_user_permission_exception_h (
    user_permission_exception_id, history_seq, event_type, event_at,
    user_id, permission_id, exception_axis, effect_type,
    target_org_id, target_object_type, target_object_id,
    expires_at, applied_by_user_id, applied_at, reason,
    is_active, memo, created_by, created_at, updated_by, updated_at,
    last_source, last_activity, transaction_id
  ) VALUES (
    v_record.user_permission_exception_id, v_history_seq, v_event_type, NOW(),
    v_record.user_id, v_record.permission_id, v_record.exception_axis, v_record.effect_type,
    v_record.target_org_id, v_record.target_object_type, v_record.target_object_id,
    v_record.expires_at, v_record.applied_by_user_id, v_record.applied_at, v_record.reason,
    v_record.is_active, v_record.memo, v_record.created_by, v_record.created_at, v_record.updated_by, v_record.updated_at,
    v_record.last_source, v_record.last_activity, v_record.transaction_id
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cm_user_permission_exception_h ON common.cm_user_permission_exception_r;

CREATE TRIGGER trg_cm_user_permission_exception_h
AFTER INSERT OR UPDATE OR DELETE ON common.cm_user_permission_exception_r
FOR EACH ROW EXECUTE FUNCTION fn_cm_user_permission_exception_h_trigger();

COMMENT ON FUNCTION fn_cm_user_permission_exception_h_trigger() IS '사용자 permission exception 히스토리 트리거 함수';
