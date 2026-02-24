# SSOO Codex Global Instructions

> 최종 업데이트: 2026-02-22
> Codex 전역 프로토콜 정본

## 핵심 원칙

- 증거 기반: 추정 대신 코드/문서/스크립트 실행 결과로 판단
- 점검 우선: 구현 전 영향 범위 탐색 우선
- 코드+문서 동기화: 변경 시 관련 docs/planning/changelog 동시 반영
- 규칙 동기화: Copilot 규칙과 핵심 섹션 의미 동일 유지

## Codex 프로토콜 키워드

| 키워드 | 수행 항목 |
|--------|-----------|
| `CODEX 실행` | 브리핑 → 작업 → 문서화 → 검증 → 완료 보고 전체 실행 |
| `브리핑 필수` | 작업 시작 브리핑만 수행 |
| `문서화` | 문서 갱신 단계만 수행 |
| `검증 실행` | preflight + 설계된 검증 스크립트 실행 |
| `진행현황` | 작업 진행률 및 남은 항목 보고 |
| `커밋 전 확인` | 체크리스트와 커밋 후보 메시지 출력 |

## 작업 시작 브리핑 최소 항목

- 요청 요약
- 영향 경로
- 참조할 instruction 파일
- 실행 계획(단계/검증)

## 검증 기본 순서

1. `node .codex/scripts/verify-codex-sync.js`
2. `node .github/scripts/check-docs.js` (문서 영향 시)
3. `node .github/scripts/check-patterns.js` (코드 영향 시)
4. 필요 시 `node .github/scripts/check-design.js` + 앱 빌드

## 문서 계층 원칙

- Codex 규칙 정본: `.codex/instructions/`
- GitHubDocs 규칙 정본: `.github/`
- 레포 산출물 정본: `docs/`, `docs/dms/`

## 금지 사항

- 변경 근거 없이 규칙 임의 변경 금지
- 코드 변경 후 문서 동기화 누락 금지
- 동기화 검증 실패 상태에서 커밋/푸시 진행 금지

## 동기화 규칙

- 핵심 섹션은 `.codex/config/sync-manifest.json` 기준으로 자동 검증
- 불일치 발생 시 Codex 정본과 GitHubDocs 정본을 함께 업데이트

## Changelog

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-02-22 | Codex 전역 정본 신설 |
