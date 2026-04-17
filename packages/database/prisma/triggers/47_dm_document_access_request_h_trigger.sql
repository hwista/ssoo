-- =========================================================
-- History Trigger: dms.dm_document_access_request_m -> dms.dm_document_access_request_h
-- Schema: dms
-- =========================================================

CREATE OR REPLACE FUNCTION fn_dm_document_access_request_h_trigger()
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
  FROM dms.dm_document_access_request_h
  WHERE access_request_id = v_record.access_request_id;

  INSERT INTO dms.dm_document_access_request_h (
    access_request_id, history_seq, event_type, event_at,
    document_id, requester_user_id, requested_role, status_code,
    request_message, requested_expires_at, responded_by_user_id, responded_at, response_message,
    is_active, memo, created_by, created_at, updated_by, updated_at,
    last_source, last_activity, transaction_id
  ) VALUES (
    v_record.access_request_id, v_history_seq, v_event_type, NOW(),
    v_record.document_id, v_record.requester_user_id, v_record.requested_role, v_record.status_code,
    v_record.request_message, v_record.requested_expires_at, v_record.responded_by_user_id, v_record.responded_at, v_record.response_message,
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

DROP TRIGGER IF EXISTS trg_dm_document_access_request_h ON dms.dm_document_access_request_m;

CREATE TRIGGER trg_dm_document_access_request_h
AFTER INSERT OR UPDATE OR DELETE ON dms.dm_document_access_request_m
FOR EACH ROW EXECUTE FUNCTION fn_dm_document_access_request_h_trigger();

COMMENT ON FUNCTION fn_dm_document_access_request_h_trigger() IS 'DMS 문서 access request 히스토리 트리거 함수';
