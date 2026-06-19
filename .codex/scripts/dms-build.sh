#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

rm -rf apps/web/dms/.next apps/web/dms/tsconfig.tsbuildinfo
pnpm --filter @ssoo/types build
pnpm --filter @ssoo/web-ui build
pnpm --filter @ssoo/web-auth build
pnpm --filter @ssoo/web-shell build

if pnpm -C apps/web/dms run build; then
  exit 0
fi

echo "[dms-build] Clean DMS build failed; retrying once without re-cleaning generated Next artifacts." >&2
pnpm -C apps/web/dms run build
