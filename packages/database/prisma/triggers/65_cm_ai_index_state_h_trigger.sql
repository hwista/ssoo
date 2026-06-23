-- =========================================================
-- History Trigger: common.cm_ai_index_state_m -> common.cm_ai_index_state_h
-- Schema: common
-- =========================================================

CREATE OR REPLACE FUNCTION fn_cm_ai_index_state_h_trigger()
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
  FROM common.cm_ai_index_state_h
  WHERE ai_index_state_id = v_record.ai_index_state_id;

  INSERT INTO common.cm_ai_index_state_h (
    ai_index_state_id, history_seq, event_type, event_at,
    ai_source_id, ai_object_id, profile_code, index_status_code,
    chunk_count, indexed_chunk_count, last_indexed_source_version,
    last_requested_at, last_indexed_at, last_failed_at, last_error_message,
    metadata_jsonb,
    is_active, memo, created_by, created_at, updated_by, updated_at,
    last_source, last_activity, transaction_id
  ) VALUES (
    v_record.ai_index_state_id, v_history_seq, v_event_type, NOW(),
    v_record.ai_source_id, v_record.ai_object_id, v_record.profile_code, v_record.index_status_code,
    v_record.chunk_count, v_record.indexed_chunk_count, v_record.last_indexed_source_version,
    v_record.last_requested_at, v_record.last_indexed_at, v_record.last_failed_at, v_record.last_error_message,
    v_record.metadata_jsonb,
    v_record.is_active, v_record.memo, v_record.created_by, v_record.created_at, v_record.updated_by, v_record.updated_at,
    v_record.last_source, v_record.last_activity, v_record.transaction_id
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cm_ai_index_state_h ON common.cm_ai_index_state_m;

CREATE TRIGGER trg_cm_ai_index_state_h
AFTER INSERT OR UPDATE OR DELETE ON common.cm_ai_index_state_m
FOR EACH ROW EXECUTE FUNCTION fn_cm_ai_index_state_h_trigger();

COMMENT ON FUNCTION fn_cm_ai_index_state_h_trigger() IS '공용 AI/RAG index state 히스토리 트리거 함수';
