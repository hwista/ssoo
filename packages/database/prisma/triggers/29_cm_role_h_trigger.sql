-- =========================================================
-- History Trigger: common.cm_role_m -> common.cm_role_h
-- Schema: common
-- =========================================================

CREATE OR REPLACE FUNCTION fn_cm_role_h_trigger()
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
  FROM common.cm_role_h
  WHERE role_id = v_record.role_id;

  INSERT INTO common.cm_role_h (
    role_id, history_seq, event_type, event_at,
    role_code, role_name, role_scope_code, description, sort_order,
    is_active, memo, created_by, created_at, updated_by, updated_at,
    last_source, last_activity, transaction_id
  ) VALUES (
    v_record.role_id, v_history_seq, v_event_type, NOW(),
    v_record.role_code, v_record.role_name, v_record.role_scope_code, v_record.description, v_record.sort_order,
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

DROP TRIGGER IF EXISTS trg_cm_role_h ON common.cm_role_m;

CREATE TRIGGER trg_cm_role_h
AFTER INSERT OR UPDATE OR DELETE ON common.cm_role_m
FOR EACH ROW EXECUTE FUNCTION fn_cm_role_h_trigger();

COMMENT ON FUNCTION fn_cm_role_h_trigger() IS '공통 role vocabulary 히스토리 트리거 함수';
