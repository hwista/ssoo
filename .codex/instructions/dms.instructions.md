---
applyTo: "apps/web/dms/**"
---

# Codex DMS Instructions

- 대상: `apps/web/dms/**`
- 기준: DMS 독립성(npm, @ssoo/* 금지), editor/viewer 패턴
- 참조: `.github/instructions/dms.instructions.md`
- 검증: `pnpm run build:web-dms` 또는 `pnpm run codex:dms-guard`
- 배포: DMS 변경 커밋을 외부 공유할 때 `pnpm run codex:dms-publish` 사용( GitHub + GitLab 동시 반영/검증 )
