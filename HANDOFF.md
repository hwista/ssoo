Handoff: DMS refactor & next steps

Overview
--------
This document summarizes recent progress, current state, and recommended next steps for the DMS refactor work in this repository. It is intended for a maintainer to pick up work from the CLI or another environment.

Context
-------
- Monorepo: apps/{server,web/*} + shared packages
- DMS is integrated as the canonical document store (git-backed working tree + DB metadata)
- Primary goal: refactor large files, stabilize auto-commit/publish pipeline, and add tests for core DMS logic

Completed
---------
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
- Publish target for this snapshot: `origin/main` and `gitlab/main`
- This handoff belongs to the DMS launch closeout commit created from the current working tree.
- Recent committed:
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
None. DMS launch closeout implementation, final gates, and Docker rebuild/health verification are complete for this slice.

Publish snapshot — 2026-05-27 10:04 KST
---------------------------------------
- Scope: DMS search/permission launch gate closeout.
- Core implementation: unreadable search redaction, Search/Ask blocked-source summaries, permission workflow regression automation, and search history migration artifact.
- Docs synced: root handoff, DMS launch closeout handoff, backlog, roadmap, changelog.
- Verification passed:
  - `pnpm --filter @ssoo/types build`
  - `pnpm --filter server build`
  - `pnpm --filter web-dms build`
  - `pnpm --filter server exec node --experimental-vm-modules node_modules/jest/bin/jest.js test/dms/path-and-search.helpers.spec.ts --runInBand`
  - `pnpm run verify:access-dms:raw`
  - `pnpm run codex:dms-guard`
  - `pnpm run codex:verify-sync`
  - `pnpm run codex:preflight`
- Runtime state: Docker `server` and `dms` were rebuilt and are healthy; DMS web and API health both returned HTTP 200.
- DB runtime check: `dms.dm_search_query_m` exists in the running Postgres database.

Next recommended actions (in priority order)
--------------------------------------------

**DMS launch smoke (P1, same-day)**

1. Perform browser launch smoke: login, AI search, locked document entry, access request CTA, approve/reject/revoke path.
2. Freeze operating seed/account/document-root state for launch.
3. Track any browser-only regression as a new bug; do not reopen the completed search/permission closeout unless a regression is reproduced.

**Phase C — Operational polish (P2, ~3-5 days)**

4. Storage error message standardization (SharePoint / NAS — permission vs timeout vs expired) — `DMS-STO-02-A`
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
- GitLab `development` push currently blocked (see issue above)
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
  - `.runtime/dms/documents`: `## master...origin/master`, with untracked `_templates/`.
  - `/home/a0122024330/src/lswiki-docs`: `## master...origin/master`, with many modified/untracked `.sidecar.json` files.

3) Changed files / verification results
- This handoff request intentionally performed no implementation changes.
- File changed by this handoff request:
  - `HANDOFF.md` — appended this recovery snapshot section.
- Verification commands run during this handoff request:
  - `date '+%Y-%m-%d %H:%M:%S %Z' && git status --short --branch && git log --oneline -5` — success.
  - `git -C .runtime/dms/documents status --short --branch && git -C /home/a0122024330/src/lswiki-docs status --short --branch` — success.
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
  - Current config had `storage.defaultProvider = sharepoint`; probe images were observed under `/sites/dms/shared-documents/_assets/images/...` inside the server container.
  - `GET /dms/file/raw` only resolves against markdown root via `fileCrudService.resolveFilePath(...)`, so it misses storage-backed images.
  - `GET /dms/file/serve-attachment` already has a storage-backed fallback path; raw image serving needs equivalent behavior or a deliberate alternative contract.

4) Re-entry commands / next small step
- Recommended re-entry commands:
  1. `cd /home/a0122024330/src/ssoo`
  2. `git status --short --branch`
  3. `git log --oneline -5`
  4. `git -C .runtime/dms/documents status --short --branch`
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
  - Docker server currently binds `.runtime/dms/documents`, while `/home/a0122024330/src/lswiki-docs` also exists as a GitLab document clone and is dirty. Confirm which path should be treated as the canonical local runtime working tree.
- Sidecar risk:
  - `.sidecar.json` files remain in document repos despite the current no-sidecar runtime contract. Need a deliberate cleanup/archival policy before deleting or committing them.
- Raw binary risk:
  - `verify:access-dms:raw` is red until raw image endpoint supports storage-backed assets or the upload/materialization contract is changed.
- Storage provider risk:
  - DB config currently routes default uploads to `sharepoint`, represented locally by `/sites/dms/shared-documents`. Confirm whether this is intentional for local Docker verification.
- Test-command risk:
  - Use the direct Jest command for `--runInBand`; `pnpm --filter server test -- --runInBand` is known to fail due to argument forwarding.
- Documentation edit risk:
  - This HANDOFF update itself is a working-tree documentation change and should be committed, amended into the local ahead commit, or reverted based on the next operator’s intent.

Launch closeout snapshot — 2026-05-27 08:30 KST
------------------------------------------------

Purpose of this snapshot
- This section is the current re-entry handoff for DMS launch-prep work.
- Scope is DMS only. PMS/CMS integration acceptance is intentionally out of scope.
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
- Do not broaden this session into PMS/CMS unless explicitly instructed.
- Do not close a DMS runtime change without Docker rebuild and health/browser verification.

Contact
-------
For questions about decisions or tests, check `docs/dms/guides/`, `docs/dms/planning/`, and recent commits.
