# Changelog

## [Unreleased]

### Project Closure (DMS Phase A — 2026-04-30)

* **dms (operational):** GitLab `LSWIKI_DOC.git` document repository push policy confirmed and verified — canonical branch `master`, direct push allowed for current account; initial import commit `b963f14` already on `origin/master`. Closes Track 5 (Git file backup) at 100% and removes the long-standing operational blocker tracked in `document-repo-three-issue-status.md`.

* **server, web-dms, types (dms):** removed dead `versionHistory` feature — the `DocumentVersionEntry` type, `normalizeVersionHistory()` function, and `versionHistory` field on `DocumentMetadata`/`DocumentContentMetadata` had no write path, no UI consumer, and no git integration; only a normalize-on-read pass-through. Removed across server (`document-control-plane.service.ts`, `content.service.ts`, `document-hydration.service.ts`), shared types (`packages/types/src/dms/`), and web-dms type re-exports. Original intent (per-document git commit history surface) re-registered as `DMS-FE-versionHistory` backlog item for future implementation as on-demand `gitService.getFileHistory()` projection. Closes Track 2 (DB schema separation) and Track 7 (JSON metadata → DB) at 100%.

### Refactoring

* **server (dms):** `access-request.service.ts` decomposition complete — 2150-line god service decomposed into 5 cohesive units (`AccessRequestService` 1121, `ControlPlaneSyncService` 260, `DocumentRecordService` 311, `DocumentProjectionService` 126, `access-request.util.ts` 447). C-4 track via 5 slices. Record bootstrap and control plane sync split into separate Nest services after circular dependency between them was resolved by re-ordering slices.

* **server (dms):** `git.service.ts` decomposition — 1285 → ~1150 lines via pure-function util extraction (`git-paths.util.ts`, `git-sync.util.ts`, `git-inspect.util.ts`). C-3 track via 4 slices. `getRepositoryBindingStatus` kept as a 1-line proxy on `GitService` for caller stability.

* **server (dms):** `collaboration.service.ts` util extraction (paths / sanitizers / isolation / state-IO) and 110-test integration coverage. C-2 + D-2 tracks.

* **web-dms:** `DocumentPage` `useSyncReferencesToMetadata` hook extraction — initial slice of C-1 track (DocumentPage at ~1997 lines).

### Features

* **docs/dms:** DMS canonical permission/hybrid model 문서화 — 문서 visibility(`public / organization / self`), explicit grant/request, discovery-vs-readable surface, file/Git vs DB vs sidecar 경계, mixed `jsonb`+relation control-plane, `revisionSeq` optimistic concurrency, reconciliation 전략을 정본 문서로 고정

* **scripts, docs/common, docs/dms:** fixture-driven DMS regression automation — `pnpm verify:access-dms` 를 추가해 admin 기준 temp probe document/image/attachment/local storage fixture 를 생성/정리하면서 `files/file/content/raw/serve-attachment/search/ask/settings/git/storage/open` 과 DMS access snapshot / inspect parity 를 자동 검증

* **scripts, server, web-pms, docs/common:** admin regression automation + PMS role override formalization — `pnpm verify:access-admin` 를 추가해 PMS role-menu read/update/reset semantics, admin user CRUD legacy-field regression, internal/external primary affiliation switching, temp user inspect/organizationIds parity 를 자동 검증하고, PMS role-menu source naming 을 `legacy-override` 에서 `role-override` 로 정리

### Bug Fixes

* **web-dms, scripts:** DMS baseline recovery — `DocumentPage` 의 empty-interface lint error 를 제거해 `build:web-dms` 를 다시 green 으로 복구하고, `verify:access-dms` probe fixture 에 runtime persona read grant 를 부여하며 cleanup 순서를 asset-first 로 조정해 fixture-driven DMS verification 을 다시 통과시키도록 보정

* **web-auth:** browser login fetch binding fix — shared auth adapter가 native `fetch` 를 object method 형태로 호출하면서 브라우저에서 `Failed to execute 'fetch' on 'Window': Illegal invocation` 이 날 수 있던 경로를 global fetch binding 기준으로 정리해 PMS/CMS/DMS 공통 로그인 진입점이 다시 정상 동작하도록 보정

* **server, web-pms, types, database, docs/common, docs/dms:** Phase 3~5 cleanup closeout — JWT payload 에서 `roleCode` 를 제거하고 foundation role baseline 을 DB-backed resolution 으로 전환했으며, user admin / inspect 계약에서 `userTypeCode`·`isAdmin` 를 제거하고 `cm_user_m`/`cm_user_h` 의 `is_admin`·`user_type_code`·`permission_codes` schema tail 을 정리

* **server, web-pms, docs/common:** Phase 2 org bridge replacement baseline — 사용자 생성/수정 계약과 PMS 사용자 관리 화면에 `primaryAffiliationType`, `employeeNumber`, `companyName`, `customerId` 를 노출하고, `syncOrganizationFoundation()` 이 explicit primary 소속 선택 → current primary relation → data-driven fallback 순서로 organization relation primary 를 결정하도록 정렬

* **server, web-pms, docs/common:** Phase 1 menu baseline cutover — PMS `/api/menus/my` 일반 메뉴를 legacy seed 와 같은 역할 기준선(`admin/manager = full`, `user = read`, `viewer = dashboard read`) 위에 `cm_role_menu_r` legacy override fallback 과 `cm_user_menu_r` grant/revoke 를 덧씌우는 구조로 정렬하고, `GET /api/roles/:roleCode/menus` / `RoleManagementPage` 는 관리자 메뉴를 `system.override` 기준 read-only row 로 표시하도록 정리

* **server, docs/common:** access smoke runtime 확장 — `pnpm verify:access-smoke` 가 기본 demo runtime persona(`viewer.han`) 기준으로 PMS foreign project deny / CMS post deny / DMS git-settings deny 와 PMS·CMS·DMS allow path 를 함께 검증하도록 넓어지고, PMS project access 가 action permission 누수 없이 project capability 로만 `canViewProject` 를 계산하도록 보정

* **server, docs/common, types:** Wave 5 access alignment 정렬 — PMS project-scoped route 를 `ProjectFeatureGuard` + `RequireProjectFeature(...)` 패턴으로 올리고, PMS two-stage bootstrap(`/api/menus/my` + `/api/projects/:id/access`)와 navigation-centric `PmsAccessSnapshot` 경계를 문서화하며, PMS/CMS cross-domain validation target 을 auth/access 문서와 runbook에 추가

* **server, web-dms, docs/dms:** DMS object ACL pilot 완료 — `DocumentMetadata.acl` 을 file/content read-write-metadata, file tree/raw/serve-attachment, search/ask, template reference/doc-assist tree hint, upload inheritance, local storage/open 경계에 연결하고, 새 문서 owner default + DocumentPage 편집 affordance + validation matrix를 정렬해 unreadable source와 unauthorized mutation을 차단

* **docs/common, docs/pms, docs/cms:** PMS/CMS alignment audit 완료 — PMS project access 와 CMS feature/visibility policy 가 `AccessFoundationService` + shared `policy` trace 계약 위에 유지됨을 확인하고 cross-domain alignment 상태를 문서 기준선에 반영

* **server, docs/common:** admin-only access ops tooling 추가 — `GET /api/access/ops/inspect`, `GET /api/access/ops/exceptions` 를 추가해 foundation policy trace 와 permission exception 을 운영자가 직접 조회할 수 있게 하고, verification runbook + cleanup plan 문서를 함께 정리

* **server, types, docs/common, docs/cms, docs/pms:** legacy cleanup safe slice — CMS browser-facing access snapshot 의 redundant `isAdmin` 를 제거하고, `GET /api/users/profile` 이 `roleCode`/`userTypeCode`/`isAdmin` 를 다시 노출하지 않도록 축소하며, JWT `TokenPayload` 에서 `userTypeCode` 를 제거

* **server, docs/common:** legacy cleanup major slice — JWT `TokenPayload` 에서 `isAdmin` 을 제거하고, `AccessFoundationService` / PMS project list filter / PMS admin menu inclusion 이 `system.override` 기준으로만 관리자 우회를 계산하도록 정렬

* **server, web-pms, types, docs/common:** route-level admin gate + ops hardening 마감 — `RolesGuard` 의 `@Roles('admin')` 를 `system.override` 기준으로 전환하고, PMS 사용자 관리 화면에 access inspect dialog 를 추가하며, `pnpm verify:access-smoke` repo-native smoke script 로 admin success / profile contract / optional non-admin 403 검증 경로를 자동화

* **docs/common, docs/dms:** auth/access validation baseline 문서화 — 공통 matrix(anonymous/feature denied/object denied/allow)와 repo-native 검증 루틴을 정리하고, DMS readiness/backlog/roadmap를 object ACL 중심 상태로 재정렬

* **server, types:** 공통 permission resolution contract 정렬 — server common `AccessFoundationService` 로 role/org/user-exception/object grant 계산을 재사용하고, CMS/DMS/PMS project access snapshot 에 `policy` trace를 추가해 동일한 상위 계약으로 설명 가능하도록 정리

* **web-auth, web-pms, web-cms, web-dms:** 공용 session bootstrap helper 추가 — PMS/CMS Axios 401 복원과 DMS fetch retry가 같은 `restoreSharedAuthSession()` 경로를 사용하도록 통합하고, concurrent restore dedupe + transient failure 시 local auth 유지 정책으로 정렬

* **web-pms, web-cms:** 브라우저-facing auth surface를 DMS와 동일한 same-origin proxy 패턴으로 통일 — `src/app/api/auth/[action]/route.ts` + `_shared/serverApiProxy.ts` 신규 추가, `authApi` 어댑터를 same-origin `/api/auth/*` fetch 기반으로 교체, Axios 401 인터셉터의 session bootstrap도 `/api/auth/session` same-origin 경유로 변경

* **web-pms:** 프로젝트 상세 페이지 — 기본정보 + 상태 타임라인 + 단계별 탭(요청/제안/수행/전환) 조회·편집
* **server:** 프로젝트 단계별 상세 API — `PUT /api/projects/:id/{request,proposal,execution,transition}-detail` upsert 엔드포인트 4개, `findOne`에 전체 relation include, `statusCode` 필터 추가
* **types:** `ProjectRequestDetail`, `ProjectProposalDetail`, `ProjectExecutionDetail`, `ProjectTransitionDetail`, `ProjectStatus`, `ProjectDetail` 등 12개 공유 타입 추가
* **web-pms:** Proposal/Execution/Transition 목록 페이지 실데이터 전환 (Mock → `useProjectList` + `statusCode` 필터)
* **web-pms:** 목록 행 클릭 → 프로젝트 상세 탭 열기 (MDI keep-alive)
* **web-pms:** `useCurrentTab` 훅 — TabContext 기반 탭 파라미터 접근

* **web-dms:** 본문 링크 sidecar 싱크 — 마크다운 본문의 링크/이미지를 실시간 추출하여 sidecar 링크 섹션에 자동 반영
* **web-dms:** 이미지 삽입 다이얼로그 — URL 입력 + 로컬 파일 업로드 탭, 이미지 업로드는 문서 저장 시 지연 처리
* **web-dms:** 링크 삽입 다이얼로그 — URL 입력 + 내부 문서 파일트리 선택 (FilePickerTree 공통 컴포넌트)
* **web-dms:** 이미지 미리보기 모달 — sidecar 이미지 링크 클릭 시 모달 표시, 전체화면 lightbox (react-zoom-pan-pinch: 휠 줌/드래그 팬/더블클릭 리셋/컨트롤바)
* **web-dms:** 위키 내부 이미지 서빙 API (`/api/file/raw`)
* **web-dms:** Docker 배포 지원 — Dockerfile (multi-stage standalone), compose.yaml (pgvector + DMS 서비스)
* **web-dms:** 서버 시작 시 pgvector 확장 및 임베딩 테이블 자동 초기화 (instrumentation.ts)
* **web-dms:** 변경 하이라이팅 시스템 — 에디터 문자 수준 diff (fast-diff), DiffTextInput 공용 컴포넌트
* **web-dms:** 사이드카 소프트 삭제 + 되돌리기 (태그/URL/댓글)
* **web-dms:** AI 태그 추천 + 요약 생성 (WandButton)
* **web-dms:** Obsidian 스타일 새 문서 런처 페이지
* **web-dms:** AI 요약 원클릭 플로우
* **web-dms:** settings shell — `/settings` 탭 대신 전역 설정 모드, system/personal 설정 분리, 공용 JSON renderer/editor/diff 도입
* **web-dms:** settings surface 확장 — storage runtime 필드(`enabled`, `webBaseUrl`), upload/search/DocAssist 정책, viewer/sidebar 개인 기본값, M365 metadata-only 설정 추가

### Improvements

* **docs/common:** current workstream baseline 추가 — DMS/PMS/CMS 3개 축에 대해 어디까지 진행됐고 어디서 끊겼는지, 지금 멈춰야 할 작업과 이어가야 할 작업, 실제 실행 우선순위(DMS 최우선 / PMS 가능하면 병렬 / CMS 최하위), 병렬 진행 시 공통 영역 owner/escalation 규칙을 레포 기준선 문서로 고정

* **docs/common:** current tranche execution contract + inventory freeze 추가 — dirty tree 를 cross-app access/platform convergence 중심 workstream 으로 재분류하고, `Access/platform convergence stabilization` 을 현재 우선 tranche 로 고정했으며, Copilot-first Stage 1~8 라우팅과 첫 수정 대상(`repo instruction / meta-doc parity recovery`)을 레포 계약 문서에 명시

* **docs/common, docs/dms:** final cutover package 고정 — live `:4000` + `viewer.han` smoke baseline 을 rollback-safe cutover 출발점으로 명시하고, cleanup plan/auth-system/DMS readiness 에서 Phase 0~5 시작 조건·acceptance criteria·필수 증빙·DMS regression gate 를 같은 기준으로 정렬

* **docs/dms:** document repo 3-issue status 정리 — 문서 정본 정책 고정, 원격 push blocker, in-repo documents detach 검증 결과를 `document-repo-three-issue-status.md` 로 묶고 남은 핵심 이슈를 GitLab push 정책/권한 확인으로 축소

* **docs/dms:** document repo git sync pattern 추가 — 외부 문서 working tree를 직접 수정하는 현재 구조에서 CRUD와 Git commit/push를 분리하고, publish 단계/fast-forward 규칙/사전 테스트 시나리오를 `document-repo-git-sync-pattern.md` 로 고정

* **docs/dms:** concurrency-safe auto publish pattern 추가 — 동시 편집 `revisionSeq` 충돌, publish queue 직렬화, dirty tree 자동 해소, 앱 사용자별 Git author / commit footer attribution 원칙을 `document-repo-concurrency-autopublish-pattern.md` 로 고정

* **server, web-dms, docs/dms:** presence-first 저장 체계 1차 구현 — `/dms/collaboration` snapshot API, file/content mutation 후 auto publish enqueue, per-user Git commit footer, `DocumentPage` 상단 presence/publish 상태 banner, 후속 slice 계획 문서를 추가

* **server, web-dms, docs/dms:** presence-first 저장 체계 2차 구현 — publish 상태와 soft lock 을 파일로 영속화하고(`/apps/web/dms/.dms-collaboration-state.json` at runtime app root), `/dms/collaboration/takeover` 및 문서 화면 soft lock owner/takeover UX를 추가

* **server, web-dms, docs/dms:** presence-first 저장 체계 3차 구현 — publish 상태에 change-set과 git sync detail을 추가하고, `/dms/collaboration/refresh`·`/dms/collaboration/retry-publish` 및 문서 화면 recovery(refresh/retry) UX를 추가

* **server, web-dms, docs/dms:** collaboration marker sidecar cutover — collaboration/publish 표식을 `DocumentPage` 본문 상단에서 `DocumentSidecar` 패널로 이동하고, asset 업로드도 문서 기준 change-set publish enqueue에 포함되도록 확장

* **docs/dms:** save/collaboration wrap-up 추가 — 오늘 세션의 외부 문서 정본 연결, auto publish, presence, soft lock, recovery, attribution, sidecar marker 이동 결과를 `2026-04-17-save-collaboration-wrapup.md` 로 마감 정리

* **docs/common, docs/dms:** legacy cleanup execution package 정리 — cleanup plan을 runtime blocker vs cleanup-only debt 기준으로 재분류하고, phase별 validation gate / rollback point / schema-last cutover 순서를 고정했으며, auth-system/DMS readiness 문서에 같은 실행 기준을 연결

* **docker:** full-stack compose 정렬 — root `compose.yaml`을 `postgres + server + pms + cms + dms` 기준으로 확장하고, PMS/CMS Dockerfile/standalone 설정, shared `dms-data` volume, compose 전용 DB URL override(`DOCKER_DATABASE_URL`)를 정리
* **web-dms:** runtime/config normalization — root `compose.yaml` 단일 지원 경로, workspace Dockerfile, `DMS_SERVER_API_URL` 브리지/JSON config 문서 정렬과 `DOCKER_DMS_DATABASE_URL` 분리
* **web-dms:** GitLab workspace publish flow — full-workspace `development` branch, `codex:workspace-sync-from-gitlab` / `codex:workspace-publish` 추가, 기존 `codex:dms-*` 는 호환 래퍼로 유지
* **web-dms:** sidecar 링크 섹션 아이콘 — Globe(외부)/FileText(내부 문서)/Image(이미지) 타입별 구분
* **web-dms:** 링크 본문 찾기 — sidecar에서 ↳ 버튼 클릭 시 뷰어/에디터 내 해당 링크로 스크롤 + 하이라이팅
* **web-dms:** 내부 문서 링크 클릭 시 새 탭으로 열기, 외부 링크는 브라우저로 열기
* **web-dms:** 이미지/링크/문서경로 설정 모달 크기 통일 (max-w-lg h-[480px])
* **web-dms:** bare path 링크 해석 개선 — `goals.md` 같은 상대 경로를 현재 파일 디렉토리 기준으로 해석
* **web-dms:** settings shell 헤더 정리 — 사이드바 브랜드 슬롯을 `뒤로가기 + 설정`으로 재구성하고, 상단 헤더 검색을 전역 설정 검색으로 전환하며 scope 뱃지를 제거
* **web-dms:** settings shell 단순화 — sidebar 브랜드 보조 문구 제거, 설정 검색을 sidebar 검색 슬롯으로 이동, UserMenu 설정 진입점을 단일 항목으로 정리
* **web-dms:** settings shell 3뎁스 네비게이션 — outer sidebar를 `시스템 설정`/`개인 설정` scope selector로 축소하고, `SettingsPage` 내부에 좌측 section menu + 우측 detail surface를 도입
* **web-dms:** settings navigation visual consistency — outer scope selector와 inner section menu를 기존 sidebar row/list 패턴으로 통일하고, navigation 내부 설명 문구를 제거
* **web-dms:** settings typography token alignment — settings UI를 재점검해 semantic typography token 구성을 유지하고, JSON raw editor를 `font-mono + text-code-block` 기준으로 정리
* **web-dms:** settings navigation row typography alignment — outer/inner settings rows를 실제 FileTree row 리듬(`font-sans`, `gap-1`, `px-2`) 기준으로 다시 맞춰 문서 목록과의 체감 차이를 축소
* **web-dms:** settings navigation section rhythm alignment — 2열 settings 구조는 유지하되, outer/inner navigation 모두 기존 sidebar의 `Section 헤더 + 목록` 위계를 더 직접적으로 재현하도록 조정
* **web-dms:** settings navigation sidebar parity refinement — flat settings rows를 `OpenTabs`/`Bookmarks`와 같은 `gap-2`, `px-3` rhythm으로 재정렬하고, inner navigation을 detail card와 시각적으로 분리해 page 내부 sidebar처럼 읽히도록 보정
* **web-dms:** settings navigation section reuse — outer/inner navigation header에서 실제 sidebar `Section` 컴포넌트를 재사용해 header 구조 drift를 제거
* **web-dms:** settings navigation flat list reuse — settings 메뉴에서는 `Section`/collapse를 제거하고, `OpenTabs`/`Bookmarks`와 동일한 `FlatList`/`FlatListItem` row primitive를 공유하도록 정리
* **web-dms:** settings navigation exact flat row render — `FlatListItem` 에서 실제 clickable element와 label span에 typography token을 직접 적용하고, `cn()`/`tailwind-merge` 가 custom `text-*` size token을 color class와 함께 제거하던 경로를 피해 settings/OpenTabs/Bookmarks가 동일 14px row render를 유지하도록 정리
* **web-dms:** settings flat row font inheritance fix — `FlatListItem` row container가 semantic typography token을 직접 들고, settings/OpenTabs/Bookmarks가 동일한 typography inheritance 경로를 공유하도록 보정
* **web-dms:** settings direct row button path — trailing action이 없는 outer/inner settings row를 direct button 경로로 렌더링해 두 rail의 DOM/class 경로를 다시 맞춤

### Improvements

* **web-dms:** 사이드카 폰트 정규화 (text-[10px]/text-[11px] 제거, 타이틀/콘텐츠 위계 정리)
* **web-dms:** 사이드바 폰트 정규화 (Changes/푸터 비표준 크기 제거)
* **web-dms:** 사이드카 문서정보 필드명 개선, 에디터 모드 통계 숨김
* **web-dms:** 요약 textarea 리사이즈 지원

### Bug Fixes

* **web-dms:** DiffTextInput 스크롤 동기화
* **web-dms:** 소프트 삭제 되돌리기 시 아이템 재추가
* **web-dms:** CollapsibleSection 중첩 button 하이드레이션 에러 수정

### Bug Fixes (prior)

* **database:** DBML 문서 출력 경로 수정 - 워크스페이스 외부가 아닌 `docs/` 하위로 정상 출력 ([export-dbml.js](packages/database/scripts/export-dbml.js), [render-dbml.js](packages/database/scripts/render-dbml.js))
* **database:** Prisma extension 공통 컬럼 준비 함수의 `any` 제거로 패턴 경고 해소 ([common-columns.extension.ts](packages/database/src/extensions/common-columns.extension.ts))

---

## 0.0.1 (2026-01-25)


### Bug Fixes

* 사이드바 스크롤 영역을 검색란 아래로 한정 ([ebd82f5](https://github.com/hwista/sooo/commit/ebd82f5ab7be9f5563ca6638721a9d8fe23a0ab9))
* 접힌 사이드바에서 관리자 메뉴 표시 ([6d0a8b9](https://github.com/hwista/sooo/commit/6d0a8b931250e3a0bb14a75af562cbcec87908d9))
* 즐겨찾기 API 404 에러 수정 ([405d713](https://github.com/hwista/sooo/commit/405d713e7a1deda1b2fc35b756b8f023c25960c6))
* 현재 열린 페이지에서 홈 탭 제외 ([bba91bc](https://github.com/hwista/sooo/commit/bba91bc04376df1d027b6aa3354f01e38bff7da8))
* add ls-red-hover for destructive button hover state ([961aba8](https://github.com/hwista/sooo/commit/961aba8049cb80a14c00b1591abafc50f8e2a0bb))
* apply ls-red-hover class to destructive button ([c1a97b1](https://github.com/hwista/sooo/commit/c1a97b189c9c9a1eedaaf937e0767ac7dcf1504d)), closes [#d90027](https://github.com/hwista/sooo/issues/d90027)
* **docs:** 백로그 중복 제거 - docs/BACKLOG.md로 통합 ([6dc1766](https://github.com/hwista/sooo/commit/6dc17667ab092db0acdc65d90ff92b92fcb95bcb))
* **menu:** add pms schema prefix to raw SQL queries ([d96b73d](https://github.com/hwista/sooo/commit/d96b73d8785c1f677cb4f698ad87474621ef28ff))
* **ui:** center loading state vertically on page ([56191f8](https://github.com/hwista/sooo/commit/56191f82efd334ba2dc9ec08e50bbebafe795715))
* **ui:** center page loading spinner in ContentArea ([a5b5694](https://github.com/hwista/sooo/commit/a5b5694eb3ffaab07ee97925f4cf27fa809b74fb))


### Code Refactoring

* **types:** sync type definitions with Prisma schema ([0ca75ec](https://github.com/hwista/sooo/commit/0ca75ecd2293901a9e3ff5c1d7432779322e7037))


### Features

* 사이드바 하단에 카피라이트 영역 추가 ([188c1f7](https://github.com/hwista/sooo/commit/188c1f7befffa40fe69d5530b592d3eb8dffb29f))
* 즐겨찾기 DB 연동 구현 ([8047c9c](https://github.com/hwista/sooo/commit/8047c9c9cef4783c8c863752b6736738aa9d5916))
* 초기 프로젝트 구성 완료 ([15f26f8](https://github.com/hwista/sooo/commit/15f26f83a001d80bbe82affe6827b9c42524e33f))
* 커스텀 스크롤바 디자인 시스템 추가 ([d43cb90](https://github.com/hwista/sooo/commit/d43cb90ba74026821749d405900dfcb259bdec81))
* add Home tab with dashboard placeholder and improve tab styling ([0b7b3bf](https://github.com/hwista/sooo/commit/0b7b3bf1164167eaa5229b6f783a0807eb7f8087)), closes [#9FC1E7](https://github.com/hwista/sooo/issues/9FC1E7) [#003876](https://github.com/hwista/sooo/issues/003876) [#7D8282](https://github.com/hwista/sooo/issues/7D8282)
* add quality gate and security improvements (IMMEDIATE tasks) ([3d811f3](https://github.com/hwista/sooo/commit/3d811f3b76fdd50664bc3a693738f7630c58e431))
* **docs:** add conventional-changelog for hybrid changelog management ([55d4085](https://github.com/hwista/sooo/commit/55d40858f482b9a55756529c6cd15fac3cf3142e))
* **docs:** add Redoc HTML generation for OpenAPI specs ([50e84d0](https://github.com/hwista/sooo/commit/50e84d0d7945e6ae4139ba767f6c47f79fb36d83))
* implement role-based access control (P1-FEATURE) ([a4fe62b](https://github.com/hwista/sooo/commit/a4fe62b1c7c2d046cc7029b3cdb09276cacdd5e7))
* **server:** add JwtAuthGuard to ProjectController ([79b3e6b](https://github.com/hwista/sooo/commit/79b3e6b30ee28b875a80b30dc31ffa6493dd706c))
* **server:** add rate limiting and strengthen password policy ([ca76541](https://github.com/hwista/sooo/commit/ca7654194ee6961e82ffe6fce0e50fe6e427bd36))


### BREAKING CHANGES

* **types:** Type literal values changed to match database schema


## 2026-03-24 - docs: finalize copilot instructions

- Updated .github/copilot-instructions.md and docs; ran verification scripts.
