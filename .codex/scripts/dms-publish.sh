#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

GITLAB_URL_DEFAULT="http://10.125.31.72:8010/LSITC_WEB/LSWIKI.git"
GITLAB_BRANCH_DEFAULT="refactor/integration"
TMP_REMOTE_REF_DEFAULT="refs/remotes/tmp/lswiki-refactor-integration"
DMS_PREFIX="apps/web/dms"

TARGET_BRANCH="${1:-$(git branch --show-current)}"
GITLAB_URL="${DMS_GITLAB_URL:-$GITLAB_URL_DEFAULT}"
GITLAB_BRANCH="${DMS_GITLAB_BRANCH:-$GITLAB_BRANCH_DEFAULT}"
TMP_REMOTE_REF="${DMS_TMP_REMOTE_REF:-$TMP_REMOTE_REF_DEFAULT}"

if [ -z "$TARGET_BRANCH" ]; then
  echo "[dms-publish] unable to determine target GitHub branch."
  echo "[dms-publish] usage: bash .codex/scripts/dms-publish.sh <github-branch>"
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  echo "[dms-publish] git command not found."
  exit 1
fi

if [ -z "${GL_USER:-}" ] || [ -z "${GL_TOKEN:-}" ]; then
  echo "[dms-publish] GL_USER/GL_TOKEN are required."
  echo "[dms-publish] example: export GL_USER='your_gitlab_username'"
  echo "[dms-publish]          export GL_TOKEN='your_personal_access_token'"
  exit 1
fi

AUTH="$(printf '%s:%s' "$GL_USER" "$GL_TOKEN" | base64 -w0)"

echo "[dms-publish] 1/5 push GitHub branch: $TARGET_BRANCH"
git push origin "$TARGET_BRANCH"

echo "[dms-publish] 2/5 push GitLab subtree: $GITLAB_BRANCH"
git -c http.extraHeader="Authorization: Basic $AUTH" \
  subtree push --prefix="$DMS_PREFIX" "$GITLAB_URL" "$GITLAB_BRANCH"

echo "[dms-publish] 3/5 fetch GitLab branch for verification"
git -c http.extraHeader="Authorization: Basic $AUTH" \
  fetch "$GITLAB_URL" \
  "+$GITLAB_BRANCH:$TMP_REMOTE_REF"

echo "[dms-publish] 4/5 compute local subtree split hash"
LOCAL_SPLIT_HASH="$(git subtree split --prefix="$DMS_PREFIX" HEAD)"
REMOTE_HASH="$(git rev-parse "$TMP_REMOTE_REF")"

echo "[dms-publish] 5/5 compare hashes"
echo "[dms-publish] local split:  $LOCAL_SPLIT_HASH"
echo "[dms-publish] remote head:  $REMOTE_HASH"

if [ "$LOCAL_SPLIT_HASH" != "$REMOTE_HASH" ]; then
  echo "[dms-publish] verification failed: GitLab branch is not aligned with local subtree split."
  exit 1
fi

git config --local codex.dmsLastPublished "$LOCAL_SPLIT_HASH"
echo "[dms-publish] wrote marker: git config codex.dmsLastPublished=$LOCAL_SPLIT_HASH"

echo "[dms-publish] success: GitHub and GitLab are both updated and verified."
