# 에이전트 문서 동기화 체크리스트

정본(`.github/`) 수정 후 아래 순서로 미러를 반영합니다.

1. `.github/copilot-instructions.md` 또는 `.github/instructions/*` 수정
2. `CLAUDE.md` 미러 반영
3. `apps/web/dms/CLAUDE.md` 미러 반영 (DMS 관련 변경 시)
4. `.codex/instructions/*` 미러 반영 (필요 시)
5. `pnpm run codex:verify-sync` 실행
6. `pnpm run codex:preflight` 실행
