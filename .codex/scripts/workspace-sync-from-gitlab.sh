#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

GITLAB_URL_DEFAULT="http://10.125.31.72:8010/LSITC_WEB/LSWIKI.git"
GITLAB_BRANCH_DEFAULT="development"
TMP_REMOTE_REF_DEFAULT="refs/remotes/tmp/lswiki-workspace-development"

GITLAB_URL="${WORKSPACE_GITLAB_URL:-${DMS_GITLAB_URL:-$GITLAB_URL_DEFAULT}}"
GITLAB_BRANCH="${WORKSPACE_GITLAB_BRANCH:-${DMS_GITLAB_BRANCH:-$GITLAB_BRANCH_DEFAULT}}"
TMP_REMOTE_REF="${WORKSPACE_TMP_REMOTE_REF:-${DMS_TMP_REMOTE_REF:-$TMP_REMOTE_REF_DEFAULT}}"
SYNC_MESSAGE="${WORKSPACE_SYNC_MESSAGE:-chore(workspace): sync GitLab workspace from ${GITLAB_BRANCH}}"

if ! command -v git >/dev/null 2>&1; then
  echo "[workspace-sync] git command not found."
  exit 1
fi

GL_USER_VALUE="${GL_USER:-$(git config --local --get codex.gitlabUser || true)}"
GL_TOKEN_VALUE="${GL_TOKEN:-$(git config --local --get codex.gitlabToken || true)}"

if [ -z "$GL_USER_VALUE" ] || [ -z "$GL_TOKEN_VALUE" ]; then
  echo "[workspace-sync] GL_USER/GL_TOKEN are required."
  echo "[workspace-sync] example: export GL_USER='your_gitlab_username'"
  echo "[workspace-sync]          export GL_TOKEN='your_personal_access_token'"
  echo "[workspace-sync] or set local git config:"
  echo "[workspace-sync]   git config --local codex.gitlabUser 'your_gitlab_username'"
  echo "[workspace-sync]   git config --local codex.gitlabToken 'your_personal_access_token'"
  exit 1
fi

AUTH="$(printf '%s:%s' "$GL_USER_VALUE" "$GL_TOKEN_VALUE" | base64 -w0)"

gitlab_git() {
  git -c http.extraHeader="Authorization: Basic $AUTH" "$@"
}

echo "[workspace-sync] GitLab workspace branch: $GITLAB_BRANCH"
echo "[workspace-sync] temporary fetch ref:      $TMP_REMOTE_REF"
echo "[workspace-sync] 1/4 inspect GitLab workspace branch: $GITLAB_BRANCH"
REMOTE_INFO="$(gitlab_git ls-remote --heads "$GITLAB_URL" "refs/heads/$GITLAB_BRANCH")"
if [ -z "$REMOTE_INFO" ]; then
  echo "[workspace-sync] GitLab branch does not exist. nothing to sync."
  exit 0
fi

REMOTE_HASH="$(printf '%s\n' "$REMOTE_INFO" | awk 'NR==1 { print $1 }')"
echo "[workspace-sync] remote head: $REMOTE_HASH"

gitlab_git fetch "$GITLAB_URL" \
  "+refs/heads/$GITLAB_BRANCH:$TMP_REMOTE_REF"

echo "[workspace-sync] 2/4 compute local workspace head"
LOCAL_HEAD_HASH="$(git rev-parse HEAD)"
echo "[workspace-sync] local head: $LOCAL_HEAD_HASH"

if git merge-base --is-ancestor "$REMOTE_HASH" "$LOCAL_HEAD_HASH"; then
  echo "[workspace-sync] local workspace already contains the remote head. nothing to merge."
  exit 0
fi

echo "[workspace-sync] 3/4 merge GitLab workspace into monorepo"
if ! git merge --no-ff -m "$SYNC_MESSAGE" "$TMP_REMOTE_REF"; then
  echo "[workspace-sync] merge reported conflicts."
  echo "[workspace-sync] resolve conflicts, commit the result, then re-run publish."
  exit 1
fi

echo "[workspace-sync] 4/4 completed"
git --no-pager log --oneline -1
