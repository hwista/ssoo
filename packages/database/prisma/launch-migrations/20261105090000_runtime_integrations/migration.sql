CREATE TABLE common.cm_integration_setting_m (
kind VARCHAR(40) NOT NULL,
config_jsonb JSONB NOT NULL,
secrets_ciphertext TEXT, secrets_nonce TEXT, secrets_tag TEXT,
activated_at TIMESTAMP(3),
created_by BIGINT, created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_by BIGINT, updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
last_source TEXT, last_activity TEXT, transaction_id UUID, PRIMARY KEY(kind));
CREATE TABLE common.cm_integration_setting_h (
kind VARCHAR(40) NOT NULL,
config_jsonb JSONB NOT NULL,
secrets_ciphertext TEXT, secrets_nonce TEXT, secrets_tag TEXT,
activated_at TIMESTAMP(3),
created_by BIGINT, created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_by BIGINT, updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
last_source TEXT, last_activity TEXT, transaction_id UUID, history_seq BIGINT NOT NULL, event_type CHAR(1) NOT NULL, event_at TIMESTAMP(3) NOT NULL, PRIMARY KEY(kind,history_seq));
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

-- Preserve existing vectors while allowing the local model's native 384 dimensions.
DROP INDEX IF EXISTS common.ix_cm_ai_embedding_m_vector;
ALTER TABLE common.cm_ai_embedding_m ALTER COLUMN embedding TYPE vector;
CREATE INDEX ix_cm_ai_embedding_m_vector ON common.cm_ai_embedding_m USING ivfflat ((embedding::vector(1536)) vector_cosine_ops) WITH (lists=100) WHERE embedding_dimension=1536;
CREATE INDEX ix_cm_ai_embedding_m_vector_local ON common.cm_ai_embedding_m USING hnsw ((embedding::vector(384)) vector_cosine_ops) WHERE embedding_dimension=384;
