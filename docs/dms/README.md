# DMS 문서

> 최종 업데이트: 2026-03-23  
> 정본 위치: `docs/dms/`

Document Management System(DMS) 문서의 단일 정본 인덱스입니다.

## 구조

```
docs/dms/
├── explanation/
│   ├── architecture/
│   ├── domain/
│   └── design/
├── guides/
├── planning/
├── reference/
└── _archive/
```

## 핵심 문서

| 문서 | 설명 |
|------|------|
| [AGENTS.md](./AGENTS.md) | DMS 작업 절차/체크리스트 |
| [기술 스택](./explanation/architecture/tech-stack.md) | DMS 기술 스택 |
| [패키지 구조](./explanation/architecture/package-spec.md) | 의존성/구조 규칙 |
| [상태 관리](./explanation/architecture/state-management.md) | 스토어/상태 흐름 |
| [디자인 시스템](./explanation/design/design-system.md) | UI 디자인 기준 |
| [API 가이드](./guides/api.md) | API 명세/사용 예시 |
| [컴포넌트 가이드](./guides/components.md) | 컴포넌트 구성 |
| [훅 가이드](./guides/hooks.md) | 커스텀 훅 설명 |
| [골든 이그잼플 가이드](./guides/golden-example.md) | 구조 기준선 / 레이어 판정 / 검증 규칙 |
| [검증 기준 가이드](./guides/verification.md) | 전역 게이트와 DMS 고유 게이트 해석 기준 |
| [QA 시나리오 가이드](./guides/qa-scenarios.md) | 표준화 리팩토링 이후 회귀 확인 체크리스트 |
| [표준화 감사 리포트 (2026-03)](./planning/standardization-audit-2026-03.md) | 현재 구조/규칙/문서 드리프트 감사 결과 |
| [표준화 실행 백로그 (2026-03)](./planning/standardization-remediation-backlog-2026-03.md) | 감사 결과 기반 리팩토링 트랙 |
| [로드맵](./planning/roadmap.md) | 계획/단계 |
| [백로그](./planning/backlog.md) | 작업 항목 |
| [PRD 템플릿](./planning/prd-template.md) | 작업 요청 입력 형식 |
| [변경 이력](./planning/changelog.md) | 변경 기록 |

## 운영 경로

- 런타임 위키 자산: `apps/web/dms/data/wiki/`
- 레거시 문서 보관: `docs/dms/_archive/`

## Backlog

| ID | 항목 | 우선순위 | 상태 |
|----|------|----------|------|
| DMS-DOC-INT-01 | 통합 전환 후 경로 레퍼런스 잔존 점검 | P1 | 🔄 진행중 |

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-03-23 | 검증 기준 가이드와 QA 시나리오 가이드를 추가하고 표준화 트랙 마감 문서를 인덱스에 반영 |
| 2026-03-23 | 문서 인덱스 구조를 실제 디렉토리 기준으로 현행화하고 표준화 감사/실행 백로그 문서 링크 추가 |
| 2026-03-17 | 첨부파일 섹션 구현, 파일 업로드 API (해시 기반 중복 제거), 이미지 미리보기 개선, UI 통일 |
| 2026-02-23 | DMS 정본 경로를 `docs/dms/` 단일화하고 인덱스 구조를 PMS와 정렬 |
