---
name: ssoo-codex-consistency
description: Use this skill when Codex instruction consistency, reference mapping, or sync verification needs to be created or updated in the SSOO monorepo.
---

# SSOO Codex Consistency

Codex 정본(`.codex/instructions`)과 GitHubDocs(`.github`) 핵심 규칙 정합성을 유지하는 워크플로우입니다.

## 언제 이 스킬을 쓰는가

- Codex 규칙 신설/수정 작업
- `.codex/config/reference-map.json` 또는 `.codex/config/sync-manifest.json` 수정 작업
- 훅에서 규칙 동기화 검증을 강제해야 하는 작업

## 워크플로우

1. 기준 파일 확인
- `AGENTS.md`
- `.codex/instructions/codex-instructions.md`
- `.codex/instructions/project.instructions.md`
- `.github/copilot-instructions.md`

2. 매핑/동기화 설정 점검
- `references/checklist.md` 순서대로 누락 점검

3. 검증 실행
- `node .codex/scripts/verify-codex-sync.js`
- `bash .codex/hooks/preflight.sh`

4. 보고
- 동기화 성공/실패 항목
- 누락된 정본 파일
- 추가 조치 필요 항목
