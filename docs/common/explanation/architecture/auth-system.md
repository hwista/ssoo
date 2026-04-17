# 인증 시스템 (Authentication)

> 최종 업데이트: 2026-04-15

## 1. 개요

SSOO 시스템의 인증은 **JWT Access Token + 서버 관리형 shared session cookie** 기반으로 구현되어 있습니다.

### 1.1 토큰 구성

| 토큰 종류 | 만료 시간 | 용도 |
|----------|----------|------|
| Access Token | 15분 | API 요청 인증 |
| Refresh Token | 7일 | Access Token 갱신 |
| Shared Session Cookie | 7일 | PMS/CMS/DMS 간 세션 복원 bootstrap |

### 1.2 환경 변수 (apps/server/.env)

```env
JWT_SECRET=ssoo-jwt-secret-key-change-in-production
JWT_REFRESH_SECRET=ssoo-jwt-refresh-secret-key-change-in-production
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
AUTH_SESSION_COOKIE_NAME=ssoo-session
AUTH_SESSION_COOKIE_DOMAIN=
AUTH_SESSION_COOKIE_SECURE=false
AUTH_SESSION_COOKIE_SAME_SITE=lax
```

### 1.3 현재 auth persistence bridge

- `common.cm_user_auth_m`
  - 로그인 ID, 비밀번호 해시, 계정 상태, 로그인 실패/잠금 상태를 관리하는 bridge 테이블
- `common.cm_user_session_m`
  - refresh/session 토큰 해시, sessionId, issuedApp, userAgent, 만료/폐기 상태를 관리하는 bridge 테이블
- `common.cm_user_invitation_m`
  - onboarding/invitation lifecycle 전용 bridge 테이블
- `common.cm_user_m`
  - 현재는 profile / organization / `roleCode` 중심의 사용자 마스터로 정리되었고, legacy mirror field(`is_admin`, `user_type_code`, `permission_codes`)는 cleanup phase에서 제거되었습니다.

### 1.4 현재 permission foundation bridge

- `common.cm_permission_m`
  - action / data-scope / object 예외 축에서 공통으로 참조할 permission vocabulary 마스터
- `common.cm_role_m`
  - 현재 `cm_user_m.role_code` 와 병행되는 system/global role vocabulary 마스터
- `common.cm_role_permission_r`
  - system/global role baseline grant
- `common.cm_org_permission_r`
  - organization affiliation 에 상속되는 baseline grant
- `common.cm_user_permission_exception_r`
  - action / data-scope / object 축을 명시하는 개인별 grant/revoke exception
- 현재 단계에서는 foundation table/seed 를 넘어, **server access service 와 domain access snapshot 이 같은 permission resolution contract** 를 사용하도록 정렬되었습니다.

### 1.5 runtime permission resolution contract

1. **role baseline**
   - `cm_role_permission_r` 가 system/global role baseline grant 를 제공합니다.
2. **organization inheritance**
   - `cm_org_permission_r` 가 active organization affiliation 기준 추가 grant 를 제공합니다.
3. **user exception**
   - `cm_user_permission_exception_r(exception_axis = 'action')` 가 action-level grant/revoke override 를 제공합니다.
4. **domain/object grant**
   - 도메인 고유 baseline(예: `pr_project_role_permission_r`, project owner baseline)과 `cm_user_permission_exception_r(exception_axis = 'object')` 가 object-level gate 를 형성합니다.
5. **system override**
   - `system.override` permission 이 있으면 domain feature/object gate 를 상위에서 우회합니다.

이 계약은 `packages/types` 의 `policy` trace 와 server common `AccessFoundationService` 기준으로 정렬됩니다.  
즉, access snapshot 은 단순 feature boolean 집합이 아니라 **role / org / user-exception / domain / object / system override** 기여도를 함께 설명할 수 있는 상태가 됩니다.

---

## 2. 인증 흐름

### 2.1 로그인 흐름

```
┌─────────┐         ┌─────────┐         ┌─────────┐
│ Client  │         │ Server  │         │   DB    │
└────┬────┘         └────┬────┘         └────┬────┘
     │                   │                   │
     │ POST /api/auth/login  │               │
     │ {loginId, password}                   │
     │──────────────────>│                   │
     │                   │ findByLoginId     │
     │                   │──────────────────>│
     │                   │<──────────────────│
     │                   │                   │
     │                   │ bcrypt.compare    │
     │                   │ (password)        │
     │                   │                   │
      │                   │ generateTokens    │
      │                   │ (access+refresh + sessionId) │
      │                   │                   │
      │                   │ saveSessionHash   │
      │                   │──────────────────>│
      │                   │<──────────────────│
     │                   │                   │
     │ {accessToken,     │                   │
     │  refreshToken}    │                   │
     │<──────────────────│                   │
     │                   │                   │
     │ localStorage에 저장                    │
     │ (ssoo-auth)       │                   │
     │                   │                   │
```

### 2.2 세션 복원 흐름

```
┌─────────┐         ┌─────────┐         ┌─────────┐
│ Client  │         │ Server  │         │   DB    │
└────┬────┘         └────┬────┘         └────┬────┘
     │                   │                   │
     │ POST /api/auth/session               │
     │ Cookie: ssoo-session=...             │
     │──────────────────>│                   │
      │                   │ session row / refresh token 검증│
      │                   │──────────────────>│
      │                   │<──────────────────│
     │                   │                   │
     │                   │ 새 access token 발급
     │                   │ 새 session cookie 회전
     │                   │                   │
     │ {accessToken, user}                  │
     │<──────────────────│                   │
```

### 2.3 API 요청 흐름

```
┌─────────┐         ┌─────────┐         ┌─────────┐
│ Client  │         │ Server  │         │   DB    │
└────┬────┘         └────┬────┘         └────┬────┘
     │                   │                   │
     │ GET /api/menus/my │                   │
     │ Authorization:    │                   │
     │ Bearer <token>    │                   │
     │──────────────────>│                   │
     │                   │                   │
     │                   │ JWT 검증          │
     │                   │ (JwtStrategy)     │
     │                   │                   │
     │                   │ ┌───────────────┐ │
     │                   │ │ 만료? → 401   │ │
     │                   │ │ 유효? → 계속  │ │
     │                   │ └───────────────┘ │
     │                   │                   │
     │                   │ 사용자 상태 확인  │
     │                   │──────────────────>│
     │                   │<──────────────────│
     │                   │                   │
     │ 응답 데이터       │                   │
     │<──────────────────│                   │
```

### 2.4 토큰 갱신 흐름

```
┌─────────┐         ┌─────────┐         ┌─────────┐
│ Client  │         │ Server  │         │   DB    │
└────┬────┘         └────┬────┘         └────┬────┘
     │                   │                   │
     │ 401 Unauthorized  │                   │
     │ (Access Token 만료)                   │
     │                   │                   │
     │ POST /api/auth/refresh│               │
     │ {refreshToken}    │                   │
     │──────────────────>│                   │
     │                   │                   │
     │                   │ JWT 검증          │
     │                   │ (refresh secret)  │
     │                   │                   │
     │                   │ 저장된 hash와 비교│
     │                   │──────────────────>│
     │                   │<──────────────────│
     │                   │                   │
     │                   │ 새 토큰 생성      │
     │                   │ (access+refresh)  │
     │                   │                   │
     │ {accessToken,     │                   │
     │  refreshToken}    │                   │
     │<──────────────────│                   │
     │                   │                   │
     │ 원래 요청 재시도  │                   │
     │──────────────────>│                   │
```

---

## 3. 클라이언트 구현

### 3.1 인증 상태 저장 (Zustand + localStorage + shared session cookie)

```typescript
// stores/auth.store.ts
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      user: null,
      isAuthenticated: false,
      // ...
    }),
    {
      name: 'ssoo-auth',  // localStorage 키
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
```

- 브라우저 `localStorage` 에는 **access token / user / isAuthenticated** 만 유지합니다.
- refresh token 지속 저장은 제거하고, PMS/CMS/DMS 사이 세션 공유는 **HttpOnly shared session cookie** 로 처리합니다.

### 3.2 앱 시작 시 인증 체크

앱이 시작되면 항상 서버에서 토큰 유효성을 검증합니다:

```typescript
// app/(main)/layout.tsx
useEffect(() => {
  const check = async () => {
    await checkAuth();  // access token 검증 또는 session bootstrap
    setIsChecking(false);
  };
  check();
}, [checkAuth]);
```

`checkAuth()` 가 성공하면 각 앱은 authenticated shell 을 렌더링하기 전에 **도메인 access snapshot** 을 별도로 hydrate 합니다.

| 앱 | Stage 1 bootstrap | Stage 2 bootstrap | 실제 초기화 반영 |
|----|-------------------|-------------------|------------------|
| PMS | `GET /api/menus/my` | `GET /api/projects/:id/access` (프로젝트 상세 진입 시 on-demand) | `access.store` 가 bootstrap lifecycle 을 관리하고, `menu.store` 가 navigation-centric snapshot 을 실제 메뉴/즐겨찾기/live navigation state로 반영 |
| CMS | `GET /api/cms/access/me` | N/A | feed/board/search/profile 등 CMS baseline feature gate 와 visibility policy bootstrap |
| DMS | `GET /api/dms/access/me` (`/api/access` proxy) | 문서별 ACL 해석은 file/content/search/ask/binary/storage-open runtime 에서 수행 | 파일 트리 bootstrap, assistant surface 노출, server-filtered document payload 소비 |

PMS는 CMS/DMS처럼 feature boolean snapshot 하나로 shell 을 여는 구조가 아니라, `/api/menus/my` 를 **navigation-centric PMS access snapshot** 으로 hydrate 한 뒤 이를 `menu.store` 의 메뉴/즐겨찾기/navigation 상태로 적용합니다. 즉, `access.store` 는 bootstrap lifecycle(`hydrate`, `hasLoaded`, `isLoading`, `error`)을 담당하고, 실제 PMS shell 이 읽는 live navigation state 는 `menu.store` 가 담당합니다.

현재 `/api/menus/my` 의 일반 메뉴 baseline 은 더 이상 `cm_role_menu_r.role_code` join 을 정본으로 삼지 않고, legacy seed 와 같은 역할 기준선(`admin/manager = full`, `user = read`, `viewer = dashboard read`)을 코드로 해석한 뒤 active `cm_role_menu_r` row 를 **공식 role override layer** 로 덧씌웁니다. 마지막으로 `cm_user_menu_r` 의 grant/revoke 예외가 적용되어 runtime snapshot 이 완성됩니다.

공통 사용자/조직 bridge 도 Phase 2 기준으로 `CreateUserDto` / `UpdateUserDto` / PMS `UserManagementPage` 에 `primaryAffiliationType`, `employeeNumber`, `companyName`, `customerId` 를 명시적으로 받도록 확장되었습니다. `syncOrganizationFoundation()` 은 이제 **명시적 primary 소속 선택 → 현재 active primary organization relation → 데이터 기반 단일 소속 판단** 순서로 internal/external primary affiliation 을 결정합니다. dual-affiliation 데이터에서 explicit 값이나 current primary relation 이 없으면 internal 을 기본 primary 로 선택하고, legacy `user_type_code` mirror 는 제거되었습니다.

PMS project detail 은 이 navigation snapshot 위에 `GET /api/projects/:id/access` 를 별도로 조회합니다. 이 object snapshot 은 `pr_project_m.owner_organization_id`, `pr_project_role_permission_r`, `cm_user_permission_exception_r(exception_axis = 'object', target_object_type = 'pms.project')` 를 합성해 `canEditProject`, `canManageMembers`, `canManageTasks`, `canManageDeliverables`, `canAdvanceStage` 같은 object-level capability 를 계산합니다.

- 서버: project-scoped PMS route 는 `ProjectFeatureGuard` + `RequireProjectFeature(...)` 로 capability guard 를 공통화해 CMS/DMS의 feature guard 패턴과 같은 방식으로 보호합니다.
- 웹: `access.store` / `menu.store` 는 여전히 navigation snapshot 을 소비하고, object-level capability 는 project detail 진입 시 `/api/projects/:id/access` 로 별도 hydrate 합니다.

정리하면, **CMS/DMS access snapshot** 과 **PMS project access snapshot** 은 모두 `policy` trace 를 포함하며, 여기에 role/org/user-exception/domain/object grant-revoke 기여도가 함께 기록됩니다. 반면 `PmsAccessSnapshot` 자체는 메뉴/접근수준(`accessType`) 중심의 navigation snapshot 이며 `policy` trace 는 포함하지 않습니다. PMS operator surface(`GET /api/roles/:roleCode/menus`, `RoleManagementPage`)는 이 runtime semantics 를 그대로 따라, 일반 메뉴는 `baseline` 또는 `role-override` source 로 노출하고 관리자 메뉴는 `system.override` 기준의 read-only row 로 취급합니다.

DMS는 `GET /api/dms/access/me` 가 더 이상 hard-coded `all true` snapshot 을 반환하지 않고, 현재 단계에서 아래 축을 합성해 feature baseline 을 계산합니다.

- `cm_role_permission_r`: system/global role baseline (`admin`, `manager`, `user`, `viewer`)
- `cm_org_permission_r`: active organization affiliation 에 상속되는 baseline grant
- `cm_user_permission_exception_r`: 개인별 grant/revoke exception
- `system.override`: system admin override

이 결과는 `canReadDocuments`, `canWriteDocuments`, `canManageTemplates`, `canUseAssistant`, `canUseSearch`, `canManageSettings`, `canManageStorage`, `canUseGit` 로 정규화되어 DMS shell 과 server guard 양쪽에서 함께 사용됩니다. 즉:

- 서버: `DmsFeatureGuard` + `RequireDmsFeature(...)` 로 `files/content/search/ask/doc-assist/chat-sessions/git/settings/storage/templates/file` surface 를 보호
- 서버(object ACL pilot): `DocumentMetadata.acl` 을 `file/content` read/write/metadata/rename/delete, `/dms/files`, `/dms/file/raw`, `/dms/file/serve-attachment`, `/dms/search`, `/dms/ask` 에 연결하고, template reference/doc-assist tree hint, upload inheritance, local `storage/open` 도 unreadable source를 제외하도록 정렬
- 웹: header/sidebar/dashboard/search/chat/settings/document launcher/document page 가 같은 snapshot 기준으로 노출/비노출 또는 disabled 상태를 결정하고, file tree/search result 는 server-filtered payload 를 그대로 소비
- 현재 DMS 슬라이스는 **feature gate + file/content object ACL pilot + creator owner default + 기본 UI affordance + upload inheritance + local `storage/open` policy + validation matrix** 까지 완료된 상태입니다.

CMS도 `GET /api/cms/access/me` 가 더 이상 hard-coded `all true` snapshot 을 반환하지 않고, 현재 단계에서 아래 축을 합성해 baseline feature policy 를 계산합니다.

- `cm_role_permission_r`: system/global role baseline (`admin`, `manager`, `user`, `viewer`)
- `cm_org_permission_r`: active organization affiliation 에 상속되는 baseline grant
- `cm_user_permission_exception_r`: 개인별 grant/revoke exception
- `system.override`: system admin override

이 결과는 `canReadFeed`, `canCreatePost`, `canComment`, `canReact`, `canFollow`, `canManageSkills`, `canManageBoards` 와 shared `policy` trace 로 정규화되며, 현재 단계에서는 아래 범위까지 연결됩니다.

- 서버: `CmsFeatureGuard` + `RequireCmsFeature(...)` 로 `board/skill/feed/post/comment/follow/profile` surface 보호
- 객체 mutation: post/comment update/delete 는 **작성자 본인 또는 system override**, profile mutation 은 `me` route 경계 위에서 동작
- 웹: `FeedPage`, `ComposeBox`, `PostCard`, `BoardListPage`, `Header`, `SearchPage` 가 같은 snapshot 기준으로 노출/disabled 상태를 결정
- CMS content policy 는 post row 의 `visibility_scope_code(public/organization/followers/self)` + `target_org_id` 를 기준으로 한 단계 더 확장되었고, `FeedService` / `PostService` / `CommentService` / reaction·bookmark entrypoint 가 모두 같은 readable-post 조건을 사용합니다.
- `organization` scope 는 작성자의 primary organization 으로 자동 귀속되며, `followers` 는 `cms_follow_m` 관계를 통해 author의 follower 집합을 계산합니다.
- 현재 CMS 슬라이스는 **baseline feature policy + content visibility/object policy** 까지 완료된 상태입니다.

Wave 5 audit 기준으로 PMS project access 와 CMS access/content visibility 는 모두 **server common `AccessFoundationService` + `policy` trace + domain object policy** 상위 계약과 정합하며, 이번 단계에서 추가 runtime divergence는 확인되지 않았습니다.

PMS/CMS/DMS 세 앱의 브라우저-facing auth entrypoint는 이제 모두 **same-origin `/api/auth/[action]` proxy** 를 통합니다. 브라우저는 각 앱 origin으로 login/session/logout/me 를 호출하고, Next route handler가 공통 서버 auth backend로 쿠키/Authorization 헤더를 전달합니다.

세 앱의 브라우저 `authApi` 구현도 `packages/web-auth/src/auth-api.ts` 의 shared factory 를 사용하도록 정렬되었습니다. 즉:

- PMS/CMS/DMS `src/lib/api/auth.ts` 는 앱별 `AuthUser` 타입만 남기는 thin wrapper
- same-origin fetch / status mapping / error shape / Authorization header 전달 규칙은 `packages/web-auth` 한 곳에서 유지
- DMS도 더 이상 별도 `core.post()` 기반 auth 해석 경로를 두지 않고 PMS/CMS와 같은 contract 를 사용

이 auth proxy의 브라우저-facing contract는 **payload-only** 입니다. 즉:

- 성공: backend `success(data)` envelope를 앱 proxy에서 unwrap 하여 `data` payload만 반환
- 실패: `{ error }` + HTTP status 로 축약
- 공통: `Set-Cookie` 는 proxy가 그대로 브라우저로 전달

### 3.3 checkAuth 로직

```typescript
checkAuth: async () => {
  // 1. Access Token이 있으면 /auth/me 검증
  try {
    const meResponse = await authApi.me(accessToken);
    if (meResponse.success) {
      set({ user: meResponse.data, isAuthenticated: true });
      return;
    }
  } catch {
    // Access Token 만료 → Refresh 시도
  }

  // 2. 세 앱 공통 shared session cookie로 세션 복원
  try {
    const success = await restoreSession();
    if (success) {
      // 새 Access Token + user로 상태 복원
    }
  } catch {
    // 모든 시도 실패
  }

  // 3. 모두 실패 → 인증 초기화
  clearAuth();
}
```

### 3.4 공통 auth/access validation baseline

| Surface | Anonymous | Feature denied | Object denied | Allow |
|---------|-----------|----------------|---------------|-------|
| `/api/auth/login` | credential 검증 후 토큰 + shared session cookie 발급 | N/A | N/A | 성공 시 `accessToken` + rotated session cookie |
| `/api/auth/session` | cookie 없거나 만료 시 401 + local auth clear | N/A | N/A | 새 access token 발급 + original request 재시도 |
| PMS bootstrap (`/api/menus/my`, `/api/projects/:id/access`) | login redirect 또는 401 | 메뉴/프로젝트 capability 비노출 | `ProjectFeatureGuard` 또는 project object policy 불일치 시 deny/feature false | 메뉴/navigation + project capability hydrate |
| CMS bootstrap (`/api/cms/access/me`) | login redirect 또는 401 | `CmsFeatureGuard` 403, compose/search/feed disabled | post visibility/object policy 불일치 시 404/403 경계 | feed/board/profile/search surface 활성 |
| DMS bootstrap (`/api/dms/access/me`, `/api/access`) | login redirect 또는 401 | `DmsFeatureGuard` 403, file/search/assistant/settings disabled | Wave 4에서 document ACL deny 시 read/write/binary/search exclusion | file tree/assistant/settings/document surface 활성 |
| DMS binary (`raw`, `serve-attachment`) | anonymous bypass 없음, same-origin auth restore 후 재검사 | `canReadDocuments` false면 deny | unreadable document 또는 readable doc와 연결되지 않은 asset이면 deny | readable document만 session-backed proxy 허용 |
| DMS write/upload (`content`, `upload-attachment`, `upload-reference`) | 401 | `canWriteDocuments` false면 deny | `file/content` write/save/rename/delete/updateMetadata` 는 editor/owner ACL 불일치 시 deny, attachment/reference/image upload 는 대상 문서 write ACL 불일치 시 deny | 허용된 문서만 수정/관리 |
| DMS AI/search (`search`, `ask`, `doc-assist`) | 401 | feature false면 deny | `search`/`ask` 는 unreadable document exclusion, template reference/doc-assist tree hint 는 필터링 | readable source만 context/citation/path hint 허용 |
| DMS git/settings/storage | 401 | 각각 `canUseGit`, `canManageSettings`, `canManageStorage` false면 deny | local `storage/open` 은 readable document에 연결된 sourceFile + same document ACL 없으면 deny | allowed feature만 실행 |

#### DMS object ACL validation addendum

| 시나리오 | 기대 결과 |
|----------|-----------|
| viewer 문서 열기 | file/content read, tree, search, ask citation 은 허용되지만 DocumentPage 편집/삭제/metadata affordance 는 비활성화 |
| editor 문서 열기 | content save, attachment/reference/image upload 는 허용되지만 metadata/ACL 관리와 delete 는 거부 |
| owner 문서 열기 | read/write/rename/delete/updateMetadata, binary, search/ask, linked local storage open 이 허용 |
| ACL 비어 있는 기존 문서 | 기존 feature gate fallback 을 유지하고 기존 공유 문서 동작을 깨지 않음 |
| 새 문서 생성 | creator 가 owner 로 sidecar ACL 에 기록되고 첫 저장 이후 owner 기준 object policy 가 적용 |
| local `storage/open` | `documentPath` 가 필요하며, readable document sidecar의 `sourceFiles` 에 연결된 local storage reference 일 때만 허용 |
| attachment/reference/image upload | `documentPath` 로 연결된 기존 문서가 있으면 write ACL 을 상속하고, 새 문서 draft 는 feature gate 범위에서만 허용 |

#### Wave 5 PMS/CMS validation expansion targets

| 시나리오 | 기대 결과 | 비고 |
|----------|-----------|------|
| PMS project owner/member baseline | `/api/projects/:id/access` 의 `roles` / `features` / `policy` 가 owner baseline, member role permission, same-org visibility와 같은 방향으로 계산 | release-grade manual check |
| PMS object exception grant/revoke | `cm_user_permission_exception_r(exception_axis='object', target_object_type='pms.project')` 가 `policy.userGrantedPermissionCodes` 또는 revoke trace 에 반영되고 mutation deny/allow 와 모순되지 않음 | inspect + runtime 대조 필요 |
| CMS organization visibility | same-org 사용자는 `organization` scope post 를 읽을 수 있고, non-org 사용자는 visibility query 에서 제외됨 | `buildVisiblePostWhere()` 기반 |
| CMS follower visibility | follower 관계가 있으면 `followers` scope post 가 보이고, 관계가 없으면 direct fetch/runtime 결과가 deny 방향과 일치함 | inspect + runtime 대조 필요 |
| CMS restricted write boundary | 읽을 수 없는 post 에 대한 comment/mutation 시도가 release-grade cutover 전에는 명시적으로 거부되는지 확인 | 현재 validation expansion target |

### 3.5 검증 루틴

auth/access 변경 시 기본 검증 순서는 아래를 기준선으로 사용합니다.

1. `pnpm lint`
2. `pnpm --filter @ssoo/types build`
3. `pnpm --filter @ssoo/web-auth build`
4. `pnpm --filter server exec tsc --noEmit`
5. `pnpm --filter web-pms exec tsc --noEmit`
6. `pnpm --filter web-cms exec tsc --noEmit`
7. `pnpm --filter web-dms exec tsc --noEmit`
8. `pnpm run codex:dms-guard` (DMS surface 변경 포함 시)
9. `node .github/scripts/check-patterns.js [변경 파일]`
10. `node .github/scripts/check-docs.js --all` (문서 변경 포함 시)

수동 시나리오는 최소 아래 순서를 유지합니다.

1. login -> session restore -> logout
2. PMS/CMS/DMS access snapshot hydrate
3. PMS navigation snapshot + project object policy(owner/member/exception) deny/allow
4. CMS organization/follower visibility + restricted write boundary
5. DMS file tree bootstrap -> binary open/raw -> upload deny/allow
6. DMS search/ask/doc-assist deny/allow
7. DMS git/settings/storage deny/allow

### 3.6 legacy cleanup closure state

runtime parity 복구 이후의 cleanup phase 는 현재 모두 닫혔고, 아래 항목이 최종 정리 상태다.

현재 baseline 은 live `:4000` + `pnpm verify:access-smoke` + `pnpm verify:access-dms` green 이며, 기본 runtime persona(`viewer.han`)와 PMS project-scoped route(`ProjectFeatureGuard` + `RequireProjectFeature(...)`) 정렬, operator contract slimming, schema tail cleanup 까지 반영된 상태다.

| slice | current state | evidence |
|-------|---------------|----------|
| `roleCode` token/runtime propagation | **Closed** — JWT payload 는 더 이상 `roleCode` 를 carry 하지 않고, `JwtStrategy` 가 현재 DB role 을 request user 에 재주입하며 `AccessFoundationService` 는 role baseline 을 userId 기준 DB 조회로 계산 | `auth.service.ts`, `jwt.strategy.ts`, `access-foundation.service.ts` |
| PMS role-menu override layer | **Formalized current model** — code baseline + supported role override layer(`cm_role_menu_r`) + `system.override` read-only admin row semantics 가 runtime/API/UI 에 반영됨 | `menu.service.ts`, `role-permission.service.ts`, `RoleManagementPage.tsx` |
| organization bridge primary affiliation | **Closed** — explicit `primaryAffiliationType` + current primary relation + data-driven fallback 로 정렬되었고 `user_type_code` mirror 는 제거됨 | `user.service.ts`, `CreateUserDto`, `UpdateUserDto`, `UserManagementPage.tsx`, `schema.prisma` |
| operator contract + schema tail | **Closed** — user admin / inspect payload 에서 `userTypeCode` / `isAdmin` 를 제거했고, `cm_user_m`/`cm_user_h` 의 `is_admin`, `user_type_code`, `permission_codes` 를 제거함 | `access-operations.service.ts`, `packages/types/src/common/access.ts`, `users.ts`, `schema.prisma`, `02_cm_user_h_trigger.sql` |

| phase | focus | minimum gate |
|-------|-------|--------------|
| Phase 0 | 문서/checkout freeze | `pnpm run codex:preflight` + `pnpm verify:access-smoke` + `pnpm verify:access-dms` + `node .github/scripts/check-docs.js --all` |
| Phase 1 | PMS menu/admin parity | runbook Step 3(PMS), admin/non-admin `/api/menus/my`, `GET /api/roles/:roleCode/menus`, `RoleManagementPage` smoke |
| Phase 2 | organization bridge parity | internal/external 사용자 create/update + inspect `organizationIds` |
| Phase 3 | token/runtime parity | login/session restore/PMS·CMS·DMS bootstrap/inspect + `pnpm verify:access-smoke` + `pnpm verify:access-dms` |
| Phase 4 | contract slimming parity | user admin CRUD + PMS operator walkthrough + runbook parity |
| Phase 5 | schema-last cleanup | migration dry-run + smoke + inspect + domain bootstrap 재검증 |

히스토리/rollback 관점의 phase 순서와 checkpoint 기록은 [Access Cutover Cleanup Plan](./access-cutover-cleanup-plan.md) 을 정본으로 유지한다.

---

## 4. 보안 고려사항

### 4.1 토큰 저장 위치

| 저장 위치 | 장점 | 단점 | 현재 사용 |
|----------|------|------|----------|
| localStorage | 구현 간단, UI hydration 용이 | XSS 취약 | ✅ (access token / user만) |
| httpOnly Cookie | XSS 안전, 앱 간 세션 공유 가능 | CSRF 고려 필요 | ✅ (shared session) |
| Memory | 가장 안전 | 새로고침 시 손실 | ❌ |

> 세 앱 간 내부 세션 공유는 `localStorage` 가 아니라 서버 관리형 `httpOnly` cookie 로 처리합니다.

### 4.2 토큰 만료 처리

1. **Access Token 만료 (15분)**
   - 401 응답 시 자동으로 `/api/auth/session` bootstrap 으로 새 access token 발급
   - 갱신 성공 시 원래 요청 자동 재시도
   - PMS/CMS/DMS는 `packages/web-auth` 의 공용 session bootstrap helper를 사용해 동시 401 복원 요청을 dedupe
   - session bootstrap 이 `401/403` 또는 invalid payload로 끝난 경우에만 local auth snapshot을 정리하고, 네트워크/5xx 실패는 세션을 유지한 채 오류를 surface

2. **Shared Session 만료 (7일)**
   - 갱신 실패 시 로그인 페이지로 이동
   - localStorage 인증 정보 삭제

### 4.3 서버 재시작 시 처리

- JWT Secret이 동일하면 이전 토큰도 유효
- Refresh Token은 DB에 해시로 저장되어 있어 검증 가능
- 클라이언트는 앱 시작 시 항상 `checkAuth()`로 서버 검증

---

## 5. 트러블슈팅

### 5.1 로그인은 됐는데 메뉴가 안 보이는 경우

**원인**: localStorage에 만료된 토큰이 남아있어 `isAuthenticated`가 true이지만, 실제 토큰이 유효하지 않음

**해결**:
1. 브라우저 DevTools → Application → Local Storage → `ssoo-auth` 삭제
2. 새로고침 후 다시 로그인

**코드 수정 (2026-01-20)**:
- `checkAuth()`에서 항상 서버 검증 수행
- 메뉴 API 401 응답 시 인증 초기화
- 콘솔 로그 추가로 디버깅 용이

### 5.2 콘솔 로그 확인

```
[MainLayout] Starting auth check...
[AuthStore] Access token expired, trying refresh...
[AuthStore] Refresh token failed: 유효하지 않은 토큰입니다.
[AuthStore] All auth attempts failed, clearing auth
```

### 5.3 개발 중 토큰 문제

개발 중 토큰 관련 문제 발생 시:

```javascript
// 브라우저 콘솔에서 실행
localStorage.removeItem('ssoo-auth');
location.reload();
```

---

## 6. API 엔드포인트

| Method | Endpoint | 설명 | 인증 필요 |
|--------|----------|------|----------|
| POST | `/api/auth/login` | 로그인 | ❌ |
| POST | `/api/auth/session` | shared session bootstrap | ❌ (cookie 기반) |
| POST | `/api/auth/refresh` | 토큰 갱신 | ❌ |
| POST | `/api/auth/logout` | 로그아웃 | ✅ |
| POST | `/api/auth/me` | 현재 사용자 정보 | ✅ |

---

## 7. 관련 파일

### 서버
- `apps/server/src/modules/common/auth/auth.service.ts` - 인증 서비스
- `apps/server/src/modules/common/auth/auth.controller.ts` - 인증 컨트롤러
- `apps/server/src/modules/common/auth/strategies/jwt.strategy.ts` - JWT 검증 전략
- `apps/server/src/modules/common/access/access-operations.controller.ts` - 관리자용 access inspect / exceptions API
- `apps/server/src/modules/common/access/access-operations.service.ts` - permission exception 조회 + policy trace inspection service

### 클라이언트
- `packages/types/src/common/auth.ts` - 공용 인증/세션 계약 (`LoginRequest`, `AuthTokens`, `AuthIdentity`, `AuthSessionBootstrap`)
- `packages/web-auth/src/auth-api.ts` - PMS/CMS/DMS 공용 browser-facing auth adapter factory
- `packages/web-auth/src/store.ts` - PMS/CMS/DMS 공용 auth store/runtime + session bootstrap
- `packages/web-auth/src/ui.tsx` - PMS/CMS/DMS 공용 login/auth UI shell + PMS 기준 표준 login card
- `packages/web-auth/src/storage.ts` - shared auth snapshot/storage helper
- `packages/web-auth/src/user-menu.tsx` - PMS/DMS 공용 authenticated user menu + logout UI surface
- `apps/web/pms/src/stores/auth.store.ts` - 인증 상태 관리
- `apps/web/pms/src/lib/api/auth.ts` - 인증 API 클라이언트
- `apps/web/pms/src/lib/api/client.ts` - Axios 인터셉터 (자동 토큰 갱신)
- `apps/web/pms/src/app/api/auth/[action]/route.ts` - PMS same-origin auth proxy
- `apps/web/pms/src/app/(main)/layout.tsx` - 인증 체크 및 라우팅
- `apps/web/cms/src/stores/auth.store.ts` - CMS 인증 상태 관리
- `apps/web/cms/src/app/api/auth/[action]/route.ts` - CMS same-origin auth proxy
- `apps/web/cms/src/stores/access.store.ts` - CMS domain access snapshot bootstrap
- `apps/web/dms/src/stores/auth.store.ts` - DMS 인증 상태 관리
- `apps/web/dms/src/stores/access.store.ts` - DMS domain access snapshot bootstrap
- `apps/web/dms/src/app/api/access/route.ts` - DMS same-origin access proxy

### 7.1 현재 공용화 경계

- **공용**: 로그인, shared session bootstrap(`/auth/session`), 토큰 갱신, 로그아웃, `/auth/me`, `ssoo-auth` 저장 형식, auth store/runtime, login UI shell, PMS 기준 login layout/copy/footer
- **공용 browser identity**: `AuthIdentity` 는 이제 `userId`, `loginId` 만 담고, role/org/admin 성격 정보는 browser auth payload 에서 제거
- **축소된 profile contract**: `GET /api/users/profile` 도 이제 `roleCode`, `userTypeCode`, `isAdmin` 를 다시 노출하지 않고 profile + identity 보조 정보만 반환
- **서버 내부 auth payload**: JWT `TokenPayload` 는 `userId`, `loginId`, `sessionId` 중심으로 유지되고, `roleCode` 는 token 에 저장하지 않는다. 현재 role 은 `JwtStrategy` 가 DB에서 재주입하며, foundation role baseline 도 `AccessFoundationService` 가 userId 기준으로 직접 해석한다.
- **route-level admin gate 정렬**: `@Roles('admin')` 는 더 이상 `roleCode = admin` 이 아니라 foundation `system.override` 기준으로 평가
- **foundation 정렬 완료**: `AccessFoundationService`, PMS project filter, PMS admin menu inclusion 은 더 이상 `isAdmin` shortcut 을 쓰지 않고 `system.override` 기준으로 계산
- **operator/schema cleanup 완료**: user admin / inspect 계약은 `userTypeCode` / `isAdmin` 없이도 운영 가능하고, user schema tail(`is_admin`, `user_type_code`, `permission_codes`)는 제거되었다
- **cutover sequencing 완료**: `Phase 1 menu/admin` → `Phase 2 organization bridge` → `Phase 3 token/runtime contract shrink` → `Phase 4 operator contract cleanup` → `Phase 5 schema drop` 실행 순서가 닫혔다
- **앱별 유지**:
  - PMS: 메뉴/권한 bootstrap (`/menus/my`)
  - CMS: 피드/프로필 + CMS access snapshot
  - DMS: 워크스페이스/파일 트리 + DMS access snapshot

즉, 공용 auth는 **"누구인가"** 를 해결하고, 앱별 bootstrap은 **"이 앱에서 무엇을 할 수 있는가"** 를 해결합니다.

### 7.2 DMS domain route boundary

- **공개 유지**: `/api/auth/login`, `/api/auth/session`, `/api/auth/refresh`
- **인증 필수**: `dms/files`, `dms/file`, `dms/content`, `dms/templates`, `dms/search`, `dms/ask`, `dms/create`, `dms/doc-assist`, `dms/chat-sessions`, `dms/git`, `dms/storage`, `dms/settings`, `dms/ingest`, `dms/access`
- **binary 예외 처리 방식 변경**: `dms/file/raw`, `dms/file/serve-attachment` 도 server에서는 `JwtAuthGuard + DmsFeatureGuard(canReadDocuments)` 를 사용하고, 브라우저 direct navigation 제약은 same-origin Next proxy가 shared session cookie로 access token을 복원해 해결합니다.
- **향후 세분화 대상**:
  - template / content / file write 계열 → `canWriteDocuments`, `canManageTemplates`
  - git / storage / settings / ingest 계열 → `canUseGit`, `canManageStorage`, `canManageSettings`
  - document read/write/binary/search 계열 → `DocumentMetadata.acl` 기반 object policy

### 7.3 운영 inspect surface

- **관리자 전용 API**:
  - `GET /api/access/ops/inspect`
  - `GET /api/access/ops/exceptions`
- inspect 는 특정 사용자의 foundation action policy 와 optional object policy, active permission exception 을 함께 보여줍니다.
- exceptions 는 user/loginId, axis, object target, permission code 기준으로 permission exception 목록을 조회합니다.
- PMS `UserManagementPage` 는 operator 가 같은 API를 직접 호출할 수 있도록 `AccessInspectDialog` 를 제공합니다.
- `pnpm verify:access-smoke` 는 로그인, profile contract, inspect success, 기본 demo runtime persona(`viewer.han`) 기준 PMS/CMS/DMS allow-deny boundary, non-admin inspect 403 을 자동 검증하는 repo-native smoke script 입니다. runtime 교차검증을 잠시 제외해야 하면 `--skip-runtime` 을 사용합니다.
- `pnpm verify:access-admin` 은 PMS role-menu operator semantics(read/update/reset), admin user CRUD legacy-field regression, internal/external primary affiliation switching, temp user inspect/organizationIds parity 를 검증하는 stateful admin regression script 입니다.
- `pnpm verify:access-dms` 는 admin 기준 temp DMS probe document/image/attachment/local storage fixture 를 생성한 뒤, `files/file/content/raw/serve-attachment/search/ask/settings/git/storage/open` surface 와 `GET /api/dms/access/me` / inspect parity 를 fixture-driven 으로 검증하는 domain regression script 입니다.
- 운영 흐름은 **runtime 결과 확인 → inspect trace 확인 → exception 목록 확인 → 조정 여부 판단** 순서를 기준으로 합니다.
- 자세한 절차는 [Access Verification Runbook](../../guides/access-verification-runbook.md), cleanup 순서는 [Access Cutover Cleanup Plan](./access-cutover-cleanup-plan.md) 을 따릅니다.

---

## Backlog

> 이 영역 관련 개선/추가 예정 항목

| ID | 항목 | 우선순위 | 상태 |
|----|------|----------|------|
| AUTH-01 | Refresh Token Rotation 검토 | P3 | 🔲 대기 |
| AUTH-02 | 로그인 시도 횟수 제한 | P2 | 🔲 대기 |
| AUTH-03 | 비밀번호 정책 강화 | P2 | ✅ 완료 |
| AUTH-04 | admin-only access inspect / exception tooling | P1 | ✅ 완료 |
| AUTH-05 | access cutover cleanup plan | P1 | ✅ 완료 |

---

## Changelog

> 이 영역 관련 변경 이력

| 날짜 | 변경 내용 |
|------|----------|
| 2026-04-15 | `pnpm verify:access-dms` fixture-driven DMS regression script 를 추가하고, DMS domain route boundary 와 cleanup Phase 3 minimum gate 에 `files/file/content/raw/serve-attachment/search/ask/settings/git/storage/open` verification surface 를 반영 |
| 2026-04-15 | PMS `cm_role_menu_r` 를 공식 role override layer 로 명시하고 `role-override` source naming 을 정렬했으며, `pnpm verify:access-admin` 으로 PMS role-menu operator semantics + admin user CRUD/org bridge parity 검증 루틴을 추가 |
| 2026-04-15 | Phase 3~5 closeout — JWT payload `roleCode` 제거, DB-backed role baseline resolution 정렬, user admin / inspect contract 에서 `userTypeCode`·`isAdmin` 제거, `cm_user_m`/`cm_user_h` 의 `is_admin`·`user_type_code`·`permission_codes` schema tail 제거를 반영 |
| 2026-04-15 | live `:4000` + `viewer.han` smoke baseline 을 cleanup 출발점으로 명시하고, Phase 0~5 최소 gate 와 DMS regression-gate 규칙을 auth-system 정본에 추가 |
| 2026-04-15 | `pnpm verify:access-smoke` 기본 runtime persona(`viewer.han`) 검증 범위를 PMS foreign project deny, CMS create deny, DMS git/settings deny + cross-domain allow path 로 확장하고 `--skip-runtime` 운영 fallback 을 반영 |
| 2026-04-15 | runtime parity 이후 남은 리스크를 legacy cleanup execution gate(`roleCode` runtime propagation, PMS role-menu coupling, `userTypeCode` organization bridge, cleanup-only tail) 기준으로 요약하고 cleanup plan 정본 링크를 보강 |
| 2026-04-14 | PMS project-scoped route 를 `ProjectFeatureGuard` + `RequireProjectFeature(...)` 기준으로 정렬하고, PMS two-stage bootstrap 설명에 guard 기반 capability 보호를 반영 |
| 2026-04-14 | PMS two-stage bootstrap(`/api/menus/my` -> `/api/projects/:id/access`)와 `PmsAccessSnapshot` 의 navigation-centric 성격을 명시하고, Wave 5 PMS/CMS validation expansion target 을 추가 |
| 2026-04-14 | `@Roles('admin')` route gate 를 `system.override` 기준으로 정렬하고, PMS operator inspect dialog + `pnpm verify:access-smoke` automation 을 운영 inspect surface 에 반영 |
| 2026-04-14 | JWT `TokenPayload` 에서 `isAdmin` 을 제거하고 `AccessFoundationService`, PMS project filter, PMS admin menu inclusion 을 `system.override` 기준으로 정렬 |
| 2026-04-14 | JWT `TokenPayload` 에서 `userTypeCode` 를 제거하고 server internal auth payload 를 `roleCode` / `isAdmin` 중심으로 축소 |
| 2026-04-14 | CMS browser-facing access snapshot 의 redundant `isAdmin` 제거와 `GET /api/users/profile` legacy field 축소를 반영하고 browser-facing contract 설명을 정리 |
| 2026-04-14 | 관리자용 access inspect / exception API 와 운영 runbook, cleanup plan 링크를 추가해 운영 hardening surface 를 문서화 |
| 2026-04-14 | DMS `DocumentMetadata.acl` object ACL pilot 을 `file/content` read/write/metadata/rename/delete, `/dms/files`, `raw/serve-attachment`, `/dms/search`, `/dms/ask`, template reference/doc-assist tree hint, upload inheritance, local `storage/open` policy 까지 확장하고, 새 문서 owner default + 기본 DocumentPage affordance + validation matrix를 정렬 |
| 2026-04-14 | Wave 5 audit 기준으로 PMS project access 와 CMS access/content visibility 가 `AccessFoundationService` + shared `policy` trace 계약 위에 유지됨을 확인하고 cross-domain alignment 상태를 문서에 반영 |
| 2026-04-14 | server common `AccessFoundationService` + `packages/types` `policy` trace 기준으로 DMS/CMS/PMS project access snapshot 의 permission resolution contract(역할/조직/user-exception/domain/object/system override)를 정렬 |
| 2026-04-14 | `packages/web-auth` 에 공용 session bootstrap helper를 추가해 PMS/CMS/DMS 401 복원 로직을 통합하고, concurrent restore dedupe + transient failure 시 local auth 유지 정책으로 정렬 |
| 2026-04-13 | DMS `raw` / `serve-attachment` 를 same-origin session-backed auth proxy + server `canReadDocuments` 검사 기준으로 보강하고, binary cache를 private 기준으로 조정 |
| 2026-04-13 | browser-facing `AuthIdentity` 를 `userId` / `loginId` 기준으로 slim화하고, PMS admin sidebar 노출을 auth payload 대신 menu access snapshot 기준으로 전환 |
| 2026-04-13 | PMS/CMS/DMS browser `authApi` adapter 를 `packages/web-auth/src/auth-api.ts` shared factory 기준으로 정렬해 app-local auth adapter 중복을 제거 |
| 2026-04-13 | CMS access snapshot 을 role/org/user-exception/system override 기반 baseline feature policy 로 전환하고, `CmsFeatureGuard` 및 CMS web gating 을 연결 |
| 2026-04-13 | CMS post/feed/comment 흐름에 `visibility_scope_code` / `target_org_id` 기반 content visibility policy 를 적용하고 compose badge/UI 까지 연결 |
| 2026-04-10 | PMS project object policy를 추가해 `owner_organization_id`, `pr_project_role_permission_r`, `/api/projects/:id/access` 기반 capability 계산과 project detail UI gating을 연결 |
| 2026-04-09 | `cm_permission_m`, `cm_role_m`, `cm_role_permission_r`, `cm_org_permission_r`, `cm_user_permission_exception_r` 및 대응 history trigger/seed 를 추가해 permission foundation bridge를 도입 |
| 2026-04-09 | `cm_user_auth_m`, `cm_user_session_m`, `cm_user_invitation_m` bridge 테이블과 corresponding history trigger를 도입하고, server auth runtime이 새 auth/session 테이블을 우선 사용하되 legacy `cm_user_m` 필드와 호환되도록 정리 |
| 2026-04-08 | PMS/CMS/DMS same-origin auth proxy contract를 payload-only shape로 정규화하고, backend `success(data)` envelope는 proxy 경계에서 종료되도록 정리 |
| 2026-04-08 | PMS/CMS 브라우저 auth 진입점을 same-origin `/api/auth/[action]` proxy 기준으로 통일해 DMS와 같은 auth surface를 사용하도록 정리 |
| 2026-04-08 | DMS `dms/*` business route를 login-required 내부 API로 재분류하고 `JwtAuthGuard` 기준으로 정리, `/api/ingest/jobs` proxy도 auth header/cookie를 전달하도록 보강 |
| 2026-04-08 | CMS/DMS 메인 shell이 auth 복원 직후 각 도메인 access snapshot 을 먼저 hydrate 하도록 정리하고, CMS feed 작성/DMS 파일 트리·assistant 초기화를 snapshot 기준으로 연결 |
| 2026-04-08 | 공통 auth backend에 shared session cookie + `/api/auth/session` bootstrap 흐름을 추가하고, PMS/CMS/DMS가 refresh token localStorage 공유 없이도 같은 사용자 세션을 복원할 수 있도록 정리 |
| 2026-04-08 | `packages/web-auth` 에 PMS 기준 표준 login card를 추가하고 PMS/CMS/DMS login 화면이 같은 레이아웃/문구/footer를 공유하도록 정리하되, 각 앱의 테마 컬러 토큰은 유지 |
| 2026-04-07 | `packages/types` + `packages/web-auth` 기준으로 PMS/CMS/DMS 공용 auth 계약, auth store/runtime, login UI shell을 도입하고 앱별 bootstrap 경계를 문서에 반영 |
| 2026-04-07 | PMS/DMS 사용자 메뉴에서 공용 auth user menu surface를 재사용하도록 정리하고, DMS 헤더/설정 셸에서 실제 logout 동작을 연결 |
| 2026-02-09 | auth.store.ts Hydration 처리 추가 (`_hasHydrated`, `onRehydrateStorage`) - SSR→CSR 전환 시 무한 대기 해결 |
| 2026-02-09 | checkAuth 안전한 에러 처리 - 네트워크 오류 시 `isLoading: true` 고정 방지 |
| 2026-02-09 | (main)/layout.tsx 인라인 로그인 폼 제거 → (auth)/login 라우트 활용, middleware `/login` 허용 |
| 2026-01-20 | 인증 시스템 문서 최초 작성 |
| 2026-01-20 | 인증 가드 any 타입 제거 (IMM-03) |
| 2026-01-23 | 로그인/Refresh 레이트 리밋 적용(5회/분, 10회/분), 비밀번호 정책 강화(8자 이상, 영문+숫자+특수문자) |
| 2026-01-20 | apiClient 자동 토큰 갱신 구현 |


## 환경 변수

- JWT_SECRET, JWT_REFRESH_SECRET 필수 (ConfigModule Joi 검증)
- JWT_ACCESS_EXPIRES_IN 기본 15m, JWT_REFRESH_EXPIRES_IN 기본 7d
- AUTH_SESSION_COOKIE_NAME 기본 `ssoo-session`, AUTH_SESSION_COOKIE_SAME_SITE 기본 `lax`
- PMS/CMS same-origin auth proxy는 Docker 내부에서 `PMS_SERVER_API_URL` / `CMS_SERVER_API_URL` 를 우선 사용하고, 브라우저 번들용 주소(`PMS_NEXT_PUBLIC_API_URL` / `CMS_NEXT_PUBLIC_API_URL`)와 분리할 수 있습니다.
- PORT 기본 4000, CORS_ORIGIN 기본 http://localhost:3000

---

## Current policies snapshot (2026-01-23)
- Token TTLs: access 15m, refresh 7d; stored refresh hash invalidated on logout.
- Throttling: login 5/min, refresh 10/min; default 100/min.
- Password & lockout: >=8 chars incl. upper/lower/number/special; 5 failed logins -> 30m lock.
- Error contract: GlobalHttpExceptionFilter + ApiError/ApiSuccess; Swagger documents 401/403/404/429/500 with examples.
- Module boundary: auth/user live in common module; no direct dependency from domain modules to each other.
- BigInt handling: IDs remain bigint in DB; API outputs stringified IDs.

## Docs maintenance
- Keep this snapshot aligned after any auth/security change.
- Update Swagger examples when error codes/messages change.
- Reflect boundary/rate policies in lint/ruleset if modified.
