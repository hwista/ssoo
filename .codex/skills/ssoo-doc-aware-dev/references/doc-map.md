# SSOO 문서 맵 (Canonical)

## 1) 프로세스/규칙 정본

- Codex 전역 규칙: `.codex/instructions/codex-instructions.md`
- Codex 경로 규칙: `.codex/instructions/*.instructions.md`
- 전역 규칙: `.github/copilot-instructions.md`
- 서비스 규칙: `.github/instructions/*.instructions.md`
- SDD 검증 스크립트: `.github/scripts/*.js`

## 2) 산출물 문서 정본

- 모노레포 통합 산출물: `docs/`
- DMS 정본: `docs/dms/`

## 3) 에이전트 온보딩 정본

- Codex 진입점: `AGENTS.md`
- 모노레포: `docs/common/AGENTS.md`
- DMS: `docs/dms/AGENTS.md`

## 4) 주의할 경로 표기

- 과거 경로 `apps/web/dms/docs/*` 표기가 남아 있으면 `docs/dms/*`로 교정
- 위키 런타임 경로는 문서 정본과 분리되어 `apps/web/dms/data/wiki/*` 사용
