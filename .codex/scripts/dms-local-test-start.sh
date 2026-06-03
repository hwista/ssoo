#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SERVER_DIR="$ROOT_DIR/apps/server"
LOCAL_ENV_FILE="${DMS_LOCAL_TEST_ENV_FILE:-$ROOT_DIR/.env.local-test}"
EXPECTED_INGEST_PATH="$ROOT_DIR/.runtime/dms/ingest"
EXPECTED_STORAGE_PATH="$ROOT_DIR/.runtime/dms/storage/local"

fail() {
  echo "[dms-local-test] $*" >&2
  exit 1
}

load_env_file() {
  local env_file="$1"
  if [ ! -f "$env_file" ]; then
    return
  fi

  set -a
  # shellcheck disable=SC1090
  . "$env_file"
  set +a
}

cd "$ROOT_DIR"

load_env_file "$ROOT_DIR/.env"

if [ ! -f "$LOCAL_ENV_FILE" ]; then
  fail "missing $LOCAL_ENV_FILE. Create it with the local-test DMS path overrides first."
fi

load_env_file "$LOCAL_ENV_FILE"

: "${DMS_INSTANCE_ENV:?DMS_INSTANCE_ENV must be set in .env.local-test}"
: "${DMS_MARKDOWN_ROOT:?DMS_MARKDOWN_ROOT must be set in .env.local-test}"
: "${DMS_INGEST_QUEUE_PATH:?DMS_INGEST_QUEUE_PATH must be set in .env.local-test}"
: "${DMS_STORAGE_LOCAL_BASE_PATH:?DMS_STORAGE_LOCAL_BASE_PATH must be set in .env.local-test}"
: "${DMS_GIT_BOOTSTRAP_BRANCH:?DMS_GIT_BOOTSTRAP_BRANCH must be set in .env.local-test}"

if [ "$DMS_INSTANCE_ENV" != "local-test" ]; then
  fail "DMS_INSTANCE_ENV must be 'local-test' for the default local-test profile."
fi

if [ "$DMS_INGEST_QUEUE_PATH" != "$EXPECTED_INGEST_PATH" ]; then
  fail "DMS_INGEST_QUEUE_PATH must stay on the repo runtime path: $EXPECTED_INGEST_PATH"
fi

if [ "$DMS_STORAGE_LOCAL_BASE_PATH" != "$EXPECTED_STORAGE_PATH" ]; then
  fail "DMS_STORAGE_LOCAL_BASE_PATH must stay on the repo runtime path: $EXPECTED_STORAGE_PATH"
fi

if [ -n "${DMS_GIT_BOOTSTRAP_REMOTE_URL:-}" ]; then
  fail "DMS_GIT_BOOTSTRAP_REMOTE_URL must be empty for the default local-test profile."
fi

if [ "$DMS_GIT_BOOTSTRAP_BRANCH" != "master" ]; then
  fail "DMS_GIT_BOOTSTRAP_BRANCH must be 'master' for the default local-test profile."
fi

case "$DMS_MARKDOWN_ROOT" in
  "$ROOT_DIR"/*)
    fail "DMS_MARKDOWN_ROOT must point outside the LSWIKI repo."
    ;;
esac

if [ "$DMS_MARKDOWN_ROOT" = "$ROOT_DIR/.runtime/dms/documents" ]; then
  fail "DMS_MARKDOWN_ROOT must not point back to .runtime/dms/documents."
fi

mkdir -p "$DMS_MARKDOWN_ROOT" "$DMS_INGEST_QUEUE_PATH" "$DMS_STORAGE_LOCAL_BASE_PATH"

if [ -d "$DMS_MARKDOWN_ROOT/.git" ]; then
  resolved_git_root="$(git -C "$DMS_MARKDOWN_ROOT" rev-parse --show-toplevel 2>/dev/null || true)"
  if [ "$resolved_git_root" != "$DMS_MARKDOWN_ROOT" ]; then
    fail "existing git root for DMS_MARKDOWN_ROOT does not match the configured local document repo."
  fi
else
  echo "[dms-local-test] no git metadata yet. The server will auto-initialize the empty local document repo."
fi

if [ ! -f "$SERVER_DIR/dist/main.js" ]; then
  fail "missing $SERVER_DIR/dist/main.js. Run 'pnpm --filter server build' first."
fi

echo "[dms-local-test] profile: ${DMS_LOCAL_TEST_PROFILE:-local-test-direct-run}"
echo "[dms-local-test] instance env: $DMS_INSTANCE_ENV"
echo "[dms-local-test] markdown root: $DMS_MARKDOWN_ROOT"
echo "[dms-local-test] ingest queue: $DMS_INGEST_QUEUE_PATH"
echo "[dms-local-test] storage root: $DMS_STORAGE_LOCAL_BASE_PATH"
echo "[dms-local-test] bootstrap remote: (empty)"

cd "$SERVER_DIR"
exec node dist/main.js "$@"
