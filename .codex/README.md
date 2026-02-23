# SSOO Codex Setup

이 폴더는 SSOO 모노레포에서 Codex 동작 일관성을 강제하기 위한 로컬 정본 설정입니다.

## 정본 구조

- 진입점: `AGENTS.md`
- Codex 전역/경로별 규칙: `.codex/instructions/`
- 참조 매핑: `.codex/config/reference-map.json`
- GitHubDocs 동기화 기준: `.codex/config/sync-manifest.json`
- 동기화 검증: `.codex/scripts/verify-codex-sync.js`

## 포함된 구성

- `instructions/`
  - Codex 전역 규칙 + 경로별 규칙 정본
- `skills/ssoo-doc-aware-dev/`
  - 코드-문서 동기화 워크플로우 스킬
- `skills/ssoo-codex-consistency/`
  - Codex 규칙 동기화/검증 스킬
- `hooks/preflight.sh`
  - `verify-codex-sync` + docs/pattern 검증
- `hooks/dms-guard.sh`
  - DMS 변경 시 `apps/web/dms` 빌드
- `hooks/push-guard.sh`
  - `verify-codex-sync` + 변경 범위 빌드

## 빠른 사용법

```bash
# 1) Codex 정본/동기화 검증
pnpm run codex:verify-sync

# 2) 작업 전 점검
pnpm run codex:preflight

# 3) push 전 점검
pnpm run codex:push-guard

# 4) DMS 변경 포함 시
pnpm run codex:dms-guard

# 5) DMS 양방향 배포 (GitHub + GitLab + 검증)
pnpm run codex:dms-publish
```

## 정본 관계

- Codex 정본: `.codex/instructions/`
- GitHubDocs 정본: `.github/copilot-instructions.md`, `.github/instructions/`
- 산출물 정본: `docs/`, `apps/web/dms/docs/`
