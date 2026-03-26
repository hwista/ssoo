-- ============================================
-- History Trigger: pms.cm_menu_m -> pms.cm_menu_h
-- Schema: pms
-- ============================================

-- 시퀀스 (history_seq 생성용)
CREATE SEQUENCE IF NOT EXISTS pms.cm_menu_h_seq;

-- 트리거 함수
CREATE OR REPLACE FUNCTION fn_cm_menu_m_history()
RETURNS TRIGGER AS $$
DECLARE
    v_event_type CHAR(1);
    v_record pms.cm_menu_m%ROWTYPE;
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

    INSERT INTO pms.cm_menu_h (
        menu_id, history_seq, event_type, event_at,
        menu_code, menu_name, menu_name_en, menu_type,
        parent_menu_id, menu_path, icon, sort_order, menu_level,
        is_visible, is_enabled, is_admin_menu, open_type, description,
        is_active, memo, created_by, created_at, updated_by, updated_at,
        last_source, last_activity, transaction_id
    ) VALUES (
        v_record.menu_id,
        nextval('pms.cm_menu_h_seq'),
        v_event_type,
        NOW(),
        v_record.menu_code,
        v_record.menu_name,
        v_record.menu_name_en,
        v_record.menu_type,
        v_record.parent_menu_id,
        v_record.menu_path,
        v_record.icon,
        v_record.sort_order,
        v_record.menu_level,
        v_record.is_visible,
        v_record.is_enabled,
        v_record.is_admin_menu,
        v_record.open_type,
        v_record.description,
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
DROP TRIGGER IF EXISTS tr_cm_menu_m_history ON pms.cm_menu_m;
CREATE TRIGGER tr_cm_menu_m_history
    AFTER INSERT OR UPDATE OR DELETE ON pms.cm_menu_m
    FOR EACH ROW EXECUTE FUNCTION fn_cm_menu_m_history();
