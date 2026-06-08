# DMS 백로그

> 최종 업데이트: 2026-06-05 (런칭 검증/DB/소켓 권한 경계 보강)

---

## 🎯 진행 중

| ID | 항목 | 우선순위 | 담당 | 상태 |
|----|------|----------|------|------|
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
| DMS-LAUNCH-SMOKE-01 | 최종 브라우저 연속 스모크 | P1 | - | 🔄 확대 완료: 로그인, 잠긴 검색 결과, 권한 요청/승인, 승인 후 하드 새로고침, 댓글 작성/삭제/복원, 댓글 작성 시 기존 댓글 보존, 답글 작성자 알림, 답글 대상 멘션 표시, 댓글 실시간 갱신 fallback, 댓글/AI 대화 최신 위치 자동 추적, AI 대화 메시지 복사/재전송 액션 정렬과 응답 복사, 계정 기준 AI 채팅 기록 DB 자동 저장/조회, 권한 거절/회수, 내부/외부 링크 라우팅, soft lock takeover 거절/승인, 해제 요청 수신/거절 중복/승인 전 저장/요청자 최신 본문 보존, 비소유 편집 권한자 본문 저장 흐름, 활성 문서 저장 자동 반영/비활성 열린 문서 토스트 억제, 새로고침 직후 열린 탭 문서의 협업 구독 보강, 만료 토큰/세션 복구 뒤 WebSocket 재연결, 첫 접속 파일 트리 안정화, 검증 문서 publish 격리와 일반 런타임 사용자 표면 격리, 책갈피 문서 중복 탭 차단 통과. 만료 시 보유자 lock 유지는 서버 회귀로 고정. AI 요약 첨부 확인은 외부 모델 의존 잔여 |
| DMS-STO-01 | 저장소 어댑터 3종(Local/SharePoint/NAS) 구현 | P1 | - | 🔄 1차 완료: 어댑터+API 도입, 라우팅 고도화 필요 |
| DMS-ING-01 | 자동 수집 큐 + 컨펌 후 게시 플로우 | P1 | - | 🔄 1차 완료: 큐+confirm API 구현, 채널 어댑터 연동 필요 |
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
| DMS-QA-01 | 저장소/수집/딥리서치/auth-access 시나리오 테스트 자동화 | P1 | 통합/e2e 스크립트 추가 필요. DMS access live gate는 복구 완료 |
| DMS-TEST-D3 | controller HTTP 통합 테스트 (file/collaboration/content/access) | P1 | C-3·C-4 회귀 안전망 강화. 7 slices 후속 |
| DMS-QA-02 | hard refresh client-side error live 재현 자동화 | P1 | 현재 CLI/HTTP/build 기준 문제 없음. 브라우저에서 재현 시 console 첫 오류를 기준으로 regression case 추가 |
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
| DMS-STO-01-A | 수동 업로드/첨부 전 경로에 기본 저장소 + 문서/첨부 오버라이드 관통 적용 | ⬜ 대기 | 기존 파일 생성/첨부 플로우와 완전 통합 필요 |
| DMS-STO-02-A | SharePoint/NAS Open 실패 사유 표준화(권한/경로/만료) 및 사용자 메시지 정교화 | ⬜ 대기 | 현재는 URL 위임 중심 |
| DMS-STO-02-B | Resync 요청 이후 DB metadata projection 실제 갱신 파이프라인 연결 | ⬜ 대기 | 현재는 작업 등록 중심 |
| DMS-ING-01-A | Teams/네트워크 드라이브/수집폴더 입력 채널 어댑터 연결 | ⬜ 대기 | ingest API는 구현 완료 |
| DMS-AI-01-A | Ask/Search 화면에 citations/confidence 표시 | ⬜ 대기 | API 응답 확장 완료 |
| DMS-QA-01 | 저장소/수집/딥리서치 7개 시나리오 테스트 자동화 | ⬜ 대기 | 통합/e2e 스크립트 추가 필요. 런칭 권한/댓글/링크/soft lock 브라우저 스모크 5건은 별도 추가 완료 |
| DMS-QA-03-A | 숨김 검증 문서와 DMS access live gate 계약 정렬 | ✅ 완료 | 사용자 표면 제외 prefix 아래 probe 문서는 파일 트리/검색 비노출을 정상으로 검증하고, 직접 파일/본문/첨부 권한 검증은 계속 수행 |
| DMS-PERM-UX-01-A | Search/Ask 전체 차단 소스 수와 제외 사유 요약 표시 | ✅ 완료 | 검색/Ask 응답과 스트리밍 이벤트, 검색 화면/어시스턴트 대화 UI에 반영 |
| DMS-PERM-UX-07-A | Unreadable 검색 결과 카드의 원문 스니펫/키워드 제거 또는 preview-only 제한 | ✅ 완료 | AI 요약은 유지하고 원문 기반 발췌/스니펫은 서버 응답에서 제거 |
| DMS-PERM-UX-04-A | 권한 요청·승인·회수·소유권 이전 회귀 검증 추가 | ✅ 완료 | `verify:access-dms:raw` live HTTP gate에 편입 |
| DMS-LAUNCH-SMOKE-01-A | 권한/댓글/링크/soft lock 브라우저 스모크 확대 | ✅ 완료 | 로그인, 잠긴 검색 결과, 권한 요청/승인, 승인 후 하드 새로고침, 댓글 작성/삭제/복원, 권한 거절/회수, 내부/외부 링크 라우팅, soft lock takeover 거절/승인 자동화 통과. 양방향 soft lock 차단, 해제 요청 수신 화면, 거절 중복 방지, 승인 전 저장, 요청자 최신 본문 재로드와 후속 저장 보존 회귀 추가 |
| DMS-COLLAB-01-A | 소유자/편집 권한자 양방향 soft lock 차단 상태 전파 | ✅ 완료 | lock 소유자 판정을 사용자 ID 기준으로 정렬하고 열린 문서 전체와 현재 문서 화면을 WebSocket 구독 대상으로 확장. 서버/브라우저 문서 경로 정규화, 구독 확인 후 현재 스냅샷 재조회, lock 획득 후 편집 상태 전환 순서 고정, 2.5초 즉시 차단 회귀 기준으로 경합 누락을 차단 |
| DMS-LAUNCH-SMOKE-01-C | 첫 접속 파일 트리 안정화 | ✅ 완료 | 서버 부팅 중 문서 control-plane 선동기화, missing/deleted 문서 목록 제외, 사용자 파일 트리 초기화 전 로딩 상태 유지 |
| DMS-LAUNCH-SMOKE-01-D | 검증 문서 publish 격리 | ✅ 완료 | local-only 검증 prefix 를 Docker 기본값으로 제외하고, 생성 직후 삭제된 미추적 markdown 경로는 Git pathspec 실패 알림 대신 no-op 처리 |
| DMS-LAUNCH-SMOKE-01-B | AI 요약 첨부 freeze 확인 | ⬜ 대기 | 외부 모델/API 설정이 준비된 런칭 환경에서 새 문서 저장과 첨부 유지 확인 필요 |
| DMS-QA-02-A | hard refresh Application error 브라우저 재현 케이스 확보 | ⬜ 대기 | 현재 `build:web-dms`, DMS root HTTP 200, server/DMS logs 기준 재현 없음 |

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
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
