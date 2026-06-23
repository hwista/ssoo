# SSOO Auth / Account / Admin / Profile Boundary

> Status: launch architecture baseline
> Scope: SSOO-wide login, session, account administration, organization hierarchy, and user profile responsibility boundaries.

## Decision summary

SSOO should treat the long-term target as the Account/Auth + Admin + SNS Profile split from the start.

The immediate implementation shape is still app-local `/login` routes, but those routes must be thin wrappers around the shared SSOO auth engine. A standalone central login page is not a required intermediate phase.

In other words:

1. The canonical architecture is Account/Auth + Admin + SNS Profile.
2. The current safe implementation slice keeps app-local `/login` routes.
3. Each app-local login route must present the same SSOO login experience and use the same shared auth/session contract.
4. The central-login-only phase is skipped unless it later appears as part of a real Account/Auth surface.

## Responsibility boundaries

### Account/Auth

Account/Auth is the user-facing account security boundary.

It owns, or will own when the surface is promoted:

- login and logout
- session restore
- password change and reset
- MFA / 2FA
- SSO and external identity provider connection
- user-owned account security settings
- active sessions and device management

It does not own organization administration, role assignment, or user profile content.

### Admin

Admin is the operator control plane.

It owns, or will own:

- user account creation, invitation, suspension, and deactivation
- company, organization, department, position, and hierarchy management
- role and permission management
- application access grants
- account lock reset and administrator account actions
- audit and operations logs
- organization-level M365 / Teams integration settings

Admin consumes the shared auth contract. It must not become the place where every user edits their personal profile.

### SNS Profile

SNS Profile is the domain owner for user-facing identity data and social activity.

For the launch slice, the user-facing profile and personal settings UI is a shared frame-tab surface rendered by `@ssoo/web-auth` inside Admin, CRM, PMS, DMS, and SNS. SNS Connect owns the profile/feed/follow API and social rules behind that surface; it is not a physical navigation destination for global `내 프로필` or `내 설정`.

It owns, or will own:

- public/work profile page
- display name and avatar
- biography, headline, skills, interests, and links
- relationships, follows, and activity surface
- profile settings that describe the person rather than account security
- profile links used by DMS, PMS, CRM, Admin, and SNS itself

SNS Profile consumes AuthIdentity only as the minimum account identity. Profile display data must be modeled separately from login credentials/session data, and auth snapshots that need display fields use `AuthIdentityProfileProjection` instead of widening `AuthIdentity`.

### Domain applications

DMS, PMS, CRM, and SNS domain surfaces own their business workflows.

They must not reimplement:

- login/session logic
- account security settings
- user account lifecycle administration
- organization/role/permission administration
- generic user profile editing

They may show people as domain participants, authors, owners, reviewers, PMs, sales owners, etc. When a user-facing person page or profile edit is needed, they open the shared user surface as a tab in the current app frame. When account/organization/permission administration is needed, they link to Admin or Account/Auth according to responsibility.

Apps must emit semantic user-surface actions such as `내 프로필`, `사용자 프로필`, and `내 설정`; they should not duplicate route construction for `/profile/*` or `/settings` and must not expose SNS app paths as the product navigation surface. `@ssoo/web-auth` owns the shared tab path helpers and renderer, `@ssoo/web-shell` owns the shared-surface `contentPage` chrome, and SNS remains the profile/follow/feed data owner.

Admin, CRM, PMS, DMS, and SNS must all allow canonical `/__user/profile/:userId` and `/__user/settings` as route-entry paths through the shared route-policy rewrite. These paths do not have App Router page files because raw `__user` is a Next private folder segment; middleware rewrites them to the root app shell while preserving the browser URL. Actual rendering remains in the current app's ContentArea route registry. SNS may keep `/profile/*` and `/settings` only as compatibility route-entry inputs that are immediately normalized to canonical `__user` frame-tab paths. SNS middleware must import the route-only `@ssoo/web-auth/user-surface-routing` subpath and redirect legacy compatibility entries to canonical `/__user/*` before general route-policy/auth bootstrap handling, so direct entry, login `returnTo`, and stale MDI tab state cannot continue on physical SNS routes. The SNS app must not keep local `ProfilePage` or `SettingsPage` renderers for these global user surfaces.

## Current implementation target

The current target is not a separate central login page.

The current target is:

- app-local routes remain: `/login` in SNS, DMS, PMS, CRM, and Admin as applicable
- each route is a thin wrapper
- login UI and validation come from `@ssoo/web-auth`
- session restore and logout use `@ssoo/web-auth`
- each app calls its same-origin `/api/auth/*` proxy
- each proxy forwards to server common `/auth/*`
- all apps share the same SSOO session semantics
- login copy says SSOO login, not domain-specific login
- app-specific differences are limited to app key, app label, return target, and domain-specific cleanup hooks

This preserves localhost/Docker port isolation while still making login a single SSOO behavior.

## Request flow

```text
Browser app
  -> app-local /login thin wrapper
  -> @ssoo/web-auth login UI + auth store
  -> app-local /api/auth/{login,session,me,logout}
  -> server common /auth/{login,session,me,logout}
  -> common session cookie/token/user identity
```

The app-local proxy is a transport boundary, not a domain-specific auth implementation.

## Identity model

### AuthIdentity

`AuthIdentity` must remain the minimal login/session identity.

It should contain only data required to identify the authenticated account in a session, such as:

- `userId`
- `loginId`
- `userName`

It should not absorb all profile, organization, permission, or social display data.

### Profile summary

Profile display should be modeled separately and initially stabilized through the SNS profile boundary.

The shared `ProfileSummary` projection exists for cross-app person display and profile links, while SNS Profile remains the product owner of the profile surface. It includes:

- `userId`
- `displayName`
- `avatarUrl`
- `headline`
- `organizationName`
- `departmentName`
- `positionName`
- `profilePath`

This projection is now exported from `@ssoo/types/common`. `AuthIdentityProfileProjection` is the narrow auth-session projection for surfaces that need `displayName` and `avatarUrl` next to the minimal auth identity.

CRM is included in the `SsooAppKey` union because it is a first-class SSOO app boundary. CRM now participates in the five-app auth route/proxy/common login contract with Admin, PMS, DMS, and SNS.

### Access and organization data

Organization hierarchy, roles, and application access belong to Admin/common access contracts, not to AuthIdentity or SNS Profile.

## User menu link contract

Shared user menus should converge on these action meanings:

- My profile: shared SSOO profile surface, opened as a current-app frame tab
- Personal settings: shared SSOO personal settings surface, opened as a current-app frame tab
- User profile: shared SSOO profile surface for another user
- Account security: Account/Auth surface or placeholder/future route until promoted
- Admin console: Admin app, shown only when access allows it
- Logout: shared `@ssoo/web-auth` logout flow plus app-specific cleanup hooks when needed

Domain apps may add domain-specific actions only when they do not replace these meanings.

## Non-goals for this slice

This slice does not implement:

- a new central auth application
- MFA / SSO / Entra ID
- full Admin organization hierarchy management
- DMS settings IA
- full account security center UI

## Acceptance criteria

- App-local login pages use the shared SSOO login card/shell from `@ssoo/web-auth`.
- Admin login no longer presents a separate Admin-only login experience.
- Login copy presents SSOO as the login owner, with app context only as a subtitle or destination hint.
- Shared app keys include all first-class SSOO apps that can participate in the login/account boundary.
- Documentation states that the central-login-only phase is skipped in favor of the Account/Auth + Admin + SNS Profile target.
- Global `내 프로필`, `사용자 프로필`, and `내 설정` entry points open `SsooUserSurfacePage` as shared-surface `contentPage` tabs inside the current app's tab frame rather than navigating to a physical SNS route.
- Five apps rewrite canonical `/__user/profile/:userId` and `/__user/settings` route-entry paths to the app shell through shared route-policy, preserving the browser URL for ContentArea registry matching.
- SNS legacy `/profile/*` and `/settings` paths are compatibility handoff entries only; they are normalized by `@ssoo/web-auth` route-entry helpers, redirected to canonical `/__user/*` by SNS middleware, and do not render local physical profile/settings pages.
- SNS profile/feed/follow mutations publish domain events, and open user-surface tabs refetch from server truth on those events.
- Build and Docker verification pass for the affected apps.

## Changelog

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-06-22 | SNS middleware가 `@ssoo/web-auth/user-surface-routing` route-only helper로 `/profile/*`, `/settings` direct entry를 canonical `/__user/*`로 먼저 redirect하도록 공용 사용자 표면 경계를 강화 |
| 2026-06-22 | `/profile/*`, `/settings` compatibility handoff parsing을 `@ssoo/web-auth` user-surface route-entry helper로 중앙화하고 SNS ContentArea/shell navigation의 앱 로컬 legacy parser를 제거하는 기준을 추가 |
| 2026-06-19 | 5앱 canonical `__user` route-policy rewrite 계약을 추가하고, SNS `/profile/*`/`/settings`를 compatibility handoff로만 허용하며 local `ProfilePage`/`SettingsPage` renderer를 금지하는 공용 사용자 표면 경계를 추가 |
| 2026-06-17 | 프로필/개인 설정을 SSOO 공용 사용자 표면으로 정의하고, 5개 앱이 SNS 물리 route가 아니라 현재 앱 프레임 탭에서 공용 renderer를 열도록 계약을 갱신 |
| 2026-06-09 | 문서 검증 형식에 맞춰 changelog 섹션 추가 |
