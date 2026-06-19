# 인증 시스템 (Authentication)

> 최종 업데이트: 2026-06-16

## 1. 개요

SSOO 시스템의 인증은 **memory-only JWT Access Token + 서버 관리형 HttpOnly shared session cookie** 기반으로 구현되어 있습니다.

### 1.1 토큰 구성

| 토큰 종류 | 만료 시간 | 용도 |
|----------|----------|------|
| Access Token | 15분 | API 요청 인증 |
| Refresh Token | 7일 | Access Token 갱신 |
| Shared Session Cookie | 7일 | refresh/session token hash 검증 및 PMS/SNS/DMS/Admin/CRM 세션 복원 bootstrap |

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
     │ Set-Cookie:       │                   │
     │ ssoo-session      │                   │
     │ {accessToken}     │                   │
     │<──────────────────│                   │
     │                   │                   │
     │ accessToken은     │                   │
     │ runtime memory에만 유지               │
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
     │                   │ │ 서명/만료?    │ │
     │                   │ │ type=access?  │ │
     │                   │ └───────────────┘ │
     │                   │                   │
     │                   │ sessionId 확인   │
     │                   │ cm_user_session_m │
     │                   │ missing/revoked/ │
     │                   │ expired/mismatch │
     │                   │ → 401            │
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
     │ POST /api/auth/session│               │
     │ Cookie: ssoo-session                  │
     │──────────────────>│                   │
     │                   │                   │
     │                   │ JWT 검증          │
     │                   │ (refresh secret)  │
     │                   │                   │
     │                   │ 저장된 hash와 비교│
     │                   │──────────────────>│
     │                   │<──────────────────│
     │                   │                   │
     │                   │ 새 access token   │
     │                   │ + session cookie  │
     │                   │                   │
     │ Set-Cookie 회전   │                   │
     │ {accessToken,user}│                   │
     │<──────────────────│                   │
     │                   │                   │
     │ 원래 요청 재시도  │                   │
     │──────────────────>│                   │
```

---

## 3. 클라이언트 구현

### 3.1 인증 상태 저장 (Zustand memory + sanitized localStorage + shared session cookie)

```typescript
// stores/auth.store.ts
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null, // runtime memory only
      user: null,
      isAuthenticated: false,
      // ...
    }),
    {
      name: 'ssoo-auth',  // token 필드를 제거한 사용자 snapshot 키
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
```

- 브라우저 `localStorage` 에는 **user / isAuthenticated** snapshot 만 유지하고, 기존 token 필드는 읽는 순간 제거합니다.
- access token은 Zustand state와 `@ssoo/web-auth` runtime memory에만 유지합니다.
- refresh token 지속 저장과 JSON 응답 노출은 제거하고, PMS/SNS/DMS/Admin/CRM 사이 세션 공유는 **HttpOnly shared session cookie** 로 처리합니다.
- 브라우저 공용 `AuthTokens` 타입은 `accessToken` 만 노출합니다. 서버 내부 refresh/session token 발급·검증은 유지하지만, 앱 코드와 public JSON 계약은 body 기반 refresh token을 다루지 않습니다.

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
| SNS | `GET /api/sns/access/me` | N/A | feed/board/search/profile 등 SNS baseline feature gate 와 visibility policy bootstrap |
| DMS | `GET /api/dms/access/me` (`/api/access` proxy) | 문서별 ACL 해석은 file/content/search/ask/binary/storage-open runtime 에서 수행 | 파일 트리 bootstrap, assistant surface 노출, server-filtered document payload 소비 |

PMS는 SNS/DMS처럼 feature boolean snapshot 하나로 shell 을 여는 구조가 아니라, `/api/menus/my` 를 **navigation-centric PMS access snapshot** 으로 hydrate 한 뒤 이를 `menu.store` 의 메뉴/즐겨찾기/navigation 상태로 적용합니다. 즉, `access.store` 는 bootstrap lifecycle(`hydrate`, `hasLoaded`, `isLoading`, `error`)을 담당하고, 실제 PMS shell 이 읽는 live navigation state 는 `menu.store` 가 담당합니다.

현재 `/api/menus/my` 의 일반 메뉴 baseline 은 더 이상 `cm_role_menu_r.role_code` join 을 정본으로 삼지 않고, legacy seed 와 같은 역할 기준선(`admin/manager = full`, `user = read`, `viewer = dashboard read`)을 코드로 해석한 뒤 active `cm_role_menu_r` row 를 **공식 role override layer** 로 덧씌웁니다. 마지막으로 `cm_user_menu_r` 의 grant/revoke 예외가 적용되어 runtime snapshot 이 완성됩니다.

공통 사용자/조직 bridge 도 Phase 2 기준으로 `CreateUserDto` / `UpdateUserDto` / PMS `UserManagementPage` 에 `primaryAffiliationType`, `employeeNumber`, `companyName`, `customerId` 를 명시적으로 받도록 확장되었습니다. `syncOrganizationFoundation()` 은 이제 **명시적 primary 소속 선택 → 현재 active primary organization relation → 데이터 기반 단일 소속 판단** 순서로 internal/external primary affiliation 을 결정합니다. dual-affiliation 데이터에서 explicit 값이나 current primary relation 이 없으면 internal 을 기본 primary 로 선택하고, legacy `user_type_code` mirror 는 제거되었습니다.

PMS project detail 은 이 navigation snapshot 위에 `GET /api/projects/:id/access` 를 별도로 조회합니다. 이 object snapshot 은 `pr_project_m.owner_organization_id`, `pr_project_role_permission_r`, `cm_user_permission_exception_r(exception_axis = 'object', target_object_type = 'pms.project')` 를 합성해 `canEditProject`, `canManageMembers`, `canManageTasks`, `canManageDeliverables`, `canAdvanceStage` 같은 object-level capability 를 계산합니다.

- 서버: project-scoped PMS route 는 `ProjectFeatureGuard` + `RequireProjectFeature(...)` 로 capability guard 를 공통화해 SNS/DMS의 feature guard 패턴과 같은 방식으로 보호합니다.
- 웹: `access.store` / `menu.store` 는 여전히 navigation snapshot 을 소비하고, object-level capability 는 project detail 진입 시 `/api/projects/:id/access` 로 별도 hydrate 합니다.

정리하면, **SNS/DMS access snapshot** 과 **PMS project access snapshot** 은 모두 `policy` trace 를 포함하며, 여기에 role/org/user-exception/domain/object grant-revoke 기여도가 함께 기록됩니다. 반면 `PmsAccessSnapshot` 자체는 메뉴/접근수준(`accessType`) 중심의 navigation snapshot 이며 `policy` trace 는 포함하지 않습니다. PMS operator surface(`GET /api/roles/:roleCode/menus`, `RoleManagementPage`)는 이 runtime semantics 를 그대로 따라, 일반 메뉴는 `baseline` 또는 `role-override` source 로 노출하고 관리자 메뉴는 `system.override` 기준의 read-only row 로 취급합니다.

DMS는 `GET /api/dms/access/me` 가 더 이상 hard-coded `all true` snapshot 을 반환하지 않고, 현재 단계에서 아래 축을 합성해 feature baseline 을 계산합니다.

- `cm_role_permission_r`: system/global role baseline (`admin`, `manager`, `user`, `viewer`)
- `cm_org_permission_r`: active organization affiliation 에 상속되는 baseline grant
- `cm_user_permission_exception_r`: 개인별 grant/revoke exception
- `system.override`: system admin override

이 결과는 `canReadDocuments`, `canWriteDocuments`, `canManageTemplates`, `canUseAssistant`, `canUseSearch`, `canManageSettings`, `canManageStorage`, `canUseGit` 로 정규화되어 DMS shell 과 server guard 양쪽에서 함께 사용됩니다. `canManageSettings` 는 설정 화면 전체 진입 권한이 아니라 admin 계정의 시스템/운영 설정과 admin control surface 권한입니다. 인증된 일반 사용자의 `내 설정` 조회/저장은 `/api/dms/settings` 의 `access.canManagePersonal=true` 계약으로 별도 허용하고, `config.system`/runtime snapshot/system update 는 admin 계정의 `access.canManageSystem=true` 일 때만 노출합니다. 즉:

- 서버: `DmsFeatureGuard` + `RequireDmsFeature(...)` 로 `files/content/search/ask/doc-assist/chat-sessions/git/settings/storage/templates/file` surface 를 보호
- 서버(object ACL pilot): `DocumentMetadata.acl` 을 `file/content` read/write/metadata/rename/delete, `/dms/files`, `/dms/file/raw`, `/dms/file/serve-attachment`, `/dms/search`, `/dms/ask` 에 연결하고, template reference/doc-assist tree hint, upload inheritance, local `storage/open` 도 unreadable source를 제외하도록 정렬
- 웹: header/sidebar/dashboard/search/chat/settings/document launcher/document page 가 같은 snapshot 기준으로 노출/비노출 또는 disabled 상태를 결정하고, file tree/search result 는 server-filtered payload 를 그대로 소비
- 현재 DMS 슬라이스는 **feature gate + file/content object ACL pilot + creator owner default + 기본 UI affordance + upload inheritance + local `storage/open` policy + validation matrix** 까지 완료된 상태입니다.

SNS도 `GET /api/sns/access/me` 가 더 이상 hard-coded `all true` snapshot 을 반환하지 않고, 현재 단계에서 아래 축을 합성해 baseline feature policy 를 계산합니다.

- `cm_role_permission_r`: system/global role baseline (`admin`, `manager`, `user`, `viewer`)
- `cm_org_permission_r`: active organization affiliation 에 상속되는 baseline grant
- `cm_user_permission_exception_r`: 개인별 grant/revoke exception
- `system.override`: system admin override

이 결과는 `canReadFeed`, `canCreatePost`, `canComment`, `canReact`, `canFollow`, `canManageSkills`, `canManageBoards` 와 shared `policy` trace 로 정규화되며, 현재 단계에서는 아래 범위까지 연결됩니다.

- 서버: `SnsFeatureGuard` + `RequireSnsFeature(...)` 로 `board/skill/feed/post/comment/follow/profile` surface 보호
- 객체 mutation: post/comment update/delete 는 **작성자 본인 또는 system override**, profile mutation 은 `me` route 경계 위에서 동작
- 웹: `FeedPage`, `ComposeBox`, `PostCard`, `BoardListPage`, `Header`, `SearchPage` 가 같은 snapshot 기준으로 노출/disabled 상태를 결정
- SNS content policy 는 post row 의 `visibility_scope_code(public/organization/followers/self)` + `target_org_id` 를 기준으로 한 단계 더 확장되었고, `FeedService` / `PostService` / `CommentService` / reaction·bookmark entrypoint 가 모두 같은 readable-post 조건을 사용합니다.
- `organization` scope 는 작성자의 primary organization 으로 자동 귀속되며, `followers` 는 `sns_follow_m` 관계를 통해 author의 follower 집합을 계산합니다.
- 현재 SNS 슬라이스는 **baseline feature policy + content visibility/object policy** 까지 완료된 상태입니다.

Wave 5 audit 기준으로 PMS project access 와 SNS access/content visibility 는 모두 **server common `AccessFoundationService` + `policy` trace + domain object policy** 상위 계약과 정합하며, 이번 단계에서 추가 runtime divergence는 확인되지 않았습니다.

Admin/CRM/PMS/SNS/DMS 다섯 앱의 브라우저-facing auth entrypoint는 이제 모두 **same-origin `/api/auth/[action]` proxy** 를 통합니다. 브라우저는 각 앱 origin으로 login/session/logout/me 를 호출하고, Next route handler가 공통 서버 auth backend로 쿠키/Authorization 헤더를 전달합니다.

다섯 앱의 브라우저 `authApi` 구현도 `packages/web-auth/src/auth-api.ts` 의 shared factory 를 사용하도록 정렬되었습니다. 즉:

- Admin/CRM/PMS/SNS/DMS `src/lib/api/auth.ts` 는 앱별 `AuthUser` 타입만 남기는 thin wrapper
- same-origin fetch / status mapping / error shape / Authorization header 전달 규칙은 `packages/web-auth` 한 곳에서 유지
- DMS도 더 이상 별도 `core.post()` 기반 auth 해석 경로를 두지 않고 PMS/SNS와 같은 contract 를 사용

이 auth proxy의 브라우저-facing contract는 **payload-only** 입니다. 즉:

- 성공: backend `success(data)` envelope를 앱 proxy에서 unwrap 하여 `data` payload만 반환
- 실패: `{ error }` + HTTP status 로 축약
- 공통: `Set-Cookie` 는 proxy가 그대로 브라우저로 전달

### 3.3 checkAuth 로직

`checkAuth()` 는 runtime memory access token을 권위 상태가 아니라 short-lived bearer로 취급합니다. `/auth/me` 가 성공하면 현재 access token을 계속 사용하지만, 새로고침이나 401 같은 권위 실패 후에는 shared session restore가 서버 session row 검증을 통과할 때만 새 access token을 받습니다. 일시적 네트워크 실패만 명시적으로 transient로 분류해 UI 안정성을 유지할 수 있습니다.

Protected layout bootstrap은 최초 hydration뿐 아니라 tab/window `focus` 와 `visibilitychange: visible` 에서 debounce된 `checkAuth({ mode: 'background' })` 를 다시 호출합니다. 다섯 로컬 앱은 포트가 달라 cross-origin 이므로 브라우저 storage 이벤트 전파가 아니라 서버 session row 상태로 수렴해야 합니다.

초기 진입과 로그인 화면 복원은 `checkAuth({ mode: 'blocking' })` 또는 기본 blocking 모드로 실행해 기존처럼 full-screen gate 를 사용할 수 있습니다. 반면 focus/visibility 재검증은 이미 렌더링된 protected app subtree 를 유지해야 하므로 `isLoading` 을 올리지 않습니다. 세션 폐기나 401처럼 인증 실패가 확정된 경우에만 auth state 를 clear 하고 protected layout redirect 흐름으로 넘어갑니다.

```typescript
checkAuth: async (options = { mode: 'blocking' }) => {
  const isBackgroundCheck = options.mode === 'background';

  // 1. Access Token이 있으면 /auth/me 검증
  try {
    if (!isBackgroundCheck) {
      set({ isLoading: true });
    }

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
| SNS bootstrap (`/api/sns/access/me`) | login redirect 또는 401 | `SnsFeatureGuard` 403, compose/search/feed disabled | post visibility/object policy 불일치 시 404/403 경계 | feed/board/profile/search surface 활성 |
| DMS bootstrap (`/api/dms/access/me`, `/api/access`) | login redirect 또는 401 | `DmsFeatureGuard` 403, file/search/assistant disabled, system settings hidden | Wave 4에서 document ACL deny 시 read/write/binary/search exclusion | file tree/assistant/personal settings/document surface 활성 |
| DMS binary (`raw`, `serve-attachment`, `storage/open?download=1`) | anonymous bypass 없음, same-origin auth restore 후 재검사 | `canReadDocuments` false면 deny | unreadable document 또는 readable doc와 연결되지 않은 asset/sourceFile이면 deny | readable document만 session-backed proxy 허용 |
| DMS write/upload (`content`, `upload-attachment`, `upload-reference`) | 401 | `canWriteDocuments` false면 deny | `file/content` write/save/rename/delete/updateMetadata` 는 editor/owner ACL 불일치 시 deny, attachment/reference/image upload 는 대상 문서 write ACL 불일치 시 deny | 허용된 문서만 수정/관리 |
| DMS AI/search (`search`, `ask`, `doc-assist`) | 401 | feature false면 deny | `search`/`ask` 는 unreadable document exclusion, template reference/doc-assist tree hint 는 필터링 | readable source만 context/citation/path hint 허용 |
| DMS git/settings/storage | 401 | `canUseGit`, `canManageStorage` false면 deny. settings 는 personal 조회/저장은 허용하되 admin 계정이 아니면 system/runtime 설정 deny | local `storage/open` 은 readable document에 연결된 sourceFile + same document ACL 없으면 deny | allowed feature만 실행 |

#### DMS object ACL validation addendum

| 시나리오 | 기대 결과 |
|----------|-----------|
| viewer 문서 열기 | file/content read, tree, search, ask citation 은 허용되지만 DocumentPage 편집/삭제/metadata affordance 는 비활성화 |
| editor 문서 열기 | content save, attachment/reference/image upload 는 허용되지만 metadata/ACL 관리와 delete 는 거부 |
| owner 문서 열기 | read/write/rename/delete/updateMetadata, binary, search/ask, linked local storage open 이 허용 |
| ACL 비어 있는 기존 문서 | 기존 feature gate fallback 을 유지하고 기존 공유 문서 동작을 깨지 않음 |
| 새 문서 생성 | creator 가 owner 로 DB metadata ACL 에 기록되고 첫 저장 이후 owner 기준 object policy 가 적용 |
| local `storage/open` | `documentPath` 가 필요하며, readable document metadata projection 의 `sourceFiles` 에 연결된 local storage reference 일 때만 허용 |
| attachment/reference/image upload | `documentPath` 로 연결된 기존 문서가 있으면 write ACL 을 상속하고, 새 문서 draft 는 feature gate 범위에서만 허용 |

#### Wave 5 PMS/SNS validation expansion targets

| 시나리오 | 기대 결과 | 비고 |
|----------|-----------|------|
| PMS project owner/member baseline | `/api/projects/:id/access` 의 `roles` / `features` / `policy` 가 owner baseline, member role permission, same-org visibility와 같은 방향으로 계산 | release-grade manual check |
| PMS object exception grant/revoke | `cm_user_permission_exception_r(exception_axis='object', target_object_type='pms.project')` 가 `policy.userGrantedPermissionCodes` 또는 revoke trace 에 반영되고 mutation deny/allow 와 모순되지 않음 | inspect + runtime 대조 필요 |
| SNS organization visibility | same-org 사용자는 `organization` scope post 를 읽을 수 있고, non-org 사용자는 visibility query 에서 제외됨 | `buildVisiblePostWhere()` 기반 |
| SNS follower visibility | follower 관계가 있으면 `followers` scope post 가 보이고, 관계가 없으면 direct fetch/runtime 결과가 deny 방향과 일치함 | inspect + runtime 대조 필요 |
| SNS restricted write boundary | 읽을 수 없는 post 에 대한 comment/mutation 시도가 release-grade cutover 전에는 명시적으로 거부되는지 확인 | 현재 validation expansion target |

### 3.5 검증 루틴

auth/access 변경 시 기본 검증 순서는 아래를 기준선으로 사용합니다.

1. `pnpm lint`
2. `pnpm --filter @ssoo/types build`
3. `pnpm --filter @ssoo/web-auth build`
4. `pnpm --filter server exec tsc --noEmit`
5. `pnpm --filter web-pms exec tsc --noEmit`
6. `pnpm --filter web-sns exec tsc --noEmit`
7. `pnpm --filter web-dms exec tsc --noEmit`
8. `pnpm run codex:dms-guard` (DMS surface 변경 포함 시)
9. `node .github/scripts/check-patterns.js [변경 파일]`
10. `node .github/scripts/check-docs.js --all` (문서 변경 포함 시)

수동 시나리오는 최소 아래 순서를 유지합니다.

1. login -> session restore -> logout
2. PMS/SNS/DMS access snapshot hydrate
3. PMS navigation snapshot + project object policy(owner/member/exception) deny/allow
4. SNS organization/follower visibility + restricted write boundary
5. DMS file tree bootstrap -> binary open/raw -> upload deny/allow
6. DMS search/ask/doc-assist deny/allow
7. DMS git/storage deny/allow + settings personal/system split

### 3.6 legacy cleanup closure state

runtime parity 복구 이후의 cleanup phase 는 현재 모두 닫혔고, 아래 항목이 최종 정리 상태다.

현재 baseline 은 live `:4000` + `pnpm verify:access-smoke` + `pnpm verify:access-dms` green 이며, 기본 runtime persona(`viewer.han`)와 PMS project-scoped route(`ProjectFeatureGuard` + `RequireProjectFeature(...)`) 정렬, operator contract slimming, schema tail cleanup 까지 반영된 상태다.

| slice | current state | evidence |
|-------|---------------|----------|
| `roleCode` token/runtime propagation | **Closed** — JWT payload 와 browser `AuthIdentity` 는 더 이상 `roleCode` 를 carry 하지 않는다. `@Roles('admin')` 는 request user role field 가 아니라 `AccessFoundationService` 가 DB에서 조회한 현재 roleCode 기준으로 판정하고, role baseline 도 userId 기준 DB 조회로 계산한다. | `auth.service.ts`, `jwt.strategy.ts`, `roles.guard.ts`, `access-foundation.service.ts` |
| PMS role-menu override layer | **Formalized current model** — code baseline + supported role override layer(`cm_role_menu_r`) + `system.override` read-only admin row semantics 가 runtime/API/UI 에 반영됨 | `menu.service.ts`, `role-permission.service.ts`, `RoleManagementPage.tsx` |
| organization bridge primary affiliation | **Closed** — explicit `primaryAffiliationType` + current primary relation + data-driven fallback 로 정렬되었고 `user_type_code` mirror 는 제거됨 | `user.service.ts`, `CreateUserDto`, `UpdateUserDto`, `UserManagementPage.tsx`, `schema.prisma` |
| operator contract + schema tail | **Closed** — user admin / inspect payload 에서 `userTypeCode` / `isAdmin` 를 제거했고, `cm_user_m`/`cm_user_h` 의 `is_admin`, `user_type_code`, `permission_codes` 를 제거함 | `access-operations.service.ts`, `packages/types/src/common/access.ts`, `users.ts`, `schema.prisma`, `02_cm_user_h_trigger.sql` |

| phase | focus | minimum gate |
|-------|-------|--------------|
| Phase 0 | 문서/checkout freeze | `pnpm run codex:preflight` + `pnpm verify:access-smoke` + `pnpm verify:access-dms` + `node .github/scripts/check-docs.js --all` |
| Phase 1 | PMS menu/admin parity | runbook Step 3(PMS), admin/non-admin `/api/menus/my`, `GET /api/roles/:roleCode/menus`, `RoleManagementPage` smoke |
| Phase 2 | organization bridge parity | internal/external 사용자 create/update + inspect `organizationIds` |
| Phase 3 | token/runtime parity | login/session restore/PMS·SNS·DMS bootstrap/inspect + `pnpm verify:access-smoke` + `pnpm verify:access-dms` |
| Phase 4 | contract slimming parity | user admin CRUD + PMS operator walkthrough + runbook parity |
| Phase 5 | schema-last cleanup | migration dry-run + smoke + inspect + domain bootstrap 재검증 |

히스토리/rollback 관점의 phase 순서와 checkpoint 기록은 [Access Cutover Cleanup Plan](./access-cutover-cleanup-plan.md) 을 정본으로 유지한다.

---

## 4. 보안 고려사항

### 4.1 토큰 저장 위치

| 저장 위치 | 장점 | 단점 | 현재 사용 |
|----------|------|------|----------|
| localStorage | UI hydration용 사용자 snapshot 유지 | XSS 노출면이 있으므로 token 저장 금지 | ✅ (user / isAuthenticated만) |
| httpOnly Cookie | XSS 안전, 앱 간 세션 공유 가능 | CSRF 고려 필요 | ✅ (shared session) |
| Memory | token 탈취면 축소 | 새로고침 시 session restore 필요 | ✅ (access token) |

> 앱 간 내부 세션 공유는 `localStorage` 가 아니라 서버 관리형 `httpOnly` cookie 로 처리합니다. `ssoo-auth`에 남아 있던 기존 `accessToken`/`refreshToken` 필드는 읽는 순간 제거됩니다.

### 4.2 토큰 만료 처리

1. **Access Token 만료 (15분)**
   - 401 응답 시 자동으로 `/api/auth/session` bootstrap 으로 새 access token 발급
   - 갱신 성공 시 원래 요청 자동 재시도
   - PMS/SNS/DMS는 `packages/web-auth` 의 공용 session bootstrap helper를 사용해 동시 401 복원 요청을 dedupe
   - session bootstrap 이 `401/403` 또는 invalid payload로 끝난 경우에만 local auth snapshot을 정리하고, 네트워크/5xx 실패는 세션을 유지한 채 오류를 surface

2. **Shared Session 만료 (7일)**
   - 갱신 실패 시 로그인 페이지로 이동
   - runtime access token과 local auth snapshot 삭제

### 4.3 서버 재시작 시 처리

- JWT Secret이 동일하면 이전 토큰도 유효
- Refresh Token은 DB에 해시로 저장되어 있어 검증 가능
- 클라이언트는 앱 시작 시 항상 `checkAuth()`로 서버 검증

---

## 5. 트러블슈팅

### 5.1 로그인은 됐는데 메뉴가 안 보이는 경우

**원인**: local auth snapshot은 남아 있지만 shared session cookie 복원 또는 access snapshot hydrate가 실패한 상태

**해결**:
1. 브라우저 DevTools → Application → Local Storage → `ssoo-auth` 삭제
2. 브라우저 cookie의 `ssoo-session` 삭제
3. 새로고침 후 다시 로그인

**코드 기준**:
- `checkAuth()`에서 runtime access token 또는 `/auth/session` 서버 검증 수행
- API 401 응답 시 shared session restore를 한 번 시도하고, 권위 실패가 확인되면 인증 초기화
- `ssoo-auth` persisted snapshot에는 access/refresh token을 저장하지 않음

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
- `packages/web-auth/src/auth-api.ts` - PMS/SNS/DMS 공용 browser-facing auth adapter factory
- `packages/web-auth/src/login-page.tsx` - Admin/CRM/PMS/DMS/SNS `/login` route 가 소비하는 공용 login page adapter
- `packages/web-auth/src/store.ts` - PMS/SNS/DMS 공용 auth store/runtime + session bootstrap
- `packages/web-auth/src/state-sync.tsx` - Admin/CRM/PMS/DMS/SNS auth storage/shared-change event sync
- `packages/web-auth/src/user-scope.ts` - Admin/CRM/PMS/DMS/SNS user-scope lifecycle + query cache reset hook
- `packages/web-auth/src/ui.tsx` - Admin/CRM/PMS/DMS/SNS 공용 login/auth UI shell + 표준 login card
- `packages/web-auth/src/storage.ts` - shared auth snapshot/storage helper
- `packages/web-auth/src/axios-api-client.ts` - Admin/PMS/SNS 공용 Axios client factory. runtime access token 주입, 401 session bootstrap, 공통 `ApiError` mapping을 소유합니다.
- `packages/web-auth/src/server-api-proxy.ts` - Admin/CRM/PMS/DMS/SNS same-origin server API proxy helper. app id stamping, auth/cookie/origin/referer 전달, DMS binary/SSE session-backed proxy helper를 소유합니다.
- `packages/web-auth/src/user-menu.tsx` - Admin/CRM/PMS/DMS/SNS 공용 authenticated user menu + account center/logout UI surface
- `apps/web/pms/src/stores/auth.store.ts` - 인증 상태 관리
- `apps/web/pms/src/lib/api/auth.ts` - 인증 API 클라이언트
- `apps/web/pms/src/lib/api/client.ts` - `createSharedAxiosApiClient` 소비 adapter
- `apps/web/pms/src/app/api/auth/[action]/route.ts` - PMS same-origin auth proxy
- `apps/web/pms/src/app/(main)/layout.tsx` - 인증 체크 및 라우팅
- `apps/web/sns/src/stores/auth.store.ts` - SNS 인증 상태 관리
- `apps/web/sns/src/app/api/auth/[action]/route.ts` - SNS same-origin auth proxy
- `apps/web/sns/src/stores/access.store.ts` - SNS domain access snapshot bootstrap
- `apps/web/dms/src/stores/auth.store.ts` - DMS 인증 상태 관리
- `apps/web/dms/src/stores/access.store.ts` - DMS domain access snapshot bootstrap
- `apps/web/dms/src/app/api/access/route.ts` - DMS same-origin access proxy

### 7.1 현재 공용화 경계

- **공용**: 로그인, shared session bootstrap(`/auth/session`), token 없는 `ssoo-auth` snapshot 형식, runtime access token memory, 로그아웃, `/auth/me`, password reset same-origin proxy, auth store/runtime, login UI shell/card/copy/footer
- **공용 API client**: Admin/PMS/SNS Axios client는 `@ssoo/web-auth` `createSharedAxiosApiClient` 를 소비한다. 각 앱은 base URL만 주입하고 bearer 주입, 401 복원, common `ApiError` mapping은 공용 factory가 소유한다.
- **로그인 UI/API surface 정렬**: `SharedAuthLoginPage` 가 `AuthPageShell` 을 직접 소유하며, Admin/CRM/PMS/DMS/SNS 의 `(auth)/layout.tsx` 는 app-specific chrome/theme 를 덧씌우지 않는다. 5앱 `/login` route 는 app-specific `appName`/`appDescription` 을 넘기지 않고 동일한 SSOT 로그인 화면을 사용하며, `homePath` 는 각 앱의 `APP_HOME_PATH` 상수로만 주입한다. 5앱 `/api/auth/[action]` route 는 `createAuthProxyPostHandler({ createServerApiUrl, createServerApiProxyInit })` thin adapter 로만 유지하고, `X-SSOO-App` 발급 앱 식별자는 각 앱의 `_shared/serverApiProxy.ts` helper 가 단일하게 소유한다. 브라우저 app-local auth proxy action allowlist 는 `login/session/logout/me` 로 제한하고 body 기반 `refresh` 는 노출하지 않는다. 플랫폼 명칭 확정 전까지 login surface 는 `SSOT` 로고, `로그인` 제목, `© 2026 SSOT` 푸터만 유지하고 설명성 tagline/copy 를 노출하지 않는다. 비밀번호 찾기, 가입 요청, 사내 SSO, Microsoft 365 로그인 action 은 우선 `GET /api/auth/public-config` 의 Admin-managed auth policy 를 따르고, 설정 API를 사용할 수 없는 환경에서는 `NEXT_PUBLIC_AUTH_*` URL 또는 `SharedAuthLoginPage` props fallback 을 사용한다. 기본 env 기반 provider 는 사내 SSO와 Microsoft 365만 포함하고, generic OAuth/Google 같은 추가 provider는 제품/보안 결정 전에는 기본 surface에 노출하지 않는다. 회원가입은 open signup보다 Microsoft OAuth 기반 `가입 요청` 링크를 우선한다.
- **공용 user-scope lifecycle**: 로그인 surface/프록시 정책 차이는 허용하지 않는다. 사용자 전환/로그아웃/세션 소실 시 client-side state 정리는 `@ssoo/web-auth` `createAuthUserScopeLifecycle`, `SharedAuthStateSync`, `useUserScopeQueryCacheReset` 를 통해 Admin/CRM/PMS/DMS/SNS가 모두 같은 이벤트 흐름을 소비한다. DMS 파일 트리, PMS 탭/메뉴/access, SNS access/profile query cache, Admin query cache는 앱별 adapter가 등록한 reset listener에서 정리하며, 로그인 submit/logout 메뉴에 별도 도메인 예외 hook을 두지 않는다. SNS auth snapshot의 `displayName`/`avatarUrl` 은 `ProfileSummary` 기반 `AuthIdentityProfileProjection` 으로만 허용하고, `AuthIdentity` 자체는 세션 식별자로 유지한다.
- **공용 notification center surface**: Admin/CRM/PMS/DMS/SNS header 알림 slot 은 모두 `@ssoo/web-auth` `useCommonNotificationCenter` 와 `@ssoo/web-shell` `SsooHeaderNotificationCenter` 를 source filter 없이 소비해 사용자의 전체 수신 알림을 같은 패널 문구, dim/backdrop, read/unread, pagination 표면으로 표시한다. 공용 패널 상단에는 `전체`와 앱별 source filter chip/badge가 표시되며, 각 앱은 `preferredSourceApp` 으로 현재 앱 chip 순서만 힌트로 제공한다. 선택된 chip은 목록과 모두 읽음 범위를 바꾸지만 header trigger badge는 사용자 전체 미확인 수를 유지한다. 알림의 source app/path 전환은 `@ssoo/web-auth` app URL/path resolver 가 맡고, 도메인별 처리 버튼은 공통 header 패널에 노출하지 않는다.
- **공용 server API proxy helper**: 5앱 `_shared/serverApiProxy.ts` 는 base URL과 `X-SSOO-App` 값만 주입하고, URL 생성/forward header/default header 병합은 `@ssoo/web-auth` `createServerApiProxyHelpers` 가 소유한다. DMS `raw`/`serve-attachment` binary proxy 와 assistant SSE proxy 의 shared-session access token restore도 같은 helper가 소유해 binary/SSE 경로가 auth/session 복원 규칙에서 drift 나지 않게 한다.
- **Admin auth control plane**: Admin `/auth` 는 `common.cm_auth_provider_setting_m` 을 통해 비밀번호 로그인/찾기/변경, 사내 SSO URL, Microsoft 365 tenant/client/redirect/scope/allowlist, 가입 신청 노출, auth email outbox 정책을 관리한다. Microsoft client secret 은 `AUTH_CONFIG_ENCRYPTION_KEY` 로 암호화 저장되며 Admin 응답에는 configured 여부만 노출된다.
- **Microsoft 365 OAuth signup/login**: `/api/auth/microsoft/start` 와 `/api/auth/microsoft/callback` 은 Microsoft Entra ID auth code flow 를 사용한다. OAuth state cookie 는 HMAC 서명하고, Callback 은 ID token 을 Microsoft JWKS 로 서명 검증한 뒤 issuer/audience/nonce/clock claim 과 `tid` + `oid/sub` + email claim 을 확인한다. 가입 신청 intent 는 `common.cm_user_registration_request_m` 에 `pending` 으로 저장되고, Admin 승인 시 활성 role 검증 후 `common.cm_user_external_identity_m` 매핑과 로컬 `User/UserAuth` 가 생성된다. 로그인 intent 는 승인된 외부 ID 매핑이 있는 사용자만 shared session cookie/JWT 를 발급한다.
- **비밀번호 찾기/변경 분리**: `/password-reset` 은 5앱 공용 route 로 제공되고, 브라우저는 각 앱의 same-origin `/api/auth/password-reset/request|confirm` proxy 를 호출한다. 해당 proxy 는 로그인 proxy 와 같은 CSRF + trusted Origin/Referer 검사를 통과한 뒤 서버 `/api/auth/password-reset/request|confirm` 으로 전달한다. 서버는 가입 메일 기준 단기 코드를 생성해 `common.cm_auth_email_outbox_m` 에 발송 대기 row 를 쌓고, 새 코드 발급 시 이전 활성 challenge/outbox 를 supersede 하며, confirm 성공 후 같은 사용자/메일의 남은 challenge 를 모두 consumed 처리하고 기존 세션을 `password-reset` 사유로 revoke 한다. 로그인 상태의 비밀번호 변경은 별도 authenticated flow 로 유지한다.
- **공용 browser identity**: `AuthIdentity` 는 이제 `userId`, `loginId`, `userName` 만 담고, role/org/admin 성격 정보와 profile 표시 필드는 browser auth identity payload 에서 제거한다. profile 표시가 필요한 surface는 `AuthIdentityProfileProjection` 또는 `ProfileSummary` 를 명시적으로 사용한다.
- **축소된 profile contract**: `GET /api/users/profile` 도 이제 `roleCode`, `userTypeCode`, `isAdmin` 를 다시 노출하지 않고 profile + identity 보조 정보만 반환
- **서버 내부 auth payload**: JWT `TokenPayload` 는 `userId`, `loginId`, `sessionId` 중심으로 유지되고, `roleCode` 는 token/request auth context 에 저장하지 않는다. 권한 판정이 필요할 때 `RolesGuard` 와 domain access service 가 `AccessFoundationService` 를 통해 DB-backed policy 를 직접 해석한다.
- **route-level admin gate 정렬**: `@Roles('admin')` 는 토큰/browser identity 의 role field 나 단순 역할명이 아니라 `AccessFoundationService` 가 요청 시점에 계산한 `system.override` policy 기준으로 평가
- **사용자 UI surface 정렬**: Admin/CRM/PMS/DMS/SNS 사용자 메뉴의 global profile/personal settings entry 는 `@ssoo/web-auth` `AuthUserMenu` user surface action 으로 수렴한다. 앱들은 외부 SNS URL로 이동하지 않고 현재 앱 프레임의 탭바에 `SsooUserSurfacePage`를 열되, 해당 route는 `@ssoo/web-shell` shared-surface helper를 통과하는 `contentPage`로 등록한다. SNS는 profile/feed/follow 도메인 API와 domain event 발행 책임만 소유한다. DMS 문서 도메인 설정은 별도 `문서 설정` action 으로 유지한다.
- **foundation 정렬 완료**: `AccessFoundationService`, PMS project filter, PMS admin menu inclusion 은 더 이상 `isAdmin` shortcut 을 쓰지 않고 `system.override` 기준으로 계산
- **operator/schema cleanup 완료**: user admin / inspect 계약은 `userTypeCode` / `isAdmin` 없이도 운영 가능하고, user schema tail(`is_admin`, `user_type_code`, `permission_codes`)는 제거되었다
- **cutover sequencing 완료**: `Phase 1 menu/admin` → `Phase 2 organization bridge` → `Phase 3 token/runtime contract shrink` → `Phase 4 operator contract cleanup` → `Phase 5 schema drop` 실행 순서가 닫혔다
- **앱별 유지**:
  - PMS: 메뉴/권한 bootstrap (`/menus/my`)
  - SNS: 피드/프로필 + SNS access snapshot
  - DMS: 워크스페이스/파일 트리 + DMS access snapshot

즉, 공용 auth는 **"누구인가"** 를 해결하고, 앱별 bootstrap은 **"이 앱에서 무엇을 할 수 있는가"** 를 해결합니다.

### 7.2 DMS domain route boundary

- **공개 유지**: `/api/auth/login`, `/api/auth/session`
- **세션 복원 단일화**: `/api/auth/refresh` 직접 엔드포인트는 제거되었다. 브라우저와 same-origin proxy는 `/api/auth/session`만 사용하고, 서버 내부 `AuthService.refreshTokens()` 는 HttpOnly shared session cookie 회전 구현 세부로만 남는다.
- **인증 필수**: `dms/files`, `dms/file`, `dms/content`, `dms/templates`, `dms/search`, `dms/ask`, `dms/create`, `dms/doc-assist`, `dms/chat-sessions`, `dms/git`, `dms/storage`, `dms/settings`, `dms/ingest`, `dms/access`
- **binary 예외 처리 방식 변경**: `dms/file/raw`, `dms/file/serve-attachment`, `dms/storage/open?download=1` 도 server에서는 `JwtAuthGuard + DmsFeatureGuard(canReadDocuments)` 를 사용하고, 브라우저 direct navigation 제약은 same-origin Next proxy가 shared session cookie로 access token을 복원해 해결합니다. `storage/open` 다운로드는 provider별 external `webUrl` 이 있어도 redirect 하지 않고 binary response + `Content-Disposition` 으로 내려 파일명과 파일 바이트를 같은 응답 경계에서 보존합니다.
- **향후 세분화 대상**:
  - template / content / file write 계열 → `canWriteDocuments`, `canManageTemplates`
  - git / storage / ingest 계열 → `canUseGit`, `canManageStorage`; settings 계열은 personal 설정 허용 + admin-only system/runtime 관리
  - document read/write/binary/search 계열 → `DocumentMetadata.acl` 기반 object policy

### 7.3 운영 inspect surface

- **관리자 전용 API**:
  - `GET /api/access/ops/inspect`
  - `GET /api/access/ops/exceptions`
- inspect 는 특정 사용자의 foundation action policy 와 optional object policy, active permission exception 을 함께 보여줍니다.
- exceptions 는 user/loginId, axis, object target, permission code 기준으로 permission exception 목록을 조회합니다.
- PMS `UserManagementPage` 는 operator 가 같은 API를 직접 호출할 수 있도록 `AccessInspectDialog` 를 제공합니다.
- `pnpm verify:access-smoke` 는 로그인, profile contract, inspect success, 기본 demo runtime persona(`viewer.han`) 기준 PMS/SNS/DMS allow-deny boundary, non-admin inspect 403 을 자동 검증하는 repo-native smoke script 입니다. runtime 교차검증을 잠시 제외해야 하면 `--skip-runtime` 을 사용합니다.
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
| AUTH-06 | Admin auth provider 설정 + Microsoft 365 OAuth backend / 외부 ID 매핑 | P2 | ✅ 완료 |
| AUTH-07 | Microsoft OAuth 기반 가입 신청 + 관리자 승인 플로우 | P2 | ✅ 완료 |
| AUTH-08 | 이메일 코드 기반 비밀번호 찾기/재설정 + session revoke | P2 | 🟡 메일 발송 worker 결정 필요 |
| AUTH-09 | 전 앱 Next 보안 헤더 + DMS Markdown HTML sanitizer baseline | P1 | ✅ 완료 |

---

## Changelog

> 이 영역 관련 변경 이력

| 날짜 | 변경 내용 |
|------|----------|
| 2026-06-16 | DMS `storage/open?download=1` 을 same-origin session-backed binary proxy + 서버 binary response 로 고정해 배포 환경의 direct download 인증/파일명 drift 를 차단 |
| 2026-06-16 | DMS binary/SSE session-backed proxy helper를 `@ssoo/web-auth` `createServerApiProxyHelpers` 로 공용화하고, SNS auth display projection을 `AuthIdentityProfileProjection` 타입으로 고정 |
| 2026-06-15 | 로그인 통합 gap zero hardening: Admin login adapter 도 `APP_HOME_PATH` 상수 주입으로 정렬하고, 5앱 password reset 을 same-origin `/api/auth/password-reset/[action]` proxy 로 이동했으며, browser-facing auth proxy allowlist 에서 body 기반 `refresh` 를 제거하고 lifecycle verifier 에 CSRF/Origin 검사를 반영 |
| 2026-06-12 | Auth same-origin proxy에 `X-SSOO-CSRF` 커스텀 헤더와 Origin/Referer/Fetch Metadata 검증을 추가하고, server API proxy가 Origin/Referer를 backend로 보존하도록 보강. 공용 Next config factory의 CSP report-only/Trusted Types 관측 헤더와 DMS markdown 보안 회귀 검증을 하드닝 gate에 연결 |
| 2026-06-12 | CRM auth route 의 중복 `X-SSOO-App` stamping wrapper 를 제거해 5앱 `/api/auth/[action]` route 를 같은 thin adapter 형태로 정렬하고, 앱별 차이는 DMS/PMS/SNS user-scoped cleanup hook 같은 도메인 책임 예외만 허용하도록 `verify:auth-commonization` gate 와 문서를 보강 |
| 2026-06-12 | 남은 로그인 통합 drift/security hardening: Admin/PMS/SNS Axios 401 복원 로직을 `createSharedAxiosApiClient` 로 공용화하고, browser-facing `AuthTokens`/auth store에서 refreshToken 표면을 제거. 5앱 Next security headers(frame-ancestors/base-uri/object-src/nosniff/referrer/frame/permissions), 서버 auth 민감 로그 제거, DMS Markdown DOMPurify sanitizer/URL protocol allowlist/Mermaid strict mode를 추가 |
| 2026-06-12 | Auth hardening: access token localStorage persistence 를 제거하고 runtime memory + HttpOnly shared session cookie 복원 기준으로 전환. OAuth state HMAC 서명, Microsoft issuer/clock claim 검증, JWKS cache/fetch timeout, reset challenge 일괄 폐기, pending outbox supersede/consume, active role 기반 가입 승인 검증, Helmet/production config hardening gate 를 추가 |
| 2026-06-12 | Admin `/auth` 인증 정책 control plane 을 추가하고 `cm_auth_provider_setting_m`, `cm_user_external_identity_m`, `cm_user_registration_request_m`, `cm_user_password_reset_challenge_m`, `cm_auth_email_outbox_m` 및 히스토리 트리거를 추가. Microsoft 365 auth code callback 은 JWKS 서명 검증 후 가입 신청/외부 ID 로그인을 처리하고, 비밀번호 찾기는 이메일 코드 + outbox + session revoke 흐름으로 분리 |
| 2026-06-11 | 로그인 확장 action 기본값을 사내 SSO + Microsoft 365 기준으로 정렬하고 generic OAuth/Google provider는 명시 props 없이는 노출하지 않도록 축소. 가입은 open signup보다 가입 요청을 우선하고, SSO backend/셀프 가입/비밀번호 재설정 방식은 별도 결정 항목으로 분리 |
| 2026-06-11 | 플랫폼명 확정 전 기준에 맞춰 login surface 브랜드 카피를 `SSOT` 로 통일. 로고/푸터는 `SSOT`, 제목은 `로그인` 으로 정렬하고, 비밀번호 찾기/가입 요청/사내 SSO/Microsoft 365 는 URL/provider 설정 시만 노출되는 공용 확장 슬롯으로 정리 |
| 2026-06-11 | `SharedAuthLoginPage` 가 표준 `AuthPageShell` 을 직접 렌더링하도록 정렬하고 Admin/CRM/PMS/DMS/SNS login route 의 앱별 문구/layout/theme override 를 제거. CRM Tailwind web-auth scan, Admin auth layout, `verify:auth-commonization` UI drift gate 를 보강 |
| 2026-06-11 | `@ssoo/web-auth` account center resolver/AuthUserMenu action 을 추가해 Admin/CRM/PMS/DMS/SNS 사용자 메뉴의 global account/profile/security entry 를 SNS account center 로 수렴하고, route-level admin gate 설명을 `system.override` 기준으로 보정 |
| 2026-04-15 | `pnpm verify:access-dms` fixture-driven DMS regression script 를 추가하고, DMS domain route boundary 와 cleanup Phase 3 minimum gate 에 `files/file/content/raw/serve-attachment/search/ask/settings/git/storage/open` verification surface 를 반영 |
| 2026-04-15 | PMS `cm_role_menu_r` 를 공식 role override layer 로 명시하고 `role-override` source naming 을 정렬했으며, `pnpm verify:access-admin` 으로 PMS role-menu operator semantics + admin user CRUD/org bridge parity 검증 루틴을 추가 |
| 2026-04-15 | Phase 3~5 closeout — JWT payload `roleCode` 제거, DB-backed role baseline resolution 정렬, user admin / inspect contract 에서 `userTypeCode`·`isAdmin` 제거, `cm_user_m`/`cm_user_h` 의 `is_admin`·`user_type_code`·`permission_codes` schema tail 제거를 반영 |
| 2026-04-15 | live `:4000` + `viewer.han` smoke baseline 을 cleanup 출발점으로 명시하고, Phase 0~5 최소 gate 와 DMS regression-gate 규칙을 auth-system 정본에 추가 |
| 2026-04-15 | `pnpm verify:access-smoke` 기본 runtime persona(`viewer.han`) 검증 범위를 PMS foreign project deny, SNS create deny, DMS git/settings system deny + cross-domain allow path 로 확장하고 `--skip-runtime` 운영 fallback 을 반영 |
| 2026-04-15 | runtime parity 이후 남은 리스크를 legacy cleanup execution gate(`roleCode` runtime propagation, PMS role-menu coupling, `userTypeCode` organization bridge, cleanup-only tail) 기준으로 요약하고 cleanup plan 정본 링크를 보강 |
| 2026-04-14 | PMS project-scoped route 를 `ProjectFeatureGuard` + `RequireProjectFeature(...)` 기준으로 정렬하고, PMS two-stage bootstrap 설명에 guard 기반 capability 보호를 반영 |
| 2026-04-14 | PMS two-stage bootstrap(`/api/menus/my` -> `/api/projects/:id/access`)와 `PmsAccessSnapshot` 의 navigation-centric 성격을 명시하고, Wave 5 PMS/SNS validation expansion target 을 추가 |
| 2026-04-14 | `@Roles('admin')` route gate 를 access foundation `system.override` 기준으로 정렬하고, PMS operator inspect dialog + `pnpm verify:access-smoke` automation 을 운영 inspect surface 에 반영 |
| 2026-04-14 | JWT `TokenPayload` 에서 `isAdmin` 을 제거하고 `AccessFoundationService`, PMS project filter, PMS admin menu inclusion 을 `system.override` 기준으로 정렬 |
| 2026-04-14 | JWT `TokenPayload` 에서 `userTypeCode` 를 제거하고 server internal auth payload 를 `roleCode` / `isAdmin` 중심으로 축소 |
| 2026-04-14 | SNS browser-facing access snapshot 의 redundant `isAdmin` 제거와 `GET /api/users/profile` legacy field 축소를 반영하고 browser-facing contract 설명을 정리 |
| 2026-04-14 | 관리자용 access inspect / exception API 와 운영 runbook, cleanup plan 링크를 추가해 운영 hardening surface 를 문서화 |
| 2026-04-14 | DMS `DocumentMetadata.acl` object ACL pilot 을 `file/content` read/write/metadata/rename/delete, `/dms/files`, `raw/serve-attachment`, `/dms/search`, `/dms/ask`, template reference/doc-assist tree hint, upload inheritance, local `storage/open` policy 까지 확장하고, 새 문서 owner default + 기본 DocumentPage affordance + validation matrix를 정렬 |
| 2026-04-14 | Wave 5 audit 기준으로 PMS project access 와 SNS access/content visibility 가 `AccessFoundationService` + shared `policy` trace 계약 위에 유지됨을 확인하고 cross-domain alignment 상태를 문서에 반영 |
| 2026-04-14 | server common `AccessFoundationService` + `packages/types` `policy` trace 기준으로 DMS/SNS/PMS project access snapshot 의 permission resolution contract(역할/조직/user-exception/domain/object/system override)를 정렬 |
| 2026-04-14 | `packages/web-auth` 에 공용 session bootstrap helper를 추가해 PMS/SNS/DMS 401 복원 로직을 통합하고, concurrent restore dedupe + transient failure 시 local auth 유지 정책으로 정렬 |
| 2026-04-13 | DMS `raw` / `serve-attachment` 를 same-origin session-backed auth proxy + server `canReadDocuments` 검사 기준으로 보강하고, binary cache를 private 기준으로 조정 |
| 2026-04-13 | browser-facing `AuthIdentity` 를 `userId` / `loginId` 기준으로 slim화하고, PMS admin sidebar 노출을 auth payload 대신 menu access snapshot 기준으로 전환 |
| 2026-04-13 | PMS/SNS/DMS browser `authApi` adapter 를 `packages/web-auth/src/auth-api.ts` shared factory 기준으로 정렬해 app-local auth adapter 중복을 제거 |
| 2026-04-13 | SNS access snapshot 을 role/org/user-exception/system override 기반 baseline feature policy 로 전환하고, `SnsFeatureGuard` 및 SNS web gating 을 연결 |
| 2026-04-13 | SNS post/feed/comment 흐름에 `visibility_scope_code` / `target_org_id` 기반 content visibility policy 를 적용하고 compose badge/UI 까지 연결 |
| 2026-04-10 | PMS project object policy를 추가해 `owner_organization_id`, `pr_project_role_permission_r`, `/api/projects/:id/access` 기반 capability 계산과 project detail UI gating을 연결 |
| 2026-04-09 | `cm_permission_m`, `cm_role_m`, `cm_role_permission_r`, `cm_org_permission_r`, `cm_user_permission_exception_r` 및 대응 history trigger/seed 를 추가해 permission foundation bridge를 도입 |
| 2026-04-09 | `cm_user_auth_m`, `cm_user_session_m`, `cm_user_invitation_m` bridge 테이블과 corresponding history trigger를 도입하고, server auth runtime이 새 auth/session 테이블을 우선 사용하되 legacy `cm_user_m` 필드와 호환되도록 정리 |
| 2026-04-08 | PMS/SNS/DMS same-origin auth proxy contract를 payload-only shape로 정규화하고, backend `success(data)` envelope는 proxy 경계에서 종료되도록 정리 |
| 2026-04-08 | PMS/SNS 브라우저 auth 진입점을 same-origin `/api/auth/[action]` proxy 기준으로 통일해 DMS와 같은 auth surface를 사용하도록 정리 |
| 2026-04-08 | DMS `dms/*` business route를 login-required 내부 API로 재분류하고 `JwtAuthGuard` 기준으로 정리, `/api/ingest/jobs` proxy도 auth header/cookie를 전달하도록 보강 |
| 2026-04-08 | SNS/DMS 메인 shell이 auth 복원 직후 각 도메인 access snapshot 을 먼저 hydrate 하도록 정리하고, SNS feed 작성/DMS 파일 트리·assistant 초기화를 snapshot 기준으로 연결 |
| 2026-04-08 | 공통 auth backend에 shared session cookie + `/api/auth/session` bootstrap 흐름을 추가하고, PMS/SNS/DMS가 refresh token localStorage 공유 없이도 같은 사용자 세션을 복원할 수 있도록 정리 |
| 2026-04-08 | `packages/web-auth` 에 PMS 기준 표준 login card를 추가하고 PMS/SNS/DMS login 화면이 같은 레이아웃/문구/footer를 공유하도록 정리하되, 각 앱의 테마 컬러 토큰은 유지 |
| 2026-04-07 | `packages/types` + `packages/web-auth` 기준으로 PMS/SNS/DMS 공용 auth 계약, auth store/runtime, login UI shell을 도입하고 앱별 bootstrap 경계를 문서에 반영 |
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
- PMS/SNS same-origin auth proxy는 Docker 내부에서 `PMS_SERVER_API_URL` / `SNS_SERVER_API_URL` 를 우선 사용하고, 브라우저 번들용 주소(`PMS_NEXT_PUBLIC_API_URL` / `SNS_NEXT_PUBLIC_API_URL`)와 분리할 수 있습니다.
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
