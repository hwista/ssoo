---
title: SSOO Frame System
owner: platform-team
status: active
lastReviewed: 2026-06-11
---

# SSOO Frame System

SSOO 서비스 shell은 특정 서비스 화면을 다른 서비스가 복사하는 방식이 아니라, `packages/web-shell`의 공용 frame primitive를 소비하는 방식으로 정본화한다.

## 핵심 원칙

- 공용 컴포넌트는 `web-shell`이 소유한다.
- 도메인 서비스는 메뉴, 검색, 액션, 탭, 본문 같은 서비스별 바인딩을 slot/data로 주입한다.
- 5개 앱(PMS/CRM/DMS/SNS/Admin)의 sidebar는 하나의 동작으로 통일한다. 토글로 접기/펼치기를 전환하고, 접힌 상태에서는 rail을 보이다가 마우스 hover 시 전체 sidebar가 펼쳐진다.
- sidebar 동작 차이를 서비스별 optional mode로 만들지 않는다. 도메인 차이는 slot/data로만 표현한다.
- 전역 CSS/token 정본은 `packages/web-shell/src/styles/ssoo-global.css`이며, 각 앱의 `globals.css`는 Tailwind directive/공통 utility를 복제하지 않고 도메인 theme token과 도메인 전용 CSS만 owning한다.
- 표면 제품명은 확정 전까지 `SSOT`를 사용한다. 내부 프로젝트/문서 맥락의 SSOO 명칭과 달리 브라우저 제목 표시줄, 사이드바 브랜드, footer 같은 사용자 노출 surface는 SSOT로 통일한다. 특히 제목 표시줄은 Docker/runtime HTML까지 검증 대상이다.
- 브라우저 제목 표시줄은 `SSOT {앱명} | {도메인 설명}` 형식을 기준으로 한다. 예: `SSOT PMS | 업무 허브`, `SSOT DMS | 문서 허브`, `SSOT SNS | 소셜 허브`, `SSOT CRM | 영업 허브`, `SSOT Admin | 플랫폼 관리`.
- 앱별 색상 theme은 의도된 식별 장치다. 공용화 대상은 색 자체의 단일화가 아니라 header/sidebar/tabbar/content primitive의 형태, slot 구조, 직접 상호작용 계약이다.
- 눈으로 다른 shell surface가 남아 있으면 공용화 미완료로 본다. `SsooAppFrame`을 사용하는 것만으로는 완료가 아니며, header/sidebar/tabbar 표면은 실제 shared primitive를 소비해야 한다.
- 메뉴/프로젝트/문서/사용자 같은 실제 데이터와 클릭 시 주입되는 도메인 action 함수는 각 앱이 소유한다. 데이터 차이나 action 구현 차이는 공용 component를 fork하는 사유가 아니다. 모드는 드러나는 형태/동작 변형을 설명할 때만 사용하고, 도메인 데이터·메뉴·프로젝트·문서 바인딩 자체를 mode로 분류하지 않는다.

## 현재 공용 primitive

- `SsooAppFrame`
  - 앱 전체 shell.
  - `mode`로 workbench/document/social/content-only 성격을 표시한다.
  - `sidebarMode`, `sidebarExpanded`, width 값을 받아 main offset을 공통 계산한다.
  - header/tabbar/sidebar/content를 slot으로 받는다.

- `SsooHeader`
  - SSOO header height/background/action alignment를 공통화한다.
  - 검색, 좌측, 중앙, 액션 영역은 slot으로 받는다.

- `SsooHeaderSearchBox`
  - 공통 header 검색 입력 primitive.
  - 실제 검색 API/상태는 각 서비스가 소유한다.

- `SsooTabBarShell`
  - MDI/static/route tabbar container mode를 제공한다.
  - 스크롤 버튼, 탭 목록, route secondary nav 등은 slot/children으로 주입한다.

- `SsooTabBarHomeButton`, `SsooTabBarItem`, `SsooTabBarControlButton`
  - home tab, 일반 tab, 좌우 control hit-area/active styling을 공통화한다.

- `SsooSidebarShell`
  - `collapsible` mode가 유일한 앱 sidebar 동작이다.
  - `expanded=true`면 expanded width를 main offset에 반영한다.
  - `expanded=false`면 collapsed width를 main offset에 반영하고, sidebar hover 시 expanded width로 커져 full content를 보여준다.
  - header/search/rail/content/footer는 slot으로 받는다.

- `SsooSidebarBrandHeader`, `SsooSidebarToolbar`, `SsooSidebarToolbarAction`, `SsooSidebarSearchBox`, `SsooSidebarSection`, `SsooSidebarSectionChevron`, `SsooSidebarFooter`
  - sidebar의 브랜드, 검색/도구, toolbar action, section header/collapse affordance, footer shape를 공통화한다.
  - collapsed 상태의 label/footer reveal은 공용 prop으로 표현하고 앱별 DOM fork로 만들지 않는다.

- `SsooSidebarList`, `SsooSidebarListItem`, `SsooSidebarTree`, `filterSsooSidebarTree`
  - sidebar 내부 flat row 목록과 recursive tree row 렌더링, indent/disclosure/active/hover/trailing action 구조를 공통화한다.
  - 앱은 section 정의, 데이터 바인딩, item click action, search text adapter만 소유한다.
  - PMS 메뉴 트리와 DMS 파일 트리처럼 데이터 모델이 달라도 row/section/search/refresh UX는 같은 primitive를 소비해야 한다.

- `SsooSettingsSurface`, `SsooSettingsNavigation`, `SsooSettingsMainPanel`
  - SSOO 전체 앱 설정 화면의 기본 양식을 공통화한다.
  - 도메인 앱은 section/group/item 데이터와 저장/검증/권한 바인딩만 소유하고, 좌측 세부 메뉴 + 우측 설정 본문 layout은 이 primitive를 소비한다.

- `SsooSettingsBanner`, `SsooSettingsPendingSummary`, `SsooSettingsViewModeTabs`
  - 설정 화면의 오류/성공 상태, 저장 예정 요약, structured/json/diff 같은 보기 모드 segmented control을 공통화한다.
  - 실제 메시지, 변경 항목 계산, JSON/diff renderer는 소비 앱이 소유한다.

## PMS 100% 기준

PMS는 SSOO 플랫폼의 workbench 기준 앱이다. 여기서 말하는 100%는 기능 수량이 아니라, 이후 CRM/SNS/Admin/DMS가 따라올 수 있는 `공용 frame + 도메인 slot/data` 계약이 소스와 런타임에서 동시에 성립한 상태를 뜻한다.

### 100% 완료 조건

1. 외곽 frame은 `@ssoo/web-shell`이 소유한다.
   - PMS 앱 layout은 `SsooWorkbenchShell`을 사용한다.
   - sidebar/header/tabbar/content는 앱 내부 DOM 복사본이 아니라 slot으로 주입한다.
   - frame width, content offset, header/tabbar 위치 계산은 서비스별 재구현을 금지한다.
2. sidebar는 workbench IA의 기준 동작을 제공한다.
   - `SsooSidebarShell mode="collapsible"`를 사용한다.
   - 펼침 상태는 검색, 즐겨찾기, 현재 열린 페이지, 전체 메뉴, 관리자/보조 섹션을 가진다.
   - 접힘 상태는 rail을 제공하고, hover 시 floating panel이 아니라 전체 sidebar가 expanded width로 펼쳐진다.
   - 실제 메뉴/권한/favorite/open-tab 데이터는 PMS store/API가 소유한다.
   - 검색 입력, refresh action, section chevron, 즐겨찾기/열린 탭 flat list, 전체 메뉴/관리자 recursive tree는 `SsooSidebar*` primitive를 소비한다.
3. header는 공용 표면과 도메인 action을 분리한다.
   - `SsooHeader`, `SsooHeaderSearchBox`, `SsooHeaderActionButton`, `SsooHeaderIconButton`을 사용한다.
   - 검색/알림/사용자 메뉴의 shape는 공용이고, 검색 API/알림 수/사용자 세션은 PMS가 소유한다.
   - 주요 도메인 CTA는 실제 PMS 동작으로 연결되어야 하며 장식 버튼으로 남기지 않는다.
4. tabbar는 MDI workbench 기준 동작을 제공한다.
   - `SsooTabBarShell`, `SsooTabBarHomeButton`, `SsooTabBarItem`, `SsooTabBarControlButton`을 사용한다.
   - 홈 탭은 고정이고, 업무 탭은 열기/활성화/닫기/순서변경/스크롤 컨트롤이 동작한다.
5. content area는 keep-alive MDI 계약을 제공한다.
   - 열린 탭의 컴포넌트를 동시에 마운트하고 비활성 탭은 숨김 처리하여 state를 보존한다.
   - route/page registry는 PMS가 소유하되, 등록되지 않은 path는 명시적인 준비 상태로 표시한다.
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
   - 빌드: `pnpm --filter @ssoo/web-shell build`, `pnpm --filter web-pms build`.
   - 레포 하네스: `pnpm run codex:preflight`.
   - 턴 종료 전 affected Docker 서비스를 rebuild/up 하고 HTTP status를 확인한다.

## 서비스 적용 기준

### PMS

- `SsooWorkbenchShell sidebarMode="collapsible"`를 사용한다.
- PMS sidebar store, open tabs, favorites, section 확장 상태는 PMS가 소유한다.
- header와 MDI tabbar의 frame/shape는 `SsooHeader`, `SsooTabBarShell`, tab primitives를 소비한다.
- `ContentArea`는 keep-alive MDI 기준 구현이며 PMS가 SSOO workbench 앱의 100% 기준이다.

### CRM

- `SsooWorkbenchShell sidebarMode="collapsible"`를 사용한다.
- CRM은 opportunity/quote/contract/billing/PMS handoff 메뉴 데이터를 slot으로 바인딩한다.
- collapse toggle과 collapsed rail은 PMS/Admin/SNS/DMS와 같은 공용 동작을 따른다.
- 검색 입력, refresh affordance, section chevron, 전체 메뉴 row/tree 렌더링은 `SsooSidebarSearchBox`, `SsooSidebarToolbarAction`, `SsooSidebarSectionChevron`, `SsooSidebarTree`를 소비한다.
- header/tabbar는 PMS 복사본이 아니라 같은 `web-shell` primitive를 소비한다.

### DMS

- `SsooAppFrame mode="document" sidebarMode="collapsible"` 위에 기존 문서 트리/탭/설정 shell을 slot으로 주입한다.
- 기본 header와 설정 header는 `SsooHeader`를 소비한다.
- 문서 사이드바와 설정 사이드바는 `SsooSidebarShell`, `SsooSidebarBrandHeader`, `SsooSidebarToolbar`, `SsooSidebarToolbarAction`, `SsooSidebarSearchBox`, `SsooSidebarSection`, `SsooSidebarSectionChevron`, `SsooSidebarList`, `SsooSidebarListItem`, `SsooSidebarTree`, `SsooSidebarFooter`를 소비한다.
- 문서 파일 트리는 파일/폴더 데이터와 열기/북마크 action만 DMS가 소유하고, recursive tree row 렌더링은 `SsooSidebarTree`가 소유한다.
- 설정 페이지 내부의 좌측 세부 메뉴, 본문 shell, 상태 banner, 저장 예정 요약, 보기 모드 toggle은 `SsooSettings*` primitives를 소비한다.
- 문서 탭바는 `SsooTabBarShell`, `SsooTabBarHomeButton`, `SsooTabBarItem`, `SsooTabBarControlButton`을 소비하고, DMS의 저장/편집/AI 최소화 상태는 slot/data로 표현한다.
- DMS sidebar header의 dev/wiki 선택기는 제거한다. 필요해지면 sidebar header control이 아니라 도메인 메뉴 entry로 제공한다.
- 문서 권한/저장소/Git 상태 데이터는 DMS slot/data adapter가 소유한다.

### SNS

- route 기반 social shell도 `SsooAppFrame mode="social" sidebarMode="collapsible"`을 기준으로 한다.
- header는 `SsooHeader`와 header action/search/icon primitive를 소비하고, 검색 route/게시물 작성/알림 데이터는 SNS가 소유한다.
- collapsed hover reveal은 별도 SNS 전용 mode가 아니라 공통 collapsible sidebar의 collapsed 상태 동작이다.
- sidebar 내부 검색/refresh affordance, section 접기/펼치기, route 목록은 SNS 전용 card row가 아니라 `SsooSidebarSearchBox`, `SsooSidebarToolbarAction`, `SsooSidebarSection`, `SsooSidebarSectionChevron`, `SsooSidebarList`, `SsooSidebarListItem`을 소비하고, route/권한/클릭 action만 SNS가 소유한다.
- Secondary strip은 sidebar content가 아니라 shell tabbar slot에 주입되는 route-secondary-nav surface로 둔다.

### Admin / Account / Auth

- Admin은 `SsooWorkbenchShell sidebarMode="collapsible"`을 사용한다.
- Admin sidebar 검색/refresh affordance, section 접기/펼치기, navigation row 목록은 `SsooSidebarSearchBox`, `SsooSidebarToolbarAction`, `SsooSidebarSection`, `SsooSidebarSectionChevron`, `SsooSidebarList`, `SsooSidebarListItem`을 소비한다.
- 계정/조직/권한/설정/AI Admin은 같은 frame 위에 얹되, 도메인별 메뉴와 권한 바인딩은 Admin/Auth 쪽이 소유한다.

## 검증 기준

공용 shell 변경 후에는 최소한 다음을 확인한다.

- `pnpm --filter @ssoo/web-shell build`
- 변경 소비 앱 build, 예: `pnpm --filter web-pms build`, `pnpm --filter web-crm build`, `pnpm --filter web-sns build`, `pnpm --filter web-admin build`, `pnpm --filter web-dms build`
- source contract: `pnpm run verify:ssoo-frame -- --skip-runtime`
- repo preflight: `pnpm run codex:preflight`
- shared `web-shell` 변경이 런타임에 영향을 주면 affected Docker web surface를 함께 rebuild/restart하고 HTTP status를 확인한다.

## 금지 패턴

```tsx
<SsooSidebar app="pms" />
<SsooSidebar app="crm" />
```

서비스명을 아는 공용 sidebar는 금지한다. 서비스별 의미/권한/데이터는 앱이 소유하고, `web-shell`은 mode/slot/primitive invariant만 소유한다.

## Changelog

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-06-11 | Admin/SNS sidebar도 검색 toolbar, refresh affordance, collapsible section, section chevron까지 5앱 공통 내부 구조에 맞추도록 기준 보강 |
| 2026-06-11 | sidebar 내부 공용화 범위를 PMS/DMS에서 5개 앱 전체로 확장하고 CRM/Admin/SNS의 search/refresh/list/tree row도 `SsooSidebar*` primitive 소비 기준으로 정렬 |
| 2026-06-11 | sidebar 내부 검색/toolbar action/section chevron/flat list/tree/filter primitive를 `web-shell`로 공용화하고 PMS/DMS 소비 기준 반영 |
| 2026-06-11 | 설정 화면 공통 양식을 `SsooSettings*` primitives로 추가하고 DMS 설정 페이지 내부 layout/status/view-mode 소비 기준 반영 |
| 2026-06-11 | 5개 앱 sidebar를 toggle + collapsed hover expand 단일 contract로 통일하고 DMS dev/wiki selector 제거 기준 추가 |
| 2026-06-09 | slot+mode 기반 SSOO frame system 정본 문서 추가 |
