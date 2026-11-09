CREATE OR REPLACE FUNCTION common.fn_cm_integration_setting_h_trigger() RETURNS TRIGGER AS $$
DECLARE v_record RECORD; v_seq BIGINT;
BEGIN
  IF TG_OP = 'DELETE' THEN v_record := OLD; ELSE v_record := NEW; END IF;
  SELECT COALESCE(MAX(history_seq),0)+1 INTO v_seq FROM common.cm_integration_setting_h WHERE kind=v_record.kind;
  INSERT INTO common.cm_integration_setting_h (kind,config_jsonb,secrets_ciphertext,secrets_nonce,secrets_tag,activated_at,created_by,created_at,updated_by,updated_at,last_source,last_activity,transaction_id,history_seq,event_type,event_at)
  VALUES (v_record.kind,v_record.config_jsonb,v_record.secrets_ciphertext,v_record.secrets_nonce,v_record.secrets_tag,v_record.activated_at,v_record.created_by,v_record.created_at,v_record.updated_by,v_record.updated_at,v_record.last_source,v_record.last_activity,v_record.transaction_id,v_seq,CASE TG_OP WHEN 'INSERT' THEN 'C' WHEN 'UPDATE' THEN 'U' ELSE 'D' END,now());
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_cm_integration_setting_h ON common.cm_integration_setting_m;
CREATE TRIGGER trg_cm_integration_setting_h AFTER INSERT OR UPDATE OR DELETE ON common.cm_integration_setting_m
FOR EACH ROW EXECUTE FUNCTION common.fn_cm_integration_setting_h_trigger();
