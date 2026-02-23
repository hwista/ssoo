---
name: ssoo-doc-aware-dev
description: Use this skill for SSOO monorepo tasks requiring code changes plus synchronized updates across Codex instructions, GitHubDocs rules, and repo canonical docs.
---

# SSOO Doc-Aware Dev

SSOO 작업에서 코드와 문서를 함께 맞추고 Codex/GitHubDocs 규칙 동기화를 유지하기 위한 워크플로우입니다.

## 언제 이 스킬을 쓰는가

- `ssoo`, `모노레포`, `pms`, `dms`, `server`, `docs` 관련 작업
- 기능 개발/리팩토링/버그 수정 후 문서 동기화가 필요한 작업
- `.codex`/`.github` 규칙과 실제 구현의 정합성을 맞춰야 하는 작업

## 워크플로우

1. 작업 범위 식별
- DMS만 변경: `apps/web/dms/**` + `apps/web/dms/docs/**`
- 모노레포 공통: 루트 `docs/**`, `.github/**`, `apps/server/**`, `apps/web/pms/**`, `packages/**`

2. 선행 문서 확인
- 진입점: `AGENTS.md`
- Codex 정본: `.codex/instructions/codex-instructions.md`, `.codex/instructions/project.instructions.md`
- 모노레포: `docs/common/AGENTS.md`, `.github/copilot-instructions.md`
- DMS: `apps/web/dms/docs/AGENTS.md`, `.github/instructions/dms.instructions.md`, `.codex/instructions/dms.instructions.md`
- 문서 맵: `references/doc-map.md`

3. 코드 수정 + 문서 동기화
- 코드 변경 시 해당 도메인 문서(`docs/` 또는 `apps/web/dms/docs/`)의 backlog/changelog 반영 여부 확인
- 규칙 변경 시 `.codex/instructions/*.md` + `.github/instructions/*.md` 동시 반영 여부 확인

4. 검증 실행
- 기본: `bash .codex/hooks/preflight.sh`
- DMS 변경 포함 시: `bash .codex/hooks/dms-guard.sh`
- push 전: `bash .codex/hooks/push-guard.sh`

5. 결과 보고
- 변경 파일 목록
- 어떤 문서를 왜 갱신했는지
- 어떤 검증을 통과/실패했는지

## 실행 커맨드 치트시트

```bash
# Codex 동기화 검증
node .codex/scripts/verify-codex-sync.js

# 루트 빠른 검증
bash .codex/hooks/preflight.sh

# 문서 구조 검증
node .github/scripts/check-docs.js

# 코드 패턴 검증
node .github/scripts/check-patterns.js

# DMS 빌드 검증
cd apps/web/dms && npm run build

# 변경 범위 빌드 검증 (server/pms/dms 자동 선택)
bash .codex/hooks/push-guard.sh
```
