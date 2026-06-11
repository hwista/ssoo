# SSOO Local Port Map

> Status: local development/runtime baseline
> Last updated: 2026-06-10
> Scope: SSOO monorepo host ports, future control/settings split reservation, and nearby-project collision policy on this WSL/Docker workstation.

## Decision summary

SSOO reserves the local `3000-3009` web-app band plus `4000` for the API and `5432` for the app-owned local PostgreSQL container. Other local projects, including bud:D, must not bind into the SSOO `3000-3009` band while SSOO is being used as a full monorepo runtime.

The first five web ports are assigned in product-navigation order:

1. `3000` Admin
2. `3001` CRM
3. `3002` PMS
4. `3003` DMS
5. `3004` SNS

`3005` is intentionally held for a possible Settings/Control app if the current Admin surface later splits into separate configuration and control-plane surfaces. Until that split exists as an actual workspace, Admin remains the canonical place for account/organization/admin configuration and AI/system control entry points.

## Canonical SSOO ports

| Service | Workspace / compose service | Host port | Container/app port | URL | Notes |
| --- | --- | ---: | ---: | --- | --- |
| Admin web | `apps/web/admin` / `admin` | 3000 | 3000 | `http://localhost:3000` | Account, organization, admin configuration, and current control-plane entry surface. |
| CRM web | `apps/web/crm` / `crm` | 3001 | 3001 | `http://localhost:3001` | Opportunity/contract/billing ledger surface. |
| PMS web | `apps/web/pms` / `pms` | 3002 | 3002 | `http://localhost:3002` | Project execution surface and shell reference. |
| DMS web | `apps/web/dms` / `dms` | 3003 | 3003 | `http://localhost:3003` | DMS launch/runtime validation target. |
| SNS web | `apps/web/sns` / `sns` | 3004 | 3004 | `http://localhost:3004` | Standalone SNS surface. |
| Reserved Settings/Control web | TBD, likely `apps/web/settings` or `apps/web/control` | 3005 | 3005 | `http://localhost:3005` | Reserved only if Admin splits configuration from operational control. Do not consume for unrelated apps. |
| Future SSOO web app | TBD | 3006-3009 | same as host | `http://localhost:3006+` | Reserved for SSOO only; do not assign to unrelated projects. |
| SSOO API | `apps/server` / `server` | 4000 | 4000 | `http://localhost:4000/api` | Shared NestJS API. Health: `/api/health`. |
| PostgreSQL | `postgres` | 5432 | 5432 | `localhost:5432` | Local app-owned SSOO DB. |

## Settings/control split rule

The port map should not force a new app prematurely. Split only when the surface contract becomes operationally different enough that routing inside Admin is no longer sufficient.

Use `3005` for the new app if either of these becomes true:

- Configuration/settings work remains user/org/admin oriented while control work becomes runtime-oriented, high-risk, or operator-only.
- The control surface needs independent deploy cadence, permissions, audit stream, health checks, or live operational UI separate from Admin CRUD/settings screens.

Until then, keep these under Admin on `3000`:

- account and organization settings
- role/permission configuration
- workspace/service registration settings
- AI/system control-plane entry points that are still administrative configuration rather than a distinct runtime console

## Nearby-project collision policy

| Project | Current observed conflict | Recommended host port | Reason |
| --- | --- | ---: | --- |
| bud:D web | Previously observed on host `3003`, now conflicts with canonical DMS | 3103 | Keeps bud:D close to its previous URL while leaving SSOO `3000-3009` reserved. |
| Temporary verification containers | Any `3000-3009` binding | 3300+ only for temporary verification | Do not use as canonical SSOO app ports. Remove after verification if not needed. |
| LINEUP | Uses `13000`, `18000`, `15432`, `16379` | keep as-is | Already outside the SSOO band. |
| AGP | Uses `56000`, `57000`, `57432`, `58379` | keep as-is | Already outside the SSOO band. |

## Runtime checks

Use these before starting Admin or changing a port binding:

```bash
docker ps --format 'table {{.Names}}\t{{.Ports}}'
ss -ltnp
```

Expected SSOO full-stack bindings:

```text
3000 -> ssoo-admin
3001 -> ssoo-crm
3002 -> ssoo-pms
3003 -> ssoo-dms
3004 -> ssoo-sns
3005 -> reserved for possible settings/control split
4000 -> ssoo-server
5432 -> ssoo-postgres
```

If any `3000-3009` port is already bound by another project, move that project first instead of moving the SSOO canonical app.

## Compose/env rules

- `compose.yaml` should keep SSOO ports aligned with the package `dev` scripts and Dockerfile `PORT`/`EXPOSE` values.
- Server `CORS_ORIGIN` defaults must include `3000,3001,3002,3003,3004`; add `3005` only when the split app actually exists.
- If a one-off verification needs an alternate host port, use a temporary `3300+` host port override, but do not document it as canonical.
- Unrelated projects should use their own band or explicit alternate host ports; do not occupy SSOO `3000-3009`.

## Changelog

| Date | Change |
| --- | --- |
| 2026-06-10 | Reordered canonical web ports to Admin/CRM/PMS/DMS/SNS as `3000-3004` and reserved `3005` for a possible Settings/Control split. |
| 2026-06-09 | Established canonical SSOO local port map and selected `3103` as the bud:D web alternate to free the SSOO band. |
