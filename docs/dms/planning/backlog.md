# DMS 백로그

> 최종 업데이트: 2026-05-27 (검색/권한 런칭 게이트 closeout)

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
| DMS-NOTIF-01 | 공통 알림 모듈 + DMS 헤더 알림/SSE 연결 | P1 | - | ✅ 완료: common notification DB/API/types/SSE, DMS same-origin proxy, 헤더 알림 패널/토스트, CMS bridge 적용 |
| DMS-SESSION-01 | 로그인 사용자별 DMS client state isolation | P1 | - | ✅ 완료: tab/file tree/sidebar/editor/settings/query cache 사용자 스코프 분리, user-scope contract 검증 추가 |
| DMS-PERM-UX-05 | 권한 요청 취소 + 수신자 알림 정리 | P1 | - | ✅ 완료: pending 요청 취소, owner 알림 archive/read 처리, SSE 기반 알림 패널 갱신 |
| DMS-AI-SEARCH-01 | DB 기반 AI 검색 기록/내 자주 검색/인기 검색어 | P1 | - | ✅ 완료: 로그인 사용자 기준 history/frequent 저장, popular 최소 2회·2명 기준, 검증/테스트 검색어 저장 차단 |
| DMS-PERM-UX-06 | 잠긴 문서 미리보기 + 문서 화면 권한 요청 CTA | P1 | - | ✅ 완료: unreadable 검색/AI 결과 클릭 시 문서 탭 진입, 서버 preview-only 응답, 잠금 화면/CTA, Docker/browser 확인 |
| DMS-PERM-UX-01 | Search/Ask 차단 소스 수와 제외 사유 표시 UI | P1 | - | ✅ 완료: 검색 응답/Ask 응답/스트리밍 이벤트에 blocked source summary 추가, 검색 화면과 어시스턴트 대화에 요약 표시 |
| DMS-PERM-UX-07 | 권한 없는 검색 결과 카드 스니펫/키워드 노출 정책 정리 | P1 | - | ✅ 완료: unreadable 결과 excerpt 안전 문구, snippets 빈 배열, totalSnippetCount 0으로 서버 redaction 고정 |
| DMS-PERM-UX-04 | 권한 UX 회귀 검증 자동화 | P1 | - | ✅ 완료: live HTTP gate에 요청 생성, 승인/거절, grant 반영, grant 회수, 소유권 이전/복귀 검증 추가 |
| DMS-DB-MIG-01 | DB 검색 기록 정식 migration 산출물 | P1 | - | ✅ 완료: `dm_search_query_m` 배포 migration 추가 |
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
| DMS-QA-01 | 저장소/수집/딥리서치 7개 시나리오 테스트 자동화 | ⬜ 대기 | 통합/e2e 스크립트 추가 필요 |
| DMS-PERM-UX-01-A | Search/Ask 전체 차단 소스 수와 제외 사유 요약 표시 | ✅ 완료 | 검색/Ask 응답과 스트리밍 이벤트, 검색 화면/어시스턴트 대화 UI에 반영 |
| DMS-PERM-UX-07-A | Unreadable 검색 결과 카드의 원문 스니펫/키워드 제거 또는 preview-only 제한 | ✅ 완료 | AI 요약은 유지하고 원문 기반 발췌/스니펫은 서버 응답에서 제거 |
| DMS-PERM-UX-04-A | 권한 요청·승인·회수·소유권 이전 회귀 검증 추가 | ✅ 완료 | `verify:access-dms:raw` live HTTP gate에 편입 |
| DMS-QA-02-A | hard refresh Application error 브라우저 재현 케이스 확보 | ⬜ 대기 | 현재 `build:web-dms`, DMS root HTTP 200, server/DMS logs 기준 재현 없음 |

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
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
