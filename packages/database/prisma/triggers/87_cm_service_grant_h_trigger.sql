-- Full-row audit; source row updates serialize history sequence allocation.
CREATE OR REPLACE FUNCTION common.fn_cm_service_grant_h_trigger() RETURNS TRIGGER AS $$
DECLARE r RECORD; seq BIGINT;
BEGIN
  IF TG_OP = 'DELETE' THEN r := OLD; ELSE r := NEW; END IF;
  SELECT COALESCE(MAX(history_seq), 0) + 1 INTO seq FROM common.cm_service_grant_h WHERE id = r.id;
  INSERT INTO common.cm_service_grant_h (id, user_id, org_id, service_code, role_code, scope_key, source_code, expires_at, is_active, memo, created_by, created_at, updated_by, updated_at, last_source, last_activity, transaction_id, history_seq, event_type, event_at)
  VALUES (r.id, r.user_id, r.org_id, r.service_code, r.role_code, r.scope_key, r.source_code, r.expires_at, r.is_active, r.memo, r.created_by, r.created_at, r.updated_by, r.updated_at, r.last_source, r.last_activity, r.transaction_id, seq, CASE TG_OP WHEN 'INSERT' THEN 'C' WHEN 'UPDATE' THEN 'U' ELSE 'D' END, NOW());
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_cm_service_grant_h ON common.cm_service_grant_m;
CREATE TRIGGER trg_cm_service_grant_h AFTER INSERT OR UPDATE OR DELETE ON common.cm_service_grant_m
FOR EACH ROW EXECUTE FUNCTION common.fn_cm_service_grant_h_trigger();
