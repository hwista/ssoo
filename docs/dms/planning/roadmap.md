# DMS 로드맵

> 최종 업데이트: 2026-08-18 (운영 제어를 포함한 다섯 트랙과 중단 재진입 증거 반영)

---

2026-09-18 출시 검토 후속: [문서 도식·휴대폰 도구](../../common/explanation/architecture/2026-09-18-document-diagram-handoff.md)의 승인 범위 구현·검증 완료. 전 서비스 승인 대장 21/22 완료·1잔여, 실제 운영 증거 0/5. 운영 출시 환경은 계속 미완료이며 아래 과거 완료 기록과 구분한다.

## 1. 현재 완료

- DMS를 pnpm workspace 앱으로 통합하고 `@ssoo/types`, `@ssoo/web-auth` 기반 공통 계약을 적용
- same-origin `/api/auth/[action]` proxy + shared session cookie 기반 로그인/세션 복원 도입
- `/api/access` 기반 DMS access snapshot hydrate, server/web feature baseline gating 적용
- 공통 permission resolution contract + auth/access validation baseline 고정
- `DocumentMetadata.acl` object ACL pilot 적용 (`file/content` read-write-metadata, `file/files/raw/serve-attachment/search/ask`, template reference/doc-assist tree hint, creator owner default, 기본 DocumentPage affordance, upload inheritance, local storage/open, validation matrix)
- DMS 주요 business API를 `apps/server` DMS module로 이관하고 Next route handler를 proxy boundary로 정렬
- 저장소/수집/AI 기본 기능 및 설정 탭 page, template pipeline, file/git runtime 유지
- DMS 핵심 서비스 분해 (refactoring decomposition, 2026-04-28 ~ 04-30): `collaboration.service.ts` / `git.service.ts` / `access-request.service.ts` 3개 god service 를 cohesive Nest 서비스 + util 로 분해 (C-2 / C-3 / C-4 트랙 종료, 합 13 slices). `access-request.service.ts` 만으로 2150 → 1121 lines (-48%). 회귀 안전망: `pnpm --filter server test` 110 tests / 6 suites (D-2 트랙)
- 문서 정본 GitLab `LSWIKI_DOC.git` 원격 운영 종결 (2026-04-30, Phase A): canonical `master` 직접 push 정책 확정/검증. `document-repo-three-issue-status.md` 3개 이슈 모두 closed. versionHistory dead feature 제거 + 의도(`DMS-FE-versionHistory`) backlog 등재. Track 2 / 5 / 7 closed → 100%
- DMS 접근 검증 게이트 복구: 문서 저장/설정 저장 응답 계약, 저장소 기반 원본 이미지 제공, 기존 sidecar 기준선 검증을 정렬해 `verify:access-dms:raw` 통과
- 권한 요청 UX와 관리자 권한 운영 surface 1차 완결: 검색/질의 결과의 발견 전용 표시와 권한 요청, 내 요청 목록, 승인/거절 inbox, 직접 권한 부여, 공개 범위 전환, 소유권 이전, grant 취소가 실제 API와 연결됨
- 공통 알림 모듈 1차 완결: common notification DB/API/types/history trigger, DMS same-origin proxy, SSE stream, 헤더 알림 패널/토스트, SNS bridge 를 공통 알림 계약으로 정렬
- 사용자별 DMS client state isolation 적용: 로그인 사용자 변경 시 tab/file tree/sidebar/editor/settings/query cache 상태를 분리하고, user-scope contract 검증을 추가
- 권한 요청 취소와 수신자 알림 cleanup 적용: requester pending 취소, owner 알림 archive/read 처리, notification archived 이벤트 기반 패널 갱신 연결
- AI 검색 런칭 정리: 검색 결과 AI 요약 표시, DB 기반 내 자주 검색/인기 검색어/검색 기록, 인기 검색어 최소 노출 조건과 검증/테스트 검색어 저장 차단 적용
- 공용 AI/RAG reference adapter 기준선: DMS markdown 문서를 `CommonAiIndexModule` projection으로 동기화하고 DMS Ask가 common retrieval/conversation/run audit/model gateway를 우선 호출하는 경로를 보유한다. DMS vector/RAG capability는 embedding provider readiness 기반으로 정합화됐고, placeholder embedding deployment는 unavailable로 처리한다. provider-unavailable runtime smoke는 retrieval log header/item audit까지 Docker Postgres에서 통과했다. provider-ready smoke는 legacy `dms_document_embeddings` chunk와 common retrieval result/context 비교까지 수행하고 JSON report artifact를 남기도록 보강됐으며, report JSON은 `verify:ai-rag-runtime-report`로 검증하고 Markdown evidence summary를 생성한다. 실제 Azure embedding 환경의 green 결과는 남아 있다. legacy `dms_document_embeddings` 전환 기준은 runbook에 고정됐다.
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
- 런칭 운영 readiness 완결: DB/settings persistence/Git parity/control-plane/markdown·ingest·storage·template path를 aggregate readiness로 집계하고, DMS 운영 UI에서 현재 runtime path와 각 probe 사유를 확인할 수 있도록 고정
- 수집 큐 운영 완결: atomic/corrupt-file fail-closed queue, 동시 처리, confirm/retry/cancel/retention cleanup과 Git commit→publish→path parity 이후 완료 계약을 적용하고 commit/branch를 운영 이력에 보존. document root의 DOCX/PDF는 Git discard 대상에서 제외
- 공통 Admin 운영 제어 완결: 계정 상태·세션 회수, 조직 hierarchy, role permission grant, 감사 이벤트, AI provider/source/queue/scheduler 상태를 실제 API와 연결하고 마지막 활성 admin 및 조직 관계 안전장치를 회귀 테스트로 고정
- 2026-08-12 격리 Ralph 검증: 실제 Firefox에서 DMS 설정 영속성, 9개 readiness probe, ingest 정상 게시·Git 장애 재시도·취소와 Admin 계정·세션·조직·권한·감사·AI 운영 경로를 확인하고 최종 console error/warning 0건을 기록
- 프로덕션 인프라 gate: production env의 backup policy·AI disposition·release SHA를 fail-closed 검증하고 server/DMS/Admin 이미지와 공개 endpoint의 baked SHA 일치를 확인하는 verifier를 추가
- 백업·복구 gate: PostgreSQL custom dump와 Markdown Git/ingest/storage snapshot을 mode `0600` archive로 생성하고 격리 DB·디렉터리에 복원해 manifest/hash와 canonical DB contract를 검증하는 운영 profile을 추가. 실제 PostgreSQL 16 드릴에서 launch migration 7개, application trigger 81개, schema drift 0을 확인
- Git/릴리즈 gate: clean/non-detached worktree와 local HEAD, GitHub `main`, GitLab `development`, last-published SHA의 완전 일치를 요구하고 dirty workspace publish를 차단
- 통합 Ralph gate: 릴리즈 아티팩트, 프로덕션 endpoint, 복구 증명, 격리 Admin/DMS 운영 제어, 배포 브라우저의 다섯 트랙을 `verify:dms-go-live` 하나로 묶고 AI 외부 provider 예외가 다른 실패를 가리지 못하도록 고정
- 중단 재진입과 증거 무결성: release SHA/run ID 전용 bundle, step 전후 atomic checkpoint, 동일 HEAD/worktree/plan hash만 허용하는 resume, Playwright desktop/mobile artifact와 SHA-256 manifest를 blocking 계약으로 고정
- 2026-08-18 로컬 launch acceptance: `stage2-isolated-final` 단일 격리 런에서 Admin 운영·DMS smoke/설정·모바일·WS 회귀 17/17을 통과하고, 별도 Playwright CLI에서 DMS desktop/mobile과 Admin mobile 사용자 관리·console/network를 재확인. 실제 GO는 사용자 테스트와 clean release/원격·production·복구·공개 endpoint 증거 뒤에만 판정
- 현재 검증 기준선 통과: locked preview 서버 테스트, collaboration soft lock 서버 테스트 29개, Git stage 경로 필터 테스트 4개, soft lock 양방향 즉시 차단 브라우저 회귀, 잠금 해제 요청 거절 중복/승인 전 저장/요청자 최신 본문 보존 브라우저 회귀, 비소유 편집 권한자 본문 저장 브라우저 회귀, 활성 문서 저장 자동 반영/비활성 열린 문서 토스트 억제 브라우저 회귀, server/web-dms build, DMS access verification, Codex preflight, Docker server/dms rebuild, health/browser 확인
- 최신 재진입 핸드오프: `2026-06-02-launch-collaboration-realtime-handoff.md` 에 런칭 직전 협업/권한/알림/저장 반영 기준선과 남은 freeze 항목을 정리

## 2. 단기 우선순위 (P1)

**런칭 스모크 / 운영 freeze**:

1. 릴리즈 아티팩트 freeze: 의도한 변경을 clean commit으로 확정하고 모노레포 static/security/DB/build/DMS/push gate를 모두 통과
2. Git 배포 정합성: GitLab 선행 변경을 재통합한 뒤 local HEAD = GitHub `main` = GitLab `development` = last-published SHA를 증명
3. 프로덕션 인프라·복구 증거: 실제 secret/HTTPS endpoint/runtime root/분리 backup root를 주입하고 동일 SHA 이미지를 배포한 뒤 endpoint와 backup→isolated restore gate를 통과
4. 최종 Ralph: 공개 DMS/Admin에서 readiness 9/9, ingest 운영, AI 예외 경계를 확인하고 console warning/error, page error, HTTP 5xx 0건을 증명한 뒤 `verify:dms-go-live` report를 보존
5. AI/RAG provider-ready runtime과 AI 요약 첨부 freeze는 `DMS_AI_RAG_LAUNCH_MODE=exempted_external_provider`의 명시적 post-launch acceptance로 유지. 실제 Azure provider가 준비되면 기존 runbook의 vector/RAG workflow와 첨부 smoke를 다시 blocking으로 승격
6. **DMS-QA-02** hard refresh client-side error 브라우저 재현 케이스 확보: 현재 CLI/HTTP/build 기준 문제 없음, 재현 시 console 첫 오류 기준으로 regression 추가

**기타 P1**:

7. Local 기본/NAS 선택형 저장소 라우팅 및 startup 접근성 검증 관통 적용
8. 정본/첨부 Open/Copy/Resync UX 고도화 (에러 표준화 — Phase C)
9. Teams/네트워크 드라이브 자동 수집 adapter 연동 (`DMS-ING-01-A`)
10. Ask/Search 화면의 citations/confidence UI 완결

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
- `docs/common/explanation/architecture/ai-rag-platform-roadmap.md`
- `docs/common/explanation/architecture/ai-rag-platform-handoff.md`
- `docs/dms/planning/2026-08-13-production-go-live-ralph-plan.md`

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| 2026-09-17 | 다이어그램·휴대폰 도구 승인안 준비를 출시 잔여로 명시. 구현 완료/운영 출시 집계와 구분 |
| 2026-08-18 | 격리 브라우저 17/17과 Playwright CLI desktop/mobile 증거로 로컬 launch acceptance 완료, 사용자 테스트·clean release·실제 production/복구/공개 endpoint를 최종 GO 잔여 조건으로 분리 |
| 2026-08-18 | 격리 운영 제어를 포함한 다섯 트랙과 release SHA/run ID atomic checkpoint/resume·browser evidence 계약을 현행 기준으로 반영 |
| 2026-08-13 | 프로덕션 인프라·백업/복구·Git/릴리즈 정합성·브라우저 Ralph 네 트랙과 명시적 AI/RAG 외부 provider 런칭 예외를 단기 P1 기준으로 고정 |
| 2026-08-12 | DMS 런칭 readiness, Git 원자 ingest 게시, 공통 Admin 운영 제어와 격리 Ralph 브라우저 검증 완료 상태 반영 |
| 2026-07-02 | runtime smoke Markdown evidence summary artifact 기준을 DMS P1 운영 증거에 반영 |
| 2026-07-02 | runtime smoke report verifier 기준을 DMS P1 운영 증거에 반영 |
| 2026-07-02 | runtime smoke JSON report와 workflow artifact upload 기준을 DMS P1 운영 증거에 반영 |
| 2026-07-02 | provider-ready runtime smoke에 legacy/common retrieval 비교 검증을 추가한 상태를 DMS P1 기준에 반영 |
| 2026-07-02 | legacy `dms_document_embeddings` 전환 기준과 provider mode별 workflow env 분리를 DMS 단기 P1 기준에 반영 |
| 2026-07-02 | provider-ready AI/RAG runtime smoke를 위한 `.github/workflows/ai-rag-runtime.yml` 수동 CI/운영 gate 반영. 실제 Azure embedding deployment로 green 결과를 남기는 작업은 단기 P1 잔여 |
| 2026-07-02 | 강화된 retrieval log item audit 기준으로 provider-unavailable runtime smoke가 재통과한 상태를 반영 |
| 2026-07-02 | provider-ready runtime smoke가 retrieval log item과 DMS Ask run-source audit까지 확인하도록 coverage 기준을 반영 |
| 2026-07-02 | provider-ready smoke 전 Azure OpenAI endpoint/deployment/credential precheck 기준을 반영 |
| 2026-07-02 | AI/RAG 정적 verifier가 preflight/push-guard에 연결된 상태를 반영. provider-ready green workflow 결과는 단기 P1 잔여로 유지 |
| 2026-07-02 | 공용 AI/RAG runtime runbook과 `DB_INIT_PRISMA_PUSH_MODE=auto` legacy DB init guard를 반영. provider-ready green workflow 결과는 단기 P1 잔여로 유지 |
| 2026-07-02 | 공용 AI/RAG provider-unavailable runtime smoke 통과를 반영. DMS 저장 지점에서 common object/chunk/state stale projection과 retrieval/Ask audit를 확인했고, provider-ready vector/RAG workflow green 결과는 단기 P1 잔여로 유지 |
| 2026-07-02 | embedding deployment placeholder 값은 provider unavailable로 처리하는 기준을 runtime proof 항목에 반영 |
| 2026-07-02 | DMS vector/RAG capability를 embedding provider readiness 기반으로 정합화한 상태를 반영하고, 잔여를 unavailable/ready runtime proof로 좁힘 |
| 2026-07-02 | 공용 AI/RAG reference adapter 상태를 현재 완료 범위에 추가하되, DMS vector/RAG capability gate와 Docker runtime smoke를 단기 P1 선행 항목으로 재정렬 |
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
