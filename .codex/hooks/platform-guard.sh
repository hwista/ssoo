#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"
pnpm run codex:verify-sync
pnpm run verify:gitlab-pipeline
# Keep the richer DMS owner contracts; extend the final build/test gate to every
# deployable application instead of renaming DMS checks and losing coverage.
pnpm run codex:dms-guard
pnpm exec turbo build --filter=server --filter=web-admin --filter=web-crm --filter=web-pms --filter=web-dms --filter=web-sns --concurrency=1
pnpm run test:server
echo '[platform-guard] server and Admin/CRM/PMS/DMS/SNS passed'
