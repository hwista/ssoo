# SSOO Codex Agent Entry

> 최종 업데이트: 2026-02-22
> 범위: SSOO 모노레포 전체 (`/home/hwista/src/ssoo`)

## 목적

Codex 작업 시 참조 순서, 규칙 정본, 검증 루틴을 고정해 일관된 동작을 보장합니다.

## Codex 필수 참조 순서

1. `.codex/instructions/codex-instructions.md` (Codex 전역 프로토콜)
2. `.codex/instructions/project.instructions.md` (레포 특화 규칙)
3. 작업 경로별 `.codex/instructions/*.instructions.md`
4. 문서 정본: `docs/`, `apps/web/dms/docs/`
5. 동기화 원본 참조: `.github/copilot-instructions.md`, `.github/instructions/*.md`

## 스킬 사용 규칙

- 코드/문서 동기화가 포함된 SSOO 작업: `.codex/skills/ssoo-doc-aware-dev/SKILL.md`
- Codex 규칙 동기화/검증 작업: `.codex/skills/ssoo-codex-consistency/SKILL.md`

## 실행 루틴 (강제)

- 작업 전: `pnpm run codex:preflight`
- 규칙 동기화 점검: `pnpm run codex:verify-sync`
- push 전: `pnpm run codex:push-guard`
- DMS 변경 포함 시: `pnpm run codex:dms-guard`

## 정본 계층

- Codex 규칙 정본: `.codex/instructions/`
- GitHubDocs 규칙 정본: `.github/copilot-instructions.md`, `.github/instructions/`
- 산출물 문서 정본: `docs/`, `apps/web/dms/docs/`

## 주의

- `.codex/instructions/`와 `.github/` 핵심 규칙은 `.codex/scripts/verify-codex-sync.js`로 동기화 검증됩니다.
- 동기화 검증 실패 시 preflight/push-guard는 실패 처리됩니다.
