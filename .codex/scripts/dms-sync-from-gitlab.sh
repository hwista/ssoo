#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "[dms-sync] compatibility wrapper: forwarding to workspace sync."
echo "[dms-sync] legacy DMS subtree sync is no longer the default path."

exec bash .codex/scripts/workspace-sync-from-gitlab.sh "$@"
