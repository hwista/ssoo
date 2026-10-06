#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

emit_stage() {
  local action="$1"
  shift
  if [ -z "${LSWIKI_HARNESS_RUN_ID:-}" ]; then
    return 0
  fi
  bash scripts/harness-compat.sh "$action" --run-id "$LSWIKI_HARNESS_RUN_ID" "$@" >/dev/null 2>&1 || true
}

emit_stage start --role planner --provider github-copilot --model claude-sonnet-4.6 --notes "ssoo preflight planner"

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

echo "[preflight] repo: $ROOT_DIR"

if [ ! -d ".git" ]; then
  echo "[preflight] .git not found. Run this from repository context."
  exit 1
fi

echo "[preflight] running: node .codex/scripts/verify-codex-sync.js"
node .codex/scripts/verify-codex-sync.js

echo "[preflight] running: pnpm run verify:dms-runtime-profile-contract"
pnpm run verify:dms-runtime-profile-contract

echo "[preflight] running: node .github/scripts/verify-ui-primitives.js"
node .github/scripts/verify-ui-primitives.js

echo "[preflight] running: node .github/scripts/verify-ui-consumption.js"
node .github/scripts/verify-ui-consumption.js

echo "[preflight] running: node .github/scripts/verify-ui-style-boundary.js"
node .github/scripts/verify-ui-style-boundary.js

echo "[preflight] running: pnpm run verify:input-intent"
pnpm run verify:input-intent

echo "[preflight] running: pnpm run verify:ssoo-frame -- --skip-runtime"
pnpm run verify:ssoo-frame -- --skip-runtime

echo "[preflight] running: pnpm run verify:error-routing"
pnpm run verify:error-routing

CHANGED="$(
  {
    git diff --name-only --cached || true
    git diff --name-only || true
    git ls-files --others --exclude-standard || true
  } | sort -u
)"

if [ -z "$CHANGED" ]; then
  echo "[preflight] no changed files detected."
  exit 0
fi

echo "[preflight] changed files:"
echo "$CHANGED"

if [ "$MATCH_TOOL" = "grep" ]; then
  echo "[preflight] rg not found. using grep fallback."
fi

NEED_DOCS=0
NEED_PATTERNS=0
NEED_AI_RAG=0
NEED_PRODUCTION_COMPOSE=0
NEED_DATABASE_CONTRACT=0
NEED_SUPPLY_CHAIN_RUNTIME=0
NEED_DMS_LAUNCH_CONTRACT=0
NEED_CRM_GO_LIVE_CONTRACT=0
NEED_CRM_DEMO_CONTRACT=0
PATTERN_FILES=()

if changed_matches '\.md$|^docs/|^\.github/'; then
  NEED_DOCS=1
fi

if changed_matches '\.tsx?$|^apps/|^packages/'; then
  NEED_PATTERNS=1
fi

if changed_matches '^apps/server/src/modules/common/ai-index/|^apps/server/src/modules/dms/(ask|search)/|^packages/types/src/common/ai(-index|-retrieval)?\.ts$|^packages/database/prisma/(compat/|migrations/20260623053000_add_common_ai_rag_platform/|triggers/6[345]_cm_ai_)|^scripts/(verify-ai-rag-|record-ai-rag-|complete-ai-rag-|db-init-entrypoint\.sh)|^docs/common/(guides/ai-rag-runtime-runbook\.md|explanation/architecture/ai-rag-platform-)|^docs/(crm|dms|pms)/planning/(backlog|roadmap)\.md$|^package\.json$'; then
  NEED_AI_RAG=1
fi

if changed_matches '^compose(\.(local|local-test|production))?\.yaml$|^\.env\.production\.example$|^scripts/verify-production-compose-env\.mjs$|^apps/web/(admin|crm|pms|dms|sns)/Dockerfile$|^package\.json$'; then
  NEED_PRODUCTION_COMPOSE=1
fi

if changed_matches '^packages/database/(package\.json|scripts/|prisma/launch-migrations/|prisma/triggers/)|^scripts/db-init-entrypoint\.sh$|^compose(\.(local|local-test|production))?\.yaml$|^package\.json$|^\.github/workflows/pr-validation\.yml$'; then
  NEED_DATABASE_CONTRACT=1
fi

if changed_matches '^pnpm-lock\.yaml$|^pnpm-workspace\.yaml$|^package\.json$|^apps/web/(admin|crm|pms|dms|sns)/package\.json$|^scripts/verify-sharp-runtime\.mjs$'; then
  NEED_SUPPLY_CHAIN_RUNTIME=1
fi

if changed_matches '^apps/web/(admin|dms)/|^automation/(playwright\.config\.ts|scripts/playwright/start-dms-e2e-stack\.sh|tests/e2e/)|^scripts/(dms-go-live-contract|run-dms-go-live-gate|verify-dms-launch-contract|verify-prisma-deepmerge-security)\.mjs$|^docs/dms/(planning/(2026-08-14-operational-launch-ralph-plan|backlog|roadmap)\.md|guides/deployment\.md)$|^\.github/instructions/(dms|testing)\.instructions\.md$|^\.codex/instructions/(dms|testing)\.instructions\.md$|^pnpm-(lock|workspace)\.yaml$|^package\.json$'; then
  NEED_DMS_LAUNCH_CONTRACT=1
fi

if changed_matches '^scripts/verify-crm-go-live(-browser-evidence)?\.mjs$|^docs/crm/(README\.md|guides/go-live-external-inputs\.md|planning/launch-operations-(prd|handoff|test-plan)\.md)$|^\.env\.production\.example$|^package\.json$'; then
  NEED_CRM_GO_LIVE_CONTRACT=1
fi

if changed_matches '^scripts/(repository-worktree-identity|capture-crm-target-uiux-parity|verify-crm-(uiux-parity-evidence|local-evidence|core-runtime|current-demo-parity|migration-completion|launch-readiness)|prepare-crm-ralph-runtime|run-crm-ralph-process)\.mjs$|^docs/crm/(README\.md|planning/(demo-100-verification-contract|source-parity-matrix|source-migration-prd|backlog)\.md)$|^package\.json$'; then
  NEED_CRM_DEMO_CONTRACT=1
fi

if [ "$NEED_PATTERNS" -eq 1 ]; then
  while IFS= read -r file; do
    if [[ "$file" =~ \.(ts|tsx|js|jsx)$ ]] && [ -f "$file" ]; then
      PATTERN_FILES+=("$file")
    fi
  done <<< "$CHANGED"

  if [ "${#PATTERN_FILES[@]}" -eq 0 ]; then
    NEED_PATTERNS=0
  fi
fi

if [ "$NEED_DOCS" -eq 1 ]; then
  emit_stage complete --role planner --provider github-copilot --model claude-sonnet-4.6 --status succeeded --handoff-to critic-01
  emit_stage start --role critic --provider openai-codex --model gpt-5.4
  echo "[preflight] running: node .github/scripts/check-docs.js --strict-warnings"
  node .github/scripts/check-docs.js --strict-warnings
fi

if [ "$NEED_PATTERNS" -eq 1 ]; then
  if [ "$NEED_DOCS" -ne 1 ]; then
    emit_stage complete --role planner --provider github-copilot --model claude-sonnet-4.6 --status succeeded --handoff-to critic-01
    emit_stage start --role critic --provider openai-codex --model gpt-5.4
  fi
  echo "[preflight] running: node .github/scripts/check-patterns.js ${PATTERN_FILES[*]}"
  node .github/scripts/check-patterns.js "${PATTERN_FILES[@]}"
fi

if [ "$NEED_AI_RAG" -eq 1 ]; then
  echo "[preflight] running: pnpm run verify:ai-rag-platform"
  pnpm run verify:ai-rag-platform
  echo "[preflight] running: pnpm run verify:ai-rag-central-foundation"
  pnpm run verify:ai-rag-central-foundation
  echo "[preflight] running: pnpm run verify:ai-rag-evidence-recorder"
  pnpm run verify:ai-rag-evidence-recorder
  echo "[preflight] running: pnpm run verify:ai-rag-central-foundation:flow"
  pnpm run verify:ai-rag-central-foundation:flow
fi

if [ "$NEED_PRODUCTION_COMPOSE" -eq 1 ]; then
  echo "[preflight] running: pnpm run docker:production:verify-env:self-test"
  pnpm run docker:production:verify-env:self-test
fi

if [ "$NEED_CRM_GO_LIVE_CONTRACT" -eq 1 ]; then
  echo "[preflight] running: pnpm run verify:crm-go-live:self-test"
  pnpm run verify:crm-go-live:self-test
  echo "[preflight] running: pnpm run verify:crm-go-live:final:self-test"
  pnpm run verify:crm-go-live:final:self-test
fi

if [ "$NEED_CRM_DEMO_CONTRACT" -eq 1 ]; then
  echo "[preflight] running: pnpm run verify:crm-worktree-identity:self-test"
  pnpm run verify:crm-worktree-identity:self-test
  echo "[preflight] running: pnpm run verify:crm-uiux-parity:self-test"
  pnpm run verify:crm-uiux-parity:self-test
  echo "[preflight] running: pnpm run verify:crm-current-demo:self-test"
  pnpm run verify:crm-current-demo:self-test
  echo "[preflight] running: pnpm run verify:crm-launch:raw"
  pnpm run verify:crm-launch:raw
fi

if [ "$NEED_DATABASE_CONTRACT" -eq 1 ]; then
  echo "[preflight] running: pnpm run db:contract:test"
  pnpm run db:contract:test
fi

if [ "$NEED_SUPPLY_CHAIN_RUNTIME" -eq 1 ]; then
  echo "[preflight] running: pnpm run security:sharp-runtime"
  pnpm run security:sharp-runtime
fi

if [ "$NEED_DMS_LAUNCH_CONTRACT" -eq 1 ]; then
  echo "[preflight] running: pnpm run verify:dms-launch-contract"
  pnpm run verify:dms-launch-contract
  echo "[preflight] running: pnpm run verify:dms-launch-types"
  pnpm run verify:dms-launch-types
fi

echo "[preflight] completed."
emit_stage complete --role critic --provider openai-codex --model gpt-5.4 --status succeeded --handoff-to reviewer-01
emit_stage start --role reviewer --provider github-copilot --model claude-sonnet-4.6
emit_stage complete --role reviewer --provider github-copilot --model claude-sonnet-4.6 --status succeeded
