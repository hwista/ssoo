# SSOO Web DMS

> 최종 업데이트: 2026-03-23

`apps/web/dms` 는 DMS 실행 코드 정본입니다. 개발 문서 정본은 [`docs/dms`](../../docs/dms/README.md)에 있습니다.

## 구조

```text
apps/web/dms/
├── src/
│   ├── app/            # App Router + route handlers
│   ├── components/     # ui/common/layout/templates/pages
│   ├── hooks/          # 앱 범용 훅
│   ├── lib/            # API client, constants, utils
│   ├── stores/         # Zustand stores
│   └── types/          # shared contracts
├── server/             # handlers + services + shared result helpers
├── data/               # wiki/templates runtime assets
└── package.json
```

현재 기준:

- markdown editor runtime 정본은 `src/components/pages/markdown/_components/editor/**`
- `DocumentPage` 는 page-local hook(`Mode/Sidecar/AI/References/Diff`) 조합 orchestrator
- server JSON API 표준 응답은 `server/shared/result.ts` 의 `AppResult<T>`
- non-stream JSON API 는 envelope 응답 사용
- stream/binary route 는 본문 형식 예외 유지

## 개발 명령어

```bash
cd apps/web/dms && npm run dev
cd apps/web/dms && npm run build

pnpm run codex:dms-guard
pnpm -C apps/web/dms run check:golden-example
```

## 참고 문서

- [DMS 문서 인덱스](../../docs/dms/README.md)
- [API 가이드](../../docs/dms/guides/api.md)
- [컴포넌트 가이드](../../docs/dms/guides/components.md)
- [훅 가이드](../../docs/dms/guides/hooks.md)
- [골든 이그잼플 가이드](../../docs/dms/guides/golden-example.md)

## Changelog

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-03-23 | `DocumentPage` 2차 분해 구조, `Toolbar` export 정리, stream pre-error envelope 정책 완료 반영 |
| 2026-03-23 | 레거시 구조/문서 링크 제거, page-local editor runtime 및 JSON envelope 기준 반영 |
