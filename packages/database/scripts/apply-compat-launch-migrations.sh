#!/usr/bin/env bash
# Applies launch migrations newer than the compat floor to a pre-baseline (compat) database, once each.
# A compat database has no public._prisma_migrations, so launch migrations that move or transform
# data (SET SCHEMA, backfills) would otherwise reach `prisma db push` as drop/create with data loss.
# The floor is the newest launch migration already contained in the compat schema that staging
# reached with db push (deployed 4bc0af35: 20260917100000_add_pms_user_settings).
set -euo pipefail

psql_url="${1:?usage: $0 <psql-url> <launch-migration-dir> [shim-dir]}"
launch_dir="${2:?usage: $0 <psql-url> <launch-migration-dir> [shim-dir]}"
# <shim-dir>/<migration>.sql adapts compat objects (e.g. db push index names) right before a migration.
shim_dir="${3:-}"
floor="${DB_INIT_COMPAT_LAUNCH_FLOOR:-20260917100000}"

if [[ ! "$floor" =~ ^[0-9]+$ ]]; then
  echo "[db-init] ✗ invalid DB_INIT_COMPAT_LAUNCH_FLOOR=$floor" >&2
  exit 1
fi

psql "$psql_url" -v ON_ERROR_STOP=1 -qc "
  CREATE TABLE IF NOT EXISTS public._ssoo_compat_launch_migrations (
    migration_name TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )"

for migration_dir in "$launch_dir"/*/; do
  name="$(basename "$migration_dir")"
  if [[ ! "$name" =~ ^([0-9]+)_[a-z0-9_]+$ ]] || (( BASH_REMATCH[1] <= floor )); then
    continue
  fi
  applied="$(psql "$psql_url" -v ON_ERROR_STOP=1 -tAc \
    "SELECT 1 FROM public._ssoo_compat_launch_migrations WHERE migration_name = '$name'")"
  if [[ "$applied" == 1 ]]; then
    echo "[db-init]   compat launch migration already applied: $name"
    continue
  fi
  echo "[db-init]   applying compat launch migration: $name"
  shim_args=()
  if [[ -n "$shim_dir" && -f "$shim_dir/$name.sql" ]]; then
    echo "[db-init]   with compat shim: $name.sql"
    shim_args=(-f "$shim_dir/$name.sql")
  fi
  # One transaction per migration together with its shim and record; files with their own
  # BEGIN/COMMIT are atomic on their own and the record follows right after their COMMIT.
  psql "$psql_url" -v ON_ERROR_STOP=1 --single-transaction \
    ${shim_args[@]+"${shim_args[@]}"} -f "$migration_dir/migration.sql" \
    -c "INSERT INTO public._ssoo_compat_launch_migrations (migration_name) VALUES ('$name')"
done
