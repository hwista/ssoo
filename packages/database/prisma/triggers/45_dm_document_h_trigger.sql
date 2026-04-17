-- =========================================================
-- History Trigger: dms.dm_document_m -> dms.dm_document_h
-- Schema: dms
-- =========================================================

CREATE OR REPLACE FUNCTION fn_dm_document_h_trigger()
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
  FROM dms.dm_document_h
  WHERE document_id = v_record.document_id;

  INSERT INTO dms.dm_document_h (
    document_id, history_seq, event_type, event_at,
    relative_path, visibility_scope, target_org_id, owner_user_id,
    document_status_code, sync_status_code,
    revision_seq, content_hash, latest_git_commit_hash, metadata_jsonb,
    last_scanned_at, last_synced_at, last_reconciled_at,
    is_active, memo, created_by, created_at, updated_by, updated_at,
    last_source, last_activity, transaction_id
  ) VALUES (
    v_record.document_id, v_history_seq, v_event_type, NOW(),
    v_record.relative_path, v_record.visibility_scope, v_record.target_org_id, v_record.owner_user_id,
    v_record.document_status_code, v_record.sync_status_code,
    v_record.revision_seq, v_record.content_hash, v_record.latest_git_commit_hash, v_record.metadata_jsonb,
    v_record.last_scanned_at, v_record.last_synced_at, v_record.last_reconciled_at,
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

DROP TRIGGER IF EXISTS trg_dm_document_h ON dms.dm_document_m;

CREATE TRIGGER trg_dm_document_h
AFTER INSERT OR UPDATE OR DELETE ON dms.dm_document_m
FOR EACH ROW EXECUTE FUNCTION fn_dm_document_h_trigger();

COMMENT ON FUNCTION fn_dm_document_h_trigger() IS 'DMS 문서 control-plane 히스토리 트리거 함수';
