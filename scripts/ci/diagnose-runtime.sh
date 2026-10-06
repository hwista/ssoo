#!/usr/bin/env bash
# Read-only runtime diagnostics for the shared shell runner stack.
# It never recreates, restarts, or removes containers, images, or volumes.
set -uo pipefail

log_tail="${CI_DIAGNOSE_LOG_TAIL:-300}"
containers=(ssoo-postgres ssoo-db-init ssoo-server ssoo-pms ssoo-dms ssoo-sns ssoo-admin ssoo-crm)

if [[ ! "$log_tail" =~ ^[1-9][0-9]*$ ]]; then
  echo "[ci-diagnose] CI_DIAGNOSE_LOG_TAIL must be a positive integer" >&2
  exit 1
fi

redact() {
  # Mask userinfo passwords in every URL scheme (git remotes embed credentials too).
  sed -E \
    -e 's#(://[^:/@[:space:]]+:)[^@[:space:]]+@#\1***@#g' \
    -e 's#((PASSWORD|SECRET|TOKEN)[A-Z_]*=)[^[:space:]]+#\1***#g'
}

echo "[ci-diagnose] containers"
docker ps -a --filter name=ssoo- --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}' 2>&1 | redact

for container in "${containers[@]}"; do
  echo "[ci-diagnose] ===== $container state"
  if ! docker inspect "$container" >/dev/null 2>&1; then
    echo "[ci-diagnose] container missing: $container"
    continue
  fi
  docker inspect "$container" --format 'status={{.State.Status}} exit={{.State.ExitCode}} error={{.State.Error}} oom={{.State.OOMKilled}} started={{.State.StartedAt}} finished={{.State.FinishedAt}} image={{.Image}}' 2>&1 | redact
  docker inspect "$container" --format '{{if .State.Health}}{{range .State.Health.Log}}health exit={{.ExitCode}} at={{.End}} output={{.Output}}{{println}}{{end}}{{end}}' 2>&1 | tail -n 5 | redact
  echo "[ci-diagnose] ===== $container logs (tail $log_tail)"
  docker logs --timestamps --tail "$log_tail" "$container" 2>&1 | redact
done

describe_env() {
  # Print variable names; secret-like values are reduced to length and placeholder markers.
  awk -F '=' '
    NF == 0 || $1 ~ /^#/ { next }
    {
      key = $1
      value = substr($0, length(key) + 2)
      if (key ~ /(PASSWORD|SECRET|TOKEN|KEY|CREDENTIAL|DATABASE_URL)/) {
        marker = (tolower(value) ~ /(change-me|development|your-|placeholder|replace-)/) ? "yes" : "no"
        printf "%s=<set len=%d placeholder=%s>\n", key, length(value), marker
      } else {
        printf "%s=%s\n", key, value
      }
    }
  ' | sort
}

echo "[ci-diagnose] ===== compose resolution"
app_dir="${APP_DIR:-/opt/ssoo/app}"
if [[ -d "$app_dir" ]]; then
  (
    cd "$app_dir" || exit 0
    echo "[ci-diagnose] app_dir=$app_dir head=$(git rev-parse --short HEAD 2>/dev/null)"
    ls -la .env* compose*.yaml apps/web/dms/.env.local 2>&1 | awk '{print $1, $NF}'
    echo "[ci-diagnose] .env keys (compose interpolation source)"
    if [[ -f .env ]]; then describe_env < .env | redact; fi
    echo "[ci-diagnose] resolved compose files"
    docker compose -p "${COMPOSE_PROJECT_NAME:-app}" config --format json 2>/dev/null \
      | grep -o '"working_dir"[^,]*\|"COMPOSE_FILE"[^,]*' | head -5
    docker compose -p "${COMPOSE_PROJECT_NAME:-app}" ls 2>&1 | head -5
  )
fi

echo "[ci-diagnose] ===== ssoo-server effective environment"
docker inspect ssoo-server --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null | describe_env | redact
docker inspect ssoo-server --format 'compose_files={{index .Config.Labels "com.docker.compose.project.config_files"}} env_files={{index .Config.Labels "com.docker.compose.project.environment_file"}}' 2>&1

echo "[ci-diagnose] ===== ssoo-server DMS readiness probes"
if [[ "$(docker inspect ssoo-server --format '{{.State.Running}}' 2>/dev/null)" == "true" ]]; then
  # Read-only probes as the server process sees them: readiness HTTP status,
  # runtime path access, and the document repository's Git state and remote reachability.
  docker exec ssoo-server node -e "fetch('http://127.0.0.1:4000/api/health/readiness').then(async (response)=>console.log('readiness_http=' + response.status + ' body=' + (await response.text()).slice(0, 400))).catch((error)=>console.log('readiness_error=' + error.message))" 2>&1 | redact
  docker exec ssoo-server sh -c '
    root="${DMS_MARKDOWN_ROOT:-}"
    for dir in "$root" "${DMS_TEMPLATE_ROOT:-$root/_templates}" "${DMS_INGEST_QUEUE_PATH:-}" "${DMS_STORAGE_LOCAL_BASE_PATH:-}" "${DMS_STORAGE_NAS_BASE_PATH:-}"; do
      [ -n "$dir" ] || continue
      if [ -d "$dir" ]; then
        echo "path=$dir exists=yes readable=$([ -r "$dir" ] && echo yes || echo no) writable=$([ -w "$dir" ] && echo yes || echo no)"
      else
        echo "path=$dir exists=no"
      fi
    done
    if [ -n "$root" ] && [ -e "$root/.git" ]; then
      # Same per-command safe.directory exception as the server Git client (git-client.util.ts).
      git -c "safe.directory=$root" --no-optional-locks -C "$root" status --short --branch 2>&1 | head -n 5
      git -c "safe.directory=$root" -C "$root" remote -v 2>&1
      remote_heads="$(GIT_TERMINAL_PROMPT=0 timeout 20 git -c "safe.directory=$root" -C "$root" ls-remote --heads origin 2>&1)"
      echo "git_ls_remote_exit=$?"
      printf "%s\n" "$remote_heads" | head -n 5
    else
      echo "git_repository=no root=$root"
    fi
  ' 2>&1 | redact
else
  echo "[ci-diagnose] ssoo-server is not running; readiness probes skipped"
fi

echo "[ci-diagnose] ===== database migration state"
if docker inspect ssoo-postgres >/dev/null 2>&1; then
  docker exec ssoo-postgres sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "
    SELECT '\''schema'\'', table_schema, COUNT(*)
      FROM information_schema.tables
     WHERE table_schema IN ('\''public'\'', '\''common'\'', '\''pms'\'', '\''dms'\'', '\''sns'\'', '\''crm'\'')
     GROUP BY table_schema
     ORDER BY table_schema;
  "' 2>&1 | redact
  docker exec ssoo-postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "
    SELECT migration_name, finished_at, rolled_back_at
      FROM public._prisma_migrations
     ORDER BY started_at;
  "' 2>&1 | redact
fi

echo "[ci-diagnose] completed"
