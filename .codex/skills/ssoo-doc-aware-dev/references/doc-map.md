# SSOO 문서 맵 (Canonical)

## 1) 프로세스/규칙 정본

- Codex 전역 규칙: `.codex/instructions/codex-instructions.md`
- Codex 경로 규칙: `.codex/instructions/*.instructions.md`
- 전역 규칙: `.github/copilot-instructions.md`
- 서비스 규칙: `.github/instructions/*.instructions.md`
- SDD 검증 스크립트: `.github/scripts/*.js`

## 2) 산출물 문서 정본

- 모노레포 통합 산출물: `docs/`
- DMS 1차 정본: `apps/web/dms/docs/`

## 3) 에이전트 온보딩 정본

- Codex 진입점: `AGENTS.md`
- 모노레포: `docs/common/AGENTS.md`
- DMS: `apps/web/dms/docs/AGENTS.md`

## 4) 주의할 경로 표기

- 일부 문서에는 과거 경로 `apps/web/dms/docs/development/*` 표기가 남아 있음
- 현재 실제 구조는 `apps/web/dms/docs/explanation/*`, `apps/web/dms/docs/guides/*`, `apps/web/dms/docs/planning/*`
