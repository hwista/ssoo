-- ============================================
-- History Trigger: pms.cm_role_menu_r -> pms.cm_role_menu_h
-- Schema: pms
-- ============================================

-- 시퀀스 (history_seq 생성용)
CREATE SEQUENCE IF NOT EXISTS pms.cm_role_menu_h_seq;

-- 트리거 함수
CREATE OR REPLACE FUNCTION fn_cm_role_menu_r_history()
RETURNS TRIGGER AS $$
DECLARE
    v_event_type CHAR(1);
    v_record pms.cm_role_menu_r%ROWTYPE;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_event_type := 'C';
        v_record := NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        v_event_type := 'U';
        v_record := NEW;
    ELSIF TG_OP = 'DELETE' THEN
        v_event_type := 'D';
        v_record := OLD;
    END IF;

    INSERT INTO pms.cm_role_menu_h (
        role_menu_id, history_seq, event_type, event_at,
        role_code, menu_id, access_type,
        is_active, memo, created_by, created_at, updated_by, updated_at,
        last_source, last_activity, transaction_id
    ) VALUES (
        v_record.role_menu_id,
        nextval('pms.cm_role_menu_h_seq'),
        v_event_type,
        NOW(),
        v_record.role_code,
        v_record.menu_id,
        v_record.access_type,
        v_record.is_active,
        v_record.memo,
        v_record.created_by,
        COALESCE(v_record.created_at, NOW()),
        v_record.updated_by,
        COALESCE(v_record.updated_at, NOW()),
        v_record.last_source,
        v_record.last_activity,
        v_record.transaction_id
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS tr_cm_role_menu_r_history ON pms.cm_role_menu_r;
CREATE TRIGGER tr_cm_role_menu_r_history
    AFTER INSERT OR UPDATE OR DELETE ON pms.cm_role_menu_r
    FOR EACH ROW EXECUTE FUNCTION fn_cm_role_menu_r_history();
