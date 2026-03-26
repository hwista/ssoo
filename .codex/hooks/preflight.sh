#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

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

NEED_DOCS=0
NEED_PATTERNS=0
NEED_TYPO=0
PATTERN_FILES=()
TYPO_FILES=()

if echo "$CHANGED" | rg -q '\.md$|^docs/|^\.github/'; then
  NEED_DOCS=1
fi

if echo "$CHANGED" | rg -q '\.tsx?$|^apps/|^packages/'; then
  NEED_PATTERNS=1
  NEED_TYPO=1
fi

if [ "$NEED_PATTERNS" -eq 1 ]; then
  while IFS= read -r file; do
    if [[ "$file" =~ \.(ts|tsx|js|jsx)$ ]] && [ -f "$file" ]; then
      PATTERN_FILES+=("$file")
      TYPO_FILES+=("$file")
    fi
  done <<< "$CHANGED"

  if [ "${#PATTERN_FILES[@]}" -eq 0 ]; then
    NEED_PATTERNS=0
    NEED_TYPO=0
  fi
fi

if [ "$NEED_DOCS" -eq 1 ]; then
  echo "[preflight] running: node .github/scripts/check-docs.js --strict-warnings"
  node .github/scripts/check-docs.js --strict-warnings
fi

if [ "$NEED_PATTERNS" -eq 1 ]; then
  echo "[preflight] running: node .github/scripts/check-patterns.js ${PATTERN_FILES[*]}"
  node .github/scripts/check-patterns.js "${PATTERN_FILES[@]}"
fi

if [ "$NEED_TYPO" -eq 1 ]; then
  echo "[preflight] running: node .github/scripts/check-typography.js ${TYPO_FILES[*]}"
  node .github/scripts/check-typography.js "${TYPO_FILES[@]}"
fi

echo "[preflight] completed."
