# DMS 전면 표준화 감사 리포트 (2026-03)

> 작성일: 2026-03-23
> 상태: 🔄 감사 완료, 후속 리팩토링 대기
> 기준선: 현재 프레임워크/레포 표준 + 골든 이그잼플 동등 비교

## 요약

이번 감사는 `apps/web/dms/**`, `docs/dms/**`, DMS 관련 instruction 정본을 함께 점검했다.

핵심 결론:

- DMS는 큰 방향의 구조(`app → components → stores/lib/server`)는 유지하고 있다.
- 다만 최근 기능 추가로 인해 일부 핵심 페이지와 서비스에 책임이 다시 집중되었다.
- 코드 구조보다 더 큰 혼선은 "문서/가이드/골든 이그잼플/실제 구현"이 서로 다른 구조를 설명하는 지점에서 발생하고 있다.
- 따라서 후속 작업은 "대형 파일 분해"와 "정본 문서/규칙 재정렬"을 병렬 트랙으로 진행해야 한다.

## 감사 범위

- 언어/프레임워크 표준
  - Next.js 15 App Router, React 19, TypeScript 구조 사용
- 레포/도메인 규칙 정합성
  - [AGENTS.md](/home/a0122024330/src/ssoo/AGENTS.md)
  - [.codex/instructions/codex-instructions.md](/home/a0122024330/src/ssoo/.codex/instructions/codex-instructions.md)
  - [.codex/instructions/project.instructions.md](/home/a0122024330/src/ssoo/.codex/instructions/project.instructions.md)
  - [.codex/instructions/dms.instructions.md](/home/a0122024330/src/ssoo/.codex/instructions/dms.instructions.md)
- DMS 정본 문서
  - [docs/dms/README.md](/home/a0122024330/src/ssoo/docs/dms/README.md)
  - [docs/dms/guides/golden-example.md](/home/a0122024330/src/ssoo/docs/dms/guides/golden-example.md)
  - [docs/dms/guides/components.md](/home/a0122024330/src/ssoo/docs/dms/guides/components.md)
  - [docs/dms/guides/hooks.md](/home/a0122024330/src/ssoo/docs/dms/guides/hooks.md)
  - [docs/dms/guides/api.md](/home/a0122024330/src/ssoo/docs/dms/guides/api.md)
- 대표 구현 샘플
  - [DocumentPage.tsx](/home/a0122024330/src/ssoo/apps/web/dms/src/components/pages/markdown/DocumentPage.tsx)
  - [SettingsPage.tsx](/home/a0122024330/src/ssoo/apps/web/dms/src/components/pages/settings/SettingsPage.tsx)
  - [DocAssistService.ts](/home/a0122024330/src/ssoo/apps/web/dms/server/services/docAssist/DocAssistService.ts)

## 주요 발견 사항

### Critical

1. 문서 정본끼리 동일한 구조를 설명하지 않는다.
   - 근거:
     - [.codex/instructions/dms.instructions.md](/home/a0122024330/src/ssoo/.codex/instructions/dms.instructions.md) 는 block editor 런타임을 `components/common/editor/block-editor/*` 로 설명한다.
     - [docs/dms/guides/golden-example.md](/home/a0122024330/src/ssoo/docs/dms/guides/golden-example.md) 도 같은 경로를 기준선 예시로 든다.
     - 실제 구현은 [BlockEditor.tsx](/home/a0122024330/src/ssoo/apps/web/dms/src/components/pages/markdown/_components/editor/block-editor/BlockEditor.tsx) 에 있다.
   - 영향:
     - 새 작업자가 레이어 판정을 잘못할 가능성이 높다.
     - 골든 샘플 검증 기준과 실제 코드가 어긋난 상태가 된다.
   - 처리 방향:
     - 코드 기준선과 규칙 정본 중 무엇이 정답인지 확정하고 둘 중 하나를 일괄 수정한다.

2. DMS 인덱스/검증 문서가 현재 구조보다 과거 구조를 더 많이 설명한다.
   - 근거:
     - [docs/dms/README.md](/home/a0122024330/src/ssoo/docs/dms/README.md) 는 `tutorials/`, `tests/` 같은 현재 없는 구조를 노출한다.
     - [docs/dms/planning/verification-report.md](/home/a0122024330/src/ssoo/docs/dms/planning/verification-report.md) 는 현재 존재하지 않는 훅과 API 목록을 기준으로 "100% 일치"를 선언한다.
     - [apps/web/dms/README.md](/home/a0122024330/src/ssoo/apps/web/dms/README.md) 는 `docs/development/*` 기준 링크와 오래된 기능/구조 설명을 여전히 포함한다.
   - 영향:
     - 문서 정본 신뢰도가 낮아지고, 이후 리팩토링 우선순위가 왜곡된다.
   - 처리 방향:
     - 정본 문서와 레거시/기록 문서를 명확히 분리하고, 사실이 아닌 검증 선언은 정정한다.

### High

3. 핵심 페이지 엔트리에 orchestration 책임이 과도하게 집중되어 있다.
   - 근거:
     - [DocumentPage.tsx](/home/a0122024330/src/ssoo/apps/web/dms/src/components/pages/markdown/DocumentPage.tsx) 는 1755 lines 규모이며 편집기 상태, AI 작성, 템플릿 저장, 첨부 복원, diff 모드, 경로 추천, sidecar 조립을 함께 가진다.
     - [SettingsPage.tsx](/home/a0122024330/src/ssoo/apps/web/dms/src/components/pages/settings/SettingsPage.tsx) 는 설정 로드/검증/저장과 템플릿 CRUD를 함께 소유한다.
     - [SearchPage.tsx](/home/a0122024330/src/ssoo/apps/web/dms/src/components/pages/ai/SearchPage.tsx) 도 295 lines로 page 엔트리 권장 크기를 초과한다.
   - 영향:
     - 기능 추가 시 회귀 범위가 넓고, 골든 샘플이 의도한 page-entry orchestration 경계를 약화시킨다.
   - 처리 방향:
     - `page entry`, `feature flow hook`, `page-local panel`, `domain-common primitive`로 책임을 다시 분리한다.

4. 서버 서비스 일부가 "thin handler / service implementation" 기준은 지키지만 서비스 내부 책임 분리가 약하다.
   - 근거:
     - [DocAssistService.ts](/home/a0122024330/src/ssoo/apps/web/dms/server/services/docAssist/DocAssistService.ts) 는 relevance 판정, path fallback, 이미지 수집, 트리 평탄화, 제목/파일명 추천, 모델 호출을 한 파일에서 처리한다.
     - [GitService.ts](/home/a0122024330/src/ssoo/apps/web/dms/server/services/git/GitService.ts) 435 lines, [FileCrudService.ts](/home/a0122024330/src/ssoo/apps/web/dms/server/services/file/FileCrudService.ts) 281 lines도 같은 경향을 보인다.
   - 영향:
     - 테스트 포인트가 흐려지고, API 계약 수정 시 회귀 탐지가 어려워진다.
   - 처리 방향:
     - service 내부를 `contract`, `policy`, `adapter`, `formatter` 레벨로 분리한다.

### Medium

5. 레이어 설명 문서와 실제 훅/컴포넌트 목록이 부분적으로 어긋난다.
   - 근거:
     - [docs/dms/guides/hooks.md](/home/a0122024330/src/ssoo/docs/dms/guides/hooks.md) 는 2개 훅만 설명하지만 실제 `src/hooks`에는 7개 훅이 있다.
     - [docs/dms/guides/components.md](/home/a0122024330/src/ssoo/docs/dms/guides/components.md) 는 `common/editor/` 구조를 설명하지만 현재 구현은 markdown page local editor 중심이다.
   - 영향:
     - 기능 추가 시 어느 레이어에 둘지 혼선이 생긴다.
   - 처리 방향:
     - "현재 구조 설명"과 "목표 구조"를 분리해서 문서화한다.

6. 골든 샘플 문서가 현재 코드베이스의 사실과 목표 구조를 섞어 설명한다.
   - 근거:
     - [docs/dms/guides/golden-example.md](/home/a0122024330/src/ssoo/docs/dms/guides/golden-example.md) 는 `common/editor/*` 를 현재 기준선 예시로 적지만 실제 구현은 page-local editor 중심이다.
     - 같은 문서가 [DocumentPage.tsx](/home/a0122024330/src/ssoo/apps/web/dms/src/components/pages/markdown/DocumentPage.tsx) 를 기준선 예시로 들면서도 해당 파일의 비대화는 별도 경고하지 않는다.
   - 영향:
     - "현황 문서"인지 "목표 상태 문서"인지 판단이 어렵다.
   - 처리 방향:
     - 골든 샘플을 `현재 허용 기준`과 `목표 구조`로 분리한다.

7. 레포 게이트 상태가 DMS 품질 판단과 혼합되어 있다.
   - 근거:
     - `pnpm run codex:preflight` 는 `docs/chs/CHANGELOG.md` 문서 규칙 오류 때문에 실패한다.
     - 이 실패는 현재 DMS 코드 자체 품질과 직접 관련이 없다.
   - 영향:
     - DMS 후속 작업에서 "게이트 실패" 원인을 오판할 수 있다.
   - 처리 방향:
     - DMS 전용 검증 결과와 레포 전역 게이트 실패를 별도로 기록한다.

## 표준 준수 현황

### 확인된 준수 항목

- `@ssoo/*` import 없음
- `any` 타입 사용 없음
- wildcard export 없음
- `components/pages/**` 엔트리 네이밍은 `{Feature}Page.tsx` 규칙을 지키고 있다
- App Router 공개 진입점은 [apps/web/dms/src/app/(main)/page.tsx](/home/a0122024330/src/ssoo/apps/web/dms/src/app/(main)/page.tsx) 처럼 얇게 유지되고 있다

### 주의가 필요한 항목

- 대형 파일 다수 존재
- page-local 구현이 common/golden-example 설명보다 확장됨
- 일부 계획/검증 문서가 현재 사실보다 낙관적이거나 오래됨

## 권장 후속 트랙

### Track A. 정본 재정렬

- instruction, golden-example, guides, README 중 무엇이 "현재 사실"을 설명하는지 역할을 다시 나눈다.
- 현재 구조를 유지할지, editor/runtime를 common으로 승격할지 먼저 결정한 뒤 문서를 맞춘다.

### Track B. 페이지 엔트리 분해

- `DocumentPage`를 최우선으로 분해한다.
- `SettingsPage`, `SearchPage`는 두 번째 묶음으로 정리한다.

### Track C. 서비스 내부 모듈화

- `DocAssistService`, `GitService`, `FileCrudService`를 policy/helper/adapter로 분리한다.

### Track D. 검증 체계 재정의

- 골든 샘플 검증 스크립트가 실제 기준선을 검사하도록 고친다.
- 레포 전역 게이트 실패와 DMS 전용 실패를 분리해서 보고한다.

## 검증 메모

- `pnpm run codex:verify-sync`: 통과
- `pnpm run codex:preflight`: 실패
  - 원인: `docs/chs/CHANGELOG.md` 문서 규칙 위반
  - 판정: DMS 고유 실패가 아니라 레포 전역 문서 게이트 실패
- `node .github/scripts/check-patterns.js apps/web/dms`: 스크립트가 디렉토리 입력을 처리하지 못해 실패
  - 판정: 감사 근거로는 사용 불가, 스크립트 사용법 또는 구현 보정 필요

## 관련 실행 문서

- [DMS 표준화 실행 백로그 (2026-03)](./standardization-remediation-backlog-2026-03.md)

## Changelog

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-03-23 | DMS 전면 표준화 감사 리포트 최초 작성 |
