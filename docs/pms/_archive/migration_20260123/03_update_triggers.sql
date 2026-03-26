-- =========================================================
-- Phase 2-B: PostgreSQL 스키마 분리
-- Step 3: Trigger 재적용 (search_path 설정)
-- =========================================================
-- 트리거 함수에 search_path를 설정하여 스키마 이동 후에도 동작하도록 함
-- search_path 설정으로 테이블명만으로 참조 가능
-- =========================================================

-- =========================================================
-- Common 스키마 트리거 함수 수정
-- =========================================================

-- cm_code_m Trigger
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
  FROM common.cm_code_h
  WHERE code_id = v_record.code_id;

  INSERT INTO common.cm_code_h (
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

DROP TRIGGER IF EXISTS trg_cm_code_h ON common.cm_code_m;
CREATE TRIGGER trg_cm_code_h
  AFTER INSERT OR UPDATE OR DELETE ON common.cm_code_m
  FOR EACH ROW EXECUTE FUNCTION fn_cm_code_h_trigger();


-- cm_user_m Trigger
CREATE OR REPLACE FUNCTION fn_cm_user_h_trigger()
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
  FROM common.cm_user_h
  WHERE user_id = v_record.user_id;

  INSERT INTO common.cm_user_h (
    user_id, history_seq, event_type, event_at,
    is_system_user, is_admin, user_type_code, login_id, password_hash, password_salt,
    user_name, display_name, email, phone, avatar_url,
    department_code, position_code, employee_number, company_name, customer_id,
    role_code, permission_codes, user_status_code,
    last_login_at, login_fail_count, locked_until,
    invited_at, invited_by, invitation_token_hash, invitation_expires_at,
    refresh_token_hash, refresh_token_expires_at,
    is_active, memo, created_by, created_at, updated_by, updated_at,
    last_source, last_activity, transaction_id
  ) VALUES (
    v_record.user_id, v_history_seq, v_event_type, NOW(),
    v_record.is_system_user, v_record.is_admin, v_record.user_type_code, v_record.login_id, v_record.password_hash, v_record.password_salt,
    v_record.user_name, v_record.display_name, v_record.email, v_record.phone, v_record.avatar_url,
    v_record.department_code, v_record.position_code, v_record.employee_number, v_record.company_name, v_record.customer_id,
    v_record.role_code, v_record.permission_codes, v_record.user_status_code,
    v_record.last_login_at, v_record.login_fail_count, v_record.locked_until,
    v_record.invited_at, v_record.invited_by, v_record.invitation_token_hash, v_record.invitation_expires_at,
    v_record.refresh_token_hash, v_record.refresh_token_expires_at,
    v_record.is_active, v_record.memo, v_record.created_by, v_record.created_at, v_record.updated_by, v_record.updated_at,
    v_record.last_source, v_record.last_activity, v_record.transaction_id
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cm_user_h ON common.cm_user_m;
CREATE TRIGGER trg_cm_user_h
  AFTER INSERT OR UPDATE OR DELETE ON common.cm_user_m
  FOR EACH ROW EXECUTE FUNCTION fn_cm_user_h_trigger();


-- cm_menu_m Trigger
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
  FROM common.cm_menu_h
  WHERE menu_id = v_record.menu_id;

  INSERT INTO common.cm_menu_h (
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

DROP TRIGGER IF EXISTS trg_cm_menu_h ON common.cm_menu_m;
CREATE TRIGGER trg_cm_menu_h
  AFTER INSERT OR UPDATE OR DELETE ON common.cm_menu_m
  FOR EACH ROW EXECUTE FUNCTION fn_cm_menu_h_trigger();


-- cm_role_menu_r Trigger
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
  FROM common.cm_role_menu_h
  WHERE role_menu_id = v_record.role_menu_id;

  INSERT INTO common.cm_role_menu_h (
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

DROP TRIGGER IF EXISTS trg_cm_role_menu_h ON common.cm_role_menu_r;
CREATE TRIGGER trg_cm_role_menu_h
  AFTER INSERT OR UPDATE OR DELETE ON common.cm_role_menu_r
  FOR EACH ROW EXECUTE FUNCTION fn_cm_role_menu_h_trigger();


-- cm_user_menu_r Trigger
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
  FROM common.cm_user_menu_h
  WHERE user_menu_id = v_record.user_menu_id;

  INSERT INTO common.cm_user_menu_h (
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

DROP TRIGGER IF EXISTS trg_cm_user_menu_h ON common.cm_user_menu_r;
CREATE TRIGGER trg_cm_user_menu_h
  AFTER INSERT OR UPDATE OR DELETE ON common.cm_user_menu_r
  FOR EACH ROW EXECUTE FUNCTION fn_cm_user_menu_h_trigger();


-- =========================================================
-- PMS 스키마 트리거 함수 수정
-- =========================================================

-- pr_project_m Trigger
CREATE OR REPLACE FUNCTION fn_pr_project_h_trigger()
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
  FROM pms.pr_project_h
  WHERE project_id = v_record.project_id;

  INSERT INTO pms.pr_project_h (
    project_id, history_seq, event_type, event_at,
    project_name, status_code, stage_code, done_result_code,
    current_owner_user_id,
    handoff_type_code, handoff_status_code, handoff_requested_at, handoff_confirmed_at, handoff_confirmed_by,
    customer_id, plant_id, system_instance_id,
    is_active, memo, created_by, created_at, updated_by, updated_at,
    last_source, last_activity, transaction_id
  ) VALUES (
    v_record.project_id, v_history_seq, v_event_type, NOW(),
    v_record.project_name, v_record.status_code, v_record.stage_code, v_record.done_result_code,
    v_record.current_owner_user_id,
    v_record.handoff_type_code, v_record.handoff_status_code, v_record.handoff_requested_at, v_record.handoff_confirmed_at, v_record.handoff_confirmed_by,
    v_record.customer_id, v_record.plant_id, v_record.system_instance_id,
    v_record.is_active, v_record.memo, v_record.created_by, v_record.created_at, v_record.updated_by, v_record.updated_at,
    v_record.last_source, v_record.last_activity, v_record.transaction_id
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pr_project_h ON pms.pr_project_m;
CREATE TRIGGER trg_pr_project_h
  AFTER INSERT OR UPDATE OR DELETE ON pms.pr_project_m
  FOR EACH ROW EXECUTE FUNCTION fn_pr_project_h_trigger();


-- pr_project_status_m Trigger
CREATE OR REPLACE FUNCTION fn_pr_project_status_h_trigger()
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
  FROM pms.pr_project_status_h
  WHERE project_id = v_record.project_id AND status_code = v_record.status_code;

  INSERT INTO pms.pr_project_status_h (
    project_id, status_code, history_seq, event_type, event_at,
    status_goal, status_owner_user_id,
    expected_start_at, expected_end_at, actual_start_at, actual_end_at,
    close_condition_group_code,
    is_active, memo, created_by, created_at, updated_by, updated_at,
    last_source, last_activity, transaction_id
  ) VALUES (
    v_record.project_id, v_record.status_code, v_history_seq, v_event_type, NOW(),
    v_record.status_goal, v_record.status_owner_user_id,
    v_record.expected_start_at, v_record.expected_end_at, v_record.actual_start_at, v_record.actual_end_at,
    v_record.close_condition_group_code,
    v_record.is_active, v_record.memo, v_record.created_by, v_record.created_at, v_record.updated_by, v_record.updated_at,
    v_record.last_source, v_record.last_activity, v_record.transaction_id
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pr_project_status_h ON pms.pr_project_status_m;
CREATE TRIGGER trg_pr_project_status_h
  AFTER INSERT OR UPDATE OR DELETE ON pms.pr_project_status_m
  FOR EACH ROW EXECUTE FUNCTION fn_pr_project_status_h_trigger();


-- pr_deliverable_m Trigger
CREATE OR REPLACE FUNCTION fn_pr_deliverable_h_trigger()
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
  FROM pms.pr_deliverable_h
  WHERE deliverable_id = v_record.deliverable_id;

  INSERT INTO pms.pr_deliverable_h (
    deliverable_id, history_seq, event_type, event_at,
    deliverable_code, deliverable_name, description, sort_order,
    is_active, memo, created_by, created_at, updated_by, updated_at,
    last_source, last_activity, transaction_id
  ) VALUES (
    v_record.deliverable_id, v_history_seq, v_event_type, NOW(),
    v_record.deliverable_code, v_record.deliverable_name, v_record.description, v_record.sort_order,
    v_record.is_active, v_record.memo, v_record.created_by, v_record.created_at, v_record.updated_by, v_record.updated_at,
    v_record.last_source, v_record.last_activity, v_record.transaction_id
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pr_deliverable_h ON pms.pr_deliverable_m;
CREATE TRIGGER trg_pr_deliverable_h
  AFTER INSERT OR UPDATE OR DELETE ON pms.pr_deliverable_m
  FOR EACH ROW EXECUTE FUNCTION fn_pr_deliverable_h_trigger();


-- pr_deliverable_group_m Trigger
CREATE OR REPLACE FUNCTION fn_pr_deliverable_group_h_trigger()
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
  FROM pms.pr_deliverable_group_h
  WHERE deliverable_group_id = v_record.deliverable_group_id;

  INSERT INTO pms.pr_deliverable_group_h (
    deliverable_group_id, history_seq, event_type, event_at,
    group_code, group_name, description, sort_order,
    is_active, memo, created_by, created_at, updated_by, updated_at,
    last_source, last_activity, transaction_id
  ) VALUES (
    v_record.deliverable_group_id, v_history_seq, v_event_type, NOW(),
    v_record.group_code, v_record.group_name, v_record.description, v_record.sort_order,
    v_record.is_active, v_record.memo, v_record.created_by, v_record.created_at, v_record.updated_by, v_record.updated_at,
    v_record.last_source, v_record.last_activity, v_record.transaction_id
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pr_deliverable_group_h ON pms.pr_deliverable_group_m;
CREATE TRIGGER trg_pr_deliverable_group_h
  AFTER INSERT OR UPDATE OR DELETE ON pms.pr_deliverable_group_m
  FOR EACH ROW EXECUTE FUNCTION fn_pr_deliverable_group_h_trigger();


-- pr_deliverable_group_item_r_m Trigger
CREATE OR REPLACE FUNCTION fn_pr_deliverable_group_item_r_h_trigger()
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
  FROM pms.pr_deliverable_group_item_r_h
  WHERE group_code = v_record.group_code AND deliverable_code = v_record.deliverable_code;

  INSERT INTO pms.pr_deliverable_group_item_r_h (
    group_code, deliverable_code, history_seq, event_type, event_at,
    sort_order,
    is_active, memo, created_by, created_at, updated_by, updated_at,
    last_source, last_activity, transaction_id
  ) VALUES (
    v_record.group_code, v_record.deliverable_code, v_history_seq, v_event_type, NOW(),
    v_record.sort_order,
    v_record.is_active, v_record.memo, v_record.created_by, v_record.created_at, v_record.updated_by, v_record.updated_at,
    v_record.last_source, v_record.last_activity, v_record.transaction_id
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pr_deliverable_group_item_r_h ON pms.pr_deliverable_group_item_r_m;
CREATE TRIGGER trg_pr_deliverable_group_item_r_h
  AFTER INSERT OR UPDATE OR DELETE ON pms.pr_deliverable_group_item_r_m
  FOR EACH ROW EXECUTE FUNCTION fn_pr_deliverable_group_item_r_h_trigger();


-- pr_close_condition_group_m Trigger
CREATE OR REPLACE FUNCTION fn_pr_close_condition_group_h_trigger()
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
  FROM pms.pr_close_condition_group_h
  WHERE close_condition_group_id = v_record.close_condition_group_id;

  INSERT INTO pms.pr_close_condition_group_h (
    close_condition_group_id, history_seq, event_type, event_at,
    group_code, group_name, description, sort_order,
    is_active, memo, created_by, created_at, updated_by, updated_at,
    last_source, last_activity, transaction_id
  ) VALUES (
    v_record.close_condition_group_id, v_history_seq, v_event_type, NOW(),
    v_record.group_code, v_record.group_name, v_record.description, v_record.sort_order,
    v_record.is_active, v_record.memo, v_record.created_by, v_record.created_at, v_record.updated_by, v_record.updated_at,
    v_record.last_source, v_record.last_activity, v_record.transaction_id
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pr_close_condition_group_h ON pms.pr_close_condition_group_m;
CREATE TRIGGER trg_pr_close_condition_group_h
  AFTER INSERT OR UPDATE OR DELETE ON pms.pr_close_condition_group_m
  FOR EACH ROW EXECUTE FUNCTION fn_pr_close_condition_group_h_trigger();


-- pr_close_condition_group_item_r_m Trigger
CREATE OR REPLACE FUNCTION fn_pr_close_condition_group_item_r_h_trigger()
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
  FROM pms.pr_close_condition_group_item_r_h
  WHERE group_code = v_record.group_code AND condition_code = v_record.condition_code;

  INSERT INTO pms.pr_close_condition_group_item_r_h (
    group_code, condition_code, history_seq, event_type, event_at,
    sort_order,
    is_active, memo, created_by, created_at, updated_by, updated_at,
    last_source, last_activity, transaction_id
  ) VALUES (
    v_record.group_code, v_record.condition_code, v_history_seq, v_event_type, NOW(),
    v_record.sort_order,
    v_record.is_active, v_record.memo, v_record.created_by, v_record.created_at, v_record.updated_by, v_record.updated_at,
    v_record.last_source, v_record.last_activity, v_record.transaction_id
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pr_close_condition_group_item_r_h ON pms.pr_close_condition_group_item_r_m;
CREATE TRIGGER trg_pr_close_condition_group_item_r_h
  AFTER INSERT OR UPDATE OR DELETE ON pms.pr_close_condition_group_item_r_m
  FOR EACH ROW EXECUTE FUNCTION fn_pr_close_condition_group_item_r_h_trigger();


-- pr_project_deliverable_r_m Trigger
CREATE OR REPLACE FUNCTION fn_pr_project_deliverable_r_h_trigger()
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
  FROM pms.pr_project_deliverable_r_h
  WHERE project_id = v_record.project_id 
    AND status_code = v_record.status_code 
    AND deliverable_code = v_record.deliverable_code;

  INSERT INTO pms.pr_project_deliverable_r_h (
    project_id, status_code, deliverable_code, history_seq, event_type, event_at,
    submission_status_code, submitted_at, submitted_by,
    storage_object_key, original_file_name, mime_type, file_size_bytes,
    is_active, memo, created_by, created_at, updated_by, updated_at,
    last_source, last_activity, transaction_id
  ) VALUES (
    v_record.project_id, v_record.status_code, v_record.deliverable_code, v_history_seq, v_event_type, NOW(),
    v_record.submission_status_code, v_record.submitted_at, v_record.submitted_by,
    v_record.storage_object_key, v_record.original_file_name, v_record.mime_type, v_record.file_size_bytes,
    v_record.is_active, v_record.memo, v_record.created_by, v_record.created_at, v_record.updated_by, v_record.updated_at,
    v_record.last_source, v_record.last_activity, v_record.transaction_id
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pr_project_deliverable_r_h ON pms.pr_project_deliverable_r_m;
CREATE TRIGGER trg_pr_project_deliverable_r_h
  AFTER INSERT OR UPDATE OR DELETE ON pms.pr_project_deliverable_r_m
  FOR EACH ROW EXECUTE FUNCTION fn_pr_project_deliverable_r_h_trigger();


-- pr_project_close_condition_r_m Trigger
CREATE OR REPLACE FUNCTION fn_pr_project_close_condition_r_h_trigger()
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
  FROM pms.pr_project_close_condition_r_h
  WHERE project_id = v_record.project_id 
    AND status_code = v_record.status_code 
    AND condition_code = v_record.condition_code;

  INSERT INTO pms.pr_project_close_condition_r_h (
    project_id, status_code, condition_code, history_seq, event_type, event_at,
    requires_deliverable, is_checked, checked_at, checked_by, sort_order,
    is_active, memo, created_by, created_at, updated_by, updated_at,
    last_source, last_activity, transaction_id
  ) VALUES (
    v_record.project_id, v_record.status_code, v_record.condition_code, v_history_seq, v_event_type, NOW(),
    v_record.requires_deliverable, v_record.is_checked, v_record.checked_at, v_record.checked_by, v_record.sort_order,
    v_record.is_active, v_record.memo, v_record.created_by, v_record.created_at, v_record.updated_by, v_record.updated_at,
    v_record.last_source, v_record.last_activity, v_record.transaction_id
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pr_project_close_condition_r_h ON pms.pr_project_close_condition_r_m;
CREATE TRIGGER trg_pr_project_close_condition_r_h
  AFTER INSERT OR UPDATE OR DELETE ON pms.pr_project_close_condition_r_m
  FOR EACH ROW EXECUTE FUNCTION fn_pr_project_close_condition_r_h_trigger();


-- =========================================================
-- 확인 쿼리
-- =========================================================
SELECT 
  trigger_schema,
  trigger_name,
  event_object_schema,
  event_object_table
FROM information_schema.triggers
WHERE trigger_schema IN ('common', 'pms')
ORDER BY event_object_schema, event_object_table;
