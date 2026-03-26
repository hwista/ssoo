-- =========================================================
-- History Trigger: common.cm_user_m -> common.cm_user_h
-- Schema: common
-- =========================================================

CREATE OR REPLACE FUNCTION fn_cm_user_h_trigger()
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
  FROM common.cm_user_h
  WHERE user_id = v_record.user_id;

  -- 히스토리 테이블에 삽입
  INSERT INTO common.cm_user_h (
    user_id, history_seq, event_type, event_at,
    is_system_user, is_admin, user_type_code, login_id, password_hash, password_salt,
    user_name, display_name, email, phone, avatar_url,
    department_code, position_code, employee_number,
    company_name, customer_id,
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
    v_record.department_code, v_record.position_code, v_record.employee_number,
    v_record.company_name, v_record.customer_id,
    v_record.role_code, v_record.permission_codes, v_record.user_status_code,
    v_record.last_login_at, v_record.login_fail_count, v_record.locked_until,
    v_record.invited_at, v_record.invited_by, v_record.invitation_token_hash, v_record.invitation_expires_at,
    v_record.refresh_token_hash, v_record.refresh_token_expires_at,
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
DROP TRIGGER IF EXISTS trg_cm_user_h ON common.cm_user_m;

CREATE TRIGGER trg_cm_user_h
AFTER INSERT OR UPDATE OR DELETE ON common.cm_user_m
FOR EACH ROW EXECUTE FUNCTION fn_cm_user_h_trigger();

COMMENT ON FUNCTION fn_cm_user_h_trigger() IS '사용자 마스터 히스토리 트리거 함수';
