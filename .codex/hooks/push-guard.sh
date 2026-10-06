#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

MATCH_TOOL="rg"
if ! command -v rg >/dev/null 2>&1; then
  MATCH_TOOL="grep"
fi

changed_matches() {
  local pattern="$1"
  if [ "$MATCH_TOOL" = "rg" ]; then
    rg -q "$pattern" <<< "$CHANGED"
    return
  fi

  grep -Eq "$pattern" <<< "$CHANGED"
}

echo "[push-guard] running: node .codex/scripts/verify-codex-sync.js"
node .codex/scripts/verify-codex-sync.js

echo "[push-guard] running: node .github/scripts/verify-ui-primitives.js"
node .github/scripts/verify-ui-primitives.js

echo "[push-guard] running: node .github/scripts/verify-ui-consumption.js"
node .github/scripts/verify-ui-consumption.js

echo "[push-guard] running: node .github/scripts/verify-ui-style-boundary.js"
node .github/scripts/verify-ui-style-boundary.js

echo "[push-guard] running: pnpm run verify:input-intent"
pnpm run verify:input-intent

echo "[push-guard] running: pnpm run verify:ssoo-frame -- --skip-runtime"
pnpm run verify:ssoo-frame -- --skip-runtime

echo "[push-guard] running: pnpm run verify:error-routing"
pnpm run verify:error-routing

CHANGED="$(
  {
    git diff --name-only --cached || true
    git diff --name-only || true
    git ls-files --others --exclude-standard || true
  } | sort -u
)"

if [ -z "$CHANGED" ]; then
  echo "[push-guard] no changed files detected."
  exit 0
fi

echo "[push-guard] changed files:"
echo "$CHANGED"

if [ "$MATCH_TOOL" = "grep" ]; then
  echo "[push-guard] rg not found. using grep fallback."
fi

NEED_SERVER=0
NEED_WEB_ADMIN=0
NEED_WEB_CRM=0
NEED_WEB_PMS=0
NEED_WEB_DMS=0
NEED_WEB_SNS=0
NEED_AI_RAG=0
NEED_PRODUCTION_COMPOSE=0
NEED_DATABASE_CONTRACT=0
NEED_SUPPLY_CHAIN_RUNTIME=0
NEED_DMS_LAUNCH_CONTRACT=0

# Shared/core changes that can affect all targets.
if changed_matches '^package.json$|^pnpm-lock.yaml$|^pnpm-workspace.yaml$|^turbo.json$|^tsconfig\.base\.json$'; then
  NEED_SERVER=1
  NEED_WEB_ADMIN=1
  NEED_WEB_CRM=1
  NEED_WEB_PMS=1
  NEED_WEB_DMS=1
  NEED_WEB_SNS=1
fi

# Server and its shared dependencies.
if changed_matches '^apps/server/|^packages/database/|^packages/types/'; then
  NEED_SERVER=1
fi

# Shared browser packages are compiled into every Next.js application.
if changed_matches '^packages/(types|web-auth|web-shell|web-ui)/'; then
  NEED_WEB_ADMIN=1
  NEED_WEB_CRM=1
  NEED_WEB_PMS=1
  NEED_WEB_DMS=1
  NEED_WEB_SNS=1
fi

if changed_matches '^apps/web/admin/'; then
  NEED_WEB_ADMIN=1
fi

if changed_matches '^apps/web/crm/'; then
  NEED_WEB_CRM=1
fi

# AI/RAG platform guard. Runtime provider-ready smoke remains a separate
# live-environment proof because it requires a running server and Azure config.
if changed_matches '^apps/server/src/modules/common/ai-index/|^apps/server/src/modules/dms/(ask|search)/|^packages/types/src/common/ai(-index|-retrieval)?\.ts$|^packages/database/prisma/(compat/|migrations/20260623053000_add_common_ai_rag_platform/|triggers/6[345]_cm_ai_)|^scripts/(verify-ai-rag-|record-ai-rag-|complete-ai-rag-|db-init-entrypoint\.sh)|^docs/common/(guides/ai-rag-runtime-runbook\.md|explanation/architecture/ai-rag-platform-)|^docs/(crm|dms|pms)/planning/(backlog|roadmap)\.md$|^package\.json$'; then
  NEED_AI_RAG=1
fi

if changed_matches '^compose(\.local|\.production)?\.yaml$|^\.env\.production\.example$|^scripts/verify-production-compose-env\.mjs$|^apps/web/(admin|crm|pms|dms|sns)/Dockerfile$|^package\.json$'; then
  NEED_PRODUCTION_COMPOSE=1
fi

if changed_matches '^packages/database/(package\.json|scripts/|prisma/launch-migrations/|prisma/triggers/)|^scripts/db-init-entrypoint\.sh$|^compose(\.local|\.production)?\.yaml$|^package\.json$|^\.github/workflows/pr-validation\.yml$'; then
  NEED_DATABASE_CONTRACT=1
fi

if changed_matches '^pnpm-lock\.yaml$|^pnpm-workspace\.yaml$|^package\.json$|^apps/web/(admin|crm|pms|dms|sns)/package\.json$|^scripts/verify-sharp-runtime\.mjs$'; then
  NEED_SUPPLY_CHAIN_RUNTIME=1
fi

if changed_matches '^apps/web/(admin|dms)/|^automation/(playwright\.config\.ts|scripts/playwright/start-dms-e2e-stack\.sh|tests/e2e/)|^scripts/(dms-go-live-contract|run-dms-go-live-gate|verify-dms-launch-contract|verify-prisma-deepmerge-security)\.mjs$|^docs/dms/(planning/(2026-08-14-operational-launch-ralph-plan|backlog|roadmap)\.md|guides/deployment\.md)$|^\.github/instructions/(dms|testing)\.instructions\.md$|^\.codex/instructions/(dms|testing)\.instructions\.md$|^pnpm-(lock|workspace)\.yaml$|^package\.json$'; then
  NEED_DMS_LAUNCH_CONTRACT=1
fi

# PMS and its shared dependencies.
if changed_matches '^apps/web/pms/|^packages/types/'; then
  NEED_WEB_PMS=1
fi

# DMS only.
if changed_matches '^apps/web/dms/'; then
  NEED_WEB_DMS=1
fi

if changed_matches '^apps/web/sns/'; then
  NEED_WEB_SNS=1
fi

if [ "${CODEX_PUSH_REMOTE_NAME:-}" = "origin" ]; then
  PUBLISH_MARKER_KEY="codex.gitlabLastPublished"
  CURRENT_WORKSPACE_HASH="$(git rev-parse HEAD)"
  LAST_PUBLISHED_HASH="$(git config --local --get "$PUBLISH_MARKER_KEY" || true)"
  SKIP_GUARD="${CODEX_SKIP_GITLAB_PUBLISH_GUARD:-${CODEX_SKIP_DMS_PUBLISH_GUARD:-0}}"
  if [ "$CURRENT_WORKSPACE_HASH" != "$LAST_PUBLISHED_HASH" ]; then
    echo "[push-guard] GitLab workspace publish marker mismatch for origin push."
    echo "[push-guard] marker key: $PUBLISH_MARKER_KEY"
    echo "[push-guard] expected: $CURRENT_WORKSPACE_HASH"
    echo "[push-guard] current marker: ${LAST_PUBLISHED_HASH:-<empty>}"
    echo "[push-guard] direct origin pushes stay blocked until workspace publish updates the marker."
    echo "[push-guard] run: pnpm run codex:workspace-publish"
    echo "[push-guard] legacy alias: pnpm run codex:dms-publish"
    echo "[push-guard] (bypass once: CODEX_SKIP_GITLAB_PUBLISH_GUARD=1 git push ...)"
    if [ "$SKIP_GUARD" != "1" ]; then
      exit 1
    fi
    echo "[push-guard] bypass enabled by GitLab publish guard skip variable"
  fi
fi

if [ "$NEED_SERVER" -eq 1 ]; then
  echo "[push-guard] running: pnpm run build:server"
  pnpm run build:server
fi

if [ "$NEED_AI_RAG" -eq 1 ]; then
  echo "[push-guard] running: pnpm run verify:ai-rag-platform"
  pnpm run verify:ai-rag-platform
  echo "[push-guard] running: pnpm run verify:ai-rag-central-foundation"
  pnpm run verify:ai-rag-central-foundation
  echo "[push-guard] running: pnpm run verify:ai-rag-evidence-recorder"
  pnpm run verify:ai-rag-evidence-recorder
  echo "[push-guard] running: pnpm run verify:ai-rag-central-foundation:flow"
  pnpm run verify:ai-rag-central-foundation:flow
fi

if [ "$NEED_PRODUCTION_COMPOSE" -eq 1 ]; then
  echo "[push-guard] running: pnpm run docker:production:verify-env:self-test"
  pnpm run docker:production:verify-env:self-test
fi

if [ "$NEED_DATABASE_CONTRACT" -eq 1 ]; then
  echo "[push-guard] running: pnpm run db:contract:test"
  pnpm run db:contract:test
fi

if [ "$NEED_SUPPLY_CHAIN_RUNTIME" -eq 1 ]; then
  echo "[push-guard] running: pnpm run security:sharp-runtime"
  pnpm run security:sharp-runtime
fi

if [ "$NEED_DMS_LAUNCH_CONTRACT" -eq 1 ]; then
  echo "[push-guard] running: pnpm run verify:dms-launch-contract"
  pnpm run verify:dms-launch-contract
  echo "[push-guard] running: pnpm run verify:dms-launch-types"
  pnpm run verify:dms-launch-types
  echo "[push-guard] running: pnpm run verify:prisma-deepmerge-security"
  pnpm run verify:prisma-deepmerge-security
fi

if [ "$NEED_WEB_ADMIN" -eq 1 ]; then
  echo "[push-guard] running: pnpm run build:web-admin"
  pnpm run build:web-admin
fi

if [ "$NEED_WEB_CRM" -eq 1 ]; then
  echo "[push-guard] running: pnpm run build:web-crm"
  pnpm run build:web-crm
fi

if [ "$NEED_WEB_PMS" -eq 1 ]; then
  echo "[push-guard] running: pnpm run build:web-pms"
  pnpm run build:web-pms
fi

if [ "$NEED_WEB_DMS" -eq 1 ]; then
  echo "[push-guard] running: pnpm run build:web-dms"
  pnpm run build:web-dms
fi

if [ "$NEED_WEB_SNS" -eq 1 ]; then
  echo "[push-guard] running: pnpm run build:web-sns"
  pnpm run build:web-sns
fi

if [ "$NEED_SERVER" -eq 0 ] && [ "$NEED_WEB_ADMIN" -eq 0 ] && [ "$NEED_WEB_CRM" -eq 0 ] && [ "$NEED_WEB_PMS" -eq 0 ] && [ "$NEED_WEB_DMS" -eq 0 ] && [ "$NEED_WEB_SNS" -eq 0 ]; then
  echo "[push-guard] no build target affected. skip."
fi

echo "[push-guard] completed."
