-- =========================================================
-- SSOO History Triggers - Master Installation Script
-- 
-- 이 스크립트는 모든 히스토리 트리거를 순서대로 설치합니다.
-- 각 트리거 파일은 명시적 스키마(common/pms)를 사용합니다.
-- 
-- 스키마 분류:
--   - common: cm_user_m (사용자)
--   - pms: cm_code_m, cm_menu_m, pr_* (코드, 메뉴, 프로젝트 관련)
-- 
-- 실행 방법:
--   psql -h localhost -U appuser -d appdb -f apply_all_triggers.sql
-- =========================================================

\echo '=========================================='
\echo 'SSOO History Triggers Installation'
\echo 'Schema: common (user), pms (code, menu, project)'
\echo '=========================================='

\echo 'Installing: cm_code_h trigger...'
\i 01_cm_code_h_trigger.sql

\echo 'Installing: cm_user_h trigger...'
\i 02_cm_user_h_trigger.sql

\echo 'Installing: cm_notification_h trigger...'
\i 57_cm_notification_h_trigger.sql

\echo 'Installing: cm_auth_provider_setting_h trigger...'
\i 58_cm_auth_provider_setting_h_trigger.sql

\echo 'Installing: cm_user_external_identity_h trigger...'
\i 59_cm_user_external_identity_h_trigger.sql

\echo 'Installing: cm_user_registration_request_h trigger...'
\i 60_cm_user_registration_request_h_trigger.sql

\echo 'Installing: cm_user_password_reset_challenge_h trigger...'
\i 61_cm_user_password_reset_challenge_h_trigger.sql

\echo 'Installing: cm_auth_email_outbox_h trigger...'
\i 62_cm_auth_email_outbox_h_trigger.sql

\echo 'Installing: cm_ai_source_h trigger...'
\i 63_cm_ai_source_h_trigger.sql

\echo 'Installing: cm_ai_object_h trigger...'
\i 64_cm_ai_object_h_trigger.sql

\echo 'Installing: cm_ai_index_state_h trigger...'
\i 65_cm_ai_index_state_h_trigger.sql

\echo 'Installing: pr_project_h trigger...'
\i 03_pr_project_h_trigger.sql

\echo 'Installing: pr_project_status_h trigger...'
\i 04_pr_project_status_h_trigger.sql

\echo 'Installing: pr_deliverable_h trigger...'
\i 05_pr_deliverable_h_trigger.sql

\echo 'Installing: pr_deliverable_group_h trigger...'
\i 06_pr_deliverable_group_h_trigger.sql

\echo 'Installing: pr_deliverable_group_item_r_h trigger...'
\i 07_pr_deliverable_group_item_r_h_trigger.sql

\echo 'Installing: pr_close_condition_group_h trigger...'
\i 08_pr_close_condition_group_h_trigger.sql

\echo 'Installing: pr_close_condition_group_item_r_h trigger...'
\i 09_pr_close_condition_group_item_r_h_trigger.sql

\echo 'Installing: pr_project_deliverable_r_h trigger...'
\i 10_pr_project_deliverable_r_h_trigger.sql

\echo 'Installing: pr_project_close_condition_r_h trigger...'
\i 11_pr_project_close_condition_r_h_trigger.sql

\echo 'Installing: cm_menu_h trigger...'
\i 12_cm_menu_h_trigger.sql

\echo 'Installing: cm_role_menu_h trigger...'
\i 13_cm_role_menu_h_trigger.sql

\echo 'Installing: cm_user_menu_h trigger...'
\i 14_cm_user_menu_h_trigger.sql

\echo 'Installing: pr_project_request_d_h trigger...'
\i 15_pr_project_request_d_h_trigger.sql

\echo 'Installing: pr_project_proposal_d_h trigger...'
\i 16_pr_project_proposal_d_h_trigger.sql

\echo 'Installing: pr_project_execution_d_h trigger...'
\i 17_pr_project_execution_d_h_trigger.sql

\echo 'Installing: pr_project_transition_d_h trigger...'
\i 18_pr_project_transition_d_h_trigger.sql

\echo 'Installing: pr_project_member_r_h trigger...'
\i 19_pr_project_member_r_h_trigger.sql

\echo 'Installing: pr_task_h trigger...'
\i 20_pr_task_h_trigger.sql

\echo 'Installing: pr_task_effort_log_h trigger...'
\i 78_pr_task_effort_log_h_trigger.sql

\echo 'Installing: pr_milestone_h trigger...'
\i 21_pr_milestone_h_trigger.sql

\echo 'Installing: pr_issue_h trigger...'
\i 22_pr_issue_h_trigger.sql

\echo 'Installing: pr_legacy_issue_archive_h trigger...'
\i 77_pr_legacy_issue_archive_h_trigger.sql

\echo 'Installing: cm_user_auth_h trigger...'
\i 23_cm_user_auth_h_trigger.sql

\echo 'Installing: cm_user_session_h trigger...'
\i 24_cm_user_session_h_trigger.sql

\echo 'Installing: cm_user_invitation_h trigger...'
\i 25_cm_user_invitation_h_trigger.sql

\echo 'Installing: cm_organization_h trigger...'
\i 26_cm_organization_h_trigger.sql

\echo 'Installing: cm_user_org_h trigger...'
\i 27_cm_user_org_h_trigger.sql

\echo 'Installing: cm_permission_h trigger...'
\i 28_cm_permission_h_trigger.sql

\echo 'Installing: cm_role_h trigger...'
\i 29_cm_role_h_trigger.sql

\echo 'Installing: cm_role_permission_h trigger...'
\i 30_cm_role_permission_h_trigger.sql

\echo 'Installing: cm_org_permission_h trigger...'
\i 31_cm_org_permission_h_trigger.sql

\echo 'Installing: cm_user_permission_exception_h trigger...'
\i 32_cm_user_permission_exception_h_trigger.sql

\echo 'Installing: pr_project_role_permission_h trigger...'
\i 33_pr_project_role_permission_h_trigger.sql

\echo ''
\echo '-- PMS project foundation expansion --'
\echo ''

\echo 'Installing: pr_handoff_h trigger...'
\i 34_pr_handoff_h_trigger.sql

\echo 'Installing: pr_contract_h trigger...'
\i 35_pr_contract_h_trigger.sql

\echo 'Installing: pr_contract_payment_h trigger...'
\i 36_pr_contract_payment_h_trigger.sql

\echo 'Installing: pr_objective_h trigger...'
\i 37_pr_objective_h_trigger.sql

\echo 'Installing: pr_wbs_h trigger...'
\i 38_pr_wbs_h_trigger.sql

\echo 'Installing: pr_project_org_r_h trigger...'
\i 39_pr_project_org_r_h_trigger.sql

\echo 'Installing: pr_project_relation_r_h trigger...'
\i 40_pr_project_relation_r_h_trigger.sql

\echo 'Installing: pr_requirement_h trigger...'
\i 41_pr_requirement_h_trigger.sql

\echo 'Installing: pr_risk_h trigger...'
\i 42_pr_risk_h_trigger.sql

\echo 'Installing: pr_change_request_h trigger...'
\i 43_pr_change_request_h_trigger.sql

\echo 'Installing: pr_event_h trigger...'
\i 44_pr_event_h_trigger.sql

\echo 'Installing: pr_project_issue_h trigger...'
\i 54_pr_project_issue_h_trigger.sql

\echo 'Installing: pr_site_h trigger...'
\i 68_pr_site_h_trigger.sql

\echo 'Installing: pr_system_catalog_h trigger...'
\i 69_pr_system_catalog_h_trigger.sql

\echo 'Installing: pr_system_instance_h trigger...'
\i 70_pr_system_instance_h_trigger.sql

\echo 'Installing: pr_integration_h trigger...'
\i 71_pr_integration_h_trigger.sql

\echo 'Installing: pr_master_import_profile_h trigger...'
\i 72_pr_master_import_profile_h_trigger.sql

\echo ''
\echo '-- DMS (Document Management System) --'
\echo ''

\echo 'Installing: dm_document_h trigger...'
\i 45_dm_document_h_trigger.sql

\echo 'Installing: dm_document_grant_h trigger...'
\i 46_dm_document_grant_h_trigger.sql

\echo 'Installing: dm_document_access_request_h trigger...'
\i 47_dm_document_access_request_h_trigger.sql

\echo 'Installing: dm_document_source_file_h trigger...'
\i 48_dm_document_source_file_h_trigger.sql

\echo 'Installing: dm_document_index_state_h trigger...'
\i 49_dm_document_index_state_h_trigger.sql

\echo 'Installing: dm_user_document_activity_h trigger...'
\i 81_dm_user_document_activity_h_trigger.sql

\echo 'Installing: dm_document_comment_h trigger...'
\i 55_dm_document_comment_h_trigger.sql

\echo 'Installing: dm_template_h trigger...'
\i 56_dm_template_h_trigger.sql

\echo ''
\echo '-- CRM --'
\echo ''

\echo 'Installing: crm_opportunity_h trigger...'
\i 66_crm_opportunity_h_trigger.sql

\echo 'Installing: crm_opportunity_line_h trigger...'
\i 67_crm_opportunity_line_h_trigger.sql

\echo 'Installing: crm_customer_h trigger...'
\i 75_crm_customer_h_trigger.sql

\echo 'Installing: crm_customer_activity_h trigger...'
\i 76_crm_customer_activity_h_trigger.sql

\echo 'Installing: crm_quote_seller_profile_h trigger...'
\i 73_crm_quote_seller_profile_h_trigger.sql

\echo 'Installing: crm_business_plan_h trigger...'
\i 74_crm_business_plan_h_trigger.sql

\echo 'Installing: crm_config_h trigger...'
\i 79_crm_config_h_trigger.sql

\echo 'Installing: crm_operation_attempt_h trigger...'
\i 80_crm_operation_attempt_h_trigger.sql
\i 82_crm_contract_approval_h_trigger.sql
\i 83_pr_user_settings_h_trigger.sql

\echo ''
\echo '-- SNS --'
\echo ''

\echo 'Installing: sns_board_h trigger...'
\i 50_sns_board_h_trigger.sql

\echo 'Installing: sns_post_h trigger...'
\i 51_sns_post_h_trigger.sql

\echo 'Installing: sns_comment_h trigger...'
\i 52_sns_comment_h_trigger.sql

\echo 'Installing: sns_user_profile_h trigger...'
\i 53_sns_user_profile_h_trigger.sql

\echo '=========================================='
\echo 'All triggers installed successfully!'
\echo '=========================================='

-- 애플리케이션 스키마의 non-internal 트리거 전체 확인.
-- trg_*_h 외에도 CRM migration-managed *_h_record와 PMS legacy-compatible
-- tr_*_history 이름을 포함해야 실제 설치 상태와 총계가 일치합니다.
SELECT 
    n.nspname AS schema_name,
    tgname AS trigger_name,
    relname AS table_name,
    CASE tgenabled 
        WHEN 'O' THEN 'ENABLED'
        WHEN 'D' THEN 'DISABLED'
        ELSE tgenabled::text
    END AS status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE NOT t.tgisinternal
  AND n.nspname IN ('common', 'pms', 'dms', 'crm', 'sns')
ORDER BY n.nspname, relname, tgname;

SELECT
    COUNT(*) AS total_app_triggers,
    COUNT(*) FILTER (WHERE t.tgenabled = 'O') AS enabled_app_triggers,
    COUNT(*) FILTER (WHERE t.tgenabled = 'D') AS disabled_app_triggers
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE NOT t.tgisinternal
  AND n.nspname IN ('common', 'pms', 'dms', 'crm', 'sns');
