-- =========================================================
-- History Trigger: dms.dm_document_comment_m -> dms.dm_document_comment_h
-- Schema: dms
-- =========================================================

CREATE OR REPLACE FUNCTION fn_dm_document_comment_h_trigger()
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
  FROM dms.dm_document_comment_h
  WHERE comment_id = v_record.comment_id;

  INSERT INTO dms.dm_document_comment_h (
    comment_id, history_seq, event_type, event_at,
    document_id, comment_key, parent_comment_key, comment_content,
    author_name, author_email, avatar_url, comment_created_at, comment_deleted_at, sort_order,
    is_active, memo, created_by, created_at, updated_by, updated_at,
    last_source, last_activity, transaction_id
  ) VALUES (
    v_record.comment_id, v_history_seq, v_event_type, NOW(),
    v_record.document_id, v_record.comment_key, v_record.parent_comment_key, v_record.comment_content,
    v_record.author_name, v_record.author_email, v_record.avatar_url, v_record.comment_created_at, v_record.comment_deleted_at, v_record.sort_order,
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

DROP TRIGGER IF EXISTS trg_dm_document_comment_h ON dms.dm_document_comment_m;

CREATE TRIGGER trg_dm_document_comment_h
AFTER INSERT OR UPDATE OR DELETE ON dms.dm_document_comment_m
FOR EACH ROW EXECUTE FUNCTION fn_dm_document_comment_h_trigger();

COMMENT ON FUNCTION fn_dm_document_comment_h_trigger() IS 'DMS 문서 comment relation 히스토리 트리거 함수';
