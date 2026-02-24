#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

CHANGED="$(git diff --name-only --cached || true)"
if [ -z "$CHANGED" ]; then
  CHANGED="$(git diff --name-only HEAD || true)"
fi

if ! echo "$CHANGED" | rg -q '^apps/web/dms/'; then
  echo "[dms-guard] no DMS changes detected. skip."
  exit 0
fi

echo "[dms-guard] DMS changes detected. running npm build in apps/web/dms"
bash .codex/scripts/dms-build.sh

echo "[dms-guard] completed."
