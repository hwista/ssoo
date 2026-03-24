# DMS - Claude Code 가이드

> 상위 규칙: 루트 `CLAUDE.md`
> 정본: `.github/instructions/dms.instructions.md`

## 독립성 원칙

- DMS는 독립 프로젝트입니다.
- `@ssoo/*` 패키지 import 금지
- 개발 서버 포트는 `3001`

## 구조 기준

```text
src/
├── app/
├── components/
│   ├── ui/
│   ├── common/
│   ├── layout/
│   ├── templates/
│   └── pages/
├── hooks/
├── lib/
├── stores/
└── types/
server/
```

## 서버 패턴

- route: wire parsing + HTTP response only
- handler: facade only
- service: actual logic

JSON API 표준:

- 결과 타입은 `AppResult<T>`
- non-stream JSON API는 `{ success, data?, error?, status, code? }` envelope 사용
- stream/binary route는 본문 형식 예외 유지

## editor 기준

- markdown editor runtime 정본은 `components/pages/markdown/_components/editor/**`
- `DocumentPage` 는 page-local hook 조합 orchestrator
- `DocumentPage` 는 3차 분해 기준으로 `Actions/Navigation/AiSummaryAutoExec/Launcher` hook과 frame/shell support 컴포넌트를 조립합니다.
- references 흐름은 `useDocumentPageReferences` 조립 hook 아래 `ReferenceSelection/ReferenceRestore/PendingAttachments` 하위 hook으로 분리합니다.
- `Editor` 는 orchestration
- `BlockEditor` 는 CodeMirror bridge
- editor toolbar 파일은 `Toolbar.tsx`, export는 `Toolbar`
- 파일 트리는 MUI Tree View가 아니라 현재 custom tree renderer 기준을 유지합니다.

## 검증

- `pnpm run build:web-dms`
- `pnpm run codex:dms-guard`
- `pnpm -C apps/web/dms run check:golden-example`

## Changelog

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-03-23 | 3차 분해 기준으로 `DocumentPage` 추가 hook 분해와 references sub-hooks 구조를 반영 |
| 2026-03-23 | `DocumentPage` 2차 분해, `Toolbar` export 정리, sidecar section 분리 기준 반영 |
| 2026-03-23 | `AppResult`/JSON envelope, page-local editor runtime 기준 반영 |
