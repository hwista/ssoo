# Access Verification Runbook

> 최종 업데이트: 2026-04-15

공용 auth/access contract, PMS/CMS/DMS object policy, permission exception 운영 상황을 **같은 절차로 반복 검증**하기 위한 운영 가이드입니다.

---

## 1. 목적

이 문서는 아래 상황을 빠르게 재현하고 판단하기 위한 runbook 입니다.

1. 특정 사용자가 왜 allow/deny 되었는지 확인해야 할 때
2. permission exception 이 실제로 반영되었는지 확인해야 할 때
3. PMS/CMS/DMS 가 같은 상위 contract 위에 있는지 점검해야 할 때
4. cutover 직전 운영 검증을 반복해야 할 때

---

## 2. 준비 조건

### 서버/데이터

- `pnpm db:seed`
- `pnpm dev:server`
- 필요 시 웹 앱:
  - `pnpm dev:web-pms`
  - `pnpm dev:web-cms`
  - `pnpm dev:web-dms`

### 기본 운영 계정

- 관리자: `admin` / `admin123!`

### 자동 smoke script

- `pnpm verify:access-smoke --dry-run`
- `pnpm verify:access-smoke`
- `pnpm verify:access-smoke --skip-runtime`
- `pnpm verify:access-admin --dry-run`
- `pnpm verify:access-admin`
- `pnpm verify:access-dms --dry-run`
- `pnpm verify:access-dms`

선택 환경변수:

- `ACCESS_VERIFY_BASE_URL`
- `ACCESS_VERIFY_ADMIN_LOGIN_ID`
- `ACCESS_VERIFY_ADMIN_PASSWORD`
- `ACCESS_VERIFY_SUBJECT_LOGIN_ID`
- `ACCESS_VERIFY_RUNTIME_LOGIN_ID`
- `ACCESS_VERIFY_RUNTIME_PASSWORD`
- `ACCESS_VERIFY_RUNTIME_PROJECT_ID`
- `ACCESS_VERIFY_NON_ADMIN_LOGIN_ID`
- `ACCESS_VERIFY_NON_ADMIN_PASSWORD`
- `ACCESS_VERIFY_ROLE_MENU_ROLE_CODE`
- `ACCESS_VERIFY_CUSTOMER_ID`
- `ACCESS_VERIFY_INTERNAL_ORG_CODE`
- `ACCESS_VERIFY_DMS_FIXTURE_DIR`

`pnpm verify:access-admin` 추가 전제:

- `DATABASE_URL`
- admin-only 경로 검증을 위해 role-menu override 를 잠시 변경 후 원복하고, temp user create/update 후 DB relation parity 를 확인하므로 DB 접근이 가능한 환경이어야 함

기본 runtime persona:

- `viewer.han` / `user123!`

의도:

1. 관리자 로그인 자동화
2. `GET /api/users/profile` legacy field contract 확인
3. `GET /api/access/ops/inspect` 성공 경로 확인
4. PMS runtime 경계 확인 (`/api/menus/my`, 접근 가능한 프로젝트 allow, foreign project deny)
5. CMS runtime 경계 확인 (`/api/cms/access/me`, `/api/cms/feed`, post create deny)
6. DMS runtime 경계 확인 (`/api/dms/access/me`, `/api/dms/files`, `/api/dms/search`, `/api/dms/settings`, `/api/dms/git`)
7. runtime persona 또는 explicit non-admin credential 기준 `GET /api/access/ops/inspect` 403 확인

`pnpm verify:access-admin` 의도:

1. PMS role-menu operator read/update/reset semantics 확인
2. admin user create/update contract 에 legacy field 가 다시 생기지 않았는지 확인
3. internal → external primary affiliation switching 후 `cm_user_org_r` parity 확인
4. temp user inspect subject shape 와 `organizationIds` baseline 확인

`pnpm verify:access-dms` 의도:

1. admin 기준 temp DMS probe document + image/attachment/local storage fixture 를 생성하고 cleanup 한다
2. `GET /api/dms/access/me` 와 `GET /api/access/ops/inspect` 의 policy trace 가 같은 방향인지 확인한다
3. `files/file/content/raw/serve-attachment/search/ask/settings/git/storage/open` surface 가 runtime persona(`viewer.han`) 기준 allow/deny matrix 와 모순되지 않는지 확인한다
4. admin 기준 `settings/git/storage/open` privileged surface 가 접근 제어를 통과하는지 확인한다

### 주요 검증용 seed persona

| 용도 | loginId | 근거 |
|------|---------|------|
| 관리자 inspect | `admin` | 기본 관리자 계정 |
| 표준 사용자 | `dev.park` | `11_demo_users_customers.sql` |
| 조회 전용 사용자 | `viewer.han` | `11_demo_users_customers.sql` |
| 일반 업무 사용자 | `sm.choi`, `am.park` | `11_demo_users_customers.sql` |

---

## 3. 운영 inspect API

관리자는 아래 API로 foundation trace 와 exception 상태를 직접 확인할 수 있습니다.

### 3.1 Inspect

`GET /api/access/ops/inspect`

용도:

- 특정 사용자 기준 action policy 확인
- optional object target 기준 object policy 확인
- 현재 적용 중인 action/object permission exception 동시 확인

예시:

```bash
curl -s \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" \
  "http://localhost:4000/api/access/ops/inspect?loginId=viewer.han"
```

```bash
curl -s \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" \
  "http://localhost:4000/api/access/ops/inspect?loginId=viewer.han&targetObjectType=dms.document&targetObjectId=docs/sample.md&domainPermissionCodes=dms.document.read"
```

핵심 확인 포인트:

- `action.policy.rolePermissionCodes`
- `action.policy.organizationPermissionCodes`
- `action.policy.userGrantedPermissionCodes`
- `action.policy.userRevokedPermissionCodes`
- `object.policy.domainGrantedPermissionCodes`
- `object.policy.objectGrantedPermissionCodes`
- `object.policy.objectRevokedPermissionCodes`

### 3.2 Exception list

`GET /api/access/ops/exceptions`

용도:

- 사용자/축/action/object target/permission code 기준 예외 목록 조회

예시:

```bash
curl -s \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" \
  "http://localhost:4000/api/access/ops/exceptions?loginId=viewer.han&exceptionAxis=object"
```

```bash
curl -s \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" \
  "http://localhost:4000/api/access/ops/exceptions?permissionCode=dms.document.write&includeInactive=true"
```

---

## 4. 검증 순서

### Step 0. smoke script 선검증

1. 서버가 떠 있으면 먼저 `pnpm verify:access-smoke` 를 실행합니다.
2. 기본 demo runtime persona(`viewer.han`)가 없거나 cross-domain runtime 검증을 잠시 제외해야 하면 `pnpm verify:access-smoke --skip-runtime` 으로 baseline(admin/profile/inspect)만 먼저 확인합니다.
3. admin user CRUD, org bridge parity, PMS role-menu operator semantics 까지 함께 보려면 `pnpm verify:access-admin` 을 추가로 실행합니다.
4. DMS domain regression gate 를 fixture-driven 으로 닫으려면 `pnpm verify:access-dms` 를 이어서 실행합니다.
5. smoke script 가 실패하면 수동 inspect 전에 auth/session, PMS foreign project deny, 또는 feature guard 부터 다시 확인합니다.

### Step 1. foundation trace 확인

1. 관리자 access token 을 발급받습니다.
2. `/api/access/ops/inspect` 로 대상 사용자의 action trace 를 확인합니다.
3. 기대한 role/org/user-exception 기여도가 실제 trace 와 일치하는지 확인합니다.

### Step 2. object policy 확인

1. 대상 object 가 있으면 `targetObjectType`, `targetObjectId` 를 함께 전달합니다.
2. 필요한 domain permission code 를 `domainPermissionCodes` 로 전달합니다.
3. `object.policy` 의 grant/revoke 결과가 기대와 일치하는지 확인합니다.

### Step 3. domain runtime 결과 확인

아래 domain surface 와 inspect 결과를 대조합니다.

| 도메인 | 확인 surface | 기대 결과 |
|--------|--------------|-----------|
| PMS | `/api/menus/my`, `/api/roles/:roleCode/menus`, `/api/projects/:id/access`, `/api/access/ops/inspect?targetObjectType=pms.project...` | navigation snapshot + role-menu baseline/role override semantics + project capability + object inspect trace 가 같은 방향으로 동작 |
| CMS | `/api/cms/access/me`, feed/post visibility | feature snapshot + post visibility 가 inspect 결과와 모순되지 않음 |
| DMS | `/api/dms/access/me`, file/content/raw/serve-attachment/search/ask/git/settings/storage/open | feature snapshot + `DocumentMetadata.acl` enforcement 가 inspect 결과와 모순되지 않음 (`pnpm verify:access-dms` fixture pack 기준) |

Phase 2 organization bridge 확인이 필요하면 같은 Step 1~3 사이클에서 다음 항목도 함께 비교합니다.

1. 사용자 생성/수정 payload 의 `primaryAffiliationType`, `departmentCode`, `companyName`, `customerId`
2. `GET /api/access/ops/inspect?loginId=...` 의 `organizationIds`
3. 해당 사용자의 PMS/DMS runtime allow/deny 결과

명시적 primary 소속 선택이 있는 경우 inspect 와 runtime 이 그 값을 따라야 하고, explicit 값이 없으면 current primary relation 또는 data-driven 단일 소속 fallback 과 모순이 없어야 합니다.

### Step 4. deny/allow 이유 기록

deny 사례가 나오면 아래 순서로 기록합니다.

1. 대상 사용자
2. 대상 도메인/엔드포인트
3. 기대 결과
4. 실제 결과
5. inspect trace 차이
6. exception 필요 여부

---

## 5. 대표 시나리오

### 5.1 Viewer read-only 시나리오

대상:

- `viewer.han`

확인:

1. DMS document read/tree/search 는 허용
2. DMS write/delete/upload/local `storage/open` 은 대상 ACL 없으면 거부
3. PMS same-org read-only 시나리오가 깨지지 않음
4. CMS feed read 는 가능하지만 create/comment/react 는 snapshot 기준으로 제한될 수 있음

### 5.2 Standard user same-org 시나리오

대상:

- `dev.park`

확인:

1. CMS organization visibility 게시물이 same-org 기준으로 읽힘
2. DMS document read/write 는 feature + object ACL 조합으로 판단됨
3. PMS project access 는 owner org/member/object exception 조합으로 판단됨

### 5.3 Admin override 시나리오

대상:

- `admin`

확인:

1. `system.override` 가 trace 에 포함됨
2. inspect 결과와 runtime 결과가 모두 override 기준으로 움직임
3. admin-only ops endpoint 접근 가능

### 5.4 Organization bridge parity 시나리오

대상:

- internal 샘플 사용자 1명
- external 샘플 사용자 1명
- 필요 시 internal/external 양쪽 소속 정보를 모두 가진 사용자 1명

확인:

1. 사용자 생성/수정 시 `primaryAffiliationType` 을 지정하면 해당 org relation 이 primary 로 유지됨
2. explicit 값 없이 한쪽 소속 정보만 있으면 해당 org relation 이 primary 로 선택됨
3. inspect `organizationIds` 와 PMS/DMS runtime gate 결과가 같은 소속 기준으로 동작함

### 5.4 PMS project object / exception 시나리오

대상:

- `dev.park` 또는 `viewer.han`

확인:

1. `/api/menus/my` 가 사용자 navigation baseline 과 일치하는지 확인
2. `GET /api/roles/:roleCode/menus` 또는 `RoleManagementPage` 에서 일반 메뉴는 `baseline`/`role override`, 관리자 메뉴는 `system.override` read-only 로 보이는지 확인
3. `/api/projects/:id/access` 의 `roles`, `features`, `policy` 가 owner/member/object exception 기대치와 일치하는지 확인
4. 같은 대상에 대해 `/api/access/ops/inspect?targetObjectType=pms.project&targetObjectId=<projectId>&domainPermissionCodes=pms.project.manage` 를 호출했을 때 trace 와 runtime capability 가 모순되지 않는지 확인
5. revoke 대상 capability 가 있으면 mutation endpoint 가 deny 방향으로 동작하는지 확인

### 5.5 CMS visibility boundary 시나리오

대상:

- `dev.park`, `viewer.han`

확인:

1. `organization` scope post 는 same-org 사용자에게만 노출되는지 확인
2. `followers` scope post 는 실제 follower 관계가 있는 사용자에게만 노출되는지 확인
3. `/api/cms/access/me` 의 feature snapshot 과 실제 feed/post visibility 결과가 같은 방향으로 움직이는지 확인
4. 읽을 수 없는 post 에 대한 comment/mutation 시도가 release-grade cutover 전에는 허용되지 않도록 별도 점검 항목으로 기록

---

## 6. release-grade checklist

- [ ] `pnpm verify:access-smoke` 통과
- [ ] `pnpm verify:access-admin` 통과
- [ ] `pnpm verify:access-dms` 통과
- [ ] shared auth/session bootstrap 정상
- [ ] PMS navigation snapshot 정상
- [ ] PMS project access snapshot 정상
- [ ] PMS project object exception trace 와 runtime 결과 일치
- [ ] CMS feature snapshot 정상
- [ ] CMS content visibility 정상
- [ ] CMS organization/follower visibility 와 restricted write boundary 점검
- [ ] DMS feature snapshot 정상
- [ ] DMS object ACL(file/content/search/ask/template/upload/storage/open) 정상
- [ ] inspect endpoint 와 runtime 결과 일치
- [ ] permission exception 조회 결과와 runtime 결과 일치

---

## 관련 문서

- [인증 시스템 아키텍처](../explanation/architecture/auth-system.md)
- [API 가이드](./api-guide.md)
- [Access Cutover Cleanup Plan](../explanation/architecture/access-cutover-cleanup-plan.md)

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-04-15 | `pnpm verify:access-dms` fixture-driven DMS regression script 를 추가하고, temp probe document/image/attachment/local storage fixture 기반으로 `files/file/content/raw/serve-attachment/search/ask/settings/git/storage/open` matrix 를 검증하는 절차를 runbook 에 반영 |
| 2026-04-15 | `pnpm verify:access-admin` repo-native admin regression script 를 추가하고, PMS role-menu read/update/reset semantics + admin user CRUD/org bridge parity + temp user inspect/organizationIds 검증 절차를 runbook 에 반영 |
| 2026-04-15 | `pnpm verify:access-smoke` 가 기본 demo runtime persona(`viewer.han`) 기준으로 PMS foreign project deny, CMS post deny, DMS git/settings deny 와 allow path(files/search/feed)를 함께 검증하도록 확장되고 `--skip-runtime` / runtime env 변수를 문서화 |
| 2026-04-14 | PMS project object/exception 시나리오와 CMS visibility boundary 시나리오를 추가하고 release-grade checklist 를 cross-domain validation 기준으로 확장 |
| 2026-04-14 | `pnpm verify:access-smoke` repo-native smoke script 와 사용 환경변수를 runbook 에 추가하고 자동 선검증 절차를 반영 |
| 2026-04-14 | 관리자 inspect API(`/api/access/ops/inspect`, `/api/access/ops/exceptions`)와 cross-domain access verification 절차를 runbook으로 정리 |
