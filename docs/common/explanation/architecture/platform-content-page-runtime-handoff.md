# Platform content page runtime handoff

> Last updated: 2026-06-22

This document is the handoff point for continuing from platform shell/content-page standardization into operations, settings, and control-plane completion work.

## Current status

The platform shell and internal page recipe normalization work is complete for the defined scope.

- `@ssoo/web-shell` route registry exposes `contentPage` as the only public page route kind.
- `legacyException`, shell-page route kinds, and legacy migration target types are removed from the public registry contract.
- PMS, CRM, SNS, and Admin local pages are promoted to `contentPage` through app-local domain adapters.
- DMS home and stale route handoff pages are promoted to `contentPage` through `DMS PageTemplate` and `routeHandoffPage` adapters.
- User profile/settings and global search routes remain shared content-page surfaces.
- `verify:ssoo-frame` blocks reintroduction of legacy route kinds, app-wide direct low-level MDI content primitive consumption, stale header/search contracts, and page-recipe escape hatches.
- `codex:preflight`, `codex:push-guard`, and PR validation include the `verify:ssoo-frame -- --skip-runtime` source contract gate.
- `verify:ui-primitives` and `verify:ui-consumption` block app-local primitive recipes, raw control tags, pseudo-controls, and primitive recipe className duplication.

The remaining app-local adapters are not exceptions to the route contract. They are compatibility wrappers that preserve existing screen appearance until each screen is individually refined into narrower page recipes.

## Source of truth

Core implementation:

- `packages/web-shell/src/mdi-page-registry.tsx`
- `packages/web-shell/src/content-page-template.tsx`
- `packages/web-shell/src/shared-surface-content-page.tsx`
- `packages/web-shell/src/tabbar.tsx`
- `packages/web-shell/src/notification-center.tsx`
- `packages/web-ui/src/button.tsx`
- `packages/web-ui/src/segmented-control.tsx`

App integration:

- `apps/web/admin/src/components/layout/ContentArea.tsx`
- `apps/web/crm/src/components/layout/ContentArea.tsx`
- `apps/web/pms/src/components/layout/ContentArea.tsx`
- `apps/web/dms/src/components/layout/ContentArea.tsx`
- `apps/web/sns/src/components/layout/ContentArea.tsx`

Verification:

- `scripts/verify-ssoo-frame.mjs`
- `.github/scripts/verify-ui-primitives.js`
- `.github/scripts/verify-ui-consumption.js`
- `.codex/hooks/preflight.sh`
- `.codex/hooks/dms-guard.sh`
- `.codex/hooks/push-guard.sh`
- `.github/workflows/pr-validation.yml`

Canonical docs:

- `docs/common/explanation/architecture/ssoo-frame-system.md`
- `docs/common/explanation/architecture/content-page-assembly-standard.md`
- `docs/common/explanation/architecture/settings-admin-control-plane.md`
- `docs/dms/guides/golden-example.md`
- `docs/dms/planning/changelog.md`

## Verification evidence

Local build and rule gates:

- `pnpm run verify:ssoo-frame` passed.
- `pnpm run codex:preflight` passed.
- `pnpm --filter @ssoo/web-ui build` passed.
- `pnpm --filter @ssoo/web-shell build` passed.
- `pnpm run build:web-admin` passed.
- `pnpm run build:web-crm` passed.
- `pnpm run build:web-pms` passed.
- `pnpm run build:web-sns` passed.
- `pnpm run codex:dms-guard` passed.

Docker/runtime gates:

- `pnpm docker:up` rebuilt and restarted `postgres`, `db-init`, `server`, `admin`, `crm`, `pms`, `dms`, and `sns`.
- `pnpm docker:ps` showed all long-running services healthy:
  - `ssoo-server` on `4000`
  - `ssoo-admin` on `3000`
  - `ssoo-crm` on `3001`
  - `ssoo-pms` on `3002`
  - `ssoo-dms` on `3003`
  - `ssoo-sns` on `3004`
  - `ssoo-postgres` on `5432`
- `curl http://localhost:4000/api/health` returned `success: true` and `status: ok`.
- HTTP root checks returned `200` for Admin, CRM, PMS, DMS, and SNS.
- `pnpm verify:access-smoke` passed against the Docker runtime.
- `pnpm verify:pms-launch` passed against the Docker runtime.
- `pnpm verify:access-admin` passed against the Docker runtime.
- `pnpm verify:access-dms` passed against the Docker runtime.

## Known warnings

- Several Next builds still print stale Browserslist data warnings. This is not a functional blocker, but the dependency database should be refreshed in a separate maintenance task.
- A previous Admin standalone trace failure and DMS manifest failure were transient `.next` artifact issues. Admin passed after `apps/web/admin` clean and rebuild; DMS passed through the guard retry path.
- Docker build can be slow because dependency layers download from the npm registry. Disk capacity was sufficient during this run.

## Next workstream

The next workstream is operations, settings, and control-plane completeness. Start from the platform contracts above and do not introduce new shell/page exceptions.

Recommended order:

1. Admin operation/control-plane inventory
   - Confirm which operating controls belong in Admin, DMS settings, or server-only APIs.
   - Use `settings-admin-control-plane.md` as the responsibility boundary.
   - Keep user/role/org/auth/DMS operations under Admin-facing control surfaces.

2. DMS settings and runtime observability
   - Continue from existing DMS settings sections for Git, storage, ingest, templates runtime, AI, and document access.
   - Keep system/runtime settings admin-only and personal settings available to non-admin users.
   - Validate with `pnpm run codex:dms-guard` and `pnpm verify:access-dms`.

3. PMS project control completeness
   - Preserve PMS local page adapter status until each screen is refined.
   - When refining a PMS page, keep it under `contentPage`; replace only the adapter internals with direct recipe usage where the screen is ready.
   - Validate with `pnpm verify:pms-launch` and affected app build.

4. Shared UI primitive tightening
   - Add missing repeated controls to `@ssoo/web-ui` before copying recipe classes into apps.
   - Keep `Button`, `Input`, `NativeSelect`, `Textarea`, `Table`, `SegmentedControl` usage within the primitive consumption gate.

## Resume checklist

Before changing code:

1. `git fetch origin`
2. `pnpm run codex:preflight`
3. `pnpm run verify:ssoo-frame`
4. `pnpm docker:ps`

Before push:

1. `pnpm run codex:preflight`
2. `pnpm run verify:ssoo-frame`
3. `pnpm run codex:dms-guard` when DMS is touched
4. `pnpm run codex:push-guard`
5. `pnpm run codex:workspace-publish`

If GitLab `development` is ahead, `codex:workspace-publish` stops before pushing and instructs the operator to run `pnpm run codex:workspace-sync-from-gitlab`. After a GitLab sync merge, rerun Docker/runtime verification before publishing.

## Changelog

| Date | Change |
| --- | --- |
| 2026-06-22 | Wired `verify:ssoo-frame -- --skip-runtime` into preflight, push guard, and PR validation; added app-wide low-level MDI content primitive bypass detection. |
| 2026-06-19 | Added platform content-page runtime handoff, Docker/runtime verification evidence, and the operations/settings/control-plane resume path. |
