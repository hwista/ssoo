-- =========================================================
-- History Trigger: pms.pr_handoff_m -> pms.pr_handoff_h
-- Schema: pms
-- =========================================================

CREATE OR REPLACE FUNCTION fn_pr_handoff_h_trigger()
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
  FROM pms.pr_handoff_h
  WHERE handoff_id = v_record.handoff_id;

  INSERT INTO pms.pr_handoff_h (
    handoff_id, history_seq, event_type, event_at,
    project_id, from_phase_code, to_phase_code, handoff_type_code,
    from_user_id, to_user_id, requested_by_user_id,
    handoff_status_code, condition_note, assigned_role_code,
    requested_at, responded_at, responded_by_user_id,
    is_active, memo, created_by, created_at, updated_by, updated_at,
    last_source, last_activity, transaction_id
  ) VALUES (
    v_record.handoff_id, v_history_seq, v_event_type, NOW(),
    v_record.project_id, v_record.from_phase_code, v_record.to_phase_code, v_record.handoff_type_code,
    v_record.from_user_id, v_record.to_user_id, v_record.requested_by_user_id,
    v_record.handoff_status_code, v_record.condition_note, v_record.assigned_role_code,
    v_record.requested_at, v_record.responded_at, v_record.responded_by_user_id,
    v_record.is_active, v_record.memo, v_record.created_by, v_record.created_at, v_record.updated_by, v_record.updated_at,
    v_record.last_source, v_record.last_activity, v_record.transaction_id
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pr_handoff_h ON pms.pr_handoff_m;

CREATE TRIGGER trg_pr_handoff_h
AFTER INSERT OR UPDATE OR DELETE ON pms.pr_handoff_m
FOR EACH ROW EXECUTE FUNCTION fn_pr_handoff_h_trigger();

COMMENT ON FUNCTION fn_pr_handoff_h_trigger() IS '프로젝트 핸드오프 히스토리 트리거 함수';
