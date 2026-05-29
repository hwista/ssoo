#!/usr/bin/env bash
set -euo pipefail

script_dir=$(cd "$(dirname "$0")" && pwd)
repo_root=$(dirname "$script_dir")
local_observer="${LSWIKI_COMMAND_OBSERVER:-$repo_root/agent-system/local/observe-command.sh}"

if [[ -x "$local_observer" ]]; then
  exec bash "$local_observer" "$@"
fi

command=""
label=""
passthrough_args=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --command)
      shift
      if [[ $# -eq 0 ]]; then
        echo "missing value for --command" >&2
        exit 1
      fi
      command="$1"
      ;;
    --command=*)
      command="${1#*=}"
      ;;
    --verification-command-label)
      shift
      if [[ $# -eq 0 ]]; then
        echo "missing value for --verification-command-label" >&2
        exit 1
      fi
      label="$1"
      ;;
    --verification-command-label=*)
      label="${1#*=}"
      ;;
    --)
      shift
      passthrough_args+=("$@")
      break
      ;;
    *)
      passthrough_args+=("$1")
      ;;
  esac
  shift
done

if [[ -z "$command" ]]; then
  echo "no local observer was provided and no --command was given" >&2
  exit 1
fi

if [[ -n "$label" ]]; then
  echo "[run-observed-command] local observer missing, running raw fallback: $label" >&2
else
  echo "[run-observed-command] local observer missing, running raw fallback" >&2
fi

if [[ ${#passthrough_args[@]} -gt 0 ]]; then
  quoted_args=""
  for arg in "${passthrough_args[@]}"; do
    printf -v quoted_arg '%q' "$arg"
    quoted_args+=" $quoted_arg"
  done
  exec bash -lc "$command$quoted_args"
fi

exec bash -lc "$command"
