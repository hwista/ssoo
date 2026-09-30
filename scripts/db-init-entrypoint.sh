#!/usr/bin/env bash
# DB Init Entrypoint
# postgres healthcheck 이후 실행되어 스키마/시드/트리거를 적용합니다.
set -euo pipefail

if [ -s /run/secrets/ssoo_tls_ca ]; then
  export NODE_EXTRA_CA_CERTS=/run/secrets/ssoo_tls_ca
fi

DB_URL="${DATABASE_URL:?DATABASE_URL is required}"
# psql은 Prisma 전용 ?schema= 파라미터를 인식하지 못하므로 제거
PSQL_URL="${DB_URL%%\?*}"
PRISMA_PUSH_MODE="${DB_INIT_PRISMA_PUSH_MODE:-auto}"
BASELINE_MODE="${DB_INIT_BASELINE_MODE:-compat}"
SEED_DIR="/workspace/packages/database/prisma/seeds"
TRIGGER_DIR="/workspace/packages/database/prisma/triggers"
COMPAT_DIR="/workspace/packages/database/prisma/compat"
POST_BASELINE_COMPAT_FILE="$COMPAT_DIR/post-baseline/normalize_protected_primary_keys.sql"
MIGRATION_DIR="/workspace/packages/database/prisma/migrations"
PROTECTED_BASELINE_MIGRATIONS=(
  "$MIGRATION_DIR/20260702090000_add_crm_opportunity_ledger/migration.sql"
  "$MIGRATION_DIR/20260703093000_add_pms_asset_master/migration.sql"
  "$MIGRATION_DIR/20260703133000_add_pms_master_import_profiles/migration.sql"
  "$MIGRATION_DIR/20260706143000_add_pms_reconciliation_foundation/migration.sql"
  "$MIGRATION_DIR/20260706170000_add_crm_contract_ledger/migration.sql"
  "$MIGRATION_DIR/20260707090000_add_crm_quote_workflow/migration.sql"
  "$MIGRATION_DIR/20260707100000_add_crm_quote_seller_profile/migration.sql"
  "$MIGRATION_DIR/20260707110000_add_crm_opportunity_owner_user/migration.sql"
  "$MIGRATION_DIR/20260707123000_add_crm_business_plan_ledger/migration.sql"
  "$MIGRATION_DIR/20260707133000_add_crm_customer_activity_ledger/migration.sql"
  "$MIGRATION_DIR/20260708110000_add_crm_business_plan_monthly_input/migration.sql"
  "$MIGRATION_DIR/20260708123000_add_crm_cost_plan_internal_monthly/migration.sql"
  "$MIGRATION_DIR/20260708133000_add_crm_cost_plan_ams_vendor_wbs_mapping/migration.sql"
  "$MIGRATION_DIR/20260708143000_add_crm_cost_plan_ams_external_monthly/migration.sql"
  "$MIGRATION_DIR/20260708150000_add_crm_cost_plan_internal_confirmation/migration.sql"
  "$MIGRATION_DIR/20260708160000_add_crm_cost_plan_ams_external_confirmation/migration.sql"
  "$MIGRATION_DIR/20260709100000_add_crm_business_plan_performance_actual/migration.sql"
  "$MIGRATION_DIR/20260709110000_add_crm_report_confirmation/migration.sql"
  "$MIGRATION_DIR/20260709120000_add_crm_contract_dms_handoff/migration.sql"
  "$MIGRATION_DIR/20260709133000_add_crm_cost_plan_accounting_handoff/migration.sql"
  "$MIGRATION_DIR/20260709143000_add_crm_cost_plan_accounting_execution_evidence/migration.sql"
  "$MIGRATION_DIR/20260709153000_add_pms_close_condition_group_requires_deliverable/migration.sql"
  "$MIGRATION_DIR/20260709170000_add_pms_template_group_workflow/migration.sql"
  "$MIGRATION_DIR/20260710100000_add_crm_quote_dms_handoff/migration.sql"
  "$MIGRATION_DIR/20260710113000_add_pms_closeout_approval_steps/migration.sql"
  "$MIGRATION_DIR/20260710130000_add_pms_legacy_issue_archive/migration.sql"
  "$MIGRATION_DIR/20260713140000_add_pms_task_effort_logs/migration.sql"
)

case "$PRISMA_PUSH_MODE" in
  auto|force|skip) ;;
  *)
    echo "[db-init] ✗ invalid DB_INIT_PRISMA_PUSH_MODE=$PRISMA_PUSH_MODE (expected auto, force, or skip)" >&2
    exit 1
    ;;
esac

case "$BASELINE_MODE" in
  compat|strict) ;;
  *)
    echo "[db-init] ✗ invalid DB_INIT_BASELINE_MODE=$BASELINE_MODE (expected compat or strict)" >&2
    exit 1
    ;;
esac

legacy_ai_rag_schema_count() {
  psql "$PSQL_URL" -v ON_ERROR_STOP=1 -Atqc "
    SELECT COUNT(*)
      FROM (
        SELECT 1
          FROM information_schema.columns
         WHERE table_schema = 'common'
           AND (
             (table_name = 'cm_ai_source_m' AND column_name = 'metadata_json')
             OR (table_name = 'cm_ai_object_m' AND column_name IN ('summary', 'index_status_code', 'acl_snapshot_json', 'metadata_json'))
             OR (table_name = 'cm_ai_chunk_m' AND column_name IN ('chunk_hash', 'metadata_json', 'chunk_status_code'))
             OR (table_name = 'cm_ai_embedding_m' AND column_name = 'embedding_profile_code')
             OR (table_name = 'cm_ai_index_job_m' AND column_name IN ('priority', 'payload_json'))
             OR (table_name = 'cm_ai_index_state_m' AND column_name IN ('embedding_profile_code', 'metadata_json'))
             OR (table_name = 'cm_ai_acl_snapshot_m' AND column_name = 'snapshot_json')
             OR (table_name = 'cm_ai_retrieval_log_m' AND column_name IN ('metadata_json', 'blocked_result_count'))
           )
        UNION ALL
        SELECT 1
         WHERE to_regclass('common.cm_ai_retrieval_log_item_d') IS NOT NULL
      ) legacy_ai_rag_schema;
  "
}

application_table_count() {
  psql "$PSQL_URL" -v ON_ERROR_STOP=1 -Atqc "
    SELECT COUNT(*)
      FROM information_schema.tables
     WHERE table_schema IN ('common', 'crm', 'dms', 'pms', 'sns')
       AND table_type = 'BASE TABLE';
  "
}

launch_baseline_record_count() {
  migration_table_exists="$(psql "$PSQL_URL" -v ON_ERROR_STOP=1 -Atqc "
    SELECT CASE
      WHEN to_regclass('public._prisma_migrations') IS NULL THEN 0
      ELSE 1
    END;
  ")"
  if [ "${migration_table_exists:-0}" = "0" ]; then
    echo 0
    return
  fi

  psql "$PSQL_URL" -v ON_ERROR_STOP=1 -Atqc "
    SELECT COUNT(*)
      FROM public._prisma_migrations
     WHERE migration_name = '0_launch_baseline';
  "
}

echo "[db-init] ▶ prisma generate"
cd /workspace
pnpm --filter @ssoo/database db:generate

existing_application_tables="$(application_table_count)"
launch_baseline_records="$(launch_baseline_record_count)"
launch_managed_database=false

if [ "${existing_application_tables:-0}" = "0" ] || [ "${launch_baseline_records:-0}" != "0" ]; then
  launch_managed_database=true
  echo "[db-init] ▶ applying managed launch migration history"
  DATABASE_URL="$DB_URL" pnpm --filter @ssoo/database db:migrate:deploy
  echo "[db-init] ▶ verifying launch migration and schema contract before seed/trigger writes"
  DATABASE_URL="$DB_URL" pnpm --filter @ssoo/database db:runtime:verify -- --phase=schema
else
  if [ "$BASELINE_MODE" = "strict" ]; then
    echo "[db-init] ✗ existing pre-baseline database rejected by DB_INIT_BASELINE_MODE=strict" >&2
    echo "[db-init]   Restore or migrate into a clean launch-managed database; automatic baseline adoption is forbidden." >&2
    exit 1
  fi

  echo "[db-init] ▶ existing pre-baseline database detected; applying non-destructive compatibility path"

  if [ -d "$COMPAT_DIR" ]; then
    echo "[db-init] ▶ applying compatibility patches"
    for compat_file in "$COMPAT_DIR"/*.sql; do
      [ -e "$compat_file" ] || continue
      psql "$PSQL_URL" -v ON_ERROR_STOP=1 -f "$compat_file"
    done
  fi

  echo "[db-init] ▶ applying protected baseline migrations"
  for migration_file in "${PROTECTED_BASELINE_MIGRATIONS[@]}"; do
    if [ ! -f "$migration_file" ]; then
      echo "[db-init] ✗ required protected baseline migration missing: $migration_file" >&2
      exit 1
    fi

    echo "[db-init]   applying ${migration_file#$MIGRATION_DIR/}"
    psql "$PSQL_URL" -v ON_ERROR_STOP=1 -f "$migration_file"
  done

  echo "[db-init] ▶ normalizing protected baseline primary key names"
  psql "$PSQL_URL" -v ON_ERROR_STOP=1 -f "$POST_BASELINE_COMPAT_FILE"

  run_prisma_db_push=true

  if [ "$PRISMA_PUSH_MODE" = "skip" ]; then
    run_prisma_db_push=false
  elif [ "$PRISMA_PUSH_MODE" = "auto" ]; then
    legacy_count="$(legacy_ai_rag_schema_count)"
    if [ "${legacy_count:-0}" != "0" ]; then
      run_prisma_db_push=false
      echo "[db-init] ⚠ legacy common.cm_ai_* schema detected; skipping prisma db push to avoid destructive legacy column drops"
      echo "[db-init]   Set DB_INIT_PRISMA_PUSH_MODE=force only after backup/review if Prisma schema reconciliation is required."
    fi
  fi

  if [ "$run_prisma_db_push" = true ]; then
    echo "[db-init] ▶ prisma db push"
    DATABASE_URL="$DB_URL" pnpm --filter @ssoo/database db:push
  else
    echo "[db-init] ▶ prisma db push skipped (DB_INIT_PRISMA_PUSH_MODE=$PRISMA_PUSH_MODE)"
  fi

  # Existing databases still run the previous history triggers, which do not know the
  # columns added above; refresh them before seeds write history rows.
  echo "[db-init] ▶ refreshing history triggers before seeds"
  (cd "$TRIGGER_DIR" && psql "$PSQL_URL" -v ON_ERROR_STOP=1 -f "apply_all_triggers.sql")
fi

echo "[db-init] ▶ applying seeds"
(cd "$SEED_DIR" && psql "$PSQL_URL" -v ON_ERROR_STOP=1 -f "apply_all_seeds.sql")

echo "[db-init] ▶ applying triggers"
(cd "$TRIGGER_DIR" && psql "$PSQL_URL" -v ON_ERROR_STOP=1 -f "apply_all_triggers.sql")

if [ "$launch_managed_database" = true ]; then
  echo "[db-init] ▶ verifying release-ready runtime database contract"
  DATABASE_URL="$DB_URL" pnpm --filter @ssoo/database db:runtime:verify
else
  echo "[db-init] ⚠ compatibility database initialized without release-ready launch baseline evidence"
fi

echo "[db-init] ✅ complete"
