#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR/apps/web/dms"

# pnpm 환경에서 npm 실행 시 전달되는 일부 설정 키가 npm 경고를 유발한다.
unset npm_config_npm_globalconfig || true
unset npm_config_verify_deps_before_run || true
unset npm_config__jsr_registry || true

npm run build
