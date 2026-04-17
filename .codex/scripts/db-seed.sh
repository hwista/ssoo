#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

SERVICE_NAME="${DB_SERVICE_NAME:-postgres}"
DB_USER="${POSTGRES_USER:-ssoo}"
DB_NAME="${POSTGRES_DB:-ssoo_dev}"
SEED_DIR="packages/database/prisma/seeds"

seed_files=(
  00_user_code.sql
  01_project_status_code.sql
  02_project_deliverable_status.sql
  03_project_close_condition.sql
  04_project_handoff_type.sql
  08_unit_code.sql
  09_project_request_sample.sql
  10_project_member_task_issue_code.sql
  05_menu_data.sql
  06_role_menu_permission.sql
  99_user_initial_admin.sql
  11_demo_users_customers.sql
  12_org_foundation_bridge.sql
  13_permission_foundation.sql
  14_pms_project_policy_foundation.sql
  15_dms_access_policy_foundation.sql
  16_chs_access_policy_foundation.sql
  17_demo_project_access_context.sql
  12_demo_project_members.sql
  13_demo_tasks.sql
  14_demo_milestones.sql
  15_demo_issues.sql
  16_demo_deliverables_conditions.sql
  07_user_menu_permission.sql
)

for seed_file in "${seed_files[@]}"; do
  echo "[db-seed] applying ${seed_file}"
  docker compose exec -T "$SERVICE_NAME" \
    psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" \
    < "$SEED_DIR/$seed_file"
done

echo "[db-seed] complete"
