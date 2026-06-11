# SSOO Shared User Lifecycle Commonization

> Status: canonical target and implementation gate
> Last updated: 2026-06-11
> Scope: Admin, CRM, PMS, DMS, SNS login/session/profile/access lifecycle when one SSOO user moves across all apps.

## Why this document exists

SSOO must not define login commonization as “the five apps use similar login code.”

The correct product-level definition is:

> One SSOO user has one shared authentication, session, profile, and access lifecycle across Admin, CRM, PMS, DMS, and SNS. App-local UI may differ, but login, logout, session restore, session revocation, current-user identity, user-scoped cache cleanup, and access refresh must converge to the same user state.

A concrete failure case fixed by this baseline is:

1. Open all five apps.
2. Log out from PMS.
3. Refresh Admin, CRM, DMS, and SNS.
4. Expected: every app moves to login.
5. Current gap observed before this baseline: SNS moved to login, while other apps could remain authenticated because local access-token state survived after the server session was revoked.

Until this scenario passes, SSOO must not claim that login/session commonization is complete.

## Canonical ownership model

SSOO does not create a separate first-class Account/Auth web app as the target product surface.

Ownership is split as follows:

- `@ssoo/web-auth` + server common auth own the technical auth runtime and standard login surface: login shell/card, logout, session restore, token refresh, current-user bootstrap, proxy helpers, and session revocation semantics.
- SNS owns the user-facing user/profile/social/account-experience surface: profile display/edit, user-facing account/profile/security settings entry points, relationship/notification/social identity, and cross-app profile destinations. Cross-app account entry is exposed as the shared `AuthUserMenu` "내 계정" action and resolves to the SNS account center.
- Admin owns platform/operator control: account creation/invitation/suspension/deactivation, organization hierarchy, roles, permissions, app access grants, audit, operator session controls, and forced revocation.
- PMS, DMS, CRM, and SNS domain areas own domain-specific authorization and user-scoped domain state. They reference users/profile summaries; they do not reimplement login, global account settings, global profile editing, organization administration, or shared auth semantics.

Short form:

> Auth runtime is common. User-facing identity/settings live in SNS. Operator account/org/permission control lives in Admin. Domain apps own only their domain access and domain data cleanup.

## Current stage definition

The current repository has the shared auth code path in place across the five apps, but the full shared user lifecycle is not complete until the acceptance gates in this document pass.

Do not use these phrases unless the gates pass:

- “SSO is complete”
- “login commonization is complete”
- “shared user lifecycle is complete”

Allowed precise wording before the gates pass:

> Shared auth UI/proxy/store foundations are installed, but shared user lifecycle commonization is still in progress. The next blocking target is cross-app logout/session-revocation convergence.

## Lifecycle invariants

### 1. Server session is the source of truth

Browser-local auth state is only a cache.

- A local access token must not keep a user logged in after its `sessionId` has been revoked server-side.
- `/auth/me`, protected domain APIs, and guards must reject access tokens whose session row is missing, expired, or revoked.
- `/auth/session` must restore from the HttpOnly shared session cookie only when the backing session row and refresh token hash are valid.
- Logout must revoke the relevant session row and clear the shared session cookie.

### 2. Logout is a shared lifecycle event

When the user logs out from one app:

- the server session is revoked;
- the app that initiated logout clears its auth state;
- all other apps must clear stale auth state at least on refresh, focus, route entry, or the next API call;
- domain user-scoped caches must be reset when auth is cleared;
- realtime connections must disconnect or reauthenticate.

The minimum required gate is refresh convergence: logout from one app, refresh the other four apps, all four go to login.

A stronger gate is foreground convergence: logout from one app, focus another app or trigger its next API call, it clears auth and routes to login without a manual refresh.

### 3. Access token validity includes session validity

Access-token signature and expiry are not sufficient.

A valid-looking access token must fail when:

- `sessionId` is absent for a protected session-issued token;
- the session row does not exist;
- the session row belongs to another user;
- the session row has `revokedAt` set;
- the session row is expired;
- the user is inactive, locked, or disabled.

### 4. User identity is intentionally minimal

`AuthIdentity` is not a profile object and not a permission object.

Allowed minimal shape:

- `userId`
- `loginId`
- `userName`

Profile display data must use SNS-owned profile contracts such as `ProfileSummary`. Role, organization, app access, and domain permission state must come from Admin/common access and domain access snapshots, not from `AuthIdentity`.

### 5. Access snapshots are per-domain and disposable

Frontend access snapshots are UX state, not security state.

- Server-side guards remain authoritative.
- On auth clear, user change, session restore, permission version change, or domain 401/403, the relevant access snapshot must be invalidated.
- Admin permission changes must be observable by domain apps through either immediate API failure, focus/session check, explicit access refresh, or future eventing.

### 6. User-scoped app state must not leak across users

Each app must define cleanup for user-scoped state.

Examples:

- PMS: open tabs, project detail caches, role/menu access snapshot, project access snapshot.
- DMS: file tree, document access snapshot, open document tabs, editor/session state where user-scoped, DMS socket, document comments/notifications, AI/assistant user-owned sessions.
- CRM: opportunity/customer/contract selected detail state, list/detail caches, CRM access snapshot.
- SNS: feed/profile/notification/relation caches.
- Admin: user/role/org/permission operation caches where stale data could mislead operators.

Non-sensitive UI preferences such as sidebar collapsed state may persist if they are not user/data/security scoped.

### 7. Browser lifecycle must be part of auth design

Required lifecycle hooks:

- first app bootstrap after hydration;
- route entry into protected layouts;
- API 401/403 response handling;
- tab/window focus and `visibilitychange`;
- refresh/back-forward cache recovery;
- corrupted or stale localStorage recovery;
- socket connect/reconnect;
- logout button handling;
- Admin forced session revoke handling.

Because the five local apps use different ports, they are different browser origins. `localStorage`/`storage` event propagation cannot be assumed across Admin `3000`, CRM `3001`, PMS `3002`, DMS `3003`, and SNS `3004`. Cross-app convergence must therefore be server-state driven, not localStorage-event driven.

## Security requirements

### Token and storage

- Access tokens should be short-lived.
- Long-lived refresh/session state belongs in HttpOnly cookies and server session rows, not durable JavaScript-readable storage.
- If access tokens remain in localStorage during the transition, every server protected request must validate the backing session row.
- Stale localStorage must clear on any authoritative 401.

### Cookies and CSRF

- Production cookies must use `Secure=true`.
- SameSite policy must match the deployment topology.
- Credentialed CORS must use explicit allowed origins only.
- State-changing auth/session endpoints must have a CSRF/Origin/Referer stance before external deployment. Local development may rely on explicit localhost origins, but production must not rely on wildcard trust.

### Session operations

The product must distinguish:

- current-session logout;
- all-session logout for the current user;
- Admin forced session revoke for one session;
- Admin forced account-wide revoke.

### Audit

The system should audit at least:

- login success/failure;
- logout;
- session restore;
- refresh rotation;
- session revoke;
- Admin forced revoke;
- permission/role/app-access changes.

## Required acceptance scenarios

### A. Five-app login restore

1. Clear browser auth state.
2. Log in from one app.
3. Visit protected routes in Admin, CRM, PMS, DMS, and SNS.
4. Expected: all restore the same user via shared session semantics.

### B. Five-app logout convergence

1. Open all five apps authenticated as the same user.
2. Log out from PMS.
3. Refresh Admin, CRM, DMS, and SNS.
4. Expected: all four route to login.
5. Expected: protected domain API calls with the old access token return 401.

### C. Revoked access token rejection

1. Capture an access token for a session.
2. Log out from any app.
3. Call `/api/auth/me` or a protected API with the old token.
4. Expected: 401 because the token session is revoked.

### D. Domain API convergence

After logout, protected API calls must return 401 across:

- Admin user/role/org endpoints;
- CRM opportunity endpoints;
- PMS project/menu endpoints;
- DMS file/document/settings endpoints;
- SNS post/profile/notification endpoints.

### E. Permission mutation convergence

1. Admin changes a user permission/app access/role relevant to a domain.
2. The domain app refreshes, focuses, or calls the affected API.
3. Expected: stale frontend access is invalidated and the server response reflects the new policy.

### F. User switch isolation

1. Log in as user A and open user-scoped domain state.
2. Log out.
3. Log in as user B.
4. Expected: user A’s protected domain caches, open object data, and access snapshots do not leak into user B’s session.

## Implementation sequence

1. Server session revocation enforcement.
   - Make protected access-token validation check the backing `cm_user_session_m` row.
   - Add regression tests proving a revoked session rejects `/auth/me` and protected APIs.

2. Shared auth bootstrap correction.
   - Treat localStorage access tokens as cache only.
   - Prefer server session validation/restore during app bootstrap.
   - Clear auth on authoritative 401.

3. Shared 401/session handling.
   - Centralize auth failure handling in `@ssoo/web-auth` helpers and app API clients.
   - Ensure all apps route to login and clear app-scoped auth/access state consistently.

4. Domain cleanup hooks.
   - Add explicit per-app cleanup hooks invoked on auth clear/logout/401.
   - Start with PMS/DMS/SNS because they already have richer state, then Admin/CRM.

5. Browser lifecycle checks.
   - Add focus/visibility session checks where needed.
   - Ensure sockets disconnect/reconnect with current auth state.

6. SNS user/profile surface.
   - Stabilize SNS-owned profile/account-experience entry points and `ProfileSummary` projection.
   - Link account/profile/security entry points from other apps to SNS rather than duplicating profile editors.
   - Keep domain settings separate: DMS may expose `설정`, but global account/profile/security remains SNS-owned.

7. Admin operator session/access controls.
   - Add session list/revoke surfaces and audit visibility for operators.
   - Keep platform/org/global permission operations in Admin.

8. Verification automation.
   - Add a repo-native five-app user lifecycle verifier.
   - Gate future “auth commonization complete” claims on that verifier plus Docker runtime checks.

## Current implementation status

As of the 2026-06-11 implementation slice, the first cross-app logout convergence blocker is closed at the server/shared-bootstrap layer, the auth identity/cleanup contract has been tightened, and account/profile/security entry points now converge on SNS:

- `JwtStrategy.validate()` now rejects protected access tokens whose `sessionId` is absent, missing in `common.cm_user_session_m`, owned by another user, revoked, or expired.
- Server regression coverage proves that a revoked backing session rejects an otherwise valid access token.
- JWT access payloads and browser-facing `AuthIdentity` no longer carry `roleCode`; route-level admin gates resolve the current request's `system.override` policy through `AccessFoundationService` at request time.
- `SharedAuthLoginPage` owns the full standard `AuthPageShell` + login card. Admin, CRM, PMS, DMS, and SNS keep app-local `/login` routes only as route adapters; they no longer provide app-specific auth layout chrome, login copy, or theme overrides. Until the platform name is finalized, the default login surface keeps only the `SSOT` logo, `로그인` title, and `© 2026 SSOT` footer without descriptive tagline/copy. Password recovery, registration request, internal SSO, and Microsoft 365 actions are rendered only when a shared URL/provider is configured. The default env-driven provider set is intentionally limited to internal SSO and Microsoft 365; generic OAuth/Google providers require an explicit product/security decision before they become default login surface.
- Login expansion surfaces are UI/link contracts only at this layer. Actual Microsoft Entra ID or internal SSO callback handling, self-registration versus operator-approved registration request, and password reset channel are separate implementation decisions.
- `@ssoo/web-auth` protected-layout bootstrap checks server auth state on first hydration and on focus/visibility re-entry, so stale tabs converge from server session truth rather than cross-origin `localStorage` events.
- `@ssoo/web-auth` exposes `onAuthCleared`, and PMS/SNS wire it to user-scoped access state cleanup. DMS keeps its richer `user-scope` registry, which subscribes to the same auth store transition and clears file tree, tabs, settings shell, assistant/editor state, git/settings/access stores, and query cache.
- `@ssoo/web-auth` owns the shared account center resolver and `AuthUserMenu` account action. Admin, CRM, PMS, DMS, and SNS route global "내 계정" / profile / security entry points to the SNS account center via `NEXT_PUBLIC_SNS_APP_URL`; DMS keeps a separate `설정` action for document-domain settings.
- `pnpm verify:auth-lifecycle` provides the repo-native HTTP verifier for the five app-local auth proxies: login, `/me` before logout, logout, old-token `/me` rejection across Admin/CRM/PMS/DMS/SNS, and revoked-cookie `/session` rejection.

Remaining lifecycle hardening is browser/manual validation depth and broader operator-session surface:

- Browser UI automation for the exact five-tab manual scenario is still a follow-up after the HTTP verifier and Docker runtime stay stable.
- Admin operator session list/revoke UI and audit visibility are still follow-up control-plane surfaces.

## Changelog

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-06-11 | 기본 로그인 확장 provider를 사내 SSO + Microsoft 365로 축소하고, generic OAuth/Google은 명시적 결정 전 기본 노출에서 제외. 가입 요청/비밀번호 찾기 링크 surface는 유지하되 실제 SSO backend, 셀프 가입 허용 여부, 비밀번호 재설정 채널은 후속 결정 항목으로 분리 |
| 2026-06-11 | 플랫폼명 확정 전 login surface 브랜드 기준을 `SSOT` 로 고정하고, 보조 설명 문구 없이 로고/제목/푸터만 노출하며 계정 복구/가입 요청/사내 SSO/Microsoft 365 확장 action 은 설정된 경우에만 렌더링하도록 정리 |
| 2026-06-11 | `SharedAuthLoginPage` 가 공용 `AuthPageShell` 을 직접 소유하도록 고정하고 5앱 login route 에서 app-specific login copy/layout/theme 래핑을 제거. CRM Tailwind web-auth scan 과 Admin auth layout 누락을 보정하고 `verify:auth-commonization` 에 UI drift gate 를 추가 |
| 2026-06-11 | `@ssoo/web-auth` account center resolver/AuthUserMenu account action 을 추가하고 Admin/CRM/PMS/DMS/SNS 사용자 메뉴의 global account/profile/security entry 를 SNS account center 로 수렴. DMS domain 설정은 `설정` 액션으로 분리 |
| 2026-06-10 | Browser `AuthIdentity` 와 JWT `TokenPayload` 에서 `roleCode` 재유입을 차단하고, `@Roles('admin')`/Admin shell 은 `system.override` 기준, DMS settings system gate 는 DMS access snapshot 기준으로 재정렬. `@ssoo/web-auth` auth clear hook 과 PMS/SNS cleanup wiring 을 추가 |
| 2026-06-10 | Server access-token validation을 `cm_user_session_m` revocation/expiry까지 확장하고, protected bootstrap focus/visibility 재검증 및 `verify:auth-lifecycle` HTTP verifier를 추가 |
| 2026-06-10 | “공용 로그인 코드”가 아니라 “공용 사용자 생명주기”를 완료 기준으로 고정하고, 5앱 logout/session-revoke acceptance gate를 추가 |
