#!/usr/bin/env bash
set -euo pipefail
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "CREATE SCHEMA IF NOT EXISTS deployment_fixture; CREATE TABLE IF NOT EXISTS deployment_fixture.events (id bigserial PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now(), outcome text NOT NULL);"
if [[ "${FIXTURE_DB_FAIL:-false}" == true ]]; then
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "INSERT INTO deployment_fixture.events(outcome) VALUES ('partial-failure');"
  exit 27
fi
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "INSERT INTO deployment_fixture.events(outcome) VALUES ('applied');"
