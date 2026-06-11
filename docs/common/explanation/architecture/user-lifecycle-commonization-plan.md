# SSOO Shared User Lifecycle Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Make Admin, CRM, PMS, DMS, and SNS behave as one shared SSOO user lifecycle for login, logout, session revocation, profile ownership, access refresh, and user-scoped cleanup.

**Architecture:** Server session state is the source of truth. Browser access tokens are cache only. SNS owns user-facing profile/account-experience surfaces, Admin owns platform/operator account/org/permission controls, and domain apps own domain-specific access plus user-scoped cleanup.

**Tech Stack:** NestJS server auth/access modules, Prisma-backed `cm_user_session_m`, Next.js app-local auth proxies, `@ssoo/web-auth`, Zustand stores, Docker Compose five-app runtime.

---

## Non-negotiable acceptance gate

The next implementation slice is not complete until this manual and automated scenario passes:

1. Open Admin `:3000`, CRM `:3001`, PMS `:3002`, DMS `:3003`, SNS `:3004` authenticated as the same user.
2. Log out from PMS.
3. Refresh Admin, CRM, DMS, and SNS.
4. Every refreshed app must route to `/login`.
5. Any protected API call with the old access token must return 401.

This gate is defined in `docs/common/explanation/architecture/user-lifecycle-commonization.md`.

---

## Task 1: Add revoked-session regression coverage for server auth

**Objective:** Prove that a logged-out session cannot keep using an old access token.

**Files:**
- Inspect: `apps/server/src/modules/common/auth/auth.service.ts`
- Inspect: `apps/server/src/modules/common/auth/strategies/jwt.strategy.ts`
- Inspect: existing server tests under `apps/server/src/**/*.spec.ts`
- Create or modify: focused auth/session spec near existing common auth tests

**Steps:**

1. Locate the current server auth test pattern.
   - Run: `git ls-files 'apps/server/src/**/*.spec.ts' | grep -E 'auth|user|access'`
   - Expected: identify the closest Jest/Nest test harness.

2. Write a failing test for revoked access-token rejection.
   - Arrange a user/session with a valid access token containing `sessionId`.
   - Revoke the matching `cm_user_session_m` row.
   - Validate the access token through the same path used by protected requests.
   - Expected failure before implementation: token still validates.

3. Run the focused test.
   - Use the repo-safe Jest command if needed:
     `pnpm --filter server exec node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand <focused-spec>`
   - Expected: FAIL for revoked session not rejected.

---

## Task 2: Enforce session-row validity during access-token validation

**Objective:** Make access-token validity depend on the backing server session row.

**Files:**
- Modify: `apps/server/src/modules/common/auth/strategies/jwt.strategy.ts`
- Possibly modify: `apps/server/src/modules/common/auth/auth.service.ts`
- Possibly add helper: `apps/server/src/modules/common/auth/session-validation.util.ts` if duplication appears

**Design:**

`JwtStrategy.validate()` currently checks token type, user existence, user active state, and organization IDs. It must also check `payload.sessionId` against `cm_user_session_m`.

Rules:

- Missing `sessionId` on protected access tokens: reject.
- No session row: reject.
- Session row userId mismatch: reject.
- `revokedAt` set: reject.
- `expiresAt < now`: reject.
- User inactive/locked/disabled: reject using existing checks.

**Steps:**

1. Add a minimal session lookup in `JwtStrategy.validate()` after `userId` is parsed.
2. Keep organization ID resolution, but do not return a user if the session is invalid.
3. Return the existing `TokenPayload` shape after session validity passes.
4. Run the failing test from Task 1.
5. Run focused server auth/access tests.
6. Run:
   - `pnpm run verify:access-smoke`
   - `pnpm run verify:access-admin`

**Expected:** revoked-session test passes; existing access smoke remains green.

---

## Task 3: Correct shared auth bootstrap to treat localStorage as cache

**Objective:** Prevent stale local access-token state from overriding server session truth.

**Files:**
- Modify: `packages/web-auth/src/store.ts`
- Inspect: `packages/web-auth/src/auth-api.ts`
- Inspect: `packages/web-auth/src/login-bootstrap.ts`
- Inspect: `packages/web-auth/src/protected-app-bootstrap.ts`

**Design:**

Current `checkAuth()` tries local `accessToken` + `/me` before shared session restore. That can keep an app authenticated after another app logs out if `/me` accepts stale tokens. Server revocation enforcement is the primary fix, but client bootstrap must still treat local auth as cache.

Target behavior:

- `checkAuth()` should clear auth on authoritative 401.
- If `/me` fails with 401, do not keep local session.
- If `/session` fails with 401, clear local auth.
- Transient network errors may keep UI stable only when explicitly classified as transient, never when server says 401.

**Steps:**

1. Add unit coverage if the package has tests; otherwise add a small verifier script later in Task 8.
2. Update `checkAuth()` failure ordering so 401 always clears local state.
3. Ensure `restoreSession()` remains the canonical path to rebuild auth state from the HttpOnly cookie.
4. Run `pnpm --filter @ssoo/web-auth build`.
5. Run five web focused builds if touched package consumers require it:
   - `pnpm --filter web-admin build`
   - `pnpm --filter web-crm build`
   - `pnpm --filter web-pms build`
   - `pnpm --filter web-dms build`
   - `pnpm --filter web-sns build`

---

## Task 4: Add common auth clear and domain cleanup hook contract

**Objective:** Ensure auth clear resets user-scoped app state, not just auth state.

**Files:**
- Modify: `packages/web-auth/src/store.ts` or add a lifecycle callback option
- Modify app auth store wrappers as needed:
  - `apps/web/admin/src/stores/auth.store.ts`
  - `apps/web/crm/src/stores/auth.store.ts`
  - `apps/web/pms/src/stores/auth.store.ts`
  - `apps/web/dms/src/stores/auth.store.ts`
  - `apps/web/sns/src/stores/auth.store.ts`
- Inspect domain stores under each app `src/stores/**`

**Design:**

`createAuthStore()` should support an optional callback such as `onAuthCleared(reason)` or apps should call a common cleanup function immediately after logout/401. Prefer one shared hook point to avoid each app forgetting the cleanup.

Reasons to distinguish:

- `logout`
- `unauthorized`
- `session-expired`
- `user-switch`
- `manual-clear`

**Steps:**

1. Add the callback option without changing app behavior.
2. Wire PMS cleanup for tabs/access/project user state.
3. Wire SNS cleanup for access/feed/profile/notification user state.
4. Wire DMS cleanup carefully: reset file/access/session/socket user state without deleting unsaved drafts blindly unless the existing DMS product rule allows it.
5. Wire Admin/CRM minimal cleanup for stale operation/detail caches.
6. Build affected apps.

**Expected:** logout or 401 clears both auth and user-scoped domain state.

---

## Task 5: Normalize API 401 handling across app clients

**Objective:** Make every protected API path clear stale auth and route to login on authoritative 401.

**Files:**
- Inspect app API clients under:
  - `apps/web/admin/src/lib/**`
  - `apps/web/crm/src/lib/**`
  - `apps/web/pms/src/lib/**`
  - `apps/web/dms/src/lib/**`
  - `apps/web/sns/src/lib/**`
- Reuse or extend `@ssoo/web-auth` helpers if possible

**Design:**

A domain API 401 is an auth lifecycle event, not only an API error.

Target:

- 401 from protected API clears auth.
- Access/session restore may be attempted once when appropriate.
- If restore fails with 401, route to login.
- Do not infinite-loop refresh/restore.

**Steps:**

1. Identify each app’s fetch/Axios wrapper.
2. Add or reuse a shared `handleUnauthorizedAuthFailure()` helper.
3. Apply to PMS/SNS/DMS first, then Admin/CRM.
4. Add focused smoke scripts or tests for at least one representative API per app.

---

## Task 6: Add browser lifecycle session checks

**Objective:** Make stale tabs converge when focused or reactivated.

**Files:**
- Modify: `packages/web-auth/src/protected-app-bootstrap.ts` or add a new hook
- Modify app protected layouts if an option must be passed

**Design:**

Because five local apps are different browser origins by port, cross-app `storage` events cannot be the convergence mechanism. Use server-state checks on lifecycle boundaries.

Required checks:

- first protected layout bootstrap;
- `visibilitychange` from hidden to visible;
- `window.focus`;
- optional route transition checks where available.

**Steps:**

1. Add an opt-in `checkOnFocus` / `checkOnVisible` option to the shared protected bootstrap hook.
2. Debounce checks to avoid noisy calls.
3. Ensure checks use the same authoritative `checkAuth()` path.
4. Build all web apps.

---

## Task 7: Add five-app lifecycle verifier

**Objective:** Automate the exact scenario that caught the current gap.

**Files:**
- Create: `scripts/verify-auth-user-lifecycle.mjs`
- Modify: `package.json` scripts if adding `verify:auth-lifecycle`
- Possibly create Playwright test under `automation/tests/e2e/`

**Design:**

Start with a repo-native HTTP/API verifier for server revocation behavior. If browser UI automation is practical, add Playwright on top.

Minimum script checks:

1. Login through one app-local proxy.
2. Capture access token.
3. Verify `/api/auth/me` succeeds before logout.
4. Logout through one app-local proxy.
5. Verify old access token fails against all app-local `/api/auth/me` proxies.
6. Verify `/api/auth/session` returns 401 without a valid shared cookie/session.

Browser extension checks:

1. Open five app pages.
2. Authenticate once.
3. Logout from PMS UI.
4. Refresh other apps.
5. Assert login page visible.

**Steps:**

1. Implement HTTP-level verifier first.
2. Add package script `verify:auth-lifecycle`.
3. Run against Docker runtime.
4. Add Playwright only after HTTP verifier is stable.

---

## Task 8: Docker reflection and closeout verification

**Objective:** Prove the change in the same runtime the user manually validates.

**Files:**
- Runtime: `compose.yaml`
- Verification scripts from Task 7

**Commands:**

```bash
pnpm run codex:preflight
pnpm exec node scripts/verify-auth-commonization.mjs
pnpm run verify:access-smoke
pnpm run verify:access-admin
pnpm run verify:auth-lifecycle
mkdir -p /tmp/ssoo-docker-config
DOCKER_CONFIG=/tmp/ssoo-docker-config docker compose build server admin crm pms dms sns
DOCKER_CONFIG=/tmp/ssoo-docker-config docker compose up -d --no-build server admin crm pms dms sns
pnpm run verify:auth-lifecycle
```

Then manually verify:

1. Open all five apps.
2. Log out from PMS.
3. Refresh the other four apps.
4. Confirm all four route to login.

---

## Implementation stop rules

Stop and reassess before proceeding if:

- revoked access tokens still pass server validation after Task 2;
- any app needs app-specific auth semantics to pass the common logout scenario;
- DMS cleanup risks deleting unsaved user work without an explicit product rule;
- CORS/cookie policy requires production-domain decisions not represented in local Docker.

## Documentation updates after implementation

After the implementation passes:

- Update `docs/common/explanation/architecture/user-lifecycle-commonization.md` current known gap section.
- Update `docs/common/explanation/architecture/auth-system.md` token/session diagrams if access-token validation changes.
- Update `docs/CHANGELOG.md` under `[Unreleased]`.

## Changelog

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-06-10 | 5앱 공용 사용자 생명주기 적용 계획 신설: revoked-session 검증, shared bootstrap 보정, domain cleanup, lifecycle checks, Docker verifier 순서 고정 |
