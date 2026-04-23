# DMS 문서

> 최종 업데이트: 2026-04-13  
> 정본 위치: `docs/dms/`

Document Management System(DMS) 문서의 단일 정본 인덱스입니다.

## 구조

```
docs/dms/
├── tutorials/
├── guides/
├── reference/
├── explanation/
│   ├── architecture/
│   ├── domain/
│   └── design/
├── planning/
├── tests/
└── _archive/
```

## 핵심 문서

| 문서 | 설명 |
|------|------|
| [AGENTS.md](./AGENTS.md) | DMS 작업 절차/체크리스트 |
| [GitHub-GitLab workspace 통합 가이드](./explanation/architecture/git-subtree-integration.md) | GitLab sync / workspace publish / pre-push guard 운영 절차 |
| [기술 스택](./explanation/architecture/tech-stack.md) | DMS 기술 스택 |
| [패키지 구조](./explanation/architecture/package-spec.md) | 의존성/구조 규칙 |
| [하이브리드 document control-plane](./explanation/architecture/hybrid-document-control-plane.md) | file/Git vs DB metadata projection 경계, `revisionSeq`, reconciliation |
| [문서 공개 범위 및 접근 모델](./explanation/domain/document-visibility-and-access-model.md) | visibility, explicit grant, request flow, search/tree 경계 |
| [인증/권한 준비도](./planning/auth-access-readiness.md) | 공통 auth/access 경계, DMS 현재 상태, 다음 우선순위 |
| [상태 관리](./explanation/architecture/state-management.md) | 스토어/상태 흐름 |
| [디자인 시스템](./explanation/design/design-system.md) | UI 디자인 기준 |
| [API 가이드](./guides/api.md) | API 명세/사용 예시 |
| [컴포넌트 가이드](./guides/components.md) | 컴포넌트 구성 |
| [훅 가이드](./guides/hooks.md) | 커스텀 훅 설명 |
| [골든 이그잼플 가이드](./guides/golden-example.md) | 구조 기준선 / 레이어 판정 / 검증 규칙 |
| [로드맵](./planning/roadmap.md) | 계획/단계 |
| [백로그](./planning/backlog.md) | 작업 항목 |
| [PRD 템플릿](./planning/prd-template.md) | 작업 요청 입력 형식 |
| [변경 이력](./planning/changelog.md) | 변경 기록 |

## 운영 경로

- 런타임 markdown root: `git.repositoryPath` / `DMS_MARKDOWN_ROOT` (settings runtime surface에서 관측, 변경은 deploy/runtime config)
- 런타임 binary storage root: `storage.local.basePath` / `DMS_STORAGE_LOCAL_BASE_PATH`
- 런타임 ingest queue: `ingest.queuePath` / `DMS_INGEST_QUEUE_PATH`
- 런타임 template root: `markdownRoot/_templates/` (문서 Git 레포 하위, 별도 `DMS_TEMPLATE_ROOT` 불필요)
- 레거시 문서 보관: `docs/dms/_archive/`

## Backlog

| ID | 항목 | 우선순위 | 상태 |
|----|------|----------|------|
| DMS-AUTH-01 | 공통 auth/access 기반 위 DMS 문서 object ACL 연결 | P1 | 🔄 진행중 |

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-04-22 | 운영 경로 안내를 repo-local `apps/web/dms/data/documents/` 단일 경로에서 external runtime path contract(`DMS_MARKDOWN_ROOT`, `DMS_STORAGE_LOCAL_BASE_PATH`, `DMS_INGEST_QUEUE_PATH`, `DMS_TEMPLATE_ROOT`) 기준으로 갱신 |
| 2026-04-16 | 문서 공개 범위/접근 모델과 hybrid document control-plane 정본 문서를 핵심 문서 목록에 추가 |
| 2026-04-13 | DMS auth/access readiness 문서를 추가하고, raw/attachment binary delivery를 session-backed auth proxy 기준으로 보강 |
| 2026-04-09 | DMS access baseline feature policy 적용: role/org/exception 기반 snapshot, server guard, web UI gating 정리 |
| 2026-04-07 | GitHub-GitLab workspace publish 운영 가이드를 핵심 문서 목록에 추가 |
| 2026-04-07 | DMS를 pnpm workspace 앱으로 편입하고 `@ssoo/types` 기반 공유 계약 타입을 도입 |
| 2026-04-06 | GitLab 운영 기준을 full-workspace `development` branch로 전환하고 `codex:workspace-sync-from-gitlab` / `codex:workspace-publish` 표준 명령을 추가 |
| 2026-04-06 | settings IA 슬롯 확장: 시스템에 권한/전체문서관리/전역스케줄러/템플릿 마켓/관리자 템플릿, 개인에 공개·내 템플릿/내 문서·내 활동 surface 추가 |
| 2026-04-06 | settings surface 확장 — storage runtime 필드, upload/search/DocAssist 정책, viewer/sidebar 개인 기본값, M365 metadata-only 설정 추가 |
| 2026-04-02 | settings shell 도입, system/personal 설정 분리, 공용 JSON renderer/editor/diff 계층 추가, 3뎁스 settings navigation 정리 |
| 2026-03-17 | 첨부파일 섹션 구현, 파일 업로드 API (해시 기반 중복 제거), 이미지 미리보기 개선, UI 통일 |
| 2026-02-23 | DMS 정본 경로를 `docs/dms/` 단일화하고 인덱스 구조를 PMS와 정렬 |
