# SSOO Codex Agent Entry

> 최종 업데이트: 2026-07-16
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
- 배포/플랫폼 변경 포함 시: `pnpm run codex:platform-guard` (서버 + 5개 앱)
- DMS 전용 계약: `pnpm run codex:dms-guard` (플랫폼 검사에 포함, 호환 유지)

## 사용자-visible 동작 변경 게이트

- 이미 구현된 화면, 버튼, 안내 문구, 오류/빈 상태, 수동 복구 동선, 권한 fallback 은 dead code로 간주하지 않습니다.
- 명시 지시 없이 해당 동작을 삭제·축소·대체·흡수해야 한다고 판단되면 실행 전 사용자 확정 게이트를 거칩니다.
- 자세한 기준은 `.codex/instructions/codex-instructions.md`와 `.github/copilot-instructions.md`의 `Behavior Impact Gate`를 따릅니다.

## 관측형 실행 규칙

- `pnpm build`, `pnpm lint`, `pnpm security:audit`, `pnpm docs:verify`, `pnpm codex:preflight`, `pnpm verify:access-*` 는 `package.json`의 `*:observed` 엔트리로 실행된다.
- `*:observed` 는 `scripts/run-observed-command.sh` 를 통해 machine-local observer(`LSWIKI_COMMAND_OBSERVER` 또는 `agent-system/local/observe-command.sh`)가 있으면 연결하고, 없으면 raw 명령으로 즉시 fallback 한다.
- raw 명령은 `:raw` suffix 를 사용한다. 예: `pnpm run build:raw`, `pnpm run lint:raw`.
- 예전 `pnpm run harness:*` 명령은 compatibility stub 이며, ordinary workflow 에서는 사용하지 않는다. 필요 시 machine-local handler 를 `agent-system/local/harness-command.sh` 에 둔다.

## 정본 계층

- Codex 규칙 정본: `.codex/instructions/`
- GitHubDocs 규칙 정본: `.github/copilot-instructions.md`, `.github/instructions/`
- 산출물 문서 정본: `docs/`, `docs/dms/`

## 현재 앱/패키지 기준선

- 앱: `apps/server`, `apps/web/admin`, `apps/web/crm`, `apps/web/pms`, `apps/web/dms`, `apps/web/sns`
- 공용 패키지: `packages/database`, `packages/types`, `packages/web-auth`, `packages/web-shell`, `packages/web-ui`
- path-specific instruction 은 server/pms/dms/database/types/testing 기준으로 적용하고, SNS/Admin/CRM 웹 앱은 `.github/instructions/sns.instructions.md`, `.github/copilot-instructions.md`, `docs/common/explanation/architecture/ssoo-frame-system.md`의 공용 auth/shell 기준을 함께 적용합니다.

## 주의

- `.codex/instructions/`와 `.github/` 핵심 규칙은 `.codex/scripts/verify-codex-sync.js`로 동기화 검증됩니다.
- 동기화 검증 실패 시 preflight/push-guard는 실패 처리됩니다.
