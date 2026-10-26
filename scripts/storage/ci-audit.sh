#!/usr/bin/env bash
# Run as the GitLab runner account on lsiddms01. Read-only storage inventory.
# Does not prune, pull, stop containers, remove files or print environment values.
set -euo pipefail
umask 077
release_root="${CI_RELEASE_STATE_DIR:-${XDG_STATE_HOME:-$HOME/.local/state}/ssoo/releases}"
[[ "$release_root" == /* && "$release_root" != / && "$release_root" != *:* && -d "$release_root" ]] || {
  echo 'Set CI_RELEASE_STATE_DIR to the runner release directory.' >&2; exit 2;
}
exec 9>"${CI_APP_LOCK_FILE:-/tmp/ssoo-app-runtime.lock}"
flock -w 60 9 || { echo 'A build/deploy owns the lock; retry after it finishes.' >&2; exit 1; }
echo '[storage-audit] filesystem capacity'
df -Pk / "$release_root"
echo '[storage-audit] Docker totals (shared layers can distort reclaimable totals)'
docker system df
echo '[storage-audit] image identities and sizes; no environment/config values'
docker image ls --no-trunc --format '{{.ID}}\t{{.Repository}}:{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}'
echo '[storage-audit] ALL container image references, including stopped containers'
mapfile -t containers < <(docker ps -aq)
if (( ${#containers[@]} )); then
  docker inspect --format '{{.Name}}\t{{.Image}}\t{{.State.Status}}' "${containers[@]}"
fi
echo '[storage-audit] release/source disk usage in KiB'
du -xsk "$release_root"
if [[ -d "$release_root/sources" ]]; then du -xsk "$release_root/sources"; fi
echo '[storage-audit] release protection metadata; no secrets or backup contents'
docker run --rm -i --pull never --network none --read-only --user "$(id -u):$(id -g)" \
  --volume "$release_root:$release_root:ro" --entrypoint node node:22 - "$release_root" <<'NODE'
const fs = require('node:fs'), path = require('node:path');
const root = process.argv[2];
function read(file) { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null; }
const current = read(path.join(root, 'last-successful.json'));
console.log(JSON.stringify({ lastSuccessfulRelease: current?.releaseId ?? null }));
for (const id of fs.readdirSync(root).filter(name => /^\d+-[a-f0-9]{40}$/.test(name)).sort()) {
  const base = path.join(root, id), state = read(path.join(base, 'state.json'));
  const manifest = read(path.join(base, 'release.json'));
  const decision = read(path.join(base, 'retention-decision.json'));
  console.log(JSON.stringify({
    releaseId: id, status: state?.status ?? 'unknown', checkedAt: state?.checkedAt ?? null,
    current: id === current?.releaseId,
    deployAttempted: fs.existsSync(path.join(base, 'deploy-attempt.json')),
    pinned: fs.existsSync(path.join(base, 'retain-images')),
    retired: fs.existsSync(path.join(base, 'retired.json')),
    images: Object.fromEntries(Object.entries(manifest?.services ?? {}).map(([name, item]) =>
      [name, { imageRef: item.imageRef, imageId: item.imageId }])),
    retention: decision && { checkedAt: decision.checkedAt, protectedIds: decision.protectedIds, retiredIds: decision.retiredIds },
  }));
}
NODE
echo '[storage-audit] finished; no cleanup performed'
