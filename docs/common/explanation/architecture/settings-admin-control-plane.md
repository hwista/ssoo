# SSOO Settings / Admin / AI Control Plane Boundary

> Status: launch architecture baseline
> Last updated: 2026-08-14
> Scope: SSOO-wide settings, account/auth, profile, organization admin, AI control plane, and domain app settings responsibility boundaries.

2026-11-04 적용 범위: 플랫폼 공통 관리를 Admin에서 먼저 검토·적용하고 도메인 특화 관리는 각 앱의 설정이 소유한다. 현재 코드에 대조한 관리 대상·운영 시나리오·우선 공백은 [Admin 공통 관리 검토안](2026-11-04-admin-common-management-scope.md)을 따른다. 아래 과거 구현 상태는 작성 당시의 기록이며 새 검토안의 구현 완료를 의미하지 않는다.

## Decision summary

SSOO settings are not one large Admin page and not one large DMS settings page. The boundary is responsibility-based:

- Admin owns SSOO platform/base settings, control, and operations.
- Each domain app owns its own domain-specific system settings, control, and operations.
- DMS owns DMS-specific system settings, control, and operations. Admin may link to owning domain apps when useful, but the current baseline does not keep DMS observation/control pages inside Admin.

In short: 플랫폼 공통은 Admin, 도메인 세부 시스템 설정/제어/운영은 각 도메인 앱. DMS의 세부 시스템 설정/제어/운영은 DMS가 소유한다.

The current settings model is split into six ownership layers:

1. Account / Auth
2. Profile
3. Admin / Organization
4. AI Control Plane
5. Domain System Settings
6. Personal App Settings

DMS is a domain application. DMS owns DMS-specific system settings/control/operations such as document repository, storage, ingest, search/indexing, templates, document access workflows, and DMS runtime status. Its settings surface may link to common settings, but it must not own user/profile identity, organization/user administration, Microsoft tenant policy, or global AI model/persona/agent configuration.

## Ownership layers

### 1. Account / Auth

Owner: common auth runtime surfaced through the SNS user/profile settings experience.

Owns:

- Login and logout
- Session restore and active sessions
- Password change/reset
- MFA / 2FA
- Personal SSO connection state
- Account security notifications
- User-owned device/session management

Does not own:

- Organization hierarchy
- Role and application access grants
- Public/work profile content outside the SNS profile model
- Domain document/project/customer settings

### 2. Profile

Owner: SNS Profile surface. SNS is the SSOO-wide user/profile/social surface, not only a feed app.

Owns:

- Display name and avatar
- Headline, biography, skills, links, activity profile
- Public/work profile page
- Profile edit settings and user-facing profile/account entry points
- Cross-app person projection such as `ProfileSummary`

SNS consumes the common auth runtime for login identity, password, MFA, and session controls. It owns the user-facing placement of profile/account settings, but not the underlying security implementation. SNS does not own role assignment or organization administration.

Ownership is not an implementation claim. As of 2026-08-12, operator session revocation, account unlock, and password-reset request are implemented; MFA enrollment/reset is not implemented and must not be presented as launch-ready.

### 3. Admin / Organization

Owner: Admin app and common access/admin services.

Owns:

- User account creation, invitation, suspension, deactivation
- Company, organization, department, position, hierarchy
- Roles, permissions, app access grants
- Audit logs and operator policies
- Organization-level SSO policy
- Microsoft Entra ID / Azure AD tenant configuration
- Microsoft 365 / Teams organization integration policy

The launch implementation distinguishes these two responsibilities. Admin `/auth` implements the Entra login/signup-request provider policy (tenant/client/redirect URI, encrypted client secret, scopes, tenant/domain allowlists, runtime readiness) and password-reset SMTP delivery operations. Broader Microsoft 365/Teams organization integration policy is not implemented and is not presented as ready.

Admin consumes Account/Auth for session identity and may expose operator actions for account recovery, but it does not become a personal profile editor and does not absorb domain-internal system settings. Domain-specific operations such as DMS repository/storage/search/index/template/document-runtime control remain in the domain app. Admin can expose platform-wide summaries or links when an operator needs orientation, but DMS-owned diagnostics and controls live in DMS.

### 4. AI Control Plane

Owner: Admin AI / common AI control plane.

Owns:

- AI providers and credentials references
- Model catalog and model routing
- Capability mapping by feature: search summary, document assist, extraction, chat, agent actions
- Prompt templates, personas, souls, system policies
- Agent definitions, tool permissions, execution policies
- Quotas, rate limits, safety policies, logging, evaluation, observability

Secrets, tokens, API keys, and connection strings are never stored in domain settings documents. They stay in environment/secret storage and are only referenced by masked metadata.

The current Admin `/ai-operations` surface is an operations bridge, not a provider configuration console. It exposes secret-free provider readiness, registered index sources, queue metrics, scheduler state, and bounded manual worker execution. Provider endpoints, deployments, and credentials remain deployment-secret managed. Model routing, personas, agent definitions, quotas, and eval policy remain future control-plane scope.

### 5. Domain System Settings

Owner: each domain app.

DMS owns DMS-specific runtime and policy settings, for example:

- Document Git binding observability and publish state
- Markdown working tree runtime path visibility
- Binary attachment storage provider policy
- Ingest queue runtime status and DMS ingest defaults
- Upload limits
- DMS search policy: result count, chunking, threshold
- DMS document-assist limits and context shaping
- DMS extraction limits
- Document access request/approval workflow
- DMS administrator template management for DMS document templates

DMS may consume AI capabilities but does not own provider/model/persona/agent definitions.

### 6. Personal App Settings

Owner: each app, scoped to the current user.

DMS personal settings own DMS-only preferences such as:

- DMS author display fallback for Git attribution when applicable
- Default storage preference for manual attachment/reference/image uploads (`system-default`, Local, or enabled NAS)
- Viewer zoom
- Sidebar section defaults

Legacy workspace preference keys may still be read for shell defaults, but they are not a visible settings form. Personal DMS settings must remain small and user-scoped.

These settings must not replace Account/Auth security settings or SNS Profile identity settings.

## DMS settings IA baseline

The DMS settings surface is organized into these groups:

| Group | Purpose | Example sections |
| --- | --- | --- |
| 문서 운영·진단 | DMS-owned runtime status and operational diagnostics | 문서 저장소 상태, 첨부 저장소 상태, 수집 큐 상태, 템플릿 저장 위치 |
| 문서 시스템 설정 | DMS-owned editable document-domain policies | 첨부 저장소 정책, 수집 큐 정책, 업로드 한도, 검색 정책, 문서 AI 보조 정책, 문서 분석/추출 정책 |
| 문서 관리 | DMS domain management actions | 문서 권한 관리, 관리자 템플릿 |
| 내 문서 환경 설정 | User-scoped DMS preferences | Identity fallback, viewer, sidebar |

## Boundary rules

- Admin is the platform/base settings-control-ops surface; it owns common account/org/permission/app-registry/service-exposure/platform policy responsibilities.
- Domain apps own their domain-specific system settings-control-ops; do not move DMS repository/storage/search/index/template/document-runtime settings to Admin merely because they are “system settings.”
- DMS settings must not add a second account/profile/security settings surface; user-facing profile/account settings open the shared user surface tab, backed by SNS Profile APIs plus common auth runtime.
- DMS settings must not become the organization admin console.
- DMS settings must not store or show unmasked AI/Microsoft/SSO secrets.
- Microsoft 365 / Teams organization policy belongs to Admin/Organization. DMS may only keep DMS-specific ingest/drop mapping when the common integration exists; SharePoint storage integration is not supported.
- AI provider/model/persona/soul/prompt/agent ownership belongs to AI Control Plane. DMS may only select or display the DMS capability mapping that the common control plane exposes.
- Domain apps open common surfaces through semantic actions instead of copying their forms. User profile/settings open inside the current app frame tab; true operator/admin surfaces may still switch to their owning app.

## Admin app implementation backlog

The DMS split creates follow-up work for `apps/web/admin`, but those surfaces must remain separated by ownership. The table below is the canonical checklist so future slices do not forget any of the separated responsibilities.

| Surface | Target owner / route | Required elements | Current status |
| --- | --- | --- | --- |
| Account / Auth operator bridge | Admin user operations + common auth runtime | Account status/lock/session visibility, force logout, unlock, password reset trigger, MFA reset, SSO link status | Implemented: status, recent session summary, force logout, unlock, password-reset request, user deactivate/reactivate with session revocation and last-admin guard. Not implemented: MFA reset/enrollment and external SSO unlink actions. |
| Organization settings | Admin `/organizations` and future policy settings | Company/organization hierarchy, active child/member safety, invitation and deactivation policy | Implemented: permanent organization CRUD, parent hierarchy/cycle guard, active child/member deactivation guard and reactivation. Not implemented: invitation policy and dedicated organization policy settings. |
| Roles / permissions / app grants | Admin `/roles` and user access operations | Role baseline, permission catalog, app access grants, role-menu overrides, access inspect / exceptions visibility | Implemented: role permission grant-set editing, catalog, inspect, exception visibility, and user/auth/session/org/role-permission audit feed. `admin` must retain `system.override`. Role-menu override editing remains future scope. |
| Microsoft authentication provider policy | Admin `/auth` | Entra tenant/client/redirect, encrypted secret, scopes, tenant/domain allowlists, login/signup-request activation safety | Implemented. Activation fails closed unless encrypted runtime configuration and a bounded tenant allowlist are complete. External tenant/app values are deployment inputs. Public self-signup remains unsupported and cannot be enabled. |
| Password-reset email delivery | Admin `/auth` | outbox/SMTP worker readiness, pending/sent/failed counts, masked recipients, manual run and failed-message retry | Implemented. Production requires an enabled worker and valid SMTP environment values; Admin reports `blocked` instead of pretending readiness when transport verification fails. |
| Microsoft 365 / Teams organization policy | Admin future integration settings | Teams organization integration policy and secret-reference metadata only | Not implemented. DMS may later consume DMS-specific ingest/drop mappings only after a common integration exists. SharePoint storage integration is out of scope. |
| AI Control Plane | Admin `/ai-operations` + future settings | Provider readiness, index sources, queue/scheduler operations; later model routing, prompts/personas/agents, quotas and eval policy | Implemented operations bridge: secret-free provider readiness, source status, queue metrics, scheduler and bounded manual run. Provider/credential mutation stays deployment-secret managed; model/persona/agent policy is not implemented. |
| SNS Profile and account entry | Shared user surface renderer + SNS profile APIs + common auth runtime entry points | Display name, avatar, headline, bio, skills, links, public/work profile, cross-app `ProfileSummary` projection, account/security entry cards backed by common auth | Not Admin-owned except operator moderation/audit if added later. No separate Account app is planned for launch. |
| Domain app common settings entries | DMS/PMS/CRM/SNS domain apps | Semantic actions to Account/Auth, Profile, Admin/Organization, AI Control Plane where relevant | DMS common entry slot is the first baseline. Other apps should copy the boundary, not the DMS implementation blindly. |
| Domain app entry/link bridge | Admin overview links, if needed | Route links to the owning domain app and platform-level status summaries only | DMS observation/control pages are removed from Admin in the current baseline. DMS-owned changes happen in DMS. |

## Implementation notes

The launch implementation keeps DMS diagnostics and document-domain controls in DMS while Admin provides platform account/session, organization, role-permission, audit, and AI-index operations. This does not move DMS runtime control into Admin. Admin AI operations never returns credential values and does not pretend that the future model/persona/agent policy console exists.

The visual settings form is platform-common even when ownership is domain-specific. PMS/CRM/DMS/SNS/Admin settings pages should consume `@ssoo/web-shell` `SsooSettings*` primitives for the settings surface, inner section navigation, status banners, pending-change summary, and header action layout. Domain apps keep their own config schema, persistence API, access gates, custom slots, and validation rules.

## Acceptance criteria

- DMS settings navigation exposes 문서 운영·진단 / 문서 시스템 설정 / 문서 관리 / 내 문서 환경 설정 groupings.
- DMS does not expose a generic external settings link section as a fake substitute for unimplemented common control-plane pages.
- DMS no longer presents Microsoft/Teams/SSO and global AI configuration as DMS-owned editable settings.
- DMS settings consumes the shared `SsooSettings*` surface primitives while DMS-owned setting definitions, custom slots, runtime paths, and save logic remain in DMS.
- Admin settings-like pages consume the same `SsooSettings*` page template primitives.
- Admin navigation does not expose `/dms/*` DMS observation pages in the current baseline.
- Admin exposes working account/session recovery, organization hierarchy, role grant, audit, and AI-index operations while labeling unimplemented MFA/SSO/provider-policy features accurately.
- Existing DMS settings persistence and custom slots continue to work.
- Authenticated DMS settings deep links under `/settings/{surface}/{sectionId}` survive reload and reuse the existing system/personal access checks.
- `pnpm --filter web-dms build`, `pnpm --filter web-admin build`, `pnpm run codex:dms-guard`, and `pnpm run codex:preflight` pass before closeout.

## Changelog

| 날짜 | 변경 내용 |
| --- | --- |
| 2026-08-14 | Entra 인증 provider와 password-reset SMTP 운영의 실제 구현 상태를 M365/Teams 미구현 범위와 분리하고, DMS 저장소 개인 선호 및 settings deep-link 운영 계약을 반영 |
| 2026-08-12 | Admin account/session recovery, real organization hierarchy, role grant editing, audit feed, AI operations bridge의 구현 상태와 MFA/SSO/AI 정책 잔여 범위를 팩트 기준으로 갱신 |
| 2026-07-06 | DMS 관측/제어는 DMS 소유로 고정하고 Admin `/dms/*` 관측 baseline 과 외부 설정 링크 섹션을 제거하는 기준으로 갱신 |
| 2026-06-11 | 공통 설정 양식에 맞춰 DMS 화면 노출 scope/group label 을 `시스템 설정` / `내 설정` 으로 단순화 |
| 2026-06-11 | 설정 화면 visual form 은 `@ssoo/web-shell` 공통 primitive로 소비하고, 도메인별 schema/persistence/access/custom slot 은 각 앱이 소유한다는 기준 추가 |
| 2026-06-10 | Admin=플랫폼/base, 도메인 앱=도메인 세부 시스템 설정/제어/운영, DMS=DMS 세부 운영 설정/제어라는 corrected ownership rule 보강 |
| 2026-06-09 | SSOO 설정/Admin/Auth/Profile/AI/DMS 책임 경계와 DMS 설정 IA baseline 신설 |

## 2026-11-05 공통 연결 설정 확장

인증 관리의 메일 연결과 AI 운영의 임베딩 연결은 `cm_integration_setting_m/h`를 통해 Admin에서 저장·적용한다. 기존 환경변수 경로도 선택할 수 있다. 비밀값은 write-only AES-GCM 암호화 저장, 변경 사유·history 및 충돌 검사를 적용한다. 로컬 수신함/CPU 임베딩은 외부 제공자가 없어도 검증할 수 있으며 회사 SMTP·Microsoft Graph·Azure로 전환한다. [연결 계약·자원 제한·Ralph 증거](2026-11-05-local-runtime-integrations.md)를 따른다.
