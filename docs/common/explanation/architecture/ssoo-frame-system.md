---
title: SSOO Frame System
owner: platform-team
status: active
lastReviewed: 2026-06-19
---

# SSOO Frame System

SSOO 서비스 shell은 특정 서비스 화면을 다른 서비스가 복사하는 방식이 아니라, `packages/web-shell`의 공용 frame primitive와 `packages/web-ui`의 공용 디자인 토큰/UI primitive를 소비하는 방식으로 정본화한다.

## 핵심 원칙

- shell/frame/page recipe 공용 컴포넌트는 `web-shell`이 소유하고, Tailwind preset과 원자 UI primitive inventory는 `web-ui`가 소유한다.
- 도메인 서비스는 메뉴, 검색, 액션, 탭, 본문 같은 서비스별 바인딩을 slot/data로 주입한다.
- 5개 앱(PMS/CRM/DMS/SNS/Admin)의 sidebar는 하나의 동작으로 통일한다. 토글로 접기/펼치기를 전환하고, 접힌 상태에서는 rail을 보이다가 마우스 hover 시 전체 sidebar가 펼쳐진다.
- sidebar 동작 차이를 서비스별 optional mode로 만들지 않는다. 도메인 차이는 slot/data로만 표현한다.
- 5개 앱의 sidebar 표현/동작 계층은 `SsooSidebarSurface`가 소유한다. 앱은 공용 visible identity의 brand title, brand action icon/event, search value/change/clear handler, refresh action, section 정의, tree node data, item click action만 주입한다.
- 전역 CSS/token 정본은 `packages/web-shell/src/styles/ssoo-global.css`이며, 앱별 theme token도 `body[data-ssoo-theme]` 기준으로 이 파일이 소유한다. 각 앱의 `globals.css`는 Tailwind directive/공통 utility를 복제하지 않고, 도메인 전용 CSS 또는 theme token이 공용 CSS에서 제공된다는 짧은 표식만 둔다.
- Tailwind theme extension 정본은 `@ssoo/web-ui/tailwind-preset`이다. 5개 웹 앱은 앱별 `tailwind.config.*`에 typography/spacing/radius/color extension을 재선언하지 않고, preset과 content scan 대상만 선언한다.
- 내부 페이지 primitive 적용은 `apps/web`, `packages/web-shell`, `packages/web-auth` 전역 TSX surface 기준으로 강제한다. 원시 `button/input/textarea/select/table/thead/tbody/tfoot/tr/th/td` 소비는 `verify:ui-consumption`에서 실패한다.
- 원자 UI inventory 정본은 `packages/web-ui/primitive-inventory.json`이다. inventory에 등록된 모든 원자는 `platform` 상태여야 하며, `verify:ui-primitives`는 inventory 밖 앱 로컬 primitive 추가, 중간/local-only 상태, 앱 로컬 재정의를 preflight/build/push guard에서 차단한다. 두 gate의 자세한 기준은 [UI Primitive Inventory](ui-primitive-inventory.md)를 따른다.
- shell metric 정본은 `packages/web-shell/src/shell-metrics.ts`의 `SSOO_SHELL_METRICS`다. sidebar width, header height, tabbar height/min/max, overlay inset/panel width, desktop/mobile breakpoint 같은 frame 표현 수치는 앱 상수로 재선언하지 않는다.
- theme preset 정본은 `packages/web-shell/src/theme.ts`의 `SSOO_THEME_PRESETS`와 `SSOO_APP_DEFAULT_THEME_KEYS`다. 앱은 기본 theme key를 `body[data-ssoo-theme]`로 선택하고, 색상 token 값과 light/dark 변형은 `web-shell`이 소유한다. CRM theme은 확정 전까지 `crm` preset의 임시 Sales Blue 기준을 사용한다.
- 향후 Admin이 플랫폼 기본 theme을 설정하거나 사용자가 앱별 개인 설정에서 theme을 바꾸는 경우에도 저장/권한/선택 UI는 앱/Admin이 소유하고, 저장값은 `SsooThemePresetKey`만 참조한다. 새 색상 세트는 앱 CSS가 아니라 `SSOO_THEME_PRESETS`와 `ssoo-global.css` preset block에 추가한다.
- 전 앱 Next config 정본은 `packages/web-shell/next-config.cjs` 이다. 이 factory가 standalone/output tracing, 공통 transpile package, 전역 Gravatar image remote pattern, `packages/web-shell/next-security-headers.cjs` 보안 헤더를 소유한다. Admin/CRM/PMS/DMS/SNS `next.config.*` 는 factory를 소비하고, 앱별로 CSP/frame/MIME/referrer/permissions header를 복제하지 않는다.
- DMS의 `@napi-rs/canvas`, `pdfjs-dist` 같은 문서/PDF 런타임 전용 `serverExternalPackages` 는 공통 factory override로만 선언한다.
- 전 앱 route middleware의 허용 경로/복구 결정은 `@ssoo/web-shell/route-policy`의 순수 helper를 사용한다. 앱은 허용 route data와 redirect/rewrite mode만 소유한다. 단, Next middleware `config.matcher`는 정적 분석 가능한 리터럴이어야 하므로 각 앱 middleware에 같은 리터럴 matcher를 둔다.
- 표면 제품명은 확정 전까지 `SSOT`를 사용한다. 내부 프로젝트/문서 맥락의 SSOO 명칭과 달리 브라우저 제목 표시줄, 탭 아이콘, 사이드바 브랜드, footer 같은 사용자 노출 surface는 SSOT로 통일한다. 브라우저 제목 표시줄과 5개 앱 main sidebar brand title은 `packages/web-shell/src/app-identity.ts`가 소유하고, 탭 아이콘 SVG와 route 응답은 `packages/web-shell/src/app-icon.ts`가 소유하며 Docker/runtime HTML까지 검증 대상이다.
- 브라우저 제목 표시줄은 `SSOT {서비스명}` 형식을 기준으로 한다. 현재 5개 앱 표기는 `SSOT Platform`, `SSOT Sales`, `SSOT Project`, `SSOT Document`, `SSOT Connect`이다.
- 브라우저 탭 아이콘은 5개 앱 모두 같은 `/ssot-icon.svg` route를 사용한다. 앱은 개별 `src/app/icon.svg`를 두지 않고, route handler에서 `getSsooAppIconResponse('{app}', request)`만 재노출한다. favicon accent는 앱 기본 theme의 `ssooPrimary`와 런타임 `--ssoo-primary` 값을 기준으로 `packages/web-shell/src/app-icon.ts`가 생성하고, root layout의 `SsooFaviconSync`가 사용자 커스텀 theme 반영 시 favicon link를 `accent` 쿼리로 갱신한다.
- 5개 앱의 main sidebar brand는 같은 `SSOT {서비스명}` 단일 줄만 노출하고, 도메인 설명 보조 문구는 sidebar brand subtitle으로 반복하지 않는다. 도메인 설명은 metadata description, 메뉴/페이지 문맥, 문서 설명에만 둔다.
- 앱별 색상 theme은 의도된 식별 장치다. 공용화 대상은 색 자체의 단일화가 아니라 theme preset registry, header/sidebar/tabbar/content primitive의 형태, slot 구조, 직접 상호작용 계약이다.
- 눈으로 다른 shell surface가 남아 있으면 공용화 미완료로 본다. `SsooAppFrame`을 사용하는 것만으로는 완료가 아니며, header/sidebar/tabbar 표면은 실제 shared primitive를 소비해야 한다.
- 5개 앱의 header entrypoint는 `SsooAppHeader`다. 앱 메인 header는 검색/새로 만들기/알림/사용자 메뉴 surface를 같은 순서와 크기로 노출한다. header 검색 placeholder는 `SSOO_HEADER_SEARCH_PLACEHOLDER`/`SSOO_GLOBAL_SEARCH_PLACEHOLDER`의 “무엇이든 찾아드릴게요! 무엇이 필요하신가요?”로 통일한다. header 검색의 입력 상태, Enter submit 처리, `/ssoo/search?q=` 경로 생성, 검색 아이콘 주입은 `packages/web-shell/src/global-header-search.tsx`의 `useSsooGlobalHeaderSearch`가 소유한다. 앱은 검색 가능 여부와 통합 검색 탭을 여는 navigation adapter만 주입한다. header 내부 button/input/icon size, action spacing, 사용자 메뉴 폭 측정, notification trigger/badge shape를 직접 소유하지 않는다.
- header 검색 submit은 공용 `/ssoo/search` 통합 검색 탭으로 연결한다. 검색 실행 query와 결과 내 재검색 분리, toolbar, 결과 panel, blocked source summary, 결과 card renderer slot, 기존 DMS AI 검색의 sidecar/검색 기록/인기 검색어/AI 첨부 표면은 `@ssoo/web-shell`의 `SsooAiSearchPage` 계열 공용 모듈이 소유한다. 통합 검색 표면인 `SsooGlobalSearchPage`는 새 화면 복제가 아니라 이 공통 `SsooAiSearchPage`를 소비하면서 source-app filter chip과 전역 검색 adapter만 주입한다. DMS 검색 진입점은 `/ssoo/search` 하나이며 `/ai/search` 호환 alias를 유지하지 않는다. 기본 검색 요청에는 `sourceApp`을 넣지 않고 모든 provider를 대상으로 검색하며, source filter chip을 선택한 경우에만 `sourceApp` query와 요청 filter를 적용한다. 앱은 `@ssoo/web-auth`의 `useCommonGlobalSearchAdapter`에 현재 앱, 탭 path, 앱별 결과 열기 action만 주입하고 API 호출, API base URL, cross-app app URL map, 초기 query/source filter parsing, cross-app URL routing을 다시 구현하지 않는다.
- 서버 `/api/search`는 앱별 검색 provider registry를 조합하는 platform endpoint다. common search service/module은 DMS `SearchService`, CRM opportunity service, PMS/SNS/Admin 도메인 DB 조회를 직접 import하지 않는다. DMS provider는 DMS DB를 직접 keyword 조회하지 않고 기존 DMS `SearchService`를 재사용해 semantic/vector 시도, keyword fallback, ACL/redaction, read request state, blocked source summary를 유지한다. CRM provider는 CRM `OpportunityService`를 재사용해 영업기회 결과를 등록한다. PMS provider는 owner/member project만, SNS provider는 public/own post만, Admin provider는 `system.override` access foundation 권한이 있는 사용자에게만 결과를 반환한다. 응답 capability는 `keyword`, `metadata`, `semantic`, `vector`, `ragContext`를 분리해 표시하며, `ragReady`는 `ragContext` 조립까지 제공되는 경우에만 true로 둔다.
- Header 알림센터는 5개 앱 모두 `SsooHeaderNotificationCenter`/`SsooNotificationPanel`을 소비한다. 패널 문구, dim/backdrop, source-app 카테고리, 상단 `전체`/앱별 filter chip과 unread badge, read/unread, 모두 읽음, pagination, 열기/확인 action, typography 표면은 공용이고, 앱은 현재 앱 chip 우선순위, notification source/query/mutation과 action data/handler만 주입한다.
- DMS settings context는 앱 상단 header slot을 유지하되 `SsooAppHeader` shell 내부 content를 비우고, 설정 sidebar brand 영역의 뒤로가기 action과 `설정` title만 노출한다. 설정 검색은 header가 아니라 settings sidebar 검색 슬롯에서만 처리한다.
- 메뉴/프로젝트/문서/사용자 같은 실제 데이터와 클릭 시 주입되는 도메인 action 함수는 각 앱이 소유한다. 데이터 차이나 action 구현 차이는 공용 component를 fork하는 사유가 아니다.
- tabbar는 full MDI 탭바가 유일한 목적이다. 5개 앱 tabbar는 모두 `SsooMdiTabBar` full MDI 탭바를 사용한다. route/static/none 같은 tabbar mode를 만들지 않고, route-backed section 이동이나 단일 home tab adapter도 별도 표현으로 두지 않는다. route 진입은 탭을 여는 입력이고, 화면 표면은 열린 탭 목록/active tab/close/reorder를 가진 같은 MDI 탭바여야 한다.
- 탭 action/status/icon 표면은 `SsooTabBarItem`과 tabbar 보조 primitive가 소유한다. 앱은 icon 종류, status tone, action handler만 주입하고 close/minimize 버튼 크기, hover reveal, dirty dot, icon size/color class를 직접 소유하지 않는다.
- 탭 item 전체 hit-area는 클릭 시 활성 탭 전환을 수행하고, 같은 hit-area에서 실제 drag가 시작된 경우에만 reorder를 수행한다. icon/text/status/빈 padding 영역별로 activate와 drag target을 나누지 않으며, cursor는 앱별로 `grab`/pointer가 섞이지 않도록 공용 tab item에서 통일한다.

## 현재 공용 primitive

- `@ssoo/web-ui/tailwind-preset`
  - SSOO semantic typography, control height, icon size, radius, theme token color alias를 공통 Tailwind preset으로 제공한다.
  - Admin/CRM/PMS/DMS/SNS는 이 preset을 소비하고, 앱별 Tailwind config에서 같은 fontSize/spacing/colors/borderRadius map을 복제하지 않는다.
  - DMS 문서 prose/editor처럼 도메인 콘텐츠 해석에 필요한 CSS는 앱 local CSS에 남길 수 있지만, Button/Input/Table 같은 기본 UI token은 preset을 따른다.

- `Button`, `Badge`, `Card`, `Input`, `NativeSelect`, `Table`, `Textarea`
  - 반복 primitive의 variant, size, typography, radius, focus ring, control height를 `@ssoo/web-ui`가 소유한다.
  - inventory에 등록된 원자는 모두 `platform` 원자이며 중간/local-only 원자는 허용하지 않는다.
  - `Badge`는 inline token으로 취급해 `span`으로 렌더링한다. 버튼/링크/테이블 셀 안의 상태 표시도 별도 span class recipe 대신 공용 Badge를 사용한다.
  - 앱 local `components/ui/*` 파일은 기존 import 호환을 위한 thin re-export adapter로 유지할 수 있다.
  - 앱은 도메인 action, label, icon, disabled/loading 여부를 주입하고 primitive의 class recipe를 fork하지 않는다.
  - 앱/web-shell/web-auth TSX surface에서는 원시 `button/input/textarea/select/table/thead/tbody/tfoot/tr/th/td`를 직접 렌더링하지 않는다.

- `SSOO_SHELL_METRICS`
  - SSOO frame의 숫자 표현 기준이다.
  - sidebar expanded/collapsed width, header height, tabbar item/container/min/max, overlay inset/panel width, mobile/desktop breakpoint를 소유한다.
  - 앱은 모바일 판정, toast/overlay top offset, sidebar main offset, tabbar 너비 계산에 같은 metric을 소비하고 `LAYOUT_SIZES`, `SNS_SHELL_SIZES` 같은 앱별 shell metric 상수를 두지 않는다.

- `SSOO_THEME_PRESETS`, `SSOO_APP_DEFAULT_THEME_KEYS`, `SsooThemePresetKey`
  - PMS/CRM/DMS/SNS/Admin과 여분 theme preset의 light/dark token registry다.
  - 앱 root layout은 `body[data-ssoo-theme]`로 preset key만 선택한다.
  - app `globals.css`는 `--background`, `--foreground`, `--ssoo-primary` 같은 shell theme token 값을 직접 소유하지 않는다.
  - Admin 기본 설정이나 사용자별 앱 theme preference는 preset key를 저장하는 domain/application state이며, 실제 token 값과 dark-mode 변형은 `web-shell` registry가 소유한다.

- `SsooAppFrame`
  - 앱 전체 shell.
  - `mode`로 workbench/document/social/content-only 성격을 표시한다.
  - `sidebarMode`, `sidebarExpanded`를 받아 `SSOO_SHELL_METRICS` 기준으로 main offset을 공통 계산한다.
  - header/tabbar/sidebar/content를 slot으로 받는다.
  - `theme` prop 또는 앱 root의 `body[data-ssoo-theme]`로 theme preset key를 전달할 수 있다. 앱은 frame root/background/content `<main>` class나 inline style을 직접 주입하지 않는다.

- `SsooAppHeader`
  - 5개 앱의 header slot entrypoint다.
  - 검색 영역, primary/secondary action, notification trigger 또는 panel slot, 사용자 메뉴 slot을 같은 순서와 spacing으로 배치한다.
  - 사용자 메뉴 dropdown 폭은 공용 header의 `SSOO_HEADER_USER_MENU_DROPDOWN_WIDTH`가 소유하고, 앱은 사용자 메뉴 렌더러에 전달된 `dropdownWidth`를 그대로 넘긴다.
  - header primary CTA 최소 폭은 공용 header의 `SSOO_HEADER_PRIMARY_ACTION_MIN_WIDTH`가 소유하며, 현재 5개 앱의 최대 label인 `새 프로젝트` 기준으로 맞춘다.
  - 앱 메인 header 검색은 `useSsooGlobalHeaderSearch`가 만든 controlled search config를 소비해야 하며, 앱은 검색 가능 여부와 통합 검색 탭 open action만 주입한다.
  - 앱 메인 header primary CTA는 새 프로젝트, 새 게시물, 새 기회, 새 사용자처럼 도메인 생성 진입점이어야 하며, 새로고침이나 disabled status chip으로 대체하지 않는다.
  - 앱은 버튼 클릭 action, notification count/panel, 사용자 세션만 주입한다.

- `SsooHeader`
  - SSOO header height/background/action alignment를 공통화하는 low-level primitive다.
  - 검색, 좌측, 중앙, 액션 영역은 slot으로 받는다.
  - 앱별 header adapter가 직접 조립하는 기본 entrypoint가 아니라 `SsooAppHeader` 내부에서 소비하는 공용 shell이다.

- `SsooHeaderSearchBox`
  - 공통 header 검색 입력 primitive.
  - placeholder 문구는 공용 기본값을 사용한다.
  - 실제 입력 상태, Enter submit, 검색 path/title 생성은 `useSsooGlobalHeaderSearch`가 소유하고, 각 서비스 adapter는 통합 검색 탭 open action만 소유한다.

- `SsooAiSearchPage`, `SsooGlobalSearchPage`, `SsooGlobalSearchResultCard`, `SsooSourceFilterBar`
  - 검색 content page 조립, toolbar, 결과 내 재검색, 결과 panel, blocked source summary, loading/empty/error 표면은 `SsooAiSearchPage` 계열 공용 모듈이 소유한다.
  - SSOO 통합 검색 화면은 `SsooGlobalSearchPage`가 `SsooAiSearchPage`를 소비하는 adapter로 제공한다. source-app filter chip은 main content slot의 toolbar 아래 결과 영역 첫 상단에 `SsooSourceFilterBar`로 주입하고, source filter 선택 전 기본 검색 범위는 모든 provider다.
  - 앱별 `/ssoo/search` 페이지는 `useCommonGlobalSearchAdapter`만 소비한다. 앱은 현재 앱 탭 열기 action만 주입하고 `createCommonSearchApi`, API base URL, app URL config, `resolveCommonSearchResultHref`, query/source filter parsing을 페이지 안에서 반복하지 않는다.
  - DMS 문서 결과처럼 도메인 특화 card가 이미 존재하는 경우 앱은 `renderResult` slot으로 자기 카드만 주입한다. 공용 recipe는 renderer slot을 제공하고, 앱은 새 page shell을 만들지 않는다.
  - 현재 전역 endpoint는 provider registry의 keyword/metadata 검색과 DMS hybrid 검색을 조합한다. 공용 타입은 `ranker`, `capabilities`, `blockedSources`를 포함하며, `capabilities`는 provider별 `keyword`/`metadata`/`semantic`/`vector`/`ragContext` 준비 수준을 구분한다. `ragReady`는 하위 호환 필드이며 RAG context assembly가 실제 제공되는 경우에만 true로 둔다.

- `SsooHeaderActionButton`, `SsooHeaderIconButton`, `SsooHeaderNotificationButton`
  - header action button, icon button, notification trigger/badge의 hit-area, hover, icon size, disabled 상태, badge 위치/크기를 공통화한다.
  - 알림센터 패널은 별도 공용화 대상이지만, header에 노출되는 알림 trigger 표면은 이 primitive를 통해 통일한다.

- `SsooHeaderNotificationCenter`, `SsooNotificationPanel`
  - header notification trigger, popover positioning, backdrop, empty/loading/read/unread group, mark read/unread, primary/secondary action, icon sizing/spinner, show-more control을 공통화한다.
  - 앱은 알림 query/mutation/event stream, unread/read item 배열, category/action label/icon data, click handler만 주입한다.
  - 패널 `style`, `className`, backdrop DOM, outside-click/escape handling, icon size class, loading spinner class, font/typography class는 앱이 소유하지 않는다.
  - 공용 panel/content primitive는 앱-local Tailwind typography extension에 의존하지 않는다. 필요한 semantic text utility는 `packages/web-shell/src/styles/ssoo-global.css`가 5개 앱 공용으로 보장한다.

- `SsooMdiTabBar`
  - 5개 앱의 full MDI tabbar entrypoint다.
  - 스크롤 버튼, home tab, 일반 tab, drag reorder, close/minimize action hit-area, active/dirty/status/icon 양식을 공통화한다.
  - 앱은 열린 탭 배열, active tab id, icon/status/action 데이터, activate/close/reorder handler만 주입한다.
  - tabbar container height, shell class, scroll area class는 공용 metric/style로 고정하며 앱별 override prop을 제공하지 않는다.
  - PMS/DMS/SNS/CRM/Admin은 `SsooTabBarShell`과 `SsooTabBarItem`을 직접 조립하지 않고 이 컴포넌트를 통해 full MDI 표면을 소비한다.

- `SsooTabBarShell`
  - `SsooMdiTabBar`가 내부에서 사용하는 MDI tabbar container primitive다.
  - root public API로 export하지 않고, 앱 tabbar adapter가 직접 소비해 route strip/static/no-tabbar 형태를 만들지 않는다.

- `SsooTabBarHomeButton`, `SsooTabBarItem`, `SsooTabBarControlButton`
  - home tab, 일반 tab, 좌우 control hit-area/active styling을 공통화한다.

- `SsooTabBarIcon`, `SsooTabBarCloseButton`, `SsooTabBarStatusDot`
  - tab icon sizing/color, close/minimize hit-area, dirty/edit status dot을 공통화한다.
  - 앱 tabbar는 `closeSlot` 같은 arbitrary action markup을 조립하지 않고, `SsooTabBarItem`의 `statusTone`, `actionIconSlot`, `onActionClick` 같은 데이터/action prop으로 표현한다.
  - `SsooTabBarItem` public API는 `closeSlot` 같은 arbitrary action slot을 제공하지 않는다. action surface는 `actionIconSlot`과 `onActionClick`을 통해서만 소비한다.
  - SNS 같은 route-backed section 이동도 별도 route tabbar mode나 route-specific primitive가 아니라 `SsooMdiTabBar`에 열린 탭 데이터와 domain action을 주입해 표현한다.

- `SsooRegisteredMdiContentArea`, `SsooMdiContentArea`, `SsooMdiContentPane`, `SsooContentAreaSurface`, `SsooContentAreaEmptyState`, `SsooContentAreaState`
  - 열린 탭 목록 기반 keep-alive MDI content mapper, active/hidden pane, route/admin/workspace content surface, empty state layout을 공통화한다.
  - 앱 ContentArea는 `SsooRegisteredMdiContentArea`와 `defineSsooMdiPageRegistry`만 root public API로 소비한다. 저수준 `SsooMdiTabbedContentArea`는 `web-shell` 내부 구현으로 남기고 root public API로 export하지 않는다.
  - 앱 TS/TSX 소스 전체에서 저수준 `SsooMdiContentArea`, `SsooMdiContentPane`, `SsooMdiTabbedContentArea` 직접 소비를 금지한다. 이 우회는 `verify:ssoo-frame`가 앱 소스 전역 스캔으로 차단한다.
  - 5개 앱은 content slot을 route `children` fallback이나 local `<main>` 중첩으로 처리하지 않고, 열린 탭 배열과 registry를 기준으로 `SsooRegisteredMdiContentArea`를 소비해 공용 MDI pane을 간접 소비한다.
  - page route는 `contentPage`만 사용한다. `contentPage`는 `SsooContentPageTemplate` 또는 이를 감싼 domain/shared-surface/handoff adapter를 거쳐야 하고, 공용 user profile/settings surface도 `createSsooSharedSurfaceContentPageElement()`를 통해 `contentPage`로 렌더링한다. shared-surface adapter는 기본 constrained 폭을 유지하고 `contentSurface="plain"`으로 page tone을 노출하며, `mainContentLayout`, `mainContentMaxWidth`, `mainContentSurface` 같은 raw opt-out을 사용하지 않는다. shared user profile/settings 내부 root도 `max-w-*`/`mx-auto`로 폭을 다시 정의하거나 page-level `h1`/description을 중복 렌더링하지 않는다. 저장/편집/취소 같은 page-level action은 `useSsooSharedSurfacePageHeaderActions()`로 shared header action bridge에 등록하고, 본문 내부 action button으로 다시 렌더링하지 않는다. canonical `/__user/*` path는 `SSOO_SHARED_USER_SURFACE_PATH_PREFIX` route-policy 상수와 5앱 middleware rewrite로 루트 셸에 연결하고, 실제 렌더링은 각 앱 ContentArea registry가 수행한다. stale route redirect는 `routeHandoffPage` adapter boundary를 통과하는 `contentPage`로만 허용한다. `legacyException` route kind는 public page assembly contract가 아니다. `shellPage` route kind와 `ShellPageContainer`는 public page assembly contract가 아니다.
  - `contentPage.render`는 임의 `ReactNode`를 반환하지 않고 branded `SsooMdiContentPageElement`를 반환한다. 직접 recipe는 `createSsooContentPageTemplateElement()`, 승인된 domain adapter는 `SSOO_CONTENT_PAGE_ADAPTER_NAMES`에 등록된 `adapterName`과 `createSsooContentPageAdapterElement()`를 사용한다.
  - 앱은 page registry, tab context/provider, route path를 탭 옵션으로 바꾸는 adapter만 소유하고 pane positioning/display/overflow/background/hidden 처리는 `web-shell` primitive가 소유한다.
  - 저수준 MDI mapper는 앱별 `paneClassName`/`paneScroll`/`paneTone` 같은 format override를 받지 않는다. 페이지 여백, 폭, 세부 스크롤은 content pane 밖의 frame 형식이 아니라 각 page/template component가 소유한다.
  - 비활성 MDI pane은 `SsooMdiContentPane`의 inline `display: none` guard로 숨김을 보장한다. 앱은 active tab 계산만 주입하고 숨김 구현이나 pane display class를 재정의하지 않는다.
  - loading/empty/notice/error 같은 content area 상태 표면은 `SsooContentAreaState`를 소비한다. 앱은 메시지와 variant만 주입하고 중앙 정렬, spinner, typography, background token을 직접 소유하지 않는다.

- `SsooSidebarShell`
  - `collapsible` mode가 유일한 앱 sidebar 동작의 low-level shell이다.
  - `expanded=true`면 expanded width를 main offset에 반영한다.
  - `expanded=false`면 collapsed width를 main offset에 반영하고, sidebar hover 시 expanded width로 커져 full content를 보여준다.
  - header/search/rail/content/footer는 slot으로 받는다.

- `SsooSidebarSurface`
  - 5개 앱의 main sidebar entrypoint다.
  - brand header, collapse toggle, collapsed rail, hover reveal, search toolbar, refresh affordance, section header, section chevron, footer의 표현/동작 계층을 소유한다.
  - 5개 앱 main sidebar의 brand title은 `packages/web-shell/src/app-identity.ts`의 shared identity를 사용하고, brand subtitle은 비워 둔다. 설정 컨텍스트처럼 앱 브랜드가 아닌 보조 surface는 별도 title/subtitle을 주입할 수 있다.
  - brand 영역에 닫기/뒤로가기 같은 action이 필요하면 앱은 `brandAction`의 icon/event만 주입하고, button 크기/색/hover/disabled 양식은 공용 surface가 소유한다.
  - sidebar 검색 입력의 placeholder는 `SSOO_SIDEBAR_SEARCH_PLACEHOLDER`의 “목록 내 검색..”으로 통일한다. 좌측 아이콘, clear 버튼 위치/크기/hover 상태와 rail/clear label 기본값은 공용 surface가 소유하고, 앱은 검색값, 변경/초기화 handler만 주입한다.
  - 앱은 section id/title/icon/expanded/onToggle/children, search value/onChange/onClear, refresh onClick, item click action 같은 도메인 바인딩만 주입한다.
  - 앱 main sidebar에서 `SsooSidebarShell`, `SsooSidebarBrandHeader`, `SsooSidebarToolbarAction`, `SsooSidebarSearchBox`, `SsooSidebarSectionChevron`, `SsooSidebarFooter`, `SsooCollapsedRailButton`을 직접 조립하지 않는다.

- `SsooSidebarBrandHeader`, `SsooSidebarToolbar`, `SsooSidebarToolbarAction`, `SsooSidebarSearchBox`, `SsooSidebarSection`, `SsooSidebarSectionChevron`, `SsooSidebarFooter`
  - sidebar의 브랜드, 검색/도구, toolbar action, section header/collapse affordance, footer shape를 공통화하는 low-level primitive다.
  - collapsed 상태의 label/footer reveal은 공용 prop으로 표현하고 앱별 DOM fork로 만들지 않는다.

- `SsooSidebarTree`, `SsooSidebarSearchableTree`, `filterSsooSidebarTree`
  - main sidebar section content의 flat row, route row, favorite/open-tab row, menu tree, file tree 렌더링을 하나의 tree 경로로 공통화한다.
  - flat row도 leaf node로 표현하며, section header 아래 항목은 tree child처럼 한 단계 들여 그린다.
  - row height, indentation, active/disabled/hover 상태, trailing action group spacing은 공용 tree가 소유한다.
  - main sidebar tree는 `indentStep`, `rowClassName`, `buttonClassName` 같은 format override를 공개하지 않는다.
  - `SsooSidebarSearchableTree`는 `SsooSidebarSurface`의 검색 context를 읽어 각 section 내부 항목을 같은 규칙으로 필터링한다. 검색 중 폴더 node는 자동 확장하고, 검색 0건 상태 문구는 공용 기본값을 사용한다.
  - 앱은 section 정의, 데이터 바인딩, item click action, search text adapter, 필요한 경우 자식 node clone adapter만 소유한다.
  - PMS 메뉴 트리와 DMS 파일 트리처럼 데이터 모델이 달라도 row/section/search/refresh UX는 같은 primitive를 소비해야 한다.
  - `SsooSidebarList`, `SsooSidebarListItem`, `SsooSidebarItem`은 root public API에서 제거하고, 5개 앱 main sidebar content adapter는 `SsooSidebarTree`만 사용한다.

- `SsooSidebarTreeActionButton`, `SsooSidebarTreeNodeIcon`, `SsooSidebarTreeStatusBadge`
  - main sidebar tree row의 후행 action 버튼, node icon 크기/색상, status badge typography를 공통화한다.
  - 앱은 어떤 icon을 쓸지, 어떤 tone/active 상태인지, 클릭 시 어떤 도메인 action을 실행할지만 주입한다.
  - main sidebar content adapter가 직접 `h-control-h-sm`, `group-hover:opacity-*`, `text-[10px]` 같은 row 표현 class를 소유하지 않는다.

- `SsooSidebarState`, `SsooSidebarEmptyState`, `SsooSidebarSectionNote`
  - sidebar section 안의 empty/loading/error/note spacing과 typography를 공통화한다.
  - 앱은 메시지와 상태 종류만 주입하고, 빈 상태/로딩/오류/설명문 layout class를 직접 지정하지 않는다.

- `SsooSettingsSurface`, `SsooSettingsMainPanel`
  - SSOO 전체 앱 설정 화면의 기본 양식을 공통화한다.
  - 도메인 앱은 section/group/item 데이터와 저장/검증/권한 바인딩만 소유하고, 설정 본문 layout은 이 primitive를 소비한다.

- `SsooSettingsBanner`, `SsooSettingsPendingSummary`, `SsooSettingsViewModeTabs`
  - 설정 화면의 오류/성공 상태, 저장 예정 요약, structured/json/diff 같은 보기 모드 segmented control을 공통화한다.
  - 실제 메시지, 변경 항목 계산, JSON/diff renderer는 소비 앱이 소유한다.

- `createSsooSettingsSidebarSections`
  - settings mode sidebar의 검색 결과 section과 설정 메뉴 tree section 렌더링을 공통화한다.
  - 앱은 setting registry, access predicate, active section 판정, section open action, refresh action만 소유한다.
  - 검색 결과 row, section/field status badge, empty state, menu group tree, active status badge 표현은 `web-shell` factory가 `SsooSidebarSurface`/`SsooSidebarTree` 계층으로 만든다.

- `SsooPageBreadcrumb`, `SsooPageHeader`, `SsooPageChromeStack`, `SsooContentPageTemplate`, `SsooPageIndexRail`
  - 문서 페이지, 설정 페이지, Admin 운영 페이지처럼 도메인 목적이 분명한 page surface의 경로 표시, CTA header, 상단 stack gap/padding, content page slot layout을 공통화한다.
  - 공용 컴포넌트는 item/action/icon slot만 받으며, file path parsing, 저장/삭제/검증 같은 도메인 action은 소비 앱이 소유한다.
  - breadcrumb/header/top-stack과 content page slot의 폭, gap, padding, border, overflow, page tone/state는 `web-shell`이 소유한다. `SSOO_PAGE_CHROME_METRICS`, `SSOO_PAGE_CHROME_CLASSES`, `SSOO_CONTENT_PAGE_METRICS`, `SSOO_CONTENT_PAGE_TONE_CLASSES`가 플랫폼 전역 page render metric source다.
  - page tone/state/header/index/panel 보조 색은 `packages/web-shell/src/styles/ssoo-global.css`의 `ssoo-content-page-tone-*`, `ssoo-content-page-state-tone-*`, `ssoo-sectioned-shell-toolbar-tone`, `ssoo-settings-subtle-surface` 같은 CSS-backed class를 사용한다. page recipe 재료에서 `bg-ssoo-content-bg/30`, `bg-ssoo-primary/15`, `text-ssoo-primary/70` 같은 CSS-variable slash opacity utility를 쓰지 않는다.
  - 기본 main content 폭은 975px, left/right sub-content rail과 sidecar 폭은 340px로 맞춘다. raw `contentMaxWidth={null}` 대신 비교형 화면은 `pageVariant="fluid"`, main-only 자율 캔버스형 화면은 `pageVariant="canvas"` recipe variant를 사용한다.
  - Breadcrumb row는 24px, page header는 54px 기준으로 시작해 문서 페이지와 설정 페이지의 상단 위치를 맞춘다. 소비 앱이 설정 색인 rail, 문서 sidecar, 본문 surface에 별도 `min-h-*`, `px-*`, `py-*`, `border-*`, `bg-*` page recipe class를 직접 두지 않는다.
  - 설정 본문 내부 색인이나 페이지 목차형 필수 rail은 `SsooPageIndexRail`을 사용하고, 앱 page가 nav/button/meta chip surface class를 다시 정의하지 않는다.

- `SsooSectionedShell`, `SsooPanelFrame`, `SsooCollapsibleSection`
  - page 본문 toolbar/body/footer 구획, 우측 panel frame, panel section 접기/펼치기 동작을 공통화한다.
  - 하위 UI 조각을 공용화한 뒤, 도메인 중립 page template/recipe는 [Content Page Assembly Standard](content-page-assembly-standard.md)에 따라 `web-shell` recipe로 승격한다.

- `SsooKeyValueSection`, `SsooTextSection`, `SsooChipListSection`, `SsooActivityListSection`
  - sidecar 또는 page 보조 패널 안에서 반복되는 key-value, 설명문, chip list, activity list section 양식을 공통화한다.
  - 최종 도메인 페이지는 소비 앱이 소유하지만, 도메인 로직 없이 slot만 조립하는 페이지 template/recipe는 `web-shell` 소유로 승격한다. DMS `PageTemplate`은 이 승격의 기준 구현이다.

## 설정/제어/운영 UI 표준

설정/제어/운영 표준은 앱 frame primitive를 유지한 채 설정 컨텍스트로 전환하고, 각 slot에 설정용 데이터를 주입하는 구조를 기준으로 한다.

- App frame: `SsooAppFrame`/`SsooWorkbenchShell` 같은 기존 frame primitive를 유지한다. 별도 SettingsShell 컴포넌트 세트를 만들지 않는다.
- Header: 앱별 main header slot은 같은 `SsooAppHeader` entrypoint를 사용한다. 앱 메인 header는 검색/새로 만들기/알림/사용자 메뉴 surface를 같은 순서와 크기로 노출한다. 설정 컨텍스트는 앱 상단 header slot을 유지하되 header 내부 content를 비우고, 설정 sidebar brand 영역의 뒤로가기 action과 `설정` title만 노출한다.
- Sidebar: 설정 진입 시 sidebar slot은 같은 `SsooSidebarSurface` 소비 컴포넌트에 설정 메뉴 트리/검색 데이터를 주입한다. 설정 검색 결과 section과 설정 메뉴 tree section은 `createSsooSettingsSidebarSections`가 만들고, 설정 전용 shell sidebar primitive를 새로 만들지 않는다.
- Settings page tabs: 설정 메뉴 클릭은 frame tabbar slot의 기존 `TabBar`에 설정 페이지 탭을 연다. `TabBar`는 workspace/settings로 탭 데이터를 분리하지 않고 전체 열린 탭 배열을 `SsooMdiTabBar`에 넘긴다.
- Settings mode invariant: 설정 모드가 활성화되면 활성 content tab도 반드시 `/settings/{scope}/{sectionId}` 경로여야 한다. shell만 settings variant이고 active content tab이 문서 탭이면 문서 본문/문서 패널이 설정 화면에 남으므로, frame coordinator는 non-settings active tab을 감지하면 settings mode를 해제하고 `ContentArea`는 공용 MDI의 기본 active-tab 규칙만 따른다.
- Settings mode source of truth: DMS의 settings mode는 독립적으로 오래 살아 있는 flag가 아니라 active tab path에서 파생된다. active tab이 `/settings/{scope}/{sectionId}`이면 settings mode를 켜고, 홈/문서/AI 같은 non-settings tab이 active가 되면 tab store 변경 시점에 settings mode를 즉시 해제한다.
- Main content: 설정 본문은 `ContentArea` keep-alive tab 안에서 `PageTemplate`, `SsooSettingsSurface`, `SsooSettingsMainPanel`, `SsooSettingsBanner`, `SsooSettingsPendingSummary`, `SsooSettingsViewModeTabs`, `SsooPageIndexRail`을 소비한다. JSON/diff/editor/custom slot 같은 실제 본문은 도메인 앱이 소유한다.
- 설정 본문 내부 색인은 `leftSubContentSlot`으로 주입한다. 색인은 현재 section의 field anchor와 section metadata의 `indexItems`로 정의한 custom slot anchor, 변경/오류 상태, 관련 진단 요약처럼 본문 내부 탐색에 한정한다. 이는 접히는 보조 패널이 아니라 설정 본문을 구성하는 필수 sub-content rail이며, rail 폭/패딩/border/overflow는 `SsooContentPageTemplate`이 소유하고 header/item/meta chip 표면은 `SsooPageIndexRail`이 소유한다.

이 표준은 DMS 설정 화면에 먼저 적용하고, 이후 Admin의 설정/제어/운영성 화면에도 같은 경계를 적용한다. Admin 앱 메인 header는 운영 앱이어도 5개 앱 메인 header 기준에 포함되므로 검색, 새 사용자 CTA, 알림, 사용자 메뉴 surface를 유지한다.

## PMS 100% 기준

PMS는 SSOO 플랫폼의 workbench 기준 앱이다. 여기서 말하는 100%는 기능 수량이 아니라, 이후 CRM/SNS/Admin/DMS가 따라올 수 있는 `공용 frame + 도메인 slot/data` 계약이 소스와 런타임에서 동시에 성립한 상태를 뜻한다.

### 100% 완료 조건

1. 외곽 frame은 `@ssoo/web-shell`이 소유한다.
   - PMS 앱 layout은 `SsooWorkbenchShell`을 사용한다.
   - sidebar/header/tabbar/content는 앱 내부 DOM 복사본이 아니라 slot으로 주입한다.
   - frame width, content offset, header/tabbar 위치 계산은 서비스별 재구현을 금지한다.
2. sidebar는 workbench IA의 기준 동작을 제공한다.
   - main sidebar는 `SsooSidebarSurface`를 사용한다.
   - 펼침 상태는 검색, 즐겨찾기, 현재 열린 페이지, 전체 메뉴, 관리자/보조 섹션을 가진다.
   - 접힘 상태는 rail을 제공하고, hover 시 floating panel이 아니라 전체 sidebar가 expanded width로 펼쳐진다.
   - 실제 메뉴/권한/favorite/open-tab 데이터는 PMS store/API가 소유한다.
   - 검색 입력/clear 버튼, refresh action, section chevron, footer, collapsed rail은 `SsooSidebarSurface`가 소유하고, 즐겨찾기/열린 탭 flat row와 전체 메뉴/관리자 recursive row는 모두 앱이 `SsooSidebarTree` node adapter로 주입한다.
   - tree row의 action 버튼/icon/status/state/note 표현은 `SsooSidebarTreeActionButton`, `SsooSidebarTreeNodeIcon`, `SsooSidebarTreeStatusBadge`, `SsooSidebarState`, `SsooSidebarSectionNote`가 소유한다.
3. header는 공용 표면과 도메인 action을 분리한다.
   - 앱 header adapter는 `SsooAppHeader`를 사용한다.
   - 검색 input, primary action, notification trigger/badge, 사용자 메뉴 dropdown 폭의 shape와 검색 placeholder는 공용이고, 검색 상태/submit action/알림 수/사용자 세션은 PMS가 소유한다.
   - 앱 메인 header의 주요 도메인 CTA는 실제 생성 동작으로 연결되어야 하며 장식 버튼, 새로고침, disabled status chip으로 남기지 않는다.
4. tabbar는 MDI workbench 기준 동작을 제공한다.
   - 앱 tabbar adapter는 `SsooMdiTabBar`를 사용한다.
   - 홈 탭은 고정이고, 업무 탭은 열기/활성화/닫기/순서변경/스크롤 컨트롤이 동작한다.
   - tab icon, close action, dirty/status affordance는 `SsooMdiTabBar` 내부 보조 primitive가 소유하고 PMS는 icon 종류와 click action만 주입한다.
5. content area는 keep-alive MDI 계약을 제공한다.
   - 앱 keep-alive entrypoint는 `SsooRegisteredMdiContentArea`이며, pane surface는 `web-shell` 내부의 `SsooMdiContentPane`과 `SsooContentAreaEmptyState`가 담당한다.
   - 열린 탭의 컴포넌트를 동시에 마운트하고 비활성 탭은 숨김 처리하여 state를 보존한다.
   - 비활성 pane의 숨김은 Tailwind `hidden` class와 소비 앱 display class의 CSS 순서에 의존하지 않고, 공용 `SsooMdiContentPane`의 inline display guard가 보장한다.
   - route/page registry는 PMS가 소유하되, 앱 ContentArea는 `SsooRegisteredMdiContentArea`를 통해 registry를 주입하고 등록되지 않은 path는 명시적인 준비 상태로 표시한다.
   - 탭 context를 통해 현재 탭의 title/path/params를 페이지에 제공한다.
6. PMS 메뉴 IA는 기준 업무 진입점으로 정리한다.
   - 1차 기준 메뉴: 홈, 내 프로젝트, 조치 필요, 종료/전환, 전체 운영 현황.
   - request/proposal/execution/transition 및 admin/status route는 전환 안정성을 위해 routable legacy/status entry로 유지할 수 있지만, 기준 좌측 메뉴의 중심은 업무 큐다.
7. 설정/관리 경계는 플랫폼 공용화 원칙을 따른다.
   - SSOO 공통 설정/권한/조직/사용자 운영은 Admin이 owning한다.
   - PMS는 프로젝트 실행/인계/closeout에 필요한 도메인 컨텐츠와 액션을 owning한다.
   - 도메인별 system settings가 필요하면 공용 settings surface/slot 위에 PMS content adapter로 얹는다.
8. 검증은 소스, 빌드, 런타임, Docker 반영까지 닫는다.
   - 소스 계약: `pnpm run verify:ssoo-frame -- --skip-runtime`.
   - PMS readiness: `pnpm run verify:pms-launch -- --skip-runtime`.
   - 빌드: `pnpm --filter @ssoo/web-shell build`, `pnpm --filter @ssoo/web-auth build`, `pnpm --filter web-pms build`.
   - 레포 하네스: `pnpm run codex:preflight`, `pnpm run codex:push-guard`가 `verify:ssoo-frame` 소스 계약을 포함한다.
   - 턴 종료 전 affected Docker 서비스를 rebuild/up 하고 HTTP status를 확인한다.

## 서비스 적용 기준

### PMS

- `SsooWorkbenchShell sidebarMode="collapsible"`를 사용한다.
- PMS sidebar store, open tabs, favorites, section 확장 상태는 PMS가 소유한다.
- PMS main sidebar는 `SsooSidebarSurface`를 사용하고, favorites/open tabs/menu/admin tree node data와 action/search text만 주입한다. 검색 placeholder, clear 버튼, tree filtering, tree row action/icon, empty state 양식은 `web-shell` primitive가 소유한다.
- header와 MDI tabbar의 frame/shape는 `SsooAppHeader`, `SsooMdiTabBar`를 소비한다.
- `ContentArea`는 `SsooRegisteredMdiContentArea`를 소비하는 keep-alive MDI 기준 구현이며 PMS가 SSOO workbench 앱의 100% 기준이다.

### CRM

- `SsooWorkbenchShell sidebarMode="collapsible"`를 사용한다.
- CRM은 opportunity/quote/contract/billing/PMS handoff 메뉴 데이터를 slot으로 바인딩한다.
- collapse toggle, collapsed rail, search toolbar, refresh affordance, section chevron은 `SsooSidebarSurface`를 통해 PMS/Admin/SNS/DMS와 같은 공용 동작을 따른다.
- 전체 메뉴 row/tree 렌더링은 CRM content adapter가 `SsooSidebarSearchableTree`로 주입한다.
- header/tabbar는 PMS 복사본이 아니라 같은 `SsooAppHeader`/`SsooMdiTabBar` primitive를 소비한다.
- CRM header primary CTA는 새 기회/새 프로젝트 계열의 생성 진입점이어야 하며, 목록 새로고침은 header primary CTA로 쓰지 않는다.
- tabbar는 `useTabStore`의 열린 탭 배열과 `SsooMdiTabBar`를 사용한다. CRM 화면이 현재 영업기회 중심이어도 단일 static/home adapter를 두지 않고 full MDI 탭 store/activate/close/reorder 계약을 유지한다.
- content는 route `children` fallback이 아니라 `SsooRegisteredMdiContentArea`를 통해 frame content slot에 명시 주입하고, 페이지 컴포넌트가 frame-level `<main>`/padding/scroll ownership을 다시 소유하지 않는다.

### DMS

- `SsooAppFrame mode="document" sidebarMode="collapsible"` 위에서 workspace/settings context를 전환한다.
- 설정 진입은 `/settings` workspace tab이 아니라 `useSettingsPageNavigationStore.isActive` 기반 설정 모드다. stale `/settings` tab은 `LegacySettingsRedirect`가 설정 모드로 handoff한다.
- 기본 workspace header는 `SsooAppHeader`를 소비한다. 설정 모드에서는 앱 상단 header slot과 `SsooAppHeader` shell은 유지하되 내부 content를 비워 검색/새 문서/알림/사용자 메뉴/설정 보조문구를 노출하지 않는다.
- DMS 알림 패널은 `SsooHeaderNotificationCenter`와 `SsooNotificationPanel`을 소비한다. DMS는 notification stream/query/mutation, 현재 앱 chip 우선순위, document open/access request/publish retry 같은 action만 소유하고, 패널 위치/backdrop/empty/loading/filter chip/read/unread/action button/icon spinner 표면은 `web-shell`이 소유한다.
- 문서 main sidebar는 `SsooSidebarSurface`를 사용하고, 책갈피/현재 열린 페이지/전체 파일/publish 복구 section과 content만 DMS가 주입한다.
- 설정 sidebar도 같은 `Sidebar` adapter의 settings variant로 렌더링하며, brand 영역은 뒤로가기 action과 `설정` title만 표시하고 `SETTING_SECTIONS` registry의 group/section 트리와 검색 결과만 `SsooSidebarSurface`에 주입한다.
- 설정 sidebar의 collapse toggle, collapsed rail, search toolbar, refresh affordance, section chevron, group tree expand/collapse는 문서 main sidebar와 같은 `SsooSidebarSurface`/`SsooSidebarTree` 동작을 따른다. 설정 모드라고 section collapse나 refresh surface를 제거하지 않는다.
- 설정 메뉴 클릭은 `useSettingsPageNavigationStore.openSection()`과 설정 탭 열기를 함께 수행하지만, frame tabbar slot의 `TabBar`는 settings/workspace로 열린 탭 배열을 필터링하지 않고 전체 열린 탭을 같은 `SsooMdiTabBar`에 넘긴다.
- 설정 모드 활성 상태는 settings path를 가진 active MDI tab과 동기화한다. `ContentArea`는 설정 모드 fallback active pane을 만들지 않고 `activeTabId` 하나로 공용 `SsooRegisteredMdiContentArea`의 active pane을 결정한다.
- settings mode는 `useSettingsPageNavigationStore`가 `useTabStore` active tab path를 구독해 동기화한다. 문서 생성/파일 열기/통합 검색처럼 non-settings 탭을 여는 workspace action은 settings mode를 즉시 종료해야 하며, settings mode가 다시 해당 action을 설정 화면으로 되돌려서는 안 된다.
- 문서 파일 트리, 책갈피, 현재 열린 페이지, publish 복구 항목은 데이터와 열기/북마크/retry action만 DMS가 소유하고, row/action/icon/status/state/note 렌더링은 `SsooSidebarTree` 및 sidebar tree/state primitives가 소유한다.
- 설정 페이지 내부는 `PageTemplate` breadcrumb/header, `leftSubContentSlot` 내부 색인, 본문 shell, 상태 banner, 저장 예정 요약, 보기 모드 toggle을 맡는다. section navigation과 내부 색인은 목적이 다르므로 section navigation은 sidebar menu + main tabbar, 내부 색인은 sub-content rail로 분리한다.
- 문서 탭바는 `SsooMdiTabBar`를 소비하고, DMS의 저장/편집/AI 최소화 상태는 데이터/action prop으로 표현한다.
- 문서 content는 `SsooRegisteredMdiContentArea`를 소비하고, DMS는 typed page route registry, tab instance provider, stale route redirect action만 소유한다. DMS registry에서 문서/설정/AI 대화/전역 검색/사용자 surface/DMS 홈은 `contentPage`이고, stale `/settings`, `/access-requests/me` redirect도 `routeHandoffPage` adapter를 통과하는 `contentPage`다. DMS 검색은 `/ssoo/search` 전역 검색 contentPage로만 렌더링하며 `/ai/search` 별도 alias를 두지 않는다.
- settings tab과 document tab이 동시에 mount되어도 비활성 document pane은 공용 `SsooMdiContentPane` inline display guard로 숨겨져야 하며, DMS는 pane layout/display class를 주입하지 않는다.
- DMS `PageTemplate`은 문서/설정/AI 대화 page 조립의 DMS adapter이고 정본 recipe는 `@ssoo/web-shell`의 `SsooContentPageTemplate`이다. DMS에 남는 책임은 breadcrumb path/icon adapter, domain header action adapter, document body/sidecar/custom slot이며, neutral content surface, sidecar lane/toggle, page state surface는 `web-shell`이 소유한다. DMS 검색은 공용 `/ssoo/search` 통합 검색으로만 연결한다.
- DMS 도메인 전용 dark CSS는 editor/prose/document content selector로 제한한다. `.dms-shell` scope 안이라도 shared shell surface의 `.bg-white`, `.bg-gray-*`, `.border*`, `.text-gray-*`, `.shadow*` utility를 재정의하지 않는다.
- DMS toast/assistant panel처럼 도메인 overlay가 header/tabbar offset에 의존하는 경우에도 offset/breakpoint/inset/panel width는 `SSOO_SHELL_METRICS`를 소비한다. overlay의 데이터, 열림 상태, 입력/대화 내용은 DMS가 소유한다.
- DMS sidebar header의 dev/wiki 선택기는 제거한다. 필요해지면 sidebar header control이 아니라 도메인 메뉴 entry로 제공한다.
- 문서 권한/저장소/Git 상태 데이터는 DMS slot/data adapter가 소유한다.

### SNS

- route 기반 social shell도 `SsooAppFrame mode="social" sidebarMode="collapsible"`을 기준으로 한다.
- header는 `SsooAppHeader`를 소비하고, 검색 route/게시물 작성/알림 데이터는 SNS가 소유한다.
- collapsed hover reveal은 별도 SNS 전용 mode가 아니라 공통 collapsible sidebar의 collapsed 상태 동작이다.
- sidebar 내부 검색/refresh affordance와 section 접기/펼치기는 `SsooSidebarSurface`가 소유하고, route 목록은 SNS content adapter가 `SsooSidebarSearchableTree` leaf node로 주입한다.
- SNS tabbar slot은 route strip이 아니라 `useTabStore`의 열린 탭 배열과 `SsooMdiTabBar`를 소비하는 full MDI tabbar다.
- SNS route 진입과 sidebar 메뉴 클릭은 `getSnsShellTabOptions()`를 통해 탭을 열고, route href/active/disabled/access 데이터와 navigation action만 SNS가 소유한다.
- SNS route content는 route `children` fallback이 아니라 `SsooRegisteredMdiContentArea` pane 안에서 `SsooContentAreaSurface`를 소비한다. `ShellPageContainer`는 public page assembly primitive가 아니며, SNS local page와 stale user-surface redirect는 각각 `snsLocalPage`/`routeHandoffPage` adapter를 통과하는 `contentPage`다.

### Admin / Account / Auth

- Admin은 `SsooWorkbenchShell sidebarMode="collapsible"`을 사용한다.
- Admin sidebar 검색/refresh affordance와 section 접기/펼치기는 `SsooSidebarSurface`가 소유하고, navigation row 목록은 Admin content adapter가 `SsooSidebarSearchableTree` leaf node로 주입한다.
- Admin도 tabbar slot에는 `useTabStore`의 열린 탭 배열과 `SsooMdiTabBar`를 소비하는 full MDI tabbar를 주입하고, content slot은 `SsooRegisteredMdiContentArea`를 소비해 shared frame `<main>` 안에 로컬 `<main>`을 중첩하지 않는다.
- Admin header도 `SsooAppHeader`를 소비하고, 사용자 검색, 새 사용자 CTA, 알림 slot, 사용자 메뉴 데이터만 주입한다. Admin은 알림센터 적용 대상에 포함되며 same-origin notification proxy와 공용 알림 hook/panel surface를 사용한다.
- 계정/조직/권한/설정/AI Admin은 같은 frame 위에 얹되, 도메인별 메뉴와 권한 바인딩은 Admin/Auth 쪽이 소유한다.

## 검증 기준

공용 shell 변경 후에는 최소한 다음을 확인한다.

- `pnpm --filter @ssoo/web-shell build`
- `pnpm --filter @ssoo/web-auth build`
- 변경 소비 앱 build, 예: `pnpm --filter web-pms build`, `pnpm --filter web-crm build`, `pnpm --filter web-sns build`, `pnpm --filter web-admin build`, `pnpm --filter web-dms build`
- source contract: `pnpm run verify:ssoo-frame -- --skip-runtime`
- repo preflight/push guard: `pnpm run codex:preflight`, `pnpm run codex:push-guard`
- shared `web-shell` 변경이 런타임에 영향을 주면 affected Docker web surface를 함께 rebuild/restart하고 HTTP status를 확인한다.

## 금지 패턴

```tsx
<SsooSidebar app="pms" />
<SsooSidebar app="crm" />
```

서비스명을 `app` prop으로 받아 자체 분기하는 공용 sidebar primitive는 금지한다. 사용자 노출 서비스명은 `packages/web-shell/src/app-identity.ts`의 visible identity registry가 소유하고, sidebar primitive는 앱이 주입한 title/slot/data만 렌더링한다. 서비스별 의미/권한/데이터는 앱이 소유하고, `web-shell`의 shell primitive는 mode/slot/primitive invariant만 소유한다.

## Changelog

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-06-22 | `verify:ssoo-frame`를 preflight/push guard/PR validation에 연결하고, 앱 TS/TSX 전역의 저수준 MDI content primitive 직접 소비를 차단하는 강제 기준을 추가 |
| 2026-06-19 | `contentPage` 단일 route contract와 UI primitive consumption gate 적용 후 Docker stack 재빌드/기동, HTTP health, access smoke/admin/DMS, PMS launch readiness 검증을 완료하고 `platform-content-page-runtime-handoff.md`를 후속 운영/설정/제어 작업 진입점으로 추가 |
| 2026-06-18 | 원자 UI raw 태그 소비를 `apps/web`, `web-shell`, `web-auth` 전역에서 금지하는 `verify:ui-consumption` 추가 |
| 2026-06-18 | 원자 UI inventory 중간 상태를 제거하고 모든 등록 원자를 `platform` 단일 상태로 정리 |
| 2026-06-18 | 원자 UI inventory 정본과 `verify:ui-primitives` 강제 게이트를 frame system 기준에 추가 |
| 2026-06-18 | `contentPage.render`를 branded `SsooMdiContentPageElement` 반환 계약으로 강화하고, template/helper 또는 승인된 domain adapter helper를 거치도록 frame gate를 보강 |
| 2026-06-18 | `shellPage` route kind와 `ShellPageContainer` public export를 제거하고, `contentPage`의 `pageVariant="main-only"`/`pageVariant="canvas"` recipe가 main-only/canvas 화면을 담당하도록 정정 |
| 2026-06-18 | 앱 ContentArea 진입점을 `SsooRegisteredMdiContentArea` + `defineSsooMdiPageRegistry`로 전환하고, page route를 `contentPage`/`legacyException`으로 분류하는 타입 게이트 기준을 추가 |
| 2026-06-19 | PMS/CRM/SNS/Admin 로컬 페이지와 DMS 홈/stale handoff를 승인된 contentPage adapter로 일괄 승격하고 `legacyException` route kind를 public registry 계약에서 제거 |
| 2026-06-19 | 공용 user profile/settings surface 내부의 별도 폭 재정의와 page-level title 중복을 금지하고 5앱 canonical `__user` route-policy rewrite 및 SNS legacy profile/settings handoff를 검증 기준에 추가 |
| 2026-06-17 | DMS access/settings와 PMS DataGrid/request를 선별 UI 기준선으로 정의하고 `selected-web-ui-primitives` 검증 기준 추가 |
| 2026-06-17 | `SsooContentPageTemplate`을 `web-shell` recipe 정본으로 추가하고 content page main/sub-content/sidecar/bottom/state slot 스타일 책임을 공용화 |
| 2026-06-17 | `@ssoo/web-ui`를 Tailwind preset과 기본 UI primitive 공용 경계로 추가하고 `web-shell`의 frame/page recipe 책임과 분리 |
| 2026-06-22 | DMS `/ai/search` 별도 화면과 호환 alias를 제거하고 `/ssoo/search` 단일 진입점으로 고정, 기존 DMS AI 검색 sidecar/기록/AI 첨부 표면은 공용 검색 모듈에서 유지 |
| 2026-06-18 | 기존 DMS AI 검색 화면 본체를 `SsooAiSearchPage` 계열 공용 모듈로 물리 승격하고, `SsooGlobalSearchPage`를 그 공통 모듈의 전역 검색 adapter로 정리해 5개 앱 `/ssoo/search` route를 `contentPage`로 승격 |
| 2026-06-17 | header/sidebar 검색 문구와 검색 표면을 공용화하고, sidebar 내부 필터링은 `SsooSidebarSearchableTree`, header 통합 검색은 DMS 검색 기준을 반영한 `SsooGlobalSearchPage` adapter + 서버 `/api/search` provider 조합으로 5개 앱에 적용 |
| 2026-06-17 | `ShellFrame` root public export와 frame/tabbar metric override prop을 제거하고, `SsooTabBarShell`을 `SsooMdiTabBar` 내부 primitive로 고정 |
| 2026-06-17 | content-area 내부 페이지 조립 정본을 별도 표준 문서로 분리하고, DMS PageTemplate을 web-shell recipe 승격 기준 구현으로 정정 |
| 2026-06-17 | 알림센터 typography를 공용 `web-shell` 표면으로 고정하고 앱-local text token 의존을 제거 |
| 2026-06-17 | 5개 앱 header primary CTA 폭을 `새 프로젝트` 기준 공용 metric으로 고정 |
| 2026-06-17 | shell metric/theme preset 정본을 `SSOO_SHELL_METRICS`/`SSOO_THEME_PRESETS`로 고정하고, 5개 앱 theme token/width/breakpoint/panel style 소유를 `web-shell`로 이관 |
| 2026-06-17 | `SsooHeaderNotificationCenter`/`SsooNotificationPanel`과 `SsooContentAreaState`를 5개 앱 shell 표현 계약에 포함하고 DMS 알림 패널/backdrop/loading/action icon spinner를 공용화 |
| 2026-06-17 | 탭 item 전체 hit-area가 클릭 활성화와 drag reorder를 함께 담당하도록 tabbar interaction 계약을 보강 |
| 2026-06-16 | `SsooMdiTabbedContentArea`의 앱별 pane format override를 제거하고 5개 앱 content pane 형식/overflow/background를 `web-shell` 기본값으로 고정 |
| 2026-06-16 | 5개 앱 메인 header 검색/생성 CTA/알림 slot/사용자 메뉴 dropdown 폭을 공용 표면 계약으로 고정하고, Admin 알림 slot과 notification proxy를 적용 |
| 2026-06-16 | 5개 앱 header entrypoint를 `SsooAppHeader`로 정렬하고 action/search/notification trigger/user-menu sizing 표면을 공용화 |
| 2026-06-16 | DMS settings mode source of truth를 active tab path로 고정하고 non-settings tab 활성화 시 settings mode를 즉시 해제하는 상태 전이 계약 추가 |
| 2026-06-16 | CRM/SNS/Admin의 단일 home/route strip 표현을 제거하고 5개 앱 모두 `SsooMdiTabBar` + `SsooMdiTabbedContentArea` full MDI 탭/컨텐트 흐름으로 정렬 |
| 2026-06-16 | MDI 비활성 pane 숨김을 Tailwind `hidden` class가 아니라 `SsooMdiContentPane` inline display guard로 보장해 소비 앱 display class와 충돌하지 않도록 고정 |
| 2026-06-16 | Tabbar public API에서 route/static/none mode와 route-specific primitive를 제거하고 MDI-only tabbar surface로 정렬 |
| 2026-06-15 | DMS settings mode와 active content tab 불일치로 문서 panel이 설정 화면에 남는 혼합 상태를 차단하는 frame invariant를 추가 |
| 2026-06-15 | `SsooTabBarItem` public API에서 arbitrary `closeSlot` escape hatch를 제거해 tab action surface를 데이터/action prop 계약으로 고정 |
| 2026-06-15 | DMS settings sidebar의 refresh affordance, section collapse, group tree expand/collapse를 main sidebar와 같은 공용 동작 계약으로 고정 |
| 2026-06-15 | Tabbar action/status/icon과 MDI/content surface를 `web-shell` primitive로 승격하고 PMS/DMS/SNS/CRM/Admin content slot 표면을 정렬 |
| 2026-06-15 | DMS 설정 화면 기준을 메인 frame 4슬롯 유지, settings sidebar 메뉴 트리, 기존 `TabBar` 설정 페이지 탭, `leftSubContentSlot` 내부 색인으로 재정렬 |
| 2026-06-12 | DMS 설정 화면을 `ContentArea`의 일반 `/settings` 탭이 아니라 공유 frame primitive 위의 설정 모드로 재정렬하고, 설정 section navigation은 frame tabbar slot의 내부 탭으로 정리 |
| 2026-06-12 | Admin/CRM/PMS/DMS/SNS route middleware를 `@ssoo/web-shell/route-policy` helper로 정렬하고, Next 정적 분석 제약상 matcher만 앱별 리터럴로 유지. Admin route constants 및 CRM middleware를 추가해 route policy drift를 제거 |
| 2026-06-12 | 5앱 Next config를 `packages/web-shell/next-config.cjs` factory로 승격하고, 공통 security headers/transpile/standalone/output tracing 및 전역 Gravatar image remote pattern을 중앙화. DMS PDF/canvas 외부 패키지는 factory override로 유지 |
| 2026-06-12 | 설정 본문 보조 sidebar를 section 전환 navigation이 아닌 현재 section 내부 색인으로 정의 |
| 2026-06-12 | Admin/SNS 검색 0건 상태와 DMS 설정 sidebar brand/clear action을 `SsooSidebarSurface`/state 계약으로 흡수해 앱별 sidebar 양식 편차를 제거 |
| 2026-06-12 | 5앱 Next security headers를 `packages/web-shell/next-security-headers.cjs` 로 공용화하고, frame-ancestors/base-uri/object-src CSP baseline 및 nosniff/referrer/frame/permissions headers를 앱별 config drift 없이 소비하도록 정렬 |
| 2026-06-12 | 설정/제어/운영 UI 표준을 공유 frame context 전환 + settings sidebar data variant + settings tabbar/content surface 조합으로 정리 |
| 2026-06-12 | main sidebar 검색 clear, tree row action/icon/status, empty/loading/error/note 양식을 `web-shell` primitive로 승격해 앱별 className 주입을 차단 |
| 2026-06-12 | 5개 앱 main sidebar section content를 flat list/file tree/menu tree 구분 없이 `SsooSidebarTree` leaf/tree node adapter로 통일 |
| 2026-06-12 | 5개 앱 main sidebar의 표현/동작 계층을 `SsooSidebarSurface`로 통일하고 앱은 도메인 section/content/action만 주입하는 기준으로 정리 |
| 2026-06-11 | Admin/SNS sidebar도 검색 toolbar, refresh affordance, collapsible section, section chevron까지 5앱 공통 내부 구조에 맞추도록 기준 보강 |
| 2026-06-11 | sidebar 내부 공용화 범위를 PMS/DMS에서 5개 앱 전체로 확장하고 CRM/Admin/SNS의 search/refresh/list/tree row도 `SsooSidebar*` primitive 소비 기준으로 정렬 |
| 2026-06-11 | sidebar 내부 검색/toolbar action/section chevron/flat list/tree/filter primitive를 `web-shell`로 공용화하고 PMS/DMS 소비 기준 반영 |
| 2026-06-11 | 설정 화면 공통 양식을 `SsooSettings*` primitives로 추가하고 DMS 설정 페이지 내부 layout/status/view-mode 소비 기준 반영 |
| 2026-06-11 | 5개 앱 sidebar를 toggle + collapsed hover expand 단일 contract로 통일하고 DMS dev/wiki selector 제거 기준 추가 |
| 2026-06-09 | slot+mode 기반 SSOO frame system 정본 문서 추가 |
