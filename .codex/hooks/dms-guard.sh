#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

changed_matches() {
  local pattern="$1"
  if command -v rg >/dev/null 2>&1; then
    printf '%s\n' "$CHANGED" | rg -q "$pattern"
    return
  fi

  printf '%s\n' "$CHANGED" | grep -Eq "$pattern"
}

CHANGED="$(git diff --name-only --cached || true)"
if [ -z "$CHANGED" ]; then
  CHANGED="$(git diff --name-only HEAD || true)"
fi

if ! changed_matches '^apps/web/dms/'; then
  echo "[dms-guard] no DMS changes detected. skip."
  exit 0
fi

if ! command -v rg >/dev/null 2>&1; then
  echo "[dms-guard] rg not found. using grep fallback."
fi

echo "[dms-guard] validating shell body slot contract"
pnpm --filter web-dms check:shell-body-contract

echo "[dms-guard] validating golden example conventions"
pnpm --filter web-dms check:golden-example

echo "[dms-guard] DMS changes detected. running workspace build for web-dms"
bash .codex/scripts/dms-build.sh

echo "[dms-guard] completed."
