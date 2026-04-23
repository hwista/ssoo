-- =========================================================
-- History Trigger: dms.dm_template_m -> dms.dm_template_h
-- Schema: dms
-- =========================================================

CREATE OR REPLACE FUNCTION fn_dm_template_h_trigger()
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
  FROM dms.dm_template_h
  WHERE template_id = v_record.template_id;

  INSERT INTO dms.dm_template_h (
    template_id, history_seq, event_type, event_at,
    template_key, relative_path, template_scope_code, template_kind_code,
    owner_ref, visibility_code, template_status_code, source_type_code, origin_type_code, metadata_jsonb,
    is_active, memo, created_by, created_at, updated_by, updated_at,
    last_source, last_activity, transaction_id
  ) VALUES (
    v_record.template_id, v_history_seq, v_event_type, NOW(),
    v_record.template_key, v_record.relative_path, v_record.template_scope_code, v_record.template_kind_code,
    v_record.owner_ref, v_record.visibility_code, v_record.template_status_code, v_record.source_type_code, v_record.origin_type_code, v_record.metadata_jsonb,
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

DROP TRIGGER IF EXISTS trg_dm_template_h ON dms.dm_template_m;

CREATE TRIGGER trg_dm_template_h
AFTER INSERT OR UPDATE OR DELETE ON dms.dm_template_m
FOR EACH ROW EXECUTE FUNCTION fn_dm_template_h_trigger();

COMMENT ON FUNCTION fn_dm_template_h_trigger() IS 'DMS template metadata history trigger function';
