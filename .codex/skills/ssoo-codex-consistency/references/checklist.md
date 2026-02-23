# Codex Consistency Checklist

## 필수 존재 파일

- `AGENTS.md`
- `.codex/instructions/codex-instructions.md`
- `.codex/instructions/project.instructions.md`
- `.codex/config/reference-map.json`
- `.codex/config/sync-manifest.json`
- `.codex/scripts/verify-codex-sync.js`

## 동기화 체크

1. `sync-manifest.json` 체크 항목의 source/target 파일 존재
2. sourcePattern/targetPattern 문자열이 실제 파일에 존재
3. preflight/push-guard에서 `verify-codex-sync` 선행 실행
4. `package.json`에 `codex:verify-sync` 스크립트 존재
