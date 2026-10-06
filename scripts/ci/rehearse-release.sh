#!/usr/bin/env bash
set -euo pipefail
umask 077
release_dir="${1:?}"; release_root="${2:?}"; node_image="${3:?}"
: "${APP_DIR:?}" "${CI_PIPELINE_ID:?}" "${CI_REHEARSAL_BACKUP_EVIDENCE:?Verified DB and runtime archive evidence required}"
: "${CI_SMOKE_TOKEN_FILE:?Dedicated smoke token required}"
cp "$CI_REHEARSAL_BACKUP_EVIDENCE" "$release_dir/backup-evidence.json"
node_run() {
  docker run --rm -i --network none --user "$(id -u):$(id -g)" --volume "$APP_DIR:$APP_DIR:ro" \
    --volume "$release_root:$release_root" --workdir "$APP_DIR" --entrypoint node "$node_image" "$@"
}
node_run scripts/ci/release-state.mjs backup-check "$release_root" "$release_dir"
# Evidence archives must live under the protected release state root so the helper
# can verify the actual bytes without exposing unrelated host files to containers.
archive="$(node_run scripts/ci/release-state.mjs backup-path "$release_root" "$release_dir")"
rehearsal="$release_dir/rehearsal"
[[ ! -e "$rehearsal" ]] || { echo '[rehearse] previous attempt exists; new pipeline required' >&2; exit 1; }
mkdir -p "$rehearsal"
tar -xzf "$archive" -C "$rehearsal" --no-same-owner
[[ -s "$rehearsal/database.dump" && -d "$rehearsal/runtime/markdown/.git" ]] || exit 1
# Mirror only the copied document tree. Never change the real repository remote.
git clone --bare "$rehearsal/runtime/markdown" "$rehearsal/git.git" >/dev/null
printf '[safe]\n\tdirectory = /rehearsal/git.git\n' > "$rehearsal/gitconfig"
chmod 644 "$rehearsal/gitconfig"
if git -C "$rehearsal/runtime/markdown" remote get-url origin >/dev/null 2>&1; then
  git -C "$rehearsal/runtime/markdown" remote set-url origin file:///rehearsal/git.git
else
  git -C "$rehearsal/runtime/markdown" remote add origin file:///rehearsal/git.git
fi
node_run scripts/ci/release-state.mjs rehearsal-compose "$release_root" "$release_dir"
project="ssoo-rehearse-$CI_PIPELINE_ID"
rehearse=(docker compose -p "$project" -f "$release_dir/compose.rehearsal.json")
cleanup() {
  local result=$?
  if [[ "$result" != 0 ]]; then
    "${rehearse[@]}" ps -a --format json > "$release_dir/rehearsal-containers.json" 2>/dev/null || true
    "${rehearse[@]}" logs --no-color --tail 200 > "$release_dir/rehearsal-runtime.log" 2>&1 || true
    node_run scripts/ci/release-state.mjs state "$release_root" "$release_dir" rehearsal-failed || true
  fi
  "${rehearse[@]}" --profile operations down --volumes --remove-orphans >/dev/null 2>&1 || true
}
trap cleanup EXIT
"${rehearse[@]}" up -d postgres
ready=0
for attempt in $(seq 1 30); do
  if "${rehearse[@]}" exec -T postgres pg_isready -U ssoo -d ssoo_candidate >/dev/null 2>&1; then ready=1; break; fi
  sleep 2
done
[[ "$ready" == 1 ]] || exit 1
"${rehearse[@]}" exec -T postgres pg_restore --exit-on-error --no-owner --no-acl -U ssoo -d ssoo_candidate < "$rehearsal/database.dump"
"${rehearse[@]}" --profile operations run --rm --no-deps db-init
"${rehearse[@]}" --profile operations run --rm --no-deps db-init
"${rehearse[@]}" up -d --no-build --no-deps server admin crm pms dms sns
passed=0
for attempt in $(seq 1 30); do
  if docker run --rm --network "${project}_default" --user "$(id -u):$(id -g)" \
    --volume "$APP_DIR:$APP_DIR:ro" --volume "$release_root:$release_root" \
    --volume "$CI_SMOKE_TOKEN_FILE:/run/smoke-token:ro" --env CI_SMOKE_TOKEN_FILE=/run/smoke-token \
    --env CI_SERVER_SMOKE_URL=http://server:4000/api --env CI_ADMIN_SMOKE_URL=http://admin:3000 \
    --env CI_CRM_SMOKE_URL=http://crm:3001 --env CI_PMS_SMOKE_URL=http://pms:3002 \
    --env CI_DMS_SMOKE_URL=http://dms:3003 --env CI_SNS_SMOKE_URL=http://sns:3004 \
    --workdir "$APP_DIR" --entrypoint node "$node_image" scripts/ci/verify-platform-release.mjs \
    "$release_dir/release.json" "$release_dir/rehearsal-runtime.json"; then passed=1; break; fi
  sleep 4
done
[[ "$passed" == 1 ]] || { echo '[rehearse] isolated platform verification failed' >&2; exit 1; }
node_run scripts/ci/release-state.mjs state "$release_root" "$release_dir" rehearsal-runtime-passed
