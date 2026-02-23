#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

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

NEED_SERVER=0
NEED_WEB_PMS=0
NEED_WEB_DMS=0

# Shared/core changes that can affect all targets.
if echo "$CHANGED" | rg -q '^package.json$|^pnpm-lock.yaml$|^pnpm-workspace.yaml$|^turbo.json$|^tsconfig\.base\.json$'; then
  NEED_SERVER=1
  NEED_WEB_PMS=1
  NEED_WEB_DMS=1
fi

# Server and its shared dependencies.
if echo "$CHANGED" | rg -q '^apps/server/|^packages/database/|^packages/types/'; then
  NEED_SERVER=1
fi

# PMS and its shared dependencies.
if echo "$CHANGED" | rg -q '^apps/web/pms/|^packages/types/'; then
  NEED_WEB_PMS=1
fi

# DMS only.
if echo "$CHANGED" | rg -q '^apps/web/dms/'; then
  NEED_WEB_DMS=1
fi

if [ "$NEED_WEB_DMS" -eq 1 ] && [ "${CODEX_PUSH_REMOTE_NAME:-}" = "origin" ]; then
  CURRENT_SPLIT_HASH="$(git subtree split --prefix=apps/web/dms --ignore-joins HEAD)"
  LAST_PUBLISHED_HASH="$(git config --local --get codex.dmsLastPublished || true)"
  if [ "$CURRENT_SPLIT_HASH" != "$LAST_PUBLISHED_HASH" ]; then
    echo "[push-guard] DMS publish marker mismatch for origin push."
    echo "[push-guard] expected: $CURRENT_SPLIT_HASH"
    echo "[push-guard] current marker: ${LAST_PUBLISHED_HASH:-<empty>}"
    echo "[push-guard] run: pnpm run codex:dms-publish"
    echo "[push-guard] (bypass once: CODEX_SKIP_DMS_PUBLISH_GUARD=1 git push ...)"
    if [ "${CODEX_SKIP_DMS_PUBLISH_GUARD:-0}" != "1" ]; then
      exit 1
    fi
    echo "[push-guard] bypass enabled by CODEX_SKIP_DMS_PUBLISH_GUARD=1"
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
