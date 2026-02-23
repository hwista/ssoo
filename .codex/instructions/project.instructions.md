---
applyTo: "**"
---

# SSOO Codex Project Instructions

> 최종 업데이트: 2026-02-22

## 프로젝트 정보

- 구조: pnpm workspace + Turborepo
- 앱: `apps/server`, `apps/web/pms`, `apps/web/dms`
- 공유 패키지: `packages/database`, `packages/types`

## 패키지 경계

- `apps/*` → `packages/*` 방향만 허용
- `packages/*` → `apps/*` 역방향 참조 금지
- DMS는 독립 프로젝트로 `@ssoo/*` import 금지

## 기본 명령

- lint: `pnpm lint`
- build: `pnpm build`
- codex preflight: `pnpm run codex:preflight`
- codex sync verify: `pnpm run codex:verify-sync`

## 문서 동기화

- 코드 변경 시 대응 문서의 backlog/changelog 반영 확인
- 규칙 변경 시 `.codex/instructions/*` + `.github/instructions/*` 동시 반영

## Changelog

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-02-22 | Codex 프로젝트 정본 신설 |
