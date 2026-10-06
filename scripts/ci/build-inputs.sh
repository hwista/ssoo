#!/usr/bin/env bash
# Prints the build input fingerprint of one Compose service.
# The build job reuses an existing commit image only when its com.ssoo.ci.input-hash
# label equals this value, so every path that can change the image belongs here.
# When in doubt, list the path: an extra entry only costs a rebuild.
set -euo pipefail

usage="usage: $0 <service> <resolved-compose-config-file>"
service="${1:?$usage}"
compose_config_file="${2:?$usage}"
fingerprint_version=1

# Every Dockerfile installs the whole workspace from these files.
shared_paths=(
  package.json
  pnpm-lock.yaml
  pnpm-workspace.yaml
  turbo.json
  tsconfig.base.json
  .npmrc
  .dockerignore
  docker/node-tls-ca-entrypoint.sh
  ':(glob)apps/**/package.json'
  ':(glob)packages/**/package.json'
)
web_package_paths=(packages/types packages/web-auth packages/web-shell packages/web-ui)

case "$service" in
  server)
    # The server build context also carries apps/web/dms/.env.local, which the server loads.
    service_paths=(apps/server packages/database packages/types apps/web/dms/.env.local)
    ;;
  db-init)
    service_paths=(
      docker/db-init.Dockerfile
      packages/database
      packages/types
      scripts/db-init-entrypoint.sh
      scripts/verify-dms-backup-restore.mjs
    )
    ;;
  admin|crm|dms|pms|sns)
    service_paths=("apps/web/$service" "${web_package_paths[@]}")
    ;;
  *)
    echo "[ci-build-inputs] unknown service: $service" >&2
    exit 1
    ;;
esac

if [[ ! -f "$compose_config_file" ]]; then
  echo "[ci-build-inputs] resolved compose config is missing: $compose_config_file" >&2
  exit 1
fi

cd "$(git rev-parse --show-toplevel)"
input_paths=("${shared_paths[@]}" "${service_paths[@]}")

# Build args, Dockerfile, context and secret wiring as resolved by `docker compose config`.
compose_build="$(awk -v service="$service" '
  /^[^ ]/ { in_services = ($0 == "services:"); in_service = 0; next }
  in_services && /^  [^ ]/ { in_service = ($0 == "  " service ":"); in_build = 0; next }
  in_service && /^    [^ ]/ { in_build = ($0 == "    build:"); next }
  in_service && in_build { print }
' "$compose_config_file")"
if [[ -z "$compose_build" ]]; then
  echo "[ci-build-inputs] compose build section is missing for service: $service" >&2
  exit 1
fi

{
  printf 'fingerprint=%s service=%s\n' "$fingerprint_version" "$service"
  printf '%s\n' "$compose_build"
  # Tracked files: prepare-app-source.sh guarantees the worktree equals CI_COMMIT_SHA.
  git ls-files --stage -- "${input_paths[@]}"
  # Ignored files still enter the Docker build context unless .dockerignore drops them.
  # Only generated build output (also excluded by .dockerignore) is skipped here.
  while IFS= read -r -d '' file; do
    printf 'untracked %s %s\n' "$(sha256sum < "$file" | cut -d ' ' -f 1)" "$file"
  done < <(git ls-files -z --others \
    -x node_modules -x .next -x dist -x .turbo -x coverage -x .pnpm-store -x '*.tsbuildinfo' \
    -- "${input_paths[@]}")
} | sha256sum | cut -d ' ' -f 1
