-- =========================================================
-- History Trigger: pms.cm_system_catalog_m -> pms.cm_system_catalog_h
-- Schema: pms
-- =========================================================

CREATE OR REPLACE FUNCTION fn_cm_system_catalog_h_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_history_seq INT;
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
  FROM pms.cm_system_catalog_h
  WHERE system_catalog_id = v_record.system_catalog_id;

  INSERT INTO pms.cm_system_catalog_h (
    system_catalog_id, history_seq, event_type, event_at, event_by,
    catalog_code, catalog_name, description, parent_code, sort_order,
    is_active, memo, created_by, created_at, updated_by, updated_at,
    last_source, transaction_id
  ) VALUES (
    v_record.system_catalog_id, v_history_seq, v_event_type, NOW(), NULL,
    v_record.catalog_code, v_record.catalog_name, v_record.description, v_record.parent_code, v_record.sort_order,
    v_record.is_active, v_record.memo, v_record.created_by, v_record.created_at, v_record.updated_by, v_record.updated_at,
    v_record.last_source, v_record.transaction_id
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cm_system_catalog_h ON pms.cm_system_catalog_m;

CREATE TRIGGER trg_cm_system_catalog_h
AFTER INSERT OR UPDATE OR DELETE ON pms.cm_system_catalog_m
FOR EACH ROW EXECUTE FUNCTION fn_cm_system_catalog_h_trigger();

COMMENT ON FUNCTION fn_cm_system_catalog_h_trigger() IS '시스템 카탈로그 마스터 히스토리 트리거 함수';
