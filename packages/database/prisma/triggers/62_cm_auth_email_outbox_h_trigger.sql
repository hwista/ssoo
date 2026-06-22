-- =========================================================
-- History Trigger: common.cm_auth_email_outbox_m -> common.cm_auth_email_outbox_h
-- Schema: common
-- =========================================================

CREATE OR REPLACE FUNCTION fn_cm_auth_email_outbox_h_trigger()
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
  FROM common.cm_auth_email_outbox_h
  WHERE message_id = v_record.message_id;

  INSERT INTO common.cm_auth_email_outbox_h (
    message_id, history_seq, event_type, event_at,
    to_email, from_email, template_code, subject, body_text,
    reference_type, reference_id, status_code, sent_at, failed_at, fail_reason,
    created_by, created_at, updated_by, updated_at,
    last_source, last_activity, transaction_id
  ) VALUES (
    v_record.message_id, v_history_seq, v_event_type, NOW(),
    v_record.to_email, v_record.from_email, v_record.template_code, v_record.subject, v_record.body_text,
    v_record.reference_type, v_record.reference_id, v_record.status_code, v_record.sent_at, v_record.failed_at, v_record.fail_reason,
    v_record.created_by, v_record.created_at, v_record.updated_by, v_record.updated_at,
    v_record.last_source, v_record.last_activity, v_record.transaction_id
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cm_auth_email_outbox_h ON common.cm_auth_email_outbox_m;

CREATE TRIGGER trg_cm_auth_email_outbox_h
AFTER INSERT OR UPDATE OR DELETE ON common.cm_auth_email_outbox_m
FOR EACH ROW EXECUTE FUNCTION fn_cm_auth_email_outbox_h_trigger();

COMMENT ON FUNCTION fn_cm_auth_email_outbox_h_trigger() IS '인증 메일 outbox 히스토리 트리거 함수';
