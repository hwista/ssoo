-- =========================================================
-- History Trigger: dms.dm_document_source_file_m -> dms.dm_document_source_file_h
-- Schema: dms
-- =========================================================

CREATE OR REPLACE FUNCTION fn_dm_document_source_file_h_trigger()
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
  FROM dms.dm_document_source_file_h
  WHERE source_file_id = v_record.source_file_id;

  INSERT INTO dms.dm_document_source_file_h (
    source_file_id, history_seq, event_type, event_at,
    document_id, source_name, source_path, media_type, file_size,
    url, storage_uri, provider_code, version_id, etag, checksum,
    origin_code, status_code, storage_mode, kind_code, sort_order, projection_jsonb,
    is_active, memo, created_by, created_at, updated_by, updated_at,
    last_source, last_activity, transaction_id
  ) VALUES (
    v_record.source_file_id, v_history_seq, v_event_type, NOW(),
    v_record.document_id, v_record.source_name, v_record.source_path, v_record.media_type, v_record.file_size,
    v_record.url, v_record.storage_uri, v_record.provider_code, v_record.version_id, v_record.etag, v_record.checksum,
    v_record.origin_code, v_record.status_code, v_record.storage_mode, v_record.kind_code, v_record.sort_order, v_record.projection_jsonb,
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

DROP TRIGGER IF EXISTS trg_dm_document_source_file_h ON dms.dm_document_source_file_m;

CREATE TRIGGER trg_dm_document_source_file_h
AFTER INSERT OR UPDATE OR DELETE ON dms.dm_document_source_file_m
FOR EACH ROW EXECUTE FUNCTION fn_dm_document_source_file_h_trigger();

COMMENT ON FUNCTION fn_dm_document_source_file_h_trigger() IS 'DMS 문서 source file registry 히스토리 트리거 함수';
