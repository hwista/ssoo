-- =========================================================
-- History Trigger: common.cm_auth_provider_setting_m -> common.cm_auth_provider_setting_h
-- Schema: common
-- =========================================================

CREATE OR REPLACE FUNCTION fn_cm_auth_provider_setting_h_trigger()
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
  FROM common.cm_auth_provider_setting_h
  WHERE setting_key = v_record.setting_key;

  INSERT INTO common.cm_auth_provider_setting_h (
    setting_key, history_seq, event_type, event_at,
    password_login_enabled, password_reset_enabled, password_change_enabled,
    reset_code_ttl_minutes, reset_code_length,
    internal_sso_enabled, internal_sso_login_url,
    microsoft_login_enabled, microsoft_signup_request_enabled,
    microsoft_tenant_id, microsoft_client_id,
    microsoft_client_secret_ciphertext, microsoft_client_secret_nonce, microsoft_client_secret_tag,
    microsoft_redirect_uri, microsoft_scopes, allowed_tenant_ids, allowed_email_domains,
    self_signup_enabled, email_delivery_mode, email_from_address,
    created_by, created_at, updated_by, updated_at,
    last_source, last_activity, transaction_id
  ) VALUES (
    v_record.setting_key, v_history_seq, v_event_type, NOW(),
    v_record.password_login_enabled, v_record.password_reset_enabled, v_record.password_change_enabled,
    v_record.reset_code_ttl_minutes, v_record.reset_code_length,
    v_record.internal_sso_enabled, v_record.internal_sso_login_url,
    v_record.microsoft_login_enabled, v_record.microsoft_signup_request_enabled,
    v_record.microsoft_tenant_id, v_record.microsoft_client_id,
    v_record.microsoft_client_secret_ciphertext, v_record.microsoft_client_secret_nonce, v_record.microsoft_client_secret_tag,
    v_record.microsoft_redirect_uri, v_record.microsoft_scopes, v_record.allowed_tenant_ids, v_record.allowed_email_domains,
    v_record.self_signup_enabled, v_record.email_delivery_mode, v_record.email_from_address,
    v_record.created_by, v_record.created_at, v_record.updated_by, v_record.updated_at,
    v_record.last_source, v_record.last_activity, v_record.transaction_id
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cm_auth_provider_setting_h ON common.cm_auth_provider_setting_m;

CREATE TRIGGER trg_cm_auth_provider_setting_h
AFTER INSERT OR UPDATE OR DELETE ON common.cm_auth_provider_setting_m
FOR EACH ROW EXECUTE FUNCTION fn_cm_auth_provider_setting_h_trigger();

COMMENT ON FUNCTION fn_cm_auth_provider_setting_h_trigger() IS '인증 provider 설정 히스토리 트리거 함수';
