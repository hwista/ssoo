#!/usr/bin/env bash
set -euo pipefail
umask 077
job="${1:-}"
: "${CI_PROJECT_DIR:?}" "${CI_COMMIT_SHA:?}" "${APP_DIR:?}"
case "$job" in verify|ai-review|plan|build|rehearse|deploy) ;; *) echo 'Unknown CI job' >&2; exit 2 ;; esac
[[ "$CI_COMMIT_SHA" =~ ^[a-f0-9]{40}$ ]] || exit 2
lock_file="${CI_APP_LOCK_FILE:-/tmp/ssoo-app-runtime.lock}"
lock_timeout="${CI_APP_LOCK_TIMEOUT_SECONDS:-7200}"
exec 9>"$lock_file"
flock -w "$lock_timeout" 9 || { echo '[ci-job] host lock timeout' >&2; exit 1; }
export CI_RELEASE_STATE_DIR="${CI_RELEASE_STATE_DIR:-${XDG_STATE_HOME:-$HOME/.local/state}/ssoo/releases}"
[[ "$CI_RELEASE_STATE_DIR" == /* && "$CI_RELEASE_STATE_DIR" != / && "$CI_RELEASE_STATE_DIR" != *:* ]] || exit 2
export CI_RELEASE_RUNTIME_DIR="${CI_RELEASE_RUNTIME_DIR:-$APP_DIR}"
export CI_RELEASE_ENV_FILE="${CI_RELEASE_ENV_FILE:-$APP_DIR/.env}"
export CI_RELEASE_DMS_ENV_FILE="${CI_RELEASE_DMS_ENV_FILE:-$APP_DIR/apps/web/dms/.env.local}"
source_dir="$CI_RELEASE_STATE_DIR/sources/$CI_COMMIT_SHA"
mkdir -p "$CI_RELEASE_STATE_DIR/sources"
if [[ ! -d "$source_dir" ]]; then
  git -C "$CI_PROJECT_DIR" worktree add --detach "$source_dir" "$CI_COMMIT_SHA"
fi
[[ "$(git -C "$source_dir" rev-parse HEAD)" == "$CI_COMMIT_SHA" ]] || exit 1
[[ -z "$(git -C "$source_dir" status --porcelain --untracked-files=normal)" ]] || { echo '[ci-job] release checkout is dirty' >&2; exit 1; }
export APP_DIR="$source_dir"
cd "$APP_DIR"
case "$job" in
  verify)
    # Additional corporate trust is opt-in, just like the Compose build secret.
    # The runner need not have Debian's CA bundle; node:22 has its own trust store.
    verify_build_args=()
    if [[ -n "${CI_VERIFY_TLS_CA_CERT_FILE:-}" ]]; then
      if [[ ! -f "$CI_VERIFY_TLS_CA_CERT_FILE" || ! -r "$CI_VERIFY_TLS_CA_CERT_FILE" || ! -s "$CI_VERIFY_TLS_CA_CERT_FILE" ]]; then
        echo '[ci-job] CI_VERIFY_TLS_CA_CERT_FILE must be a readable, non-empty regular file' >&2
        exit 2
      fi
      verify_build_args+=(--secret "id=ssoo_tls_ca,src=$CI_VERIFY_TLS_CA_CERT_FILE")
    fi
    bash scripts/ci/release-job.sh prepare
    verify_image="app-ci-verify:$CI_COMMIT_SHA"
    docker build "${verify_build_args[@]}" --file docker/ci-verify.Dockerfile --tag "$verify_image" .
    git_common="$(git rev-parse --path-format=absolute --git-common-dir)"
    docker run --rm --volume "$APP_DIR/.git:/app/.git:ro" --volume "$git_common:$git_common:ro" \
      "$verify_image" bash -lc 'pnpm run verify:gitlab-pipeline && pnpm run codex:preflight && pnpm lint && pnpm test:server'
    ;;
  ai-review) bash scripts/ci/ai-review.sh ;;
  plan|build|rehearse|deploy) bash scripts/ci/release-job.sh "$job" ;;
esac
