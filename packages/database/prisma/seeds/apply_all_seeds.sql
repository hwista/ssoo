-- =========================================================
-- apply_all_seeds.sql
-- 모든 시드 파일을 순서대로 실행하는 마스터 스크립트
--
-- 각 시드 파일은 명시적 스키마(common/pms/dms/sns/crm)를 사용합니다.
--
-- 스키마 분류:
--   - common: cm_user_m (사용자)
--   - pms: cm_menu_m, cm_*_r (메뉴 권한); common: cm_code_m (공통코드)
--   - dms: dm_config_m (DMS 시스템 설정)
--   - sns: sns_board_m, sns_skill_m (게시판, 스킬)
--   - crm: crm_opportunity_m, crm_opportunity_line_d, crm_customer_m, crm_customer_activity_d (영업/고객)
-- =========================================================
--
-- 사용법 (psql):
--   psql -U <user> -d <database> -f apply_all_seeds.sql
--
-- 또는 각 파일 개별 실행:
--   psql -U <user> -d <database> -f 00_user_code.sql
--   psql -U <user> -d <database> -f 01_project_status_code.sql
--   ...
--
-- =========================================================

\echo '=========================================='
\echo 'Starting Seed Data Application'
\echo 'Schema: common (user), pms (code, menu, permission), dms (config), sns (boards, skills), crm (opportunities, customers)'
\echo '=========================================='

-- 00: 사용자 타입 코드
\echo 'Applying 00_user_code.sql...'
\i 00_user_code.sql

-- 01: 프로젝트 상태 코드
\echo 'Applying 01_project_status_code.sql...'
\i 01_project_status_code.sql

-- 02: 프로젝트 산출물 상태
\echo 'Applying 02_project_deliverable_status.sql...'
\i 02_project_deliverable_status.sql

-- 03: 프로젝트 종료 조건
\echo 'Applying 03_project_close_condition.sql...'
\i 03_project_close_condition.sql

-- 04: 프로젝트 이관 유형
\echo 'Applying 04_project_handoff_type.sql...'
\i 04_project_handoff_type.sql

-- 09: 프로젝트 요청 샘플
\echo 'Applying 09_project_request_sample.sql...'
\i 09_project_request_sample.sql

-- 08: 단위 코드
\echo 'Applying 08_unit_code.sql...'
\i 08_unit_code.sql

-- 10: 멤버/태스크/이슈 코드
\echo 'Applying 10_project_member_task_issue_code.sql...'
\i 10_project_member_task_issue_code.sql

-- 05: 메뉴 데이터
\echo 'Applying 05_menu_data.sql...'
\i 05_menu_data.sql

-- 06: 역할별 메뉴 권한
\echo 'Applying 06_role_menu_permission.sql...'
\i 06_role_menu_permission.sql

-- 99: 초기 관리자 계정 (07번 전에 실행해야 함)
\echo 'Applying 99_user_initial_admin.sql...'
\i 99_user_initial_admin.sql

-- 11: 데모 사용자/고객사
\echo 'Applying 11_demo_users_customers.sql...'
\i 11_demo_users_customers.sql

-- 19: PMS execution asset master
\echo 'Applying 19_pms_asset_master.sql...'
\i 19_pms_asset_master.sql

-- 12: legacy user/customer 기준 org foundation bridge
\echo 'Applying 12_org_foundation_bridge.sql...'
\i 12_org_foundation_bridge.sql

-- 13: common permission/role foundation
\echo 'Applying 13_permission_foundation.sql...'
\i 13_permission_foundation.sql

-- 14: PMS project policy foundation
\echo 'Applying 14_pms_project_policy_foundation.sql...'
\i 14_pms_project_policy_foundation.sql

-- 15: DMS access policy foundation
\echo 'Applying 15_dms_access_policy_foundation.sql...'
\i 15_dms_access_policy_foundation.sql

-- 16: SNS access policy foundation
\echo 'Applying 16_sns_access_policy_foundation.sql...'
\i 16_sns_access_policy_foundation.sql

-- 18: CRM access policy foundation
\echo 'Applying 18_crm_access_policy_foundation.sql...'
\i 18_crm_access_policy_foundation.sql

-- 20: DMS config foundation (시스템 설정 시드 — git, storage, ingest 등)
\echo 'Applying 20_dms_config_foundation.sql...'
\i 20_dms_config_foundation.sql

-- 50: SNS boards
\echo 'Applying 50_sns_boards.sql...'
\i 50_sns_boards.sql

-- 51: SNS skills
\echo 'Applying 51_sns_skills.sql...'
\i 51_sns_skills.sql

-- 52: CRM opportunities
\echo 'Applying 52_crm_opportunities.sql...'
\i 52_crm_opportunities.sql

-- 55: CRM customer/activity backfill
\echo 'Applying 55_crm_customer_activity.sql...'
\i 55_crm_customer_activity.sql

-- 53: CRM quote seller profile
\echo 'Applying 53_crm_quote_seller_profile.sql...'
\i 53_crm_quote_seller_profile.sql

-- 54: CRM business plan ledger sample
\echo 'Applying 54_crm_business_plan.sql...'
\i 54_crm_business_plan.sql

-- 56: CRM source demo contracts
\echo 'Applying 56_crm_source_contracts.sql...'
\i 56_crm_source_contracts.sql

-- 57: CRM launch operations settings and code foundation
\echo 'Applying 57_crm_launch_operations.sql...'
\i 57_crm_launch_operations.sql

-- 58: CRM source UI/UX deterministic reference fixture
\echo 'Applying 58_crm_source_uiux_reference.sql...'
\i 58_crm_source_uiux_reference.sql

-- 17: PMS demo project access context (owner/org baseline)
\echo 'Applying 17_demo_project_access_context.sql...'
\i 17_demo_project_access_context.sql

-- 21: PMS demo project status detail baseline
\echo 'Applying 21_demo_project_statuses.sql...'
\i 21_demo_project_statuses.sql

-- Demo PMS data: members/tasks/milestones/issues/deliverables
\echo 'Applying 12_demo_project_members.sql...'
\i 12_demo_project_members.sql

\echo 'Applying 13_demo_tasks.sql...'
\i 13_demo_tasks.sql

\echo 'Applying 14_demo_milestones.sql...'
\i 14_demo_milestones.sql

\echo 'Applying 15_demo_issues.sql...'
\i 15_demo_issues.sql

\echo 'Applying 16_demo_deliverables_conditions.sql...'
\i 16_demo_deliverables_conditions.sql

-- 22: PMS deliverable / close-condition template groups
\echo 'Applying 22_pms_template_groups.sql...'
\i 22_pms_template_groups.sql

-- 07: 사용자별 메뉴 권한 (admin 사용자 생성 후 실행)
\echo 'Applying 07_user_menu_permission.sql...'
\i 07_user_menu_permission.sql

\echo '=========================================='
\echo 'Seed Data Application Complete!'
\echo '=========================================='

-- Explicit seed accounts only: ordinary API-created accounts remain pending.
\i 40_platform_onboarding_bootstrap.sql
