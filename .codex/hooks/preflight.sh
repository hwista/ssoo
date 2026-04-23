#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

emit_stage() {
  local action="$1"
  shift
  if [ -z "${HERMES_HARNESS_RUN_ID:-}" ]; then
    return 0
  fi
  if [ ! -x ".hermes/scripts/harness-stage-event" ]; then
    return 0
  fi
  bash .hermes/scripts/harness-stage-event "$action" --run-id "$HERMES_HARNESS_RUN_ID" "$@" >/dev/null 2>&1 || true
}

emit_stage start --role planner --provider github-copilot --model claude-sonnet-4.6 --notes "ssoo preflight planner"

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

echo "[preflight] repo: $ROOT_DIR"

if [ ! -d ".git" ]; then
  echo "[preflight] .git not found. Run this from repository context."
  exit 1
fi

echo "[preflight] running: node .codex/scripts/verify-codex-sync.js"
node .codex/scripts/verify-codex-sync.js

CHANGED="$(git diff --name-only --cached || true)"
if [ -z "$CHANGED" ]; then
  CHANGED="$(git diff --name-only HEAD || true)"
fi

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
PATTERN_FILES=()

if changed_matches '\.md$|^docs/|^\.github/'; then
  NEED_DOCS=1
fi

if changed_matches '\.tsx?$|^apps/|^packages/'; then
  NEED_PATTERNS=1
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

echo "[preflight] completed."
emit_stage complete --role critic --provider openai-codex --model gpt-5.4 --status succeeded --handoff-to reviewer-01
emit_stage start --role reviewer --provider github-copilot --model claude-sonnet-4.6
emit_stage complete --role reviewer --provider github-copilot --model claude-sonnet-4.6 --status succeeded
