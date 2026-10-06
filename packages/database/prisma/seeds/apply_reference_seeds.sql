-- Fresh database provisioning ONLY, guarded by db-init-policy.mjs before migrations.
-- Never replay on an existing DB. Versioned data changes belong in launch migrations.
-- Explicit allowlist: no accounts/passwords, org backfills, project/customer/opportunity/
-- contract demos, source UI fixtures, user menu bindings or seed-account enrollment.
-- These existing domain seeds remain owned by their respective app teams.
\set ON_ERROR_STOP on
\ir 00_user_code.sql
\ir 01_project_status_code.sql
\ir 02_project_deliverable_status.sql
\ir 03_project_close_condition.sql
\ir 04_project_handoff_type.sql
\ir 08_unit_code.sql
\ir 10_project_member_task_issue_code.sql
\ir 05_menu_data.sql
\ir 06_role_menu_permission.sql
\ir 13_permission_foundation.sql
\ir 14_pms_project_policy_foundation.sql
\ir 15_dms_access_policy_foundation.sql
\ir 16_sns_access_policy_foundation.sql
\ir 18_crm_access_policy_foundation.sql
\ir 20_dms_config_foundation.sql
\ir 50_sns_boards.sql
\ir 51_sns_skills.sql
\ir 53_crm_quote_seller_profile.sql
\ir 57_crm_launch_operations.sql
\ir 22_pms_template_groups.sql
