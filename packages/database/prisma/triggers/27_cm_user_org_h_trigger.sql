-- =========================================================
-- History Trigger: common.cm_user_org_r -> common.cm_user_org_h
-- Schema: common
-- =========================================================

CREATE OR REPLACE FUNCTION fn_cm_user_org_h_trigger()
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
  FROM common.cm_user_org_h
  WHERE user_org_relation_id = v_record.user_org_relation_id;

  INSERT INTO common.cm_user_org_h (
    user_org_relation_id, history_seq, event_type, event_at,
    user_id, org_id, is_primary, is_leader, affiliation_role, position_code, employee_number,
    effective_from, effective_to, is_active, memo,
    created_by, created_at, updated_by, updated_at,
    last_source, last_activity, transaction_id
  ) VALUES (
    v_record.user_org_relation_id, v_history_seq, v_event_type, NOW(),
    v_record.user_id, v_record.org_id, v_record.is_primary, v_record.is_leader, v_record.affiliation_role, v_record.position_code, v_record.employee_number,
    v_record.effective_from, v_record.effective_to, v_record.is_active, v_record.memo,
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

DROP TRIGGER IF EXISTS trg_cm_user_org_h ON common.cm_user_org_r;

CREATE TRIGGER trg_cm_user_org_h
AFTER INSERT OR UPDATE OR DELETE ON common.cm_user_org_r
FOR EACH ROW EXECUTE FUNCTION fn_cm_user_org_h_trigger();

COMMENT ON FUNCTION fn_cm_user_org_h_trigger() IS '사용자-조직 관계 히스토리 트리거 함수';
