-- =========================================================
-- History Trigger: pms.pr_wbs_m -> pms.pr_wbs_h
-- Schema: pms
-- =========================================================

CREATE OR REPLACE FUNCTION fn_pr_wbs_h_trigger()
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
  FROM pms.pr_wbs_h
  WHERE wbs_id = v_record.wbs_id;

  INSERT INTO pms.pr_wbs_h (
    wbs_id, history_seq, event_type, event_at,
    project_id, objective_id, parent_wbs_id, wbs_code, wbs_name, description,
    status_code, depth, sort_order,
    is_active, memo, created_by, created_at, updated_by, updated_at,
    last_source, last_activity, transaction_id
  ) VALUES (
    v_record.wbs_id, v_history_seq, v_event_type, NOW(),
    v_record.project_id, v_record.objective_id, v_record.parent_wbs_id, v_record.wbs_code, v_record.wbs_name, v_record.description,
    v_record.status_code, v_record.depth, v_record.sort_order,
    v_record.is_active, v_record.memo, v_record.created_by, v_record.created_at, v_record.updated_by, v_record.updated_at,
    v_record.last_source, v_record.last_activity, v_record.transaction_id
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pr_wbs_h ON pms.pr_wbs_m;

CREATE TRIGGER trg_pr_wbs_h
AFTER INSERT OR UPDATE OR DELETE ON pms.pr_wbs_m
FOR EACH ROW EXECUTE FUNCTION fn_pr_wbs_h_trigger();

COMMENT ON FUNCTION fn_pr_wbs_h_trigger() IS '프로젝트 WBS 히스토리 트리거 함수';
