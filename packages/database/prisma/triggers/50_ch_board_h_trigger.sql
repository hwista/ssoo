-- =========================================================
-- History Trigger: chs.ch_board_m -> chs.ch_board_h
-- Schema: chs
-- =========================================================

CREATE OR REPLACE FUNCTION fn_ch_board_h_trigger()
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
  FROM chs.ch_board_h
  WHERE board_id = v_record.board_id;

  INSERT INTO chs.ch_board_h (
    board_id, history_seq, event_type, event_at,
    board_code, board_name, board_type, description, sort_order, is_default,
    is_active, memo, created_by, created_at, updated_by, updated_at,
    last_source, transaction_id
  ) VALUES (
    v_record.board_id, v_history_seq, v_event_type, NOW(),
    v_record.board_code, v_record.board_name, v_record.board_type, v_record.description, v_record.sort_order, v_record.is_default,
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

DROP TRIGGER IF EXISTS trg_ch_board_h ON chs.ch_board_m;
CREATE TRIGGER trg_ch_board_h
AFTER INSERT OR UPDATE OR DELETE ON chs.ch_board_m
FOR EACH ROW EXECUTE FUNCTION fn_ch_board_h_trigger();
COMMENT ON FUNCTION fn_ch_board_h_trigger() IS '게시판 마스터 히스토리 트리거 함수';
