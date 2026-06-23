---
title: Content Page Assembly Standard
owner: platform-team
status: active
lastReviewed: 2026-06-22
---

# Content Page Assembly Standard

이 문서는 SSOO content-area 안쪽에 렌더링되는 내부 페이지의 표준 조립 규칙을 정의한다. 앱 외곽 shell/frame 표준이 아니라, 열린 탭 안에서 보이는 페이지가 어떤 공용 재료와 recipe로 구성되어야 하는지를 다룬다.

## 결정 요약

- DMS 문서 페이지를 SSOO 내부 페이지 조립의 골든 이그잼플로 둔다.
- 최종 도메인 페이지는 각 도메인이 소유한다. 같은 최종 페이지가 여러 앱에서 재사용되기 전까지는 도메인 `pages/**`에 둔다.
- 페이지 template/recipe는 도메인 페이지보다 아래, `web-shell` primitive보다 위에 있는 공용 조합형이다. 도메인 로직 없이 slot을 열고 `web-shell` 재료를 조립하기만 한다면 `packages/web-shell`로 승격한다.
- `web-shell`은 page chrome, content surface, page tone/state, sub-content rail, sidecar, section shell, settings surface 같은 공용 재료와 기본 recipe를 소유한다.
- `web-ui`는 Tailwind preset과 Button/Badge/Card/Input/Table 같은 기본 UI primitive를 소유한다.
- 도메인 앱은 데이터 조회/저장, 권한, 도메인 action, body renderer, custom panel/content slot만 소유한다.

## 조립 계층

```text
apps/*/components/pages/{Feature}Page.tsx
  -> domain final assembly page
  -> data, permission, action, domain body/panel/custom slots

packages/web-shell/src/*PageTemplate*.tsx
  -> platform page recipe
  -> breadcrumb/header/main/sub-content/sidecar/bottom/state slots composition

packages/web-shell/src/page-*.tsx, settings-*.tsx, sectioned-shell.tsx
  -> platform page materials
  -> metrics, surface, section, navigation, panel, state primitives

packages/web-ui/src/*.tsx, packages/web-ui/tailwind-preset.cjs
  -> platform design system primitives
  -> semantic typography, spacing, radius, Button/Badge/Card/Input/Table
```

현재 `packages/web-shell/src/content-page-template.tsx`의 `SsooContentPageTemplate`이 이 구조의 정본 recipe다. DMS `apps/web/dms/src/components/templates/PageTemplate.tsx`는 DMS breadcrumb/header/icon/action adapter로만 유지한다.

## 골든 이그잼플

DMS `DocumentPage`가 표준 최종 형태다.

- `DocumentPage`는 문서 load/save/edit/ACL/collaboration/template/document-assist flow를 소유한다.
- `SsooContentPageTemplate`은 breadcrumb, header, main content slot, optional left/right sub-content slot, optional sidecar slot, optional bottom panel slot, state surface를 조립한다.
- `DocumentPanel`, viewer, editor, diff, inline compose surface는 DMS 도메인 slot이다.
- sidecar 내부의 key-value, chip, text, activity section은 가능한 한 `web-shell` panel section primitive를 사용한다.

이 기준을 만족하는 새 페이지는 도메인 page가 recipe slot에 데이터를 주입한다. recipe를 복사해서 앱별로 새 DOM/class 계층을 만들지 않는다.

## Web-shell 재료

이미 공용화된 재료:

- `SsooPageBreadcrumb`
- `SsooPageHeader`
- `SsooPageChromeStack`
- `SsooContentPageTemplate`
- `SSOO_PAGE_CHROME_METRICS`
- `SSOO_PAGE_CHROME_CLASSES`
- `SSOO_CONTENT_PAGE_METRICS`
- `SSOO_CONTENT_PAGE_TONE_CLASSES`
- `SsooPageIndexRail`
- `SsooSectionedShell`
- `SsooPanelFrame`
- `SsooCollapsibleSection`
- `SsooKeyValueSection`
- `SsooTextSection`
- `SsooChipListSection`
- `SsooActivityListSection`
- `SsooSettingsPage`
- `SsooSettingsSurface`
- `SsooSettingsMainPanel`
- `SsooSettingsBanner`
- `SsooSettingsPendingSummary`
- `SsooSettingsViewModeTabs`

## Web-ui 재료

이미 공용화된 재료:

- `@ssoo/web-ui/tailwind-preset`
- `Button`
- `Badge`
- `Card`
- `Input`
- `NativeSelect`
- `Table`
- `Textarea`

내부 페이지는 이 기본 primitive를 직접 소비하거나, 기존 앱 import 호환이 필요하면 앱 local `components/ui/*` thin re-export를 통해 소비한다. 새 페이지에서 같은 primitive를 앱 로컬에 다시 구현하면 공용화 누수로 본다.

현재 하드 게이트 대상은 `apps/web`, `packages/web-shell`, `packages/web-auth`의 TSX surface 전체다.

위 경로에서는 원시 `button/input/textarea/select/table/thead/tbody/tfoot/tr/th/td`를 직접 렌더링하지 않고 `@ssoo/web-ui` primitive 또는 앱 thin adapter를 소비한다. 상태 토큰/칩은 Badge를 사용한다. `verify:ui-consumption`이 이 기준을 오류로 검증한다.

승격 대상 재료:

- settings field/card primitives: 여러 앱에서 structured settings field를 공유하기 시작하는 시점에 승격

## Recipe 승격 기준

아래 조건을 모두 만족하면 recipe는 `web-shell`로 올린다.

- 도메인 API, store, route path parser, permission check를 import하지 않는다.
- body/sidecar/header action/breadcrumb item/sub-content/bottom-panel item을 slot 또는 data prop으로만 받는다.
- layout metric, surface class, panel toggle, loading/error/empty surface처럼 페이지 구조 반복을 소유한다.
- 앱별 visual override 없이 theme token과 semantic utility만 사용한다.
- DMS 외 페이지가 같은 구조를 재사용할 수 있다.

아래 조건 중 하나라도 해당하면 도메인에 남긴다.

- 문서, 프로젝트, 고객, 게시글처럼 특정 도메인 명사를 직접 알고 있다.
- 특정 API 응답, Zustand store, 권한 capability를 직접 읽는다.
- renderer/editor/viewer처럼 도메인 콘텐츠 해석을 수행한다.
- 한 앱에서만 의미 있는 custom slot 구현이다.

## 스타일 책임

`web-shell` 책임:

- page chrome 높이, gap, padding, min-height
- content page slot의 폭, gap, padding, border, background, radius, overflow
- constrained content surface의 문서형 최대 폭과 가운데 정렬
- page tone/background와 loading/error/empty/denied state surface
- main content 기본 폭 975px
- left/right sub-content rail 기본 폭 340px
- sidecar 기본 폭 340px
- settings/page index rail의 header, item, meta chip 표현
- sidecar lane/toggle/overlay 상태
- bottom panel 높이와 접힘/펼침 frame
- section shell의 toolbar/body/footer frame
- settings surface, banner, pending summary, view-mode tabs
- page loading/error/empty state surface

도메인 책임:

- 문서 prose, editor, diff, viewer 본문 스타일
- 도메인 form field의 의미와 validation copy
- 도메인 custom slot의 데이터 배치
- 도메인 아이콘 선택과 action handler
- API/runtime/권한 상태에 따른 표시 여부

page tone과 state surface는 `SsooContentPageTemplate`의 `pageTone` 의미 prop과 `ssoo-content-page-tone-*`/`ssoo-content-page-state-tone-*` CSS 클래스가 정본이다. `bg-ssoo-content-bg/30`, `bg-ssoo-primary/15`, `text-ssoo-primary/70`처럼 CSS variable 색상에 Tailwind slash opacity를 직접 붙이는 방식은 빌드 CSS 생성이 보장되지 않으므로 page recipe 재료에서 금지한다.

앱 로컬에서 `rounded-*`, `border-*`, `bg-white`, `px-*`, `py-*`를 반복해 page recipe surface를 만들거나 `contentMaxWidth={null}` 같은 raw opt-out으로 표준 폭을 끄면 공용화 누수로 본다. full-width가 필요한 비교형 화면은 `pageVariant="fluid"`, main-only 자율 캔버스형 화면은 `pageVariant="canvas"` 같은 공용 recipe variant로 표현한다. 단, 도메인 콘텐츠 내부의 카드/행/본문 표현은 그 도메인에서 소유할 수 있다.

## Settings page 위치

Settings page는 문서 페이지와 같은 내부 페이지 조립 표준을 따른다. 다만 settings 자체가 골든 예제는 아니고, 문서 페이지 recipe 위에 settings 전용 재료를 얹는 파생 사례다.

- 완성 settings page recipe는 `packages/web-shell`의 `SsooSettingsPage`가 소유한다. 앱이나 도메인은 `PageTemplate` 복사본으로 설정 page chrome/index/body shell을 다시 조립하지 않는다.
- breadcrumb/header/main content slot은 `SsooSettingsPage`가 `SsooContentPageTemplate` 위에서 조립한다.
- `SsooSettingsPage`의 기본 page title은 `설정`이며, 앱/도메인이 명시 title을 넘길 때만 이를 대체한다.
- 설정 본문 내부 색인은 `leftSubContentSlot`으로 주입한다. 이는 접히는 보조 패널이 아니라 설정 본문을 탐색하기 위한 필수 sub-content rail이다.
- 색인 rail의 header/item/meta chip 표면은 `SsooSettingsPage` 내부의 `SsooPageIndexRail`을 사용하고, 도메인 settings page가 nav/button/chip class를 직접 소유하지 않는다.
- settings 본문 shell은 `SsooSettingsPage` 내부의 `SsooSettingsSurface`와 `SsooSettingsMainPanel`을 사용한다.
- 저장 예정 요약, 상태 banner, view-mode segmented control은 `SsooSettings*` primitive 또는 `SsooSettingsPage` slot으로 배치한다.
- 설정 schema, persistence API, 권한, validation, JSON/diff renderer, custom slot은 도메인이 소유한다.

## Framework gate

신규 내부 페이지는 아래 순서로 판단한다.

1. DMS 문서 페이지 골든 구조와 같은 recipe로 표현 가능한가?
2. 가능하면 `web-shell` recipe를 사용한다.
3. recipe에 필요한 neutral slot/material이 없으면 `web-shell`에 추가한다.
4. 도메인 의미가 있는 본문/패널/custom slot은 도메인에 둔다.
5. recipe 복사본을 앱 로컬에 만들려면 문서에 예외 사유와 제거 조건을 남긴다.
6. Button/Badge/Card/Input/NativeSelect/Table/Textarea 등 원자 UI가 필요한 화면이면 `@ssoo/web-ui` primitive 또는 앱 thin adapter를 사용하고, 필요한 primitive가 없으면 로컬 class recipe를 만들기 전에 `@ssoo/web-ui` inventory 원자로 추가한다.

## Typed route registry

content-area에 탭이 바인딩되는 경로는 앱 `ContentArea`에서 임의 `renderTab(): ReactNode`로 처리하지 않는다. 앱은 `SsooRegisteredMdiContentArea`에 `defineSsooMdiPageRegistry()`로 만든 route registry를 주입한다. `SsooMdiTabbedContentArea`는 `web-shell` 내부 구현이며 root public API로 앱에 노출하지 않는다. 앱 TS/TSX 소스는 `SsooMdiContentArea`, `SsooMdiContentPane`, `SsooMdiTabbedContentArea`를 직접 소비하지 않고, 저수준 MDI content primitive 우회는 `verify:ssoo-frame`에서 실패 처리한다.

route registry의 route는 `contentPage`만 사용한다.

- `contentPage`: 표준 내부 페이지 조립 대상. `SsooContentPageTemplate` 또는 이를 감싼 승인 domain/shared-surface/handoff adapter를 통해 breadcrumb/header/main/sub-content/sidecar/bottom/state 구조를 사용해야 한다.
- stale route redirect는 화면 recipe 예외가 아니라 `routeHandoffPage` adapter boundary를 통과하는 `contentPage`다.

`shellPage` route kind와 `ShellPageContainer`는 public page assembly contract가 아니다. main-only 화면은 별도 route kind를 만들지 않고 `SsooContentPageTemplate`의 `pageVariant="main-only"` 또는 `pageVariant="canvas"`로 표현한다. 공용 사용자 profile/settings surface도 `@ssoo/web-auth`의 `createSsooUserSurfaceRouteContentPageElement()`를 통해 `contentPage`로 등록한다. 이 route-level user-surface helper는 내부에서 `createSsooUserSurfaceContentPageElement()`와 `SsooUserSurfacePage`를 함께 소유하므로 앱 ContentArea가 `SsooUserSurfacePage`, profile tab path, page description, page tone을 직접 조립하지 않는다. 하위 content-page helper는 `createSsooSharedSurfaceContentPageElement()`를 감싸 `SsooContentPageTemplate`의 기본 constrained main 폭을 유지하고, 유저 표면 내부 카드가 실제 surface를 소유하도록 `contentSurface="plain"`을 고정하며, title/description/surfaceId/page tone을 중앙에서 결정한다. 사용자 프로필은 `pageTone="profile"`을 사용하고 계정 설정은 `pageTone="settings"`를 사용해 두 표면의 의미를 분리하되, 둘 다 플랫폼 content-page 배경 톤을 따른다. shared user profile/settings는 `mainContentLayout`, `mainContentMaxWidth`, `mainContentSurface` override로 표준을 끄지 않고, 내부 root도 `max-w-*`/`mx-auto`로 별도 page 폭을 재정의하지 않는다. page title, description, breadcrumb, header action은 shared-surface content page helper가 소유하므로 `SsooUserSurfacePage` 내부에서 `내 설정` 같은 page-level `h1`/description을 다시 렌더링하지 않는다. profile/settings의 저장/편집/취소 같은 page-level action은 `useSsooSharedSurfacePageHeaderActions()`로 shared header action bridge에 등록하며 본문 안에 별도 page action button을 렌더링하지 않는다. Admin/CRM/PMS/DMS/SNS는 canonical `/__user/profile/:userId`와 `/__user/settings` route-entry를 동일하게 허용해야 하며, App Router 물리 page를 만들지 않고 `SSOO_SHARED_USER_SURFACE_PATH_PREFIX` 기반 route-policy rewrite로 루트 셸을 렌더링한다. `@ssoo/web-auth` account center resolver의 기본 profile/settings href도 canonical `/__user/profile/me`, `/__user/settings`이고, legacy `/profile/*`, `/settings` 입력은 `normalizeSsooUserSurfaceRouteEntryPath()`/`parseSsooUserSurfaceRouteEntry()` shared helper boundary에서 canonical path로 정규화한다. legacy `/profile/*`, `/settings` direct entry redirect는 SNS compatibility boundary에 한정하며, Admin/CRM/PMS/DMS middleware는 `/settings` 같은 도메인 route를 공용 사용자 표면으로 가로채지 않는다. 각 앱 layout의 direct URL bootstrap도 `parseSsooUserSurfaceRouteEntry()`/`getSsooUserSurfaceTabId()`로 canonical user-surface MDI tab을 열어야 하며, 홈/도메인 local page tab을 active로 둔 채 ContentArea registry에 도달하게 해서는 안 된다. 실제 surface 렌더링은 browser URL의 canonical pathname을 읽은 ContentArea route registry가 맡는다.

`contentPage` route의 `render`는 임의 `ReactNode`를 반환하지 않는다. `SsooContentPageTemplate`을 직접 쓰는 page는 `createSsooContentPageTemplateElement()`를 반환하고, DMS처럼 도메인 breadcrumb/header adapter가 필요한 page는 `SSOO_CONTENT_PAGE_ADAPTER_NAMES`에 등록된 `adapterName`을 명시한 뒤 `createSsooContentPageAdapterElement()`를 반환한다. 이 helper가 반환하는 branded `SsooMdiContentPageElement`가 타입 계약이므로, 새 `contentPage`는 공용 recipe 또는 승인된 domain adapter boundary를 통과하지 않으면 빌드되지 않아야 한다.

DMS 기준 분류:

- 문서 페이지, 설정 페이지, AI 대화, 전역 검색은 `contentPage`다.
- 검색 page body, toolbar, results panel, search utility는 `@ssoo/web-shell`의 `SsooAiSearchPage` 계열 공용 모듈이 소유한다. 앱은 전역 검색 API adapter와 결과 열기 action만 주입한다.
- 전역 검색은 `SsooGlobalSearchPage` adapter를 통해 같은 `SsooAiSearchPage` 공용 모듈을 소비하는 `contentPage`다. DMS 검색 진입점은 `/ssoo/search` 하나이며 `/ai/search` 호환 alias를 유지하지 않는다. source filter chip을 선택한 경우에만 `sourceApp` filter가 적용되며, 기본 검색 범위는 모든 provider다. 기존 DMS AI 검색의 sidecar/검색 기록/인기 검색어/AI 첨부 표면은 공용 `SsooAiSearchPage` 경로에서 그대로 유지한다.
- 사용자 profile surface는 공용 shared-surface content page helper를 통과하고, 사용자 account settings surface는 `SsooSettingsPage` content page helper를 통과하는 `contentPage`다. 둘 다 `@ssoo/web-auth`의 `createSsooUserSurfaceRouteContentPageElement()` 경계에서 중앙 조립한다.
- stale `/settings`, `/access-requests/me` handoff는 `routeHandoffPage` adapter를 통과하는 `contentPage`이며 설정 page route로 제거될 호환 경로다.
- DMS 홈은 `DMS PageTemplate` adapter를 통과하는 `contentPage`다.
- PMS/CRM/SNS/Admin 로컬 화면은 기존 화면 외형을 보존하는 앱별 local page adapter를 통과하는 `contentPage`다. 화면을 개별 개선할 때는 이 adapter 내부의 도메인 page를 `SsooContentPageTemplate` 직접 recipe 또는 더 좁은 domain recipe로 점진 분리한다.

## Migration plan

1. DMS `PageTemplate`의 도메인 중립 부분을 `SsooContentPageTemplate`으로 추출한다.
2. DMS `Header`/`Breadcrumb`는 도메인 icon/action/path adapter로 축소한다.
3. `PageTemplate`의 content surface, page tone, sidecar lane/toggle, loading/error/empty/denied state surface class를 `web-shell` 재료로 이전한다.
4. DMS `DocumentPage`는 새 recipe를 소비하는 골든 예제로 고정한다.
5. `SettingsPage` 완성 recipe는 `SsooSettingsPage`로 `web-shell`에 승격하고, DMS에는 `SETTING_SECTIONS`, store/API, validation, JSON/diff/custom slot adapter만 남긴다.
6. 5개 앱 `ContentArea`는 `SsooRegisteredMdiContentArea`와 typed route registry만 소비하게 전환한다.
7. PMS/SNS/CRM/Admin 내부 페이지는 앱별 local page adapter를 통과하는 `contentPage`로 일괄 승격한다.
8. `verify:ssoo-frame`가 app-local recipe clone, page surface class 누수, `legacyException` route kind 재유입, 앱 전역 저수준 MDI content primitive 직접 소비를 탐지하도록 유지한다.

## Changelog

| 날짜 | 변경 내용 |
| --- | --- |
| 2026-06-23 | 완성 settings page recipe를 `SsooSettingsPage`로 `web-shell`에 승격하고, DMS 설정과 공용 account settings가 domain adapter만 주입하도록 content-page 조립 기준을 강화 |
| 2026-06-23 | 공용 user profile/settings surface의 page tone을 `profile`/`settings`로 분리하고, 프로필이 `neutral` 배경으로 회귀하지 않도록 content-page tone 검증을 강화 |
| 2026-06-22 | 5개 앱 direct user-surface URL bootstrap을 `@ssoo/web-auth` route-entry helper로 고정하고 canonical `/__user/*` route-policy rewrite와 layout bootstrap을 검증 기준으로 강화 |
| 2026-06-22 | SNS middleware가 route-only `@ssoo/web-auth/user-surface-routing` helper로 legacy `/profile/*`, `/settings` direct entry를 canonical `/__user/*`로 redirect하도록 content page 접근 경로 gate를 강화 |
| 2026-06-22 | 공용 account center resolver 기본 profile/settings href를 canonical `/__user/profile/me`, `/__user/settings`로 고정하고 legacy `/profile/*`, `/settings` 입력을 shared resolver boundary에서 정규화하도록 content page 접근 경로 표준과 검증을 보강 |
| 2026-06-22 | SNS legacy `/profile/*`, `/settings` handoff parsing을 `@ssoo/web-auth` shared route-entry helper로 이동해 앱 layout이 user-surface route construction을 중복하지 않도록 content page 접근 경로 gate를 강화 |
| 2026-06-22 | 공용 user profile/settings page-level action을 `useSsooSharedSurfacePageHeaderActions()` 기반 shared header action bridge에 등록하고, user-surface route/content/body 조립을 `@ssoo/web-auth` `createSsooUserSurfaceRouteContentPageElement()`로 중앙화해 앱별 `SsooUserSurfacePage` 직접 렌더링과 page metadata 조립 회귀를 `verify:ssoo-frame`/`verify:auth-commonization`에서 차단 |
| 2026-06-22 | `verify:ssoo-frame`를 preflight/push guard/PR validation에 연결하고, 앱 전역 저수준 MDI content primitive 직접 소비 금지 기준을 추가 |
| 2026-06-19 | `contentPage` 단일 route 계약 전환 후 Docker stack 재빌드/기동, 5개 웹 앱 HTTP 응답, access smoke/admin/DMS, PMS launch readiness 검증을 완료하고 후속 운영/설정/제어 작업 핸드오프 기준으로 고정 |
| 2026-06-19 | 공용 user profile/settings surface 내부에서 page-level title/description과 별도 `max-w-*`/`mx-auto` 폭을 재정의하지 못하도록 shared-surface 표준과 검증 기준을 강화하고, 5앱 canonical `__user` route-entry를 route-policy rewrite 계약으로 추가 |
| 2026-06-19 | PMS/CRM/SNS/Admin 로컬 페이지와 DMS 홈/stale handoff를 승인된 contentPage adapter로 승격하고 route registry를 `contentPage` 단일 기준으로 잠금 |
| 2026-06-18 | Web-ui primitive raw 태그 소비 하드 게이트를 앱/web-shell/web-auth 전역으로 확장 |
| 2026-06-22 | DMS `/ai/search` 별도 화면과 호환 alias를 제거하고 `/ssoo/search` 단일 진입점으로 고정, 기존 DMS AI 검색 sidecar/기록/AI 첨부 표면은 공용 검색 모듈에서 유지 |
| 2026-06-18 | 기존 DMS AI 검색 화면 본체를 `SsooAiSearchPage` 계열 공용 모듈로 물리 승격하고, 전역 검색 route를 그 공용 모듈을 소비하는 `SsooGlobalSearchPage` adapter 기반 `contentPage`로 승격 |
| 2026-06-18 | `contentPage.render`를 branded `SsooMdiContentPageElement` 반환 계약으로 강화하고, `createSsooContentPageTemplateElement`/`createSsooContentPageAdapterElement` helper를 framework gate에 추가 |
| 2026-06-18 | `shellPage` route kind와 `ShellPageContainer` public export를 제거하고, main-only/canvas 화면은 `contentPage`의 `pageVariant` recipe로 표현하도록 정본화 |
| 2026-06-18 | `SsooRegisteredMdiContentArea`와 typed page route registry를 framework gate 기준으로 추가하고, `contentPage`/`legacyException` 분류 및 DMS 예외 정책을 정본화 |
| 2026-06-17 | DMS access/settings와 PMS DataGrid/request를 선별 UI primitive 하드 게이트 대상으로 추가 |
| 2026-06-18 | page tone/state, 975px main width, 340px sub-content/sidecar width, `SsooPageIndexRail`, `pageVariant="fluid"`/`pageVariant="canvas"` opt-out 규칙을 web-shell recipe 책임으로 정본화 |
| 2026-06-17 | `SsooContentPageTemplate`을 `@ssoo/web-shell` recipe 정본으로 추가하고, DMS `PageTemplate`을 breadcrumb/header adapter로 축소 |
| 2026-06-17 | `@ssoo/web-ui`의 Tailwind preset과 기본 UI primitive를 내부 페이지 조립 재료 계층에 추가 |
| 2026-06-17 | DMS 문서 페이지를 content-area 내부 페이지 조립 골든 이그잼플로 정하고, PageTemplate 계층을 web-shell recipe 승격 대상으로 정의 |
