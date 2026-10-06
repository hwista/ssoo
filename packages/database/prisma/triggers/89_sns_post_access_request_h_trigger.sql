-- Full-row audit; source row updates serialize history sequence allocation.
CREATE OR REPLACE FUNCTION sns.fn_sns_post_access_request_h_trigger() RETURNS TRIGGER AS $$
DECLARE r RECORD; seq BIGINT;
BEGIN
  IF TG_OP = 'DELETE' THEN r := OLD; ELSE r := NEW; END IF;
  SELECT COALESCE(MAX(history_seq), 0) + 1 INTO seq FROM sns.sns_post_access_request_h WHERE id = r.id;
  INSERT INTO sns.sns_post_access_request_h (id, post_id, requester_user_id, requested_role, status_code, request_message, decided_by, decided_at, decision_message, expires_at, is_active, memo, created_by, created_at, updated_by, updated_at, last_source, last_activity, transaction_id, history_seq, event_type, event_at)
  VALUES (r.id, r.post_id, r.requester_user_id, r.requested_role, r.status_code, r.request_message, r.decided_by, r.decided_at, r.decision_message, r.expires_at, r.is_active, r.memo, r.created_by, r.created_at, r.updated_by, r.updated_at, r.last_source, r.last_activity, r.transaction_id, seq, CASE TG_OP WHEN 'INSERT' THEN 'C' WHEN 'UPDATE' THEN 'U' ELSE 'D' END, NOW());
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_sns_post_access_request_h ON sns.sns_post_access_request_m;
CREATE TRIGGER trg_sns_post_access_request_h AFTER INSERT OR UPDATE OR DELETE ON sns.sns_post_access_request_m
FOR EACH ROW EXECUTE FUNCTION sns.fn_sns_post_access_request_h_trigger();
