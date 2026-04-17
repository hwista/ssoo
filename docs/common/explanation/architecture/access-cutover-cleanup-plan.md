# Access Cutover Cleanup Plan

> 최종 업데이트: 2026-04-15

공용 auth/access contract rollout 이후에도 남아 있는 **legacy compatibility path** 를 어떤 순서로 줄일지 정리한 실행 계획입니다.

> 2026-04-15 closure update: Phase 1~5 실행이 닫혔고, 이 문서는 현재 rollback/history package 로 유지됩니다. 현재 live 기준으로는 PMS `cm_role_menu_r`가 **공식 role override layer** 로 유지되며, `roleCode` token propagation / `userTypeCode` bridge / `isAdmin`·`permission_codes` tail 은 제거되었습니다.

---

## 1. 목적

현재 레포는 shared auth/session, shared permission foundation, DMS reference ACL rollout, PMS/CMS alignment 까지는 완료되었다.  
이제 남은 주된 리스크는 **legacy auth/org/menu compatibility 제거 순서** 와 **rollback-safe cutover sequencing** 이다.

이 문서의 목적은 다음 네 가지다.

1. 어떤 호환 계층이 아직 runtime 을 막고 있는지 분리한다
2. cleanup-only debt 와 runtime blocker 를 명확히 나눈다
3. 제거 순서, rollback point, validation gate 를 고정한다
4. schema 제거를 항상 마지막 단계로 밀어 cutover 리스크를 줄인다

### 1.1 현재 cutover baseline

- live `:4000` 기준 runtime parity 는 복구되었고, `pnpm verify:access-smoke` 가 통과하는 상태를 출발점으로 삼는다.
- 기본 runtime persona 는 `viewer.han` 이며, 이 smoke 는 PMS foreign project deny, CMS post deny, DMS git/settings deny 와 PMS/CMS/DMS allow path 를 함께 검증한다.
- PMS project-scoped route 는 이미 `ProjectFeatureGuard` + `RequireProjectFeature(...)` 기준으로 정렬되어 있어, 남은 리스크는 route migration 자체가 아니라 legacy auth/org/menu cleanup sequencing 이다.
- DMS 는 더 이상 cleanup blocker 가 아니라 regression gate 이며, 각 phase 에서 `/api/dms/access/me`, `raw/serve-attachment`, `search/ask`, `storage/open` 안정성을 계속 증명해야 한다.

---

## 2. 현재 남아 있는 호환 계층

### 2.1 Runtime blocker

| 항목 | 현재 근거 | 왜 blocker 인가 | 제거 gate |
|------|-----------|-----------------|-----------|
| `roleCode` runtime propagation | `apps/server/src/modules/common/auth/auth.service.ts`, `apps/server/src/modules/common/auth/strategies/jwt.strategy.ts`, `apps/server/src/modules/common/access/access-foundation.service.ts` | **Closed.** JWT payload 는 더 이상 `roleCode` 를 carry 하지 않고, `JwtStrategy` 가 current role 을 request user 에 주입하며 `AccessFoundationService` 는 userId 기준 DB role lookup 으로 baseline 을 계산한다. | rollback 이 필요하면 `TokenPayload.roleCode` carry + 기존 resolution 경로를 복구 |
| PMS `cm_role_menu_r` role override layer / role-menu admin surface | `apps/server/src/modules/pms/menu/menu.service.ts`, `apps/server/src/modules/pms/menu/role-permission.service.ts`, `apps/server/src/modules/pms/menu/role-permission.controller.ts`, `apps/web/pms/src/components/pages/admin/RoleManagementPage.tsx`, `packages/database/prisma/schema.prisma` 의 `pms.cm_role_menu_r` | 현재 선택된 방향은 removal 이 아니라 **formalization** 이다. `/api/menus/my` 일반 메뉴 baseline 은 코드 기준선 + user grant/revoke + `cm_role_menu_r` role override layer 로 계산되고, 운영 화면도 그 diff row 를 공식 write path 로 사용한다. 관리자 메뉴 row 는 `system.override` 기준 read-only 로 정렬된다. | follow-up 목표는 replacement 가 아니라 runtime/API/UI/docs naming 과 guardrail 을 이 현재 모델에 맞게 정렬하는 것이다. |
| organization bridge primary affiliation | `apps/server/src/modules/common/user/user.service.ts` 의 `syncOrganizationFoundation()`, `CreateUserDto` / `UpdateUserDto`, PMS `UserManagementPage` | **Closed.** explicit `primaryAffiliationType` 계약 + current primary relation + data-driven fallback 으로 정렬되었고 `user_type_code` mirror 는 제거되었다. | rollback 이 필요하면 explicit affiliation input 이전 contract 와 bridge sync 로직을 복구 |

### 2.2 Cleanup-only debt

| 항목 | 현재 근거 | 왜 cleanup-only 인가 | 정리 시점 |
|------|-----------|----------------------|-----------|
| `isAdmin` mirror + inspect display | `apps/server/src/modules/common/access/access-operations.service.ts`, `apps/web/pms/src/components/pages/admin/AccessInspectDialog.tsx`, `apps/web/pms/src/lib/api/endpoints/users.ts`, `packages/database/prisma/schema.prisma` | **Closed.** `isAdmin` 은 operator contract 에서 제거되었고 user schema/history tail 에서도 제거되었다. | rollback 이 필요하면 inspect/user admin field 와 schema column 을 복구 |
| 공통 user admin / inspect contract 의 legacy field 노출 | `CreateUserDto` / `UpdateUserDto`, `packages/types/src/common/access.ts`, `apps/web/pms/src/lib/api/endpoints/users.ts` | **Closed.** user admin / inspect 계약은 `userTypeCode` / `isAdmin` 없이도 운영 가능하고 `roleCode` 는 공식 role vocabulary 로만 유지된다. | rollback 이 필요하면 optional field 를 한 release 동안 다시 노출 |
| `cm_user_m.permission_codes` | `packages/database/prisma/schema.prisma`, `packages/database/prisma/triggers/02_cm_user_h_trigger.sql` | **Closed.** runtime read/write 경로가 없음을 확인한 뒤 schema/history tail 에서 제거되었다. | rollback 이 필요하면 schema + history trigger 를 복구 |

### 2.3 판단 기준

- **runtime blocker**: 값/테이블/branch 가 지금도 allow/deny, menu bootstrap, organization relation 같은 runtime 결과를 바꾸는 경우
- **cleanup-only debt**: 값이 주로 mirror, inspect, admin contract, schema tail 로만 남아 있고 즉시 제거하지 않아도 runtime parity 에 영향이 없는 경우

---

## 3. 지금 바로 제거하면 안 되는 것

### 3.1 `pms.cm_role_menu_r`

현재는 general menu bootstrap 의 **supported role override store** 이며, PMS role management surface 도 baseline diff 를 여기에 기록한다.  
이번 follow-up 방향에서는 제거가 아니라, 이 모델을 공식 architecture 로 문서/검증 체계에 고정한다.

나머지 historical blocker(`TokenPayload.roleCode`, `cm_user_m.user_type_code`, `is_admin`, `permission_codes`)는 2026-04-15 기준으로 제거되었다.

---

## 4. 권장 실행 순서

| Phase | 시작 조건 | 실행 slice | Validation gate | Phase acceptance criteria | Rollback floor |
|-------|-----------|------------|-----------------|---------------------------|----------------|
| Phase 0 | live `:4000` + `pnpm verify:access-smoke` 기준선이 이미 green 인 상태 | blocker/debt inventory freeze, 관련 문서(`auth-system.md`, DMS readiness, changelog) 동기화, CP-0~CP-5 순서 고정 | `pnpm run codex:preflight`<br>`pnpm verify:access-smoke`<br>`node .github/scripts/check-docs.js --all` | cleanup plan / auth-system / DMS readiness / `docs/CHANGELOG.md` 가 **같은 blocker 집합**, **같은 phase 순서**, **같은 DMS regression-gate 입장**을 설명한다 | docs-only 이므로 문서 revert 로 즉시 복귀 가능 |
| Phase 1 | CP-0 종료 | code baseline + legacy override fallback 을 `/api/menus/my` / `GET /api/roles/:roleCode/menus` / `RoleManagementPage` 에 반영하고, admin menu row 를 `system.override` read-only 로 정렬 | runbook Step 0 + Step 3(PMS)<br>admin/non-admin `/api/menus/my` 비교<br>`GET /api/roles/:roleCode/menus` + `RoleManagementPage` 조회/수정 smoke | replacement path 와 legacy fallback 이 모두 runtime/API/UI 에 반영되어 있고, admin 은 admin menu 유지 / non-admin 은 admin menu 미노출 / PMS foreign project deny 가 계속 유지된다 | code baseline path 비활성화 후 `cm_role_menu_r` direct read/write 로 복귀 |
| Phase 2 | CP-1 종료 | explicit `primaryAffiliationType` 계약을 create/update/UI 에 반영하고, `syncOrganizationFoundation()` 을 explicit selection 우선 + current primary relation 유지 + data-driven fallback 구조로 전환한 뒤 internal/external backfill/parity 절차를 닫는다 | runbook Step 1~3<br>internal/external 사용자 생성·수정 검증<br>`organizationIds` inspect 대조 | create/update + backfill sample 모두에서 `userOrganizationRelation` active/primary row 가 동일하고, inspect 의 `organizationIds` 와 runtime gate 가 모순되지 않는다 | explicit affiliation input 경로와 current primary relation 유지 로직을 복구 |
| Phase 3 | CP-2 종료 | foundation role baseline 을 token-carried `roleCode` 에서 분리하고, JWT payload shrink 후에도 runtime parity 를 유지한다 | login → session restore → PMS/CMS/DMS bootstrap → `/api/access/ops/inspect` → `pnpm verify:access-smoke`<br>non-admin inspect `403` 재확인 | `admin`, `viewer.han` 기준 runtime/inspect 결과가 baseline 과 동일하고, `roleCode` 가 access token 없이도 같은 role baseline 을 만든다 | JWT `TokenPayload.roleCode` 와 기존 access resolution 경로를 복구 |
| Phase 4 | CP-3 종료 | `CreateUserDto`/`UpdateUserDto`, `UserItem`, `AccessInspectionSubject`, PMS inspect/admin UI 에서 `userTypeCode` / `isAdmin` legacy field 를 숨기고 operator 문서를 업데이트한다 | user admin CRUD<br>inspect trace walkthrough<br>PMS operator flow + runbook 재검증 | operator 가 `userTypeCode` / `isAdmin` 없이도 allow/deny 원인을 동일하게 설명할 수 있고, `roleCode` 는 공식 role vocabulary 로만 유지된다 | inspect/user admin field 를 복구 |
| Phase 5 | CP-4 종료 | DB snapshot, migration dry-run 보고, rollback 절차 문서화 후 마지막으로 `is_admin`, `user_type_code`, `permission_codes` schema tail 을 제거한다 | migration dry-run 보고<br>`pnpm verify:access-smoke`<br>runbook Step 1~3<br>`node .github/scripts/check-docs.js --all` | runtime code read/write 가 legacy column/relation 을 더 이상 사용하지 않고, migration/rollback 문서 + smoke/inspect/menu/domain bootstrap 재검증이 모두 green 이다 | DB backup / migration revert. 운영 DB 에서는 schema drop 직전 snapshot 필수 |

> 원칙: **runtime source cutover 전에 schema 를 만지지 않는다.**

추가 실행 규칙:

1. **이전 checkpoint 가 닫히기 전에는 다음 phase 를 시작하지 않는다.**
2. **각 phase 는 하나의 rollback unit 으로 release 한다.** 여러 blocker 를 한 release 에 섞지 않는다.
3. validation gate 가 실패하면 다음 phase 로 넘어가지 않고, 즉시 해당 phase 의 rollback floor 로 복귀한다.

---

## 5. release checkpoint / rollback 기준

| Checkpoint | 닫는 대상 phase | 통과 질문 | 남겨야 할 증빙 | 실패 시 조치 |
|------------|------------------|-----------|------------------|--------------|
| CP-0 inventory freeze | Phase 0 | blocker/debt 분류와 gate/rollback point 가 관련 문서에 동일하게 반영됐는가 | cleanup plan / auth-system / DMS readiness / changelog diff + validation 명령 결과 | 문서만 되돌리고 inventory 재작성 |
| CP-1 menu parity | Phase 1 | `/api/menus/my` 와 PMS role-menu 운영 surface 가 code baseline + legacy override fallback 기준으로 안정적인가 | admin/non-admin 응답 샘플, `GET /api/roles/:roleCode/menus` 응답 샘플, `RoleManagementPage` 조회/수정 확인 결과, admin menu 포함 여부 | legacy override fallback 유지, replacement write path 차단 |
| CP-2 org parity | Phase 2 | internal/external 사용자 생성/수정 후 org relation 결과가 동일한가 | create/update 전후 `userOrganizationRelation` 샘플, inspect `organizationIds` 비교, backfill 표본 결과 | explicit primary + current primary relation 유지 경로 복귀, backfill 재검증 |
| CP-3 auth payload parity | Phase 3 | login/session/access snapshot/inspect 결과가 동일한가 | `pnpm verify:access-smoke` 결과, admin + `viewer.han` inspect 비교, non-admin inspect `403` 결과 | `TokenPayload.roleCode` 복구, JWT issue/validate 축 복귀 |
| CP-4 contract parity | Phase 4 | operator 가 legacy field 없이도 user/admin/inspect 문제를 해결할 수 있는가 | user admin CRUD 응답 비교, PMS operator walkthrough note, runbook 업데이트 근거 | response/request field optional 유지, inspect UI rollback |
| CP-5 schema drop | Phase 5 | 위 checkpoint 가 모두 닫힌 상태에서 migration dry-run 까지 성공했는가 | DB snapshot 식별자, migration dry-run 보고, smoke + inspect + menu/domain bootstrap 결과 | schema drop 중단, runtime/contract 단계로 되돌아감 |

---

## 6. 제거 전 검증 checklist

### 6.1 자동 검증

1. `pnpm run codex:preflight`
2. `pnpm verify:access-smoke`
3. `pnpm --filter server exec tsc --noEmit` (runtime code 변경 시)
4. `node .github/scripts/check-docs.js --all`

### 6.2 phase별 추가 검증

- **Phase 1 (menu/admin)**: runbook Step 3 의 PMS 항목 + `GET /api/roles/:roleCode/menus` + `RoleManagementPage` read/write smoke
- **Phase 2 (organization bridge)**: internal/external 사용자 생성·수정 + inspect `organizationIds` 비교
- **Phase 3 (`roleCode` minimization)**: login/session restore/PMS·CMS·DMS bootstrap/inspect/non-admin `403`
- **Phase 4 (contract cleanup)**: user admin CRUD + PMS operator walkthrough + runbook 문서 parity
- **Phase 5 (schema cleanup)**: migration dry-run, DB snapshot 확인, smoke + inspect + domain bootstrap 재검증

### 6.3 수동 검증

1. **PMS menu bootstrap**
   - admin 계정: general menu + admin menu 노출 유지
   - non-admin 계정: general menu 만 노출, admin menu 비노출
2. **organization bridge**
   - internal 사용자 생성/수정 후 primary internal org 유지
   - external 사용자 생성/수정 후 primary external org 유지
3. **운영 inspect**
   - `GET /api/access/ops/inspect`
   - `GET /api/access/ops/exceptions`
   - PMS `AccessInspectDialog`
4. **도메인 bootstrap**
   - PMS `/api/menus/my`, `/api/projects/:id/access`
   - CMS `/api/cms/access/me`
   - DMS `/api/dms/access/me`, `raw/serve-attachment`, `search/ask`, `storage/open`

---

## 7. 문서 package 완료 상태

- [x] runtime blocker 와 cleanup-only debt 가 문서 기준선에서 분리됨
- [x] phase 별 시작 조건, validation gate, acceptance criteria, rollback floor 가 고정됨
- [x] PMS/user/org/menu/auth payload 의 제거 순서가 schema-last 원칙으로 정리됨
- [x] DMS 가 cleanup blocker 가 아니라 regression gate 역할임이 문서에 반영됨
- [x] cleanup 전 검증 checklist 가 auth-system / readiness 문서와 연결됨

---

## 관련 문서

- [인증 시스템 아키텍처](./auth-system.md)
- [DMS 인증/권한 준비도](../../../dms/planning/auth-access-readiness.md)
- [Access Verification Runbook](../../guides/access-verification-runbook.md)

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-04-15 | Phase 3~5 closeout — `TokenPayload.roleCode` 제거 + DB-backed role resolution, `userTypeCode`/`isAdmin` operator contract 제거, `cm_user_m`/`cm_user_h` 의 `is_admin`·`user_type_code`·`permission_codes` schema tail 제거를 반영 |
| 2026-04-15 | Phase 2 organization bridge 를 explicit `primaryAffiliationType` 계약 + current primary relation 유지 + data-driven fallback 구조로 재정의하고 parity 검증 기준을 고정 |
| 2026-04-15 | live `:4000` + `viewer.han` smoke baseline 을 cutover 출발점으로 명시하고, Phase 0~5 의 시작 조건 / acceptance criteria / 필수 증빙 / rollback floor 를 실행 패키지 수준으로 고정 |
| 2026-04-15 | runtime blocker(`roleCode` runtime propagation, PMS `cm_role_menu_r`, `userTypeCode` organization bridge)와 cleanup-only debt(`isAdmin`, user/admin contract, `permission_codes`)를 분리하고, phase별 validation gate / rollback point / schema-last cutover 순서를 실행 가능 수준으로 구체화 |
| 2026-04-14 | `RolesGuard` 의 `@Roles('admin')` 를 `system.override` 기준으로 정렬하고 PMS operator inspect dialog + `pnpm verify:access-smoke` automation 을 추가해 후속 안정화 backlog 를 닫음 |
| 2026-04-14 | JWT `TokenPayload.isAdmin` 제거, `AccessFoundationService` admin shortcut 제거, PMS project filter / admin menu inclusion 을 `system.override` 기준으로 정렬하는 major cleanup slice 를 반영 |
| 2026-04-14 | CMS browser-facing access snapshot 의 redundant `isAdmin` 제거, `GET /api/users/profile` legacy field 축소, JWT `TokenPayload.userTypeCode` 제거를 safe cleanup slice 로 반영 |
| 2026-04-14 | shared auth/access rollout 이후 남아 있는 legacy compatibility path inventory 와 cleanup 순서를 문서화 |
