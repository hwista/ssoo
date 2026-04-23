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

\echo 'Installing: pr_milestone_h trigger...'
\i 21_pr_milestone_h_trigger.sql

\echo 'Installing: pr_issue_h trigger...'
\i 22_pr_issue_h_trigger.sql

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

\echo 'Installing: dm_document_comment_h trigger...'
\i 55_dm_document_comment_h_trigger.sql

\echo 'Installing: dm_template_h trigger...'
\i 56_dm_template_h_trigger.sql

\echo ''
\echo '-- CMS (Content Management System) --'
\echo ''

\echo 'Installing: cms_board_h trigger...'
\i 50_cms_board_h_trigger.sql

\echo 'Installing: cms_post_h trigger...'
\i 51_cms_post_h_trigger.sql

\echo 'Installing: cms_comment_h trigger...'
\i 52_cms_comment_h_trigger.sql

\echo 'Installing: cms_user_profile_h trigger...'
\i 53_cms_user_profile_h_trigger.sql

\echo 'Installing: pr_project_issue_h trigger...'
\i 54_pr_project_issue_h_trigger.sql

\echo '=========================================='
\echo 'All triggers installed successfully!'
\echo '=========================================='

-- 설치된 트리거 확인
SELECT 
    tgname AS trigger_name,
    relname AS table_name,
    CASE tgenabled 
        WHEN 'O' THEN 'ENABLED'
        WHEN 'D' THEN 'DISABLED'
        ELSE tgenabled::text
    END AS status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE tgname LIKE 'trg_%_h'
ORDER BY relname;
