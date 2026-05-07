# DMS GitLab document sync operations doc slice

- Date: 2026-05-07
- Harness run: `run-20260507-144258-6772ab`
- Type: docs/checker-only operational hardening
- Runtime/API/schema changes: none

## Trigger

DMS GitLab document auto-sync is already implemented in code, but the remaining operator-owned items must be explicit before a deployment handoff:

- `compose.yaml` now passes `DMS_GIT_BOOTSTRAP_REMOTE_URL` and `DMS_GIT_BOOTSTRAP_BRANCH` from root `.env` into the server container.
- Operators need to set the live `.env` values, especially `DMS_GIT_BOOTSTRAP_REMOTE_URL` for the document-only GitLab repository (`LSWIKI_DOC.git`).
- Existing docs mention GitLab workspace sync/publish, but do not give a compact one-page operator guide for server startup document bootstrap modes.
- The next phase should not accidentally treat the already implemented code path as missing product code.

## Current implementation evidence

- `apps/server/src/modules/dms/dms.module.ts:75-95` calls `gitService.initialize()` during `onModuleInit()`.
- `apps/server/src/modules/dms/runtime/git.service.ts:207-505` implements:
  - empty document root + remote -> `clone`
  - existing `.git` -> remote ensure + fast-forward-only auto-pull (`existing-pulled` when changed)
  - non-empty + non-git + remote -> `reconcile-merge`
  - non-empty + non-git + no remote -> fail with reconcile-required message
- `apps/server/test/dms/dms-config.service.spec.ts` covers env precedence for `DMS_GIT_BOOTSTRAP_REMOTE_URL` and `DMS_GIT_BOOTSTRAP_BRANCH`.

## Scope

In scope:

1. Add an operator-facing DMS GitLab document sync guide.
2. Patch existing DMS operations docs to point to that guide and summarize the four bootstrap modes.
3. Add a lightweight docs checker so the guide cannot omit the key env vars, startup hook, bootstrap modes, and operator boundaries.
4. Register the checker in `pnpm run docs:verify:raw`.

Out of scope:

- Setting real `.env` secret/token/remote values.
- Changing `compose.yaml` from commented sample to production live values.
- Running `pnpm run codex:workspace-sync-from-gitlab` against a real GitLab remote.
- Changing DMS runtime code, ACL semantics, or storage bindings.
- Committing unrelated in-progress DMS access/grant work already present in the working tree.

## Verification plan

- RED: run the new docs checker before the guide exists and confirm it fails.
- GREEN: add/update docs and confirm checker passes.
- `pnpm run docs:verify:raw`
- `pnpm run codex:verify-sync`
- `pnpm run codex:dms-guard`
- targeted server DMS tests if no dependency/build blocker exists.
- `git diff --check`

## Expected next-batch progress

This slice should complete the operator guide/checker side only. Expected progress: 1 small docs/checker batch, with no runtime redeploy required unless verification or user follow-up requests it.

## Changelog

| Date | Change |
|------|--------|
| 2026-05-07 | Captured the DMS GitLab document sync operations documentation slice and verification scope. |
| 2026-05-07 | Updated the slice after operator feedback so compose passes DMS Git bootstrap env into the server container. |
