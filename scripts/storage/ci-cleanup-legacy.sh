#!/usr/bin/env bash
# Explicit one-time retirement of the 13 legacy image identities audited in job 532.
set -euo pipefail
umask 077
repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
release_root="${CI_RELEASE_STATE_DIR:-${XDG_STATE_HOME:-$HOME/.local/state}/ssoo/releases}"
[[ "$release_root" == /* && "$release_root" != / && "$release_root" != *:* && -d "$release_root" ]] || exit 2
source "$repo/scripts/storage/windows-gate.sh"
storage_windows_gate
exec 9>"${CI_APP_LOCK_FILE:-/tmp/ssoo-app-runtime.lock}"
flock -w 60 9 || { echo '[storage-cleanup] host lock timeout' >&2; exit 1; }
storage_windows_gate
report="$release_root/maintenance/legacy-${CI_JOB_ID:?}"
mkdir -p "$report"
docker system df > "$report/storage-before.txt"
df -Pk / "$release_root" > "$report/filesystem-before.txt"
cat "$report/filesystem-before.txt"
mapfile -t images < <(docker image ls --no-trunc -q | sort -u)
(( ${#images[@]} > 0 )) || exit 1
docker image inspect "${images[@]}" > "$report/images.json"
mapfile -t containers < <(docker ps -aq)
(( ${#containers[@]} > 0 )) || { echo '[storage-cleanup] no containers; refusing unexpected host state' >&2; exit 1; }
docker inspect "${containers[@]}" > "$report/containers.json"
planner() {
  docker run --rm --pull never --network none --read-only --user "$(id -u):$(id -g)" \
    --volume "$repo:$repo:ro" --volume "$release_root:$release_root:ro" \
    --entrypoint node node:22 "$repo/scripts/storage/legacy-image-retirement.mjs" "$@"
}
planner --containers "$report/containers.json" > "$report/containers-before.txt"
planner "$release_root" "$report" > "$report/plan.tsv"
cat "$report/plan.tsv"
while IFS=$'\t' read -r ref expected; do
  actual="$(docker image inspect "$ref" --format '{{.Id}}')"
  [[ "$actual" == "$expected" ]] || { echo '[storage-cleanup] image identity changed' >&2; exit 1; }
  referenced="$(docker ps -aq --filter "ancestor=$expected")"
  [[ -z "$referenced" ]] || { echo "[storage-cleanup] container protects $ref" >&2; exit 1; }
  docker image rm "$ref" # No force, prune, container removal or volume deletion.
done < "$report/plan.tsv"
mapfile -t after_containers < <(docker ps -aq)
docker inspect "${after_containers[@]}" > "$report/containers-after.json"
planner --containers "$report/containers-after.json" > "$report/containers-after.txt"
cmp "$report/containers-before.txt" "$report/containers-after.txt"
docker system df > "$report/storage-after.txt"
df -Pk / "$release_root" > "$report/filesystem-after.txt"
cat "$report/filesystem-after.txt" "$report/storage-after.txt"
echo '[storage-cleanup] completed; container identities, images, start times and health unchanged'
