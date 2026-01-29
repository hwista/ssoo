# DMS handoff (AGENTS)

Last updated: 2026-01-28
Scope: hwista-ssoo/apps/web/dms and its docs

## Purpose
This file is the handoff memo for DMS integration work. New agents should read this first and continue based on the rules, current state, and open gaps below.

## Source of truth
- DMS development docs (official): `apps/web/dms/docs/development/`
- Monorepo integration docs (reference only): `docs/dms/`
- Common standards: `docs/common/architecture/`

## Mandatory working rules
1) Standard process (must follow)
- Code change -> document update -> commit
- Update relevant Backlog/Changelog in the same doc after changes
- Reference: `docs/common/architecture/workflow-process.md`

2) Development standards (must follow)
- Layered architecture and dependency direction (templates -> common -> ui, pages -> hooks -> lib/api)
- Component size guide (ui ~50, common ~150, template ~200, page ~150 lines)
- Naming rules (PascalCase components, camelCase hooks/utils)
- Explicit re-export only (no wildcard export)
- Reference: `docs/common/architecture/development-standards.md`

3) DMS independence (must follow)
- DMS uses npm only, keep `package-lock.json`
- Do not add monorepo packages (`@ssoo/types`, `@ssoo/database`, etc.)
- Do not change monorepo root configs to make DMS work
- DMS must run standalone after cloning the DMS repo
- References:
  - `docs/dms/architecture/package-integration-plan.md`
  - `docs/dms/architecture/git-subtree-integration.md`

## DMS handoff checklist (before starting work)
- Confirm you are working under `apps/web/dms/` and not modifying monorepo packages
- Read `apps/web/dms/docs/development/README.md` for the current doc index
- Review `docs/dms/architecture/package-integration-plan.md` for integration constraints
- Check `apps/web/dms/package.json` to confirm actual dependencies

## Current state summary (as of 2026-01-28)
- DMS docs structure is finalized and the official docs live in `apps/web/dms/docs/development/`.
- `docs/dms/` is reserved for monorepo integration-only documentation.
- DMS is independent (npm, no `@ssoo/*` workspace packages). This is a hard rule.
- DMS roadmap shows monorepo integration targeted for 2026-Q2 (Phase 6).
- DMS backlog shows DMS-INT-01 in progress and DMS-INT-02 completed.

## Findings from the last workspace scan
- `apps/web/dms/docs/development/verification-report.md` still references `docs/dms/guides` as the official docs (outdated).
- `apps/web/dms/docs/development/architecture/package-spec.md` lists Fluent UI, but Fluent UI packages are not in `apps/web/dms/package.json`.
- `docs/dms/architecture/package-integration-plan.md` marks several packages as removal candidates, but they still exist in `apps/web/dms/package.json`.
- Most DMS docs do not yet include Backlog/Changelog sections even though common standards require them.

## Agreed next steps (current task order)
1) Adopt per-document Backlog/Changelog sections for DMS docs (standard alignment).
2) Document consistency fixes (start here):
   - Update `apps/web/dms/docs/development/verification-report.md` to point to the correct official docs.
   - Update `apps/web/dms/docs/development/architecture/package-spec.md` to match actual dependencies.
3) After consistency fixes, continue integration work without breaking DMS independence.

## Key reference paths
- DMS doc index: `apps/web/dms/docs/development/README.md`
- DMS tech stack: `apps/web/dms/docs/development/architecture/tech-stack.md`
- DMS package spec: `apps/web/dms/docs/development/architecture/package-spec.md`
- DMS planning: `apps/web/dms/docs/development/planning/`
- Monorepo integration plan: `docs/dms/architecture/package-integration-plan.md`
- Git subtree guide: `docs/dms/architecture/git-subtree-integration.md`
- Common workflow/standards: `docs/common/architecture/workflow-process.md`, `docs/common/architecture/development-standards.md`

---

## Backlog

| ID | 항목 | 우선순위 | 상태 |
|----|------|----------|------|
| AG-01 | DMS 문서별 Backlog/Changelog 섹션 확대 적용 | P1 | 🔄 진행중 |

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-01-28 | AGENTS 최초 작성 |
