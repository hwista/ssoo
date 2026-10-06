Handoff: DMS refactor & next steps

Overview
--------
This document summarizes recent progress, current state, and recommended next steps for the DMS refactor work in this repository. It is intended for a maintainer to pick up work from the CLI or another environment.

Context
-------
- Monorepo: apps/{server,web/*} + shared packages
- DMS is integrated as the canonical document store (git-backed working tree + DB metadata)
- Primary goal: refactor large files, stabilize auto-commit/publish pipeline, and add tests for core DMS logic

GitLab staging deploy recovery — 2026-09-30 (staging restored 2026-10-06)
-------------------------------------------------------------------------

Status 2026-10-06 (afternoon) — READ FIRST
- Staging is UP: pipeline #187 (`4bc0af35`) built all 7 services (first labelled build) and `deploy_dev` succeeded at 10:44 KST. 3000–3004 return 200 and `/api/health` is ok. All containers healthy and image parity verified.
- DMS readiness (`/api/health/readiness`) still returns 503 but no longer blocks startup (staging healthcheck is liveness). The diagnose run after deploy showed the DMS runtime paths are fine (NAS path absent but not required: provider local). Its Git lines were invalid (missing `safe.directory`, fixed in the follow-up commit). The remaining suspect is the `git-binding` parity check (fetch of `LSWIKI_DOC` without credentials). The DMS settings operations screen (admin, `http://10.125.12.170:3003/settings/operations/git`) shows the blocked check; read it before changing code.
- Follow-up commit (this one): `ai_review` base SHA fixed (10.4 deployments API ignores order/filter; it always used deployment #1 `1aed3585` from 5/27 and reviewed only the first 50 KB = 12 tooling files of a 10 MB diff), lockfile excluded, whole-file diffs by priority within the budget, partial coverage reported as `UNKNOWN (부분 검토 N/M)`, `allow_failure` removed. `diagnose_runtime` is now `when: on_failure` in a last `diagnose` stage (no "allowed to fail" badge, verify no longer looks unfinished). `[full build]` only counts as a standalone commit message line (the #187 commit body mentioned it inline and forced a full build). CI verify image installs jq.
- Expect the next pipeline to reuse all 7 images (no service input changed); check the build trace for `build selection built=0 reused=7`.
- Staging security follow-up: if the staging admin still uses the documented seed password (`docs/dms/guides/operations.md`), rotate it with the other WP-5 items.

Update 2026-10-06 (morning)
- State on arrival: GitLab `development` had no new commits after `2a2fbd7a`; the staging server was still fully down (3000–3004 and 4000 not responding).
- Implemented (user-approved), verified locally, pushed as `4bc0af35`:
  - `compose.staging.yaml`: server healthcheck overridden to liveness `GET /api/health`; base/production keep the readiness gate. `docker compose config` with the overlay shows only `test` replaced.
  - `scripts/ci/diagnose-runtime.sh`: when `ssoo-server` runs, prints the in-container readiness HTTP status, DMS runtime path access, and document repo `git status`/`remote -v` (masked)/`ls-remote` exit code. Read-only.
  - WP-3 selective build: `scripts/ci/build-inputs.sh` fingerprints each service; `run-app-job.sh build` reuses a retained commit image whose `com.ssoo.ci.input-hash` label matches and builds the rest with Bake `--set` labels. Force a full build with `CI_FORCE_FULL_BUILD=1` or `[full build]` in the commit message. The first build after this change rebuilds all 7 (no labels yet).
  - Verified: `pnpm run verify:gitlab-pipeline` passes (new selective build, forced build, label mismatch, fingerprint and diagnose masking scenarios); Bake `--set target.labels.com.ssoo.ci.input-hash=...` probed with buildx v0.34.1; fingerprint parsing checked against real `docker compose config` output for all 7 services.
- Next: push → pipeline verify → play `diagnose_runtime` right after verify (captures the readiness evidence if `ssoo-server` is still running) → build → user presses `deploy_dev` → check 3000–3004 and `/api/health` → fix the blocked DMS readiness check from the diagnose output.
- Found, not changed: `git.service.ts` calls `tryAutoPull` before `this.initialized = true`, so the existing-repo auto-pull always returns `git-not-initialized` (the log line seen in #184). Decide separately whether to fix; it changes when staging pulls from `LSWIKI_DOC`.

Status at end of day (2026-09-30 21:20 KST)
- The staging server is fully DOWN: 3000–3004 and API 4000 do not respond.
- Pipeline #184 (`704ea3b1`) deploy: the NEW `db-init` completed (exit 0) and upgraded the staging DB. The NEW server started normally (DMS prod role, 17 documents synced, "Nest application successfully started") but its compose healthcheck `GET /api/health/readiness` kept failing, so the five web containers were never started and the deploy failed.
- Rollback to the old images is no longer possible: the old `db-init` (`cbd9d7e0`) runs `prisma db push` against the old schema and Prisma refuses because it would drop new columns that hold data (e.g. `pms.pr_close_condition_group_m.approval_status_code`, `version_no`). Forward-only from here, as the user decided.
- Remaining blocker: one DMS readiness check returns `blocked` (`apps/server/src/modules/dms/settings/settings.service.ts` `buildReadiness`). Suspects: `git-binding` parity (log shows `pullSkipReason: git-not-initialized`; the prod remote `LSWIKI_DOC` has no HTTP credential secret) or a runtime path such as NAS `/mnt/nas/dms`. The readiness body was not captured.
- Proposed next step (awaiting user approval, not implemented): in `compose.staging.yaml` only, switch the server healthcheck to liveness `GET /api/health` (the pre-#160-era gate) so all apps start while DMS shows its readiness warning in the admin UI; add the readiness JSON (`docker exec ssoo-server` fetch of `/api/health/readiness`, masked) to `scripts/ci/diagnose-runtime.sh`; after the deploy, read `http://10.125.12.170:4000/api/health/readiness` and fix the blocked check. One more pipeline (~40 min) is needed.
- Recurrence prevention work is planned in `docs/dms/planning/2026-09-30-staging-deploy-hardening-plan.md` (WP-2 must also handle rollback when the DB has moved forward).

Root causes found today
1. New `db-init` compat path failures, found one by one by the rehearsal:
   - `compat/20260623_ai_rag_legacy_backfill.sql` referenced legacy columns without checking they exist (`cm_ai_acl_snapshot_m.snapshot_json`, `cm_ai_retrieval_log_m.ranker_code`) → psql `ON_ERROR_STOP` exit 3. Now guarded with the file's own `IF EXISTS (information_schema.columns ...)` + `EXECUTE` pattern.
   - Protected baseline migrations create history PKs as `pk_<table>`; Prisma schema/launch baseline expect `<table>_pkey`, and `prisma db push` emits `RENAME CONSTRAINT ..., ALTER COLUMN ...` in one statement (PostgreSQL syntax error). New `compat/post-baseline/normalize_protected_primary_keys.sql` renames them right after the protected migrations (excludes the 3 models that explicitly map `pk_*`).
   - Seeds wrote history rows through the previous trigger functions (unaware of new NOT NULL history columns). The compat path now re-applies `apply_all_triggers.sql` before seeds.
   - Rehearsal result: two consecutive `db-init` runs end with `[db-init] ✅ complete`. Rehearsal script: `wsl-db-rehearsal.sh` pattern described in `docs/common/guides/ai-rag-runtime-runbook.md` (DB Init Modes).
   - Unrelated pre-existing failure noticed: `node scripts/verify-pms-launch-readiness.mjs` fails on "PMS mobile layout removes desktop sidebar offset" with or without these changes.
2. Server config validation: since the base `compose.yaml` was hardened (`AUTH_ALLOW_INSECURE_PRODUCTION_DEFAULTS` default `false`, `DMS_INSTANCE_ENV: ""`), deploying `compose.yaml` alone fails for ANY image on this HTTP server. Fixed in `2b6ca2d6` by `compose.staging.yaml` (bypass confined to staging + DMS `prod` role / `LSWIKI_DOC`) applied via `.gitlab-ci.yml` `COMPOSE_FILE`. Takes effect on the next successful deploy.

Next steps (in order)
1. (done) Local db-init rehearsal. WSL has PostgreSQL 18 + pgvector (`ssoo`/`ssoo_dev_pw` superuser, DB `ssoo_dev`) and `/workspace` → `~/dev/LSWIKI-src` for re-running it.
2. (done) Commit + push the db-init fixes.
3. Pipeline: verify → ai_review → build (~30 min). The shell runner runs ONE job at a time — cancel superseded pipelines so the newest starts.
4. The user presses `deploy_dev`. On failure, `scripts/ci/diagnose-runtime.sh` output is in the deploy trace BEFORE the rollback section.
5. After success: check 3000–3004 and `/api/health`, then move `diagnose_runtime` out of the `verify` stage (its manual state makes the verify stage look unfinished in the GitLab UI).

Follow-up plan
- Recurrence prevention work (pre-build deploy rehearsal stage, no-downtime deploy order, rollback compose snapshot, incremental builds, diagnose stage move, staging security follow-ups) is specified in `docs/dms/planning/2026-09-30-staging-deploy-hardening-plan.md`. Start with WP-1.

Environment facts (do not rediscover)
- Develop, commit and push only in WSL `~/dev/LSWIKI-src`. The Windows checkout `D:\dev\LSWIKI-src` cannot run the pnpm hooks (64-bit `cmd.exe` spawn is blocked there) and is stale.
- GitLab is 10.4.4: pipeline API `variables` are IGNORED (dry-run via API does not work); `-o ci.skip` is unsupported (use `[ci skip]` in the commit body). SSH port 22 to 10.125.31.72 and 10.125.12.170 is blocked from this PC, so there is no direct host access; use the `diagnose_runtime` manual job (read-only, no runtime lock, masks secrets).
- GitLab API from WSL: the PAT in `~/.git-credentials` works as `PRIVATE-TOKEN` (never print it). Project `LSITC_WEB%2FLSWIKI`; `POST /jobs/:id/play` and `/pipelines/:id/cancel` work with Developer access.
- Corporate TLS root `LSITC_ePrism` is trusted in WSL (`/usr/local/share/ca-certificates/lsitc-eprism.crt`, `NODE_EXTRA_CA_CERTS` via `/etc/profile.d/node-extra-ca.sh`).

Security follow-ups (owner: user/operator)
- A GitLab password embedded in the host `.env` `DMS_GIT_BOOTSTRAP_REMOTE_URL` was exposed in diagnose job #383's trace; the trace was erased and URL-userinfo masking was added. Rotate that account's password and remove the credential from the host `.env` (the new compose no longer reads it).
- Staging hardening still open: HTTPS + `AUTH_SESSION_COOKIE_SECURE=true`, a real `AUTH_CONFIG_ENCRYPTION_KEY` (check for data encrypted with the current placeholder key before rotating), DMS Git HTTP credential secret (`DMS_GIT_HTTP_CREDENTIALS_FILE` + `DMS_GIT_HTTP_AUTH_SCOPE`) for pushes to `LSWIKI_DOC`.

Publish/handoff snapshot — 2026-06-11 16:53 KST
-----------------------------------------------

Purpose
- This snapshot closes the current repo-wide SSOO workspace slice so the next operator can continue immediately from `main`.
- Scope is intentionally whole-workspace: shared auth/user lifecycle convergence, common web shell/sidebar/settings primitives, DMS settings/runtime terminology cleanup, Docker runtime path normalization, generated docs alignment, and launch/rebaseline documentation.

Current runtime state
- Docker `ssoo-server` and `ssoo-dms` were rebuilt from the current workspace and recreated with `docker compose up -d --no-deps server dms`.
- `ssoo-server` and `ssoo-dms` are healthy. DMS web `http://localhost:3003` returned HTTP 200.
- `ssoo-server` runtime env now points to document-neutral paths:
  - `DMS_MARKDOWN_ROOT=/var/lib/ssoo/documents`
  - `DMS_INGEST_QUEUE_PATH=/var/lib/ssoo/document-ingest`
  - `DMS_STORAGE_LOCAL_BASE_PATH=/var/lib/ssoo/document-storage/local`
  - `DMS_STORAGE_NAS_BASE_PATH=/mnt/nas/documents`
- Docker bind mounts now use `.runtime/documents`, `.runtime/document-ingest`, and `.runtime/document-storage/local`.
- Existing Docker Postgres `dms.dm_config_m` system settings were updated from legacy `.runtime/dms/*`, `/sites/dms`, `/mnt/nas/dms` values to the same document-neutral paths. Fresh deploy seed defaults were updated as well.

User-facing DMS settings cleanup
- The DMS user menu settings entry is now just `설정`; do not reintroduce `DMS 설정`, `내 DMS 설정`, `DMS 시스템 설정`, or `문서 설정` for that entry.
- DMS settings surface still owns DMS-specific system/personal config behavior. The cleanup only removes repeated app/domain naming from the settings label and related user-facing copy.
- Docker image rebuild is required for future DMS UI copy changes because the Next standalone output bakes the string into `ssoo-dms`.

Verification completed in this closeout
- `docker compose config --quiet`
- `docker compose build server`
- `docker compose build dms`
- `docker compose up -d --no-deps server dms`
- Runtime DB/env/mount checks against Docker containers and Postgres
- Built DMS image grep: no `DMS 설정`, `문서 설정`, `내 DMS 설정`, or `DMS 시스템 설정`
- `curl --max-time 10 -I http://localhost:3003` returned HTTP 200
- `pnpm run codex:verify-sync`
- `pnpm run codex:preflight` — passed with one existing warning for `apps/server/src/main.ts` `console.log`
- `pnpm run codex:dms-guard`
- `DMS_MARKDOWN_ROOT=/tmp/ssoo-documents-test DMS_INGEST_QUEUE_PATH=/tmp/ssoo-document-ingest-test DMS_STORAGE_LOCAL_BASE_PATH=/tmp/ssoo-document-storage-test pnpm --filter server exec node --experimental-vm-modules node_modules/jest/bin/jest.js test/dms/collaboration.service.spec.ts --runInBand`

Remote/publish procedure for continuation
- GitHub remote is `origin` (`https://github.com/hwista/ssoo.git`) and target branch is `main`.
- GitLab workspace remote is `gitlab` (`http://10.125.31.72:8010/LSITC_WEB/LSWIKI.git`) and workspace branch is `development`.
- Direct unauthenticated `git fetch gitlab` fails by design in this environment. Use `pnpm run codex:workspace-sync-from-gitlab` and `pnpm run codex:workspace-publish -- main`; these scripts read local `codex.gitlabUser` / `codex.gitlabToken` or `GL_USER` / `GL_TOKEN` without printing the token.
- `codex:workspace-sync-from-gitlab` refuses dirty worktrees. Commit the current checkpoint first, run the sync script, resolve/verify if it merges new GitLab commits, then rerun Docker reflection for changed services.
- If GitLab `development` has new commits, merge content must be reported explicitly in the next handoff/final note and Docker must be refreshed before publishing.

Known notes
- `packages/web-auth` now declares `@types/node` because shared login code reads `process.env` during app builds; without this, Docker `web-dms` production build fails in `@ssoo/web-auth`.
- Do not print GitLab tokens or credential-bearing URLs in logs, docs, or final reports.

Publish/handoff snapshot — 2026-06-08 14:50 KST
---------------------------------------

Purpose
- This snapshot closes the current SSOO workspace session so the whole repository can be resumed from `main` after publishing to GitHub and the GitLab workspace branch.
- It records both the broad dirty-tree baseline already present in the repo and the DMS file-list startup fix completed in this session.

Repository state before final publish
- Branch: `main`.
- GitHub remote: `origin` (`hwista/ssoo.git`). Local `HEAD` matched `origin/main` before this closeout commit.
- GitLab workspace remote: `gitlab` / publish script target branch `development`. Direct unauthenticated `git fetch --all` cannot fetch GitLab; use `pnpm run codex:workspace-sync-from-gitlab` and `pnpm run codex:workspace-publish -- main`, which read local `codex.gitlabUser` / `codex.gitlabToken` without printing the token.
- Worktree scope at closeout was intentionally repo-wide: legacy content-app naming removal, SNS and CRM introduction, PMS launch-readiness updates, common docs/instructions alignment, compose/workspace/package updates, and DMS hydration hardening.

DMS critical fix completed in this session
- Symptom: after PC/Docker startup, DMS could initially show an empty file list even though documents existed on the host/runtime repository.
- Evidence captured during diagnosis:
  - Container document root temporarily showed only template markdown files while the host/runtime document tree had the real workspace documents.
  - DB active documents were observed as `sync_status_code='missing'` in the broken state, which can make the file tree appear empty.
  - After Docker rebuild/recreate and sync, DB returned `synced=34` and browser `/api/files` returned HTTP 200 with a non-empty tree.
- Code change: `DocumentHydrationService` now skips DB `missing` downgrades when the runtime document root is not a Git working tree but a Git bootstrap remote is configured. This prevents startup/bind-mount/bootstrap races from erasing the control-plane view.
- Regression test added: `apps/server/test/dms/document-hydration.service.spec.ts`.

Verification performed before this handoff
- `pnpm --filter server test -- document-hydration.service.spec.ts` — passed.
- `pnpm run codex:preflight` — passed.
- `pnpm run verify:access-dms:raw` — passed.
- Docker runtime after rebuild/recreate: server/dms/postgres healthy; server health returned HTTP 200; DMS browser `/api/files` returned a non-empty tree.

Known operational boundaries
- Do not show or commit GitLab tokens or remote credential-bearing URLs. The publish scripts inject auth via `http.extraHeader` and should be used instead of embedding credentials in remotes.
- If GitLab `development` has advanced, first merge it into a clean local worktree with `pnpm run codex:workspace-sync-from-gitlab`, rerun verification, then publish.
- The DMS settings-screen IA analysis is not implemented in this closeout. Its retained decision is: split 운영 상태 / 시스템 설정 / 관리 업무 / 내 설정, promote 문서 저장소 연결 상태 to a masked 운영 상태 card, and keep sensitive runtime details collapsed/masked.

Recommended next pickup
1. Start from `HANDOFF.md`, `AGENTS.md`, `.codex/instructions/project.instructions.md`, and this snapshot.
2. Confirm remote alignment: `git status --short --branch`, then `pnpm run codex:workspace-sync-from-gitlab` only from a clean worktree.
3. For DMS startup regressions, first check DB active document sync counts and `/api/files` response before changing UI.
4. For the broader SSOO repo, treat the current large workspace delta as a launch closeout/rebaseline slice; avoid adding new feature scope until publish verification is green.

Completed
---------
- **DMS collaboration/permission closeout (2026-05-29)**: sidecar status/permission/comment UX, notification read-state controls, DB-backed comments, AI summary attachment preservation, internal/external link routing, WebSocket soft-lock flow, and lock release request lifecycle are complete and Docker-reflected.
- **DMS launch gate closeout (2026-05-27)**: unreadable search result redaction, locked document preview, Search/Ask blocked-source summary UI, access request approve/reject/revoke/ownership regression coverage, and formal search history migration artifact are complete for the DMS search/permission launch gate.
- **Phase A (project-level closure, 2026-04-30)**: GitLab `LSWIKI_DOC.git` push policy confirmed (canonical `master`, direct push verified — `b963f14` already on `origin/master`). `versionHistory` dead feature removed (server -50 lines + types -10 lines); intent re-registered as `DMS-FE-versionHistory` backlog item for future git-history-based on-demand projection. Closes Tracks 2/5/7 of the integration project at 100%.
- C-1: DocumentPage hooks extraction and cleanup (DocumentPage.tsx reduced to ~1997 lines)
- C-2: Collaboration service decomposition into 4 util files (paths, sanitizers, isolation, state IO) — `353094c`, `db77869`, `34094f7`, `f156d90`, `2dc45a4`
- D-2: Collaboration unit and integration tests added (110 tests across 6 suites; passed) — `6fb2cdb`, `f41854d`
- C-3: git.service.ts decomposition complete — 1285 → ~1150 lines (-263, -20.5%)
  - Slice 1: extracted git path/format helpers → `git-paths.util.ts` (`4c5df24`)
  - Slice 2: extracted git sync/parity helpers → `git-sync.util.ts` (`eedb751`)
  - Slice 3: extracted git binary probe + sync inspection → `git-inspect.util.ts` (`47f2cc0`)
  - Slice 4: extracted repository binding status (proxy maintained) → `git-inspect.util.ts` (`00127c8`)
- C-4: access-request.service.ts decomposition complete — 2150 → 1121 lines (-1029, -48%)
  - Slice 1: extracted 16 stateless metadata utils → `access-request.util.ts` (`49ef29f`)
  - Slice 2: extracted 8 normalize/summary functions → `access-request.util.ts` (`4081ea4`)
  - Slice 3: extracted document projection sync → `DocumentProjectionService` (`c9b13be`)
  - Slice 4: extracted document record bootstrap → `DocumentRecordService` (`2d9f2e5`)
  - Slice 5: extracted control plane sync → `ControlPlaneSyncService` (`4d98ca2`)

Current branch/commit
---------------------
- Branch: main
- Publish target for this snapshot: GitHub `origin/main` and GitLab workspace branch `development`
- This handoff belongs to the DMS launch closeout commit plus the GitLab workspace sync merge created from the current working tree.
- Recent committed:
  - `79fbb6f` feat(dms): close launch search permission gate
  - `959c42f` feat(dms): close out search access launch slice
  - `e3f8678` feat(dms): finalize notification baseline
  - `6e2f83a` docs: realign CLAUDE.md with current monorepo state
  - `c1497ec` docs(dms): align HANDOFF, changelogs, backlog, roadmap, README with C-3/C-4
  - `4d98ca2` refactor(dms): extract ControlPlaneSyncService (C-4 slice 5)

Files of interest
-----------------
- apps/server/src/modules/dms/access/access-request.service.ts (1121 lines, post-C-4)
- apps/server/src/modules/dms/access/access-request.util.ts (447 lines, 24 utils + constants)
- apps/server/src/modules/dms/access/document-record.service.ts (311 lines, record bootstrap)
- apps/server/src/modules/dms/access/document-projection.service.ts (126 lines, projection sync)
- apps/server/src/modules/dms/access/control-plane-sync.service.ts (260 lines, repo sync orchestration)
- apps/server/src/modules/dms/runtime/git.service.ts (~1150 lines, post-C-3)
- apps/server/src/modules/dms/runtime/git-paths.util.ts
- apps/server/src/modules/dms/runtime/git-sync.util.ts
- apps/server/src/modules/dms/runtime/git-inspect.util.ts (297 lines)
- apps/web/dms/src/components/pages/markdown/DocumentPage.tsx (1997 lines — pending C-5)
- apps/server/src/modules/dms/collaboration/collaboration.service.ts (858 lines — partial via C-2)
- apps/server/test/dms/*.spec.ts (110 tests, 6 suites)

Build & test
------------
- TypeScript: `pnpm --filter server exec tsc --noEmit`
- Lint: `pnpm --filter server lint`
- Tests: `pnpm --filter server test` (110 tests pass)
- Docker server health: `docker compose build server && docker compose up -d server && curl http://localhost:4000/api/health`

Current in-progress todo
------------------------
None. DMS collaboration/permission/comment closeout implementation, final gates, and Docker rebuild/health verification are complete for this slice.

Publish snapshot — 2026-05-29 17:50 KST
---------------------------------------
- Scope: DMS launch collaboration/permission/comment closeout.
- Core implementation: sidecar status cleanup, permission section owner/viewer flows, access grant/request realtime refresh, notification read/unread controls and target-document auto-read, DB-backed comments, AI summary source attachment retention, link routing, WebSocket soft-lock updates, and lock release request approval lifecycle.
- Critical lock fix: lock release requests now dedupe server-side by document/requester/lock owner, expose pending state for page reload recovery, restore requester `요청 중` and owner handling dialog, and notify/requester state through WebSocket/SSE fallback.
- Docs synced: root handoff, DMS launch collaboration handoff, backlog, roadmap, README, API guide, changelog.
- GitLab branch rule: GitLab workspace target is `development`; fetch/merge it before pushing and never force-push over workspace history.
- Verification passed:
  - `pnpm --filter web-dms build`
  - `pnpm --filter server build`
  - `pnpm --filter server test -- collaboration.service.spec.ts`
  - `pnpm run codex:dms-guard`
  - `pnpm run codex:preflight`
  - Docker `server` and `dms` rebuild
  - DMS web `http://127.0.0.1:3001` returned HTTP 200
  - server health `http://127.0.0.1:4000/api/health` returned HTTP 200
- Runtime state: Docker `server` and `dms` are healthy.
- Handoff detail: `docs/dms/planning/2026-05-29-launch-collaboration-handoff.md`

Publish snapshot — 2026-05-27 10:04 KST
---------------------------------------
- Scope: DMS search/permission launch gate closeout.
- Core implementation: unreadable search redaction, Search/Ask blocked-source summaries, permission workflow regression automation, and search history migration artifact.
- Docs synced: root handoff, DMS launch closeout handoff, backlog, roadmap, changelog.
- GitLab sync note: GitLab `development` contained additional workspace hardening and Copilot issue-operator commits, so it was merged locally before final publish. Do not force-push over GitLab workspace history.
- Verification passed:
  - `pnpm --filter @ssoo/types build`
  - `pnpm --filter server build`
  - `pnpm --filter web-dms build`
  - `pnpm --filter server exec node --experimental-vm-modules node_modules/jest/bin/jest.js test/dms/path-and-search.helpers.spec.ts --runInBand`
  - `pnpm run verify:access-dms:raw`
  - `pnpm run codex:dms-guard`
  - `pnpm run codex:verify-sync`
  - `pnpm run codex:preflight`
  - GitLab sync merge follow-up: `pnpm --filter server build`, `pnpm --filter web-dms build`, `pnpm run codex:preflight`
- Runtime state: Docker `server` and `dms` were rebuilt and are healthy; DMS web and API health both returned HTTP 200.
- DB runtime check: `dms.dm_search_query_m` exists in the running Postgres database.

Next recommended actions (in priority order)
--------------------------------------------

**DMS launch smoke (P1, same-day)**

1. Perform final browser launch smoke: login, AI search, locked document entry, access request CTA, approve/reject/revoke path, comment create/delete/restore, and soft-lock release request approve/reject.
2. Freeze operating seed/account/document-root state for launch.
3. Track any browser-only regression as a new bug; do not reopen the completed search/permission/collaboration closeout unless a regression is reproduced.

**Phase C — Operational polish (P2, ~3-5 days)**

4. Storage error message standardization (NAS — permission vs timeout vs expired) — `DMS-STO-02-A`
5. Resync → Settings refresh end-to-end verification — `DMS-STO-02-B`

**Phase D — Test safety net (P2, ~1 week, NOT closure-critical)**

6. **D-3** controller HTTP integration tests for `file.controller`, `collaboration.controller`, `content.controller`, `access-request.controller`. Adds `supertest` dep + `@nestjs/testing` HTTP bootstrap. Strengthens regression safety net.
7. Admin spec: `dms-admin.service.spec.ts` + admin page smoke

**Phase E — Track 6 unimplemented slots (P3, ~2-3 weeks)**

8. System schedulers, template marketplace, personal activity dashboard

**Cleanup (low priority)**:
- `DMS-REF-C5` DocumentPage decomposition (1997 lines, frontend context)
- `DMS-REF-C6` `ensureRepoControlPlaneSynced` proxy removal (21 controller migration)
- `DMS-REF-C7` `normalizeRelativePath` consolidation

Environment notes
-----------------
- GH remote configured; pushes to main are automated via workflow
- GitLab workspace publish target is `development`; the standard publish script refuses non-fast-forward pushes, so run workspace sync/fetch first when GitLab has new commits.
- Commit footer: this session used `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`. Earlier sessions used `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`. Mixed convention currently — pick one going forward.

How to pick up from CLI
-----------------------
1. `git pull origin main`
2. `pnpm install`
3. `pnpm --filter server test` (expect 110 pass, 6 suites)
4. Pick a candidate from "Next recommended actions" above
5. For test work (D-3): create new spec files under `apps/server/test/dms/`, follow existing patterns in `collaboration.service.spec.ts`
6. For refactor work: same pattern as recent slices — Plan mode → extract → tsc/lint/test → commit → docker rebuild + /api/health 200

Architecture summary (post-C-4)
-------------------------------
DMS access module (`apps/server/src/modules/dms/access/`) is now decomposed into:
- `AccessRequestService` — control-plane API surface (createReadRequest, listManagedDocuments, syncDocumentProjection, etc.); injects the 4 cohesive sub-services below
- `ControlPlaneSyncService` — repo↔DB sync orchestration with throttle + parity + scan
- `DocumentRecordService` — document record bootstrap + canonical owner resolution + repair-needed handling
- `DocumentProjectionService` — DB projection sync (source files / path history / comments)
- `DocumentControlPlaneService` (existing) — control-plane cache layer
- `DocumentAclService` (existing) — ACL evaluation
- `access-request.util.ts` — 24 stateless metadata/transform utilities + 2 shared constants

Recovery snapshot — 2026-05-07 10:06 KST
-----------------------------------------

Purpose of this snapshot
- This section is a reboot/session-recovery handoff only.
- Do not treat it as a request to start new implementation automatically.
- Resume by reading this section first, then the rest of this HANDOFF, `.codex/instructions/*`, and the relevant DMS planning docs.

1) Current goal / last completed slice
- Current active goal at handoff time: preserve the DMS workstream state after a diagnostic pass, especially DMS document-repo/control-plane cutover readiness and the Copilot-era DMS refactor handoff.
- No new implementation slice was started in the handoff request.
- Last completed slice visible in current Git history: `6c26b89 fix(web-dms): user-scope cleanup 일괄 정렬 — 9 stores cross-user 잔존 차단`.
- Existing HANDOFF state below also records earlier closed DMS refactor tracks:
  - C-3 `git.service.ts` decomposition complete.
  - C-4 `access-request.service.ts` decomposition complete.
- Diagnostic finding from the immediately preceding session: DMS cutover is not fully green yet because `verify:access-dms:raw` fails on storage-backed image serving and sidecar/runtime-root cleanup remains unresolved.

2) Git status / commit / push state
- SSOO repo path: `/home/a0122024330/src/ssoo`
- Current branch/status at snapshot:
  - `## main...origin/main [ahead 1]`
- Latest local commits at snapshot:
  - `6c26b89 fix(web-dms): user-scope cleanup 일괄 정렬 — 9 stores cross-user 잔존 차단`
  - `6b9e110 feat(web-dms): 내 요청 페이지 + 사이드바 진입점 + 권한 UX 용어 통일`
  - `192ee1a fix(web-dms): tab dedup, dropdown ssoo tokens, user-scoped tab persistence`
  - `d042991 feat(dms): cross-client access invalidation + visibility UI polish (Phase B)`
  - `a128ce0 fix(web-dms): permission UX correctness — search cache + socket self-filter`
- Commit/push state:
  - There is one local commit ahead of `origin/main`.
  - This handoff request did not push.
  - After saving this HANDOFF section, the working tree will include this documentation edit until committed or reverted.
- Runtime document repo status at snapshot:
  - `.runtime/documents`: default Docker/local runtime document root after the current path normalization.
  - Previous `.runtime/dms/documents` snapshots may still exist locally from older runs.
  - `/home/a0122024330/src/lswiki-docs`: `## master...origin/master`, with many modified/untracked `.sidecar.json` files.

3) Changed files / verification results
- This handoff request intentionally performed no implementation changes.
- File changed by this handoff request:
  - `HANDOFF.md` — appended this recovery snapshot section.
- Verification commands run during this handoff request:
  - `date '+%Y-%m-%d %H:%M:%S %Z' && git status --short --branch && git log --oneline -5` — success.
  - `git -C .runtime/documents status --short --branch && git -C /home/a0122024330/src/lswiki-docs status --short --branch` — success.
- Verification known from the immediately preceding diagnostic pass, not re-run in this handoff request:
  - `pnpm run codex:verify-sync` — passed.
  - `pnpm run docs:verify:raw` — passed.
  - `pnpm --filter server exec node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand` — passed: 6 suites, 110 tests.
  - `pnpm run build:server` — passed.
  - `pnpm run build:web-dms` — passed.
  - `pnpm --filter server test -- --runInBand` — failed because Jest received `--runInBand` as a pattern via the extra `--`; direct Jest command above passed.
  - `pnpm run verify:access-dms:raw` — failed: `/dms/file/raw` returned 404 for a probe image path like `_assets/images/verify-*.png`.
- Important diagnostic conclusion:
  - `upload-image` stores files through `storageAdapterService.upload(...)` under the configured storage provider/root.
  - 당시 config의 폐기된 기본 provider 때문에 probe 이미지가 잘못된 외부 root에 기록되었고, 2026-07-22 Local 기본 계약과 migration으로 해소했습니다.
  - `GET /dms/file/raw` only resolves against markdown root via `fileCrudService.resolveFilePath(...)`, so it misses storage-backed images.
  - `GET /dms/file/serve-attachment` already has a storage-backed fallback path; raw image serving needs equivalent behavior or a deliberate alternative contract.

4) Re-entry commands / next small step
- Recommended re-entry commands:
  1. `cd /home/a0122024330/src/ssoo`
  2. `git status --short --branch`
  3. `git log --oneline -5`
  4. `git -C .runtime/documents status --short --branch`
  5. `git -C /home/a0122024330/src/lswiki-docs status --short --branch`
  6. Read: `HANDOFF.md`, `.codex/instructions/codex-instructions.md`, `.codex/instructions/project.instructions.md`
- Next smallest implementation step, if the user asks to proceed:
  - Fix DMS raw image serving contract in `apps/server/src/modules/dms/file/file.controller.ts` so `/dms/file/raw` can serve storage-backed images referenced by a readable document, matching the policy that binary assets are external storage and not markdown Git-root truth.
  - Prefer a small helper shared with or parallel to `resolveStorageBackedAttachmentPath(...)`.
  - Then run, in order:
    1. `pnpm --filter server exec node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand`
    2. `pnpm run build:server`
    3. `pnpm run verify:access-dms:raw`
- Do not start the broader refactor track again before the red DMS cutover gate is understood or intentionally deferred.

5) Unresolved risks / user confirmation needed
- Push confirmation needed:
  - Current branch is ahead of `origin/main` by 1 commit. Confirm before pushing.
- Runtime source-of-truth risk:
  - Docker server now binds `.runtime/documents`, while `/home/a0122024330/src/lswiki-docs` also exists as a GitLab document clone and is dirty. Confirm which path should be treated as the canonical local runtime working tree.
- Sidecar risk:
  - `.sidecar.json` files remain in document repos despite the current no-sidecar runtime contract. Need a deliberate cleanup/archival policy before deleting or committing them.
- Raw binary risk:
  - `verify:access-dms:raw` is red until raw image endpoint supports storage-backed assets or the upload/materialization contract is changed.
- Storage provider risk (resolved 2026-07-22):
  - SharePoint provider를 폐기하고 DB/runtime 기본 업로드를 Local로 고정했으며 NAS는 명시적 활성화 전까지 비활성입니다.
- Test-command risk:
  - Use the direct Jest command for `--runInBand`; `pnpm --filter server test -- --runInBand` is known to fail due to argument forwarding.
- Documentation edit risk:
  - This HANDOFF update itself is a working-tree documentation change and should be committed, amended into the local ahead commit, or reverted based on the next operator’s intent.

Launch closeout snapshot — 2026-05-27 08:30 KST
------------------------------------------------

Purpose of this snapshot
- This section is the current re-entry handoff for DMS launch-prep work.
- Scope is DMS only. PMS/SNS integration acceptance is intentionally out of scope.
- Detailed task handoff lives in `docs/dms/planning/2026-05-20-launch-closeout-handoff.md`.

1) Current goal / last completed slice
- Last completed slice: DMS AI search/history/popular keywords + unreadable search redaction + locked document preview UX closeout.
- Locked preview behavior is implemented and verified: unreadable search/AI result opens an existing document page, server returns preview-only data, document page shows locked preview, and access request CTA lives in the document header left action area.
- Search result redaction is implemented and tested: unreadable results keep AI summary but replace original-content excerpt with a safe message, clear snippets, and set snippet count to 0.
- Locked sidecar behavior is implemented with existing section components, not a separate placeholder UI. Sensitive sections remain collapsed and show a lock icon where the collapse/expand icon normally appears.
- Docker reflection completed for server and DMS web. server/dms are healthy and DMS web returns 200.
- Current remaining P1: 권한 UX 회귀 검증 자동화 and Search/Ask 전체 차단 소스 수/제외 사유 요약 UI.

2) Git / remote state at snapshot
- Repo path: `/home/a0122024330/src/ssoo`
- Branch at documentation time: `main`
- Latest published base before this closeout commit: `959c42f feat(dms): close out search access launch slice`
- Remotes:
  - GitHub: `origin` / `main`
  - GitLab workspace publish target: `development` via the workspace publish script
- Working tree at this snapshot contains the DMS locked-preview/redaction implementation plus documentation updates. Commit and publish should happen after final gates pass.

3) Verification completed before this handoff update
- `pnpm --filter server exec node --experimental-vm-modules node_modules/jest/bin/jest.js test/dms/path-and-search.helpers.spec.ts --runInBand` passed.
- `pnpm --filter server exec node --experimental-vm-modules node_modules/jest/bin/jest.js test/dms/file-crud.service.spec.ts --runInBand` passed earlier in the slice.
- `pnpm run build:server` passed earlier in the slice.
- `pnpm run build:web-dms` passed after the sidecar existing-section lock rewrite.
- `pnpm run verify:access-dms:raw` passed after the sidecar existing-section lock rewrite.
- `pnpm run codex:preflight` passed earlier in the slice; re-run before publication if this section is stale.
- Docker rebuild/restart completed with `DOCKER_CONFIG=/tmp/ssoo-docker-config docker compose up -d --build server dms`.
- `docker inspect` showed `ssoo-server=healthy` and `ssoo-dms=healthy`.
- `curl -I -fsS http://localhost:3001/` returned `HTTP/1.1 200 OK`.

4) Re-entry commands
```bash
cd /home/a0122024330/src/ssoo
git status --short --branch
git log --oneline --decorate -8
sed -n '1,260p' docs/dms/planning/2026-05-20-launch-closeout-handoff.md
```

5) Next smallest implementation step
- Add 권한 UX 회귀 검증 automation for request create → approve/reject → grant reflected → revoke/ownership-transfer boundaries.
- Add Search/Ask blocked-source count and exclusion reason summary UI.
- Confirm the DB migration status for the search history model before production deployment.
- Preserve the requirements that AI summaries can remain visible for included search results, while original markdown snippets/excerpts for unreadable results remain redacted.

6) Important constraints
- Do not implement CSS-only blur over full downloaded content.
- Do not replace locked sidecar sections with a new placeholder UI; reuse existing section components with locked collapsed state.
- Do not broaden this session into PMS/SNS unless explicitly instructed.
- Do not close a DMS runtime change without Docker rebuild and health/browser verification.

Contact
-------
For questions about decisions or tests, check `docs/dms/guides/`, `docs/dms/planning/`, and recent commits.
