#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
pipeline="$repo_root/.gitlab-ci.yml"
source_sync="$repo_root/scripts/ci/prepare-app-source.sh"
image_provenance="$repo_root/scripts/ci/image-provenance.sh"
job_runner="$repo_root/scripts/ci/run-app-job.sh"
ci_verify_dockerfile="$repo_root/docker/ci-verify.Dockerfile"
compose_file="$repo_root/compose.yaml"
gitignore="$repo_root/.gitignore"
dockerignore="$repo_root/.dockerignore"
test_root="$(mktemp -d)"

cleanup() {
  rm -rf "$test_root"
}
trap cleanup EXIT

fail() {
  echo "[gitlab-pipeline-test] $1" >&2
  exit 1
}

assert_contains() {
  local file="$1"
  local expected="$2"
  grep -Fq -- "$expected" "$file" || fail "missing '$expected' in $file"
}

assert_not_contains() {
  local file="$1"
  local unexpected="$2"
  if grep -Fq -- "$unexpected" "$file"; then
    fail "unexpected '$unexpected' in $file"
  fi
}

assert_count() {
  local file="$1"
  local expected="$2"
  local count="$3"
  local actual
  actual="$(grep -Fc -- "$expected" "$file")"
  [[ "$actual" == "$count" ]] || fail "expected $count occurrences of '$expected' in $file, found $actual"
}

bash -n "$source_sync"
bash -n "$image_provenance"
bash -n "$job_runner"

assert_count "$pipeline" 'bash "$CI_PROJECT_DIR/scripts/ci/run-app-job.sh"' 4
assert_contains "$pipeline" 'bash "$CI_PROJECT_DIR/scripts/ci/run-app-job.sh" verify'
assert_contains "$pipeline" 'bash "$CI_PROJECT_DIR/scripts/ci/run-app-job.sh" ai-review'
assert_contains "$pipeline" 'bash "$CI_PROJECT_DIR/scripts/ci/run-app-job.sh" build'
assert_contains "$pipeline" 'bash "$CI_PROJECT_DIR/scripts/ci/run-app-job.sh" deploy'
assert_contains "$pipeline" 'when: manual'
assert_contains "$pipeline" 'allow_failure: false'
assert_contains "$pipeline" 'ADMIN_PORT: "3000"'
assert_contains "$pipeline" 'CRM_PORT: "3001"'
assert_contains "$pipeline" 'PMS_PORT: "3002"'
assert_contains "$pipeline" 'DMS_PORT: "3003"'
assert_contains "$pipeline" 'SNS_PORT: "3004"'
assert_contains "$pipeline" 'AUTH_DEFAULT_LOGIN_URL: "http://10.125.12.170:3000/login"'
assert_contains "$pipeline" 'url: http://10.125.12.170:3003'

if grep -Fq 'resource_group:' "$pipeline"; then
  fail "pipeline uses resource_group, which is unsupported by the current GitLab version"
fi

assert_contains "$job_runner" 'flock -w "$lock_timeout" 9'
assert_contains "$job_runner" 'docker/ci-verify.Dockerfile'
assert_contains "$job_runner" '--volume "$APP_DIR/.git:/app/.git:ro"'
assert_contains "$job_runner" 'pnpm run verify:gitlab-pipeline'
assert_contains "$job_runner" 'pnpm run codex:preflight'
assert_contains "$job_runner" 'pnpm lint'
assert_contains "$job_runner" 'pnpm test:server'
assert_contains "$job_runner" 'docker builder prune --all --force --keep-storage "$build_cache_keep_storage"'
assert_contains "$job_runner" 'docker image prune --force'
assert_contains "$job_runner" 'Docker capacity pressure detected; pruning all unused BuildKit cache'
assert_contains "$job_runner" 'insufficient Docker filesystem capacity after safe cache cleanup'
assert_contains "$job_runner" 'build_services=(server db-init pms dms sns admin crm)'
assert_contains "$job_runner" 'prune_unreferenced_app_latest'
assert_contains "$job_runner" 'if [[ "$job" == "verify" || "$job" == "build" ]]; then'
assert_contains "$job_runner" 'docker compose -p "$COMPOSE_PROJECT_NAME" build --print > "$bake_definition"'
assert_contains "$job_runner" 'docker buildx bake --file "$bake_definition" --load "$service"'
assert_contains "$job_runner" 'prepare_build_capacity "build-$service" "$build_target_min_free_kb" full'
assert_contains "$job_runner" 'bash scripts/ci/image-provenance.sh tag-build'
assert_contains "$job_runner" 'bash scripts/ci/image-provenance.sh backup-running "$backup_tag" "$backup_manifest"'
assert_contains "$job_runner" 'bash scripts/ci/image-provenance.sh prepare-deploy'
assert_contains "$job_runner" 'bash scripts/ci/image-provenance.sh restore-backup "$backup_manifest"'
assert_contains "$job_runner" 'bash scripts/ci/image-provenance.sh verify-deploy'
assert_contains "$job_runner" 'bash scripts/ci/image-provenance.sh verify-backup "$backup_manifest"'
assert_contains "$job_runner" 'docker compose -p "$COMPOSE_PROJECT_NAME" up -d --no-build'
assert_contains "$job_runner" 'deployment failed but automatic rollback succeeded'
assert_contains "$job_runner" 'manual recovery required'
assert_contains "$image_provenance" 'docker commit "$container" "$backup_image"'
assert_contains "$image_provenance" 'docker export "$container" | docker import'
assert_contains "$image_provenance" 'container commit unavailable; trying filesystem export'
assert_contains "$image_provenance" 'backup complete tag=$backup_tag manifest=$manifest'
assert_contains "$gitignore" '.env.*'
assert_contains "$gitignore" 'compose.yaml.bak*'
assert_contains "$dockerignore" '.env.*'
assert_contains "$dockerignore" 'compose.yaml.bak*'
assert_contains "$ci_verify_dockerfile" 'FROM node:22'
assert_contains "$ci_verify_dockerfile" 'corepack prepare pnpm@11.13.1 --activate'
assert_contains "$ci_verify_dockerfile" 'pnpm install --frozen-lockfile'
assert_contains "$ci_verify_dockerfile" 'pnpm --filter @ssoo/database db:generate'
assert_contains "$compose_file" 'name: ${COMPOSE_PROJECT_NAME:-ssoo}'
assert_contains "$compose_file" '${ADMIN_PORT:-3000}:${ADMIN_PORT:-3000}'
assert_contains "$compose_file" '${CRM_PORT:-3001}:${CRM_PORT:-3001}'
assert_contains "$compose_file" '${PMS_PORT:-3002}:${PMS_PORT:-3002}'
assert_contains "$compose_file" '${DMS_PORT:-3003}:${DMS_PORT:-3003}'
assert_contains "$compose_file" '${SNS_PORT:-3004}:${SNS_PORT:-3004}'
assert_contains "$compose_file" 'name: ${POSTGRES_DATA_VOLUME:-ssoo_ssoo-postgres-data}'

if grep -Fxq '.gitignore' "$dockerignore"; then
  fail "CI verify image excludes the tracked Git ignore contract"
fi

if grep -Fq 'git reset --hard "origin/$CI_COMMIT_REF_NAME"' "$pipeline"; then
  fail "pipeline still resets to an unfetched mutable remote ref"
fi

remote="$test_root/remote.git"
seed="$test_root/seed"
app="$test_root/app"

git init --bare --initial-branch=development "$remote" >/dev/null
git init -b development "$seed" >/dev/null
git -C "$seed" config user.name "CI Contract Test"
git -C "$seed" config user.email "ci-contract@example.invalid"
cp "$gitignore" "$seed/.gitignore"
mkdir -p "$seed/scripts/ci"
cp "$image_provenance" "$seed/scripts/ci/image-provenance.sh"
printf 'first\n' > "$seed/version.txt"
git -C "$seed" add .gitignore scripts/ci/image-provenance.sh version.txt
git -C "$seed" commit -m "first" >/dev/null
git -C "$seed" remote add origin "$remote"
git -C "$seed" push -u origin development >/dev/null
first_sha="$(git -C "$seed" rev-parse HEAD)"

git clone --branch development "$remote" "$app" >/dev/null 2>&1
printf 'second\n' > "$seed/version.txt"
git -C "$seed" commit -am "second" >/dev/null
git -C "$seed" push origin development >/dev/null
second_sha="$(git -C "$seed" rev-parse HEAD)"
git -C "$app" reset --hard "$first_sha" >/dev/null

APP_DIR="$app" CI_COMMIT_REF_NAME=development CI_COMMIT_SHA="$second_sha" \
  bash "$source_sync" >/dev/null

[[ "$(git -C "$app" rev-parse HEAD)" == "$second_sha" ]] || fail "source sync did not select CI_COMMIT_SHA"
[[ "$(<"$app/version.txt")" == "second" ]] || fail "source sync left stale file content"

printf 'operator backup\n' > "$app/.env.bak.contract"
printf 'operator backup\n' > "$app/compose.yaml.bak.contract"
APP_DIR="$app" CI_COMMIT_REF_NAME=development CI_COMMIT_SHA="$second_sha" \
  bash "$source_sync" >/dev/null

printf 'unexpected\n' > "$app/untracked.txt"
if APP_DIR="$app" CI_COMMIT_REF_NAME=development CI_COMMIT_SHA="$second_sha" \
  bash "$source_sync" >/dev/null 2>&1; then
  fail "source sync accepted an unexpected non-ignored file"
fi
rm -f "$app/untracked.txt"

if APP_DIR="$app" CI_COMMIT_REF_NAME=development CI_COMMIT_SHA=invalid \
  bash "$source_sync" >/dev/null 2>&1; then
  fail "source sync accepted an invalid commit SHA"
fi

fake_bin="$test_root/bin"
fake_state="$test_root/docker-state"
mkdir -p "$fake_bin"

cat > "$fake_bin/docker" <<'FAKE_DOCKER'
#!/usr/bin/env bash
set -euo pipefail

state="${FAKE_DOCKER_STATE:?}"

lookup_key() {
  awk -F '|' -v key="$1" '$1 == key { value = $2 } END { if (value == "") exit 1; print value }' "$state"
}

resolve_image() {
  if [[ "$1" == sha256:* ]]; then
    lookup_key "image:$1"
  else
    lookup_key "$1"
  fi
}

set_value() {
  local key="$1"
  local value="$2"
  local next="${state}.next"
  awk -F '|' -v key="$key" '$1 != key' "$state" > "$next"
  printf '%s|%s\n' "$key" "$value" >> "$next"
  mv "$next" "$state"
}

print_fake_config() {
  if [[ -n "${FAKE_DOCKER_CONFIG_MISMATCH_IMAGE:-}" && "$*" == *"image inspect $FAKE_DOCKER_CONFIG_MISMATCH_IMAGE "* && "$*" == *'{{json .Config.Cmd}}'* ]]; then
    printf '["node","wrong.js"]\n'
    return 0
  fi

  case "$*" in
    *'{{json .Config.Cmd}}'*) printf '["node","server.js"]\n' ;;
    *'{{json .Config.Entrypoint}}'*) printf 'null\n' ;;
    *'{{json .Config.WorkingDir}}'*) printf '"/app/apps/web/crm"\n' ;;
    *'{{.Config.WorkingDir}}'*) printf '/app/apps/web/crm\n' ;;
    *'{{json .Config.User}}'*) printf '"nextjs"\n' ;;
    *'{{.Config.User}}'*) printf 'nextjs\n' ;;
    *'{{range .Config.Env}}'*) printf 'NODE_ENV=production\nPORT=3004\n' ;;
    *'{{json .Config.Env}}'*) printf '["NODE_ENV=production","PORT=3004"]\n' ;;
    *'{{range $port, $_ := .Config.ExposedPorts}}'*) printf '3004/tcp\n' ;;
    *'{{json .Config.ExposedPorts}}'*) printf '{"3004/tcp":{}}\n' ;;
    *'{{json .Config.StopSignal}}'*) printf '""\n' ;;
    *'{{.Config.StopSignal}}'*) printf '\n' ;;
    *) return 1 ;;
  esac
}

case "${1:-}" in
  builder)
    [[ "${2:-}" == "prune" ]] || exit 2
    prune_count="$(lookup_key builder:prune-count 2>/dev/null || printf '0\n')"
    set_value builder:prune-count "$((prune_count + 1))"
    ;;
  image)
    case "${2:-}" in
      inspect)
        if [[ "$*" == *'{{.Created}}'* ]]; then
          image="$(resolve_image "$3")"
          created="$(lookup_key "created:$image" 2>/dev/null || printf '2026-01-01T00:00:00Z\n')"
          printf '%s|%s\n' "$created" "$image"
        elif ! print_fake_config "$@"; then
          resolve_image "$3"
        fi
        ;;
      ls)
        awk -F '|' '$1 ~ /^(app-[a-z-]+|pgvector\/pgvector):/ { split_at = index($1, ":"); print substr($1, 1, split_at - 1) "|" substr($1, split_at + 1) }' "$state"
        ;;
      prune)
        prune_count="$(lookup_key image:prune-count 2>/dev/null || printf '0\n')"
        set_value image:prune-count "$((prune_count + 1))"
        ;;
      rm)
        rm_count="$(lookup_key image:rm-count 2>/dev/null || printf '0\n')"
        set_value image:rm-count "$((rm_count + 1))"
        set_value "removed:$3" 1
        exit 0
        ;;
      *) exit 2 ;;
    esac
    ;;
  info)
    printf '%s\n' "${FAKE_DOCKER_ROOT:?}"
    ;;
  ps)
    awk -F '|' '$1 ~ /^container:/ { print substr($1, length("container:") + 1) }' "$state"
    ;;
  system)
    [[ "${2:-}" == "df" ]] || exit 2
    ;;
  tag)
    source_id="$(resolve_image "$2")"
    set_value "$3" "$source_id"
    ;;
  commit)
    container="$2"
    target="$3"
    if [[ "${FAKE_DOCKER_FAIL_COMMIT_CONTAINER:-}" == "$container" ]]; then
      exit 1
    fi
    lookup_key "container:$container" >/dev/null
    snapshot_id="sha256:${container#ssoo-}-snapshot"
    set_value "image:$snapshot_id" "$snapshot_id"
    set_value "$target" "$snapshot_id"
    printf '%s\n' "$snapshot_id"
    ;;
  export)
    container="$2"
    if [[ "${FAKE_DOCKER_FAIL_EXPORT_CONTAINER:-}" == "$container" ]]; then
      exit 1
    fi
    lookup_key "container:$container" >/dev/null
    printf 'fake filesystem for %s\n' "$container"
    ;;
  import)
    target="${@: -1}"
    if [[ "${FAKE_DOCKER_FAIL_IMPORT_IMAGE:-}" == "$target" ]]; then
      exit 1
    fi
    while IFS= read -r _; do :; done
    service="${target#app-}"
    service="${service%%:*}"
    snapshot_id="sha256:$service-export"
    set_value "image:$snapshot_id" "$snapshot_id"
    set_value "$target" "$snapshot_id"
    printf '%s\n' "$snapshot_id"
    ;;
  inspect)
    container="$2"
    if [[ "$*" == *"State.Health.Status"* ]]; then
      lookup_key "health:$container"
    elif ! print_fake_config "$@"; then
      lookup_key "container:$container"
    else
      :
    fi
    ;;
  compose)
    operation=""
    for argument in "$@"; do
      case "$argument" in
        build|up|ps) operation="$argument" ;;
      esac
    done
    case "$operation" in
      ps)
        exit 0
        ;;
      up)
        up_count="$(lookup_key compose:up-count 2>/dev/null || printf '0\n')"
        up_count=$((up_count + 1))
        set_value compose:up-count "$up_count"
        if [[ "${FAKE_DOCKER_FAIL_COMPOSE_UP_NUMBER:-}" == "$up_count" ]]; then
          exit 1
        fi
        for service in server pms dms sns admin crm db-init; do
          latest_id="$(resolve_image "app-$service:latest")"
          set_value "container:ssoo-$service" "$latest_id"
        done
        for service in postgres server pms dms sns admin crm; do
          set_value "health:ssoo-$service" healthy
        done
        if [[ "${FAKE_DOCKER_FAIL_FIRST_DEPLOY_HEALTH:-}" == "1" && "$up_count" == "1" ]]; then
          set_value health:ssoo-dms unhealthy
        fi
        ;;
      build)
        [[ "$*" == *"--print"* ]] || exit 2
        print_count="$(lookup_key compose:build-print-count 2>/dev/null || printf '0\n')"
        set_value compose:build-print-count "$((print_count + 1))"
        printf '{"group":{"default":{"targets":[]}},"target":{}}\n'
        ;;
      *)
        exit 2
        ;;
    esac
    ;;
  buildx)
    [[ "${2:-}" == "bake" ]] || exit 2
    build_count="$(lookup_key buildx:bake-count 2>/dev/null || printf '0\n')"
    set_value buildx:bake-count "$((build_count + 1))"
    service="${@: -1}"
    build_sequence="$(lookup_key buildx:bake-sequence 2>/dev/null || true)"
    if [[ -n "$build_sequence" ]]; then
      build_sequence="$build_sequence,$service"
    else
      build_sequence="$service"
    fi
    set_value buildx:bake-sequence "$build_sequence"
    if [[ "${FAKE_DOCKER_FAIL_BUILD_SERVICE:-}" == "$service" ]]; then
      exit 1
    fi
    ;;
  *)
    exit 2
    ;;
esac
FAKE_DOCKER
chmod +x "$fake_bin/docker"

services=(server pms dms sns admin crm db-init)
health_services=(postgres server pms dms sns admin crm)

reset_fake_state() {
  : > "$fake_state"
  local service built_id running_id
  for service in "${services[@]}"; do
    built_id="sha256:$service-built"
    running_id="sha256:$service-running"
    printf 'image:%s|%s\n' "$built_id" "$built_id" >> "$fake_state"
    printf 'image:%s|%s\n' "$running_id" "$running_id" >> "$fake_state"
    printf 'app-%s:latest|%s\n' "$service" "$built_id" >> "$fake_state"
    printf 'app-%s:%s|%s\n' "$service" "$second_sha" "$built_id" >> "$fake_state"
    printf 'container:ssoo-%s|%s\n' "$service" "$running_id" >> "$fake_state"
  done
  for service in "${health_services[@]}"; do
    printf 'health:ssoo-%s|healthy\n' "$service" >> "$fake_state"
  done
  printf 'compose:up-count|0\n' >> "$fake_state"
  printf 'compose:build-print-count|0\n' >> "$fake_state"
  printf 'buildx:bake-count|0\n' >> "$fake_state"
  printf 'builder:prune-count|0\n' >> "$fake_state"
  printf 'image:prune-count|0\n' >> "$fake_state"
  printf 'image:rm-count|0\n' >> "$fake_state"
}

set_state() {
  local key="$1"
  local value="$2"
  local next="${fake_state}.next"
  awk -F '|' -v key="$key" '$1 != key' "$fake_state" > "$next"
  printf '%s|%s\n' "$key" "$value" >> "$next"
  mv "$next" "$fake_state"
}

remove_state() {
  local key="$1"
  local next="${fake_state}.next"
  awk -F '|' -v key="$key" '$1 != key' "$fake_state" > "$next"
  mv "$next" "$fake_state"
}

run_build_contract() {
  local scenario="$1"
  local minimum_free_kb="$2"
  local output="$test_root/$scenario.log"

  CI_PROJECT_DIR="$repo_root" \
    APP_DIR="$app" \
    CI_COMMIT_REF_NAME=development \
    CI_COMMIT_SHA="$second_sha" \
    CI_COMMIT_SHORT_SHA="${second_sha:0:8}" \
    CI_APP_LOCK_FILE="$test_root/$scenario.lock" \
    CI_BACKUP_MANIFEST_DIR="$test_root" \
    CI_LAST_BACKUP_MANIFEST_FILE="$test_root/$scenario.last-manifest" \
    CI_BUILD_CACHE_KEEP_STORAGE=1GB \
    CI_BUILD_MIN_FREE_KB="$minimum_free_kb" \
    CI_BUILD_TARGET_MIN_FREE_KB=0 \
    COMPOSE_PROJECT_NAME=app \
    PATH="$fake_bin:$PATH" \
    FAKE_DOCKER_STATE="$fake_state" \
    FAKE_DOCKER_ROOT="$test_root" \
    bash "$job_runner" build >"$output" 2>&1
}

reset_fake_state
run_build_contract capacity-ready 0
assert_contains "$fake_state" 'builder:prune-count|7'
assert_contains "$fake_state" 'image:prune-count|7'
assert_contains "$fake_state" 'image:rm-count|7'
assert_contains "$fake_state" 'compose:build-print-count|1'
assert_contains "$fake_state" 'buildx:bake-count|7'
assert_contains "$fake_state" 'buildx:bake-sequence|server,db-init,pms,dms,sns,admin,crm'

reset_fake_state
if FAKE_DOCKER_FAIL_BUILD_SERVICE=pms run_build_contract serial-build-failed 0; then
  fail "build job continued after a serial service build failed"
fi
assert_contains "$fake_state" 'compose:build-print-count|1'
assert_contains "$fake_state" 'buildx:bake-count|3'
assert_contains "$fake_state" 'buildx:bake-sequence|server,db-init,pms'

reset_fake_state
for service in "${services[@]}"; do
  set_state "app-$service:latest" "sha256:$service-running"
done
run_build_contract deployed-latest-preserved 0
assert_contains "$fake_state" 'image:rm-count|0'
assert_contains "$fake_state" 'buildx:bake-count|7'

reset_fake_state
if run_build_contract capacity-blocked 999999999999; then
  fail "build job accepted insufficient Docker filesystem capacity"
fi
assert_contains "$fake_state" 'builder:prune-count|2'
assert_contains "$fake_state" 'image:prune-count|2'
assert_contains "$fake_state" 'compose:build-print-count|0'
assert_contains "$fake_state" 'buildx:bake-count|0'
assert_contains "$test_root/capacity-blocked.log" 'Docker capacity pressure detected; pruning all unused BuildKit cache'
assert_contains "$test_root/capacity-blocked.log" 'insufficient Docker filesystem capacity after safe cache cleanup'

retention_commit_sha() {
  printf '%040x\n' "$1"
}

seed_image_retention_state() {
  local scenario="$1"
  local index

  reset_fake_state
  for index in 1 2 3 4 5; do
    set_state "image:sha256:server-c$index" "sha256:server-c$index"
    set_state "created:sha256:server-c$index" "2026-09-0${index}T00:00:00Z"
    set_state "app-server:$(retention_commit_sha "$index")" "sha256:server-c$index"
  done
  for index in 1 2 3 4; do
    set_state "image:sha256:server-b$index" "sha256:server-b$index"
    set_state "app-server:ci-backup-20260901_00000$index-$index" "sha256:server-b$index"
  done
  set_state container:ssoo-legacy sha256:server-c1
  set_state "app-server:manual-keep" sha256:server-c2
  set_state "pgvector/pgvector:pg17" sha256:postgres
  set_state "app-pms:$(retention_commit_sha 9)" sha256:pms-built
  set_state "app-ci-verify:$(retention_commit_sha 7)" sha256:server-c2
  printf 'server|app-server:ci-backup-20260901_000001-1|sha256:server-b1|image|sha256:server-b1\n' > "$test_root/$scenario.manifest"
  printf '%s\n' "$test_root/$scenario.manifest" > "$test_root/$scenario.last-manifest"
}

seed_image_retention_state image-retention
run_build_contract image-retention 0
assert_contains "$fake_state" "removed:app-server:$(retention_commit_sha 2)|1"
assert_contains "$fake_state" 'removed:app-server:ci-backup-20260901_000002-2|1'
assert_contains "$fake_state" "removed:app-ci-verify:$(retention_commit_sha 7)|1"
for index in 1 3 4 5; do
  assert_not_contains "$fake_state" "removed:app-server:$(retention_commit_sha "$index")|"
done
assert_not_contains "$fake_state" "removed:app-server:$second_sha|"
for index in 1 3 4; do
  assert_not_contains "$fake_state" "removed:app-server:ci-backup-20260901_00000$index-$index|"
done
assert_not_contains "$fake_state" 'removed:app-server:manual-keep|'
assert_not_contains "$fake_state" 'removed:pgvector/pgvector:pg17|'
assert_not_contains "$fake_state" "removed:app-pms:$(retention_commit_sha 9)|"
assert_contains "$fake_state" 'image:rm-count|10'
assert_contains "$fake_state" 'buildx:bake-count|7'
assert_contains "$test_root/image-retention.log" "kept image=app-server:$(retention_commit_sha 1) reason=in-use"
assert_contains "$test_root/image-retention.log" 'kept image=app-server:ci-backup-20260901_000001-1 reason=in-use'

seed_image_retention_state image-retention-dry-run
CI_IMAGE_RETENTION_DRY_RUN=1 run_build_contract image-retention-dry-run 0
assert_contains "$test_root/image-retention-dry-run.log" "dry-run would remove image=app-server:$(retention_commit_sha 2)"
assert_not_contains "$fake_state" "removed:app-server:$(retention_commit_sha 2)|"
assert_not_contains "$fake_state" 'removed:app-server:ci-backup-'
assert_not_contains "$fake_state" 'removed:app-ci-verify:'
assert_contains "$fake_state" 'image:rm-count|7'

reset_fake_state
if CI_IMAGE_RETENTION_COMMIT_KEEP=0 run_build_contract image-retention-invalid 0; then
  fail "build job accepted an image retention window that keeps no commit image"
fi
assert_contains "$fake_state" 'image:rm-count|0'
assert_contains "$fake_state" 'buildx:bake-count|0'

reset_fake_state
PATH="$fake_bin:$PATH" FAKE_DOCKER_STATE="$fake_state" CI_COMMIT_SHA="$second_sha" \
  bash "$image_provenance" tag-build >/dev/null

for service in "${services[@]}"; do
  assert_contains "$fake_state" "app-$service:$second_sha|sha256:$service-built"
done

set_state container:ssoo-crm sha256:crm-missing
remove_state image:sha256:crm-missing
snapshot_manifest="$test_root/snapshot.manifest"
PATH="$fake_bin:$PATH" FAKE_DOCKER_STATE="$fake_state" CI_COMMIT_SHA="$second_sha" \
  bash "$image_provenance" backup-running ci-backup-snapshot "$snapshot_manifest" >/dev/null
assert_contains "$snapshot_manifest" 'crm|app-crm:ci-backup-snapshot|sha256:crm-snapshot|snapshot|sha256:crm-missing'

tampered_manifest="$test_root/tampered.manifest"
sed 's#app-crm:ci-backup-snapshot#app-server:ci-backup-snapshot#' "$snapshot_manifest" > "$tampered_manifest"
if PATH="$fake_bin:$PATH" FAKE_DOCKER_STATE="$fake_state" CI_COMMIT_SHA="$second_sha" \
  bash "$image_provenance" restore-backup "$tampered_manifest" >/dev/null 2>&1; then
  fail "restore accepted a backup image assigned to the wrong service"
fi

PATH="$fake_bin:$PATH" FAKE_DOCKER_STATE="$fake_state" CI_COMMIT_SHA="$second_sha" \
  bash "$image_provenance" prepare-deploy >/dev/null
PATH="$fake_bin:$PATH" FAKE_DOCKER_STATE="$fake_state" docker compose -p app up -d --no-build
PATH="$fake_bin:$PATH" FAKE_DOCKER_STATE="$fake_state" CI_COMMIT_SHA="$second_sha" \
  bash "$image_provenance" verify-deploy >/dev/null

PATH="$fake_bin:$PATH" FAKE_DOCKER_STATE="$fake_state" CI_COMMIT_SHA="$second_sha" \
  bash "$image_provenance" restore-backup "$snapshot_manifest" >/dev/null
PATH="$fake_bin:$PATH" FAKE_DOCKER_STATE="$fake_state" docker compose -p app up -d --no-build
PATH="$fake_bin:$PATH" FAKE_DOCKER_STATE="$fake_state" CI_COMMIT_SHA="$second_sha" \
  bash "$image_provenance" verify-backup "$snapshot_manifest" >/dev/null

reset_fake_state
set_state container:ssoo-crm sha256:crm-missing
remove_state image:sha256:crm-missing
export_manifest="$test_root/export.manifest"
PATH="$fake_bin:$PATH" FAKE_DOCKER_STATE="$fake_state" FAKE_DOCKER_FAIL_COMMIT_CONTAINER=ssoo-crm \
  CI_COMMIT_SHA="$second_sha" bash "$image_provenance" backup-running ci-backup-export "$export_manifest" >/dev/null
assert_contains "$export_manifest" 'crm|app-crm:ci-backup-export|sha256:crm-export|export|sha256:crm-missing'

reset_fake_state
set_state container:ssoo-crm sha256:crm-missing
remove_state image:sha256:crm-missing
mismatched_manifest="$test_root/mismatched.manifest"
if PATH="$fake_bin:$PATH" FAKE_DOCKER_STATE="$fake_state" FAKE_DOCKER_FAIL_COMMIT_CONTAINER=ssoo-crm \
  FAKE_DOCKER_CONFIG_MISMATCH_IMAGE=app-crm:ci-backup-mismatched \
  CI_COMMIT_SHA="$second_sha" bash "$image_provenance" backup-running ci-backup-mismatched "$mismatched_manifest" >/dev/null 2>&1; then
  fail "backup accepted a filesystem snapshot with mismatched runtime metadata"
fi
[[ ! -e "$mismatched_manifest" ]] || fail "mismatched filesystem snapshot published a completed manifest"

reset_fake_state
set_state container:ssoo-crm sha256:crm-missing
remove_state image:sha256:crm-missing
failed_manifest="$test_root/failed.manifest"
if PATH="$fake_bin:$PATH" FAKE_DOCKER_STATE="$fake_state" FAKE_DOCKER_FAIL_COMMIT_CONTAINER=ssoo-crm \
  FAKE_DOCKER_FAIL_EXPORT_CONTAINER=ssoo-crm \
  CI_COMMIT_SHA="$second_sha" bash "$image_provenance" backup-running ci-backup-failed "$failed_manifest" >/dev/null 2>&1; then
  fail "backup accepted a missing running image when commit and filesystem snapshots failed"
fi
[[ ! -e "$failed_manifest" ]] || fail "failed backup published a completed manifest"

run_deploy_contract() {
  local scenario="$1"
  local output="$test_root/$scenario.log"
  shift

  CI_PROJECT_DIR="$repo_root" \
    APP_DIR="$app" \
    CI_COMMIT_REF_NAME=development \
    CI_COMMIT_SHA="$second_sha" \
    CI_COMMIT_SHORT_SHA="${second_sha:0:8}" \
    CI_JOB_ID="${CI_JOB_ID_OVERRIDE:?}" \
    CI_APP_LOCK_FILE="$test_root/$scenario.lock" \
    CI_DEPLOY_HEALTH_WAIT_SECONDS=0 \
    CI_BACKUP_MANIFEST_DIR="$test_root" \
    CI_LAST_BACKUP_TAG_FILE="$test_root/$scenario.last-tag" \
    CI_LAST_BACKUP_MANIFEST_FILE="$test_root/$scenario.last-manifest" \
    COMPOSE_PROJECT_NAME=app \
    PATH="$fake_bin:$PATH" \
    FAKE_DOCKER_STATE="$fake_state" \
    "$@" \
    bash "$job_runner" deploy >"$output" 2>&1
}

reset_fake_state
set_state container:ssoo-crm sha256:crm-missing
remove_state image:sha256:crm-missing
CI_JOB_ID_OVERRIDE=900
if run_deploy_contract backup-failed env FAKE_DOCKER_FAIL_COMMIT_CONTAINER=ssoo-crm FAKE_DOCKER_FAIL_EXPORT_CONTAINER=ssoo-crm; then
  fail "deploy job accepted a failed rollback backup"
fi
assert_contains "$fake_state" 'compose:up-count|0'

reset_fake_state
set_state container:ssoo-crm sha256:crm-missing
remove_state image:sha256:crm-missing
CI_JOB_ID_OVERRIDE=901
if run_deploy_contract rollback-success env FAKE_DOCKER_FAIL_FIRST_DEPLOY_HEALTH=1; then
  fail "deploy contract accepted an unhealthy deployment after rollback"
fi
assert_contains "$test_root/rollback-success.log" 'deployment failed but automatic rollback succeeded'
rollback_manifest="$(<"$test_root/rollback-success.last-manifest")"
PATH="$fake_bin:$PATH" FAKE_DOCKER_STATE="$fake_state" CI_COMMIT_SHA="$second_sha" \
  bash "$image_provenance" verify-backup "$rollback_manifest" >/dev/null
assert_contains "$fake_state" 'compose:up-count|2'

reset_fake_state
set_state container:ssoo-crm sha256:crm-missing
remove_state image:sha256:crm-missing
CI_JOB_ID_OVERRIDE=902
run_deploy_contract deploy-success env
assert_contains "$test_root/deploy-success.log" '배포 완료'
PATH="$fake_bin:$PATH" FAKE_DOCKER_STATE="$fake_state" CI_COMMIT_SHA="$second_sha" \
  bash "$image_provenance" verify-deploy >/dev/null
assert_contains "$fake_state" 'compose:up-count|1'

reset_fake_state
set_state container:ssoo-crm sha256:crm-missing
remove_state image:sha256:crm-missing
CI_JOB_ID_OVERRIDE=903
if run_deploy_contract rollback-failed env FAKE_DOCKER_FAIL_FIRST_DEPLOY_HEALTH=1 FAKE_DOCKER_FAIL_COMPOSE_UP_NUMBER=2; then
  fail "deploy contract accepted a failed rollback"
fi
assert_contains "$test_root/rollback-failed.log" 'manual recovery required'

echo "[gitlab-pipeline-test] exact source, backup recovery, deploy, and rollback contracts passed"
