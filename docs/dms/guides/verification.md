# DMS 검증 기준

> 최종 업데이트: 2026-03-23

DMS 작업 시 확인해야 할 검증 게이트를 정리한 문서입니다. 전역 게이트와 DMS 고유 게이트를 구분해서 해석합니다.

---

## 1. 워크스페이스 전역 게이트

이 항목은 DMS 변경과 무관한 레포 전역 이슈로도 실패할 수 있습니다.

| 검증 | 명령 | 의미 |
|------|------|------|
| 타입 검사 | `cd apps/web/dms && npx tsc --noEmit` | DMS 타입 에러 0건 확인 |
| 빌드 | `pnpm -w run build:web-dms` | DMS 프로덕션 빌드 가능 여부 확인 |
| 패턴 검사 | `node .github/scripts/check-patterns.js` | 레포 공통 네이밍/패턴 규칙 확인 |
| 문서 링크 검사 | `node .github/scripts/check-docs.js` | 마크다운 링크/참조 유효성 확인 |
| 프리플라이트 | `pnpm run codex:preflight` | 전역 문서/규칙/검증 묶음 실행 |

### 해석 원칙

- 전역 게이트 실패가 곧바로 DMS 실패를 뜻하지는 않습니다.
- 예: `docs/chs/CHANGELOG.md` 같은 DMS 범위 외 파일 문제는 `레포 전역 이슈`로 분리 기록합니다.

---

## 2. DMS 고유 게이트

이 항목은 DMS 슬라이스의 구조, 규칙, 빌드 상태를 직접 검증합니다.

| 검증 | 명령 | 의미 |
|------|------|------|
| 골든 샘플 검사 | `pnpm -C apps/web/dms run check:golden-example` | 페이지 엔트리, 폴더 배치, 금지 패턴이 현재 기준선과 맞는지 확인 |
| DMS 가드 | `pnpm -w run codex:dms-guard` | DMS 변경이 포함된 경우 빌드/구조 검사를 강제 |
| 동기화 검증 | `pnpm run codex:verify-sync` | Codex 정본과 GitHubDocs 규칙 동기화 확인 |

### 독립성 규칙

- DMS는 `@ssoo/*` 패키지 import 없이 독립적으로 동작해야 합니다.
- markdown editor/runtime은 현재 `page-local` 구조를 기준으로 유지합니다.
- non-stream JSON API는 envelope 규약을 사용하고, stream/binary route는 예외 정책을 따릅니다.

---

## 3. 권장 실행 순서

| 순서 | 명령 | 목적 |
|------|------|------|
| 1 | `cd apps/web/dms && npx tsc --noEmit` | 빠른 타입 회귀 확인 |
| 2 | `pnpm -w run build:web-dms` | 번들/라우트/서버 코드 빌드 확인 |
| 3 | `pnpm -C apps/web/dms run check:golden-example` | DMS 구조 기준선 확인 |
| 4 | `pnpm -w run codex:dms-guard` | DMS 가드 기준 충족 확인 |
| 5 | `node .github/scripts/check-docs.js` | 문서 링크 점검 |
| 6 | `pnpm run codex:verify-sync` | 정본 동기화 확인 |
| 7 | `pnpm run codex:preflight` | 최종 통합 검증 |

---

## 4. 실패 시 대응 가이드

| 게이트 | 일반적 원인 | 처리 방식 |
|--------|-------------|-----------|
| `tsc --noEmit` | 타입 계약 불일치, import 경로 오류 | 코드 수정 후 재실행 |
| `build:web-dms` | Next route/build 단계 회귀 | DMS 코드 수정 후 재실행 |
| `check:golden-example` | 페이지 엔트리 네이밍, 폴더 배치, 금지 패턴 위반 | DMS 구조 기준선에 맞게 수정 |
| `codex:dms-guard` | DMS 빌드/구조/규칙 실패 | DMS 범위 문제로 간주하고 우선 해결 |
| `check-patterns.js` | 전역 패턴 규칙 위반 | DMS 범위인지 전역 범위인지 먼저 구분 |
| `check-docs.js` | 문서 링크/경로 오류 | 링크 수정 후 재실행 |
| `codex:verify-sync` | `.codex` 와 `.github` 정본 불일치 | 규칙 정본 동기화 필요 |
| `codex:preflight` | 전역 문서/규칙/검증 묶음 중 일부 실패 | DMS 범위 외 실패는 별도 이슈로 분리 |

---

## 5. 판정 기준

- DMS 작업 성공 판정:
  - `tsc --noEmit`
  - `build:web-dms`
  - `check:golden-example`
  - `codex:dms-guard`
  위 4개가 통과하면 DMS 슬라이스는 정상으로 봅니다.
- `codex:preflight` 에서 DMS 외부 원인 실패가 발생하면:
  - DMS 실패로 기록하지 않음
  - changelog/backlog에는 `레포 전역 이슈 (DMS 범위 외)` 로 분리 표기

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-03-23 | DMS 전용 검증 기준 문서 신규 작성 |
