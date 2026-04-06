#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

GITLAB_URL_DEFAULT="http://10.125.31.72:8010/LSITC_WEB/LSWIKI.git"
GITLAB_BRANCH_DEFAULT="refactor/integration"
TMP_REMOTE_REF_DEFAULT="refs/remotes/tmp/lswiki-refactor-integration"
DMS_PREFIX="apps/web/dms"

GITLAB_URL="${DMS_GITLAB_URL:-$GITLAB_URL_DEFAULT}"
GITLAB_BRANCH="${DMS_GITLAB_BRANCH:-$GITLAB_BRANCH_DEFAULT}"
TMP_REMOTE_REF="${DMS_TMP_REMOTE_REF:-$TMP_REMOTE_REF_DEFAULT}"
SYNC_MESSAGE="${DMS_SYNC_MESSAGE:-chore(dms): sync GitLab subtree from ${GITLAB_BRANCH}}"

if ! command -v git >/dev/null 2>&1; then
  echo "[dms-sync] git command not found."
  exit 1
fi

GL_USER_VALUE="${GL_USER:-$(git config --local --get codex.gitlabUser || true)}"
GL_TOKEN_VALUE="${GL_TOKEN:-$(git config --local --get codex.gitlabToken || true)}"

if [ -z "$GL_USER_VALUE" ] || [ -z "$GL_TOKEN_VALUE" ]; then
  echo "[dms-sync] GL_USER/GL_TOKEN are required."
  echo "[dms-sync] example: export GL_USER='your_gitlab_username'"
  echo "[dms-sync]          export GL_TOKEN='your_personal_access_token'"
  echo "[dms-sync] or set local git config:"
  echo "[dms-sync]   git config --local codex.gitlabUser 'your_gitlab_username'"
  echo "[dms-sync]   git config --local codex.gitlabToken 'your_personal_access_token'"
  exit 1
fi

AUTH="$(printf '%s:%s' "$GL_USER_VALUE" "$GL_TOKEN_VALUE" | base64 -w0)"

gitlab_git() {
  git -c http.extraHeader="Authorization: Basic $AUTH" "$@"
}

echo "[dms-sync] GitLab subtree branch: $GITLAB_BRANCH"
echo "[dms-sync] temporary fetch ref:   $TMP_REMOTE_REF"
echo "[dms-sync] 1/4 inspect GitLab subtree branch: $GITLAB_BRANCH"
REMOTE_INFO="$(gitlab_git ls-remote --heads "$GITLAB_URL" "$GITLAB_BRANCH")"
if [ -z "$REMOTE_INFO" ]; then
  echo "[dms-sync] GitLab branch does not exist. nothing to sync."
  exit 0
fi

REMOTE_HASH="$(printf '%s\n' "$REMOTE_INFO" | awk 'NR==1 { print $1 }')"
echo "[dms-sync] remote head: $REMOTE_HASH"

gitlab_git fetch "$GITLAB_URL" \
  "+refs/heads/$GITLAB_BRANCH:$TMP_REMOTE_REF"

echo "[dms-sync] 2/4 compute local subtree split"
LOCAL_SPLIT_HASH="$(git subtree split --prefix="$DMS_PREFIX" HEAD | tail -n 1)"
echo "[dms-sync] local split: $LOCAL_SPLIT_HASH"

if git merge-base --is-ancestor "$REMOTE_HASH" "$LOCAL_SPLIT_HASH"; then
  echo "[dms-sync] local subtree already contains the remote head. nothing to merge."
  exit 0
fi

echo "[dms-sync] 3/4 merge GitLab subtree into monorepo"
if ! git subtree merge --prefix="$DMS_PREFIX" -m "$SYNC_MESSAGE" "$TMP_REMOTE_REF"; then
  echo "[dms-sync] subtree merge reported conflicts."
  echo "[dms-sync] resolve conflicts, commit the result, then re-run publish."
  exit 1
fi

echo "[dms-sync] 4/4 completed"
git --no-pager log --oneline -1
