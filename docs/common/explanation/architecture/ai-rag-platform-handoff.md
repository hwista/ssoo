# AI/RAG Platform Handoff

> Last updated: 2026-06-23
> Status: active, implementation progress 66%
> Next selected work: `AI-RAG-10A Runtime smoke and runbook`

This document is the handoff point for continuing the AI/RAG commonization workstream without reconstructing the previous session history.

## Current Status

The AI/RAG platform work is no longer only a schema or roadmap baseline. The current implementation has a common AI data plane, common retrieval, DMS reference projection, DMS Ask common retrieval consumption, conversation/run audit, and a common model gateway for DMS Ask.

Completed in the current slice:

- `AI-RAG-05A` common Azure embedding provider foundation.
- `AI-RAG-05B` chunk diff and `cm_ai_embedding_m` upsert.
- `AI-RAG-05C` embedding job safety metadata and retry/backoff policy.
- `AI-RAG-06A` common retrieval query service with vector search, keyword fallback, hybrid ranking, and ACL pre-filter.
- `AI-RAG-06B` retrieval log, context item, citation assembly, and logged-context `ragReady` gate.
- `AI-RAG-07A` common conversation/message/reference/run/run-source service and controller.
- `AI-RAG-07B` DMS Ask common retrieval and run audit migration.
- `AI-RAG-07C` common model gateway integration for DMS Ask.

The platform remains not production-ready until runtime smoke proves DB migration, DMS reindex, common retrieval, and DMS Ask audit behavior against a live Docker stack.

## Source Of Truth

Primary roadmap and progress accounting:

- `docs/common/explanation/architecture/ai-rag-platform-roadmap.md`
- `docs/CHANGELOG.md`
- `scripts/verify-ai-rag-platform.mjs`

Common data plane:

- `packages/database/prisma/schema.prisma`
- `packages/database/prisma/migrations/20260623053000_add_common_ai_rag_platform/migration.sql`
- `packages/database/prisma/triggers/63_cm_ai_source_h_trigger.sql`
- `packages/database/prisma/triggers/64_cm_ai_object_h_trigger.sql`
- `packages/database/prisma/triggers/65_cm_ai_index_state_h_trigger.sql`
- `packages/database/scripts/apply-triggers.ts`

Shared contracts:

- `packages/types/src/common/ai.ts`
- `packages/types/src/common/ai-index.ts`
- `packages/types/src/common/ai-retrieval.ts`
- `packages/types/src/common/index.ts`
- `packages/types/src/index.ts`

Server implementation:

- `apps/server/src/modules/common/ai-index/ai-index.module.ts`
- `apps/server/src/modules/common/ai-index/ai-azure-provider.ts`
- `apps/server/src/modules/common/ai-index/ai-embedding-provider.service.ts`
- `apps/server/src/modules/common/ai-index/ai-indexing.service.ts`
- `apps/server/src/modules/common/ai-index/ai-retrieval.service.ts`
- `apps/server/src/modules/common/ai-index/ai-conversation.service.ts`
- `apps/server/src/modules/common/ai-index/ai-model-gateway.service.ts`
- `apps/server/src/modules/common/ai-index/ai-index.controller.ts`

DMS reference integration:

- `apps/server/src/modules/dms/search/dms-ai-index.adapter.ts`
- `apps/server/src/modules/dms/search/search.service.ts`
- `apps/server/src/modules/dms/search/search.module.ts`
- `apps/server/src/modules/dms/ask/ask.service.ts`
- `apps/server/src/modules/dms/ask/ask.module.ts`

## Behavioral Baseline

DMS Ask now follows this order:

1. Normalize DMS Ask request and messages.
2. Use `AiRetrievalService.retrieve()` scoped to `sourceApp: 'dms'` and `entityTypes: ['document']`.
3. Convert common retrieval `contextItems`, `citations`, and readable results into the existing DMS Ask response shape.
4. Preserve legacy DMS `SearchService` vector/keyword path as fallback when common retrieval is empty or unavailable.
5. Start common conversation/message/run audit before model execution.
6. Generate or stream through `AiModelGatewayService`, not DMS `getChatModel()`.
7. Record provider/model/deployment metadata from the gateway status into run audit metadata.
8. Complete run audit as `succeeded`, `failed`, or `cancelled`.

The existing DMS Ask JSON and stream response shape is intentionally unchanged.

## Verification Evidence

Source and build gates passed on 2026-06-23:

- `pnpm run codex:preflight`
- `pnpm run verify:ai-rag-platform`
- `pnpm run build:server`
- `pnpm run codex:verify-sync`
- `pnpm run codex:dms-guard`

Docker rebuild evidence:

- A plain `pnpm docker:build` can fail on this WSL/Docker Desktop environment because the local Docker config uses `credsStore: desktop.exe`, and the credential helper can fail with `UtilAcceptVsock: accept4 failed 110`.
- The verified workaround is:

```bash
mkdir -p /tmp/ssoo-docker-no-creds
env DOCKER_CONFIG=/tmp/ssoo-docker-no-creds docker compose build
```

Using that workaround, these images were rebuilt successfully:

- `ssoo-server`
- `ssoo-dms`
- `ssoo-pms`
- `ssoo-crm`
- `ssoo-sns`
- `ssoo-admin`
- `ssoo-db-init`

Known non-blocking warning:

- Several Next.js builds print stale Browserslist data warnings. Treat this as dependency maintenance, not as an AI/RAG blocker.

## Remote Publish Procedure

The repository currently uses:

- GitHub `origin`: `main`
- GitLab `gitlab`: workspace branch `development`

Use this sequence when publishing:

1. `git fetch origin`
2. If `origin/main` has new commits, merge them locally before push and rerun Docker verification.
3. Commit the current workspace.
4. Run `pnpm run codex:push-guard`.
5. Run `pnpm run codex:workspace-publish`.

`codex:workspace-publish` pushes GitHub first and then pushes GitLab `development` with the GitLab credentials stored in local config or environment. If GitLab `development` cannot fast-forward to local `HEAD`, the script aborts before publishing and instructs the operator to run:

```bash
pnpm run codex:workspace-sync-from-gitlab
```

After a GitLab sync merge, rerun validation and Docker rebuild before publishing again.

## Immediate Next Work

Start `AI-RAG-10A Runtime smoke and runbook`.

Recommended scope:

- Apply DB migration and triggers against the Docker Postgres runtime.
- Run or document DMS common AI reindex steps.
- Execute common retrieval query against `sourceApp: 'dms'`.
- Exercise DMS Ask JSON and stream minimal paths.
- Confirm `cm_ai_retrieval_log_m`, `cm_ai_retrieval_log_item_m`, `cm_ai_conversation_m`, `cm_ai_message_m`, `cm_ai_run_m`, and `cm_ai_run_source_r` rows are written as expected.
- Document provider-unavailable behavior when Azure OpenAI credentials are not present.

Do not start CRM/PMS/SNS/Admin adapter expansion until the runtime smoke and runbook are fixed.

## Changelog

| Date | Change |
| --- | --- |
| 2026-06-23 | Added AI/RAG handoff after completing DMS Ask common retrieval/run audit and common model gateway integration. |
