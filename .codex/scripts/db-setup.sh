#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

DB_URL="${DATABASE_URL:-postgresql://ssoo:ssoo_dev_pw@localhost:5432/ssoo_dev?schema=public}"
COREPACK_HOME="${COREPACK_HOME:-/tmp/corepack}"
SERVICE_NAME="${DB_SERVICE_NAME:-postgres}"
DB_USER="${POSTGRES_USER:-ssoo}"
DB_NAME="${POSTGRES_DB:-ssoo_dev}"

echo "[db-setup] starting postgres"
docker compose up -d "$SERVICE_NAME"

echo "[db-setup] waiting for postgres health"
until docker compose exec -T "$SERVICE_NAME" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; do
  sleep 2
done

echo "[db-setup] prisma generate"
env DATABASE_URL="$DB_URL" COREPACK_HOME="$COREPACK_HOME" \
  corepack pnpm --filter @ssoo/database db:generate

echo "[db-setup] prisma db push"
env DATABASE_URL="$DB_URL" COREPACK_HOME="$COREPACK_HOME" \
  corepack pnpm --filter @ssoo/database db:push

echo "[db-setup] seed data"
bash .codex/scripts/db-seed.sh

echo "[db-setup] apply triggers"
env DATABASE_URL="$DB_URL" COREPACK_HOME="$COREPACK_HOME" \
  corepack pnpm --filter @ssoo/database exec ts-node --project tsconfig.json scripts/apply-triggers.ts

echo "[db-setup] complete"
