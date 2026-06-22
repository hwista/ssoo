# DMS 골든 이그잼플 가이드

> 최종 업데이트: 2026-06-18

DMS의 현재 구조를 이후 작업의 기준선으로 재사용하기 위한 운영 가이드입니다. SSOO 전체 content-area 내부 페이지 조립 표준은 [공통 내부 페이지 조립 표준](../../common/explanation/architecture/content-page-assembly-standard.md)을 따르고, DMS 문서 페이지는 그 표준의 첫 골든 이그잼플입니다.

## 목표

- 새 기능이 기존 구조를 다시 흐리지 않게 한다.
- 사람이나 에이전트가 같은 PRD를 받아도 같은 레이어 판단으로 수렴하게 한다.
- 예외를 늘리는 대신 기준선을 유지하는 방향으로 개발한다.

## 레이어 정본

```text
pages             -> domain final assembly page
templates         -> DMS-local recipe adapter until web-shell promotion
common            -> pure common + DMS domain-common feature modules
ui                -> primitive adapter
layout            -> app shell + keep-alive runtime lane
stores            -> Zustand state ownership
server/handlers   -> thin facade
server/services   -> actual implementation
```

페이지 조립 기준은 다음 순서로 본다.

```text
DocumentPage / SettingsPage
  -> PageTemplate recipe
  -> @ssoo/web-shell page materials
  -> domain body / panel / custom slots
```

`SsooContentPageTemplate`처럼 도메인 로직 없이 page chrome/content/sub-content/sidecar slot만 조립하는 recipe는 `@ssoo/web-shell`에 있어야 한다. 현재 DMS `PageTemplate`은 이 recipe에 DMS breadcrumb/header/action을 주입하는 adapter이며, 신규 페이지가 이를 복사해 별도 recipe를 만드는 것은 금지한다.

DMS `ContentArea`는 `SsooRegisteredMdiContentArea`와 `defineSsooMdiPageRegistry()`를 통해 탭 경로를 분류한다. 새 탭 route는 `contentPage`로만 등록하며, 임의 `renderTab` 분기를 추가하지 않는다. `legacyException`과 `shellPage` route kind는 public page assembly contract가 아니며, main-only/canvas 화면은 `contentPage`의 `pageVariant` recipe로 표현한다.

`contentPage` route는 임의 JSX를 직접 반환하지 않고 `SsooMdiContentPageElement`를 반환해야 한다. 현재 DMS 문서/설정/AI page는 승인된 `DMS PageTemplate` adapter로 분류하고 `createSsooContentPageAdapterElement()`를 통해 렌더링한다. 이 adapter 내부에서 DMS breadcrumb/header/action을 조립한 뒤 `SsooContentPageTemplate`에 main/sub-content/sidecar/bottom/state slot을 전달한다.

현재 DMS route 분류:

- `contentPage`: 문서 페이지, 설정 페이지, AI 대화, 전역 검색, 공용 사용자 profile/settings surface, DMS 홈
- `contentPage` handoff: stale `/settings`, `/access-requests/me` redirect. 이 경로는 `routeHandoffPage` adapter를 통과하고, 저장된 탭이 소거되면 route 자체를 제거한다.

DMS 홈은 `DMS PageTemplate` adapter boundary를 통과하는 `contentPage`다. 검색 page body, toolbar, results panel, search utility, sidecar, 검색 기록/인기 검색어/AI 첨부 표면은 `@ssoo/web-shell`의 `SsooAiSearchPage` 계열이 소유한다. 전역 검색 페이지는 이 공통 `SsooAiSearchPage`를 소비하는 `SsooGlobalSearchPage` adapter boundary를 통과하는 `contentPage`이며, 앱은 검색 API adapter와 결과 열기 action만 소유한다. DMS 검색 진입점은 `/ssoo/search` 하나이고, source filter chip을 선택한 경우에만 검색 범위가 특정 앱으로 좁혀진다.

## 파일 배치 기준

### `components/pages/**`

- feature entry는 `{Feature}Page.tsx` 를 사용합니다.
- `Page.tsx` 는 사용하지 않습니다.
- `default export` 는 사용하지 않습니다.
- page-local support는 `_components/`, `_config/`, `_utils/`, `utils/` 아래에 둡니다.
- page entry는 data/API/store/permission/action을 소유하고, page recipe에는 body, sidecar, sub-content rail, header action 같은 slot만 주입합니다.
- DMS `DocumentPage`는 SSOO 내부 페이지 조립의 골든 이그잼플입니다. 새 문서형/상세형 페이지는 이 구조를 기준으로 판단합니다.

대표 예시:

- [DashboardPage.tsx](/home/a0122024330/src/ssoo/apps/web/dms/src/components/pages/home/DashboardPage.tsx)
- [DocumentPage.tsx](/home/a0122024330/src/ssoo/apps/web/dms/src/components/pages/markdown/DocumentPage.tsx)
- [SettingsPage.tsx](/home/a0122024330/src/ssoo/apps/web/dms/src/components/pages/settings/SettingsPage.tsx)

### `components/templates/page-frame/**`

- breadcrumb/header/content/sidecar/frame 같은 문서형 page frame 부품의 DMS adapter를 둡니다.
- 도메인 중립적인 page chrome, content surface, sidecar frame, section shell은 `@ssoo/web-shell` 재료를 우선 소비합니다.
- DMS local template은 도메인 로직 없이 `@ssoo/web-shell` recipe에 DMS slot을 주입하는 adapter로 제한합니다.
- 신규 template-facing primitive를 DMS에 추가하기 전, 공통 내부 페이지 조립 표준의 web-shell 재료/recipe 기준을 먼저 확인합니다.

대표 예시:

- [PageTemplate.tsx](/home/a0122024330/src/ssoo/apps/web/dms/src/components/templates/PageTemplate.tsx)
- [SectionedShell.tsx](/home/a0122024330/src/ssoo/apps/web/dms/src/components/templates/page-frame/SectionedShell.tsx)

`PageTemplate` 현재 책임:

- DMS breadcrumb path/icon adapter와 header action adapter 조립
- `SsooContentPageTemplate`에 main content, left/right sub-content, sidecar, bottom panel, state slot 전달
- DMS loading/error/custom 상태 slot 전달
- DMS page context를 `pageTone`/`pageVariant`/`contentSurface` 같은 web-shell recipe 의미 prop으로 연결

`PageTemplate`에서 제거하거나 승격해야 하는 책임:

- 공용 content surface class
- sidecar toggle/lane 구현
- page tone/background와 loading/error/empty/denied state surface
- page width 숫자와 raw width opt-out
- 도메인 중립 recipe props/type

`PageTemplate`과 `@ssoo/web-shell` page material은 `pageTone`/`pageVariant`/`contentSurface` 같은 의미 prop만 노출하고, 실제 배경/보더/상태 화면 톤은 `ssoo-content-page-tone-*`, `ssoo-content-page-state-tone-*`, `ssoo-settings-subtle-surface` 같은 web-shell CSS-backed class가 책임진다. DMS page나 template adapter가 `bg-ssoo-content-bg/30`, `bg-ssoo-primary/15`, `text-ssoo-primary/70` 같은 CSS-variable slash opacity utility를 다시 쓰면 page recipe 표현 계층 누수로 본다.

### `components/common/**`

- 루트 배럴은 pure common 만 노출합니다.
- `viewer/`, `editor/`, `assistant/` 는 domain-common feature module 이므로 직접 import 합니다.
- 여러 page에서 재사용되더라도 DMS 도메인 규약을 품고 있으면 `common/<domain>/` 아래에 둡니다.

대표 예시:

- [common/index.ts](/home/a0122024330/src/ssoo/apps/web/dms/src/components/common/index.ts)
- [BlockEditor.tsx](/home/a0122024330/src/ssoo/apps/web/dms/src/components/common/editor/block-editor/BlockEditor.tsx)
- [Toolbar.tsx](/home/a0122024330/src/ssoo/apps/web/dms/src/components/common/viewer/toolbar/Toolbar.tsx)
- [useAssistantChat.ts](/home/a0122024330/src/ssoo/apps/web/dms/src/components/common/assistant/chat/useAssistantChat.ts)

### `server/**`

- route는 wire format만 다룹니다.
- handler는 facade 입니다.
- service가 실제 로직을 가집니다.

## 레이어 판정 체크리스트

### `pages`

- 특정 화면 진입점의 orchestration 인가?
- 탭 경로, page state, feature flow를 직접 조합하는가?

### `templates`

- 여러 page가 공유하는 frame/pattern 인가?
- 개별 도메인 행위를 모르고 구조만 제공하는가?

### `common`

- broad reusable 인가?
- 아니면 DMS 도메인 재사용 모듈인가?
- page-local 인데 공용처럼 올리려는 것 아닌가?
- 여러 앱에서 같은 의미로 재사용될 page material/recipe라면 `common`이 아니라 `@ssoo/web-shell` 후보입니다.

### `layout`

- 앱 shell, tab runtime, sidebar/header/frame 에 속하는가?

### `stores`

- 여러 렌더 트리에서 공유해야 하는 상태인가?
- local state로 충분한 것을 store로 올리려는 것 아닌가?

## 네이밍 기준

- 컴포넌트: `PascalCase`
- 훅: `useCamelCase`
- 스토어: `kebab-case.store.ts`
- page entry: `{Feature}Page.tsx`

`Utils`, `Panels`, `Sections`, `Controls` 같은 완충어는 초기 분해에는 허용되지만, 최종 기준선으로 삼을 때는 더 구체적인 이름으로 재검토합니다.

## PRD 필수 입력

새 작업 요청에는 최소 아래 항목이 포함돼야 합니다.

1. 대상 레이어
2. 재사용 범위
3. 상태 소유 위치
4. API 변경 여부
5. 문서 갱신 범위
6. 기본 QA 시나리오

PRD 형식은 [../planning/prd-template.md](../planning/prd-template.md)를 사용합니다.

## 자동 검증

- `pnpm run codex:verify-sync`
- `pnpm run codex:preflight`
- `pnpm run codex:dms-guard`
- `pnpm -C apps/web/dms run check:golden-example`

`check:golden-example` 이 강제하는 항목:

- `components/pages/**` 엔트리 네이밍
- page entry `default export` 금지
- `common/index.ts` 의 broad re-export 금지
- `common/page` 레거시 계층 금지

추가해야 할 검증 항목:

- DMS-local page recipe clone 금지
- `PageTemplate` web-shell 승격 후 app-local recipe surface class 누수 금지
- 신규 내부 페이지가 공통 recipe를 우선 소비하는지 확인
- DMS page가 `PAGE_BACKGROUND_PRESETS`, `contentMaxWidth={null}`, local settings index nav/button/chip surface를 다시 소유하지 않는지 확인
- DMS `ContentArea`가 `SsooRegisteredMdiContentArea`와 typed route registry만 소비하고, 저수준 MDI mapper나 임의 `renderTab` 분기를 직접 소유하지 않는지 확인

## 기준선 예시 파일

- page entry: [DashboardPage.tsx](/home/a0122024330/src/ssoo/apps/web/dms/src/components/pages/home/DashboardPage.tsx)
- page orchestration: [DocumentPage.tsx](/home/a0122024330/src/ssoo/apps/web/dms/src/components/pages/markdown/DocumentPage.tsx)
- template frame: [PageTemplate.tsx](/home/a0122024330/src/ssoo/apps/web/dms/src/components/templates/PageTemplate.tsx)
- page-frame primitive: [SectionedShell.tsx](/home/a0122024330/src/ssoo/apps/web/dms/src/components/templates/page-frame/SectionedShell.tsx)
- domain-common editor: [BlockEditor.tsx](/home/a0122024330/src/ssoo/apps/web/dms/src/components/common/editor/block-editor/BlockEditor.tsx)
- domain-common assistant: [useAssistantChat.ts](/home/a0122024330/src/ssoo/apps/web/dms/src/components/common/assistant/chat/useAssistantChat.ts)

## Changelog

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-06-18 | DMS contentPage route가 `DMS PageTemplate` adapterName과 `createSsooContentPageAdapterElement()`를 통해 typed content page element를 반환하도록 기준 추가 |
| 2026-06-18 | DMS `ContentArea` route 분류를 `SsooRegisteredMdiContentArea`/typed registry 기준으로 고정하고, DMS 홈 전환 대기 예외와 전역 검색 `contentPage` 승격 기준을 명시 |
| 2026-06-18 | Page recipe 표현 계층을 web-shell CSS-backed class 기준으로 고정하고, CSS-variable slash opacity utility 금지 기준 추가 |
| 2026-06-18 | DMS `PageTemplate`을 폭 숫자/배경/state surface를 소유하지 않는 adapter로 보정하고, `pageTone`/`pageVariant`/`contentSurface`/`SsooPageIndexRail` 기준을 추가 |
| 2026-06-17 | DMS 문서 페이지를 SSOO content-area 내부 페이지 조립 골든 이그잼플로 고정하고, DMS PageTemplate을 web-shell recipe 승격 기준 구현으로 명시 |
| 2026-03-12 | 골든 이그잼플 운영 가이드 초안 추가 |
