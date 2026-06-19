# SSOO Shared User Lifecycle Commonization

> Status: canonical target and implementation gate
> Last updated: 2026-06-16
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

Profile display data must use SNS-owned profile contracts such as `ProfileSummary`. When an auth snapshot needs only display fields, it must use the common `AuthIdentityProfileProjection` type instead of widening `AuthIdentity`. Role, organization, app access, and domain permission state must come from Admin/common access and domain access snapshots, not from `AuthIdentity`.

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

### 8. Notification center is a shared user surface

The notification center belongs to the shared user layer. The header notification center is intentionally app-neutral: whichever app the user is using, it shows all notifications addressed to the user and opens the notification's source app when an action target is available.

Shared ownership:

- `@ssoo/types` owns the notification item/source/action contract. `CommonNotificationSourceApp` covers `system`, `admin`, `crm`, `pms`, `dms`, and `sns`.
- Server common notification owns recipient isolation, list/unread/read/unread-all/read-by-reference APIs, SSE, and optional source filtering for domain-specific screens.
- `@ssoo/web-auth` owns the browser notification API client, same-origin notification proxy route factory, SSE client helper, notification center state hook, app URL/path resolver, and CSRF/Origin validation for state-changing notification proxy calls.
- `@ssoo/web-shell` owns the notification panel/list/card/read-state UI primitive and the common header notification center wrapper. Header placement may be provided by each app frame, but the panel content, trigger state, outside-click/Escape handling, badge binding, read/unread mutations, pagination, and SSE refresh behavior must use the shared surfaces.

Current app coverage:

- Admin, CRM, PMS, DMS, and SNS expose same-origin `/api/notifications/*` proxy paths for common notification list, unread count, read/unread, read-all, read-by-reference, and SSE.
- Admin, CRM, PMS, DMS, and SNS mount the common `useCommonNotificationCenter` + `SsooHeaderNotificationCenter` flow in their app header without passing `sourceApp`, so the header panel is the user's all-app notification center rather than the current app's source-specific inbox.
- The header panel keeps `전체` as the default view and renders shared app source filter chips for Admin, CRM, PMS, DMS, and SNS with unread badges. Each app may pass its own `preferredSourceApp` only to place the current app chip first; the chip UI, selected filter state, per-app unread counts, and filtered list/read-all behavior remain owned by the common hook and shell panel.
- The panel surface uses shared copy, dim/backdrop behavior, category rendering, read/unread controls, and `open`/`confirm` semantics. Source-specific behavior is limited to opening the target app/path; domain workflow buttons such as retry/focus/process are not exposed in the common header panel.
- DMS may still listen to DMS domain SSE events for background refresh side effects such as document access refresh or soft-lock notices, but those effects do not fork the visible notification center surface.

Domain ownership:

- Each source app owns the notification target path it emits. The header panel consumes `action.payload.path` or `reference.path` and uses the shared app URL resolver to switch to Admin/CRM/PMS/DMS/SNS.
- Domain-specific notification screens may still use source filtering and richer domain actions outside the common header notification center.

Security requirements:

- Browser-facing notification state changes must use same-origin proxy calls with CSRF/Origin/Referer validation.
- The server must scope every notification mutation by `recipientUserId`.
- Notification IDs must be validated before `BigInt` conversion.
- Global notification SSE subscriptions must receive user-specific notification events and source-app domain events without requiring each app to open several EventSource connections.

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
   - Keep access tokens in runtime memory only and treat persisted auth snapshots as non-authoritative.
   - Prefer server session validation/restore during app bootstrap.
   - Clear auth on authoritative 401.

3. Shared 401/session handling.
   - Centralize auth failure handling in `@ssoo/web-auth` helpers and app API clients.
   - Ensure all apps route to login and clear app-scoped auth/access state consistently.

4. Shared notification center.
   - Keep the frame/header notification trigger separate from the notification panel primitive.
   - Use the shared notification proxy route factory in every app.
   - Use the shared notification panel primitive for list/read/unread/read-all/show-more behavior.
   - Keep the header notification center app-neutral: show all recipient notifications, then open the source app/path instead of exposing domain workflow buttons in the header panel.

4. Domain cleanup hooks.
   - Add explicit per-app cleanup hooks invoked on auth clear/logout/401.
   - Start with PMS/DMS/SNS because they already have richer state, then Admin/CRM.

5. Browser lifecycle checks.
   - Add focus/visibility session checks where needed.
   - Ensure sockets disconnect/reconnect with current auth state.

6. SNS user/profile surface.
   - Stabilize the shared SSOO user profile/settings surface and `ProfileSummary` projection.
   - Keep SNS as the profile/feed/follow domain owner, but render the user-facing profile/settings UI through the shared frame-tab surface in every app.
   - Keep domain settings separate: DMS may expose `문서 설정`, but global `내 프로필` and `내 설정` resolve to the shared user surface.

7. Admin operator session/access controls.
   - Add session list/revoke surfaces and audit visibility for operators.
   - Keep platform/org/global permission operations in Admin.

8. Verification automation.
   - Add a repo-native five-app user lifecycle verifier.
   - Gate future “auth commonization complete” claims on that verifier plus Docker runtime checks.

## Current implementation status

As of the 2026-06-11 implementation slice, the first cross-app logout convergence blocker is closed at the server/shared-bootstrap layer, the auth identity/cleanup contract has been tightened, and account/profile/security entry points now converge on the shared user surface backed by SNS-owned profile/social APIs:

- `JwtStrategy.validate()` now rejects protected access tokens whose `sessionId` is absent, missing in `common.cm_user_session_m`, owned by another user, revoked, or expired.
- Server regression coverage proves that a revoked backing session rejects an otherwise valid access token.
- JWT access payloads and browser-facing `AuthIdentity` no longer carry `roleCode`; route-level admin gates resolve the current request's `system.override` policy through `AccessFoundationService` at request time.
- SNS auth display data is formalized as `AuthIdentityProfileProjection`, a `ProfileSummary`-derived projection that keeps `displayName` and `avatarUrl` outside the minimal auth identity contract.
- `SharedAuthLoginPage` owns the full standard `AuthPageShell` + login card. Admin, CRM, PMS, DMS, and SNS keep app-local `/login` routes only as route adapters; they no longer provide app-specific auth layout chrome, login copy, or theme overrides. Until the platform name is finalized, the default login surface keeps only the `SSOT` logo, `로그인` title, and `© 2026 SSOT` footer without descriptive tagline/copy. Password recovery, registration request, internal SSO, and Microsoft 365 actions are resolved from the Admin-managed `/api/auth/public-config` policy first, with `NEXT_PUBLIC_AUTH_*` fallback for bootstrap environments. The default fallback provider set is intentionally limited to internal SSO and Microsoft 365; generic OAuth/Google providers require an explicit product/security decision before they become default login surface.
- Admin, CRM, PMS, DMS, and SNS `/api/auth/[action]` routes are kept as identical thin adapters around `createAuthProxyPostHandler({ createServerApiUrl, createServerApiProxyInit })`. The browser-facing action allowlist is `login/session/logout/me`; body-based `refresh` is not exposed through app-local proxies, and the server direct `/api/auth/refresh` endpoint has been removed. App-id stamping belongs to each app's `_shared/serverApiProxy.ts` helper, not to the auth route itself.
- Microsoft 365 signup/login is now a backend flow, not just a link contract. The server verifies Microsoft ID tokens against JWKS, records applicant-created signup requests for Admin approval, maps approved Microsoft identities to local users, and issues the same shared session cookie/JWT as password login. Password reset is separated from password change through a five-app `/password-reset` route and a five-app identical `/api/auth/password-reset/[action]` same-origin proxy for the email-code challenge/outbox flow.
- `@ssoo/web-auth` protected-layout bootstrap checks server auth state on first hydration and on focus/visibility re-entry, so stale tabs converge from server session truth rather than cross-origin `localStorage` events.
- `@ssoo/web-auth` owns `SharedAuthStateSync`, `createAuthUserScopeLifecycle`, and `useUserScopeQueryCacheReset`. Admin, CRM, PMS, DMS, and SNS each keep a thin `src/lib/user-scope.ts` adapter over that lifecycle. QueryClient apps clear query cache on auth user-scope transitions; PMS resets access/menu/open tabs; DMS stores register their existing file tree, tabs, settings navigation, assistant/editor, git/settings/access cleanup listeners; SNS resets access and query cache. Login submit and logout menu code no longer carry DMS-only reset exceptions.
- `@ssoo/web-auth` owns the shared user-surface routing helpers, `AuthUserMenu` profile/settings actions, and `SsooUserSurfacePage` renderer. Admin, CRM, PMS, DMS, and SNS open global "내 프로필" and "내 설정" as `contentPage` tabs inside the current app frame through the `@ssoo/web-shell` shared-surface content page helper; there is no product-level SNS app link for these entry points. SNS remains the server/domain owner for profile, follow, and feed data. Profile/follow/feed mutations publish `domain-event` refresh signals so simultaneously open app tabs refetch from server truth, but profile GET/read APIs must stay side-effect free to avoid refresh/event loops. DMS keeps a separate `문서 설정` action for document-domain settings.
- SNS profile projection now combines common `User` display fields, SNS profile content, normalized skills/careers, follow stats, and author-filtered feed access so `/__user/profile/me` and `/__user/profile/:userId` are the same product surface across apps. Legacy `/profile/*` and `/settings` paths are compatibility handoff inputs only and must not render local SNS profile/settings pages.
- `pnpm verify:auth-lifecycle` provides the repo-native HTTP verifier for the five app-local auth proxies: login, `/me` before logout, logout, old-token `/me` rejection across Admin/CRM/PMS/DMS/SNS, and revoked-cookie `/session` rejection. The verifier sends the same custom CSRF header and same-origin `Origin`/`Referer` headers required by the hardened app-local auth proxy.

Remaining lifecycle hardening is browser/manual validation depth and broader operator-session surface:

- Browser UI automation for the exact five-tab manual scenario is still a follow-up after the HTTP verifier and Docker runtime stay stable.
- Admin operator session list/revoke UI and audit visibility are still follow-up control-plane surfaces.

## Changelog

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-06-19 | 공용 사용자 표면 canonical route를 `__user`로 명시하고, SNS profile GET은 side-effect free, mutation 이후 domain event 발행만 허용하도록 생명주기 기준을 강화 |
| 2026-06-17 | 공용 사용자 표면을 5개 앱 프레임 탭 내부 렌더링으로 정렬하고, SNS profile projection 을 common 사용자 표시값 + SNS profile + skills/careers + follow stats + 작성자 feed 기준으로 정렬 |
| 2026-06-16 | DMS binary/SSE session-backed proxy helper를 `@ssoo/web-auth`로 공용화하고, SNS auth display projection을 `AuthIdentityProfileProjection`으로 타입화 |
| 2026-06-15 | Browser-facing auth proxy allowlist 에서 body 기반 `refresh` 를 제거하고, 5앱 password reset 을 동일 same-origin proxy 로 고정했으며, auth lifecycle verifier 를 CSRF/Origin 하드닝 기준에 맞게 갱신 |
| 2026-06-12 | 5앱 auth route 를 동일 thin adapter 기준으로 고정하고 CRM의 중복 app-id stamping wrapper 를 제거. DMS/PMS/SNS에 남는 앱별 코드는 login surface 차이가 아니라 user-scoped domain cleanup/profile projection hook 으로만 허용한다고 명시 |
| 2026-06-12 | Admin-managed auth policy, Microsoft 365 OAuth 가입 신청/외부 ID 로그인, 5앱 `/password-reset` + 이메일 코드 outbox 기반 비밀번호 찾기 흐름을 공용 사용자 생명주기 구현 상태에 반영 |
| 2026-06-11 | 기본 로그인 확장 provider를 사내 SSO + Microsoft 365로 축소하고, generic OAuth/Google은 명시적 결정 전 기본 노출에서 제외. 가입 요청/비밀번호 찾기 링크 surface는 유지하되 실제 SSO backend, 셀프 가입 허용 여부, 비밀번호 재설정 채널은 후속 결정 항목으로 분리 |
| 2026-06-11 | 플랫폼명 확정 전 login surface 브랜드 기준을 `SSOT` 로 고정하고, 보조 설명 문구 없이 로고/제목/푸터만 노출하며 계정 복구/가입 요청/사내 SSO/Microsoft 365 확장 action 은 설정된 경우에만 렌더링하도록 정리 |
| 2026-06-11 | `SharedAuthLoginPage` 가 공용 `AuthPageShell` 을 직접 소유하도록 고정하고 5앱 login route 에서 app-specific login copy/layout/theme 래핑을 제거. CRM Tailwind web-auth scan 과 Admin auth layout 누락을 보정하고 `verify:auth-commonization` 에 UI drift gate 를 추가 |
| 2026-06-11 | `@ssoo/web-auth` account center resolver/AuthUserMenu account action 을 추가하고 Admin/CRM/PMS/DMS/SNS 사용자 메뉴의 global account/profile/security entry 를 SNS account center 로 수렴. DMS domain 설정은 `설정` 액션으로 분리 |
| 2026-06-10 | Browser `AuthIdentity` 와 JWT `TokenPayload` 에서 `roleCode` 재유입을 차단하고, `@Roles('admin')`/Admin shell 은 `system.override` 기준, DMS settings system gate 는 DMS access snapshot 기준으로 재정렬. `@ssoo/web-auth` auth clear hook 과 PMS/SNS cleanup wiring 을 추가 |
| 2026-06-10 | Server access-token validation을 `cm_user_session_m` revocation/expiry까지 확장하고, protected bootstrap focus/visibility 재검증 및 `verify:auth-lifecycle` HTTP verifier를 추가 |
| 2026-06-10 | “공용 로그인 코드”가 아니라 “공용 사용자 생명주기”를 완료 기준으로 고정하고, 5앱 logout/session-revoke acceptance gate를 추가 |
