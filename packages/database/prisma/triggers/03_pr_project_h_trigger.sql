-- =========================================================
-- History Trigger: pms.pr_project_m -> pms.pr_project_h
-- Schema: pms
-- =========================================================

CREATE OR REPLACE FUNCTION fn_pr_project_h_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_history_seq BIGINT;
  v_record RECORD;
  v_event_type CHAR(1);
BEGIN
  -- 이벤트 타입 결정
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'C';
    v_record := NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_event_type := 'U';
    v_record := NEW;
  ELSE -- DELETE
    v_event_type := 'D';
    v_record := OLD;
  END IF;

  -- history_seq 계산
  SELECT COALESCE(MAX(history_seq), 0) + 1
  INTO v_history_seq
  FROM pms.pr_project_h
  WHERE project_id = v_record.project_id;

  -- 히스토리 테이블에 삽입
  INSERT INTO pms.pr_project_h (
    project_id, history_seq, event_type, event_at,
    project_name, status_code, stage_code, done_result_code,
    current_owner_user_id,
    handoff_type_code, handoff_status_code, handoff_requested_at, handoff_confirmed_at, handoff_confirmed_by,
    customer_id, plant_id, system_instance_id,
    is_active, memo, created_by, created_at, updated_by, updated_at,
    last_source, last_activity, transaction_id
  ) VALUES (
    v_record.project_id, v_history_seq, v_event_type, NOW(),
    v_record.project_name, v_record.status_code, v_record.stage_code, v_record.done_result_code,
    v_record.current_owner_user_id,
    v_record.handoff_type_code, v_record.handoff_status_code, v_record.handoff_requested_at, v_record.handoff_confirmed_at, v_record.handoff_confirmed_by,
    v_record.customer_id, v_record.plant_id, v_record.system_instance_id,
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

-- 기존 트리거 삭제 후 재생성
DROP TRIGGER IF EXISTS trg_pr_project_h ON pms.pr_project_m;

CREATE TRIGGER trg_pr_project_h
AFTER INSERT OR UPDATE OR DELETE ON pms.pr_project_m
FOR EACH ROW EXECUTE FUNCTION fn_pr_project_h_trigger();

COMMENT ON FUNCTION fn_pr_project_h_trigger() IS '프로젝트 마스터 히스토리 트리거 함수';
