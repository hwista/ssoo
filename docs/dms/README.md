# DMS 문서

> 최종 업데이트: 2026-08-20
> 정본 위치: `docs/dms/`

Document Management System(DMS) 문서의 단일 정본 인덱스입니다.

DMS는 PMS와 CRM에서 발생한 견적서, 계약서, 회의록, 보고서, 검수 자료, 산출물 파일을 연결하는 문서 자산 계층입니다. 견적, 계약, 회의록, 보고서 작성 흐름은 각 도메인 기능이 소유하고, DMS는 문서 뷰어, 문서 허브, 첨부, 버전, 공개 범위, 검토 상태, 템플릿 또는 레퍼런스를 제공합니다.

최신 완료: [문서 도식·휴대폰 도구 결과](../common/explanation/architecture/2026-09-18-document-diagram-handoff.md). 승인 범위 구현·검증 완료. [사용 안내](guides/document-diagrams.md). 승인 대장 21/22 완료·1잔여, 운영 증거 0/5.

직전 후속: [알림 연결 오류 수정](../common/explanation/architecture/2026-09-17-notification-stream-handoff.md). 기존 화면·연동·사용 방법을 유지한 공통 내부 수정과 검증 기록이다.

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
| [DMS 설정/제어/운영 책임 경계](./explanation/architecture/settings-control-operations-boundary.md) | Admin=플랫폼/base, DMS=DMS 세부 시스템 설정/제어/운영 정본 |
| [SSOO 내부 페이지 조립 표준](../common/explanation/architecture/content-page-assembly-standard.md) | content-area 내부 페이지를 web-shell 재료와 recipe로 조립하는 공통 표준 |
| [일-사람-산출물 운영 모델](../common/explanation/architecture/work-people-artifact-operating-model.md) | CRM/PMS에서 생성되는 문서와 산출물을 DMS 문서 자산 계층으로 연결하는 공통 기준 |
| [문서 공개 범위 및 접근 모델](./explanation/domain/document-visibility-and-access-model.md) | visibility, explicit grant, request flow, search/tree 경계 |
| [인증/권한 준비도](./planning/auth-access-readiness.md) | 공통 auth/access 경계, DMS 현재 상태, 다음 우선순위 |
| [상태 관리](./explanation/architecture/state-management.md) | 스토어/상태 흐름 |
| [디자인 시스템](./explanation/design/design-system.md) | UI 디자인 기준 |
| [API 가이드](./guides/api.md) | API 명세/사용 예시 |
| [Docker 배포와 런타임 프로필](./guides/deployment.md) | dev 사용자 인수 테스트, local-test 자동검증, prod 공개 배포 경계와 인계 절차 |
| [컴포넌트 가이드](./guides/components.md) | 컴포넌트 구성 |
| [훅 가이드](./guides/hooks.md) | 커스텀 훅 설명 |
| [골든 이그잼플 가이드](./guides/golden-example.md) | 구조 기준선 / 레이어 판정 / 검증 규칙 |
| [로드맵](./planning/roadmap.md) | 계획/단계 |
| [백로그](./planning/backlog.md) | 작업 항목 |
| [홈 워크 허브 Ralph 계획](./planning/2026-08-20-home-work-hub-ralph-plan.md) | 개인화 최근 문서·변경·처리함·운영 예외의 데이터/API/UI/Ralph 수용 기준 |
| [DMS·Admin 운영 완결성 Launch Ralph 계획](./planning/2026-08-14-operational-launch-ralph-plan.md) | 이전 운영 goal을 포함한 기능·설정·제어·진단·복구 100% 수용 기준과 브라우저 명세 |
| [프로덕션 Go-live Ralph 계획](./planning/2026-08-13-production-go-live-ralph-plan.md) | 프로덕션 인프라·복구·릴리즈와 Admin/DMS 운영을 포함한 다섯 트랙의 최종 Go/No-Go 명세 |
| [프로덕션 Go-live Ralph 핸드오프](./planning/2026-08-13-production-go-live-ralph-handoff.md) | 2026-08-13 당시 구현·검증 상태와 재개 지점(현행 기준은 2026-08-14 계획) |
| [협업/권한/알림/댓글 런칭 핸드오프](./planning/2026-05-29-launch-collaboration-handoff.md) | 2026-05-29 런칭 closeout 인계 |
| [PRD 템플릿](./planning/prd-template.md) | 작업 요청 입력 형식 |
| [변경 이력](./planning/changelog.md) | 변경 기록 |

## 운영 경로

- 런타임 markdown root: `git.repositoryPath` / `DMS_MARKDOWN_ROOT` (settings runtime surface에서 관측, 변경은 deploy/runtime config)
- 런타임 binary storage root: `storage.local.basePath` / `DMS_STORAGE_LOCAL_BASE_PATH`
- 런타임 ingest queue: `ingest.queuePath` / `DMS_INGEST_QUEUE_PATH`
- 런타임 template root: `markdownRoot/_templates/` (문서 Git 레포 하위, 별도 `DMS_TEMPLATE_ROOT` 불필요)
- 레거시 문서 보관: `docs/dms/_archive/`

## 현재 검증 기준선

2026-09-17 후속: [계약 초안 내부 승인](../common/explanation/architecture/2026-09-17-contract-internal-approval-handoff.md)을 고객관리 화면에서 구현·검증했다. 문서관리의 기존 공유·열람 권한을 적용하며 초안 저장 시 기존 문서 등록 절차를 연결했다. 문서관리 화면과 기존 인터페이스 계약은 그대로 유지한다.

2026-09-17: 사용자 승인-01의 1번 선택으로 [계약 문서 생성 기록의 의미 보정](../common/explanation/architecture/2026-09-17-contract-records-handoff.md)을 완료했다. 기존 연동·문서 업무와 과거 기록을 보존하며 실제 담당자별 결재 구현을 뜻하지 않는다. 문서관리 가드·새 빌드·세 크기·기존 회귀 4/4 통과.

- 서버/DMS 타입·빌드 기준선: `pnpm --filter server exec tsc --noEmit`, `pnpm --filter web-dms exec tsc --noEmit`, `pnpm build:server`, `pnpm build:web-dms`
- DMS 계약 기준선: `pnpm -C apps/web/dms run check:user-scope-contract`, `pnpm -C apps/web/dms run check:golden-example`, `pnpm -C apps/web/dms run check:shell-body-contract`
- 런타임 접근 기준선: `pnpm verify:access-dms`
- 프로덕션 설정/복구/공개 endpoint self-test: `pnpm run docker:production:verify-env:self-test`, `pnpm run verify:dms-backup-restore:self-test`, `pnpm run verify:dms-public-endpoints:self-test`
- 최종 Go gate: 운영값과 동일 SHA 이미지를 배포한 뒤 `pnpm run verify:dms-go-live`

## Backlog

| ID | 항목 | 우선순위 | 상태 |
|----|------|----------|------|
| DMS-AUTH-01 | 공통 auth/access 기반 위 DMS 문서 object ACL 연결 | P1 | ✅ 완료 |

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-08-20 | 정적 홈을 실제 사용자별 문서 활동·콘텐츠 변경 시계·처리함·운영 예외 기반 워크 허브로 전환하고 dev Docker 관리자/일반 사용자/모바일/부분 장애 Ralph 증거 연결 |
| 2026-08-19 | 실제 로컬 Docker 사용자 인수 테스트는 dev, local-test는 자동 회귀 전용이라는 프로필 선택·인계 기준을 배포 가이드에 연결 |
| 2026-08-14 | Admin/DMS 운영 기능 전체를 프로덕션 네 트랙과 결합한 운영 완결성 Launch Ralph 계획을 정본 인덱스에 연결 |
| 2026-08-13 | 프로덕션 Go-live Ralph 계획/핸드오프와 네 트랙 최종 gate를 핵심 문서·검증 기준선에 연결 |
| 2026-06-17 | SSOO 내부 페이지 조립 표준을 핵심 문서에 연결하고 DMS 문서 페이지를 골든 이그잼플 기준으로 명시 |
| 2026-06-10 | DMS 설정/제어/운영 책임 경계 정본을 추가하고 Admin/platform vs DMS/domain-specific ownership 기준을 핵심 문서에 연결 |
| 2026-06-05 | DMS의 역할을 PMS/CRM 도메인 기능 안에서 산출물 파일, 문서 뷰어, 문서 허브, 첨부, 검토 상태를 연결하는 문서 자산 계층으로 정정 |
| 2026-06-05 | CRM/PMS 산출물을 DMS 문서 자산 계층으로 연결하는 공통 운영 모델을 핵심 문서에 추가 |
| 2026-05-29 | 협업/권한/알림/댓글 런칭 closeout 핸드오프를 핵심 문서에 추가하고, 로드맵/백로그/API/변경 이력 기준을 2026-05-29 현재 상태로 현행화 |
| 2026-05-27 | GitHub-GitLab workspace 통합 가이드와 DMS AGENTS에 병행 개발용 작업 전·push 전 GitLab sync 절차를 반영 |
| 2026-05-18 | 현재 검증 기준선을 추가하고, 공통 알림/SSE·사용자별 state isolation·권한 요청 취소/알림 cleanup 상태를 로드맵/백로그에 반영 |
| 2026-04-22 | 운영 경로 안내를 repo-local `apps/web/dms/data/documents/` 단일 경로에서 external runtime path contract(`DMS_MARKDOWN_ROOT`, `DMS_STORAGE_LOCAL_BASE_PATH`, `DMS_INGEST_QUEUE_PATH`, `DMS_TEMPLATE_ROOT`) 기준으로 갱신 |
| 2026-04-16 | 문서 공개 범위/접근 모델과 hybrid document control-plane 정본 문서를 핵심 문서 목록에 추가 |
| 2026-04-13 | DMS auth/access readiness 문서를 추가하고, raw/attachment binary delivery를 session-backed auth proxy 기준으로 보강 |
| 2026-04-09 | DMS access baseline feature policy 적용: role/org/exception 기반 snapshot, server guard, web UI gating 정리 |
| 2026-04-07 | GitHub-GitLab workspace publish 운영 가이드를 핵심 문서 목록에 추가 |
| 2026-04-07 | DMS를 pnpm workspace 앱으로 편입하고 `@ssoo/types` 기반 공유 계약 타입을 도입 |
| 2026-04-06 | GitLab 운영 기준을 full-workspace `development` branch로 전환하고 `codex:workspace-sync-from-gitlab` / `codex:workspace-publish` 표준 명령을 추가 |
| 2026-04-06 | settings IA 슬롯 확장: 시스템에 권한/전체문서관리/전역스케줄러/템플릿 마켓/관리자 템플릿, 개인에 공개·내 템플릿/내 문서·내 활동 surface 추가 |
| 2026-04-06 | settings surface 확장 — storage runtime 필드, upload/search/DocAssist 정책, viewer/sidebar 개인 기본값, M365 metadata-only 설정 추가 |
| 2026-04-02 | 과거 설정 전용 frame 실험, system/personal 설정 분리, 공용 JSON renderer/editor/diff 계층 추가, 3뎁스 settings navigation 정리 |
| 2026-03-17 | 첨부파일 섹션 구현, 파일 업로드 API (해시 기반 중복 제거), 이미지 미리보기 개선, UI 통일 |
| 2026-02-23 | DMS 정본 경로를 `docs/dms/` 단일화하고 인덱스 구조를 PMS와 정렬 |
