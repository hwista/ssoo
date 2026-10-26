#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
source scripts/storage/windows-gate.sh
storage_windows_gate
exec 9>"${CI_APP_LOCK_FILE:-/tmp/ssoo-app-runtime.lock}"
flock -w "${CI_APP_LOCK_TIMEOUT_SECONDS:-7200}" 9
storage_windows_gate
exec node scripts/storage/docker-job.mjs "$@"
