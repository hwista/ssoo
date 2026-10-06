#!/usr/bin/env bash
# Invoked under the host-wide run-app-job lock. No host Node installation required.
set -euo pipefail
umask 077
job="${1:?job required}"
: "${APP_DIR:?}" "${CI_COMMIT_SHA:?}" "${CI_PIPELINE_ID:?}"
[[ "$CI_COMMIT_SHA" =~ ^[a-f0-9]{40}$ && "$CI_PIPELINE_ID" =~ ^[0-9]+$ ]] || exit 2
release_root="${CI_RELEASE_STATE_DIR:-${XDG_STATE_HOME:-$HOME/.local/state}/ssoo/releases}"
[[ "$release_root" == /* && "$release_root" != / && "$release_root" != *:* ]] || exit 2
release_dir="$release_root/$CI_PIPELINE_ID-$CI_COMMIT_SHA"
mkdir -p "$release_dir"
node_image="${CI_NODE_IMAGE:-node:22}"
project="${COMPOSE_PROJECT_NAME:-app}"
compose=(docker compose -p "$project" --project-directory "${CI_RELEASE_RUNTIME_DIR:?}" --env-file "${CI_RELEASE_ENV_FILE:?}" -f "$APP_DIR/compose.yaml" -f "$APP_DIR/compose.staging.yaml" -f "$release_dir/compose.env.json")
node_run() {
  docker run --rm -i --network none --user "$(id -u):$(id -g)" \
    --volume "$APP_DIR:$APP_DIR:ro" --volume "$release_root:$release_root" \
    --workdir "$APP_DIR" --entrypoint node "$node_image" "$@"
}
state() { node_run scripts/ci/release-state.mjs "$1" "$release_root" "$release_dir" "${@:2}"; }
deploy_started=false
finish() {
  local result=$?
  if [[ "$result" != 0 && "$deploy_started" == true ]]; then
    local status
    status="$(state status)" || status=unknown
    case "$status" in rolled-back|recovery-required) ;; *) state state recovery-required || true ;; esac
  fi
}
trap finish EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
capacity() {
  local root free required="${CI_BUILD_MIN_FREE_KB:-8388608}"
  [[ "$required" =~ ^[0-9]+$ ]] || return 1
  root="$(docker info --format '{{.DockerRootDir}}')"
  free="$(engine_free_kb "$root")"
  [[ "$free" =~ ^[0-9]+$ ]] || return 1
  if (( free < required )); then
    docker builder prune --force --keep-storage "${CI_BUILD_CACHE_KEEP_STORAGE:-8GB}"
    free="$(engine_free_kb "$root")"
  fi
  (( free >= required )) || { echo '[release] insufficient disk space; running/recovery images preserved' >&2; return 1; }
}
engine_free_kb() {
  if [[ -d "$1" ]]; then
    df -Pk "$1" | awk 'NR==2 {print $4}'
  else
    # Docker Desktop/remote engines keep their layer store outside the runner's
    # filesystem. Measure the engine's writable-layer filesystem in that case.
    docker run --rm --network none --entrypoint df "$node_image" -Pk / | awk 'NR==2 {print $4}'
  fi
}
assert_images() {
  state list > "$release_dir/image-list.tsv"
  while IFS=$'\t' read -r service image expected; do
    actual="$(docker image inspect "$image" --format '{{.Id}}')"
    [[ -z "$expected" || "$actual" == "$expected" ]] || { echo "[release] image changed: $service" >&2; return 1; }
  done < "$release_dir/image-list.tsv"
}
wait_core() {
  local attempt server_id
  for attempt in $(seq 1 30); do
    server_id="$("${runtime[@]}" ps -q server)" || return 1
    if [[ -n "$server_id" ]] && docker exec "$server_id" node -e "fetch('http://127.0.0.1:4000/api/health/core-readiness',{signal:AbortSignal.timeout(4000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; then return 0; fi
    sleep 4
  done
  return 1
}
verify_release() {
  local actual container_id service image expected
  local verify_compose=(docker compose -p "$project" -f "$release_dir/compose.runtime.json")
  local smoke_env=()
  for name in CI_SMOKE_HOST CI_SERVER_SMOKE_URL CI_ADMIN_SMOKE_URL CI_CRM_SMOKE_URL CI_PMS_SMOKE_URL CI_DMS_SMOKE_URL CI_SNS_SMOKE_URL; do
    [[ ! -v "$name" ]] || smoke_env+=(--env "$name=${!name}")
  done
  : "${CI_SMOKE_TOKEN_FILE:?Set a host file containing a dedicated smoke account token}"
  [[ -s "$CI_SMOKE_TOKEN_FILE" ]] || return 1
  docker run --rm --network "${CI_SMOKE_NETWORK:-host}" --user "$(id -u):$(id -g)" "${smoke_env[@]}" \
    --volume "$APP_DIR:$APP_DIR:ro" --volume "$release_root:$release_root" \
    --volume "$CI_SMOKE_TOKEN_FILE:/run/smoke-token:ro" --env CI_SMOKE_TOKEN_FILE=/run/smoke-token \
    --workdir "$APP_DIR" --entrypoint node "$node_image" \
    scripts/ci/verify-platform-release.mjs "$release_dir/release.json" "$release_dir/evidence.json" || return 1
  state list > "$release_dir/image-list.tsv" || return 1
  while IFS=$'\t' read -r service image expected; do
    [[ "$service" == db-init ]] && continue
    container_id="$("${verify_compose[@]}" ps -q "$service")" || return 1
    [[ -n "$container_id" ]] || return 1
    actual="$(docker inspect "$container_id" --format '{{.Image}}')" || return 1
    [[ "$actual" == "$expected" ]] || { echo "[release] deployed image mismatch: $service" >&2; return 1; }
  done < "$release_dir/image-list.tsv"
}
prepare() {
  docker image inspect "$node_image" >/dev/null 2>&1 || docker pull "$node_image"
    mapfile -t retention_refs < <(docker image ls 'app-*' --format '{{.Repository}}:{{.Tag}}' | grep -E '^app-[a-z-]+:[a-f0-9]{40}$' || true)
    if (( ${#retention_refs[@]} > 0 )); then
      docker image inspect "${retention_refs[@]}" > "$release_dir/retention-images.json"
      mapfile -t containers < <(docker ps -aq)
      if (( ${#containers[@]} > 0 )); then docker inspect "${containers[@]}" > "$release_dir/retention-containers.json"
      else printf '[]' > "$release_dir/retention-containers.json"; fi
      # Verify's checkout is not a deployment artifact and never authorizes deletions.
      state retired-images > "$release_dir/retired-images.txt"
      while IFS= read -r ref; do docker image rm "$ref"; done < "$release_dir/retired-images.txt"
    fi
    capacity
}
state env-overlay "$CI_RELEASE_ENV_FILE" "${CI_RELEASE_DMS_ENV_FILE:?}" "$APP_DIR"
case "$job" in
  prepare) prepare ;;
  plan)
    prepare
    [[ ! -e "$release_dir/plan.json" ]] || { echo '[release] plan exists; use a new pipeline to change it' >&2; exit 1; }
    "${compose[@]}" config --format json > "$release_dir/config.json"
    mkdir -p "$release_dir/secrets"
    state secrets > "$release_dir/secret-list.tsv"
    while IFS=$'\t' read -r name file; do
      cp "$file" "$release_dir/secrets/$name"
      chmod 600 "$release_dir/secrets/$name"
    done < "$release_dir/secret-list.tsv"
    git ls-files -z > "$release_dir/tracked-files"
    docker image inspect "$node_image" > "$release_dir/base-images.json"
    state plan "$APP_DIR" "$CI_COMMIT_SHA" "$CI_PIPELINE_ID" "${CI_INCREMENTAL_BUILD:-false}"
    state state prepared
    ;;
  build)
    [[ -f "$release_dir/plan.json" ]] || exit 1
    "${compose[@]}" config --format json > "$release_dir/current-config.json"
    cmp -s "$release_dir/config.json" "$release_dir/current-config.json" || { echo '[release] configuration changed since planning' >&2; exit 1; }
    state secrets > "$release_dir/secret-list.tsv"
    while IFS=$'\t' read -r name file; do
      cmp -s "$file" "$release_dir/secrets/$name" || { echo '[release] secret changed since planning' >&2; exit 1; }
    done < "$release_dir/secret-list.tsv"
    "${compose[@]}" build --print > "$release_dir/bake.json"
    base_ref="$(state base-ref)"
    bake_allow_args=()
    while IFS=$'\t' read -r name file; do bake_allow_args+=("--allow=fs.read=$file"); done < "$release_dir/secret-list.tsv"
    state list build > "$release_dir/build-list.tsv"
    while IFS=$'\t' read -r service image expected; do
      capacity
      if docker image inspect "$image" >/dev/null 2>&1; then
        echo "[release] immutable build tag already exists: $image; use a new pipeline" >&2; exit 1
      fi
      docker buildx bake "${bake_allow_args[@]}" --file "$release_dir/bake.json" \
        --set "$service.tags=$image" --set "$service.args.SSOO_RELEASE_SHA=$CI_COMMIT_SHA" \
        --set "$service.args.SSOO_NODE_IMAGE=$base_ref" --load "$service"
    done < "$release_dir/build-list.tsv"
    assert_images
    mapfile -t refs < <(cut -f2 "$release_dir/image-list.tsv")
    docker image inspect "${refs[@]}" > "$release_dir/images.json"
    state seal
    state state built
    ;;
  rehearse)
    assert_images
    bash scripts/ci/rehearse-release.sh "$release_dir" "$release_root" "$node_image"
    state proof
    state state rehearsed
    ;;
  deploy)
    # Validate all inputs BEFORE selecting images or touching the running stack.
    case "${CI_DEPLOY_MODE:-plan-only}" in
      plan-only) echo "[release] plan-only: $release_dir (no runtime changes)"; exit 1 ;;
      apply) ;;
      *) echo '[release] invalid CI_DEPLOY_MODE' >&2; exit 2 ;;
    esac
    : "${CI_SMOKE_TOKEN_FILE:?required before deployment}"
    [[ -s "$CI_SMOKE_TOKEN_FILE" ]] || exit 1
    "${compose[@]}" config --format json > "$release_dir/current-config.json"
    state check
    state secrets > "$release_dir/secret-list.tsv"
    while IFS=$'\t' read -r name file; do
      cmp -s "$file" "$release_dir/secrets/$name" || { echo '[release] secret changed since build' >&2; exit 1; }
    done < "$release_dir/secret-list.tsv"
    assert_images
    capacity
    # A verified, consistent DB+files backup is an explicit prerequisite. Do not
    # manufacture restoration evidence from an untested pg_dump or a boolean flag.
    : "${CI_RELEASE_BACKUP_EVIDENCE:?Path to verified backup JSON for this release}"
    cp "$CI_RELEASE_BACKUP_EVIDENCE" "$release_dir/backup-evidence.json"
    state backup-check
    previous_dir="$(state previous)"
    state state backed-up
    runtime=(docker compose -p "$project" -f "$release_dir/compose.runtime.json")
    "${runtime[@]}" run --rm --no-deps --entrypoint node server -e "import('/app/apps/server/dist/config/config.validation.js').then(m=>{if(m.configValidationSchema.validate(process.env,{allowUnknown:true}).error)process.exit(1)}).catch(()=>process.exit(1))"
    db_changed="$(state db-changed)"
    state begin-deploy
    deploy_started=true
    if [[ "$db_changed" == true ]]; then
      # Until old-app/new-schema compatibility is proved, use a maintenance
      # window: no old process may write while migrations change its contract.
      "${runtime[@]}" stop server admin crm pms dms sns
      state state db-applying
      if ! "${runtime[@]}" --profile operations run --rm --no-deps db-init; then
        state state recovery-required
        bash scripts/ci/diagnose-runtime.sh || true
        echo '[release] DB application failed; no application replacement or old db-init replay' >&2
        exit 1
      fi
    fi
    if ! "${runtime[@]}" --profile operations run --rm --no-deps --entrypoint pnpm db-init --filter @ssoo/database db:runtime:verify; then
      state state recovery-required
      exit 1
    fi
    state state db-applied
    state changed > "$release_dir/changed-services.txt"
    mapfile -t changed < "$release_dir/changed-services.txt"
    if [[ "$db_changed" == true ]]; then changed=(server admin crm pms dms sns); fi
    failed=0
    if printf '%s\n' "${changed[@]}" | grep -qx server; then
      "${runtime[@]}" up -d --no-build --no-deps server || failed=1
    fi
    if [[ "$failed" == 0 ]]; then wait_core || failed=1; fi
    if [[ "$failed" == 0 ]]; then
      state state core-ready
      for service in "${changed[@]}"; do
        [[ "$service" == server ]] && continue
        "${runtime[@]}" up -d --no-build --no-deps "$service" || { failed=1; break; }
      done
    fi
    if [[ "$failed" == 0 ]]; then
      state state apps-ready
      # Bounded retries allow new web listeners to finish starting.
      verified=0
      for attempt in $(seq 1 12); do
        if verify_release; then verified=1; break; fi
        sleep 5
      done
      [[ "$verified" == 1 ]] || failed=1
    fi
    if [[ "$failed" == 1 ]]; then
      bash scripts/ci/diagnose-runtime.sh || true
      # Auto-rollback is initially limited to unchanged DB contracts. Broader
      # compatibility requires recorded old-app tests against the migrated clone.
      if [[ "$db_changed" == false && -n "$previous_dir" && -s "$previous_dir/compose.runtime.json" ]]; then
        if docker compose -p "$project" -f "$previous_dir/compose.runtime.json" up -d --no-build --no-deps server admin crm pms dms sns && wait_core; then
          state state rollback-pending-verification
          failed_dir="$release_dir"; release_dir="$previous_dir"
          if verify_release; then release_dir="$failed_dir"; state state rolled-back
          else release_dir="$failed_dir"; state state recovery-required; fi
        else state state recovery-required; fi
      else
        state state recovery-required
        echo '[release] automatic rollback forbidden: DB compatibility is unknown or changed' >&2
      fi
      exit 1
    fi
    state state verified
    state commit
    state state committed
    echo "[release] deployed $CI_PIPELINE_ID-$CI_COMMIT_SHA"
    ;;
  *) echo "unknown release stage: $job" >&2; exit 2 ;;
esac
