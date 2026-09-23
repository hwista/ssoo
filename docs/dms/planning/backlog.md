# DMS 백로그

> 최종 업데이트: 2026-09-22 (승인된 설정 입력 행 배치 보완)

2026-09-22 설정 입력 행 완료: 사용자 “진행”으로 승인된 10개 설정 메뉴의 항목명·입력란 겹침을 보완했다. 실제 가용 폭에 따른 세로 배치를 적용하고 새 빌드·브라우저 102상태, 승인 비교안 72상태 일치, 입력 유지·초기화·오류 안내를 확인했다. [적용 범위와 검증](2026-09-22-settings-field-layout-handoff.md). 이번 배치 승인 대기 0건. 설정 화면 전체 품질 완료가 아니며 기존 승인 번호를 추가하지 않는다.

---

## 🎯 진행 중

| ID | 항목 | 우선순위 | 담당 | 상태 |
|----|------|----------|------|------|
| 기존 알림 관찰 후속 | 재접속 안내의 응답 길이 불일치 | P1 | - | 내부 수정과 공통 50/50·문서 회귀 4/4 통과. 다섯 서비스 빌드·실제 알림 연결과 필수 가드까지 완료. 신규 승인 번호·완료 증감 없음. [결과](../../common/explanation/architecture/2026-09-17-notification-stream-handoff.md) |
| 승인-01 | 생성 기록 구분과 계약 초안 내부 승인 | P1 | 완료 | 사용자 후속 승인으로 고객관리에서 실제 한 명 지정·요청·승인/반려·철회·이력 완료. 기존 문서관리 화면·연동과 원본 열람 권한 유지. [검증 결과](../../common/explanation/architecture/2026-09-17-contract-internal-approval-handoff.md) |
| DMS-SEARCH-PANEL-20260914 | 좁은 통합 검색 결과 가림 개선 | P1 | - | ✅ 승인-17 완료. 검색 화면만 기존 접기 선택값 지정, 문서 본문·패널 조작·권한·검색/저장 계약 보존. 문서관리 패널 1/1·문서 관련 회귀 4/4 확인. [최신 결과](../../common/explanation/architecture/2026-09-14-service-search-panel-handoff.md) |
| DMS-SEARCH-ENTRY-20260914 | 검색 주소 직접 접속·새로고침 | P1 | - | ✅ 승인-18 완료. 기존 화면 틀 연결, 검색어/필터/새로고침 복원. 기존 루트 검색·빈 입력·문서 본문·저장 계약 보존. 문서관리 검색/패널/문서 관련 회귀 통과. [결과](../../common/explanation/architecture/2026-09-15-search-entry-handoff.md) |
| DMS-VIS-20260911 | 문서 다이어그램·휴대폰 도구 표시 | P1 | 2026-09-18 | 완료. [결과](../../common/explanation/architecture/2026-09-18-document-diagram-handoff.md): 네 종류/네 표시 경로·원문·검색·실패 복구·인쇄·네 화면 너비, 기존 업무 11/11 및 다섯 웹 빌드 검증 |
| DMS-DEP-20260911 | 승인-10 보안 의존성 수정·검수 동작 보존 | P0 | - | ✅ 완료: 잔여 압축 부품 제거·감사 0건·서버 492건·문서관리 회귀 12건. 문서 13개 구성 내용 비교, 실제 양식 업로드·견적 생성/다운로드·편집 첨부 3형식 검증. 화면·사용법·외부 연동 계약 및 기존 스타일 유지. [최종 결과](../../../output/playwright/approval10-zip-20260911/results.md) |
| DMS-DOC-INT-01 | `docs/dms` 단일 정본 전환 + 경로 정합성 정리 | P1 | - | ✅ 완료 |
| DMS-INT-01 | 모노레포 통합 | P1 | - | ✅ 완료 |
| DMS-INT-02 | PMS 디자인 시스템 적용 | P1 | - | ✅ 완료 |
| DMS-INT-03 | Phase 3~5: PMS 패턴 동기화 | P1 | - | ✅ 완료 |
| DMS-DOC-02 | 문서별 Backlog/Changelog 섹션 도입 | P1 | - | ✅ 완료 |
| DMS-REF-01 | **루트 컴포넌트 정리** | P2 | - | ✅ 완료: 구조 정규화, golden-example/shell-body-contract 검증 통과 |
| DMS-REF-C2 | `collaboration.service.ts` util 분해 (paths/sanitizers/isolation/state-IO) | P2 | - | ✅ 완료 (2026-04-28, 4 slices) |
| DMS-REF-C3 | `git.service.ts` 분해 → util 3종 (paths/sync/inspect) | P2 | - | ✅ 완료 (2026-04-29, 4 slices, 1285 → ~1150, -20.5%) |
| DMS-REF-C4 | `access-request.service.ts` 분해 → 3 Nest services + util | P2 | - | ✅ 완료 (2026-04-30, 5 slices, 2150 → 1121, -48%) |
| DMS-TEST-D2 | collaboration unit/integration spec | P2 | - | ✅ 완료 (110 tests / 6 suites) |
| DMS-AUTH-01 | `DocumentMetadata.acl` 기반 문서 object policy(server/web/search/binary) 연결 | P1 | - | ✅ 완료: file/content read-write-metadata + search/ask + template/doc-assist source hint + creator owner default + 기본 UI affordance + upload inheritance + local storage/open + validation matrix 적용 |
| DMS-AUTH-02 | shared session/auth/access/raw/attachment/upload 검증 시나리오 정리 | P1 | - | ✅ 완료: DMS 접근 검증 통과, 저장/원본 이미지/첨부/검색/권한 경계/설정 계약 포함 |
| DMS-HOME-HUB-01 | 실제 데이터 기반 홈 워크 허브 | P0 | - | ✅ 완료: 사용자별 영속 최근 문서, `lastSyncedAt` 기반 방문 후 변경, read-only 처리함, 관리자 운영 예외, section 장애 격리/복구, 모바일 390px·일반 사용자 권한·실제 dev Docker Ralph 및 필수 gate 통과 |
| DMS-NOTIF-01 | 공통 알림 모듈 + DMS 헤더 알림/SSE 연결 | P1 | - | ✅ 완료: common notification DB/API/types/SSE, DMS same-origin proxy, 헤더 알림 패널/토스트, SNS bridge 적용 |
| DMS-SESSION-01 | 로그인 사용자별 DMS client state isolation | P1 | - | ✅ 완료: tab/file tree/sidebar/editor/settings/query cache 사용자 스코프 분리, user-scope contract 검증 추가 |
| DMS-PERM-UX-05 | 권한 요청 취소 + 수신자 알림 정리 | P1 | - | ✅ 완료: pending 요청 취소, owner 알림 archive/read 처리, SSE 기반 알림 패널 갱신 |
| DMS-AI-SEARCH-01 | DB 기반 AI 검색 기록/내 자주 검색/인기 검색어 | P1 | - | ✅ 완료: 로그인 사용자 기준 history/frequent 저장, popular 최소 2회·2명 기준, 검증/테스트 검색어 저장 차단 |
| DMS-PERM-UX-06 | 잠긴 문서 미리보기 + 문서 화면 권한 요청 CTA | P1 | - | ✅ 완료: unreadable 검색/AI 결과 클릭 시 문서 탭 진입, 서버 preview-only 응답, 잠금 화면/CTA, Docker/browser 확인 |
| DMS-PERM-UX-01 | Search/Ask 차단 소스 수와 제외 사유 표시 UI | P1 | - | ✅ 완료: 검색 응답/Ask 응답/스트리밍 이벤트에 blocked source summary 추가, 검색 화면과 어시스턴트 대화에 요약 표시 |
| DMS-PERM-UX-07 | 권한 없는 검색 결과 카드 스니펫/키워드 노출 정책 정리 | P1 | - | ✅ 완료: unreadable 결과 excerpt 안전 문구, snippets 빈 배열, totalSnippetCount 0으로 서버 redaction 고정 |
| DMS-PERM-UX-04 | 권한 UX 회귀 검증 자동화 | P1 | - | ✅ 완료: live HTTP gate에 요청 생성, 승인/거절, grant 반영, grant 회수, 소유권 이전/복귀 검증 추가 |
| DMS-DB-MIG-01 | DB 검색 기록 정식 migration 산출물 | P1 | - | ✅ 완료: `dm_search_query_m` 배포 migration 추가 |
| DMS-DB-MIG-02 | AI 채팅 기록 정식 migration 산출물 | P1 | - | ✅ 완료: `dm_chat_session_m` 배포 migration 추가, 로그인 사용자 기준 저장 테이블을 DMS 스키마로 승격 |
| DMS-SIDECAR-02 | 문서 사이드카 상태/권한/댓글 런칭 UX 정리 | P1 | - | ✅ 완료: 상태/정보/권한/댓글 섹션 정렬, 공개 범위 정보 하위 통합, 권한자/요청 카운트 분리, 읽기/편집 모드의 문서 권한 안내 위치 통일, 권한명 중복 문구 제거, 본문과 구분되는 낮은 대비 메타 안내 바 시각 처리 |
| DMS-NOTIF-02 | 알림 패널 읽음 상태 제어와 대상 문서 자동 읽음 처리 | P1 | - | ✅ 완료: 개별 읽음/안읽음, 모두 읽음, 대상 문서 접근 시 자동 읽음, 패널 dim 처리 |
| DMS-COMMENT-01 | 댓글 DB relation 분리와 실시간 알림/삭제 이력 | P1 | - | ✅ 완료: 댓글 API 분리, 작성/삭제/복원 권한, 알림 SSE, tombstone/감사 정보 표시 |
| DMS-COLLAB-01 | WebSocket soft lock 과 잠금 해제 요청 승인 lifecycle | P1 | - | ✅ 완료: 편집 중 전용 lock renew, 사용자+세션 기준 lock 소유 판정, 비소유 편집자의 본문 저장/메타데이터 플러시 분리, 저장/메타데이터 변경 lock 세션 fencing, 접속 중 사용자 기준 유령 잠금 제거, stale 편집 presence 만료, 편집 진입 lock 검증, 소유자/편집자 양방향 lock 전파, 열린 탭 복원 기반 첫 로드 문서 구독, 문서 화면 직접 WebSocket 구독 요청, 구독 확인 후 현재 스냅샷 재조회, 문서 방 구독 시 서버 읽기 권한 재검사, 인증/권한 부트스트랩 이후 WebSocket 연결, 토큰 교체 시 재연결/재구독, lock 획득 후 편집 상태 전환 순서 고정, 해제 요청/승인/거절, pending 복원과 중복 요청 방지, 요청 수신 화면 안정화, 거절 중복 다이얼로그 방지, 승인 전 미저장 초안 저장, 요청자 최신 본문 재로드, 만료된 해제 요청에서도 보유자 lock 유지, 미저장 승인창 단일화, 다른 사용자 저장 시 활성 문서만 알림 표시 및 안전한 최신 본문 자동 반영 |
| DMS-AI-SUMMARY-02 | AI 요약 새 문서 첨부 유지와 링크 라우팅 복구 | P1 | - | ✅ 완료: 요약 원본 파일 첨부 보존, 내부 문서/외부 URL 라우팅 판별 보정 |
| DMS-LAUNCH-SMOKE-01 | 최종 브라우저 연속 스모크 | P1 | - | 🔄 핵심 회귀 확대 완료. 기존 협업/권한/댓글/링크/세션/파일 트리 흐름은 통과했고, 공개 배포 최종 readiness/ingest/Admin AI disposition은 `DMS-LAUNCH-RALPH-01`로 분리. AI 요약 첨부는 `exempted_external_provider` post-launch acceptance로 유지 |
| DMS-STO-01 | 저장소 어댑터 2종(Local/NAS) 구현 | P1 | - | ✅ 완료: Local 기본, NAS 선택형 비활성, 레거시 설정 정규화, startup root 검증 적용 |
| DMS-ING-01 | 자동 수집 큐 + 컨펌 후 게시 플로우 | P1 | - | ✅ 운영 큐 완료: atomic JSON queue, confirm/retry/cancel/retention cleanup, metrics, 동시 처리 한도, commit→publish→path parity 이후에만 완료하는 Git 원자 게시, binary-safe discard, DMS 운영 UI와 회귀/격리 브라우저 테스트. Teams/네트워크 드라이브 adapter는 `DMS-ING-01-A`로 분리 |
| DMS-LAUNCH-OPS-01 | settings/Git/control-plane/runtime readiness fail-closed | P0 | - | ✅ 완료: DB persistence fail-closed, suspicious bulk deactivation guard, inactive document reactivation, DB readiness, path R/W probe, DMS aggregate readiness를 구현하고 격리 PostgreSQL/Git/runtime path의 실제 Firefox에서 설정 영속성, 9개 probe Ready, Git 정상 게시·장애 재시도·취소, console error/warning 0건을 확인 |
| DMS-ADMIN-OPS-01 | 런칭용 공통 Admin 운영 제어 | P0 | - | ✅ 완료: account/session recovery, real organization hierarchy, role permission grants, audit feed, AI readiness/queue/scheduler bridge를 구현하고 실제 Firefox에서 세션 회수·계정 비활성/복구·마지막 admin 보호·조직 계층 보존·grant 변경/복원·감사 기록·AI 차단 사유와 source/queue 상태를 확인. MFA/SSO unlink와 AI provider 정책 편집은 런칭 구현으로 주장하지 않음 |
| DMS-LAUNCH-INFRA-01 | 프로덕션 env·공개 endpoint·release SHA fail-closed gate | P0 | - | ✅ 자동화 완료: backup policy, AI disposition, production URL/secret/path, TLS/HSTS/보안 헤더/secure cookie, API·DMS readiness, server/DMS/Admin baked SHA verifier와 self-test 구현. 실제 public endpoint evidence는 최종 배포 단계에서 생성 |
| DMS-LAUNCH-RECOVERY-01 | PostgreSQL + 세 runtime root backup→isolated restore 증명 | P0 | - | ✅ 자동화/실드릴 완료: mode 0600 archive, manifest/hash, Git/ingest contract, 임시 DB restore와 canonical runtime verifier 구현. PostgreSQL 16에서 launch migration 7개, trigger 81개, schema drift 0 통과. 운영 host evidence는 최종 gate에서 재생성 |
| DMS-LAUNCH-RELEASE-01 | clean release와 GitHub/GitLab SHA 정합성 gate | P0 | - | ✅ 자동화 완료: dirty publish 차단과 local/GitHub main/GitLab development/last-published SHA 완전 일치 verifier 구현. 실제 clean commit·publish는 승인된 릴리즈 SHA 확정 후 수행 |
| DMS-LAUNCH-RALPH-01 | 공개 DMS/Admin 최종 Ralph와 통합 Go report | P0 | - | 🟡 로컬 acceptance 완료 / 공개 GO 대기: `stage2-isolated-final`에서 Admin 운영·DMS smoke/설정·desktop/mobile·WS 회귀 17/17과 별도 Playwright CLI 증거를 통과. release SHA/run ID atomic evidence를 포함하는 다섯 트랙 통합 gate 구현 완료. 사용자 수동 테스트 뒤 clean release/원격 정합성, 승인 production 입력, backup→restore와 실제 공개 URL 증거 잔여 |
| DMS-AI-01 | AI 모드 분리(wiki/deep) + 세컨드브레인 UI | P1 | - | 🔄 1차 완료: API 분기/응답 확장, 화면 표시 강화 필요 |

---

## 📋 루트 컴포넌트 정리 (DMS-REF-01)

> 16개 파일을 적절한 디렉토리로 이동 필요

| 파일 | 권장 위치 | 우선순위 |
|------|----------|----------|
| `WikiApp.tsx` | 삭제 (AppLayout 대체) | P1 |
| `WikiSidebar.tsx` | 삭제 (MainSidebar 대체) | P1 |
| `WikiEditor.tsx` | `editor/` | P2 |
| `AIChat.tsx` | `pages/ai/` | P2 |
| `GeminiChat.tsx` | `pages/ai/` | P2 |
| `SearchPanel.tsx` | `layout/sidebar/` | P2 |
| `TextSearch.tsx` | `layout/sidebar/` | P2 |
| 기타 | `common/` | P3 |

---

## 📋 대기

| ID | 항목 | 우선순위 | 비고 |
|----|------|----------|------|
| DMS-AUTH-03 | storage open 정책 + object ACL validation matrix 확장 | P1 | ✅ 완료: local storage/open linked-source 정책과 object ACL validation matrix 확정 |
| DMS-STO-02 | 정본/첨부 열기(Open)/경로복사/재동기화 UI | P1 | 🔄 1차 완료: metadata panel 액션 추가, 오류 표준화/실동기화 필요 |
| DMS-QA-01 | 저장소/수집/딥리서치/auth-access 시나리오 테스트 자동화 | P1 | 수집 큐 fail-closed/retry/cancel/cleanup/concurrency 단위 시나리오와 DMS access live gate 완료. 최종 DMS/Admin Ralph는 `DMS-LAUNCH-RALPH-01`, provider-ready AI는 명시적 post-launch acceptance로 분리 |
| DMS-TEST-D3 | controller HTTP 통합 테스트 (file/collaboration/content/access) | P1 | C-3·C-4 회귀 안전망 강화. 7 slices 후속 |
| DMS-QA-02 | hard refresh client-side error live 재현 자동화 | P1 | 현재 CLI/HTTP/build 기준 문제 없음. 브라우저에서 재현 시 console 첫 오류를 기준으로 regression case 추가 |
| DMS-AI-RAG-01 | 공용 AI/RAG runtime smoke + DMS vector/RAG capability gate | P1 | 런칭 disposition `exempted_external_provider`. provider readiness 기반 capability gate, placeholder unavailable guard, provider-unavailable smoke와 provider-ready 검증 도구는 완료. 실제 Azure embedding deployment의 green report는 post-launch provider acceptance이며 다른 네 개 Go-live 트랙을 면제하지 않음 |
| DMS-AI-RAG-02 | legacy `dms_document_embeddings` store 이관 계획 | P1 | 기준 문서화 완료. `docs/common/guides/ai-rag-runtime-runbook.md`의 `Legacy DMS Vector Store Transition`에 병행/전환/rollback/금지 기준을 고정했다. 실제 전환 실행은 provider-ready workflow green과 검증된 legacy/common retrieval artifact 이후 진행 |
| DMS-FE-versionHistory | git commit history 기반 versionHistory 자동 채움 + UI 표시 | P3 | 2026-04-30 dead code 제거 후 backlog 등재. 향후 `gitService.getFileHistory()` 기반 on-demand projection 으로 재구현 |
| DMS-REF-C5 | `DocumentPage.tsx` 1997줄 분해 | P2 | C-1 트랙 후속 (frontend god component) |
| DMS-REF-C6 | `ensureRepoControlPlaneSynced` proxy 제거 | P3 | 21 controller 가 `controlPlaneSyncService` 직접 inject. C-4 Slice 5 잔여 정리 |
| DMS-REF-C7 | `normalizeRelativePath` 통합 | P3 | access-request + control-plane-sync 양쪽 중복. util 로 단일화 |
| DMS-FE-01 | PWA 지원 | P2 | Phase 5 |
| DMS-FE-02 | 외부 스토리지 연동 | P2 | 기존 항목 유지(세부는 DMS-STO-01로 분해) |
| DMS-BE-02 | PMS 연동 | P3 | 프로젝트 산출물 |
| DMS-UI-01 | 나머지 컴포넌트 스타일 통일 | P2 | Header, TabBar 등 잔여 정리 |

---

## ✅ 완료

| ID | 항목 | 완료일 |
|----|------|--------|
| DMS-AUTH-00 | 공통 auth + DMS feature baseline gating | 2026-04-13 |
| DMS-BE-01 | 공용 백엔드 연동 (same-origin proxy + `apps/server` DMS module) | 2026-04-13 |
| DMS-PERM-UX-02 | 액세스 요청 워크플로우 UI (검색/질의 결과 → 권한 요청 → 내 요청 목록 → 승인 흐름 → grant 반영) | 2026-05-14 |
| DMS-PERM-UX-03 | Admin grant / exception 관리 UI (문서접근 surface: 승인/거절, 직접 권한 부여, 공개 범위 전환, 소유권 이전, grant 취소) | 2026-05-14 |
| DMS-NOTIF-01 | 공통 알림 모듈 + DMS 헤더 알림/SSE 연결 | 2026-05-18 |
| DMS-SESSION-01 | 로그인 사용자별 DMS client state isolation | 2026-05-18 |
| DMS-PERM-UX-05 | 권한 요청 취소 + 수신자 알림 정리 | 2026-05-18 |
| DMS-AI-SEARCH-01 | DB 기반 AI 검색 기록/내 자주 검색/인기 검색어 | 2026-05-20 |
| DMS-PERM-UX-06 | 잠긴 문서 미리보기 + 문서 화면 권한 요청 CTA | 2026-05-20 |
| DMS-SET-01 | settings 추가 슬롯 확장 (권한/관리/스케줄러/템플릿/내 활동 IA) | 2026-04-06 |
| DMS-REF-01 | 루트 컴포넌트 정리 (구조 정규화, 검증 통과) | 2026-03-16 |
| DMS-AI-02 | 인라인 AI 작성 통합 (/ai/create 제거, 근거 강제, 관련성 경고) | 2026-03-16 |
| DMS-TPL-01 | 템플릿 CRUD + 설정 UI (서비스/API/에디터 파이프라인) | 2026-03-16 |
| DMS-PATH-01 | 경로 추천 + SaveLocationDialog 연동 | 2026-03-16 |
| DMS-AI-03 | 요약 첨부 연관성 경고 튜닝 | 2026-03-16 |
| DMS-DOC-01 | 문서 구조 정리 | 2026-01-27 |
| DMS-UI-02 | Fluent UI 제거 (Radix UI 전환) | 2026-01-28 |
| DMS-UI-03 | 레이아웃 컴포넌트 생성 (PMS 구조) | 2026-01-28 |
| DMS-UI-04 | 사이드바 PMS 스타일 통합 | 2026-01-28 |
| DMS-FE-03 | 블록 에디터 (현재 CodeMirror 기반으로 대체) | 2026-01 |
| DMS-FE-04 | AI 검색 (RAG) | 2026-01 |
| DMS-FE-05 | 알림 시스템 | 2026-01 |
| DMS-FE-06 | 권한 관리 (RBAC) | 2026-01 |

---

## 🧩 잔여 구현 체크리스트 (P1 상세)

| ID | 잔여 항목 | 상태 | 비고 |
|----|-----------|------|------|
| DMS-STO-01-A | 수동 업로드/첨부 전 경로에 기본 저장소 + 문서/첨부 오버라이드 관통 적용 | ✅ 완료 | `system-default`/개인 Local·NAS 선호와 항목별 override를 attachment/reference/image upload에 연결하고, 문서 저장 시 upload 실패를 숨기지 않도록 보강. 격리 브라우저에서 NAS 기본·Local override·일반 사용자 Local 선호를 실제 파일 업로드로 검증 |
| DMS-STO-02-A | NAS Open 실패 사유 표준화(권한/경로/만료) 및 사용자 메시지 정교화 | ✅ 완료 | 비활성 provider 400, 잘못된 containment 400, missing file 404, 문서 미연결/권한 없음 403으로 구분. 외부 gateway 만료 계약은 gateway 채택 시 별도 integration 범위 |
| DMS-STO-02-B | Resync 요청 이후 DB metadata projection 실제 갱신 파이프라인 연결 | ✅ 완료 | 저장소 파일을 다시 읽어 checksum/version/etag을 갱신하고 sidecar 없는 DB document/source-file projection을 같은 요청에서 동기화 |
| DMS-ING-01-A | Teams/네트워크 드라이브/수집폴더 입력 채널 어댑터 연결 | ⏸ 외부 integration 입력 | 직접 submit/confirm/retry/cancel/cleanup/metrics와 ingest queue runtime은 런칭 범위 완료. Teams/네트워크 드라이브 adapter는 승인된 공통 integration 계약 전에는 지원으로 표시하지 않음 |
| DMS-AI-01-A | Ask/Search 화면에 citations/confidence 표시 | ⬜ 대기 | API 응답 확장 완료 |
| DMS-AI-RAG-01-A | DMS common AI index smoke | ⏸ 외부 provider 예외 | unavailable/stale/fallback은 Docker PostgreSQL에서 통과. 실제 Azure vector/RAG green report는 `exempted_external_provider` post-launch acceptance에서 수행 |
| DMS-AI-RAG-01-B | DMS adapter capability 정합화 | ✅ 완료 | `DmsAiIndexAdapter`의 `semantic`/`vector`/`ragContext` capability는 embedding provider readiness를 따른다. provider unavailable 또는 placeholder deployment는 false/stale/fallback, provider configured는 true/vector retrieval 대상으로 고정 |
| DMS-QA-01 | 저장소/수집/딥리서치 7개 시나리오 테스트 자동화 | ✅ 런칭 범위 완료 | 저장소·설정·ingest·권한·댓글·링크·soft lock·운영 readiness를 server spec과 Playwright gate에 통합. provider-backed AI/RAG만 명시적 외부 provider disposition으로 분리 |
| DMS-QA-03-A | 숨김 검증 문서와 DMS access live gate 계약 정렬 | ✅ 완료 | 사용자 표면 제외 prefix 아래 probe 문서는 파일 트리/검색 비노출을 정상으로 검증하고, 직접 파일/본문/첨부 권한 검증은 계속 수행 |
| DMS-PERM-UX-01-A | Search/Ask 전체 차단 소스 수와 제외 사유 요약 표시 | ✅ 완료 | 검색/Ask 응답과 스트리밍 이벤트, 검색 화면/어시스턴트 대화 UI에 반영 |
| DMS-PERM-UX-07-A | Unreadable 검색 결과 카드의 원문 스니펫/키워드 제거 또는 preview-only 제한 | ✅ 완료 | AI 요약은 유지하고 원문 기반 발췌/스니펫은 서버 응답에서 제거 |
| DMS-PERM-UX-04-A | 권한 요청·승인·회수·소유권 이전 회귀 검증 추가 | ✅ 완료 | `verify:access-dms:raw` live HTTP gate에 편입 |
| DMS-LAUNCH-SMOKE-01-A | 권한/댓글/링크/soft lock 브라우저 스모크 확대 | ✅ 완료 | 로그인, 잠긴 검색 결과, 권한 요청/승인, 승인 후 하드 새로고침, 댓글 작성/삭제/복원, 권한 거절/회수, 내부/외부 링크 라우팅, soft lock takeover 거절/승인 자동화 통과. 양방향 soft lock 차단, 해제 요청 수신 화면, 거절 중복 방지, 승인 전 저장, 요청자 최신 본문 재로드와 후속 저장 보존 회귀 추가 |
| DMS-COLLAB-01-A | 소유자/편집 권한자 양방향 soft lock 차단 상태 전파 | ✅ 완료 | lock 소유자 판정을 사용자 ID 기준으로 정렬하고 열린 문서 전체와 현재 문서 화면을 WebSocket 구독 대상으로 확장. 서버/브라우저 문서 경로 정규화, 구독 확인 후 현재 스냅샷 재조회, lock 획득 후 편집 상태 전환 순서 고정, 2.5초 즉시 차단 회귀 기준으로 경합 누락을 차단 |
| DMS-LAUNCH-SMOKE-01-C | 첫 접속 파일 트리 안정화 | ✅ 완료 | 서버 부팅 중 문서 control-plane 선동기화, missing/deleted 문서 목록 제외, 사용자 파일 트리 초기화 전 로딩 상태 유지 |
| DMS-LAUNCH-SMOKE-01-D | 검증 문서 publish 격리 | ✅ 완료 | local-only 검증 prefix 를 Docker 기본값으로 제외하고, 생성 직후 삭제된 미추적 markdown 경로는 Git pathspec 실패 알림 대신 no-op 처리 |
| DMS-LAUNCH-SMOKE-01-B | AI 요약 첨부 freeze 확인 | ⏸ 외부 provider 예외 | 외부 모델/API 준비 후 post-launch provider acceptance에서 새 문서 저장과 첨부 유지를 확인. 현재 런칭 disposition은 `exempted_external_provider` |
| DMS-QA-02-A | hard refresh Application error 브라우저 재현 케이스 확보 | ✅ 완료 | production build에서 문서 hard refresh와 settings deep-link reload를 자동화하고, page lifecycle에 취소된 file-tree 요청을 운영 오류로 오기록하지 않도록 회귀 고정 |

---

## Changelog

2026-09-18: 승인-15 구현·검증 완료. 전 서비스 21/22 완료·1잔여, 운영 증거 0/5. 아래는 준비 당시 기록이다.

2026-09-17: 승인-15 [다이어그램 적용안](2026-09-17-diagram-approval-proposal.md) 준비. 현행 재현과 원문·실패 복구·휴대폰 배치 범위를 구체화했으며 제품 변경·완료 증감은 없다.

2026-09-17: 승인-01 사용자 선택 1번 완료. [계약 생성 기록 처리 결과](../../common/explanation/architecture/2026-09-17-contract-records-handoff.md) 기준 생성 기록 의미 보정·기존 계약 보존·실제 결재 미구현 구분 및 회귀 통과.

| 날짜 | 변경 내용 |
|------|----------|
| 2026-09-11 | 승인-10 수정·최종 회귀 완료. 스타일 호환 회귀·빌드 캐시 보정 및 DMS 검수 동작 보존·잔여 압축 처리 경고·승인-15 분리 |
| 2026-08-13 | 프로덕션 env/endpoint, backup→isolated restore, Git SHA 정합성 자동화를 완료 항목으로 등록하고 실제 공개 DMS/Admin Ralph를 P0 최종 실행 항목으로 분리. AI/RAG provider-ready 증거는 명시적 외부 provider 예외와 post-launch acceptance로 재분류 |
| 2026-07-10 | DMS 설정에 `CRM 계약 산출 정책` section을 추가해 `system.crmContractExportPolicy`의 policy key/version, organization scope, markdown record root, Word/PDF storage artifact root를 편집하도록 연결. DMS CRM 계약 lifecycle은 이 정책으로 `export-policy.md`와 `dmsExecution.governance.exportPolicy`를 생성하며, markdown evidence와 DOCX/PDF artifact를 조직 scope별 경로 아래 산출 |
| 2026-07-10 | DMS 설정에 `CRM 계약 결재선` section을 추가해 `system.crmContractApprovalRoute`의 route key/name, policy version, organization scope, required roles를 편집하도록 연결. DMS CRM 계약 lifecycle은 이 정책으로 승인 route evidence와 결재선 원장 sync evidence를 생성 |
| 2026-07-10 | DMS 템플릿 metadata에 `reviewConfirmation`을 추가하고, `POST /dms/templates/:id/review-confirmation`과 DMS 설정 관리자 템플릿 목록에서 `crm-quote-v1` 검토 확정 상태/확정자/확정일을 기록하도록 연결 |
| 2026-07-10 | CRM 견적 handoff markdown 초안과 DMS `crm-quote-v1` 템플릿을 입력으로 template-version snapshot, template-review record, DOCX, PDF artifact를 생성하는 `POST /dms/crm-quote-lifecycle/executions` 1차 실행기를 추가. CRM은 생성 artifact evidence와 governance snapshot만 active quote handoff lifecycle에 수신하며, 템플릿 검토 확정 상태는 DMS 설정의 reviewConfirmation metadata로 관리 |
| 2026-07-10 | DMS 기본 시스템 템플릿 registry에 `crm-quote-v1` 견적서 markdown 템플릿을 추가. CRM 견적 preview는 active template 이름/상태/source path를 evidence로 표시하며, 이 템플릿은 DMS quote lifecycle artifact 실행 입력과 DMS 설정 검토 확정 대상으로 재사용한다 |
| 2026-07-10 | CRM 견적 DMS lifecycle evidence 수신 계약을 추가. CRM은 `POST /crm/opportunities/:id/quote-dms-document-execution-evidence`로 외부 DMS 실행 결과가 만든 template-review, DOCX, PDF evidence path도 active quote handoff lifecycle에 기록하며, 템플릿 검토 확정 자체는 DMS 설정 metadata로 보존한다 |
| 2026-07-10 | CRM 견적 DMS markdown 초안 handoff를 추가. CRM은 `crm.crm_quote_dms_handoff_m` snapshot과 saved path/lifecycle을 남기고 DMS 파일 서비스에 quote markdown draft를 저장하며, Word/PDF artifact는 DMS quote lifecycle 실행 경계에서 생성한다 |
| 2026-07-10 | CRM `/contracts` DMS 문서 패킷 패널이 DMS lifecycle 실행 결과의 `dmsExecution.governance`를 읽어 템플릿 버전, 템플릿 변경 원장, 첨부 확정 원장, 결재선 원장, 승인자 matrix를 표시하도록 보강. CRM은 governance evidence를 소비만 하며 결재선 정책과 산출 정책 편집은 DMS 설정이 소유 |
| 2026-07-09 | CRM 계약 handoff markdown 초안과 DMS `crm-contract-v1` 템플릿을 입력으로 export policy record, 템플릿 버전 snapshot, 템플릿 변경 검토 기록, 템플릿 변경 요청 원장, 템플릿 검토 기록, 첨부 확인 기록, 첨부 확정 원장, DOCX, PDF, 단일 승인 기록, 승인 route policy 기록, 공용 사용자/조직 directory snapshot, 결재선 원장 동기화 기록, 다자 승인 workflow record artifact를 생성하는 `POST /dms/crm-contract-lifecycle/executions` 1차 실행기를 추가. CRM은 생성 artifact evidence와 `dmsExecution.governance`만 handoff snapshot에 수신 |
| 2026-07-09 | CRM 계약 handoff가 DMS lifecycle 실행 evidence를 수신할 수 있도록 `dms-document-execution-evidence` 계약을 추가. DMS가 만든 Word/PDF/승인 artifact reference를 CRM snapshot에 반영하는 수신 경계이며, DMS export/approval runtime 자체는 후속 실행 범위로 유지 |
| 2026-07-09 | CRM 계약 문서 handoff가 공급자 CI `ciStorageRef`와 청구계획 별첨 후보를 첨부 evidence path로 넘기고, DMS lifecycle 실행이 이를 `attachment-finalization-ledger.md`와 `dmsExecution.governance.attachmentFinalizationLedger`에 확정 원장으로 보존하도록 보강 |
| 2026-07-09 | CRM 계약 문서 handoff가 참조할 수 있도록 DMS 기본 시스템 템플릿 registry에 `crm-contract-v1` 계약서 markdown 템플릿을 추가. 실제 검토 승인, Word/PDF export 운영 정책은 DMS 후속 실행 범위로 유지 |
| 2026-07-02 | runtime smoke Markdown evidence summary artifact 기준을 DMS AI/RAG backlog에 반영 |
| 2026-07-02 | runtime smoke report verifier 기준을 DMS AI/RAG backlog에 반영 |
| 2026-07-02 | runtime smoke JSON report와 GitHub Actions artifact upload 기준을 DMS AI/RAG backlog에 반영 |
| 2026-07-02 | provider-ready runtime smoke에 legacy `dms_document_embeddings` chunk와 common retrieval result/context 비교 검증을 추가 |
| 2026-07-02 | legacy `dms_document_embeddings` 전환 기준과 provider mode별 runtime workflow env 분리 기준을 DMS AI/RAG backlog에 반영 |
| 2026-07-02 | provider-ready AI/RAG runtime smoke를 위한 `.github/workflows/ai-rag-runtime.yml` 수동 CI/운영 gate를 DMS backlog에 반영 |
| 2026-07-02 | 강화된 retrieval log item audit 기준으로 provider-unavailable runtime smoke가 재통과한 상태를 반영 |
| 2026-07-02 | 공용 AI/RAG provider-unavailable runtime smoke 통과를 반영. placeholder embedding deployment 환경에서 DMS 저장 지점이 common object/chunk/state stale projection과 retrieval/Ask audit를 남기며, ready-mode vector/RAG 검증은 잔여로 유지 |
| 2026-07-02 | Azure embedding deployment placeholder 값을 provider ready로 보지 않는 guard를 DMS AI/RAG 잔여 기준에 반영 |
| 2026-07-02 | DMS AI/RAG adapter capability gate를 provider readiness 기반으로 구현 완료 처리하고, 실제 Docker runtime smoke는 `DMS-AI-RAG-01-A` 잔여로 유지 |
| 2026-07-02 | 공용 AI/RAG 설계 점검 결과를 DMS 백로그에 반영. DMS는 common AI index reference adapter지만 vector/RAG capability gate와 Docker runtime smoke가 남아 있으며, legacy `dms_document_embeddings`는 공용 path 검증 전까지 유지한다. |
| 2026-06-05 | 문서 권한 안내 바 시각 분리. 읽기/편집 모드 모두 문서 본문 상단 슬롯 안에 같은 방식으로 표시하고, 사이드카 권한 칩과 중복되는 권한명 설명 대신 현재 가능한 본문 작업과 제한 작업만 안내하며, 작은 아이콘/점선 경계/낮은 대비 배경/caption 텍스트로 본문과 구분 |
| 2026-06-05 | 협업 WebSocket 인증 재연결 보강. 새로고침 직후 HTTP 세션은 복구됐지만 WebSocket 이 만료 토큰으로 거부되어 문서 구독이 빠질 수 있던 경로를 막고, 인증/권한 부트스트랩 이후 소켓 연결과 토큰 교체 시 재연결/재구독을 적용 |
| 2026-06-05 | 패널 스크롤 동작 보정. 댓글 최초 로드/실시간 갱신은 자동 하단 이동하지 않고 사용자가 댓글/답글을 작성한 직후에만 최신 댓글로 이동하며, 접힌 섹션을 펼칠 때 긴 내용은 섹션 제목이 패널 상단 기준점에 오도록 정렬 |
| 2026-06-04 | 문서 상태 표시 단순화. `정상`/`주의`/`조치 필요` 요약 칩을 제거하고, 실제 조치가 필요한 원격 반영 실패·동기화 충돌·경로 격리는 원격 반영 아이콘의 danger 톤으로 표시하도록 정리 |
| 2026-06-04 | 협업 잠금 첫 로드 구독 보강. 새로고침 직후 에디터 경로가 늦게 채워져도 복원된 열린 탭의 문서 경로를 WebSocket 구독 대상으로 포함하고, 문서 화면 직접 구독 one-shot 재전송과 직접 구독 diff 정렬로 편집 진입/종료 이벤트 유실 가능성을 줄임 |
| 2026-06-04 | 편집 복구 one-shot 보정 및 협업 구독 경합 보강. 새로고침 복구 플래그가 편집종료 이후 다시 편집 상태로 되돌리는 경로를 차단하고, 문서 협업 구독 이벤트에 중복 방지 ID와 다음 tick 재시도를 추가해 편집 진입 상태 전파 누락 가능성을 줄임 |
| 2026-06-04 | 편집 중 새로고침 복구 정책 적용. 편집 중이던 문서 탭은 새로고침 후에도 편집 모드와 soft lock 세션을 유지하고, 미저장 본문 초안을 사용자/탭/문서 기준 세션 저장소에서 복구하도록 보강 |
| 2026-06-04 | soft lock 새로고침 소유권 안정화. 문서별 협업 세션을 로그인 사용자와 탭 기준으로 브라우저 세션 저장소에 고정해, 새로고침 후 자기 편집 잠금을 타인 잠금으로 오인해 양쪽 모두 해제 요청 상태가 되는 경로를 차단 |
| 2026-06-04 | AI 대화 메시지 액션 정렬과 응답 복사 보강. 채팅 기록은 로그인 사용자 기준 `dms_chat_sessions` 자동 저장/조회 구조로 전환하고 수동 DB 저장/해제 아이콘 제거 |
| 2026-06-04 | 댓글/AI 대화 최신 위치 스크롤 보강. 댓글 작성 후 최신 댓글로 이동하고, 댓글 실시간 갱신과 AI 응답 스트리밍은 하단 근처에서만 자동 추적하며 사용자가 위쪽을 보고 있을 때는 최신 위치 이동 버튼을 표시하도록 공용 UX로 정리 |
| 2026-06-02 | 잠금 세션/즉시 구독/저장 권한 안정화. 편집 모드 lock 갱신을 전용 renew API 로 분리하고, 사용자+세션 기준으로 soft lock 을 판정. 비소유 편집 권한자의 본문 저장은 허용하되 메타데이터 플러시는 건너뛰도록 분리하고, stale lock/presence 유령 잠금 경로와 구독 경합을 차단 |
| 2026-06-01 | 잠금 해제 요청 처리 안정화. 보유자 거절 후 지연 알림 focus 이벤트로 처리 다이얼로그가 다시 열리지 않도록 막고, 보유자 승인 전 미저장 초안은 편집 유지 저장 경로로 먼저 저장한 뒤 요청자가 최신 본문을 다시 읽고 편집하도록 정리. 두 브라우저 세션 회귀 케이스로 거절 중복 방지, 저장 후 승인 이전, 요청자 후속 저장 시 보유자 변경사항 보존을 확인 |
| 2026-06-01 | 잠금 해제 요청 수신 화면 안정화. 편집 잠금 보유자가 해제 요청을 받을 때 확인 다이얼로그 상태 변화가 문서 화면 effect 를 반복 실행해 client-side Application error 로 전환될 수 있던 문제를 수정하고, 두 브라우저 세션 회귀 케이스로 에러 페이지 대신 처리 다이얼로그가 표시됨을 확인 |
| 2026-06-01 | 검증 문서 publish 격리. Docker 기본값에서 `launch-smoke/`, `codex-lock-ui/`, `codex-lock-probe/`, `verify-access/` prefix 를 DMS Git publish 대상에서 제외하고, 생성 직후 삭제된 미추적 markdown 경로는 Git pathspec 실패 알림이 아니라 커밋할 변경 없음으로 처리 |
| 2026-06-01 | soft lock 실시간 반영 안정화. 서버와 브라우저의 문서 경로 정규화 기준을 맞추고 WebSocket 문서 방 구독 확인 직후 현재 협업 스냅샷을 재조회해, 편집 진입 이벤트가 구독 직전에 발생해도 화면의 편집 차단 상태가 따라오도록 보강. 편집 lock 획득 뒤 탭 편집 상태와 화면 모드 전환 순서도 고정해 viewer 로 되돌아가는 경합 가능성을 제거. 소유자 선편집과 편집 권한자 선편집 양쪽 브라우저 회귀 케이스 추가 |
| 2026-06-01 | soft lock 차단 상태 전파 보강. 소유자/편집 권한자 어느 쪽이 먼저 편집해도 나머지 편집 가능 사용자에게 즉시 차단 상태가 반영되도록 사용자 ID 기준 lock 판정과 열린 문서 전체 WebSocket 구독을 적용 |
| 2026-06-01 | 첫 접속 파일 트리 안정화 반영. 서버 부팅 중 문서 control-plane 을 선동기화하고, missing/deleted 문서를 목록에서 제외하며, 사용자 파일 트리 초기화 전에는 빈 목록 대신 로딩 상태를 보여주도록 정리 |
| 2026-06-01 | 런칭 브라우저 스모크를 확대 자동화 범위로 갱신. 로그인, 잠긴 검색 결과, 권한 요청/승인, 승인 후 하드 새로고침, 댓글 작성/삭제/복원, 권한 거절/회수 후 redaction, 내부/외부 링크 라우팅, soft lock takeover 거절/승인 흐름을 통과했고, locked preview 원문 노출 차단을 서버 테스트와 함께 고정. 잔여는 외부 모델/API 의존 AI 요약 첨부 freeze 확인으로 축소 |
| 2026-05-29 | 협업/권한/알림/댓글 closeout: 사이드카 권한/상태 정리, 알림 읽음 상태 제어, DB 댓글, AI 요약 첨부/링크 복구, WebSocket soft lock 과 잠금 해제 요청 lifecycle을 완료로 반영하고 최종 브라우저 연속 스모크를 남은 P1로 등록 |
| 2026-05-27 | 검색/권한 런칭 게이트 closeout: unreadable 검색 결과 redaction, Search/Ask 차단 소스 수/사유 요약, 권한 요청 승인/거절/grant 회수/소유권 이전 회귀 검증, 검색 기록 DB migration 산출물을 완료로 반영 |
| 2026-05-20 | AI 검색 기록/인기검색어를 DB 기준으로 정리하고, 검증/테스트 검색어 저장 차단 및 popular 최소 노출 조건을 적용. 권한 없는 문서 클릭은 즉시 팝업이 아니라 잠긴 문서 preview-only 화면 + 권한 요청 CTA로 전환했으며, Docker/browser 확인까지 완료. 다음 런칭 P1은 unreadable 검색 결과 카드의 스니펫/키워드 노출 정책 정리 |
| 2026-05-18 | 공통 알림 모듈, DMS 헤더 알림/SSE, 사용자별 client state isolation, 권한 요청 취소/owner 알림 archive 정리를 완료 상태로 반영. 현재 검증 기준선(`types/database build`, server/web-dms type check, server test 110개, DMS guard, DMS access verification, DMS build)을 통과했으며, hard refresh client-side error는 브라우저 재현 시 추가 추적 대상으로 분리 |
| 2026-05-14 | DMS 접근 검증 복구와 권한 UX 실제 구현 상태 재분류. `DMS-PERM-UX-02/03`을 완료로 이동하고, 잔여는 차단 소스 수 표시(`DMS-PERM-UX-01`)와 회귀 자동화(`DMS-PERM-UX-04`)로 재정의 |
| 2026-04-30 | Phase A 종결 — A-1 GitLab `LSWIKI_DOC.git` push 정책 (master 직접 push 검증 완료), A-2 versionHistory dead code 제거 + `DMS-FE-versionHistory` backlog 등재. Phase B 권한 UX 트랙 (`DMS-PERM-UX-01/02/03`) 신규 등록 |
| 2026-04-30 | DMS 핵심 서비스 분해 트랙 등재 — `DMS-REF-C2/C3/C4` + `DMS-TEST-D2` 완료 (13 slices, 7 commits). 후속 `DMS-TEST-D3`, `DMS-REF-C5/C6/C7` 대기 등록 |
| 2026-04-14 | DMS-AUTH-01/DMS-AUTH-03 를 local storage/open linked-source 정책 + validation matrix까지 반영한 완료 상태로 갱신 |
| 2026-04-14 | DMS-AUTH-02 를 진행중으로 상향하고 공통 auth/access validation baseline 문서화 상태를 backlog에 반영 |
| 2026-04-13 | auth/access readiness 항목을 추가하되 기존 backlog 이력과 잔여 체크리스트를 복원해 보존 |
| 2026-04-06 | settings 추가 슬롯 생성: 시스템에 문서 권한, 전체 문서 관리, 문서 품질/전역 스케줄러, 템플릿 마켓, 관리자 템플릿을 추가하고 개인에 공개/내 템플릿, 내 문서/내 활동 placeholder surface를 분리 |
| 2026-03-16 | 에디터 UX 개선: dirty 보더(SectionedShell), 탭 dirty 표시(색상+이탤릭+dot), 탭 문서명 우선 표시, 탭 닫기 confirm, 미리보기 원본보기 색상, confirm 메시지 통일 |
| 2026-03-16 | Header 에디터 모드 슬롯 구조 개선: editorInlineSlot→editorRightSlot 이름변경, 저장/삭제 우측 재배치, 미리보기 시 우측 버튼 숨김 |
| 2026-03-16 | DMS-REF-01 완료(검증 스크립트 경로 수정), DMS-AI-02 완료(관련성 경고 튜닝), DMS-TPL-01 완료, DMS-PATH-01 완료, DMS-AI-03 완료 |
| 2026-03-10 | 홈 중복 제거, settings 페이지 구조 정리, lib/api 분리, ai handler facade화 반영 |
| 2026-03-10 | 인라인 AI 작성의 요약 첨부 근거 강제/문서 템플릿 단일 선택 진행 상태 반영 |
| 2026-03-10 | 템플릿 전용 저장 토글 및 템플릿 `markdown + DB metadata` 정본 구조 반영 |
| 2026-02-24 | 저장소/수집/딥리서치 1차 구현 완료 기준으로 잔여 구현 체크리스트 추가 |
| 2026-02-24 | 인라인 AI 작성 통합(`/ai/create` 제거), 템플릿/경로추천/첨부 연관성 항목 추가 |
| 2026-02-24 | 저장소/수집/딥리서치 실행 항목(DMS-STO/ING/AI) 추가 |
| 2026-02-23 | `docs/dms` 단일 정본 전환 완료, 런타임 위키 경로(`apps/web/dms/data/wiki`) 분리 |
| 2026-01-28 | DMS-UI-02~04 완료, DMS-UI-01 추가, DMS-DOC-02 진행 등록 |
| 2026-01-27 | 백로그 문서 생성 |

| 2026-09-11 | 승인-10 완료 판정을 정정하고 잔여 압축 처리 경고 해결을 우선. 기존 검증 증거와 화면·사용법·연동 계약은 유지하며 교체 결과는 아직 미검증 |

| 2026-09-11 | 사용자 승인 잔여 보완 완료: 취약 압축 부품 제거·감사 0건, 실제 문서 업로드·생성·다운로드·첨부 및 문서관리 회귀 12건 통과. 화면·외부 연동 규칙 유지 |

| 2026-09-14 | 승인-17 검색 가림 개선·문서 권한/열기/편집 저장 회귀 완료. 승인-18 검색 직접 접속 미해결 분리 |

| 2026-09-15 | 승인-18 검색 진입·복원 완료. DMS 기존 루트의 빈 입력과 문서 권한/열기/저장 보존 검증 |
