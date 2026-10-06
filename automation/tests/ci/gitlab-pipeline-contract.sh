#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
pipeline="$repo_root/.gitlab-ci.yml"
source_sync="$repo_root/scripts/ci/prepare-app-source.sh"
image_provenance="$repo_root/scripts/ci/image-provenance.sh"
job_runner="$repo_root/scripts/ci/run-app-job.sh"
runtime_diagnose="$repo_root/scripts/ci/diagnose-runtime.sh"
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
bash -n "$repo_root/scripts/ci/release-job.sh"
bash -n "$repo_root/scripts/ci/rehearse-release.sh"
assert_contains "$pipeline" 'stage: rehearse'
assert_contains "$pipeline" 'CI_DEPLOY_MODE: "plan-only"'
assert_contains "$job_runner" 'git -C "$CI_PROJECT_DIR" worktree add --detach'
assert_contains "$repo_root/scripts/ci/release-job.sh" '--no-build --no-deps'
assert_contains "$repo_root/scripts/ci/release-job.sh" 'automatic rollback forbidden'
assert_contains "$repo_root/scripts/ci/release-job.sh" 'state backup-check'

bash -n "$runtime_diagnose"
bash -n "$repo_root/scripts/ci/ai-review.sh"
assert_not_contains "$pipeline" 'allow_failure: true'
assert_contains "$pipeline" 'when: on_failure'
last_stage="$(awk '/^stages:/ { in_stages = 1; next } in_stages && /^  - / { last = $2; next } in_stages { exit } END { print last }' "$pipeline")"
[[ "$last_stage" == "diagnose" ]] || fail "diagnose must be the last stage"

assert_count "$pipeline" 'bash "$CI_PROJECT_DIR/scripts/ci/run-app-job.sh"' 6
assert_contains "$pipeline" 'bash "$CI_PROJECT_DIR/scripts/ci/diagnose-runtime.sh"'
assert_contains "$pipeline" 'COMPOSE_FILE: "compose.yaml:compose.staging.yaml"'
if grep -Eq 'docker (rm|rmi|restart|stop|start|kill|image rm|volume|system prune|builder prune)|docker compose [^|]*(up|down|rm|restart|stop|start|create|run|pull|build)( |$)' "$runtime_diagnose"; then
  fail "runtime diagnostics must stay read-only"
fi
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
cp "$runtime_diagnose" "$seed/scripts/ci/diagnose-runtime.sh"
printf 'first\n' > "$seed/version.txt"
git -C "$seed" add .gitignore scripts/ci/image-provenance.sh scripts/ci/diagnose-runtime.sh version.txt
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
  logs)
    printf 'DATABASE_URL=postgresql://ssoo:contract-secret@postgres:5432/ssoo_dev\n'
    printf 'DMS_GIT_BOOTSTRAP_REMOTE_URL=http://doc.user%%40example.com:git-contract-secret%%21@gitlab.example:8010/doc.git\n'
    ;;
  exec)
    printf 'schema|public|3\n'
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
        build|up|ps|config) operation="$argument" ;;
      esac
    done
    case "$operation" in
      ps)
        exit 0
        ;;
      config)
        cat <<'FAKE_COMPOSE_CONFIG'
name: app
services:
  server:
    secrets:
      - source: ssoo_tls_ca
        target: ssoo_tls_ca
        file: /service/level/ignored
secrets:
  dms_git_http_credentials:
    name: app_dms_git_http_credentials
    file: "/srv/ci secrets/dms-git"
  ssoo_tls_ca:
    name: app_ssoo_tls_ca
    file: /dev/null
volumes:
  ssoo-postgres-data:
    name: app_ssoo-postgres-data
FAKE_COMPOSE_CONFIG
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
    bake_allow=""
    for argument in "$@"; do
      if [[ "$argument" == --allow=* ]]; then
        bake_allow="$bake_allow[$argument]"
      fi
    done
    set_value buildx:bake-allow "$bake_allow"
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

node --test "$repo_root/automation/tests/ci/release-state.test.mjs" "$repo_root/automation/tests/ci/release-job.test.mjs" "$repo_root/automation/tests/ci/db-init-policy.test.mjs" "$repo_root/automation/tests/ci/release-state-directory.test.mjs" "$repo_root/automation/tests/ci/verify-tls.test.mjs"
# AI review: newest successful development deployment as the base, lockfile excluded,
# whole-file diffs in priority order within the budget, partial coverage reported.
command -v jq >/dev/null 2>&1 || fail "jq is required for the ai-review contract (the CI verify image installs it)"
review_repo="$test_root/review"
review_out="$test_root/review-out"
deployments_dir="$test_root/deployments"
fake_curl_bin="$test_root/curl-bin"
mkdir -p "$review_out" "$deployments_dir" "$fake_curl_bin"
git init -q -b development "$review_repo"
git -C "$review_repo" config user.name "CI Contract Test"
git -C "$review_repo" config user.email "ci-contract@example.invalid"

write_review_file() {
  mkdir -p "$review_repo/$(dirname "$1")"
  printf '%s\n' "$2" > "$review_repo/$1"
}

write_review_file README.md base
git -C "$review_repo" add -A
git -C "$review_repo" commit -qm base
review_base_sha="$(git -C "$review_repo" rev-parse HEAD)"
write_review_file apps/server/src/review.ts "export const reviewed = 'server change';"
write_review_file .codex/hooks/guard.sh "$(printf 'echo tooling-line-%s\n' $(seq 1 60))"
write_review_file apps/web/pms/src/large.ts "$(printf "export const largeValue%s = 'pms';\n" $(seq 1 200))"
write_review_file pnpm-lock.yaml lockfile-change
git -C "$review_repo" add -A
git -C "$review_repo" commit -qm changes
review_head_sha="$(git -C "$review_repo" rev-parse HEAD)"

deployment_json() {
  printf '{"id":%s,"sha":"%s","environment":{"name":"%s"},"deployable":{"status":"%s"}}' "$1" "$2" "$3" "$4"
}
{
  printf '['
  for deployment_id in $(seq 1 100); do
    if [[ "$deployment_id" -gt 1 ]]; then printf ','; fi
    deployment_json "$deployment_id" "$(printf '%040x' "$deployment_id")" development success
  done
  printf ']'
} > "$deployments_dir/page-1.json"
{
  printf '['
  deployment_json 101 "$review_base_sha" development success
  printf ','
  deployment_json 102 "$(printf '%040x' 102)" development failed
  printf ','
  deployment_json 103 "$(printf '%040x' 103)" production success
  printf ']'
} > "$deployments_dir/page-2.json"

cat > "$fake_curl_bin/curl" <<'FAKE_CURL'
#!/usr/bin/env bash
set -euo pipefail
url=""
data=""
previous_argument=""
for argument in "$@"; do
  if [[ "$previous_argument" == "-d" ]]; then data="$argument"; fi
  if [[ "$argument" == http* ]]; then url="$argument"; fi
  previous_argument="$argument"
done
case "$url" in
  */deployments\?*)
    cat "$FAKE_CURL_DEPLOYMENTS_DIR/page-${url##*page=}.json" 2>/dev/null || printf '[]'
    ;;
  */chat/completions*)
    printf '%s' "$data" > "$FAKE_CURL_REQUEST_FILE"
    printf '{"choices":[{"message":{"content":"변경 요약\\nRISK=LOW"}}]}\n[HTTP_CODE]200'
    ;;
  *)
    exit 7
    ;;
esac
FAKE_CURL
chmod +x "$fake_curl_bin/curl"

run_ai_review() {
  local scenario="$1"
  mkdir -p "$review_out/$scenario"
  CI_PROJECT_DIR="$review_out/$scenario" \
    APP_DIR="$review_repo" \
    CI_COMMIT_SHA="$review_head_sha" \
    GITLAB_API_TOKEN=contract-token \
    AZURE_OPENAI_ENDPOINT=https://azure.example/ \
    AZURE_OPENAI_DEPLOYMENT=review \
    AZURE_OPENAI_API_KEY=contract-key \
    OPENAI_API_VERSION=2024-01-01 \
    AI_REVIEW_DIFF_BUDGET_BYTES="$2" \
    FAKE_CURL_DEPLOYMENTS_DIR="$deployments_dir" \
    FAKE_CURL_REQUEST_FILE="$review_out/$scenario/request.json" \
    PATH="$fake_curl_bin:$PATH" \
    bash "$repo_root/scripts/ci/ai-review.sh" > "$review_out/$scenario.log" 2>&1 \
    || fail "ai-review scenario $scenario exited non-zero"
}

run_ai_review server-only 1000
assert_contains "$review_out/server-only.log" "마지막 배포 SHA: $review_base_sha"
assert_contains "$review_out/server-only.log" '검토 파일: 1/3'
assert_contains "$review_out/server-only.log" '판정 위험도: UNKNOWN (부분 검토 1/3, 모델 판정 LOW)'
assert_contains "$review_out/server-only/request.json" 'server change'
assert_contains "$review_out/server-only/request.json" '전체 변경 3개 파일 중 1개만'
assert_not_contains "$review_out/server-only/request.json" 'tooling-line-1'
assert_not_contains "$review_out/server-only/request.json" 'largeValue1'
assert_not_contains "$review_out/server-only/request.json" 'lockfile-change'
assert_contains "$review_out/server-only/ai-review-report.md" '## 검토하지 못한 파일 (2개, diff 한도 초과)'
assert_contains "$review_out/server-only/ai-review-report.md" '- `.codex/hooks/guard.sh`'
assert_contains "$review_out/server-only/ai-review-report.md" '- `apps/web/pms/src/large.ts`'

run_ai_review server-and-tooling 3000
assert_contains "$review_out/server-and-tooling.log" '검토 파일: 2/3'
assert_contains "$review_out/server-and-tooling/request.json" 'tooling-line-1'
assert_not_contains "$review_out/server-and-tooling/request.json" 'largeValue1'

run_ai_review complete 100000
assert_contains "$review_out/complete.log" '검토 파일: 3/3'
assert_contains "$review_out/complete.log" '[ai-review] 판정 위험도: LOW'
assert_contains "$review_out/complete/request.json" 'largeValue1'
assert_not_contains "$review_out/complete/request.json" 'lockfile-change'
assert_not_contains "$review_out/complete/request.json" '전체 변경'
assert_not_contains "$review_out/complete/ai-review-report.md" '검토하지 못한 파일'

run_ai_review over-budget 50
assert_contains "$review_out/over-budget.log" '판정 위험도: UNKNOWN (부분 검토 0/3)'
[[ ! -e "$review_out/over-budget/request.json" ]] || fail "ai-review called the model without any reviewable diff"

echo "[gitlab-pipeline-test] exact source, AI review, backup recovery and platform release contracts passed"
