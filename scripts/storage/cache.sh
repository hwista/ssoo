#!/usr/bin/env bash
# Source under the same host lock as build/deploy. Volumes and containers are never pruned.
storage_cache_cleanup() {
  local policy_file="$(dirname "${BASH_SOURCE[0]}")/policy.json" unused keep
  unused="$(sed -n 's/.*"cacheUnusedHours": *\([0-9]*\).*/\1/p' "$policy_file")"
  keep="$(sed -n 's/.*"cacheKeepStorage": *"\([^"]*\)".*/\1/p' "$policy_file")"
  unused="${SSOO_CACHE_UNUSED_HOURS:-$unused}"
  keep="${CI_BUILD_CACHE_KEEP_STORAGE:-${SSOO_CACHE_KEEP_STORAGE:-$keep}}"
  [[ "$unused" =~ ^[0-9]+$ && "$keep" =~ ^[0-9]+(GB|MB|GiB|MiB)$ ]] || { echo '[storage] invalid cache policy' >&2; return 1; }
  docker builder prune --force --filter "until=${unused}h" --keep-storage "$keep"
}
