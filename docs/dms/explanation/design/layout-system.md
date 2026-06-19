# 레이아웃 시스템

> 최종 업데이트: 2026-06-18

DMS의 레이아웃 구조와 컴포넌트를 정의합니다.

---

## 레이아웃 개요

DMS는 **단일 페이지 앱** 구조를 유지하고, 설정 화면은 같은 frame primitive 위에서 settings context로 전환합니다.

- **Workspace frame**: 문서 업무용 `Sidebar + Header + TabBar + ContentArea`
- **Settings mode**: 같은 `SsooAppFrame` slot에 settings sidebar variant, 내부 content가 빈 `SsooAppHeader`, 기존 `TabBar`의 settings tab view, keep-alive `ContentArea`를 유지

```
Workspace shell
┌─────────────────────────────────────────────────────────┐
│                       Header                            │
├─────────┬───────────────────────────────────────────────┤
│         │                 TabBar                        │
│         ├───────────────────────────────────────────────┤
│ Sidebar │                                               │
│         │              ContentArea                      │
│         │                                               │
│         │                                               │
└─────────┴───────────────────────────────────────────────┘

Settings mode
┌─────────────────────────────────────────────────────────┐
│Settings │          TabBar(settings tabs)                │
│Sidebar  ├───────────────────────────────────────────────┤
│(menu +  │          Secondary Nav(index anchors)         │
│ search) ├───────────────────────────────────────────────┤
│         │          Settings ContentArea pane            │
└─────────┴───────────────────────────────────────────────┘
```

---

## 레이아웃 크기

레이아웃 수치 정본은 앱 로컬 `LAYOUT_SIZES`가 아니라 `@ssoo/web-shell`의 `SSOO_SHELL_METRICS`, `SSOO_PAGE_CHROME_METRICS`, `SSOO_CONTENT_PAGE_METRICS`다.

- shell metric: sidebar/header/tabbar/container 수치
- page chrome metric: breadcrumb/header 높이와 stack gap
- content page metric: 문서형 content width, sub-content rail width, sidecar width, bottom panel height

---

## Workspace Header

상단 헤더 컴포넌트

### 구조

```
┌────────────────────────────────────────────────────────┐
│ [Global Search Input]      [+New] [🔔] [👤]           │
└────────────────────────────────────────────────────────┘
```

### 기능

| 영역 | 기능 |
|------|------|
| 통합 검색 | SSOO 전체 권한 범위 검색 입력 |
| 새 문서 | 새 문서 생성 |
| 알림 | 공용 알림센터 trigger/panel |
| 프로필 | 사용자 메뉴 |

### 스타일

- Header 높이, 배경, action spacing, 검색 input, 알림 trigger, 사용자 메뉴 폭은 `@ssoo/web-shell`의 `SsooAppHeader`/`SsooHeader` 계층이 소유합니다.
- DMS `Header` adapter는 검색값, 통합 검색 탭 열기 action, 새 문서 action, 알림 데이터, 사용자 메뉴 slot만 주입합니다.
- 기존 `/ai/search`는 DMS 문서 AI 검색 페이지로 유지하고, header 검색은 공용 `/ssoo/search` 통합 검색 탭으로 연결합니다.
- 앱 로컬 `h-header-h`, `bg-ssoo-primary`, `px-*` 조합으로 header shell을 다시 만들지 않습니다.

### Settings Header

설정 모드에서는 앱 상단 header slot과 `SsooAppHeader` shell을 유지하되 내부 content만 비웁니다.

- 별도 `SettingsHeader`를 만들지 않습니다.
- top header에 검색 입력, 사용자 메뉴, `설정` 제목, 보조문구를 노출하지 않습니다.
- 설정 진입/종료 affordance는 settings sidebar brand 영역의 뒤로가기 버튼과 `설정` title이 담당합니다.
- 설정 검색은 header가 아니라 settings sidebar variant 검색 슬롯에서 처리합니다.

---

## Sidebar

사이드바 컨테이너는 `@ssoo/web-shell`의 `SsooSidebarSurface`를 사용합니다. DMS 로컬 컴포넌트는 북마크, 열린 탭, 파일 트리, 변경/복구 상태 데이터를 section children으로 주입하고 row 양식과 검색 필터링은 공용 `SsooSidebarSearchableTree`가 소유합니다.

### 구조

```
┌─────────────┐
│ Search  [↻] │  ← 공용 search/refresh toolbar
├─────────────┤
│ [Bookmarks] │  ← 접이식 섹션
├─────────────┤
│ [Open Tabs] │  ← 열린 탭 목록
├─────────────┤
│ [File Tree] │  ← 파일 트리
│             │
│             │
├─────────────┤
│ [Changes]   │  ← 변경/복구 상태
└─────────────┘
```

### 섹션 (Section)

접이식 section header, chevron, rail icon, footer, hover reveal은 `SsooSidebarSurface`가 소유합니다. 각 section content는 같은 `SsooSidebarSearchableTree`를 사용하고, 검색 placeholder는 공용 “목록 내 검색..” 문구를 따릅니다.

```tsx
<SsooSidebarSurface
  sections={[
    { id: 'bookmarks', title: '북마크', children: <Bookmarks /> },
    { id: 'openTabs', title: '열린 탭', children: <OpenTabs /> },
    { id: 'fileTree', title: '파일 트리', children: <FileTree /> },
    { id: 'changes', title: '변경/복구', children: <Changes /> },
  ]}
/>
```

### Collapse / hover reveal

- 펼친 폭: 340px
- 접힌 폭: 56px
- 접힌 상태에서는 rail을 표시하고, hover 시 별도 overlay가 아니라 동일 sidebar surface가 expanded width로 펼쳐집니다.
- DMS는 사이드바 너비/row 높이/들여쓰기/hover 상태를 직접 재정의하지 않습니다.

### Settings Sidebar

- 설정 모드의 sidebar는 별도 shell sidebar가 아니라 기존 `Sidebar` adapter의 settings variant입니다.
- settings sidebar brand 영역은 뒤로가기 버튼과 `설정` 단일 title만 표시하고 보조문구를 노출하지 않습니다.
- `SsooSidebarSurface`, `SsooSidebarSearchBox`, `SsooSidebarTree`, `SsooSidebarTreeStatusBadge`, `SsooSidebarState` 같은 기존 공용 primitive를 재사용하고, settings 검색 결과 section/설정 메뉴 section 조립은 `@ssoo/web-shell`의 `createSsooSettingsSidebarSections`가 담당합니다.
- sidebar 본문은 설정 범위(`시스템 설정`, `내 설정`)를 담당하고, 검색은 `searchSettingEntries()` 결과를 사용해 section/field로 이동합니다.
- 검색은 registry 기반 `searchSettingEntries()` 결과를 사용하고, 결과 row와 section/field status badge는 `createSsooSettingsSidebarSections`가 `SsooSidebarTree` leaf node로 렌더링합니다.
- 설정 검색 입력의 placeholder/clear/rail 표면은 workspace sidebar와 같은 `SsooSidebarSurface` 공용 기본값을 사용합니다.
- 설정 sidebar도 문서 sidebar와 같은 collapse toggle, collapsed hover reveal, search toolbar, refresh action, section chevron을 유지합니다.
- 설정 메뉴 section과 검색 결과 section은 `SsooSidebarSurface`의 section expand/collapse 상태를 사용하고, 설정 group node는 `SsooSidebarTree`의 folder expand/collapse 상태를 사용합니다.
- 별도의 설정 전용 sidebar primitive, 별도 frame-level settings sidebar, `SsooSidebarListItem` 직접 조립은 만들지 않습니다.
- 권한 도입 기준은 `canManageSystem`, `canManagePersonal` 로 group/search 결과 노출을 분리합니다.

### Settings Menu Tabs

- 설정 section navigation은 `SettingsPage` 본문 안의 좌측 navigation이 아니라 settings sidebar의 메뉴 트리에서 시작합니다.
- 설정 메뉴 클릭은 기존 frame tabbar slot의 `TabBar`에 설정 페이지 탭을 엽니다.
- `TabBar`는 workspace/settings로 탭 데이터를 분리하지 않고, 열린 탭 배열을 같은 MDI tabbar primitive에 전달합니다. settings mode 진입 시 active tab이 settings path가 되도록 navigation store와 `AppLayout`이 동기화합니다.
- workspace 문서 탭과 설정 페이지 탭은 같은 `SsooMdiTabBar` entrypoint를 사용하고, container height/scroll area/tab item 표현은 `web-shell` 내부 primitive가 소유합니다.

### SettingsPage 본문 구조

- `SettingsPage`는 `PageTemplate`의 breadcrumb/header를 유지하고, `leftSubContentSlot`을 현재 section 내부 색인 rail로 사용합니다.
- 색인 목록은 현재 section의 개요, field anchor, `SETTING_SECTIONS.indexItems` 로 선언한 custom slot anchor를 표시하고, 변경/오류 상태를 보조 메타로 보여 줍니다.
- 본문: 활성 section의 detail surface (`structured`, `json`, `diff`, `templates`)
- 목적: 설정/제어/운영 표준을 settings context 안의 탭형 화면으로 고정하고, `SettingsPage` 는 현재 section 내부 탐색, 저장/검증 상태만 소유하도록 제한

---

## TabBar

탭 바 컴포넌트

### 구조

```
┌─────────────────────────────────────────────────────────┐
│ [<] [🏠 홈] [📄 문서1] [📄 문서2] [📄 문서3] [>]        │
└─────────────────────────────────────────────────────────┘
```

### 기능

| 기능 | 설명 |
|------|------|
| 탭 활성화 | 클릭 시 해당 탭 활성화 |
| 탭 닫기 | X 버튼 클릭 시 탭 닫기 |
| 스크롤 | 탭이 많을 때 좌우 스크롤 |
| 드래그 | 탭 순서 변경 (Home 제외) |

### 탭 스타일

```tsx
// 활성 탭
className="bg-white border-t-2 border-ssoo-primary"

// 비활성 탭
className="bg-gray-100 hover:bg-gray-200"
```

### Home 탭 규칙

- 항상 첫 번째 위치
- 닫기 불가 (`closable: false`)
- 드래그 불가

### Settings mode와 TabBar

- 설정 진입은 workspace `settings` 탭을 열지 않고 `useSettingsPageNavigationStore.isActive`를 켭니다.
- 설정 모드에서도 같은 `TabBar`가 frame tabbar slot에 렌더링되며, settings tab path만 표시합니다.
- settings mode가 활성화되면 active content tab도 settings tab path여야 합니다. `activeTabId`가 문서 탭으로 남은 상태에서는 문서 panel이 설정 화면 위에 남을 수 있으므로, settings navigation store와 `AppLayout`이 현재 settings section tab을 활성화합니다. `ContentArea`는 별도 settings 예외 렌더러가 아니라 공용 MDI의 active-tab 규칙을 따릅니다.
- 세션 복원 등으로 stale `/settings` 탭이 남아 있으면 `ContentArea`의 legacy redirect가 설정 모드로 handoff하고 해당 탭을 닫습니다.

---

## ContentArea

콘텐츠 영역 컴포넌트

### 동작

1. `activeTabId`에서 활성 탭 찾기
2. 탭 경로로 페이지 타입 결정
3. `pageComponents` 매핑에서 컴포넌트 로드
4. `Suspense`로 로딩 상태 처리

### 페이지 매핑

```typescript
const pageComponents = {
  home: lazy(() => import('@/components/pages/home/DashboardPage')),
  markdown: lazy(() => import('@/components/pages/markdown/DocumentPage')),
  legacySettings: LegacySettingsRedirect,
  settings: SettingsPage,
};
```

### 페이지 타입 결정

```typescript
function getPageType(tab) {
  if (tab.id === 'home') return 'home';
  if (tab.path.startsWith('/doc/')) return 'markdown';
  if (parseSettingsTabPath(tab.path)) return 'settings';
  if (tab.path === '/settings') return 'legacySettings';
  return null;
}
```

---

## 문서형 콘텐츠 폭 규칙

문서형 페이지(문서 뷰어/에디터 및 유사 기능)는 content-area 내부 페이지 조립 표준의 골든 형태입니다. 공통 기준은 [SSOO 내부 페이지 조립 표준](../../../common/explanation/architecture/content-page-assembly-standard.md)을 따르고, 폭/배경/slot surface 기준은 `@ssoo/web-shell` page recipe가 소유합니다.

본문 최대 너비는 `SSOO_CONTENT_PAGE_METRICS.mainContentWidthPx`의 **975px** 규칙을 따릅니다. 좌/우 sub-content rail과 sidecar는 `SSOO_CONTENT_PAGE_METRICS.auxiliarySlotWidthPx`/`sidecarWidthPx`의 **340px** 기준을 공유합니다.

### 목적

- 긴 가로 폭을 제한해 읽기/입력 가독성을 확보
- 사이드카와의 균형 유지
- 문서형/정보형 페이지 레이아웃 일관성 확보

### 적용 기준

- `PageTemplate` 또는 `@ssoo/web-shell` page recipe를 사용하는 모든 문서형 페이지
- 마크다운 뷰어/에디터 외의 기능 페이지도 동일한 폭 규칙 준수

### 폭 정본

폭 숫자는 앱이 직접 소유하지 않습니다.

- constrained main: `SSOO_CONTENT_PAGE_METRICS.mainContentWidthPx`
- landscape 문서 body: `SSOO_CONTENT_PAGE_METRICS.landscapeContentWidthPx`
- left/right sub-content rail: `SSOO_CONTENT_PAGE_METRICS.auxiliarySlotWidthPx`
- sidecar: `SSOO_CONTENT_PAGE_METRICS.sidecarWidthPx`

```tsx
import { SSOO_CONTENT_PAGE_METRICS } from '@ssoo/web-shell';
```

### 구현 패턴

```tsx
import { PageTemplate } from '@/components/templates';

<PageTemplate
  filePath="ai/search"
  mode="viewer"
  pageTone="ai"
  pageVariant="standard"
>
  {/* 페이지별 콘텐츠 */}
</PageTemplate>
```

### Shell 외곽 책임 단일화

`SectionedShell`은 툴바/바디/푸터의 외곽 frame(보더/배경/라운드/분할선)을 단일 책임으로 관리합니다.

- Shell 책임: `toolbar/body/footer`의 frame 스타일
- 슬롯 컴포넌트 책임: 기능 UI(버튼, 입력, 카드, 메시지 등)
- 금지: `SectionedShell` 슬롯 직하위 래퍼에 `border-*`, `rounded-*`, 외곽용 `bg-*`를 중복 적용
- 에디터 모드도 툴바를 Shell `toolbar` 슬롯으로 렌더링하고, 에디터 본문 컴포넌트는 콘텐츠 편집 기능만 담당
- 에디터 툴바 액션은 store 우회 없이 페이지 로컬 `Editor` ref에 직접 전달해 body 편집기와 1:1로 연결
- `toolbar`, `footer`가 없으면 `body`가 해당 영역 스타일을 대체해 상하단 경계를 완성
- Footer 입력은 `AssistantComposer` 공용 컴포넌트로 단일화하며, `+ / 입력 / 전송` 정렬 규칙은 페이지별 보정 없이 컴포넌트 내부에서만 관리합니다.
- Body 슬롯에 주입되는 콘텐츠 루트는 `h-full min-h-0 overflow-hidden` 계약을 필수로 따릅니다.
- `body` 최상위에서 `flex-1` 단독 사용은 금지합니다(부모가 flex가 아니면 높이 전파 실패).

### AI 페이지 공통 구조

AI 페이지는 `PageTemplate` + `SectionedShell` 조합으로 헤더/툴바/본문/푸터 구성을 통일합니다.

```tsx
import { PageTemplate } from '@/components/templates';
import { SectionedShell } from '@/components/templates/page-frame';
import { AiPanel } from '@/components/pages/ai/_components/AiPanel';

<PageTemplate
  filePath="ai/search"
  mode="viewer"
  pageTone="ai"
  breadcrumbRootIconVariant="ai"
  contentSurface="transparent"
  panelContent={<AiPanel variant="search" />}
>
  <SectionedShell
    variant="search_with_toolbar"
    toolbar={<SearchBar />}
    body={<ResultList />}
    footer={<ComposeInput />}
  />
</PageTemplate>
```

- `SectionedShell` 스타일은 `variant`로 제어합니다.
- 페이지는 frame 스타일을 직접 주입하지 않고 variant preset을 사용합니다.

### SectionedShell Variant 매핑

| 화면 | 구성 | variant |
|------|------|---------|
| 문서 에디터 | 툴바 + 바디 + 푸터 | `editor_with_footer` |
| 문서 뷰어 | 툴바 + 바디 | `viewer_with_toolbar` |
| AI 대화 | 바디 + 푸터 | `chat_with_footer` |
| AI 검색 | 툴바 + 바디 | `search_with_toolbar` |

### 참고

- 문서 뷰어/에디터의 기준 폭: `components/common/viewer/Content.tsx`의 `DOCUMENT_WIDTH = 975`
- 내부 영역은 필요 시 자체 스크롤을 제공하도록 구성

---

## 반응형 디자인

### 디바이스 타입

```typescript
export const BREAKPOINTS = {
  mobile: 768,
};

// layout.store.ts
const detectDeviceType = (): DeviceType => {
  return window.innerWidth < BREAKPOINTS.mobile ? 'mobile' : 'desktop';
};
```

### 모바일 대응 (추후)

현재 모바일은 "준비 중" 메시지 표시:

```tsx
if (deviceType === 'mobile') {
  return (
    <div className="flex items-center justify-center h-screen">
      <h1>모바일 버전 준비 중</h1>
    </div>
  );
}
```

---

## CSS 변수

Shell/page 수치용 CSS 변수는 앱 로컬 `globals.css`에서 재정의하지 않습니다. Header, sidebar, tabbar, overlay, page chrome metric은 `@ssoo/web-shell` 정본을 사용합니다.

도메인 콘텐츠 전용 CSS 변수는 DMS가 둘 수 있지만, 이름과 selector를 editor/prose/viewer 같은 도메인 범위로 제한합니다.

### Tailwind 확장

DMS Tailwind 확장은 도메인 콘텐츠 유틸리티에 한정합니다. `h-header-h`, `h-tab-h`, `w-sidebar-w`처럼 shell metric을 앱에서 재선언하는 utility는 추가하지 않습니다.

---

## 관련 문서

- [state-management.md](../architecture/state-management.md) - 레이아웃 스토어
- [page-routing.md](../architecture/page-routing.md) - 탭 라우팅
- [component-hierarchy.md](component-hierarchy.md) - 컴포넌트 구조
- [SSOO 내부 페이지 조립 표준](../../../common/explanation/architecture/content-page-assembly-standard.md) - content-area 내부 페이지 recipe/material 경계

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-06-17 | `SsooContentPageTemplate` 기준으로 content page slot 폭/padding/border/overflow 책임을 `web-shell`에 고정하고, 설정 내부 색인을 `leftSubContentSlot` rail로 정렬 |
| 2026-06-18 | 설정 모드 top header slot은 유지하되 내부 content를 비우고, settings sidebar brand 영역을 뒤로가기 버튼과 `설정` 단일 title로 제한 |
| 2026-06-17 | Header 검색을 DMS 검색 기준을 반영한 `/ssoo/search` 통합 검색으로 전환하고, sidebar 목록 검색 placeholder/필터링을 공용 `SsooSidebarSearchableTree`, settings sidebar section 조립을 `createSsooSettingsSidebarSections` 기준으로 정렬 |
| 2026-06-17 | DMS 문서 페이지를 content-area 내부 페이지 골든 형태로 명시하고, 앱 로컬 layout metric/CSS 변수 재선언 금지 기준을 web-shell metric 정본과 맞춤 |
| 2026-06-15 | settings mode와 active content tab을 같은 settings tab path로 맞추는 invariant를 추가하고, 문서 panel이 설정 화면에 남지 않도록 ContentArea 렌더 기준을 문서화 |
| 2026-06-15 | settings sidebar refresh action, section collapse, group tree expand/collapse를 문서 sidebar와 같은 공용 sidebar 동작으로 보정 |
| 2026-06-15 | 설정 화면을 메인 frame 4슬롯 유지, settings sidebar 메뉴 트리, 기존 `TabBar` 설정 페이지 탭, `leftSubContentSlot` 내부 색인 기준으로 보정 |
| 2026-06-12 | DMS sidebar 문서를 `SsooSidebarSurface`/`SsooSidebarTree` 기준으로 갱신하고 compact overlay/resize/sidebar-local section 설명 제거 |
| 2026-06-12 | 설정 화면을 `ContentArea`의 일반 `/settings` 탭이 아니라 공유 frame 위의 settings mode로 재정렬하고, 설정 section navigation은 frame tabbar slot의 내부 탭으로 정리 |
| 2026-04-02 | 과거 설정 전용 frame 실험으로 outer scope selector와 inner section navigation 책임을 분리 |
| 2026-04-02 | 과거 설정 전용 frame 실험에서 로고 영역과 TabBar 비노출 규칙을 도입했으나, 2026-06-12 기준 폐기 |
| 2026-02-24 | Codex 품질 게이트 엄격 모드 적용에 맞춰 문서 메타 섹션 보강 |
