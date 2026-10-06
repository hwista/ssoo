Handoff: DMS refactor & next steps

Overview
--------
This document summarizes recent progress, current state, and recommended next steps for the DMS refactor work in this repository. It is intended for a maintainer to pick up work from the CLI or another environment.

Context
-------
- Monorepo: apps/{server,web/*} + shared packages
- DMS is integrated as the canonical document store (git-backed working tree + DB metadata)
- Primary goal: refactor large files, stabilize auto-commit/publish pipeline, and add tests for core DMS logic

Local onboarding deployment complete — 2026-10-06
-----------------------------------------------------
The user authorized rehearsal and local Docker deployment. Release `onboarding-20261006-a3f472f22995` now runs on local server + Admin/CRM/PMS/DMS/SNS with the dev DMS role. Migrated the cleansed unmanaged DB into the real 19-migration/90-trigger/drift-0 contract while preserving 11 accounts, 13 organizations, permissions, login/password records and 159 DMS documents. Existing users have 11 enrollments/44 service grants; cleaned CRM/PMS business data remains empty. The isolated onboarding API, two-browser approval workflow, 24-check platform smoke in both rehearsal/live and native localhost browser checks passed. Original DB `ssoo_before_onboarding_20261006`, full dump/runtime backup and prior images remain available. Owned rehearsal containers/volumes and three scratch DBs were removed; other containers retained their identities. See [local handoff and test steps](docs/common/explanation/architecture/2026-10-02-onboarding-wsl-resume.md#로컬-docker-배포-완료--2026-10-06) and private `output/checkpoints/onboarding-local-deploy-20261002/`. Source was frozen before later concurrent common-code/Admin/CRM edits; preserve those current workspace edits. No remote push/deployment. Ordinary local startup uses strict/upgrade without demo reseeding. The sections below describe earlier checkpoints.

Deployment session recovery — 2026-10-02
-----------------------------------------------------
Deployment continuation has moved to the current session at the user's request. Read [deployment design §20](docs/common/explanation/architecture/2026-10-01-deployment-design.md#20-devmux-작업-복구와-격리-리허설-완료--2026-10-02) and private checkpoint `output/checkpoints/deployment-20261002-resumed/`. The retained-image rehearsal now passes all 24 server/five-web checks after a fresh PG17 backup/restore and two DB initializations. This is NOT a current integrated release candidate; latest CRM/onboarding code remains owner work. The recovered 13:17 source snapshot passed the platform guard: 49 deployment contracts, server/five production web builds, and 96 suites/734 tests. Three later source edits and one new onboarding test are excluded; see the snapshot delta in §20. Both disposable projects were cleaned and all 26 original container IDs retained (18 running, 17 healthy). No remote push/deployment or production success pointer was issued.

WSL restart checkpoint — onboarding session, 2026-10-02
-----------------------------------------------------
Resumed after WSL recovery at the user's request. See [onboarding resume checkpoint](docs/common/explanation/architecture/2026-10-02-onboarding-wsl-resume.md). Real disposable DB baseline/restore (19 migrations, 90 triggers, drift 0), onboarding/CRM/PMS/sharing scenarios, two-account DMS/SNS UI, expiry, SSE/WebSocket/notification and AI source ACL checks passed within the documented scope. Fixed stale DMS request state, canonical visibility reversion, mobile settings measurement and duplicate SNS keys. Browser fixture DB was removed and its absence verified; owned browser/dev/API processes stopped. Final platform guard passed server + all five app production builds and 98 suites/742 tests; latest preflight, changed-scope lint and docs checks passed. Evidence: `output/playwright/onboarding-resume-20261002/final-checks.json`; deployment is separate. Preserve other sessions’ working-tree changes and the historical archive `output/checkpoints/onboarding-20261002-wsl-resume/`.

Authorized legacy data cleansing — 2026-10-02
-----------------------------------------------------
The user corrected the premise: past CRM/PMS business records were agent-generated disposable data, not user-authored or user test data, and explicitly authorized cleansing. Removed local `ssoo_dev` demo opportunities (9), contracts (9), customers (11), business plan (1), projects (6), related details/history/notifications/AI indexes and three already-fileless CRM-generated DMS document records. Verified rollback rehearsal, backup archive, atomic deletion, zero remaining target rows and unchanged contents of 63 protected tables plus untargeted rows. Accounts, organizations, permissions, reference/master data, unrelated DMS/SNS content and other sessions' databases remain. Evidence/private backup: `output/checkpoints/onboarding-cleansing-20261002/`. Legacy-to-new-contract conversion is excluded from onboarding requirements. Do not reseed this database with demo seeds. Onboarding code/migrations have not been deployed; see the resume document for exact scope.

Common onboarding implementation — 2026-10-01 (historical; superseded by completion and cleansing above)
-----------------------------------------------------------------------------------
- The earlier attribution of these records to the user was incorrect. The user authorized cleansing agent-generated business data; no legacy conversion requirement remains. Do not infer or bulk reassign historical business organizations.
- Added enrollment/request/service-grant/approval-authority masters and histories, approved organization/service onboarding, delegated reviews, five-app shared entry, server admission and current search/AI/notification source checks. Self-signup endpoints are still unimplemented.
- PMS basic create/update/list/detail/search now validates approved business organizations and scoped service roles; changing the responsible user preserves the organization. Existing migration/bootstrap grants retain original object policy.
- CRM opportunity/customer/contract masters and histories now carry business organization. New writes validate approved write scope; versions/source-linked contracts inherit it. Basic lists/details, dashboard/monthly contract performance and contract approvals are scoped. Shared organization selection is present in the three basic forms. Isolated onboarding/CRM integration passes 15 scenarios; baseline/restore passes 17 migrations and 89 triggers. Browser opportunity/customer saves return 201 with organization 13, and contract desktop/mobile fields work. Final platform guard passes server + five builds and 90 suites/677 tests. Fixture DB, API/CRM servers and browser are cleaned up.
- CRM follow-up: business-plan versions/history/carry-forward, manual actuals, cost/AMS inputs, report confirmations, accounting handoffs and execution evidence are organization scoped. Operations counts/details/retries recheck current source scope; PMS contract handoff checks both apps, same organization and the current server preview. Migration/restore passes 18 migrations, 89 triggers and zero drift; isolated integration passes 24 scenarios and platform guard passes 90 suites/692 tests. Browser report confirmation exposed a dropped proxy body; fixed, rebuilt CRM and verified confirmation/reopen, cost save, scoped previews and viewer-disabled actions. Desktop/mobile evidence and source hashes are in the canonical ledger. Disposable DB, API/CRM processes and browser are cleaned up; main Docker is unchanged.
- 2026-10-02 sharing follow-up: implemented DMS/SNS approved organization selection, personal ownership/source organization for CRM-generated documents, SNS individual request/decision/history and AI ACL, and DMS WebSocket delivery-time rechecks. New migration makes 19 migrations/90 triggers. Platform guard passes server + five web builds and 92 suites/712 tests; preflight, server lint and 9 DB contract tests pass. Runtime verification is NOT complete: baseline exposed a missing trigger installer entry (fixed), then PostgreSQL filenode I/O failure and Docker API 500 stopped isolated DB/browser tests. See `/tmp/ssoo-sharing-*.log` and canonical ledger. Re-run baseline/restore + onboarding/sharing fixture and browser acceptance after Docker recovery; verify failed-run disposable DB cleanup. No main deployment or Docker restart performed.
- Main Docker and its pre-baseline database have NOT been migrated. Sharing runtime/browser acceptance was subsequently completed in the resume section above. Legacy unassigned-source transition is excluded by the user's correction. Object-scoped notification revocation is implemented locally; see the follow-up below.
- Notification follow-up (2026-10-02): DMS/SNS list, read-state responses and SSE now recheck current source ACL; denied objects retain generic status/read history and omit private fields. Source change events invalidate old client notification text even when refetch fails; SNS panel ignores stale responses. Related 4 suites/22 tests and controlled-API browser checks pass; full platform guard passes 96 suites/733 tests plus server/five-app builds. Final server build/lint, preflight and Nest shared-registry wiring check pass. Actual DB/two-account sharing acceptance is still pending; environment recovery belongs to the deployment session.
- Canonical status, evidence and next steps: [onboarding implementation ledger](docs/common/explanation/architecture/2026-10-01-onboarding-implementation.md).

Platform deployment implementation — 2026-10-01 (local; remote activation pending)
--------------------------------------------------------------------------------
- **Recovery complete — 2026-10-02 after Windows reboot:** See [Docker recovery and resume record](docs/common/explanation/architecture/2026-10-02-docker-recovery.md). User rebooted Windows at 11:02:57 KST; two existing server containers needed a start after Ubuntu bind mounts became ready. All original 18 IDs are running, 17 healthchecks healthy; all 48 images and 21 remaining volumes verified. PostgreSQL 4 transaction probes, Redis, API readiness, five-app/BUDD/Lineup HTTP, five-app real browser login screens and session POST 200 passed. Backend PIDs remained unchanged for more than 6 minutes after startup during verification. C: free 139.55 GB; Docker VHD 38.99 GB after compaction. Existing main SQL backup retained. Development can resume from each owner checkpoint; current containers/database predate pending CRM/onboarding changes. New migrations/build/deployment acceptance and remote push are outside this recovery. Historical failures below remain failed evidence; no reboot or RunOnce action remains pending.
- **Historical recovery ownership — 2026-10-02 (superseded by follow-up above):** user explicitly assigned Docker normalization and disk cleanup to THIS session; the earlier deferral to another session is superseded. All this session's builds are stopped. Normal `docker desktop restart --timeout 90` failed. Targeted Docker process shutdown + `wsl --terminate docker-desktop` + relaunch failed twice: backend `0xc0000374`, bootstrap cannot read offline `/dev/sde` (WWID `naa.60022480462e071cff11f060ca241436`), automatic mkfs refused the in-use device. No user-data formatting succeeded. Docker VHDX remains at `%LOCALAPPDATA%\Docker\wsl\disk\docker_data.vhdx` (~146 GiB); C: free ~10 GiB. Targeted detach, including UAC, failed flushing the offline device; device-state recovery also failed. User conditionally authorized full WSL restart only AFTER other sessions finish their current work and save exact continuation records. Both owners explicitly confirmed restart readiness at 2026-10-02 10:10 KST and stopped new work. CRM resume: output/playwright/crm-business-plan-performance-20261002/restart.md. Onboarding resume: docs/common/explanation/architecture/2026-10-02-onboarding-wsl-resume.md; checkpoint includes 577 changed files and 46 logs. This session checkpoint: output/checkpoints/deployment-20261002-wsl-resume/. The user condition is satisfied; next action is the Windows-independent recovery script. On reconnection, inspect Windows logs before retrying any shutdown. Prepared guarded script `/tmp/ssoo-gate-rehearsal-p1qhqx_b/recover-docker.ps1` and Windows copy `%LOCALAPPDATA%\Temp\ssoo-docker-recovery-20261002\recover-docker.ps1`. It shuts down WSL only with `-AllowWslShutdown`, starts Docker, restores the 18 previously running containers by existing IDs, records Windows-side results and restarts Ubuntu. No images/volumes are deleted by that script. After recovery, verify DB/API/web health, clean only this attempt's disposable project, reclaim unused build cache/images while preserving DB volumes/running/recovery images, and verify actual C: free space. Do not resume mass builds.
- **Isolated rehearsal interrupted — 2026-10-02:** source `dac3d22c6431cf7559c07e755dfcb026b633e58a` contains the prior `a36e84e4` snapshot plus four approved deployment code/test files, excluding ongoing CRM/onboarding changes. Admin image finished; server/CRM Docker image copies failed with SIGBUS. Docker Desktop's WSL CLI now returns I/O errors and its engine socket times out. A disposable PostgreSQL restore exists under project `ssoo-gate-source-p1qhqx_b`; cleanup and existing-container after-state are unconfirmed until the engine returns. Do not claim a passed rehearsal or restart all local services without approval. Evidence and cleanup script: `/tmp/ssoo-gate-rehearsal-p1qhqx_b/`; design §19. Shared-tree preflight separately failed the SNS AI owner-scope contract; no duplicate domain edits were made.
- **User execution boundary:** report finished work, brief remaining/next work, and obtain approval before the next scope. Production deployment is triggered through GitLab remote commits/push and its CI/CD pipeline; this local rehearsal authorization does not include remote push or direct server deployment.
- **Cross-session coordination — 2026-10-02 09:45:** user reported the same Docker failure blocking another session. Stopped this session's remaining isolated host builds and confirmed no matching build processes remain. Frozen preflight and 49 deployment tests passed, but platform guard was interrupted during DMS build and is NOT passed. Kernel evidence maps repeated READ I/O errors to `/dev/loop0`, Docker Desktop's read-only CLI ISO; no OOM kill was found in captured logs. Causation by concurrent builds is unproved and cannot be excluded. This was the initial coordination state, superseded by the active recovery ownership and user condition above. Docker recovery, existing-service verification and disk cleanup are authorized here; restarting WSL waits for all relevant session checkpoints. A new build/deployment scope still needs approval.
- **Current gate correction — 2026-10-02:** user approved separating CRM business readiness from technical deployment. Platform health now checks CRM schema access without importing its business launch service; authenticated smoke reads `/crm/opportunities`. Logo/template approvals and existing business quality findings remain CRM-owned and are not deployment prerequisites. DB/auth/API/DMS runtime failures still block. Health 15 tests and deployment contract 49 tests pass; see design §18 and `/tmp/ssoo-runtime-gate-_0n0x2zj/`. No CRM domain/seed/settings/database changes, new full-stack candidate, or remote deployment. Historical CRM blockers below describe earlier runs only; they do not direct this session to work on CRM. Previous full-stack failure evidence is not retroactively marked passed.
- Fetched GitLab development `2a2fbd7a` and content-merged the nine recovery commits (17 files), preserving the current uncommitted development work. No merge commit/push/deployment has been performed.
- Added core and five-app readiness, immutable release planning, affected image builds, strict DB checks, isolated backup rehearsal and all-app authenticated smoke. Retained DMS owner checks and recovery behavior.
- Added `pnpm run codex:platform-guard`; DMS-specific guard remains available. See [implementation and activation runbook](docs/common/explanation/architecture/2026-10-01-deployment-design.md#12-2026-10-01-구현-현황과-활성화-절차).
- `CI_DEPLOY_MODE=plan-only` and `CI_INCREMENTAL_BUILD=false` remain the rollout defaults. Local follow-up built all seven images, verified a real clone backup/restore and two strict initializations, and exercised 36 release tests. Full-stack rehearsal correctly failed on CRM owner readiness (seller/CI, unreviewed templates, billing-total mismatch). Five web auth proxies passed in a separate diagnostic clone. See design §13 for evidence and limits; staging recovery is still unproved.
- Fixed swallowed Bash smoke failures, durable interrupted-deploy detection, project-scoped container checks, offline Prisma generation, symbolic-link input hashing and copied Git mirror ownership. No old db-init is replayed. Local evidence is private under `/tmp/ssoo-deployment-lab-20261001/`; it does not include later concurrent onboarding changes.
- The historical "switch health to liveness" suggestion below is superseded: Compose uses core readiness, and deployment success requires all five app runtimes, including strict DMS readiness. CRM business launch readiness is separate (§18). Never replay the old db-init as rollback.
- User prohibited duplicate CRM changes while another session owns CRM. Deployment seed audit found 39 included scripts that can overwrite auth/seller settings and recreate sample details. Approved follow-up now separates upgrade (no seeds), fresh reference bootstrap (20 files, no accounts/business demos), and local disposable demo provisioning; production/rehearsal force upgrade. CRM seed originals and readiness policy remain unchanged. See design §15 and the DB guide. First administrator/admission provisioning stays with the onboarding owner. Technical-versus-business gates remain proposals; keep rollout plan-only. The billing mismatch previously reported as an operational violation is a pre-existing UI reference fixture.
- Real Docker orchestration fixture checks passed all five scenarios, including distinct-image rollback and partial SQL failure with all old writers stopped. Evidence: `/tmp/ssoo-release-docker-PKwhmx/report.json`; cleanup passed. These use synthetic prerequisite evidence and test-only HTTP/SQL services, and do not establish product readiness or staging recovery.
- Seed separation actual-db-init verification passed five checks: fresh/bootstrap guards, reference-only provisioning, full 228-table/120-sequence preservation under managed upgrade, and restored dump migration 12→17 with protected auth/seller/contract data preserved. Evidence: `/tmp/ssoo-db-init-test-Yon7Fw/report.json`; cleanup passed. Current DB source was frozen in `/tmp/ssoo-seed-split-i0h_6uee/`; this is not a new seven-app release build. CI contract 40, DB contract 9, Compose self-test, preflight, docs and instruction sync passed. Whole-app rehearsal with the completed CRM/onboarding work and staging baseline recovery remain outstanding.
- Follow-up full Docker rehearsal: frozen local SHA `a36e84e4667733e6f7e291b262380a133cd2c87b` built all seven images, passed cloned DB 12→17 migration/89 triggers/drift 0, verified backup restore, two upgrade initializations, six app image/source identities and five authenticated web proxies. Core/Admin/PMS/DMS/SNS readiness passed; whole rehearsal correctly failed on four CRM prerequisites: CI status `dms-planned`, unconfirmed quote/contract templates, one pre-existing UI reference billing mismatch. Evidence: `/tmp/ssoo-platform-rehearsal-5axu244l/summary.json`, design §16. Test resources cleaned; all 18 pre-existing container IDs preserved. Parallel work changed 42 app/package files and added the CRM planning organization migration after capture; those changes are NOT covered. No CRM code/settings edits or remote deployment. Freeze a new completed candidate after owner prerequisites are resolved.
- User confirmed CRM work is still in progress: verify completed scope only. DB-only follow-up passed 12→18 migrations/89 triggers/drift 0, preserved existing columns across 37 CRM tables/27 sequences, and repeat-upgrade preserved all 228 application tables/120 sequences. Evidence `/tmp/ssoo-db-init-test-S6fCQx/report.json`; cleanup passed. CI reference `assets/images/ci.png` is an invalid storage URI, so a status flip is insufficient: use actual upload then profile save. Both blocked template DOCX files pass CRC/XML/registry checksum checks, but human/business review remains absent. See design §17; no new full-app release, CRM edits, approval writes, or remote deployment.

GitLab staging deploy recovery — 2026-09-30 (in progress)
---------------------------------------------------------

Status at end of day (2026-09-30 21:20 KST) — READ FIRST
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
