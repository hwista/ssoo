# AI/RAG Runtime Smoke Runbook

> Last updated: 2026-07-20
> Scope: Docker Postgres runtime proof for common AI/RAG data plane, DMS reference adapter, registered source coverage, retrieval, and DMS Ask audit

## Purpose

이 runbook은 AI/RAG 공용화가 문서/빌드 수준이 아니라 실제 runtime에서 동작하는지 확인하는 기준이다.

검증 대상은 다음 순서다.

1. DB compat/schema path
2. trigger apply
3. DMS 저장 지점의 common projection sync
4. common AI index job run
5. common retrieval query
6. DMS Ask JSON path
7. retrieval/conversation/run audit row

## DB Init Modes

`scripts/db-init-entrypoint.sh`는 DB 상태에 따라 launch migration 경로와 pre-baseline 호환 경로를 분리한다.

- application table이 없는 새 DB 또는 `_prisma_migrations`에 `0_launch_baseline` 기록이 있는 DB는 `pnpm db:migrate:deploy`를 실행한다. 실패/미완료 기록도 legacy 경로로 우회하지 않고 Prisma가 명시적으로 보고하게 한다.
- application table은 있지만 launch baseline이 없는 기존 volume만 아래 `DB_INIT_PRISMA_PUSH_MODE` 호환 경로를 사용한다.
- 새 DB의 재현성은 `pnpm db:baseline:verify`로 일회용 DB에서 검증한다.
- launch-managed DB는 seed/trigger 쓰기 전에 `pnpm db:runtime:verify -- --phase=schema`를 실행하고, trigger 적용 후 기본 full phase를 다시 실행해 migration checksum, native contract, 전체 trigger, pending migration, schema drift 0을 읽기 전용으로 검증한다.

| Baseline mode | Behavior | Use case |
| --- | --- | --- |
| `compat` | 기본 로컬 동작. pre-baseline DB에 기존 비파괴 호환 경로를 제공하지만 release-ready 증거로 인정하지 않는다. | 기존 로컬 Docker volume |
| `strict` | pre-baseline DB를 어떤 patch/seed보다 먼저 거부한다. | `compose.production.yaml`, 운영/릴리스 |

| Mode | Behavior | Use case |
| --- | --- | --- |
| `auto` | 기본값. compat SQL을 먼저 적용한 뒤 pre-roadmap `common.cm_ai_*` legacy 컬럼이 감지되면 destructive column drop을 피하기 위해 `prisma db push`를 건너뛴다. | 기존 로컬 Docker volume, 개발자 DB |
| `force` | legacy AI/RAG 컬럼이 있어도 guarded `prisma db push`를 실행한다. `--accept-data-loss`는 붙이지 않는다. | 폐기 가능한 로컬 DB를 백업/검토한 뒤 Prisma reconciliation 실패 여부를 직접 확인할 때 |
| `skip` | `prisma db push`를 무조건 건너뛰고 seed/trigger만 적용한다. | schema가 별도 절차로 적용된 pre-baseline 로컬 복구 DB |

기준:

- `prisma db push --accept-data-loss`는 이 workstream의 DB init 경로에서 사용하지 않는다.
- `prisma db push`는 pre-baseline 호환 경로에만 남기며 새 DB와 launch-managed DB의 배포 이력을 대체하지 않는다.
- 호환 경로의 `db push`도 local/compose host와 폐기 가능한 개발 DB 이름에서만 실행되고 production/strict mode에서는 거부된다.
- legacy AI/RAG 컬럼은 삭제하지 않고 `packages/database/prisma/compat/20260623_ai_rag_legacy_backfill.sql`로 canonical runtime column/table/default/index를 추가한다.
- `db-init`은 seed 전에 non-destructive protected baseline migration을 적용한다. 2026-07-03 기준 포함 대상은 CRM opportunity ledger migration이며, `auto` 모드에서 `prisma db push`를 건너뛰어도 CRM seed가 요구하는 원장 테이블을 먼저 만든다.
- `auto` 모드가 `db push`를 건너뛰더라도 seed와 trigger apply는 계속 실행한다.
- compat SQL이 legacy 컬럼(`snapshot_json`, `ranker_code`, `metadata_json` 등)을 읽거나 변경할 때는 `information_schema.columns`로 존재를 확인한 뒤 `EXECUTE`로 실행한다. legacy 컬럼이 없는 기존 DB에서도 `psql ON_ERROR_STOP` 실패(`exit 3`) 없이 통과해야 한다.
- protected baseline migration 직후 `compat/post-baseline/normalize_protected_primary_keys.sql`이 이 migration들이 만든 `pk_<table>` 기본키를 Prisma schema·launch baseline 정본 이름 `<table>_pkey`로 맞춘다. Prisma `db push`가 기본키 이름 변경을 다른 `ALTER TABLE` 동작과 한 문장으로 생성해 PostgreSQL이 거부하기 때문이다. schema에서 `map: "pk_..."`로 명시한 `crm_contract_approval_h`, `dm_user_document_activity_h`, `pr_user_settings_h`는 제외한다.
- 기존 DB에는 이전 버전 history trigger가 남아 있으므로 호환 경로는 seed 전에 `apply_all_triggers.sql`을 한 번 더 적용해, 새 NOT NULL history 컬럼을 모르는 trigger가 seed 이력 행을 쓰다 실패하지 않게 한다.
- 호환 경로 변경은 배포 전 WSL/로컬 PostgreSQL에서 배포 중인 commit의 `schema.prisma`·seed·trigger로 DB를 만든 뒤 현재 `db-init`을 두 번 연속 실행해 `✅ complete`와 재실행 안전성을 확인한다.

## AI Index Worker Scheduler

공용 AI index worker는 기본 비활성화 상태다. 운영 환경에서 server process 내부 scheduler를 사용할 때만 다음 값을 명시한다.

| Env | Default | Behavior |
| --- | --- | --- |
| `AI_INDEX_WORKER_ENABLED` | `false` | `true`/`1`/`yes`/`on`일 때만 내부 scheduler가 pending job을 주기 실행한다. |
| `AI_INDEX_WORKER_INTERVAL_MS` | `60000` | worker 실행 간격. 최소 5000ms, 최대 3600000ms로 제한된다. |
| `AI_INDEX_WORKER_BATCH_LIMIT` | `20` | 한 번에 실행할 pending job 수. 1~100 범위로 제한된다. |
| `AI_INDEX_WORKER_RUN_ON_START` | `false` | scheduler enable 시 server 시작 직후 첫 run을 수행할지 결정한다. |

운영 선택 기준:

- server 내부 scheduler를 쓰면 `AiIndexSchedulerService`가 `AiIndexWorkerService.runPendingJobs()`를 주기 호출한다.
- 외부 scheduler를 쓰면 `AI_INDEX_WORKER_ENABLED=false`를 유지하고 system-override/admin credential로 `POST /ai-index/jobs/run`을 호출한다.
- `/ai-index/jobs/scheduler`는 현재 scheduler 설정과 마지막 실행 상태를 반환한다.
- `/ai-index/jobs/metrics`는 runnable/pending/running/failed/exhausted/retry-waiting queue 상태를 반환한다.
- provider-ready 증거 전에는 scheduler를 켜도 vector/RAG production readiness로 보지 않는다. embedding provider가 unavailable이면 stale/fallback path가 정상 동작이다.

## Provider-Unavailable Smoke

외부 embedding deployment가 없거나 placeholder인 환경은 정상 검증 대상이다.

필수 기대값:

- `/ai-index/status?sourceApp=dms`에서 `semantic`, `vector`, `ragContext` capability가 false다.
- `/ai-index/status` 전체 조회와 runtime report `sourceCoverage`에서 DMS/CRM/PMS/SNS source가 `registered`, Admin planned source가 `missing_adapter`로 표시된다.
- DMS 문서 저장 후 `common.cm_ai_object_m`, `common.cm_ai_chunk_m`, `common.cm_ai_index_state_m` row가 생긴다.
- `common.cm_ai_index_state_m.index_status_code`는 stale 계열로 남는다.
- `common.cm_ai_embedding_m` active row는 0이다.
- `/ai-index/retrieval/query`는 retrieval log header와 item audit row를 남긴다.
- `/dms/ask`는 legacy fallback을 유지하면서 common conversation/run audit row를 남긴다.

실행:

```bash
DATABASE_URL=postgresql://ssoo:ssoo_dev_pw@127.0.0.1:5432/ssoo_dev?schema=public \
AI_RAG_SMOKE_REPORT_PATH=output/ai-rag-runtime-smoke-unavailable.json \
AI_RAG_SMOKE_PROVIDER_MODE=unavailable \
pnpm run verify:ai-rag-runtime
```

report 검증:

```bash
pnpm run verify:ai-rag-runtime-report -- \
  --provider-mode=unavailable \
  --path=output/ai-rag-runtime-smoke-unavailable.json \
  --summary-path=output/ai-rag-runtime-smoke-unavailable.md
```

반복 실행 시 smoke script는 기본 DMS fixture path를 `verify-ai-rag/runtime-smoke-*.md`로 생성해 이전 실패 run과 격리한다. 2026-07-02 재검증에서는 `verify-ai-rag/runtime-smoke-2026-07-02T04-05-56-006Z.md` fixture로 DMS 저장, common job, retrieval query, DMS Ask audit path, DB row 검증이 통과했다.

## Legacy Local DB Repair

이미 실행 중인 `ssoo-postgres` volume에 pre-roadmap `common.cm_ai_*` WIP table이 남아 있으면 다음 절차로 destructive reset 없이 정렬한다.

```bash
docker cp packages/database/prisma/compat/20260623_ai_rag_legacy_backfill.sql \
  ssoo-postgres:/tmp/20260623_ai_rag_legacy_backfill.sql
docker exec ssoo-postgres psql -U ssoo -d ssoo_dev -v ON_ERROR_STOP=1 \
  -f /tmp/20260623_ai_rag_legacy_backfill.sql

docker cp packages/database/prisma/triggers/. ssoo-postgres:/tmp/ssoo-triggers
docker exec ssoo-postgres psql -U ssoo -d ssoo_dev -v ON_ERROR_STOP=1 \
  -f /tmp/ssoo-triggers/apply_all_triggers.sql
```

Compose `db-init` 경로에서는 `DB_INIT_BASELINE_MODE=compat`인 launch baseline 없는 기존 volume에 한해 같은 판단을 `DB_INIT_PRISMA_PUSH_MODE=auto`가 수행한다. 운영 overlay는 `DB_INIT_BASELINE_MODE=strict`를 고정한다. 새 DB와 launch-managed DB는 `pnpm db:migrate:deploy` 후 seed/trigger와 `pnpm db:runtime:verify`를 적용한다. 기존 pre-baseline DB를 launch history로 전환하려면 백업과 검토 후 schema drift 0 상태에서만 `DB_BASELINE_RESOLVE_CONFIRM=0_launch_baseline`을 명시한 `pnpm db:baseline:resolve`를 사용한다.

## Provider-Ready Smoke

운영 embedding model/deployment가 확정된 환경에서만 수행한다.

필수 환경:

- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_EMBEDDING_DEPLOYMENT`
- `AZURE_OPENAI_API_KEY` 또는 Entra credential (`AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`)
- Managed Identity를 provider-ready credential로 쓰는 경우 `AZURE_USE_MANAGED_IDENTITY=true`를 명시한다. user-assigned identity는 `AZURE_MANAGED_IDENTITY_CLIENT_ID`도 함께 둔다.
- 필요 시 `AZURE_OPENAI_EMBEDDING_DIMENSION`
- DMS Ask까지 검증하려면 `AZURE_OPENAI_CHAT_DEPLOYMENT` 또는 `AZURE_OPENAI_DEPLOYMENT`

환경 사전 점검:

```bash
pnpm run verify:ai-rag-runtime:ready-precheck
```

이 명령은 `--dry-run --provider-mode=ready --check-provider-env`를 감싼다. Azure OpenAI endpoint, embedding deployment, credential 입력이 smoke runner 환경에 없거나 placeholder이면 실패한다. Managed Identity는 `AZURE_USE_MANAGED_IDENTITY=true`가 명시된 경우에만 credential로 인정한다. 실제 server process와 smoke runner 환경을 의도적으로 분리한 경우에만 `AI_RAG_SMOKE_CHECK_PROVIDER_ENV=false`를 사용한다.

실행:

```bash
DATABASE_URL=postgresql://ssoo:ssoo_dev_pw@127.0.0.1:5432/ssoo_dev?schema=public \
AI_RAG_SMOKE_REPORT_PATH=output/ai-rag-runtime-smoke-ready.json \
pnpm run verify:ai-rag-runtime:ready
```

report 검증:

```bash
pnpm run verify:ai-rag-runtime-report -- \
  --provider-mode=ready \
  --path=output/ai-rag-runtime-smoke-ready.json \
  --summary-path=output/ai-rag-runtime-smoke-ready.md
```

roadmap/handoff evidence 기록:

```bash
pnpm run record:ai-rag-provider-ready-evidence -- \
  --report=output/ai-rag-runtime-smoke-ready.json \
  --summary=output/ai-rag-runtime-smoke-ready.md
```

단일 완료 runner:

```bash
pnpm run complete:ai-rag-central-foundation
```

이 runner는 `verify:ai-rag-runtime:ready-precheck` -> `verify:ai-rag-runtime:ready` -> `verify:ai-rag-runtime-report` -> `record:ai-rag-provider-ready-evidence` -> `verify:ai-rag-central-foundation:complete` 순서로 실행한다. 기본 경로는 live provider-ready smoke를 건너뛰지 않으므로 실제 server/Docker Postgres/Azure OpenAI embedding 환경이 필요하다.

검증 VM에서 Azure OpenAI 값을 shell env가 아니라 별도 env file로 주입해야 하면 `--env-file=<path>` 또는 `AI_RAG_PROVIDER_READY_ENV_FILE=<path>`를 사용한다. runner는 해당 파일을 provider-ready precheck/live smoke 환경에 병합하고, Docker runtime mode에서는 `docker compose --env-file <path>`로 같은 파일을 compose interpolation에도 전달한다. shell env 값이 env file보다 우선한다.

로컬 또는 운영 검증 VM에서 runner가 Docker server runtime까지 관리하게 하려면 opt-in으로 다음을 사용한다. 이 경로는 `docker compose up -d --build server` 후 `/api/health`를 기다린 뒤 provider-ready smoke를 실행하고, `--docker-runtime-cleanup`이 있을 때만 `docker compose down --remove-orphans`로 정리한다. 볼륨 삭제는 하지 않는다.

```bash
pnpm run complete:ai-rag-central-foundation -- \
  --env-file=.env.provider-ready \
  --docker-runtime \
  --docker-runtime-cleanup
```

이미 `.github/workflows/ai-rag-runtime.yml` provider-ready artifact를 내려받은 환경에서 report/summary 검증과 docs evidence 기록만 재실행할 때는 다음처럼 명시적으로 artifact-only 모드를 쓴다.

```bash
pnpm run complete:ai-rag-central-foundation -- \
  --use-existing-artifacts \
  --report=output/ai-rag-runtime-smoke-ready.json \
  --summary=output/ai-rag-runtime-smoke-ready.md
```

workflow나 PR 검증처럼 docs 파일을 쓰면 안 되는 환경에서는 artifact-only dry-run으로 evidence block artifact만 생성한다. 이 모드는 central completion gate를 통과했다고 주장하지 않고, report/summary와 evidence block 생성 가능성만 확인한다.

```bash
pnpm run complete:ai-rag-central-foundation -- \
  --use-existing-artifacts \
  --dry-run \
  --report=output/ai-rag-runtime-smoke-ready.json \
  --summary=output/ai-rag-runtime-smoke-ready.md \
  --evidence-block-path=output/ai-rag-provider-ready-evidence-ready.md
```

provider-ready 통과 기준:

- DMS source capability가 semantic/vector/RAG capable로 올라간다.
- `common.cm_ai_embedding_m`에 active embedding row가 생성된다.
- retrieval query가 `cm_ai_embedding_m` vector path를 사용할 수 있다.
- `common.cm_ai_retrieval_log_m` header와 `common.cm_ai_retrieval_log_item_m` item audit가 `retrievalLogId` 기준으로 기록된다.
- DMS Ask response source/citation/context assembly와 run-source audit가 common retrieval 결과를 참조한다.
- DMS Ask 성공 시 `common.cm_ai_run_m` run audit와 `common.cm_ai_run_source_r.included_in_prompt=true` source audit가 기록된다.
- `verifyLegacyCommonRetrievalComparison`이 같은 DMS fixture에 대해 legacy `dms_document_embeddings` chunk와 common retrieval result/context를 비교하고 query needle 포함 여부를 확인한다.
- `AI_RAG_SMOKE_REPORT_PATH`가 지정되면 provider mode, DMS fixture, DMS source capability, planned source coverage, retrieval summary, DB row counts, audit counts, legacy/common comparison summary를 JSON report로 남긴다.
- 생성된 JSON report는 `pnpm run verify:ai-rag-runtime-report`로 schema/version/provider mode/source capability/planned source coverage/retrieval audit/Ask audit/legacy-common comparison evidence를 검증한다.
- `--summary-path`를 지정하면 검증된 report에서 Markdown evidence summary를 생성한다. provider-ready 결과를 roadmap/handoff에 기록할 때는 이 summary를 사람이 읽는 증거로 사용한다.

central foundation 100% completion gate:

```bash
pnpm run verify:ai-rag-central-foundation:complete -- \
  --provider-ready-report=output/ai-rag-runtime-smoke-ready.json \
  --provider-ready-summary=output/ai-rag-runtime-smoke-ready.md
```

이 gate는 service rollout backlog를 completion denominator에서 제외하고, provider-ready runtime report가 DMS source capability, common embedding row, common retrieval `ragReady`, Ask run-source audit, legacy/common comparison을 증명할 때만 통과한다. 직접 실행하더라도 먼저 `verify:ai-rag-runtime-report --provider-mode=ready` 기준으로 JSON report와 Markdown summary를 재검증한 뒤, `record:ai-rag-provider-ready-evidence`가 roadmap/handoff에 남긴 digest 기록까지 함께 검증한다. report 없이 실행하면 실패해야 정상이다.

## Legacy DMS Vector Store Transition

DMS의 기존 `dms_document_embeddings` store와 `loadLegacySearchContext` fallback은 provider-ready 증거가 없는 상태에서 삭제하지 않는다. 이 store는 common AI/RAG path가 운영 embedding profile로 증명될 때까지 rollback surface다.

전환 시작 조건:

- `.github/workflows/ai-rag-runtime.yml`을 `provider_mode=ready`로 수동 실행해 실제 Azure OpenAI embedding deployment 환경에서 green 결과를 확보한다.
- `/ai-index/status?sourceApp=dms`에서 DMS source capability의 `semantic`, `vector`, `ragContext`가 true로 올라간다.
- provider-ready smoke에서 DMS fixture 기준 `common.cm_ai_embedding_m` active row가 0보다 크고, retrieval query가 common vector path와 retrieval log item audit를 남긴다.
- DMS Ask JSON path가 common retrieval context를 응답 source/citation으로 사용하고, `common.cm_ai_run_source_r.included_in_prompt=true` row를 남긴다.
- provider-ready smoke의 `verifyLegacyCommonRetrievalComparison` 결과로 common retrieval result/context와 legacy `dms_document_embeddings` chunk가 같은 DMS fixture를 가리키는지 확인한다. 이후 대표 DMS 문서군으로 drift, 누락, 권한 redaction 차이를 추가 기록한다.

전환 순서:

1. `dms_document_embeddings` write path와 `loadLegacySearchContext` fallback은 그대로 둔 채 common retrieval을 기본 read path로 유지한다.
2. provider-ready workflow 결과와 legacy 비교 결과를 roadmap/handoff에 기록한다.
3. 운영 관찰 기간 동안 common retrieval 누락/오류가 없으면 legacy read fallback을 feature flag나 설정으로 비활성화한다.
4. 최소 한 release window 뒤 archival/drop 계획을 별도 migration으로 낸다. 즉시 `DROP TABLE dms_document_embeddings`나 fallback 삭제를 하지 않는다.

Rollback:

- common source capability 또는 embedding provider env를 unavailable 상태로 되돌리면 DMS Ask는 `loadLegacySearchContext` fallback을 계속 사용할 수 있어야 한다.
- rollback 중에도 `dms_document_embeddings` table, legacy SearchService vector query, DMS Ask fallback branch는 보존한다.

금지:

- provider-ready workflow green과 비교 결과 기록 전에는 `dms_document_embeddings`, legacy vector write path, `loadLegacySearchContext`를 제거하지 않는다.
- legacy store 전환은 삭제 작업이 아니라 `parallel read/write -> common default -> legacy read disable -> archival/drop` 순서의 운영 전환으로 취급한다.

## Guard Policy

`pnpm run verify:ai-rag-platform`은 구조/문서/정적 계약 guard다. AI/RAG 관련 파일이 바뀌면 `pnpm run codex:preflight`와 `pnpm run codex:push-guard`가 이 guard를 자동 실행한다.

Docker runtime proof는 `pnpm run verify:ai-rag-runtime`로 별도 실행한다. 이 live smoke는 실행 중인 server와 Docker Postgres, 그리고 provider-ready 모드에서는 실제 Azure OpenAI embedding 설정이 필요하므로 정적 preflight에 직접 묶지 않는다.

provider-ready CI/운영 gate는 `.github/workflows/ai-rag-runtime.yml`로 고정한다. 이 workflow는 수동 `workflow_dispatch` 전용이며, `provider_mode=ready`로 실행하면 `pnpm run complete:ai-rag-central-foundation -- --docker-runtime --docker-runtime-cleanup --dry-run`이 Azure OpenAI endpoint/deployment/credential precheck, Docker server stack start, `/api/health` 대기, provider-ready live smoke, report 검증, evidence block artifact 생성을 같은 runner 경로로 수행한다. 검증 runner는 로컬 검증 profile인 `compose.yaml + compose.local.yaml`을 명시하며, root `.env`, shell env, 또는 runner `--env-file`의 Azure 값을 server process와 smoke runner에 같은 기준으로 전달한다. 실제 공개 배포는 이 로컬 profile이 아니라 검증된 `.env.production + compose.production.yaml`을 사용한다. `provider_mode=unavailable`은 별도 Docker stack에서 fallback/stale 경로를 재검증할 때만 사용한다.
workflow의 server `.env` 작성 단계는 provider mode별로 분리한다. `provider_mode=ready`일 때만 Azure OpenAI secret을 server process에 주입하고, `provider_mode=unavailable`일 때는 `<embedding-deployment>` placeholder와 빈 credential을 주입해 repository secret 존재 여부와 무관하게 fallback/stale path를 검증한다.
workflow는 `AI_RAG_SMOKE_REPORT_PATH=output/ai-rag-runtime-smoke-${provider_mode}.json`과 `AI_RAG_SMOKE_SUMMARY_PATH=output/ai-rag-runtime-smoke-${provider_mode}.md`를 지정한다. `provider_mode=ready`에서는 completion runner가 report JSON 검증, Markdown summary 생성, `output/ai-rag-provider-ready-evidence-ready.md` dry-run evidence block artifact 생성을 모두 수행한다. `provider_mode=unavailable`에서는 workflow가 `pnpm run verify:ai-rag-runtime-report`를 별도로 실행해 fallback/stale smoke report와 summary를 생성한다. provider-ready green 증거는 workflow status, 검증된 JSON report, Markdown summary artifact, evidence block artifact를 함께 기준으로 삼는다.

AI-RAG-10A 완료 판정은 다음 두 조건을 모두 만족해야 한다.

- provider-unavailable smoke가 로컬 Docker Postgres에서 반복 가능하다.
- `.github/workflows/ai-rag-runtime.yml`의 `provider_mode=ready` run이 실제 embedding deployment 환경에서 통과하고, legacy `dms_document_embeddings` 전환 비교 결과가 검증된 Markdown summary 기준으로 `record:ai-rag-provider-ready-evidence`를 통해 roadmap/handoff에 기록된다.

## Changelog

| Date | Change |
| --- | --- |
| 2026-07-03 | Added `--env-file` / `AI_RAG_PROVIDER_READY_ENV_FILE` support to `complete:ai-rag-central-foundation` and exposed Azure OpenAI interpolation in `compose.yaml` for provider-ready verification hosts. |
| 2026-07-03 | Routed provider-ready workflow live smoke through `complete:ai-rag-central-foundation -- --docker-runtime --docker-runtime-cleanup --dry-run` so CI and local closeout share the same provider-ready runner |
| 2026-07-03 | Added opt-in `--docker-runtime` / `--docker-runtime-cleanup` support to the central completion runner so provider-ready closeout can start and health-check the Docker server runtime |
| 2026-07-03 | Routed provider-ready workflow evidence block generation through `complete:ai-rag-central-foundation -- --use-existing-artifacts --dry-run` |
| 2026-07-03 | Added `complete:ai-rag-central-foundation` to run provider-ready precheck, live smoke, report verification, evidence recording, and central completion gate in one ordered flow |
| 2026-07-03 | Extended provider-ready evidence recorder self-test to run a temp report/summary/evidence-block/docs-digest flow through the runtime and central completion verifiers |
| 2026-07-03 | Provider-ready workflow now dry-runs evidence recording and uploads the generated evidence block artifact |
| 2026-07-03 | Wired `verify:ai-rag-evidence-recorder` self-test into AI/RAG preflight and push guard checks |
| 2026-07-03 | Added `record:ai-rag-provider-ready-evidence` so provider-ready report and summary digests are recorded before central completion |
| 2026-07-03 | Provider-ready precheck now requires explicit `AZURE_USE_MANAGED_IDENTITY=true` before accepting Managed Identity as a credential |
| 2026-07-03 | Added central foundation completion gate with `verify:ai-rag-central-foundation:complete` |
| 2026-07-03 | Added AI index worker scheduler env policy and scheduler/metrics operations surfaces |
| 2026-07-02 | Runtime smoke JSON/Markdown evidence now expects DMS/CRM/PMS/SNS registered source coverage and Admin `missing_adapter` row |
| 2026-07-02 | Runtime smoke JSON/Markdown evidence introduced planned source coverage validation |
| 2026-07-02 | Runtime smoke report verifier now writes Markdown evidence summaries for workflow artifacts and handoff recording |
| 2026-07-02 | Runtime smoke report verifier command added and wired into the manual workflow before artifact upload |
| 2026-07-02 | Runtime smoke report JSON and GitHub Actions artifact upload criteria added |
| 2026-07-02 | Provider-ready runtime smoke now enforces legacy/common retrieval comparison for the DMS fixture |
| 2026-07-02 | Legacy `dms_document_embeddings` transition criteria, rollback rule, and provider-mode-separated workflow env policy added |
| 2026-07-02 | Provider-ready CI/운영 gate를 `.github/workflows/ai-rag-runtime.yml` 수동 workflow와 전용 package script 기준으로 고정 |
| 2026-07-02 | Provider-unavailable smoke를 강화된 retrieval log item audit 기준으로 재통과한 증거를 추가 |
| 2026-07-02 | Runtime smoke가 provider-ready mode에서도 retrieval log item과 DMS Ask run-source audit를 검증하도록 기준 추가 |
| 2026-07-02 | Provider-ready smoke 전 Azure OpenAI env precheck와 dry-run readiness 출력 기준 추가 |
| 2026-07-02 | AI/RAG platform 정적 verifier를 Codex preflight/push guard의 AI/RAG 변경 경로에 연결 |
| 2026-07-02 | Provider-unavailable/ready smoke, legacy DB init mode, local repair, guard policy 기준을 최초 정리 |
