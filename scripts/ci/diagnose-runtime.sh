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
  sed -E \
    -e 's#(postgres(ql)?://[^:/@[:space:]]+:)[^@[:space:]]+@#\1***@#g' \
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
