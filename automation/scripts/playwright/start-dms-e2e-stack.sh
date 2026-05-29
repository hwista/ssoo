#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(
  git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null || {
    cd "$SCRIPT_DIR/../../.." && pwd
  }
)"
cd "$ROOT_DIR"

RUNTIME_DIR="${PLAYWRIGHT_RUNTIME_DIR:-$ROOT_DIR/.runtime/playwright}"
LOG_DIR="$RUNTIME_DIR/logs"
PG_DATA_DIR="${PLAYWRIGHT_PG_DATA_DIR:-$RUNTIME_DIR/postgres/data}"
PG_LOG_FILE="${PLAYWRIGHT_PG_LOG_FILE:-$LOG_DIR/postgres.log}"
PG_PORT="${PLAYWRIGHT_PG_PORT:-55432}"
DB_USER="${PLAYWRIGHT_DB_USER:-ssoo}"
DB_NAME="${PLAYWRIGHT_DB_NAME:-ssoo_playwright}"
DATABASE_URL_BASE="${PLAYWRIGHT_DATABASE_URL_BASE:-postgresql://${DB_USER}@127.0.0.1:${PG_PORT}/${DB_NAME}}"
DATABASE_URL="${PLAYWRIGHT_DATABASE_URL:-${DATABASE_URL_BASE}?schema=public}"
SERVER_PORT="${PLAYWRIGHT_SERVER_PORT:-4000}"
DMS_PORT="${PLAYWRIGHT_DMS_PORT:-3001}"
DMS_MARKDOWN_ROOT="${PLAYWRIGHT_DMS_MARKDOWN_ROOT:-$(dirname "$ROOT_DIR")/LSWIKI_DOC_PLAYWRIGHT}"
DMS_LOCAL_ENV_FILE="${PLAYWRIGHT_DMS_LOCAL_ENV_FILE:-$RUNTIME_DIR/dms-local.env}"
SERVER_LOG_FILE="${PLAYWRIGHT_SERVER_LOG_FILE:-$LOG_DIR/server.log}"
WEB_LOG_FILE="${PLAYWRIGHT_WEB_LOG_FILE:-$LOG_DIR/web-dms.log}"
SHAREPOINT_STORAGE_ROOT="${PLAYWRIGHT_DMS_SHAREPOINT_ROOT:-$ROOT_DIR/.runtime/dms/storage/sharepoint}"
NAS_STORAGE_ROOT="${PLAYWRIGHT_DMS_NAS_ROOT:-$ROOT_DIR/.runtime/dms/storage/nas}"
SEED_DIR="$ROOT_DIR/packages/database/prisma/seeds"
SKIP_BUILD="${PLAYWRIGHT_SKIP_BUILD:-0}"

SERVER_PID=""
WEB_PID=""
POSTGRES_STARTED=0

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
  16_cms_access_policy_foundation.sql
  17_demo_project_access_context.sql
  12_demo_project_members.sql
  13_demo_tasks.sql
  14_demo_milestones.sql
  15_demo_issues.sql
  16_demo_deliverables_conditions.sql
  07_user_menu_permission.sql
)

log() {
  echo "[playwright-dms] $*"
}

fail() {
  echo "[playwright-dms] $*" >&2
  exit 1
}

require_cmd() {
  local cmd="$1"
  command -v "$cmd" >/dev/null 2>&1 || fail "missing required command: $cmd"
}

cleanup() {
  local status=$?

  if [ -n "$WEB_PID" ] && kill -0 "$WEB_PID" >/dev/null 2>&1; then
    kill "$WEB_PID" >/dev/null 2>&1 || true
    wait "$WEB_PID" >/dev/null 2>&1 || true
  fi

  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
    wait "$SERVER_PID" >/dev/null 2>&1 || true
  fi

  if [ "$POSTGRES_STARTED" = "1" ] && [ -f "$PG_DATA_DIR/postmaster.pid" ]; then
    pg_ctl -D "$PG_DATA_DIR" -m fast stop >/dev/null 2>&1 || true
  fi

  exit "$status"
}

trap cleanup EXIT INT TERM

wait_for_postgres() {
  for _ in $(seq 1 60); do
    if pg_isready -h 127.0.0.1 -p "$PG_PORT" -U "$DB_USER" >/dev/null 2>&1; then
      return
    fi
    sleep 1
  done

  fail "local postgres did not become ready on port $PG_PORT"
}

wait_for_http() {
  local url="$1"
  local label="$2"

  for _ in $(seq 1 120); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return
    fi
    sleep 1
  done

  fail "$label did not become ready: $url"
}

bootstrap_postgres() {
  mkdir -p "$PG_DATA_DIR" "$LOG_DIR"

  if [ ! -f "$PG_DATA_DIR/PG_VERSION" ]; then
    log "initializing local postgres cluster"
    initdb -D "$PG_DATA_DIR" -U "$DB_USER" --auth=trust >/dev/null
  fi

  if ! pg_isready -h 127.0.0.1 -p "$PG_PORT" -U "$DB_USER" >/dev/null 2>&1; then
    log "starting local postgres on port $PG_PORT"
    pg_ctl -D "$PG_DATA_DIR" -l "$PG_LOG_FILE" -o "-p $PG_PORT" start >/dev/null
    POSTGRES_STARTED=1
  fi

  wait_for_postgres
}

reset_database() {
  log "resetting local playwright database"
  dropdb --if-exists -h 127.0.0.1 -p "$PG_PORT" -U "$DB_USER" "$DB_NAME" >/dev/null 2>&1 || true
  createdb -h 127.0.0.1 -p "$PG_PORT" -U "$DB_USER" "$DB_NAME"

  env DATABASE_URL="$DATABASE_URL" pnpm --filter @ssoo/database db:generate
  env DATABASE_URL="$DATABASE_URL" pnpm --filter @ssoo/database db:push

  for seed_file in "${seed_files[@]}"; do
    log "seeding $seed_file"
    psql "$DATABASE_URL_BASE" -v ON_ERROR_STOP=1 < "$SEED_DIR/$seed_file" >/dev/null
  done

  env DATABASE_URL="$DATABASE_URL" pnpm --filter @ssoo/database exec ts-node --project tsconfig.json scripts/apply-triggers.ts
}

write_local_test_env() {
  mkdir -p \
    "$(dirname "$DMS_MARKDOWN_ROOT")" \
    "$ROOT_DIR/.runtime/dms/ingest" \
    "$ROOT_DIR/.runtime/dms/storage/local" \
    "$SHAREPOINT_STORAGE_ROOT" \
    "$NAS_STORAGE_ROOT"
  cat >"$DMS_LOCAL_ENV_FILE" <<EOF
DMS_LOCAL_TEST_PROFILE=playwright-direct-run
DATABASE_URL=$DATABASE_URL
PORT=$SERVER_PORT
NODE_ENV=development
CORS_ORIGIN=http://127.0.0.1:$DMS_PORT
JWT_SECRET=playwright-jwt-secret
JWT_REFRESH_SECRET=playwright-jwt-refresh-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
AUTH_SESSION_COOKIE_NAME=ssoo-session
AUTH_SESSION_COOKIE_DOMAIN=
AUTH_SESSION_COOKIE_SECURE=false
AUTH_SESSION_COOKIE_SAME_SITE=lax
DMS_MARKDOWN_ROOT=$DMS_MARKDOWN_ROOT
DMS_INGEST_QUEUE_PATH=$ROOT_DIR/.runtime/dms/ingest
DMS_STORAGE_LOCAL_BASE_PATH=$ROOT_DIR/.runtime/dms/storage/local
DMS_STORAGE_SHAREPOINT_BASE_PATH=$SHAREPOINT_STORAGE_ROOT
DMS_STORAGE_NAS_BASE_PATH=$NAS_STORAGE_ROOT
DMS_GIT_BOOTSTRAP_REMOTE_URL=
DMS_GIT_BOOTSTRAP_BRANCH=master
EOF
}

start_server() {
  log "starting DMS local-test server"
  env DMS_LOCAL_TEST_ENV_FILE="$DMS_LOCAL_ENV_FILE" \
    pnpm run dms:local-test:start >"$SERVER_LOG_FILE" 2>&1 &
  SERVER_PID=$!
  wait_for_http "http://127.0.0.1:$SERVER_PORT/api/health" "DMS server"
}

start_web() {
  log "starting DMS web app"
  env DMS_SERVER_API_URL="http://127.0.0.1:$SERVER_PORT/api" \
    pnpm --filter web-dms exec next start --port "$DMS_PORT" --hostname 127.0.0.1 >"$WEB_LOG_FILE" 2>&1 &
  WEB_PID=$!
  wait_for_http "http://127.0.0.1:$DMS_PORT/login" "DMS web app"
}

require_cmd curl
require_cmd createdb
require_cmd dropdb
require_cmd initdb
require_cmd pg_ctl
require_cmd pg_isready
require_cmd psql

if [ "$SKIP_BUILD" != "1" ]; then
  log "building server and DMS app"
  pnpm build:server
  pnpm build:web-dms
else
  log "skipping build (PLAYWRIGHT_SKIP_BUILD=1)"
fi

bootstrap_postgres
reset_database
write_local_test_env
start_server
start_web

log "DMS Playwright stack is ready"
wait -n "$SERVER_PID" "$WEB_PID"
