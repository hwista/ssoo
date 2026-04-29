Handoff: DMS refactor & next steps

Overview
--------
This document summarizes recent progress, current state, and recommended next steps for the DMS refactor work in this repository. It is intended for a maintainer to pick up work from the CLI or another environment.

Context
-------
- Monorepo: apps/{server,web/*} + shared packages
- DMS is integrated as the canonical document store (git-backed working tree + DB metadata)
- Primary goal: refactor large files, stabilize auto-commit/publish pipeline, and add tests for core DMS logic

Completed recently
------------------
- C-1: DocumentPage hooks extraction and cleanup (DocumentPage.tsx reduced to ~1997 lines)
- C-2: Collaboration service decomposition into 4 util files (paths, sanitizers, isolation, state IO)
- D-2: Collaboration unit and integration tests added (110 tests across 6 suites; passed)
- C-3 slice 1: Extracted git path/format helpers to apps/server/src/modules/dms/runtime/git-paths.util.ts
- C-3 slice 2: Extracted git sync/parity helpers to apps/server/src/modules/dms/runtime/git-sync.util.ts

Current branch/commit
---------------------
- Branch: main
- Latest commits:
  - eedb751 refactor(dms): extract git sync/parity utils
  - 4c5df24 refactor(dms): extract git path/format utils
  - f41854d test(dms): collaboration service core spec

Files of interest
-----------------
- apps/server/src/modules/dms/collaboration/collaboration.service.ts (858 lines)
- apps/server/src/modules/dms/runtime/git.service.ts (1286 lines)
- apps/server/src/modules/dms/runtime/git-paths.util.ts
- apps/server/src/modules/dms/runtime/git-sync.util.ts
- apps/web/dms/src/components/pages/markdown/DocumentPage.tsx (1997 lines)
- apps/server/src/modules/dms/access/access-request.service.ts (2150 lines)
- apps/server/test/dms/*.spec.ts (existing tests)

Build & test
------------
- Run TypeScript: pnpm --filter server exec tsc --noEmit
- Lint: pnpm --filter server lint
- Tests: pnpm --filter server test (110 tests currently pass)

Current in-progress todo
------------------------
- phaseC-3-git-service (in_progress in session DB)

Next recommended actions
------------------------
1. Continue C-3: further split git.service.ts
   - Slice 3: extract inspectSyncStatusWithGit and git binary fallback logic into git-sync.util or git-inspect.service
   - Slice 4: extract getRepositoryBindingStatus into a dedicated helper/service
   - Verify tsc + lint + tests after each slice
2. Start C-4: access-request.service decomposition (2150 lines). Prioritize stateless util extraction first.
3. Add HTTP integration tests for file.controller, collaboration.controller, content.controller (D-3)
4. Add Admin tests (dms-admin.service.spec.ts) and smoke tests for admin pages

Environment notes
-----------------
- GH remote is configured; pushes to main and GitLab development are automated in workflow
- Commit footer format: Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>

How to pick up from CLI
-----------------------
1. Pull latest main: git pull origin main
2. Install deps: pnpm install
3. Run server tests: pnpm --filter server test
4. Implement next slice edits (e.g., extract inspectSyncStatusWithGit):
   - Create new util file under apps/server/src/modules/dms/runtime/
   - Replace internal `this.` helpers with imported functions
   - Run tsc/lint/tests
5. Commit & push (GH + GL as required)

Contact
-------
- For questions about code decisions or tests, check `docs/dms/guides/` and recent commits on 2026-04-28..29

