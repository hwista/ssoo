-- =========================================================
-- History Trigger: dms.dm_document_grant_r -> dms.dm_document_grant_h
-- Schema: dms
-- =========================================================

CREATE OR REPLACE FUNCTION fn_dm_document_grant_h_trigger()
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
  FROM dms.dm_document_grant_h
  WHERE document_grant_id = v_record.document_grant_id;

  INSERT INTO dms.dm_document_grant_h (
    document_grant_id, history_seq, event_type, event_at,
    document_id, principal_type, principal_ref, role_code,
    grant_source_code, granted_from_request_id, granted_at, granted_by_user_id,
    expires_at, revoked_at, revoked_by_user_id, revoke_reason, reason,
    is_active, memo, created_by, created_at, updated_by, updated_at,
    last_source, last_activity, transaction_id
  ) VALUES (
    v_record.document_grant_id, v_history_seq, v_event_type, NOW(),
    v_record.document_id, v_record.principal_type, v_record.principal_ref, v_record.role_code,
    v_record.grant_source_code, v_record.granted_from_request_id, v_record.granted_at, v_record.granted_by_user_id,
    v_record.expires_at, v_record.revoked_at, v_record.revoked_by_user_id, v_record.revoke_reason, v_record.reason,
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

DROP TRIGGER IF EXISTS trg_dm_document_grant_h ON dms.dm_document_grant_r;

CREATE TRIGGER trg_dm_document_grant_h
AFTER INSERT OR UPDATE OR DELETE ON dms.dm_document_grant_r
FOR EACH ROW EXECUTE FUNCTION fn_dm_document_grant_h_trigger();

COMMENT ON FUNCTION fn_dm_document_grant_h_trigger() IS 'DMS 문서 grant 히스토리 트리거 함수';
