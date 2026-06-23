-- =========================================================
-- History Trigger: common.cm_ai_source_m -> common.cm_ai_source_h
-- Schema: common
-- =========================================================

CREATE OR REPLACE FUNCTION fn_cm_ai_source_h_trigger()
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
  FROM common.cm_ai_source_h
  WHERE ai_source_id = v_record.ai_source_id;

  INSERT INTO common.cm_ai_source_h (
    ai_source_id, history_seq, event_type, event_at,
    source_app_code, source_name, source_kind_code, adapter_code,
    embedding_profile_code, source_status_code,
    indexing_enabled, keyword_search_enabled, metadata_search_enabled,
    semantic_search_enabled, vector_search_enabled, rag_context_enabled,
    metadata_jsonb,
    is_active, memo, created_by, created_at, updated_by, updated_at,
    last_source, last_activity, transaction_id
  ) VALUES (
    v_record.ai_source_id, v_history_seq, v_event_type, NOW(),
    v_record.source_app_code, v_record.source_name, v_record.source_kind_code, v_record.adapter_code,
    v_record.embedding_profile_code, v_record.source_status_code,
    v_record.indexing_enabled, v_record.keyword_search_enabled, v_record.metadata_search_enabled,
    v_record.semantic_search_enabled, v_record.vector_search_enabled, v_record.rag_context_enabled,
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

DROP TRIGGER IF EXISTS trg_cm_ai_source_h ON common.cm_ai_source_m;

CREATE TRIGGER trg_cm_ai_source_h
AFTER INSERT OR UPDATE OR DELETE ON common.cm_ai_source_m
FOR EACH ROW EXECUTE FUNCTION fn_cm_ai_source_h_trigger();

COMMENT ON FUNCTION fn_cm_ai_source_h_trigger() IS '공용 AI/RAG source registry 히스토리 트리거 함수';
