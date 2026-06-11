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

SNS Profile is the user-facing identity surface.

It owns, or will own:

- public/work profile page
- display name and avatar
- biography, headline, skills, interests, and links
- relationships, follows, and activity surface
- profile settings that describe the person rather than account security
- profile links used by DMS, PMS, CRM, Admin, and SNS itself

SNS Profile consumes AuthIdentity only as the minimum account identity. Profile display data must be modeled separately from login credentials/session data.

### Domain applications

DMS, PMS, CRM, and SNS domain surfaces own their business workflows.

They must not reimplement:

- login/session logic
- account security settings
- user account lifecycle administration
- organization/role/permission administration
- generic user profile editing

They may show people as domain participants, authors, owners, reviewers, PMs, sales owners, etc. When a user-facing person page or profile edit is needed, they link to SNS Profile. When account/organization/permission administration is needed, they link to Admin or Account/Auth according to responsibility.

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

This can later be promoted to a common package contract when multiple domain applications consume it.

CRM is included in the `SsooAppKey` union because it is a first-class SSOO app boundary. Its current web scaffold does not yet expose an app-local auth route, so this slice documents CRM participation without adding a synthetic login implementation before the CRM app adopts protected runtime auth.

### Access and organization data

Organization hierarchy, roles, and application access belong to Admin/common access contracts, not to AuthIdentity or SNS Profile.

## User menu link contract

Shared user menus should converge on these action meanings:

- My profile: SNS Profile user page
- Profile settings: SNS Profile settings
- Account security: Account/Auth surface or placeholder/future route until promoted
- Admin console: Admin app, shown only when access allows it
- Logout: shared `@ssoo/web-auth` logout flow plus app-specific cleanup hooks when needed

Domain apps may add domain-specific actions only when they do not replace these meanings.

## Non-goals for this slice

This slice does not implement:

- a new central auth application
- MFA / SSO / Entra ID
- full Admin organization hierarchy management
- full SNS profile editor
- DMS settings IA
- cross-domain profile rendering in every app

## Acceptance criteria

- App-local login pages use the shared SSOO login card/shell from `@ssoo/web-auth`.
- Admin login no longer presents a separate Admin-only login experience.
- Login copy presents SSOO as the login owner, with app context only as a subtitle or destination hint.
- Shared app keys include all first-class SSOO apps that can participate in the login/account boundary.
- Documentation states that the central-login-only phase is skipped in favor of the Account/Auth + Admin + SNS Profile target.
- Build and Docker verification pass for the affected apps.

## Changelog

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-06-09 | 문서 검증 형식에 맞춰 changelog 섹션 추가 |
