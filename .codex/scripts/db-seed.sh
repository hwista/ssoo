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
  09_project_request_sample.sql
  08_unit_code.sql
  10_project_member_task_issue_code.sql
  17_system_catalog.sql
  18_site_type.sql
  19_system_operator_type.sql
  05_menu_data.sql
  06_role_menu_permission.sql
  99_user_initial_admin.sql
  07_user_menu_permission.sql
)

for seed_file in "${seed_files[@]}"; do
  echo "[db-seed] applying ${seed_file}"
  docker compose exec -T "$SERVICE_NAME" \
    psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" \
    < "$SEED_DIR/$seed_file"
done

echo "[db-seed] complete"
