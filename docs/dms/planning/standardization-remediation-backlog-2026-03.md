# DMS 표준화 실행 백로그 (2026-03)

> 작성일: 2026-03-23
> 상태: ✅ 완료
> 입력 문서: [standardization-audit-2026-03.md](./standardization-audit-2026-03.md)

## 요약

이 문서는 2026-03 표준화 감사를 실제 리팩토링 작업 단위로 분해한 실행 백로그다.

원칙:

- 각 작업은 구현자가 추가 의사결정 없이 착수 가능해야 한다.
- 문서 정합성 복구와 구조 리팩토링을 분리한다.
- "코드 수정"과 "규칙 정본 수정"을 같은 작업으로 섞지 않는다.

## Track A. 정본/문서 정합성 복구

| ID | 작업 | 우선순위 | 완료 조건 | 검증 |
|----|------|----------|-----------|------|
| DMS-STD-01 | DMS 구조 정본 재선언 | P1 | `.codex/instructions/dms.instructions.md`, `docs/dms/guides/golden-example.md`, `docs/dms/guides/components.md` 가 동일한 구조를 설명한다 | `pnpm run codex:verify-sync`, `pnpm -C apps/web/dms run check:golden-example` | ✅ 완료 |
| DMS-STD-02 | `docs/dms/README.md` 인덱스 현행화 | P1 | 실제 존재하는 폴더/문서만 노출하고 핵심 문서 링크가 현재 정본을 가리킨다 | `node .github/scripts/check-docs.js` | ✅ 완료 |
| DMS-STD-03 | `apps/web/dms/README.md` 레거시 정보 정리 | P1 | 오래된 구조 설명, `docs/development/*` 링크, 현재와 다른 기능 소개를 제거하거나 archive로 격리한다 | 수동 링크 점검 | ✅ 완료 |
| DMS-STD-04 | `verification-report.md` 역할 재정의 | P2 | 허위 "100% 일치" 선언 제거, 현재는 역사 기록인지 현행 검증 문서인지 명시한다 | 수동 검토 | ✅ 완료 |
| DMS-STD-05 | DMS 전용 검증 기준 문서화 | P2 | 전역 게이트 실패와 DMS 고유 실패를 구분하는 검증 섹션이 추가된다 | `pnpm run codex:preflight` 결과 첨부 | ✅ 완료 |

## Track B. 페이지 엔트리 책임 분해

| ID | 작업 | 우선순위 | 완료 조건 | 검증 |
|----|------|----------|-----------|------|
| DMS-STD-10 | `DocumentPage` 1차 분해 | P1 | 문서 로딩/편집 오케스트레이션, AI compose 흐름, diff/sidecar 흐름이 별도 hook 또는 page-local module로 분리된다 | `npm --prefix apps/web/dms run build` | ✅ 완료 |
| DMS-STD-11 | markdown editor runtime 배치 확정 | P1 | editor runtime이 `page-local` 인지 `common` 인지 결정하고, 코드와 문서를 같은 기준으로 맞춘다 | `pnpm -C apps/web/dms run check:golden-example` | ✅ 완료 |
| DMS-STD-12 | `SettingsPage` 템플릿 관리 분리 | P2 | 설정 저장 화면과 템플릿 CRUD 흐름이 별도 section/controller 수준으로 분리된다 | `npm --prefix apps/web/dms run build` | ✅ 완료 |
| DMS-STD-13 | `SearchPage` 화면 상태 분해 | P2 | 검색 입력, 결과 렌더링, sidecar/경로 처리의 책임이 명확히 분리된다 | `npm --prefix apps/web/dms run build` | ✅ 완료 |

## Track C. 서버 서비스 모듈화

| ID | 작업 | 우선순위 | 완료 조건 | 검증 |
|----|------|----------|-----------|------|
| DMS-STD-20 | `DocAssistService` 내부 policy/helper 분리 | P1 | relevance, fallback, prompt input shaping, model invocation 보조 로직을 하위 모듈로 이동한다 | `npm --prefix apps/web/dms run build` | ✅ 수용 종결 |
| DMS-STD-21 | `GitService` 책임 경계 재정리 | P2 | git 명령 실행, 결과 매핑, 에러 표현이 별도 함수/모듈로 분리된다 | `npm --prefix apps/web/dms run build` | ✅ 완료 |
| DMS-STD-22 | `FileCrudService` 계약/정책 분리 | P2 | 파일 CRUD wire contract와 파일시스템 정책 로직이 분리된다 | `npm --prefix apps/web/dms run build` | ✅ 수용 종결 |

## Track D. 검증/품질 게이트 정리

| ID | 작업 | 우선순위 | 완료 조건 | 검증 |
|----|------|----------|-----------|------|
| DMS-STD-30 | `check-patterns.js` DMS 사용 경로 정리 | P2 | 디렉토리 인자를 받지 못하는 현재 실패 원인을 정리하고, 올바른 호출 방식 또는 스크립트 수정 방안을 문서화한다 | 실제 스크립트 실행 | ✅ 완료 |
| DMS-STD-31 | 골든 샘플 검사 범위 재정렬 | P1 | 검사 스크립트가 현재 기준선과 맞지 않는 규칙을 검사하지 않도록 조정된다 | `pnpm -C apps/web/dms run check:golden-example` | ✅ 완료 |
| DMS-STD-32 | 표준화 리팩토링 QA 시나리오 추가 | P2 | page entry 분해와 service 분해 이후 회귀 확인용 최소 시나리오가 문서화된다 | 수동 QA 기록 | ✅ 완료 |

## 권장 실행 순서

1. `DMS-STD-01 ~ 05`
2. `DMS-STD-10 ~ 11`
3. `DMS-STD-20`
4. `DMS-STD-12 ~ 13`, `DMS-STD-21 ~ 22`
5. `DMS-STD-30 ~ 32`

## Assumptions

- DMS 독립성 원칙은 유지한다.
- 구조 정리는 새 추상화 추가보다 책임 분리를 우선한다.
- 문서가 틀린 경우 코드를 억지로 문서에 맞추지 않고, 먼저 "현재 사실"과 "목표 구조"를 분리해서 판단한다.

## Changelog

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-03-23 | STD-00 트랙 전 항목 상태를 `✅ 완료` 또는 `✅ 수용 종결`로 확정하고, 검증 기준/QA 시나리오 문서를 추가해 실행 백로그를 마감 |
| 2026-03-23 | 1차 범위(Quick Wins, AppResult, JSON envelope, 문서 기준선 복구) 착수 상태로 갱신 |
| 2026-03-23 | 표준화 실행 백로그 최초 작성 |
