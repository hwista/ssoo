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
    printf '%s\n' "$CHANGED" | rg -q "$pattern"
    return
  fi

  printf '%s\n' "$CHANGED" | grep -Eq "$pattern"
}

echo "[push-guard] running: node .codex/scripts/verify-codex-sync.js"
node .codex/scripts/verify-codex-sync.js

CHANGED="$(git diff --name-only --cached || true)"
if [ -z "$CHANGED" ]; then
  CHANGED="$(git diff --name-only HEAD || true)"
fi

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
NEED_WEB_PMS=0
NEED_WEB_DMS=0

# Shared/core changes that can affect all targets.
if changed_matches '^package.json$|^pnpm-lock.yaml$|^pnpm-workspace.yaml$|^turbo.json$|^tsconfig\.base\.json$'; then
  NEED_SERVER=1
  NEED_WEB_PMS=1
  NEED_WEB_DMS=1
fi

# Server and its shared dependencies.
if changed_matches '^apps/server/|^packages/database/|^packages/types/'; then
  NEED_SERVER=1
fi

# PMS and its shared dependencies.
if changed_matches '^apps/web/pms/|^packages/types/'; then
  NEED_WEB_PMS=1
fi

# DMS only.
if changed_matches '^apps/web/dms/'; then
  NEED_WEB_DMS=1
fi

if [ "${CODEX_PUSH_REMOTE_NAME:-}" = "origin" ]; then
  CURRENT_WORKSPACE_HASH="$(git rev-parse HEAD)"
  LAST_PUBLISHED_HASH="$(git config --local --get codex.gitlabLastPublished || true)"
  SKIP_GUARD="${CODEX_SKIP_GITLAB_PUBLISH_GUARD:-${CODEX_SKIP_DMS_PUBLISH_GUARD:-0}}"
  if [ "$CURRENT_WORKSPACE_HASH" != "$LAST_PUBLISHED_HASH" ]; then
    echo "[push-guard] GitLab workspace publish marker mismatch for origin push."
    echo "[push-guard] expected: $CURRENT_WORKSPACE_HASH"
    echo "[push-guard] current marker: ${LAST_PUBLISHED_HASH:-<empty>}"
    echo "[push-guard] run: pnpm run codex:workspace-publish"
    echo "[push-guard] (compat alias: pnpm run codex:dms-publish)"
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

if [ "$NEED_WEB_PMS" -eq 1 ]; then
  echo "[push-guard] running: pnpm run build:web-pms"
  pnpm run build:web-pms
fi

if [ "$NEED_WEB_DMS" -eq 1 ]; then
  echo "[push-guard] running: pnpm run build:web-dms"
  pnpm run build:web-dms
fi

if [ "$NEED_SERVER" -eq 0 ] && [ "$NEED_WEB_PMS" -eq 0 ] && [ "$NEED_WEB_DMS" -eq 0 ]; then
  echo "[push-guard] no build target affected. skip."
fi

echo "[push-guard] completed."
