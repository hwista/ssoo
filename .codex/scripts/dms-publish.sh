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

GL_USER_VALUE="${GL_USER:-$(git config --local --get codex.gitlabUser || true)}"
GL_TOKEN_VALUE="${GL_TOKEN:-$(git config --local --get codex.gitlabToken || true)}"

if [ -z "$GL_USER_VALUE" ] || [ -z "$GL_TOKEN_VALUE" ]; then
  echo "[dms-publish] GL_USER/GL_TOKEN are required."
  echo "[dms-publish] example: export GL_USER='your_gitlab_username'"
  echo "[dms-publish]          export GL_TOKEN='your_personal_access_token'"
  echo "[dms-publish] or set local git config:"
  echo "[dms-publish]   git config --local codex.gitlabUser 'your_gitlab_username'"
  echo "[dms-publish]   git config --local codex.gitlabToken 'your_personal_access_token'"
  exit 1
fi

AUTH="$(printf '%s:%s' "$GL_USER_VALUE" "$GL_TOKEN_VALUE" | base64 -w0)"

gitlab_git() {
  git -c http.extraHeader="Authorization: Basic $AUTH" "$@"
}

LOCAL_SPLIT_HASH="$(git subtree split --prefix="$DMS_PREFIX" HEAD | tail -n 1)"

echo "[dms-publish] 1/6 inspect GitLab subtree branch: $GITLAB_BRANCH"
REMOTE_INFO="$(gitlab_git ls-remote --heads "$GITLAB_URL" "$GITLAB_BRANCH")"
REMOTE_HASH=""
if [ -n "$REMOTE_INFO" ]; then
  REMOTE_HASH="$(printf '%s\n' "$REMOTE_INFO" | awk 'NR==1 { print $1 }')"
  echo "[dms-publish] remote head before push: $REMOTE_HASH"

  gitlab_git fetch "$GITLAB_URL" \
    "+refs/heads/$GITLAB_BRANCH:$TMP_REMOTE_REF"

  if ! git merge-base --is-ancestor "$REMOTE_HASH" "$LOCAL_SPLIT_HASH"; then
    echo "[dms-publish] aborting before GitHub push: GitLab branch cannot fast-forward to the local subtree split."
    echo "[dms-publish] local split:  $LOCAL_SPLIT_HASH"
    echo "[dms-publish] remote head:  $REMOTE_HASH"
    echo "[dms-publish] run: pnpm run codex:dms-sync-from-gitlab"
    echo "[dms-publish] after syncing GitLab subtree back into the monorepo, re-run publish."
    exit 1
  fi
else
  echo "[dms-publish] GitLab branch does not exist yet. it will be created."
fi

echo "[dms-publish] 2/6 push GitHub branch: $TARGET_BRANCH"
git push origin "$TARGET_BRANCH"

if [ -n "$REMOTE_HASH" ] && [ "$REMOTE_HASH" = "$LOCAL_SPLIT_HASH" ]; then
  echo "[dms-publish] 3/6 GitLab subtree already up to date. skipping push."
else
  echo "[dms-publish] 3/6 push GitLab subtree: $GITLAB_BRANCH"
  gitlab_git subtree push --prefix="$DMS_PREFIX" "$GITLAB_URL" "$GITLAB_BRANCH"
fi

echo "[dms-publish] 4/6 fetch GitLab branch for verification"
gitlab_git fetch "$GITLAB_URL" \
  "+refs/heads/$GITLAB_BRANCH:$TMP_REMOTE_REF"

echo "[dms-publish] 5/6 compute local subtree split hash"
REMOTE_HASH="$(git rev-parse "$TMP_REMOTE_REF")"

echo "[dms-publish] 6/6 compare hashes"
echo "[dms-publish] local split:  $LOCAL_SPLIT_HASH"
echo "[dms-publish] remote head:  $REMOTE_HASH"

if [ "$LOCAL_SPLIT_HASH" != "$REMOTE_HASH" ]; then
  echo "[dms-publish] verification failed: GitLab branch is not aligned with local subtree split."
  exit 1
fi

git config --local codex.dmsLastPublished "$LOCAL_SPLIT_HASH"
echo "[dms-publish] wrote marker: git config codex.dmsLastPublished=$LOCAL_SPLIT_HASH"

echo "[dms-publish] success: GitHub and GitLab are both updated and verified."
