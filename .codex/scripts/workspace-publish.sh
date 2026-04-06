#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

GITLAB_URL_DEFAULT="http://10.125.31.72:8010/LSITC_WEB/LSWIKI.git"
GITLAB_BRANCH_DEFAULT="development"
TMP_REMOTE_REF_DEFAULT="refs/remotes/tmp/lswiki-workspace-development"
PUBLISH_MARKER_KEY_DEFAULT="codex.gitlabLastPublished"

TARGET_BRANCH_ARG="${1:-}"
if [ "$TARGET_BRANCH_ARG" = "--" ]; then
  TARGET_BRANCH_ARG="${2:-}"
fi

TARGET_BRANCH="${TARGET_BRANCH_ARG:-$(git branch --show-current)}"
GITLAB_URL="${WORKSPACE_GITLAB_URL:-${DMS_GITLAB_URL:-$GITLAB_URL_DEFAULT}}"
GITLAB_BRANCH="${WORKSPACE_GITLAB_BRANCH:-${DMS_GITLAB_BRANCH:-$GITLAB_BRANCH_DEFAULT}}"
TMP_REMOTE_REF="${WORKSPACE_TMP_REMOTE_REF:-${DMS_TMP_REMOTE_REF:-$TMP_REMOTE_REF_DEFAULT}}"
PUBLISH_MARKER_KEY="${WORKSPACE_PUBLISH_MARKER_KEY:-$PUBLISH_MARKER_KEY_DEFAULT}"

if [ -z "$TARGET_BRANCH" ]; then
  echo "[workspace-publish] unable to determine target GitHub branch."
  echo "[workspace-publish] usage: bash .codex/scripts/workspace-publish.sh <github-branch>"
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  echo "[workspace-publish] git command not found."
  exit 1
fi

GL_USER_VALUE="${GL_USER:-$(git config --local --get codex.gitlabUser || true)}"
GL_TOKEN_VALUE="${GL_TOKEN:-$(git config --local --get codex.gitlabToken || true)}"

if [ -z "$GL_USER_VALUE" ] || [ -z "$GL_TOKEN_VALUE" ]; then
  echo "[workspace-publish] GL_USER/GL_TOKEN are required."
  echo "[workspace-publish] example: export GL_USER='your_gitlab_username'"
  echo "[workspace-publish]          export GL_TOKEN='your_personal_access_token'"
  echo "[workspace-publish] or set local git config:"
  echo "[workspace-publish]   git config --local codex.gitlabUser 'your_gitlab_username'"
  echo "[workspace-publish]   git config --local codex.gitlabToken 'your_personal_access_token'"
  exit 1
fi

AUTH="$(printf '%s:%s' "$GL_USER_VALUE" "$GL_TOKEN_VALUE" | base64 -w0)"

gitlab_git() {
  git -c http.extraHeader="Authorization: Basic $AUTH" "$@"
}

LOCAL_HEAD_HASH="$(git rev-parse HEAD)"

echo "[workspace-publish] GitHub target branch:     $TARGET_BRANCH"
echo "[workspace-publish] GitLab workspace branch: $GITLAB_BRANCH"
echo "[workspace-publish] temporary fetch ref:      $TMP_REMOTE_REF"

if [ "$TARGET_BRANCH" != "$GITLAB_BRANCH" ]; then
  echo "[workspace-publish] notice: GitHub target branch and GitLab workspace branch differ."
  echo "[workspace-publish]         ensure this is intentional or set WORKSPACE_GITLAB_BRANCH explicitly."
fi

echo "[workspace-publish] 1/6 inspect GitLab workspace branch: $GITLAB_BRANCH"
REMOTE_INFO="$(gitlab_git ls-remote --heads "$GITLAB_URL" "refs/heads/$GITLAB_BRANCH")"
REMOTE_HASH=""
if [ -n "$REMOTE_INFO" ]; then
  REMOTE_HASH="$(printf '%s\n' "$REMOTE_INFO" | awk 'NR==1 { print $1 }')"
  echo "[workspace-publish] remote head before push: $REMOTE_HASH"

  gitlab_git fetch "$GITLAB_URL" \
    "+refs/heads/$GITLAB_BRANCH:$TMP_REMOTE_REF"

  if ! git merge-base --is-ancestor "$REMOTE_HASH" "$LOCAL_HEAD_HASH"; then
    echo "[workspace-publish] aborting before GitHub push: GitLab branch cannot fast-forward to local HEAD."
    echo "[workspace-publish] local head:   $LOCAL_HEAD_HASH"
    echo "[workspace-publish] remote head:  $REMOTE_HASH"
    echo "[workspace-publish] run: pnpm run codex:workspace-sync-from-gitlab"
    echo "[workspace-publish] legacy alias: pnpm run codex:dms-sync-from-gitlab"
    echo "[workspace-publish] after syncing the GitLab workspace branch back into the monorepo, re-run publish."
    exit 1
  fi
else
  echo "[workspace-publish] GitLab branch does not exist yet. it will be created."
fi

echo "[workspace-publish] 2/6 push GitHub branch: $TARGET_BRANCH"
CODEX_SKIP_GITLAB_PUBLISH_GUARD=1 CODEX_SKIP_DMS_PUBLISH_GUARD=1 \
  git push origin "HEAD:refs/heads/$TARGET_BRANCH"

if [ -n "$REMOTE_HASH" ] && [ "$REMOTE_HASH" = "$LOCAL_HEAD_HASH" ]; then
  echo "[workspace-publish] 3/6 GitLab workspace branch already up to date. skipping push."
else
  echo "[workspace-publish] 3/6 push GitLab workspace branch: $GITLAB_BRANCH"
  gitlab_git push "$GITLAB_URL" "HEAD:refs/heads/$GITLAB_BRANCH"
fi

echo "[workspace-publish] 4/6 fetch GitLab branch for verification"
gitlab_git fetch "$GITLAB_URL" \
  "+refs/heads/$GITLAB_BRANCH:$TMP_REMOTE_REF"

echo "[workspace-publish] 5/6 compute local workspace hash"
REMOTE_HASH="$(git rev-parse "$TMP_REMOTE_REF")"

echo "[workspace-publish] 6/6 compare hashes"
echo "[workspace-publish] local head:   $LOCAL_HEAD_HASH"
echo "[workspace-publish] remote head:  $REMOTE_HASH"

if [ "$LOCAL_HEAD_HASH" != "$REMOTE_HASH" ]; then
  echo "[workspace-publish] verification failed: GitLab workspace branch is not aligned with local HEAD."
  exit 1
fi

git config --local "$PUBLISH_MARKER_KEY" "$LOCAL_HEAD_HASH"
echo "[workspace-publish] wrote marker: git config $PUBLISH_MARKER_KEY=$LOCAL_HEAD_HASH"

echo "[workspace-publish] success: GitHub and GitLab workspace branches are both updated and verified."
