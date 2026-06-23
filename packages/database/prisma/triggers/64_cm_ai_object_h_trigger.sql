-- =========================================================
-- History Trigger: common.cm_ai_object_m -> common.cm_ai_object_h
-- Schema: common
-- =========================================================

CREATE OR REPLACE FUNCTION fn_cm_ai_object_h_trigger()
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
  FROM common.cm_ai_object_h
  WHERE ai_object_id = v_record.ai_object_id;

  INSERT INTO common.cm_ai_object_h (
    ai_object_id, history_seq, event_type, event_at,
    ai_source_id, source_app_code, entity_type_code, entity_id, source_version,
    title, body_text, summary_text, target_path, target_external_href,
    sensitivity_code, acl_policy_code, search_eligible, context_eligible,
    content_hash, indexed_at, metadata_jsonb,
    is_active, memo, created_by, created_at, updated_by, updated_at,
    last_source, last_activity, transaction_id
  ) VALUES (
    v_record.ai_object_id, v_history_seq, v_event_type, NOW(),
    v_record.ai_source_id, v_record.source_app_code, v_record.entity_type_code, v_record.entity_id, v_record.source_version,
    v_record.title, v_record.body_text, v_record.summary_text, v_record.target_path, v_record.target_external_href,
    v_record.sensitivity_code, v_record.acl_policy_code, v_record.search_eligible, v_record.context_eligible,
    v_record.content_hash, v_record.indexed_at, v_record.metadata_jsonb,
    v_record.is_active, v_record.memo, v_record.created_by, v_record.created_at, v_record.updated_by, v_record.updated_at,
    v_record.last_source, v_record.last_activity, v_record.transaction_id
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cm_ai_object_h ON common.cm_ai_object_m;

CREATE TRIGGER trg_cm_ai_object_h
AFTER INSERT OR UPDATE OR DELETE ON common.cm_ai_object_m
FOR EACH ROW EXECUTE FUNCTION fn_cm_ai_object_h_trigger();

COMMENT ON FUNCTION fn_cm_ai_object_h_trigger() IS '공용 AI/RAG index object 히스토리 트리거 함수';
