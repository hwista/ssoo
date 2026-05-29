#!/usr/bin/env bash
set -euo pipefail

script_dir=$(cd "$(dirname "$0")" && pwd)
repo_root=$(dirname "$script_dir")
local_handler="$repo_root/agent-system/local/harness-command.sh"

if [[ -x "$local_handler" ]]; then
  exec bash "$local_handler" "$@"
fi

mode="${1:-unknown}"

echo "[harness-compat] Hermes runtime hooks are retired for ordinary LSWIKI workflow: $mode" >&2
echo "[harness-compat] Use workspace-planning/, agent-system/, and the standard pnpm codex/build/lint commands instead." >&2
echo "[harness-compat] If a machine-local compatibility hook is still needed, place it at agent-system/local/harness-command.sh." >&2
exit 1
