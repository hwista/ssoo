# Changelog

## [Unreleased]

### Features

* **web-shell, web-admin, web-crm, web-pms, web-dms, web-sns, scripts, docs:** 내부 페이지 route registry를 `contentPage` 단일 계약으로 잠갔다. PMS/CRM/SNS/Admin 로컬 페이지와 DMS 홈/stale handoff는 승인된 adapter boundary를 통과하는 `contentPage`로 승격했고, `legacyException` route kind/type export와 verifier 허용 경로를 제거했다.

* **web-shell, web-admin, web-crm, web-pms, web-dms, web-sns, scripts, docs:** content-area 내부 페이지 타입 게이트 기반을 추가했다. 앱 ContentArea는 `SsooRegisteredMdiContentArea`와 `defineSsooMdiPageRegistry`만 소비하고, 탭 route는 `contentPage`/`legacyException`으로 분류한다. 저수준 `SsooMdiTabbedContentArea`는 root public API에서 내리고, `verify:ssoo-frame`이 5개 앱 registry 소비와 DMS route 분류를 검증한다.

* **web-shell, web-dms, scripts, docs:** `contentPage.render`를 branded `SsooMdiContentPageElement` 반환 계약으로 강화했다. 직접 recipe는 `createSsooContentPageTemplateElement()`, 승인된 domain adapter는 `SSOO_CONTENT_PAGE_ADAPTER_NAMES`의 `adapterName`과 `createSsooContentPageAdapterElement()`를 사용하며, DMS 문서/설정/AI page는 `DMS PageTemplate` adapter boundary를 통과한다.

### Bug Fixes

* **server, types, web-auth, web-shell, web-admin, web-crm, web-pms, web-dms, web-sns, docs:** DMS AI 검색 잔여 화면을 전역 통합 검색으로 흡수했다. DMS `/ai/search` 내부 탭과 호환 alias는 제거하고 DMS 검색 진입점은 `/ssoo/search` 전체 앱 검색 하나로 고정했으며, 기본 검색 요청은 `sourceApp` 없이 모든 provider를 대상으로 실행된다. source filter chip을 선택한 경우에만 `sourceApp` query와 요청 filter가 적용되고, CRM provider는 `OpportunityService`를 재사용해 영업기회 결과를 전역 검색에 등록한다. 기존 DMS AI 검색의 sidecar, 검색 기록, 인기 검색어, 내 자주 검색, AI 첨부 동작은 공용 `SsooAiSearchPage`/`SsooGlobalSearchPage` 경로에서 유지하고, DMS 문서 결과는 공용 검색 계약이 `excerpt`/`summarySource`/`totalSnippetCount`/`readRequest`를 보존해 기존 DMS 결과 카드 표현을 유지한다.

* **server, types, web-auth, web-shell, web-admin, web-crm, web-pms, web-dms, web-sns, scripts, docs:** header 통합 검색을 중앙화했다. 5개 앱 header는 `useSsooGlobalHeaderSearch`를 통해 검색 상태/Enter 처리/`/ssoo/search?q=` path/title/icon 생성을 공유하고, 앱은 검색 가능 여부와 통합 검색 탭을 여는 navigation adapter만 주입한다. 전역 검색 페이지는 API base URL과 cross-app URL map을 `@ssoo/web-auth` 기본 resolver에 맡기며, 서버 공용 검색 응답은 `keyword`/`metadata`/`semantic`/`vector`/`ragContext` capability를 분리하고 `ragReady`를 실제 RAG context 제공 여부에만 연결한다.

* **server, web-shell, web-auth, web-admin, web-crm, web-pms, web-dms, web-sns, scripts, docs:** 공용 user profile/settings 표면의 잔여 렌더링 drift를 차단했다. 5앱 canonical `/__user/profile/:userId`와 `/__user/settings` route-entry를 shared route-policy rewrite로 루트 셸에 연결해 RSC prefetch/direct entry 404를 막고, SNS local `ProfilePage`/`SettingsPage`를 제거해 legacy `/profile/*`/`/settings`는 canonical `__user` route handoff로만 남겼으며, 피드 내부 프로필/설정 링크는 `@ssoo/web-auth` helper로 통일했다. shared user surface 내부의 중복 page-level `내 설정` 제목과 별도 `max-w-*`/`mx-auto` 폭 재정의를 제거하고, SNS profile GET은 side-effect free로 유지하되 mutation 이후에만 `user.profile.updated` domain event를 발행하도록 보정했다.

* **server, web-auth, web-dms, web-sns, scripts, docs:** 통합 검색 공용화 잔여물을 정리했다. 서버 `/api/search`는 앱별 provider registry만 조합하고 DMS `SearchService`/CRM opportunity/PMS customer/SNS profile 데이터를 common service에서 직접 조회하지 않으며, Admin 결과는 `system.override` access foundation 권한으로 제한한다. 5개 앱 전역 검색 페이지는 `useCommonGlobalSearchAdapter`를 소비하도록 정렬했고, DMS의 폐기된 `ai-search.store.ts` export와 user-scope guard 항목을 제거했으며 `verify:ssoo-frame`이 이 회귀를 차단한다.

* **web-shell, web-auth, scripts, docs:** 공용 사용자 profile/settings surface가 `contentPage` route로 전환됐지만 shared-surface helper와 내부 root에서 `fluid`/`transparent`/`max-w-*` 폭 override를 걸어 표준 page 폭과 tone surface를 우회하던 문제를 수정했다. 이제 helper는 `SsooContentPageTemplate`의 기본 constrained main 폭을 유지하면서 `contentSurface="plain"`으로 page tone이 보이게 하고, `verify:ssoo-frame`이 해당 override 재유입을 차단한다.

* **web-shell, web-sns, scripts, docs:** `shellPage` route kind와 `ShellPageContainer` public export를 제거하고, main-only/canvas 화면은 `SsooContentPageTemplate`의 `pageVariant="main-only"`/`pageVariant="canvas"` recipe로 표현하도록 정리했다. SNS legacy local page wrapper는 `SsooContentAreaSurface`로 내려 두고 전환 대상으로 유지한다.

* **web-shell, web-auth, web-admin, web-crm, web-pms, web-dms, web-sns, scripts, docs:** 공용 사용자 profile/settings surface를 과거 예외 route에서 `contentPage` route로 전환했다. 5개 앱은 `createSsooSharedSurfaceContentPageElement()`를 통해 동일한 page chrome/template을 소비하고, SNS `/profile/*`/`/settings` legacy 탭은 canonical `__user` route로 인계한다.

* **web-dms, scripts, docs:** 설정 모드의 앱 상단 header slot과 `SsooAppHeader` shell은 유지하되 내부 content를 비워 검색 입력, 사용자 메뉴, 설정 제목/보조문구를 제거하고 settings sidebar brand 영역은 뒤로가기 버튼과 `설정` 단일 title만 표시하도록 정리했다.

* **server, web-auth, scripts, docs:** 공용 사용자 표면을 여러 앱/탭에서 동시에 열 때 프로필/피드 refresh와 알림 SSE 구독이 서버 전역 throttle을 빠르게 소모해 `Too Many Requests`가 표시되던 문제를 보정했다. 서버 전역 throttle 기준을 확장하고 알림 SSE는 throttle quota에서 제외했으며, `@ssoo/web-auth` 사용자 표면은 GET dedupe와 refresh debounce/in-flight queue로 같은 프로필/피드 조회 폭주를 묶는다.

* **web-shell, web-admin, web-sns, web-dms, scripts, docs:** SSOO frame 4슬롯 표현 계층의 잔여 escape hatch를 정리했다. legacy `ShellFrame` root export와 app frame/sidebar 폭 override, MDI tabbar height/class override를 제거하고, SNS content Suspense fallback과 Admin header user-menu loading state를 공용 `web-shell` 표면으로 이동했으며, DMS global CSS의 legacy shell/tree selector와 stale frame 치수 문서를 정리했다.

* **web-shell, docs:** 공용 알림센터 typography가 DMS 전용 Tailwind text token과 과한 font weight에 의존하던 drift를 정리했다. 패널은 전역 `--font-sans`를 계속 상속하되 카드/칩/버튼/empty state의 weight를 낮추고, 공유 semantic text utility는 `ssoo-global.css`에서 5개 앱 공용으로 보장한다.

* **web-auth, web-shell, web-admin, web-crm, web-pms, web-dms, web-sns, docs:** header 알림센터 상단에 공용 `전체`/앱별 filter chip과 unread badge를 추가했다. 기본 view와 header badge는 사용자 전체 알림을 유지하고, 각 앱은 현재 앱 chip 우선순위만 힌트로 제공하며, 선택된 chip은 목록/모두 읽음 범위만 바꾼다.

* **web-auth, web-shell, web-admin, web-crm, web-pms, web-dms, web-sns, server, scripts, docs:** header 알림센터를 앱별 source inbox가 아니라 사용자 전체 알림 surface로 정렬했다. 5개 앱 모두 `useCommonNotificationCenter`를 source filter 없이 소비하고 같은 `SsooHeaderNotificationCenter` 패널 문구/dim/read-state 표면을 사용하며, source app/path resolver로 알림 대상 앱으로 전환한다. DMS 도메인 부작용은 SSE 콜백으로만 유지하고, SNS legacy bridge는 가능한 reference path를 공통 알림 payload에 싣도록 보강했다.

* **web-shell:** 공용 MDI 탭 item의 drag 영역과 click 영역이 갈라져 일부 padding/status/icon 주변 클릭이 탭 전환으로 처리되지 않던 문제를 수정했다. 탭 item 전체 hit-area가 클릭 시 활성화되고, 실제 drag 시에만 reorder되도록 정렬했으며 cursor도 공용 tab item에서 pointer 기준으로 통일했다.

* **web-auth:** 공용 알림 SSE 프록시와 EventSource 재연결을 안정화했다. 백엔드 스트림 fetch/pipe 오류는 500 응답 대신 짧은 SSE retry frame으로 닫고, 브라우저 EventSource는 오류 시 즉시 반복 재시도하지 않도록 공용 연결 단위 백오프로 재연결한다.

* **web-auth:** 공용 알림센터가 앱별 인라인 `onError`/`onNotification` 콜백 identity 변화에 반응해 `refresh` effect와 EventSource 구독을 매 렌더마다 재실행하던 루프를 차단했다. 최신 콜백은 ref로 보관하고 네트워크/SSE 연결은 `sourceApp`/path/enabled 변경에만 갱신되도록 고정했다.

* **web-auth:** 공용 알림 API의 기본 `fetch` 호출을 `globalThis` 기준으로 바인딩하고 동일 오류 토스트를 중복 억제해, 브라우저에서 `Failed to execute 'fetch' on 'Window': Illegal invocation` 알림이 반복 표시되는 문제를 차단했다.

* **web-shell, web-auth, web-admin, web-crm, web-pms, web-sns, web-dms, scripts, docs/common:** 5개 앱 메인 header의 검색/생성 CTA/알림 slot/사용자 메뉴 dropdown 폭을 같은 `SsooAppHeader` 표면 계약으로 고정했다. Admin도 알림센터 적용 대상에 포함해 same-origin `/api/notifications/*` proxy와 공용 notification hook/panel surface를 연결했고, CRM primary CTA는 목록 새로고침이 아니라 새 기회 생성 진입점으로 정렬했다.

* **server, web-auth:** 공용 알림 source에 CRM을 포함하고, 알림 SSE 전역 구독이 source-app 도메인 이벤트도 받을 수 있게 보강했다. 알림 ID는 BigInt 변환 전 검증해 잘못된 ID 요청이 500으로 번지지 않도록 했다.

* **web-auth, web-crm, web-pms, web-sns, web-dms:** 알림 상태 변경 프록시에 공용 CSRF/Origin/Referer 검증을 적용하고, CRM/PMS/SNS에도 동일한 same-origin `/api/notifications/*` 프록시 route factory를 연결했다. DMS 기존 명시 route는 같은 공용 프록시 helper 보강을 통해 보호된다.

* **server, web-dms:** `storage/open?download=1` 다운로드를 same-origin session-backed binary proxy와 서버 직접 binary response로 고정했다. 배포 환경에서 인증 복원 없이 받은 JSON/redirect 응답이 파일로 저장되는 흐름을 막고, `Content-Disposition` 에 ASCII fallback `filename` + UTF-8 `filename*` 를 함께 내려 한글 파일명 호환성을 보강했다.

* **web-dms:** settings mode가 active tab과 분리된 상태로 남아 문서 생성, 파일 열기, AI 검색 같은 non-settings 탭 활성화 뒤 다시 설정 화면으로 전환될 수 있던 상태 drift를 차단했다. `useSettingsPageNavigationStore`가 `useTabStore`의 active tab path를 구독해 `/settings/{scope}/{sectionId}`에서는 settings mode를 켜고, 그 외 탭에서는 즉시 settings mode를 해제한다.

* **web-shell, web-dms:** keep-alive MDI 비활성 pane이 소비 앱의 `flex` display class와 충돌해 document pane과 settings pane이 동시에 보이던 문제를 공용 `SsooMdiContentPane`에서 차단했다. 비활성 pane 숨김을 Tailwind `hidden` class가 아니라 inline `display: none` guard로 보장하고, 런타임 확인용 `data-ssoo-mdi-active` 표식을 추가했다.

* **web-shell, web-crm, web-admin, web-dms, web-pms, web-sns:** main frame content area의 앱별 pane format override를 제거했다. `SsooMdiTabbedContentArea`가 pane class/scroll/tone을 받지 않도록 고정하고, CRM/Admin/DMS/PMS/SNS는 탭 데이터와 page render adapter만 주입한다. PMS/DMS tabbar height 재주입과 SNS route tabbar stale 문서/상수도 정리했다.

* **web-dms:** 로그인 후 DMS 본체 hydrate 단계에서 React 최대 업데이트 깊이 오류로 `Application error` 화면이 표시되던 문제를 수정했다. `AppLayout`의 tab store selector를 원시값 selector로 분리해 Zustand snapshot 갱신 루프를 차단하고, Docker 반영 후 Playwright 로그인 재현으로 홈 화면 렌더링을 확인했다.

* **web-auth, web-dms, web-sns, types, scripts, docs:** 로그인 통합 잔여 gap을 닫았다. DMS binary/SSE session-backed proxy helper를 `@ssoo/web-auth` 공용 helper로 승격하고, SNS auth display 필드는 `AuthIdentityProfileProjection`으로 타입화했으며, DMS auth 초기화 문서를 실제 fragment layout + `SharedAuthLoginPage` 소유 구조로 갱신했다.

* **web-dms, scripts, docs:** DMS settings mode에서 shell variant와 active content tab이 불일치해 문서 `DocumentPanel`이 설정 화면에 남는 혼합 상태를 차단했다. `AppLayout`은 settings mode와 현재 settings tab을 첫 페인트 전에 동기화하고, `ContentArea`는 settings mode에서 문서 pane을 active로 렌더링하지 않는다.

* **web-auth, web-admin, web-crm, web-pms, web-dms, web-sns, server, scripts, docs:** 인증 user-scope lifecycle을 공용화했다. `@ssoo/web-auth`가 auth storage sync, user-scope transition registry, query cache reset hook을 소유하고 5앱 provider가 동일하게 소비하도록 정렬했으며, DMS login/logout reset 예외와 서버 direct `/api/auth/refresh` 엔드포인트를 제거했다.

* **web-auth, web-admin, web-crm, web-pms, web-dms, web-sns, scripts, docs:** 로그인 통합 gap zero hardening을 적용했다. Admin login adapter 를 `APP_HOME_PATH` 상수 기준으로 정렬하고, 5앱 password reset 요청을 동일 same-origin proxy 로 이동했으며, browser-facing auth proxy allowlist 에서 body 기반 `refresh` 를 제거하고 auth lifecycle verifier 에 CSRF/Origin 하드닝 헤더를 반영했다.

* **web-crm, scripts, docs:** CRM auth route 의 중복 `X-SSOO-App` stamping wrapper 를 제거해 5앱 `/api/auth/[action]` route 를 동일 thin adapter 로 정렬했다. `verify:auth-commonization` 은 auth route 의 앱별 header mutation 재유입을 차단하고, 문서는 DMS/PMS/SNS user-scoped cleanup/profile projection 만 의도적 앱별 예외로 명시한다.

* **web-auth, web-shell, web-admin, web-pms, web-sns, web-dms, server, docs:** 로그인 통합 잔여 drift/security hardening을 적용했다. Admin/PMS/SNS Axios 인증 인터셉터를 `createSharedAxiosApiClient` 로 공용화하고 browser-facing refreshToken 타입/스토어 표면을 제거했으며, 5앱 Next 보안 헤더, DMS Markdown DOMPurify sanitizer/URL protocol allowlist/Mermaid strict mode, 서버 auth 민감 로그 제거를 추가했다.

* **server, web-auth, web-admin, docs:** 로그인 통합 hardening을 적용했다. access token localStorage persistence를 제거해 runtime memory + HttpOnly shared session cookie 복원 기준으로 전환하고, refresh token JSON 응답 노출을 중단했으며, Microsoft OAuth state HMAC 서명/issuer claim 검증/JWKS cache/timeout, 비밀번호 reset challenge 일괄 폐기, pending outbox supersede/consume, 가입 승인 role 검증, Helmet/production config hardening gate를 추가했다.

* **server, database, web-auth, web-admin:** Admin `/auth` 인증 정책 control plane 을 추가하고 Microsoft 365 OAuth 가입 신청/승인 및 외부 ID 로그인, 5앱 공용 `/password-reset` 이메일 코드 재설정 흐름을 구현했다. Auth 설정/가입 신청/외부 ID/재설정 코드/메일 outbox 테이블과 히스토리 트리거를 추가하고, 로그인 surface 는 `/api/auth/public-config` 를 우선 사용한다.

* **web-auth, scripts, docs:** 로그인 확장 action 기본 provider를 사내 SSO + Microsoft 365 기준으로 축소. `NEXT_PUBLIC_AUTH_SSO_URL` / `NEXT_PUBLIC_AUTH_OAUTH_MICROSOFT_URL` 이 설정될 때만 추가 로그인 버튼을 노출하고, generic OAuth/Google은 명시 props 없이 기본 surface에 나타나지 않도록 정리했다. 가입은 `NEXT_PUBLIC_AUTH_SIGNUP_REQUEST_URL` 을 우선하고, 셀프 가입/SSO backend/비밀번호 재설정 채널은 후속 결정 항목으로 문서화했다.

* **web-auth, scripts, docs:** 임시 플랫폼 표기를 `SSOT` 로 유지하는 기준에 맞춰 로그인 surface 카피를 정리. 로고는 `SSOT`, 제목은 `로그인`, 푸터는 `© 2026 SSOT` 만 남기고 보조 설명 문구를 제거했으며, 비밀번호 찾기/가입 요청/사내 SSO/Microsoft 365 action 은 URL/provider 가 설정될 때만 노출되는 공용 확장 슬롯으로 정리했다. `verify:auth-commonization` gate가 descriptive tagline/app-specific copy 재유입을 차단한다.

* **web-auth, web-admin, web-crm, web-pms, web-dms, web-sns, scripts:** 5앱 로그인 UI surface drift를 차단. `SharedAuthLoginPage` 가 공용 `AuthPageShell` 을 직접 소유하도록 바꾸고, 앱별 auth layout/theme 래핑과 app-specific login copy를 제거했으며, CRM Tailwind content 누락과 Admin auth layout 부재를 보정. `verify:auth-commonization` gate가 login shell ownership, Tailwind web-auth scan, app-specific login copy 재유입을 검증한다.

* **server, web-auth, web-admin, web-pms, web-sns, types, scripts:** 로그인/권한 공용화 잔여 드리프트를 차단. browser `AuthIdentity` 와 JWT `TokenPayload` 에서 `roleCode` 를 제거하고, `@Roles('admin')`/Admin shell/DMS settings system gate 를 `system.override`/domain access snapshot 기준으로 정렬했으며, `@ssoo/web-auth` auth clear hook + PMS/SNS user-scoped cleanup wiring 및 검증 스크립트 gate를 추가.

* **server, web-dms, web-admin, database, scripts:** DMS settings 권한 경계를 personal entry + admin-only system settings 로 정렬. 일반 사용자는 DMS 개인 설정을 열고 저장할 수 있으며, 시스템/runtime 설정은 admin 계정에서만 노출·수정된다. `dms.settings.manage` seed baseline 과 access verifier도 같은 계약으로 보정.

* **web-dms, docs/dms:** 비-admin DMS 설정 화면에서 시스템 설정 scope/menu/search 항목과 기본 설정 스코프의 system 선택지를 숨기고, legacy access-request redirect 도 admin 여부에 맞춰 personal 설정으로 보정.

* **server, web-auth, scripts:** 5앱 auth lifecycle revoked-session convergence를 보정. `JwtStrategy` 가 access token의 `sessionId` 를 `cm_user_session_m` row와 대조해 missing/mismatch/revoked/expired 세션을 401로 거부하고, protected app bootstrap은 focus/visibility 복귀 시 서버 auth state를 재확인하며, `pnpm verify:auth-lifecycle` 로 Admin/CRM/PMS/DMS/SNS app-local auth proxy의 logout 후 old-token rejection을 검증.

* **web-auth, web-dms, scripts, docs:** 포커스/visibility 복귀 auth 재검증을 background 모드로 분리해 이미 렌더링된 protected app subtree가 full-screen loading으로 교체되지 않도록 보정했다. 초기 bootstrap은 blocking gate를 유지하고, DMS query cache는 같은 사용자 access token 회전이 아니라 사용자 scope 변경에만 clear되도록 좁혔다.

* **web-auth:** 공유 auth storage 가 비어 있는 상태를 동기화할 때 다시 공유 auth clear 이벤트를 발행하지 않도록 조정해, 미인증/로그아웃 화면에서 `syncFromStorage` 와 `clearSharedAuthState` 가 재귀적으로 호출되는 문제를 차단했다.

### Documentation

* **docs/common, docker:** 플랫폼 shell/content-page 강제화 완료 핸드오프 문서를 추가했다. Docker 재빌드/기동, 5개 웹 앱 HTTP 200, access smoke/admin/DMS, PMS launch readiness 검증 결과를 다음 운영/설정/제어 작업의 시작 기준으로 기록했다.

* **docs/common, docs/dms:** content-area 내부 페이지 조립 표준을 추가했다. DMS 문서 페이지를 골든 이그잼플로 고정하고, DMS `PageTemplate`은 장기적으로 `@ssoo/web-shell` page recipe로 승격할 기준 구현이라고 명시했으며, DMS frontend/layout/golden-example 문서를 같은 경계로 정렬했다.

* **docs/common:** SSOO 5앱 공용 사용자 생명주기 기준을 정본화하고, “공용 로그인 코드”가 아니라 logout/session-revoke/profile/access/cache cleanup까지 같은 사용자 상태로 수렴해야 완료라고 명시. 적용 계획은 server revoked-session 검증 → shared auth bootstrap/401 보정 → domain cleanup hook → browser lifecycle check → Docker/5앱 verifier 순서로 고정.

### Refactoring

* **server, types, web-auth, web-shell, web-admin, web-crm, web-pms, web-dms, web-sns, docs:** header/sidebar 검색 표면을 공용화했다. Header placeholder는 “무엇이든 찾아드릴게요! 무엇이 필요하신가요?”, sidebar placeholder는 “목록 내 검색..”으로 고정하고, sidebar 내부 필터링은 `SsooSidebarSearchableTree`가 소유하도록 5개 앱 adapter를 정렬했다. 통합 검색은 검색 실행/결과 내 재검색/blocked source summary 구조를 반영한 `SsooGlobalSearchPage` recipe, 공용 `CommonSearch*` 타입, server `/api/search`, `createCommonSearchApi`, source filter chip, result renderer slot을 통해 `/ssoo/search` 탭으로 연결한다. `SsooGlobalSearchPage`는 공용 content page recipe로 승격되어 5개 앱 route registry에서 `contentPage`로 분류되고, 앱은 검색 API와 결과 open adapter만 소유한다. DMS provider는 기존 DMS `SearchService`를 재사용해 semantic/vector 시도, keyword fallback, ACL/redaction, blocked source summary를 유지한다.

* **web-auth, server-sns, web-sns, web-admin, web-crm, web-pms, web-dms, docs/common:** 공용 사용자 표면을 `내 프로필`/`내 설정` 의미 액션으로 확장했다. `AuthUserMenu`는 5개 앱에서 외부 SNS 링크가 아니라 현재 앱 프레임의 탭바에 `@ssoo/web-auth` `SsooUserSurfacePage`를 열고, SNS profile/feed/follow API는 common 사용자 표시값 + SNS profile + skills/careers + follow stats + 작성자 feed를 단일 projection으로 반환한다. 프로필/개인 설정 수정, follow, feed 반응/북마크/게시물/댓글 변경은 SNS domain event로 발행되어 동시에 열린 앱 탭들이 서버 truth를 다시 읽는다.

* **web-shell, web-admin, web-crm, web-pms, web-dms, web-sns, scripts, docs/common:** 5개 앱의 visible identity를 `@ssoo/web-shell` 공용 source로 승격했다. 브라우저 제목 표시줄은 `SSOT Platform`, `SSOT Sales`, `SSOT Project`, `SSOT Document`, `SSOT Connect` 단일 형식으로 줄이고, 브라우저 탭 아이콘은 공용 `/ssot-icon.svg` route로 통일했으며, 앱 기본 theme 색상과 런타임 `--ssoo-primary` 사용자 커스텀 값을 favicon accent에 반영하도록 `SsooFaviconSync`를 추가했다. main sidebar brand도 같은 한 줄만 노출하도록 정렬했고, `verify:ssoo-frame`가 앱별 하드코딩, app-local `icon.svg`, 도메인 설명 subtitle, favicon theme sync 회귀를 차단한다.

* **web-shell, web-dms, scripts, docs:** 문서/설정/Admin 운영 page에서 공유할 page-frame 하위 UI 조각을 `@ssoo/web-shell`로 승격했다. DMS `PageTemplate`은 `SsooContentPageTemplate`에 DMS breadcrumb/header/action slot을 주입하는 adapter로 유지하고, breadcrumb/header/page chrome stack/content page recipe/sectioned shell/panel frame/collapsible section/key-value/text/chip/activity section은 `SsooPage*`/`SsooContentPageTemplate`/`SsooSectionedShell`/`SsooPanel*` primitives를 소비하도록 래핑했다. `SSOO_PAGE_CHROME_METRICS`/`SSOO_PAGE_CHROME_CLASSES`/`SSOO_CONTENT_PAGE_METRICS`를 플랫폼 전역 기준으로 추가하고, breadcrumb row 24px, page header 54px, content/sub-content/sidecar slot 기준을 공용 primitive에 고정해 문서 페이지와 설정 페이지의 위치 차이를 제거했다.

* **web-auth, web-shell, web-pms, web-crm, web-sns, docs/common:** 공용 알림센터를 실제 앱 적용 범위까지 확장했다. `@ssoo/web-auth`가 `useCommonNotificationCenter`로 list/read/unread/read-all/pagination/SSE refresh 상태를 소유하고, `@ssoo/web-shell`이 `SsooHeaderNotificationCenter`로 header trigger + shared panel opening behavior를 제공하며, PMS/CRM/SNS 헤더는 source app과 도메인 reference open action만 주입한다. DMS는 기존 도메인 특화 adapter를 유지하되 같은 `SsooNotificationPanel` content primitive를 사용한다.

* **web-shell, web-dms, docs/common:** 알림센터 패널/목록/카드/읽음 상태 UI를 `SsooNotificationPanel` 공용 primitive로 분리하고, DMS는 문서 열기·권한 요청 focus·publish 재시도 같은 도메인 액션만 어댑터로 주입하도록 정렬했다. 헤더 알림 trigger/badge는 플랫폼 frame 공용화 범위로 분리해 유지한다.

* **web-dms, web-shell, scripts, docs:** DMS 설정 진입을 공유 `SsooAppFrame` 위의 settings mode로 유지하되, `Sidebar` + `Header` + 기존 `TabBar` + `ContentArea` 4개 slot을 그대로 보존하도록 재정렬했다. settings sidebar는 DMS `SETTING_SECTIONS`/`searchSettingEntries()`/권한 predicate를 주입하고, 검색 결과 section과 설정 메뉴 tree section 표현은 `@ssoo/web-shell`의 `createSsooSettingsSidebarSections`가 소유한다. 메뉴 클릭은 `/settings/{scope}/{sectionId}` 탭을 기존 `TabBar`에 열며, `SettingsPage` 내부 색인은 `PageTemplate`의 `leftSubContentSlot` rail로 렌더링한다. `verify:ssoo-frame`는 별도 settings shell/tabbar 회귀를 검증한다.

* **web-shell, web-admin, web-crm, web-pms, web-dms, web-sns:** main sidebar 검색 clear 버튼, tree row action/icon/status, empty/loading/error/note 양식을 `@ssoo/web-shell` primitive로 승격했다. 5개 앱 main sidebar adapter는 검색값/clear handler, node data, action event, status tone만 주입하고 row/button/state className을 직접 소유하지 않도록 정렬했다.

* **web-shell, web-admin, web-pms, web-dms, web-sns:** 5앱 main sidebar section content를 `SsooSidebarTree` 단일 렌더 경로로 수렴. Admin/SNS route row와 PMS/DMS favorites/open tabs도 tree leaf node adapter로 바꾸고, SNS의 2줄 description row를 제거해 섹션 하위 항목의 들여쓰기와 row rhythm을 통일했다.

* **web-shell, web-admin, web-crm, web-pms, web-dms, web-sns:** 5앱 main sidebar의 표현/동작 계층을 공용 `SsooSidebarSurface`로 통일. 앱별 코드는 search adapter, refresh action, section 정의, section content, item click action만 주입하고 brand/header/rail/toolbar/section chevron/footer 렌더는 `web-shell`이 소유하도록 정렬했다.

* **web-auth, web-admin, web-crm, web-pms, web-dms, web-sns:** 사용자 메뉴의 계정/프로필/보안 진입점을 공용 `AuthUserMenu` account center action 으로 수렴. `NEXT_PUBLIC_SNS_APP_URL` 기준 SNS account center 를 canonical destination 으로 사용하고, DMS 문서 도메인 설정은 별도 `DMS 설정` 액션으로 분리.

* **web-auth, web-admin, web-crm, web-sns, web-pms, web-dms:** Account/Auth + Admin + SNS Profile 장기 경계를 정본화하고, 앱별 `/login` route를 유지하되 공용 로그인 카드/세션 엔진을 쓰는 현재 구현 단계로 정렬. Admin/CRM 포함 5앱 로그인은 앱별 화면 문구나 theme override 없이 공용 SSOT 로그인 surface를 사용한다.

* **web-shell, web-pms, web-crm:** SSOO sidebar를 서비스별 데이터/컨텐츠 slot과 `fixed`/`collapsible`/`collapsed-only`/`hover-reveal`/`overlay`/`floating-handle` mode 기반 공용 primitive로 분리하고, PMS는 기존 접힘/플로팅 동작을 보존한 기준 적용, CRM은 고정형 sidebar frame/section/item을 공용 primitive로 이관.

* **web-shell, web-dms, docs/common:** SSOO 전체 앱에서 재사용할 설정 화면 양식을 `SsooSettings*` primitives로 추가하고, DMS 설정 페이지의 내부 section navigation/status/pending summary/view-mode controls 를 공통 surface 소비 구조로 전환.

* **web-dms, docs/dms:** 공통 설정 양식에 맞춰 설정 화면의 앱명 반복 표기를 제거하고 scope/group/empty/template/link 문구를 `시스템 설정`, `내 설정`, `관리자 템플릿` 중심으로 단순화.

### Closeout

* **workspace, docker, dms:** 2026-06-11 repo-wide closeout handoff를 추가하고 DMS 설정 표기 cleanup을 Docker까지 반영했다. `ssoo-server`/`ssoo-dms` 이미지를 재빌드·재기동하고, 실행 중인 Docker Postgres `dms.dm_config_m` 시스템 설정도 document-neutral runtime path로 갱신해 기존 `.runtime/dms/*`, `/sites/dms`, `/mnt/nas/dms` 값이 남지 않도록 정리했다.

* **workspace:** SSOO repo-wide closeout handoff updated for the current launch/rebaseline slice, including legacy content-app naming removal, SNS/CRM workspace drift context, GitHub/GitLab publish procedure, and DMS startup file-list recovery notes.

### Bug Fixes

* **server (dms):** prevent startup hydration from marking DB documents as `missing` when the Git-backed document content-plane is not ready yet, avoiding an empty DMS file list after PC/Docker startup races; added a focused regression spec for the guarded path.


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

* **web-auth:** browser login fetch binding fix — shared auth adapter가 native `fetch` 를 object method 형태로 호출하면서 브라우저에서 `Failed to execute 'fetch' on 'Window': Illegal invocation` 이 날 수 있던 경로를 global fetch binding 기준으로 정리해 PMS/SNS/DMS 공통 로그인 진입점이 다시 정상 동작하도록 보정

* **server, web-pms, types, database, docs/common, docs/dms:** Phase 3~5 cleanup closeout — JWT payload 에서 `roleCode` 를 제거하고 foundation role baseline 을 DB-backed resolution 으로 전환했으며, user admin / inspect 계약에서 `userTypeCode`·`isAdmin` 를 제거하고 `cm_user_m`/`cm_user_h` 의 `is_admin`·`user_type_code`·`permission_codes` schema tail 을 정리

* **server, web-pms, docs/common:** Phase 2 org bridge replacement baseline — 사용자 생성/수정 계약과 PMS 사용자 관리 화면에 `primaryAffiliationType`, `employeeNumber`, `companyName`, `customerId` 를 노출하고, `syncOrganizationFoundation()` 이 explicit primary 소속 선택 → current primary relation → data-driven fallback 순서로 organization relation primary 를 결정하도록 정렬

* **server, web-pms, docs/common:** Phase 1 menu baseline cutover — PMS `/api/menus/my` 일반 메뉴를 legacy seed 와 같은 역할 기준선(`admin/manager = full`, `user = read`, `viewer = dashboard read`) 위에 `cm_role_menu_r` legacy override fallback 과 `cm_user_menu_r` grant/revoke 를 덧씌우는 구조로 정렬하고, `GET /api/roles/:roleCode/menus` / `RoleManagementPage` 는 관리자 메뉴를 `system.override` 기준 read-only row 로 표시하도록 정리

* **server, docs/common:** access smoke runtime 확장 — `pnpm verify:access-smoke` 가 기본 demo runtime persona(`viewer.han`) 기준으로 PMS foreign project deny / SNS post deny / DMS git-settings system deny 와 PMS·SNS·DMS allow path 를 함께 검증하도록 넓어지고, PMS project access 가 action permission 누수 없이 project capability 로만 `canViewProject` 를 계산하도록 보정

* **server, docs/common, types:** Wave 5 access alignment 정렬 — PMS project-scoped route 를 `ProjectFeatureGuard` + `RequireProjectFeature(...)` 패턴으로 올리고, PMS two-stage bootstrap(`/api/menus/my` + `/api/projects/:id/access`)와 navigation-centric `PmsAccessSnapshot` 경계를 문서화하며, PMS/SNS cross-domain validation target 을 auth/access 문서와 runbook에 추가

* **server, web-dms, docs/dms:** DMS object ACL pilot 완료 — `DocumentMetadata.acl` 을 file/content read-write-metadata, file tree/raw/serve-attachment, search/ask, template reference/doc-assist tree hint, upload inheritance, local storage/open 경계에 연결하고, 새 문서 owner default + DocumentPage 편집 affordance + validation matrix를 정렬해 unreadable source와 unauthorized mutation을 차단

* **docs/common, docs/pms, docs/sns:** PMS/SNS alignment audit 완료 — PMS project access 와 SNS feature/visibility policy 가 `AccessFoundationService` + shared `policy` trace 계약 위에 유지됨을 확인하고 cross-domain alignment 상태를 문서 기준선에 반영

* **server, docs/common:** admin-only access ops tooling 추가 — `GET /api/access/ops/inspect`, `GET /api/access/ops/exceptions` 를 추가해 foundation policy trace 와 permission exception 을 운영자가 직접 조회할 수 있게 하고, verification runbook + cleanup plan 문서를 함께 정리

* **server, types, docs/common, docs/sns, docs/pms:** legacy cleanup safe slice — SNS browser-facing access snapshot 의 redundant `isAdmin` 를 제거하고, `GET /api/users/profile` 이 `roleCode`/`userTypeCode`/`isAdmin` 를 다시 노출하지 않도록 축소하며, JWT `TokenPayload` 에서 `userTypeCode` 를 제거

* **server, docs/common:** legacy cleanup major slice — JWT `TokenPayload` 에서 `isAdmin` 을 제거하고, `AccessFoundationService` / PMS project list filter / PMS admin menu inclusion 이 `system.override` 기준으로만 관리자 우회를 계산하도록 정렬

* **server, web-pms, types, docs/common:** route-level admin gate + ops hardening 마감 — `RolesGuard` 의 `@Roles('admin')` 를 access foundation `system.override` 기준으로 전환하고, PMS 사용자 관리 화면에 access inspect dialog 를 추가하며, `pnpm verify:access-smoke` repo-native smoke script 로 admin success / profile contract / optional non-admin 403 검증 경로를 자동화

* **docs/common, docs/dms:** auth/access validation baseline 문서화 — 공통 matrix(anonymous/feature denied/object denied/allow)와 repo-native 검증 루틴을 정리하고, DMS readiness/backlog/roadmap를 object ACL 중심 상태로 재정렬

* **server, types:** 공통 permission resolution contract 정렬 — server common `AccessFoundationService` 로 role/org/user-exception/object grant 계산을 재사용하고, SNS/DMS/PMS project access snapshot 에 `policy` trace를 추가해 동일한 상위 계약으로 설명 가능하도록 정리

* **web-auth, web-pms, web-sns, web-dms:** 공용 session bootstrap helper 추가 — PMS/SNS Axios 401 복원과 DMS fetch retry가 같은 `restoreSharedAuthSession()` 경로를 사용하도록 통합하고, concurrent restore dedupe + transient failure 시 local auth 유지 정책으로 정렬

* **web-pms, web-sns:** 브라우저-facing auth surface를 DMS와 동일한 same-origin proxy 패턴으로 통일 — `src/app/api/auth/[action]/route.ts` + `_shared/serverApiProxy.ts` 신규 추가, `authApi` 어댑터를 same-origin `/api/auth/*` fetch 기반으로 교체, Axios 401 인터셉터의 session bootstrap도 `/api/auth/session` same-origin 경유로 변경

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
* **web-dms:** 과거 설정 전용 frame — `/settings` 탭 대신 전역 설정 모드, system/personal 설정 분리, 공용 JSON renderer/editor/diff 도입
* **web-dms:** settings surface 확장 — storage runtime 필드(`enabled`, `webBaseUrl`), upload/search/DocAssist 정책, viewer/sidebar 개인 기본값, M365 metadata-only 설정 추가

### Improvements

* **docs/common:** current workstream baseline 추가 — DMS/PMS/SNS 3개 축에 대해 어디까지 진행됐고 어디서 끊겼는지, 지금 멈춰야 할 작업과 이어가야 할 작업, 실제 실행 우선순위(DMS 최우선 / PMS 가능하면 병렬 / SNS 최하위), 병렬 진행 시 공통 영역 owner/escalation 규칙을 레포 기준선 문서로 고정

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

* **docker:** full-stack compose 정렬 — root `compose.yaml`을 `postgres + server + pms + sns + dms` 기준으로 확장하고, PMS/SNS Dockerfile/standalone 설정, shared `dms-data` volume, compose 전용 DB URL override(`DOCKER_DATABASE_URL`)를 정리
* **web-dms:** runtime/config normalization — root `compose.yaml` 단일 지원 경로, workspace Dockerfile, `DMS_SERVER_API_URL` 브리지/JSON config 문서 정렬과 `DOCKER_DMS_DATABASE_URL` 분리
* **web-dms:** GitLab workspace publish flow — full-workspace `development` branch, `codex:workspace-sync-from-gitlab` / `codex:workspace-publish` 추가, 기존 `codex:dms-*` 는 호환 래퍼로 유지
* **web-dms:** sidecar 링크 섹션 아이콘 — Globe(외부)/FileText(내부 문서)/Image(이미지) 타입별 구분
* **web-dms:** 링크 본문 찾기 — sidecar에서 ↳ 버튼 클릭 시 뷰어/에디터 내 해당 링크로 스크롤 + 하이라이팅
* **web-dms:** 내부 문서 링크 클릭 시 새 탭으로 열기, 외부 링크는 브라우저로 열기
* **web-dms:** 이미지/링크/문서경로 설정 모달 크기 통일 (max-w-lg h-[480px])
* **web-dms:** bare path 링크 해석 개선 — `goals.md` 같은 상대 경로를 현재 파일 디렉토리 기준으로 해석
* **web-dms:** 과거 설정 전용 frame 헤더 정리 — 사이드바 브랜드 슬롯을 `뒤로가기 + 설정`으로 재구성하고, 상단 헤더 검색을 전역 설정 검색으로 전환하며 scope 뱃지를 제거
* **web-dms:** 과거 설정 전용 frame 단순화 — sidebar 브랜드 보조 문구 제거, 설정 검색을 sidebar 검색 슬롯으로 이동, UserMenu 설정 진입점을 단일 항목으로 정리
* **web-dms:** 과거 설정 전용 frame 3뎁스 네비게이션 — outer sidebar를 `시스템 설정`/`개인 설정` scope selector로 축소하고, `SettingsPage` 내부에 좌측 section menu + 우측 detail surface를 도입
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
* **web-shell, web-pms, web-dms, web-crm, web-admin, web-sns:** sidebar internals commonization — 검색 입력, refresh action, section chevron, flat list row, recursive tree row/filter를 `@ssoo/web-shell`의 `SsooSidebar*` primitive로 승격하고 PMS/DMS/CRM/Admin/SNS가 같은 렌더링 경로를 공유하도록 정리

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
