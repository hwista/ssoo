#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "[dms-publish] compatibility wrapper: forwarding to workspace publish."
echo "[dms-publish] legacy DMS subtree publish is no longer the default path."

exec bash .codex/scripts/workspace-publish.sh "$@"
