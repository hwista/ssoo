# DMS 골든 이그잼플 가이드

> 최종 업데이트: 2026-03-12

DMS의 현재 구조를 이후 작업의 기준선으로 재사용하기 위한 운영 가이드입니다.

## 목표

- 새 기능이 기존 구조를 다시 흐리지 않게 한다.
- 사람이나 에이전트가 같은 PRD를 받아도 같은 레이어 판단으로 수렴하게 한다.
- 예외를 늘리는 대신 기준선을 유지하는 방향으로 개발한다.

## 레이어 정본

```text
ui                -> primitive adapter
common            -> pure common + domain-common feature modules
templates         -> page frame + template-facing primitives
layout            -> app shell + keep-alive runtime lane
pages             -> feature entry + orchestration
stores            -> Zustand state ownership
server/handlers   -> thin facade
server/services   -> actual implementation
```

## 파일 배치 기준

### `components/pages/**`

- feature entry는 `{Feature}Page.tsx` 를 사용합니다.
- `Page.tsx` 는 사용하지 않습니다.
- `default export` 는 사용하지 않습니다.
- page-local support는 `_components/`, `_config/`, `_utils/`, `utils/` 아래에 둡니다.

대표 예시:

- [DashboardPage.tsx](/home/a0122024330/src/ssoo/apps/web/dms/src/components/pages/home/DashboardPage.tsx)
- [DocumentPage.tsx](/home/a0122024330/src/ssoo/apps/web/dms/src/components/pages/markdown/DocumentPage.tsx)
- [SettingsPage.tsx](/home/a0122024330/src/ssoo/apps/web/dms/src/components/pages/settings/SettingsPage.tsx)

### `components/templates/page-frame/**`

- breadcrumb/header/content/sidecar/frame 같은 문서형 page frame 부품은 여기 둡니다.
- broad common 으로 올리지 않습니다.

대표 예시:

- [PageTemplate.tsx](/home/a0122024330/src/ssoo/apps/web/dms/src/components/templates/PageTemplate.tsx)
- [SectionedShell.tsx](/home/a0122024330/src/ssoo/apps/web/dms/src/components/templates/page-frame/SectionedShell.tsx)

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
| 2026-03-12 | 골든 이그잼플 운영 가이드 초안 추가 |
