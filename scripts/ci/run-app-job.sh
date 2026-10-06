#!/usr/bin/env bash
set -euo pipefail

job="${1:-}"
CI_PROJECT_DIR="${CI_PROJECT_DIR:?CI_PROJECT_DIR is required}"
APP_DIR="${APP_DIR:?APP_DIR is required}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-app}"
lock_file="${CI_APP_LOCK_FILE:-/tmp/ssoo-app-runtime.lock}"
lock_timeout="${CI_APP_LOCK_TIMEOUT_SECONDS:-7200}"
deploy_health_wait="${CI_DEPLOY_HEALTH_WAIT_SECONDS:-60}"
backup_manifest_dir="${CI_BACKUP_MANIFEST_DIR:-/tmp}"
last_backup_tag_file="${CI_LAST_BACKUP_TAG_FILE:-/tmp/ssoo-ci-last-backup-tag}"
last_backup_manifest_file="${CI_LAST_BACKUP_MANIFEST_FILE:-/tmp/ssoo-ci-last-backup-manifest}"
build_cache_keep_storage="${CI_BUILD_CACHE_KEEP_STORAGE:-8GB}"
build_min_free_kb="${CI_BUILD_MIN_FREE_KB:-8388608}"
build_target_min_free_kb="${CI_BUILD_TARGET_MIN_FREE_KB:-3145728}"
image_retention_commit_keep="${CI_IMAGE_RETENTION_COMMIT_KEEP:-3}"
image_retention_backup_keep="${CI_IMAGE_RETENTION_BACKUP_KEEP:-2}"
image_retention_dry_run="${CI_IMAGE_RETENTION_DRY_RUN:-0}"
ci_force_full_build="${CI_FORCE_FULL_BUILD:-0}"
build_services=(server db-init pms dms sns admin crm)

if [[ ! "$deploy_health_wait" =~ ^[0-9]+$ ]]; then
  echo "[ci-job] CI_DEPLOY_HEALTH_WAIT_SECONDS must be a non-negative integer" >&2
  exit 1
fi
if [[ ! -d "$backup_manifest_dir" ]]; then
  echo "[ci-job] backup manifest directory is missing: $backup_manifest_dir" >&2
  exit 1
fi
if [[ ! "$build_cache_keep_storage" =~ ^[0-9]+([KMGT]B)?$ ]]; then
  echo "[ci-job] CI_BUILD_CACHE_KEEP_STORAGE must be a Docker storage size such as 8GB" >&2
  exit 1
fi
if [[ ! "$build_min_free_kb" =~ ^[0-9]+$ ]]; then
  echo "[ci-job] CI_BUILD_MIN_FREE_KB must be a non-negative integer" >&2
  exit 1
fi
if [[ ! "$build_target_min_free_kb" =~ ^[0-9]+$ ]]; then
  echo "[ci-job] CI_BUILD_TARGET_MIN_FREE_KB must be a non-negative integer" >&2
  exit 1
fi
if [[ ! "$image_retention_commit_keep" =~ ^[1-9][0-9]*$ ]]; then
  echo "[ci-job] CI_IMAGE_RETENTION_COMMIT_KEEP must be a positive integer" >&2
  exit 1
fi
if [[ ! "$image_retention_backup_keep" =~ ^[1-9][0-9]*$ ]]; then
  echo "[ci-job] CI_IMAGE_RETENTION_BACKUP_KEEP must be a positive integer" >&2
  exit 1
fi
if [[ "$image_retention_dry_run" != "0" && "$image_retention_dry_run" != "1" ]]; then
  echo "[ci-job] CI_IMAGE_RETENTION_DRY_RUN must be 0 or 1" >&2
  exit 1
fi
if [[ "$ci_force_full_build" != "0" && "$ci_force_full_build" != "1" ]]; then
  echo "[ci-job] CI_FORCE_FULL_BUILD must be 0 or 1" >&2
  exit 1
fi
case "$job" in
  verify|ai-review|build|deploy) ;;
  *)
    echo "usage: $0 <verify|ai-review|build|deploy>" >&2
    exit 2
    ;;
esac

if ! command -v flock >/dev/null 2>&1; then
  echo "[ci-job] flock is required on the shell runner" >&2
  exit 1
fi

prune_unreferenced_app_latest() {
  local service image_tag latest_id container_id

  for service in "${build_services[@]}"; do
    image_tag="app-$service:latest"
    latest_id="$(docker image inspect "$image_tag" --format '{{.Id}}' 2>/dev/null || true)"
    container_id="$(docker inspect "ssoo-$service" --format '{{.Image}}' 2>/dev/null || true)"
    if [[ -z "$latest_id" || -z "$container_id" || "$latest_id" == "$container_id" ]]; then
      continue
    fi
    echo "[ci-job] removing undeployed latest tag service=$service image=$image_tag id=$latest_id running_id=$container_id"
    docker image rm "$image_tag"
  done
}

remove_retired_image() {
  local image_ref="$1"
  local reason="$2"

  if [[ "$image_retention_dry_run" == "1" ]]; then
    echo "[ci-job] image retention dry-run would remove image=$image_ref reason=$reason"
    return 0
  fi
  if docker image rm "$image_ref" >/dev/null; then
    echo "[ci-job] image retention removed image=$image_ref reason=$reason"
  else
    echo "[ci-job] image retention kept image=$image_ref reason=remove-failed" >&2
  fi
}

prune_retired_app_images() {
  local service repository tag image_ref image_id created container_id last_manifest
  local manifest_service backup_image backup_id manifest_mode manifest_source
  local container_ids image_rows row recent_count
  local -A protected_ids=()
  local -A protected_refs=()
  local -A recent_ids=()
  local -a commit_rows=()
  local -a backup_tags=()

  container_ids="$(docker ps -aq)"
  for container_id in $container_ids; do
    image_id="$(docker inspect "$container_id" --format '{{.Image}}')"
    if [[ -n "$image_id" ]]; then
      protected_ids[$image_id]=1
    fi
  done

  for service in "${build_services[@]}"; do
    image_id="$(docker image inspect "app-$service:latest" --format '{{.Id}}' 2>/dev/null || true)"
    if [[ -n "$image_id" ]]; then
      protected_ids[$image_id]=1
    fi
    if [[ -n "${CI_COMMIT_SHA:-}" ]]; then
      protected_refs["app-$service:$CI_COMMIT_SHA"]=1
    fi
  done

  if [[ -f "$last_backup_manifest_file" ]]; then
    last_manifest="$(<"$last_backup_manifest_file")"
    if [[ -n "$last_manifest" && -f "$last_manifest" ]]; then
      while IFS='|' read -r manifest_service backup_image backup_id manifest_mode manifest_source; do
        if [[ -n "$backup_image" ]]; then
          protected_refs[$backup_image]=1
        fi
        if [[ -n "$backup_id" ]]; then
          protected_ids[$backup_id]=1
        fi
      done < "$last_manifest"
    fi
  fi

  echo "[ci-job] image retention start commit_keep=$image_retention_commit_keep backup_keep=$image_retention_backup_keep dry_run=$image_retention_dry_run protected_images=${#protected_ids[@]}"
  image_rows="$(docker image ls --format '{{.Repository}}|{{.Tag}}')"
  if [[ "$image_retention_dry_run" == "1" ]]; then
    docker image ls --format 'table {{.Repository}}\t{{.Tag}}\t{{.ID}}\t{{.CreatedSince}}\t{{.Size}}' || true
  fi

  for service in "${build_services[@]}"; do
    commit_rows=()
    backup_tags=()
    recent_ids=()
    while IFS='|' read -r repository tag; do
      if [[ "$repository" != "app-$service" ]]; then
        continue
      fi
      if [[ "$tag" =~ ^[0-9a-f]{40}$ ]]; then
        row="$(docker image inspect "app-$service:$tag" --format '{{.Created}}|{{.Id}}')"
        commit_rows+=("$row|app-$service:$tag")
      elif [[ "$tag" =~ ^ci-backup-[A-Za-z0-9_.-]+$ ]]; then
        backup_tags+=("$tag")
      fi
    done <<< "$image_rows"

    # Commit tags back manual deploys of older pipelines; keep the newest distinct builds.
    if [[ "${#commit_rows[@]}" -gt 0 ]]; then
      recent_count=0
      while IFS='|' read -r created image_id image_ref; do
        if [[ -z "${recent_ids[$image_id]:-}" && "$recent_count" -lt "$image_retention_commit_keep" ]]; then
          recent_ids[$image_id]=1
          recent_count=$((recent_count + 1))
        fi
        if [[ -n "${protected_refs[$image_ref]:-}" || -n "${protected_ids[$image_id]:-}" ]]; then
          echo "[ci-job] image retention kept image=$image_ref reason=in-use created=$created"
        elif [[ -n "${recent_ids[$image_id]:-}" ]]; then
          echo "[ci-job] image retention kept image=$image_ref reason=recent-build created=$created"
        else
          remove_retired_image "$image_ref" "stale-build created=$created"
        fi
      done < <(printf '%s\n' "${commit_rows[@]}" | sort -r)
    fi

    # Backup tags are named ci-backup-<YYYYmmdd_HHMMSS>-<job>, so reverse name order is newest first.
    if [[ "${#backup_tags[@]}" -gt 0 ]]; then
      recent_count=0
      while IFS= read -r tag; do
        image_ref="app-$service:$tag"
        recent_count=$((recent_count + 1))
        image_id="$(docker image inspect "$image_ref" --format '{{.Id}}')"
        if [[ -n "${protected_refs[$image_ref]:-}" || -n "${protected_ids[$image_id]:-}" ]]; then
          echo "[ci-job] image retention kept image=$image_ref reason=in-use"
        elif [[ "$recent_count" -le "$image_retention_backup_keep" ]]; then
          echo "[ci-job] image retention kept image=$image_ref reason=recent-backup"
        else
          remove_retired_image "$image_ref" stale-backup
        fi
      done < <(printf '%s\n' "${backup_tags[@]}" | sort -r)
    fi
  done

  # Verify images are job-local; a leftover only exists when an earlier verify job was killed.
  while IFS='|' read -r repository tag; do
    if [[ "$repository" != "app-ci-verify" || ! "$tag" =~ ^[0-9a-f]{40}$ ]]; then
      continue
    fi
    image_ref="app-ci-verify:$tag"
    image_id="$(docker image inspect "$image_ref" --format '{{.Id}}')"
    if [[ -n "${protected_ids[$image_id]:-}" ]]; then
      echo "[ci-job] image retention kept image=$image_ref reason=in-use"
    else
      remove_retired_image "$image_ref" verify-leftover
    fi
  done <<< "$image_rows"
  echo "[ci-job] image retention complete dry_run=$image_retention_dry_run"
}

prepare_build_capacity() {
  local context="$1"
  local required_kb="${2:-$build_min_free_kb}"
  local cleanup_mode="${3:-adaptive}"
  local docker_root capacity_probe available_kb

  echo "[ci-job] Docker capacity preflight context=$context mode=$cleanup_mode cache_keep=$build_cache_keep_storage min_free_kb=$required_kb"
  docker system df || true
  if [[ "$cleanup_mode" == "full" ]]; then
    docker builder prune --all --force
  else
    docker builder prune --all --force --keep-storage "$build_cache_keep_storage"
  fi
  docker image prune --force

  docker_root="$(docker info --format '{{.DockerRootDir}}')"
  if [[ -z "$docker_root" ]]; then
    echo "[ci-job] Docker root directory is unavailable" >&2
    return 1
  fi
  capacity_probe="$docker_root"
  if ! available_kb="$(df -Pk "$capacity_probe" 2>/dev/null | awk 'NR == 2 { print $4 }')"; then
    capacity_probe="$(dirname "$docker_root")"
    available_kb="$(df -Pk "$capacity_probe" | awk 'NR == 2 { print $4 }')"
  fi
  if [[ ! "$available_kb" =~ ^[0-9]+$ ]]; then
    echo "[ci-job] unable to determine Docker filesystem capacity root=$docker_root probe=$capacity_probe" >&2
    return 1
  fi

  if [[ "$cleanup_mode" != "full" ]] && (( available_kb < required_kb )); then
    echo "[ci-job] Docker capacity pressure detected; pruning all unused BuildKit cache available_kb=$available_kb required_kb=$required_kb"
    docker builder prune --all --force
    docker image prune --force

    capacity_probe="$docker_root"
    if ! available_kb="$(df -Pk "$capacity_probe" 2>/dev/null | awk 'NR == 2 { print $4 }')"; then
      capacity_probe="$(dirname "$docker_root")"
      available_kb="$(df -Pk "$capacity_probe" | awk 'NR == 2 { print $4 }')"
    fi
    if [[ ! "$available_kb" =~ ^[0-9]+$ ]]; then
      echo "[ci-job] unable to determine Docker filesystem capacity after pressure cleanup root=$docker_root probe=$capacity_probe" >&2
      return 1
    fi
  fi

  docker system df || true
  echo "[ci-job] Docker capacity ready context=$context root=$docker_root probe=$capacity_probe available_kb=$available_kb min_free_kb=$required_kb"
  if (( available_kb < required_kb )); then
    echo "[ci-job] insufficient Docker filesystem capacity after safe cache cleanup: available_kb=$available_kb required_kb=$required_kb" >&2
    return 1
  fi
}

image_label() {
  docker image inspect "$1" --format "{{index .Config.Labels \"$2\"}}" 2>/dev/null || true
}

find_reusable_image() {
  local service="$1"
  local input_hash="$2"
  local repository tag

  # Commit-tagged images carry provenance; any of them built from the same inputs is equivalent.
  while IFS='|' read -r repository tag; do
    if [[ "$repository" == "app-$service" && "$tag" =~ ^[0-9a-f]{40}$ ]] \
      && [[ "$(image_label "app-$service:$tag" com.ssoo.ci.input-hash)" == "$input_hash" ]]; then
      printf 'app-%s:%s\n' "$service" "$tag"
      return 0
    fi
  done < <(docker image ls --format '{{.Repository}}|{{.Tag}}')
}

exec 9>"$lock_file"
echo "[ci-job] waiting for lock job=$job file=$lock_file timeout=${lock_timeout}s"
if ! flock -w "$lock_timeout" 9; then
  echo "[ci-job] timed out waiting for shared APP_DIR/Docker lock" >&2
  exit 1
fi

echo "[ci-job] acquired lock job=$job"
if [[ "$job" == "verify" || "$job" == "build" ]]; then
  prune_unreferenced_app_latest
  prune_retired_app_images
  prepare_build_capacity "$job"
fi
bash "$CI_PROJECT_DIR/scripts/ci/prepare-app-source.sh"
cd "$APP_DIR"

check_stack_health() {
  local context="$1"
  local health_failed=0
  local service status

  echo "[ci-job] waiting ${deploy_health_wait}s before $context health check"
  if [[ "$deploy_health_wait" -gt 0 ]]; then
    sleep "$deploy_health_wait"
  fi
  docker compose -p "$COMPOSE_PROJECT_NAME" ps || return $?
  for service in postgres server pms dms sns admin crm; do
    status="$(docker inspect "ssoo-$service" --format '{{.State.Health.Status}}' 2>/dev/null || echo "na")"
    echo "[ci-job] health context=$context container=ssoo-$service status=$status"
    if [[ "$status" != "healthy" ]]; then
      health_failed=1
    fi
  done

  if [[ "$health_failed" != "0" ]]; then
    echo "[ci-job] $context health check failed" >&2
    return 1
  fi
}

deploy_selected_images() {
  local backup_manifest="$1"

  bash scripts/ci/image-provenance.sh prepare-deploy || return $?
  docker compose -p "$COMPOSE_PROJECT_NAME" up -d --no-build || return $?
  check_stack_health deployment || return $?
  bash scripts/ci/image-provenance.sh verify-deploy || return $?
  echo "[ci-job] deployment verification passed manifest=$backup_manifest"
}

restore_previous_images() {
  local backup_manifest="$1"

  bash scripts/ci/image-provenance.sh restore-backup "$backup_manifest" || return $?
  docker compose -p "$COMPOSE_PROJECT_NAME" up -d --no-build || return $?
  check_stack_health rollback || return $?
  bash scripts/ci/image-provenance.sh verify-backup "$backup_manifest" || return $?
  echo "[ci-job] rollback verification passed manifest=$backup_manifest"
}

case "$job" in
  verify)
    echo "파이프라인 동작 확인"
    echo "푸시한 사람 ${GITLAB_USER_NAME:-unknown}"
    echo "브랜치 $CI_COMMIT_REF_NAME"
    echo "커밋 ${CI_COMMIT_SHORT_SHA:-${CI_COMMIT_SHA:0:8}}"
    verify_image="app-ci-verify:$CI_COMMIT_SHA"
    cleanup_verify_image() {
      docker image rm "$verify_image" >/dev/null 2>&1 || true
    }
    trap cleanup_verify_image EXIT
    docker build \
      --file docker/ci-verify.Dockerfile \
      --label "com.ssoo.ci.commit=$CI_COMMIT_SHA" \
      --tag "$verify_image" \
      .
    docker run --rm \
      --volume "$APP_DIR/.git:/app/.git:ro" \
      "$verify_image" \
      bash -lc '
        pnpm run verify:gitlab-pipeline
        pnpm run codex:preflight
        pnpm lint
        pnpm test:server
      '
    ;;
  ai-review)
    bash scripts/ci/ai-review.sh
    ;;
  build)
    bake_definition="$(mktemp "${TMPDIR:-/tmp}/ssoo-compose-bake.XXXXXX.json")"
    compose_config_file="$(mktemp "${TMPDIR:-/tmp}/ssoo-compose-config.XXXXXX.yaml")"
    cleanup_bake_definition() {
      rm -f "$bake_definition" "$compose_config_file"
    }
    trap cleanup_bake_definition EXIT
    docker compose -p "$COMPOSE_PROJECT_NAME" build --print > "$bake_definition"
    # Bake requires explicit read entitlements for compose secret files outside the build context.
    compose_config="$(docker compose -p "$COMPOSE_PROJECT_NAME" config)"
    printf '%s\n' "$compose_config" > "$compose_config_file"
    bake_allow_args=()
    while IFS= read -r secret_file; do
      bake_allow_args+=("--allow=fs.read=$secret_file")
      echo "[ci-job] bake secret read allowed file=$secret_file"
    done < <(awk '
      /^[^ ]/ { in_secrets = ($0 == "secrets:"); next }
      in_secrets && /^    file: / {
        value = substr($0, length("    file: ") + 1)
        gsub(/^["\047]|["\047]$/, "", value)
        if (value != "") print value
      }
    ' <<< "$compose_config" | sort -u)
    # GitLab 10.4 ignores API pipeline variables, so a commit message marker also forces a full build.
    force_full_build="$ci_force_full_build"
    commit_message="$(git log -1 --format=%B "$CI_COMMIT_SHA")"
    if [[ "$commit_message" == *"[full build]"* ]]; then
      force_full_build=1
    fi
    echo "변경 서비스 순차 빌드 시작 (BuildKit, services=${build_services[*]}, force_full_build=$force_full_build)"
    built_count=0
    for service in "${build_services[@]}"; do
      input_hash="$(bash scripts/ci/build-inputs.sh "$service" "$compose_config_file")"
      reuse_image=""
      if [[ "$force_full_build" == "0" ]]; then
        reuse_image="$(find_reusable_image "$service" "$input_hash")"
      fi
      if [[ -n "$reuse_image" ]]; then
        docker tag "$reuse_image" "app-$service:latest"
        echo "[ci-job] reused service=$service image=$reuse_image built_from=$(image_label "$reuse_image" com.ssoo.ci.commit) input_hash=$input_hash"
      else
        if (( built_count > 0 )); then
          prepare_build_capacity "build-$service" "$build_target_min_free_kb" full
        fi
        echo "[ci-job] building service=$service input_hash=$input_hash"
        docker buildx bake "${bake_allow_args[@]}" --file "$bake_definition" \
          --set "$service.labels.com.ssoo.ci.input-hash=$input_hash" \
          --set "$service.labels.com.ssoo.ci.commit=$CI_COMMIT_SHA" \
          --load "$service"
        built_count=$((built_count + 1))
        echo "[ci-job] built service=$service"
      fi
      selected_hash="$(image_label "app-$service:latest" com.ssoo.ci.input-hash)"
      if [[ "$selected_hash" != "$input_hash" ]]; then
        echo "[ci-job] build input label mismatch service=$service expected=$input_hash actual=$selected_hash" >&2
        exit 1
      fi
    done
    echo "[ci-job] build selection built=$built_count reused=$(( ${#build_services[@]} - built_count ))"
    bash scripts/ci/image-provenance.sh tag-build
    echo "빌드 완료"
    ;;
  deploy)
    echo "development 배포 시작"
    backup_tag="ci-backup-$(date +%Y%m%d_%H%M%S)-${CI_JOB_ID:-$$}"
    backup_manifest="$backup_manifest_dir/ssoo-${backup_tag}.manifest"
    echo "백업 태그 $backup_tag"
    bash scripts/ci/image-provenance.sh backup-running "$backup_tag" "$backup_manifest"
    echo "$backup_tag" > "$last_backup_tag_file"
    echo "$backup_manifest" > "$last_backup_manifest_file"

    set +e
    deploy_selected_images "$backup_manifest"
    deploy_status=$?
    set -e
    if [[ "$deploy_status" != "0" ]]; then
      echo "[ci-job] deployment failed status=$deploy_status; capturing diagnostics before automatic rollback" >&2
      # Rollback recreates the containers, so capture the failed release logs first.
      bash scripts/ci/diagnose-runtime.sh || true
      echo "[ci-job] starting automatic rollback" >&2
      set +e
      restore_previous_images "$backup_manifest"
      rollback_status=$?
      set -e
      if [[ "$rollback_status" == "0" ]]; then
        echo "[ci-job] deployment failed but automatic rollback succeeded" >&2
      else
        bash scripts/ci/diagnose-runtime.sh || true
        echo "[ci-job] deployment and automatic rollback failed rollback_status=$rollback_status; manual recovery required manifest=$backup_manifest" >&2
      fi
      exit 1
    fi
    echo "배포 완료"
    ;;
esac

echo "[ci-job] completed job=$job"
