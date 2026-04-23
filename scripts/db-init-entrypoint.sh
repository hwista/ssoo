#!/usr/bin/env bash
# DB Init Entrypoint
# postgres healthcheck 이후 실행되어 스키마/시드/트리거를 적용합니다.
set -euo pipefail

DB_URL="${DATABASE_URL:?DATABASE_URL is required}"
# psql은 Prisma 전용 ?schema= 파라미터를 인식하지 못하므로 제거
PSQL_URL="${DB_URL%%\?*}"
SEED_DIR="/workspace/packages/database/prisma/seeds"
TRIGGER_DIR="/workspace/packages/database/prisma/triggers"

echo "[db-init] ▶ prisma generate"
cd /workspace
pnpm --filter @ssoo/database db:generate

echo "[db-init] ▶ prisma db push"
DATABASE_URL="$DB_URL" pnpm --filter @ssoo/database db:push

echo "[db-init] ▶ applying seeds"
(cd "$SEED_DIR" && psql "$PSQL_URL" -v ON_ERROR_STOP=1 -f "apply_all_seeds.sql")

echo "[db-init] ▶ applying triggers"
(cd "$TRIGGER_DIR" && psql "$PSQL_URL" -v ON_ERROR_STOP=1 -f "apply_all_triggers.sql")

echo "[db-init] ✅ complete"
