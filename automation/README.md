# Automation workspace

Execution assets for local GitLab issue operator flows and DMS Playwright smoke tests live here. Root entry surfaces stay at the repo root:

- `pnpm run copilot:issue:*`
- `pnpm run test:e2e:dms`

## Layout

- `scripts/copilot-issue/` - GitLab issue operator execution scripts
- `scripts/playwright/start-dms-e2e-stack.sh` - DMS smoke stack bootstrap
- `tests/e2e/` - Playwright smoke specs
- `playwright.config.ts` - Playwright config used by `pnpm run test:e2e:dms`

## Related docs

- [Canonical operator runbook](../docs/dms/guides/gitlab-issue-operator-mode.md)
- [Root entry guide](../.github/guides/05-copilot-issue-operator-mode.md)
