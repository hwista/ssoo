# DMS 로드맵

> 최종 업데이트: 2026-06-02 (활성 문서 저장 반영 보강)

---

## 1. 현재 완료

- DMS를 pnpm workspace 앱으로 통합하고 `@ssoo/types`, `@ssoo/web-auth` 기반 공통 계약을 적용
- same-origin `/api/auth/[action]` proxy + shared session cookie 기반 로그인/세션 복원 도입
- `/api/access` 기반 DMS access snapshot hydrate, server/web feature baseline gating 적용
- 공통 permission resolution contract + auth/access validation baseline 고정
- `DocumentMetadata.acl` object ACL pilot 적용 (`file/content` read-write-metadata, `file/files/raw/serve-attachment/search/ask`, template reference/doc-assist tree hint, creator owner default, 기본 DocumentPage affordance, upload inheritance, local storage/open, validation matrix)
- DMS 주요 business API를 `apps/server` DMS module로 이관하고 Next route handler를 proxy boundary로 정렬
- 저장소/수집/AI 기본 기능 및 settings shell, template pipeline, file/git runtime 유지
- DMS 핵심 서비스 분해 (refactoring decomposition, 2026-04-28 ~ 04-30): `collaboration.service.ts` / `git.service.ts` / `access-request.service.ts` 3개 god service 를 cohesive Nest 서비스 + util 로 분해 (C-2 / C-3 / C-4 트랙 종료, 합 13 slices). `access-request.service.ts` 만으로 2150 → 1121 lines (-48%). 회귀 안전망: `pnpm --filter server test` 110 tests / 6 suites (D-2 트랙)
- 문서 정본 GitLab `LSWIKI_DOC.git` 원격 운영 종결 (2026-04-30, Phase A): canonical `master` 직접 push 정책 확정/검증. `document-repo-three-issue-status.md` 3개 이슈 모두 closed. versionHistory dead feature 제거 + 의도(`DMS-FE-versionHistory`) backlog 등재. Track 2 / 5 / 7 closed → 100%
- DMS 접근 검증 게이트 복구: 문서 저장/설정 저장 응답 계약, 저장소 기반 원본 이미지 제공, 기존 sidecar 기준선 검증을 정렬해 `verify:access-dms:raw` 통과
- 권한 요청 UX와 관리자 권한 운영 surface 1차 완결: 검색/질의 결과의 발견 전용 표시와 권한 요청, 내 요청 목록, 승인/거절 inbox, 직접 권한 부여, 공개 범위 전환, 소유권 이전, grant 취소가 실제 API와 연결됨
- 공통 알림 모듈 1차 완결: common notification DB/API/types/history trigger, DMS same-origin proxy, SSE stream, 헤더 알림 패널/토스트, SNS bridge 를 공통 알림 계약으로 정렬
- 사용자별 DMS client state isolation 적용: 로그인 사용자 변경 시 tab/file tree/sidebar/editor/settings/query cache 상태를 분리하고, user-scope contract 검증을 추가
- 권한 요청 취소와 수신자 알림 cleanup 적용: requester pending 취소, owner 알림 archive/read 처리, notification archived 이벤트 기반 패널 갱신 연결
- AI 검색 런칭 정리: 검색 결과 AI 요약 표시, DB 기반 내 자주 검색/인기 검색어/검색 기록, 인기 검색어 최소 노출 조건과 검증/테스트 검색어 저장 차단 적용
- 잠긴 문서 미리보기 적용: unreadable 검색/AI 결과 클릭 시 즉시 팝업 대신 문서 탭을 열고, 서버 preview-only 응답 기반 잠금 화면과 권한 요청 CTA를 표시
- 검색/권한 런칭 게이트 closeout: unreadable 검색 결과 원문 발췌 redaction, Search/Ask 차단 소스 수와 제외 사유 요약, 권한 요청 승인/거절/grant 회수/소유권 이전 live HTTP 회귀 검증, DB 검색 기록 migration 산출물 반영
- 협업/권한/알림/댓글 closeout: 문서 사이드카 상태/권한/댓글 UX, 알림 읽음 상태 제어, 대상 문서 자동 읽음, DB 기반 댓글, 댓글 실시간 갱신, AI 요약 첨부 유지, 내부/외부 링크 라우팅, WebSocket soft lock, 잠금 해제 요청 승인 lifecycle 반영
- 런칭 브라우저 스모크 확대 자동화: 로그인, 잠긴 검색 결과, 권한 요청/승인, 승인 후 하드 새로고침, 댓글 작성/삭제/복원, 권한 거절/회수 후 redaction, 내부/외부 링크 라우팅, soft lock takeover 거절/승인 흐름 통과. 잠긴 문서 preview-only 응답에서 원문 본문을 노출하지 않도록 서버 redaction 고정
- 첫 접속 파일 트리 안정화: 서버 부팅 중 문서 control-plane 선동기화, missing/deleted 문서 목록 제외, 사용자 파일 트리 초기화 전 빈 목록 오표시 방지
- 협업 soft lock 양방향 전파 보강: 소유자/편집 권한자 어느 쪽이 먼저 편집하든 나머지 편집 가능 사용자에게 즉시 편집 차단 상태가 전파되도록 사용자 ID 기준 lock 판정, 열린 문서 전체와 현재 문서 화면 직접 WebSocket 구독, 서버/브라우저 문서 경로 정규화, 구독 확인 후 현재 협업 스냅샷 재조회, lock 획득 후 편집 상태 전환 순서 고정을 적용
- 잠금 해제 요청 수신 안정화: 편집 잠금 보유자가 해제 요청을 받을 때 화면이 에러 페이지로 전환되지 않고 처리 다이얼로그를 유지하도록 보정하고, 두 브라우저 세션 회귀 케이스로 확인
- 잠금 해제 요청 처리 안정화: 보유자 거절 후 처리 다이얼로그가 다시 열리지 않도록 막고, 보유자 승인 시 미저장 초안은 먼저 저장한 뒤 요청자가 최신 본문을 다시 읽고 편집 잠금을 이전받도록 보정
- 잠금 세션 안정화: 편집 중 10초 주기 전용 lock renew, 사용자+세션 기준 soft lock 소유 판정, 비소유 편집 권한자의 본문 저장/메타데이터 플러시 분리, 저장/메타데이터 변경 시 현재 lock 세션 fencing, 접속 중 사용자 기준 유령 잠금 제거, stale 편집 presence 만료, 만료된 해제 요청 응답 시 기존 보유자 잠금 유지, 요청자 만료 처리 후 최신 협업 스냅샷 재조회, 미저장 초안 승인 확인창 단일화, 다른 사용자 저장 시 활성 문서만 토스트 표시 및 안전한 최신 본문 자동 반영을 적용
- 검증 문서 publish 격리: Docker 기본값에서 `launch-smoke/`, `codex-lock-ui/`, `codex-lock-probe/`, `verify-access/` prefix 를 DMS Git publish 대상에서 제외하고, 생성 직후 삭제된 미추적 markdown 경로는 Git pathspec 실패 알림 대신 no-op 처리
- 현재 검증 기준선 통과: locked preview 서버 테스트, collaboration soft lock 서버 테스트 29개, Git stage 경로 필터 테스트 4개, soft lock 양방향 즉시 차단 브라우저 회귀, 잠금 해제 요청 거절 중복/승인 전 저장/요청자 최신 본문 보존 브라우저 회귀, 비소유 편집 권한자 본문 저장 브라우저 회귀, 활성 문서 저장 자동 반영/비활성 열린 문서 토스트 억제 브라우저 회귀, server/web-dms build, DMS access verification, Codex preflight, Docker server/dms rebuild, health/browser 확인
- 최신 재진입 핸드오프: `2026-06-02-launch-collaboration-realtime-handoff.md` 에 런칭 직전 협업/권한/알림/저장 반영 기준선과 남은 freeze 항목을 정리

## 2. 단기 우선순위 (P1)

**런칭 스모크 / 운영 freeze**:

1. AI 요약 새 문서 저장과 첨부 확인: 외부 모델/API 설정이 준비된 런칭 환경에서 수동 또는 별도 isolated smoke 로 확인
2. 런칭 체크리스트 freeze 및 운영 데이터/계정 seed 상태 확인
3. 원격 push 상태와 배포 대상 브랜치 확인: GitHub `main`, GitLab `development`
4. **DMS-QA-02** hard refresh client-side error 브라우저 재현 케이스 확보: 현재 CLI/HTTP/build 기준 문제 없음, 재현 시 console 첫 오류 기준으로 regression 추가

**기타 P1**:

5. 저장소 어댑터 3종(Local/SharePoint/NAS) 라우팅 관통 적용
6. 정본/첨부 Open/Copy/Resync UX 고도화 (에러 표준화 — Phase C)
7. 자동 수집 채널 연동 + 컨펌 후 게시 운영화
8. Ask/Search 화면의 citations/confidence UI 완결

## 3. 중기 우선순위 (P2)

1. search / ask / doc-assist / template reference에서 발견 전용·차단 근거 지표 정교화
2. 외부 저장소 open/retry/audit 로그 운영 안정화
3. 권한 기반 admin tooling 및 예외 정책 운영 도구 정리

## 4. 장기 우선순위 (P3)

1. 조직/문서/템플릿 단위 승인 및 요청(workflow) 정책 확장
2. Teams 챗봇/외부 입력 채널 연동
3. legacy auth/org 필드 cleanup 범위 확정 및 cutover

## 5. 관련 문서

- `docs/dms/planning/auth-access-readiness.md`
- `docs/dms/planning/backlog.md`
- `docs/dms/planning/storage-and-second-brain-architecture.md`

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-06-02 | 비소유 편집 권한자 저장 권한 분리. 본문 저장은 허용하되 보류 메타데이터 플러시는 수행하지 않고 최신 메타데이터를 재조회하도록 정리. 저장 직전 metadata projection 변경은 문서 소유자/관리 가능 권한일 때만 생성 |
| 2026-06-02 | soft lock 유령 잠금 방지. lock 활성 판정에서 사용자 WebSocket 접속 여부를 제거하고 현재 편집 세션의 최근 renew 시간만 기준으로 삼도록 정리. stale 편집 presence 도 접속 중 사용자라는 이유로 유지되지 않게 해 강력 새로고침 뒤 거짓 `편집 중` 상태가 남는 경로를 차단 |
| 2026-06-02 | soft lock 즉시 구독 보강. 문서 화면이 전역 에디터 스토어 경로 갱신만 기다리지 않고 현재 문서 경로를 WebSocket 구독 대상으로 직접 요청하도록 연결하고, 양방향 lock 브라우저 회귀를 2.5초 즉시 차단 기준으로 강화 |
| 2026-06-02 | 잠금 세션 안정화. 편집 중 일반 heartbeat 재사용을 전용 lock renew 로 분리하고, soft lock 소유 판정을 사용자+세션 기준으로 조정. 저장/메타데이터 변경은 현재 lock 세션만 통과하도록 fencing 을 추가하고, 해제 요청 만료 후 보유자 응답 시 기존 보유자 lock 유지와 요청자 스냅샷 재조회를 보정 |
| 2026-06-01 | 잠금 해제 요청 처리 안정화. 보유자 거절 후 처리 다이얼로그가 다시 열리지 않도록 완료된 request ID 를 차단하고, 보유자 승인 시 미저장 초안을 먼저 저장한 뒤 요청자가 최신 본문을 다시 읽고 잠금을 이전받도록 보정. 두 브라우저 세션 회귀 케이스로 거절 중복 방지, 저장 후 승인 이전, 요청자 후속 저장 시 보유자 변경사항 보존을 확인 |
| 2026-06-01 | 잠금 해제 요청 수신 화면 안정화. 전역 확인 다이얼로그 상태 변화가 문서 화면의 잠금 요청 처리 effect 를 반복 실행하지 않도록 구독 범위를 좁히고, 실제 두 브라우저 세션에서 해제 요청 수신 시 에러 페이지 대신 처리 다이얼로그가 표시되는지 회귀 검증 |
| 2026-06-01 | 검증 문서 publish 격리. local-only 검증 prefix 를 Docker 기본값으로 제외하고, 사라진 미추적 markdown 경로를 Git pathspec 실패 알림이 아니라 커밋할 변경 없음으로 처리해 테스트 문서가 운영 publish 실패 알림으로 남지 않도록 조정 |
| 2026-06-01 | 협업 soft lock 실시간 반영 안정화. 서버와 브라우저의 문서 경로 정규화 기준을 맞추고 WebSocket 문서 방 구독 확인 직후 현재 협업 스냅샷을 재조회해, 구독 직전 lock 이벤트를 놓쳐도 화면의 편집 차단 상태가 즉시 복구되도록 조정. 편집 lock 획득 뒤 탭 편집 상태와 화면 모드 전환 순서도 고정. 소유자 선편집과 편집 권한자 선편집 브라우저 회귀 케이스 추가 |
| 2026-06-01 | 협업 soft lock 양방향 전파 보강. lock 소유자 판정을 사용자 ID 기준으로 정렬하고 열린 문서 전체를 WebSocket 구독 대상으로 확장해 소유자/편집 권한자 어느 쪽이 먼저 편집해도 나머지 편집 가능 사용자에게 편집 차단 상태가 즉시 반영되도록 조정 |
| 2026-06-01 | 첫 접속 파일 트리 안정화 반영. 부팅 직후 문서 control-plane 선동기화, missing/deleted 문서 목록 제외, 사용자별 파일 트리 초기화 전 로딩 상태 유지로 파일 목록 빈 화면/ghost 문서 열기 가능성을 낮춤 |
| 2026-06-01 | 런칭 브라우저 스모크를 확대. 댓글 삭제/복원, 권한 거절/회수 후 redaction, 내부/외부 링크 라우팅, soft lock takeover 거절을 추가했고, 기존 로그인 스모크 포함 브라우저 스모크 5건 통과. 단기 우선순위는 AI 요약 첨부 freeze 확인과 운영 freeze로 축소 |
| 2026-05-29 | 협업/권한/알림/댓글 closeout을 완료 범위에 반영. 사이드카 권한 섹션, 알림 읽음 상태, DB 댓글, AI 요약 첨부/링크 복구, WebSocket soft lock, 잠금 해제 요청 lifecycle까지 닫고 단기 우선순위를 최종 브라우저 스모크와 운영 freeze로 재정렬 |
| 2026-05-27 | 검색/권한 런칭 게이트 closeout을 현재 완료로 반영. Search/Ask 차단 소스 요약, unreadable 검색 redaction, 권한 요청 승인/거절/grant 회수/소유권 이전 회귀 검증, 검색 기록 migration 산출물까지 Phase B 핵심 잔여를 닫고 단기 우선순위를 최종 게이트/스모크로 재정렬 |
| 2026-05-20 | AI 검색 결과 요약, DB 기반 검색 기록/인기 검색어, 잠긴 문서 미리보기, 권한 요청 CTA, Docker/browser 검증 완료를 현재 완료 범위에 반영. 단기 P1에 unreadable 검색 결과 카드 스니펫/키워드 노출 정책 정리를 추가 |
| 2026-05-18 | 공통 알림/SSE, DMS 헤더 알림, 사용자별 client state isolation, 권한 요청 취소/알림 cleanup 을 현재 완료 범위에 반영. 현재 기준 검증 통과 상태를 명시하고, hard refresh client-side error는 브라우저 재현 기반 QA 항목으로 분리 |
| 2026-05-14 | DMS 접근 검증 게이트 복구(`verify:access-dms:raw` 통과)와 권한 UX 재감사 결과 반영. 액세스 요청 워크플로우와 관리자 권한 운영 surface 를 완료로 재분류하고, 잔여 P1을 차단 소스 수 표시와 권한 UX 회귀 자동화로 축소 |
| 2026-04-30 | Phase A 종결 — 문서 정본 GitLab push 정책 확정 (canonical `master`), versionHistory dead code 제거 + 의도 backlog 등재. Track 2/5/7 closed (100%). 단기 우선순위를 Phase B (권한 UX 3종, `DMS-PERM-UX-01/02/03`) 로 재정렬 |
| 2026-04-30 | DMS 핵심 서비스 분해 트랙 (C-2 / C-3 / C-4, 13 slices, 7 commits) 종료를 현재 완료에 반영. `access-request.service.ts` 2150 → 1121 (-48%) 외 collaboration / git 서비스도 cohesive 단위로 분리 |
| 2026-04-14 | DMS object ACL pilot을 file/content write-read + template/doc-assist source hint + creator owner default + 기본 UI affordance + upload inheritance + local storage/open + validation matrix까지 확장한 상태를 현재 완료에 반영하고, 단기 우선순위를 PMS/SNS alignment로 전환 |
| 2026-04-14 | 공통 permission contract / auth-access validation baseline 완료를 현재 완료 항목에 반영하고, 단기 우선순위를 object ACL 중심으로 재정렬 |
| 2026-04-13 | auth/access readiness 기준으로 로드맵을 재정렬하고, DMS의 다음 우선순위를 object ACL + 검증 시나리오 고정으로 갱신 |
| 2026-02-24 | P1 항목별 1차 구현/잔여 작업 상태표 추가 |
| 2026-02-24 | 과거 Phase 체크리스트를 현행 실행 로드맵(저장소/수집/딥리서치 중심)으로 전면 갱신 |
