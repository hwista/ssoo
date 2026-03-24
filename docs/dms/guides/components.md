# DMS 컴포넌트 가이드

> 최종 업데이트: 2026-03-23

DMS 컴포넌트는 `ui -> common/templates/layout/pages` 레이어 해석을 기준으로 배치합니다.

## 구조

```text
src/components/
├── ui/              # low-level primitive adapter
├── common/          # broad common + domain-common module
├── layout/          # app shell + keep-alive runtime lane
├── templates/       # page frame + template-facing blocks
└── pages/           # feature entry + orchestration
```

## 레이어 기준

### `ui/`

- shadcn/Radix primitive adapter
- 도메인 정책을 모르고 스타일/접근성 레이어만 담당

### `common/`

- broad reusable 컴포넌트와 DMS domain-common 모듈이 함께 존재
- 현재 domain-common 정본 예시:
  - `common/viewer/**`
  - `common/assistant/**`
- broad common 루트 배럴에는 pure common만 노출

### `layout/`

- `AppLayout`, `Header`, `TabBar`, sidebar, keep-alive 렌더링 lane

### `templates/`

- 여러 page가 공유하는 frame/pattern
- 개별 도메인 행위를 모르고 구조만 제공

### `pages/`

- 실제 기능 진입점과 orchestration
- page-local support는 `_components/`, `_config/`, `_utils/`, `utils/` 아래에 둠

## markdown editor 기준

- 현재 markdown editor runtime 정본 위치:
  - `src/components/pages/markdown/_components/editor/**`
- 즉, block editor/runtime은 아직 `common` 승격이 아니라 page-local support입니다.
- `Editor` 는 page orchestration, `BlockEditor` 는 CodeMirror bridge 역할만 맡습니다.
- `DocumentPage` 는 page-local hook 조합 orchestrator로 유지합니다.
- `DocumentPage` 는 store 연결과 hook 조립만 담당하고, frame/sidecar/editor shell 조립은 page-local support 컴포넌트로 분리합니다.
- editor toolbar 파일은 `Toolbar.tsx`, export는 `Toolbar` 기준을 사용합니다.
- editor shell toolbar strip은 `EditorToolbarStrip.tsx` 로 분리해 `DocumentPage` JSX를 얇게 유지합니다.
- document sidecar의 content info 섹션은 `TagsSection.tsx`, `SummarySection.tsx`, `SourceLinksSection.tsx` 개별 파일로 유지합니다.

## 예시

```ts
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/common';
import { PageTemplate } from '@/components/templates/PageTemplate';
import { DashboardPage } from '@/components/pages/home/DashboardPage';
import { useEditorState } from '@/components/pages/markdown/_components/editor/useEditorState';
```

## 네이밍 기준

- 컴포넌트: `PascalCase`
- 페이지 엔트리: `{Feature}Page.tsx`
- `Page.tsx` 는 App Router 전용
- 폴더가 컨텍스트를 제공하면 파일명 접두사는 생략

## Changelog

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-03-23 | `DocumentPageFrame`, `DocumentPageEditorShell`, `DocumentPageSidecarSlot` 분리와 `EditorToolbarStrip` 기준을 반영 |
| 2026-03-23 | `DocumentPage` hook orchestrator 구조, `Toolbar` 네이밍, sidecar content info 분리 파일 기준 반영 |
| 2026-03-23 | page-local editor runtime 기준, 실제 레이어 설명과 import 예시로 현행화 |
| 2026-03-11 | 레이어/구조 가이드 현행화 |
