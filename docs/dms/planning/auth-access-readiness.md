# DMS 인증/권한 준비도

> 최종 업데이트: 2026-04-15

---

## 1. 요약

- SSOO는 이제 **공통 auth/session foundation + 도메인별 access snapshot/policy** 구조로 정렬되어 있습니다.
- DMS는 **pnpm workspace 앱 + same-origin Next route handler + apps/server DMS module** 구조로 재정렬되었고, 로그인/세션 복원/feature baseline gating까지는 완료된 상태입니다.
- 공통 auth/access validation baseline(`auth-system.md` 기준 matrix + repo-native 검증 루틴)도 고정되어, 이제 남은 핵심 리스크는 **DMS 내부 구현이 아니라 common auth/PMS/user/menu legacy cleanup cutover sequencing** 으로 이동했습니다.
- 현재 기준에서 DMS의 auth/access 핵심 과제는 **reference domain 수준까지 완료** 되었습니다. `file/content` read/write/metadata/rename/delete, search/ask, template reference/doc-assist tree hint, 새 문서 owner default ACL, 기본 DocumentPage affordance, attachment/reference/image upload inheritance, local `storage/open` policy, validation matrix 까지 pilot enforcement가 들어갔습니다.
- 2026-04-15 기준으로 `pnpm verify:access-dms` 가 admin 기준 temp probe document/image/attachment/local storage fixture 를 만들고 정리하면서 `files/file/content/raw/serve-attachment/search/ask/settings/git/storage/open` surface 를 fixture-driven 으로 반복 검증할 수 있습니다.
- 2026-04-13 기준으로 `/api/file/raw`, `/api/file/serve-attachment` 는 더 이상 anonymous bypass surface가 아니며, **shared session cookie -> access token 복원 -> server `canReadDocuments` 검사** 흐름으로 보강되었습니다.

## 2. 공통 경계 매트릭스

| 영역 | 현재 상태 | 근거 경로 | 다음 관심사 |
|------|-----------|-----------|-------------|
| 공통 auth/session | ✅ 기준선 완료 | `apps/server/src/modules/common/auth`, `packages/web-auth`, `packages/types/src/common/auth.ts` | legacy `cm_user_m` 필드 cleanup phase |
| 공통 permission foundation | ✅ runtime contract 정렬 완료 | `packages/database/prisma/schema.prisma`, `apps/server/src/modules/common/access/access-foundation.service.ts`, `packages/types/src/common/access.ts` | legacy role/org 필드 정리 |
| 공통 validation baseline | ✅ matrix + 검증 루틴 고정 | `docs/common/explanation/architecture/auth-system.md`, `node .github/scripts/check-patterns.js`, `pnpm run codex:dms-guard` | PMS/CMS 운영 시나리오 확장 |
| PMS access | ✅ navigation snapshot + project object policy 적용 | `apps/server/src/modules/pms/project/project-access.service.ts` | admin tooling / 예외 정책 운영화 |
| CMS access | ✅ feature policy + content visibility/object policy 적용 | `apps/server/src/modules/cms/access/access.service.ts` | moderation / board policy 확장 |
| DMS access | ✅ feature baseline + object ACL pilot 완료 | `apps/server/src/modules/dms/access/document-acl.service.ts`, `apps/server/src/modules/dms/file/*`, `apps/server/src/modules/dms/content/*`, `apps/server/src/modules/dms/search/*`, `apps/server/src/modules/dms/ask/*`, `apps/server/src/modules/dms/templates/*`, `apps/server/src/modules/dms/doc-assist/*`, `apps/server/src/modules/dms/storage/*`, `apps/web/dms/src/components/pages/markdown/*` | legacy cleanup 동안 regression gate 유지 |

## 3. DMS 현재 구현 상태

### 3.1 완료된 기준선

- **모노레포 통합**: DMS는 `pnpm-workspace`에 편입되었고 `@ssoo/types`, `@ssoo/web-auth`를 재사용합니다.
- **공통 로그인/세션 복원**: `/api/auth/[action]` 프록시, shared session cookie, `createAuthStore()` 기반 auth runtime이 PMS/CMS와 같은 표면으로 정렬되었습니다.
- **공통 permission/runtime contract**: DMS/CMS/PMS project access 가 server common `AccessFoundationService` + shared `policy` trace 기준으로 같은 상위 계약을 사용합니다.
- **도메인 access bootstrap**: `/api/access` -> `access.store` -> `(main)` layout 흐름으로 DMS shell 초기화 전에 access snapshot을 hydrate 합니다.
- **서버 feature gating**: `DmsFeatureGuard + RequireDmsFeature(...)` 가 `files/content/search/ask/create/doc-assist/chat-sessions/git/settings/storage/templates/ingest/file` surface를 보호합니다.
- **바이너리 전달 경계 보강**: `raw`, `serve-attachment` 는 same-origin 프록시가 shared session cookie로 access token을 복원하고, 서버는 `canReadDocuments`를 다시 검사합니다.
- **object ACL pilot**: `DocumentMetadata.acl` 이 `file/content` read/write/metadata/rename/delete, `GET /dms/file`, `/dms/files`, `raw`, `serve-attachment`, `/dms/search`, `/dms/ask`, template reference filtering, doc-assist visible tree hint, attachment/reference/image upload inheritance, local `storage/open` 에 연결되어 unreadable document/tree/result/context와 unauthorized mutation을 차단합니다. ACL이 비어 있는 기존 문서는 feature gate fallback을 유지합니다.
- **검증 baseline 고정**: login/session/access/binary/upload/search/ask/doc-assist/git/settings/storage 시나리오를 공통 matrix + repo-native 루틴(`pnpm verify:access-smoke`, `pnpm verify:access-dms`)으로 반복 검증할 수 있습니다.

### 3.2 아직 남아 있는 핵심 공백

- **남은 공백은 DMS 내부가 아니라 cross-domain cleanup sequencing**: DMS는 reference implementation 역할을 수행할 수준까지 올라왔고, 다음은 common auth/PMS/user/menu 영역의 legacy cleanup 을 release-safe 하게 진행하는 것이다.
- DMS의 역할은 신규 blocker 제거가 아니라, cleanup 동안 아래 regression surface 를 계속 통과시키는 것이다.
  - `/api/dms/access/me`
  - `raw`, `serve-attachment`
  - `search`, `ask`, `doc-assist`
  - `storage/open`

## 4. 다음 실행 순서

| Phase | 공통 cutover 목표 | DMS가 계속 확인할 것 | DMS pass 조건 |
|-------|-------------------|----------------------|---------------|
| Phase 0 | cleanup package freeze | readiness / auth-system / cleanup plan 의 phase 정의가 같은지 확인 | live `:4000` + `pnpm verify:access-smoke` + `pnpm verify:access-dms` green, DMS가 blocker 가 아니라 regression gate 로 명시됨 |
| Phase 1 | PMS menu/admin parity | `/api/dms/access/me`, `/api/dms/files`, `/api/dms/search` allow 와 `/api/dms/settings`, `/api/dms/git` deny 가 그대로 유지되는지 확인 | PMS menu 작업과 무관하게 `viewer.han` 기준 DMS allow/deny 조합이 unchanged |
| Phase 2 | organization bridge parity | internal/external 사용자 변경 이후에도 DMS access snapshot + file tree/search 결과가 entitlement 과 모순되지 않는지 확인 | org bridge 정리 중에도 DMS feature/object 결과가 inspect 와 같은 방향으로 유지 |
| Phase 3 | `roleCode` token/runtime parity | login → session restore → DMS bootstrap → `raw/serve-attachment` → `search/ask` → `storage/open` 순서를 `pnpm verify:access-dms` 로 반복 검증 | `viewer.han` 및 admin 기준 DMS bootstrap/binary/search/storage 결과가 baseline 과 동일 |
| Phase 4 | operator contract cleanup | DMS browser auth 는 계속 `userId`, `loginId` 만 사용하고, DMS route/API 가 legacy field 재의존을 만들지 않는지 확인 | DMS는 legacy user/profile field 없이도 same-origin proxy + access snapshot 계약을 유지 |
| Phase 5 | schema-last cleanup | schema drop 전후에 `/api/dms/access/me`, `raw/serve-attachment`, `search/ask`, `storage/open` 을 재검증 | `pnpm verify:access-smoke` + `pnpm verify:access-dms` 가 모두 green 이고 rollback 문서가 준비됨 |

정본 규칙:

1. historical blocker 였던 `roleCode` token propagation 과 organization bridge cleanup 은 닫혔고, PMS `cm_role_menu_r` fallback 만 intentional compatibility path 로 남아 있다.
2. DMS 는 blocker 제거 작업의 구현 주체가 아니라, cleanup slice 마다 regression 을 잡아내는 도메인 gate 다.
3. 상세 checkpoint 와 acceptance 기준은 `docs/common/explanation/architecture/access-cutover-cleanup-plan.md` 를 따른다.

## 5. 기본 가정

- browser auth payload는 `userId`, `loginId` 만 유지하고, role/org/admin 성격 정보는 access snapshot 또는 서버 JWT payload가 담당합니다.
- DMS는 계속 **same-origin proxy 우선** 구조를 유지합니다. 브라우저가 직접 `apps/server` 를 호출하는 구조로 되돌리지 않습니다.
- 다음 단계의 기본 우선순위는 **새 feature 추가보다 auth/access object policy 완결** 입니다.

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-04-15 | `pnpm verify:access-dms` fixture-driven DMS regression script 를 추가하고, temp probe document/image/attachment/local storage fixture 기반으로 `files/file/content/raw/serve-attachment/search/ask/settings/git/storage/open` surface 를 반복 검증하는 gate 를 readiness 에 반영 |
| 2026-04-15 | Phase 3~5 closeout 상태를 반영해 `roleCode` token/runtime cleanup, operator contract slimming, user schema tail cleanup 이후에도 DMS가 regression gate 로 동일하게 동작해야 함을 명시 |
| 2026-04-15 | Phase 0~5 cutover 순서를 DMS 관점의 regression gate 표로 재정리하고, `viewer.han` 기준 DMS allow/deny surface 를 각 phase의 pass 조건으로 고정 |
| 2026-04-15 | DMS 내부 구현 공백보다 common auth/PMS/user/menu legacy cleanup sequencing 이 다음 리스크라는 점과, DMS의 역할이 cleanup blocker 가 아니라 regression gate 라는 점을 readiness 에 반영 |
| 2026-04-14 | DMS object ACL pilot을 `file/content` write/read, search/ask, template/doc-assist source hint, creator owner default, 기본 UI affordance, upload inheritance, local `storage/open`, validation matrix까지 확장한 상태를 readiness에 반영 |
| 2026-04-14 | 공통 permission/runtime contract 정렬 및 auth/access validation baseline 고정 상태를 readiness에 반영 |
| 2026-04-13 | auth/access 현재 상태, 공통 경계, DMS readiness, 다음 우선순위를 정리한 readiness 문서를 추가 |
