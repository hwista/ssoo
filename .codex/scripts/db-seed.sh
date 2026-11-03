#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

SERVICE_NAME="${DB_SERVICE_NAME:-postgres}"
DB_USER="${POSTGRES_USER:-ssoo}"
DB_NAME="${POSTGRES_DB:-ssoo_dev}"
SEED_DIR="packages/database/prisma/seeds"

# Same files and order as $SEED_DIR/apply_all_seeds.sql (the psql master script).
seed_files=(
  00_user_code.sql
  01_project_status_code.sql
  02_project_deliverable_status.sql
  03_project_close_condition.sql
  04_project_handoff_type.sql
  09_project_request_sample.sql
  08_unit_code.sql
  10_project_member_task_issue_code.sql
  05_menu_data.sql
  06_role_menu_permission.sql
  99_user_initial_admin.sql
  11_demo_users_customers.sql
  19_pms_asset_master.sql
  12_org_foundation_bridge.sql
  13_permission_foundation.sql
  14_pms_project_policy_foundation.sql
  15_dms_access_policy_foundation.sql
  16_sns_access_policy_foundation.sql
  18_crm_access_policy_foundation.sql
  20_dms_config_foundation.sql
  50_sns_boards.sql
  51_sns_skills.sql
  52_crm_opportunities.sql
  55_crm_customer_activity.sql
  53_crm_quote_seller_profile.sql
  54_crm_business_plan.sql
  56_crm_source_contracts.sql
  57_crm_launch_operations.sql
  58_crm_source_uiux_reference.sql
  17_demo_project_access_context.sql
  21_demo_project_statuses.sql
  12_demo_project_members.sql
  13_demo_tasks.sql
  14_demo_milestones.sql
  15_demo_issues.sql
  16_demo_deliverables_conditions.sql
  22_pms_template_groups.sql
  07_user_menu_permission.sql
  40_platform_onboarding_bootstrap.sql
)

for seed_file in "${seed_files[@]}"; do
  echo "[db-seed] applying ${seed_file}"
  docker compose exec -T "$SERVICE_NAME" \
    psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" \
    < "$SEED_DIR/$seed_file"
done

echo "[db-seed] complete"
