# SSOO Codex Agent Entry

> 최종 업데이트: 2026-04-17
> 범위: SSOO 모노레포 전체 (`/home/hwista/src/ssoo`)

## 목적

Codex 작업 시 참조 순서, 규칙 정본, 검증 루틴을 고정해 일관된 동작을 보장합니다.

## Codex 필수 참조 순서

1. `.codex/instructions/codex-instructions.md` (Codex 전역 프로토콜)
2. `.codex/instructions/project.instructions.md` (레포 특화 규칙)
3. 작업 경로별 `.codex/instructions/*.instructions.md`
4. 문서 정본: `docs/`, `docs/dms/`
5. 동기화 원본 참조: `.github/copilot-instructions.md`, `.github/instructions/*.md`

## 스킬 사용 규칙

- 코드/문서 동기화가 포함된 SSOO 작업: `.codex/skills/ssoo-doc-aware-dev/SKILL.md`
- Codex 규칙 동기화/검증 작업: `.codex/skills/ssoo-codex-consistency/SKILL.md`

## 실행 루틴 (강제)

- 작업 전: `pnpm run codex:preflight`
- 규칙 동기화 점검: `pnpm run codex:verify-sync`
- push 전: `pnpm run codex:push-guard`
- DMS 변경 포함 시: `pnpm run codex:dms-guard`

## 하네스 관측성 의무

- 의미 있는 repo-scoped 작업은 시작 시 `~/.hermes/scripts/harness-run-start --repo-root /home/a0122024330/src/ssoo ...` 로 run ledger를 연다.
- stage 시작/종료, fallback, verification 시점마다 `~/.hermes/scripts/harness-run-event` 로 구조화 이벤트를 남긴다.
- planner / critic / builder / reviewer 흐름은 `.hermes/scripts/harness-stage-event` 또는 `pnpm run harness:planner:start`, `harness:critic:start`, `harness:builder:start`, `harness:reviewer:start` 계열 스크립트로 3/4/6/7단계를 남긴다.
- 종료 시 `~/.hermes/scripts/harness-run-finish` 로 report/timeline/summary를 생성한다.
- 산출물은 repo-local `.hermes/runs/<date>/<run_id>/` 와 machine-level `~/.hermes/observability/` 에 동시에 반영된다.
- 이 기록이 없으면 Copilot-first 준수 여부와 agent/stage ownership을 신뢰 가능한 방식으로 복원할 수 없으므로, meaningful run에서는 생략하지 않는다.

## 정본 계층

- Codex 규칙 정본: `.codex/instructions/`
- GitHubDocs 규칙 정본: `.github/copilot-instructions.md`, `.github/instructions/`
- 산출물 문서 정본: `docs/`, `docs/dms/`

## 현재 앱/패키지 기준선

- 앱: `apps/server`, `apps/web/pms`, `apps/web/cms`, `apps/web/dms`
- 공용 패키지: `packages/database`, `packages/types`, `packages/web-auth`, `packages/web-shell`
- path-specific instruction 은 server/pms/cms/dms/database/types/testing 기준으로 적용됩니다.

## 주의

- `.codex/instructions/`와 `.github/` 핵심 규칙은 `.codex/scripts/verify-codex-sync.js`로 동기화 검증됩니다.
- 동기화 검증 실패 시 preflight/push-guard는 실패 처리됩니다.
