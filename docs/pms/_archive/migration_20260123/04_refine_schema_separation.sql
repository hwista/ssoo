-- =========================================================
-- Phase 2-B-2: 스키마 분리 보완
-- common → pms 이동 (User/UserHistory 제외)
-- =========================================================
-- 변경 이유:
-- - Menu: PMS 전용 메뉴 시스템
-- - RoleMenu, UserMenu, UserFavorite: Menu 관련 권한 테이블
-- - CmCode: DMS는 별도 코드 테이블 사용 예정
-- 
-- common 스키마 유지: cm_user_m, cm_user_h (모든 시스템 공유 사용자)
-- =========================================================

-- =========================================================
-- Step 1: cm_ 테이블을 pms 스키마로 이동 (User 제외)
-- =========================================================

-- Code 테이블 이동
ALTER TABLE common.cm_code_m SET SCHEMA pms;
ALTER TABLE common.cm_code_h SET SCHEMA pms;

-- Menu 테이블 이동
ALTER TABLE common.cm_menu_m SET SCHEMA pms;
ALTER TABLE common.cm_menu_h SET SCHEMA pms;

-- Role Menu 테이블 이동
ALTER TABLE common.cm_role_menu_r SET SCHEMA pms;
ALTER TABLE common.cm_role_menu_h SET SCHEMA pms;

-- User Menu 테이블 이동
ALTER TABLE common.cm_user_menu_r SET SCHEMA pms;
ALTER TABLE common.cm_user_menu_h SET SCHEMA pms;

-- User Favorite 테이블 이동
ALTER TABLE common.cm_user_favorite_r SET SCHEMA pms;

-- =========================================================
-- Step 2: 트리거 업데이트 (pms 스키마로 변경)
-- =========================================================

-- cm_code_m Trigger (pms 스키마)
CREATE OR REPLACE FUNCTION fn_cm_code_h_trigger()
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
  FROM pms.cm_code_h
  WHERE code_id = v_record.code_id;

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

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cm_code_h ON pms.cm_code_m;
CREATE TRIGGER trg_cm_code_h
  AFTER INSERT OR UPDATE OR DELETE ON pms.cm_code_m
  FOR EACH ROW EXECUTE FUNCTION fn_cm_code_h_trigger();


-- cm_menu_m Trigger (pms 스키마)
CREATE OR REPLACE FUNCTION fn_cm_menu_h_trigger()
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
  FROM pms.cm_menu_h
  WHERE menu_id = v_record.menu_id;

  INSERT INTO pms.cm_menu_h (
    menu_id, history_seq, event_type, event_at,
    menu_code, menu_name, menu_name_en, menu_type,
    parent_menu_id, menu_path, icon, sort_order, menu_level,
    is_visible, is_enabled, is_admin_menu, open_type, description,
    is_active, memo, created_by, created_at, updated_by, updated_at,
    last_source, last_activity, transaction_id
  ) VALUES (
    v_record.menu_id, v_history_seq, v_event_type, NOW(),
    v_record.menu_code, v_record.menu_name, v_record.menu_name_en, v_record.menu_type,
    v_record.parent_menu_id, v_record.menu_path, v_record.icon, v_record.sort_order, v_record.menu_level,
    v_record.is_visible, v_record.is_enabled, v_record.is_admin_menu, v_record.open_type, v_record.description,
    v_record.is_active, v_record.memo, v_record.created_by, v_record.created_at, v_record.updated_by, v_record.updated_at,
    v_record.last_source, v_record.last_activity, v_record.transaction_id
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cm_menu_h ON pms.cm_menu_m;
CREATE TRIGGER trg_cm_menu_h
  AFTER INSERT OR UPDATE OR DELETE ON pms.cm_menu_m
  FOR EACH ROW EXECUTE FUNCTION fn_cm_menu_h_trigger();


-- cm_role_menu_r Trigger (pms 스키마)
CREATE OR REPLACE FUNCTION fn_cm_role_menu_h_trigger()
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
  FROM pms.cm_role_menu_h
  WHERE role_menu_id = v_record.role_menu_id;

  INSERT INTO pms.cm_role_menu_h (
    role_menu_id, history_seq, event_type, event_at,
    role_code, menu_id, access_type,
    is_active, memo, created_by, created_at, updated_by, updated_at,
    last_source, last_activity, transaction_id
  ) VALUES (
    v_record.role_menu_id, v_history_seq, v_event_type, NOW(),
    v_record.role_code, v_record.menu_id, v_record.access_type,
    v_record.is_active, v_record.memo, v_record.created_by, v_record.created_at, v_record.updated_by, v_record.updated_at,
    v_record.last_source, v_record.last_activity, v_record.transaction_id
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cm_role_menu_h ON pms.cm_role_menu_r;
CREATE TRIGGER trg_cm_role_menu_h
  AFTER INSERT OR UPDATE OR DELETE ON pms.cm_role_menu_r
  FOR EACH ROW EXECUTE FUNCTION fn_cm_role_menu_h_trigger();


-- cm_user_menu_r Trigger (pms 스키마)
CREATE OR REPLACE FUNCTION fn_cm_user_menu_h_trigger()
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
  FROM pms.cm_user_menu_h
  WHERE user_menu_id = v_record.user_menu_id;

  INSERT INTO pms.cm_user_menu_h (
    user_menu_id, history_seq, event_type, event_at,
    user_id, menu_id, access_type, override_type,
    expires_at, granted_by, granted_at, grant_reason,
    is_active, memo, created_by, created_at, updated_by, updated_at,
    last_source, last_activity, transaction_id
  ) VALUES (
    v_record.user_menu_id, v_history_seq, v_event_type, NOW(),
    v_record.user_id, v_record.menu_id, v_record.access_type, v_record.override_type,
    v_record.expires_at, v_record.granted_by, v_record.granted_at, v_record.grant_reason,
    v_record.is_active, v_record.memo, v_record.created_by, v_record.created_at, v_record.updated_by, v_record.updated_at,
    v_record.last_source, v_record.last_activity, v_record.transaction_id
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cm_user_menu_h ON pms.cm_user_menu_r;
CREATE TRIGGER trg_cm_user_menu_h
  AFTER INSERT OR UPDATE OR DELETE ON pms.cm_user_menu_r
  FOR EACH ROW EXECUTE FUNCTION fn_cm_user_menu_h_trigger();


-- =========================================================
-- Step 3: 확인 쿼리
-- =========================================================
SELECT 
  schemaname as schema,
  tablename as table_name
FROM pg_tables 
WHERE schemaname IN ('common', 'pms')
ORDER BY schemaname, tablename;
