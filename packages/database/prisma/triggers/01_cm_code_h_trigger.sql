-- =========================================================
-- History Trigger: pms.cm_code_m -> pms.cm_code_h
-- Schema: pms
-- =========================================================

CREATE OR REPLACE FUNCTION fn_cm_code_h_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_history_seq BIGINT;
  v_record RECORD;
  v_event_type CHAR(1);
BEGIN
  -- 이벤트 타입 결정
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'C';
    v_record := NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_event_type := 'U';
    v_record := NEW;
  ELSE -- DELETE
    v_event_type := 'D';
    v_record := OLD;
  END IF;

  -- history_seq 계산
  SELECT COALESCE(MAX(history_seq), 0) + 1
  INTO v_history_seq
  FROM pms.cm_code_h
  WHERE code_id = v_record.code_id;

  -- 히스토리 테이블에 삽입
  INSERT INTO pms.cm_code_h (
    code_id, history_seq, event_type, event_at,
    code_group, code_value, parent_code,
    display_name_ko, display_name_en, description, sort_order,
    is_active, memo, created_by, created_at, updated_by, updated_at,
    last_source, last_activity, transaction_id
  ) VALUES (
    v_record.code_id, v_history_seq, v_event_type, NOW(),
    v_record.code_group, v_record.code_value, v_record.parent_code,
    v_record.display_name_ko, v_record.display_name_en, v_record.description, v_record.sort_order,
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

-- 기존 트리거 삭제 후 재생성
DROP TRIGGER IF EXISTS trg_cm_code_h ON pms.cm_code_m;

CREATE TRIGGER trg_cm_code_h
AFTER INSERT OR UPDATE OR DELETE ON pms.cm_code_m
FOR EACH ROW EXECUTE FUNCTION fn_cm_code_h_trigger();

COMMENT ON FUNCTION fn_cm_code_h_trigger() IS '공통 코드 마스터 히스토리 트리거 함수';
