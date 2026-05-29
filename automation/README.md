# Automation workspace

Execution assets for local GitLab issue operator flows and DMS Playwright smoke tests live here. Root entry surfaces stay at the repo root:

- `pnpm run copilot:issue:*`
- `pnpm run test:e2e:dms`

## Layout

- `scripts/copilot-issue/` - GitLab issue operator execution scripts
- `scripts/playwright/start-dms-e2e-stack.sh` - DMS smoke stack bootstrap
- `tests/e2e/` - Playwright smoke specs
- `playwright.config.ts` - Playwright config used by `pnpm run test:e2e:dms`

## Shared operator merge rule

- GitLab issue operator finalization uses a conservative shared-branch flow.
- Sync the latest target branch (`development` by default) into the current execution branch first via `pnpm run codex:workspace-sync-from-gitlab`.
- Resolve conflicts and validate on the execution branch, then reflect that branch back to `development` with `pnpm run codex:workspace-publish -- development`.
- If `development` moved again before finalize, repeat the sync/validate cycle before `pnpm run copilot:issue:merge`.

## Related docs

- [Canonical operator runbook](../docs/dms/guides/gitlab-issue-operator-mode.md)
- [Root entry guide](../.github/guides/05-copilot-issue-operator-mode.md)
