# 공용 오류 안내·복귀 구현 검증

> 2026-09-30 · 로컬 격리 환경 검증 기록
> 기준: `launch/rebaseline-20260721`, `e81cf1d7` 위 작업트리. 별도 세션의 사업연도 이전 변경이 함께 존재한다.
> 계약: [오류 안내와 시스템 복귀](error-recovery.md) · 범위: [조사 대장](2026-09-30-error-surface-audit.md) · 상태: [실행 대장](error-recovery-ralph-plan.md)

## 구현 결과

다섯 앱의 404·렌더 예외·root fallback·복귀 화면을 공용화했다. 본문 조회 실패는 shell과 탭 안에서 재시도하고, 양식·저장·부분 조회 실패는 입력과 작업 상태를 유지하는 notice를 사용한다. 권한 조회 장애를 권한 부족으로 표시하던 분기를 분리했다. 기존 DMS 권한 요청/승인·잠금·초안·충돌 비교와 SNS 댓글 등록 후 목록 실패 안내는 보존했다.

재개 후 실제 검증에서 발견한 다음 결함도 수정했다.

- DMS/SNS 계정 초기화 뒤 이전 권한 응답이 다시 적용되는 문제: 요청 세대 번호를 초기화 시에도 증가시킨다.
- 세션 실패 시 access token만 있고 본문이 없는 경우 복귀 화면이 비는 문제: 접근 가능한 본문이 없으면 전체 복구를 제공한다.
- Admin 접근 목록 갱신 실패가 이미 열린 작업을 교체하는 문제: 캐시가 있으면 본문과 notice를 함께 유지한다. 실제 403은 접근 복구로 처리한다.
- 저장된 사용자 정보만 복원된 단계에서 서비스 접근 요청이 먼저 나가던 문제: 인증·사용자·access token이 준비된 뒤 조회한다.
- `Retry-After` 헤더가 없을 때 응답 본문의 대기 시간이 사라지는 문제: Fetch/auth/Axios/DMS adapter 모두 본문 값을 보존한다. DMS 409의 서버 원문/revision도 보존한다.
- 정적 fallback의 favicon 요청이 추가 502를 만들던 문제: 앞단에서 204로 처리한다.

## 후속 로컬 검증 (2026-09-30)

사용자가 외부 연동·배포 환경은 아직 미정이며 로컬 격리 검증부터 진행한다고 확인했다. 후속 증거는 `output/playwright/error-recovery-remaining-20260930/`에 있다.

- DMS 저장 실패가 조회 오류 상태를 덮어 편집기를 교체하는 결함을 수정했다. 저장은 `isSaving`/`saveError`를 사용하고 실제 편집기·초안과 기존 저장 동선을 유지한다. 본문 저장 후 메타데이터 저장이 실패해도 편집 모드를 닫지 않는다.
- 실제 DMS 409 검증에서 서버 공통 예외 필터가 비교 정보를 버리는 결함을 발견했다. 인증·ACL 검사 후 발생하는 `/api/dms/file`, `/api/dms/content`의 `Document conflict`에 한해 본문·revision·hash 필드를 보존한다. 일반 오류 details는 전달하지 않는다. 서버 단위 검증 6개가 통과했다.
- Admin 사용자 목록 503 후 재조회, 등록 503·중복 ID 409에서 양식 보존, 모바일·취소 복귀를 확인했다.
- CRM 영업기회 저장 503에서 고객명·영업기회명·다음 행동 등 입력과 양식을 유지하고 자동 중복 제출이 없는 것을 확인했다.
- SNS 댓글 등록 실패 시 초안 유지, 실제 등록 성공 후 목록 503 안내, 목록 재조회 시 같은 댓글이 한 번만 저장된 것을 확인했다.
- PMS 요청 등록 버튼의 native form 연결과 저장 중 양식 유지 문제를 수정했다. 생성된 프로젝트 ID를 부분 실패 동안 보관해 요청 상세 재시도에서 같은 프로젝트를 수정한다. 실제 생성 → 상세 저장 503 → 입력 수정 → 재시도로 중복 생성 없이 상세 저장을 확인했다.
- 5앱의 실제 production layout JS 응답에서 `Providers` 함수에만 렌더 예외를 주입했다. 각 앱의 `global-error` 화면, 데스크톱·390px 모바일, 장애 해제 후 다시 시도로 로그인 화면 복귀가 통과했다. 제품 소스나 배포 번들에 테스트 오류 route를 추가하지 않았다.

- PMS 실제 지연 로딩 JS 파일에 404를 주입해 자동 문서 새로고침 1회, 반복 실패 시 오류 경계, 파일 복구 후 수동 새로고침으로 업무 큐 복귀를 확인했다. `browser-chunk-error.log`의 navigation 2회는 자동 1회와 마지막 수동 1회의 합계다.
- 격리 서버는 기존 전용 이미지에 이 작업의 컴파일된 예외 필터만 적용하고 재시작했다. 다른 세션의 사업연도/코드 이전 스키마를 격리 DB나 일반 개발 DB에 적용하지 않았다. 현재 서버 소스 전체의 production build도 별도로 통과했다.

| 후속 검사 | 결과 / 증거 |
|---|---|
| 공용·세션·권한·DMS 편집 상태 | 137개 통과. `unit.log` |
| 서버 예외 필터 | 6개 통과. `server-test.log` |
| 업무 CLI | Admin 3 / CRM 1 / PMS 3 / DMS 4 / SNS 3, 총 14개 묶음. 앱별 `*-errors.log`, `dms-save-conflict.log` |
| 실제 root Provider CLI | 5앱 각각 fatal 화면·모바일·재시도 통과. `browser-root-errors.log` |
| 실제 lazy chunk CLI | 파일 404·자동 reload 제한·수동 복귀 2개 묶음 통과. `browser-chunk-error.log` |
| 기존 DMS 업무 회귀 재실행 | 10개 통과. 별도 opt-in 저장소 설정 mutation 1개는 미실행. `domain-regression.json` |
| 서버/PMS/DMS build 및 변경 앱 lint | 통과. DMS는 필수 guard의 clean build 포함 |
| preflight / sync / 문서 / 변경 7개 TS·TSX 패턴 | 통과. 문서 315개. 전용 로그 참조 |

검증 후반 다른 세션의 홈·탭 공용화 변경이 작업트리에 추가되었다. PMS `OpenTabs`의 누락된 `HOME_TAB` import만 보완했다. 앞선 5앱 전체 빌드·브라우저 증거를 이후 홈·탭 변경 전체의 검증으로 확대하지 않는다. 이 세션 소유 소스 hash는 후속 증거 폴더의 `source-fingerprint.json`에 기록한다.

이 결과는 대표 업무 흐름의 실행 증거이며 모든 업무 API·권한·입력 조합의 전수 완료를 의미하지 않는다. 이전 표의 결과는 선행 검증 시점의 기록이며 이번 변경의 최종 검사와 구분한다.

## 오류 처리 경계 최종 점검 (2026-09-30)

사용자가 외부 환경 검증을 보류하고, 업무 오류 조합 전수 대신 모든 오류 처리·표시 경로의 공용 템플릿 경유를 완료 기준으로 확정했다.

- 공용 `SsooErrorToast`/`ssooToast`를 추가하고 PMS/DMS toast adapter와 Admin/SNS 직접 toast를 연결했다. 오류·검증 경고·Promise 실패를 notice로 표시하며 ID·복구 action을 유지한다. 기존 native 오류 alert는 자동 닫힘 없는 확인 action으로 연결한다. CRM에도 공용 toaster를 제공한다.
- 권한 안내·처리 이력의 실패 사유·수집 실패·SNS 이미지/작성자 조회·복사 실패·추천/저장 상태 등 남은 표시 경로를 공용 notice로 연결했다. 정상 empty/status와 성공 알림은 보존한다.
- DMS 삭제·저장 후 파일 이동·대화 자동 저장·댓글 갱신·AI 요청/요약·수집 현황 polling에서 로그만 남기거나 무시하던 사용자 작업 실패를 공용 경로로 연결했다. 이미 저장한 본문·대화·목록을 유지한다.
- 대화 검색·스트림 오류는 `AssistantMessage.error`로 구분하여 공용 notice로 렌더한다. 실패 전 부분 응답을 유지하고, 오류 메시지가 사용자 중단으로 덮이는 결함을 수정했다. 명시적 사용자 중단은 정상 안내로 유지한다.
- `verify:error-routing`을 build/preflight/push guard/PR에 연결하고 Codex/GitHubDocs 규칙과 sync manifest를 맞췄다. AST 자체 검사 13개와 웹 소스 1,010개에서 식별 가능한 우회 0건을 확인했다. 파일 수는 업무 시나리오의 실행 수가 아니며 의미상 모든 오류를 자동 증명하지 않는다.
- 공용 회귀 149개(기존 137 + toast 7 + 대화 오류 5)가 통과했다. 브라우저에서 Sonner JSX 제목이 기존 action 버튼을 숨기는 문제를 발견하여 함수 제목/공용 description으로 조정했다. 재시도와 확인 action이 실제로 동작하는 것을 재검증했다.
- 컴포넌트 CLI 6개 묶음으로 실제 `AssistantMessageList`의 검색/스트림 오류와 부분 응답 보존, toast 재시도·초안 보존, 검증 경고·자동 닫힘 없는 확인·390px 모바일, Promise 실패·unsafe detail 차단을 확인했다. 다섯 앱의 공용 toaster에 미처리 이벤트/Promise 경계를 연결하고 명시적 사용자 취소는 제외했다. 주입한 비동기 오류·Promise 거부·사용자 취소 진단 3건만 예상 실패로 기록했고 그 외 console/pageerror/request/HTTP 실패는 0건이다.

- 실제 Admin CLI 2개 묶음 통과: 사용자 비활성화 DELETE 503 주입 시 공용 notice·확인 버튼·목록/셸 유지, 모바일 확인과 중복 요청 방지를 확인했다. 실제 계정 데이터는 변경하지 않았다.

- 실제 SNS CLI 2개 묶음 통과: 클립보드 거부에서 공용 notice·수동 복사 URL 유지, 모바일 닫기·재열기 후 오류 초기화를 확인했다. 임시 비공개 게시물은 삭제했다.

| 최종 검사 | 결과 / 증거 |
|---|---|
| 공용 계약 / 경로 검사 | 149개 / 자체 검사 13개, 1,010개 소스의 식별 가능한 우회 0건. `contracts.log` |
| CLI 브라우저 | 컴포넌트 6 + Admin 2 + SNS 2 묶음 통과. `browser-templates.log`, `admin-alert.log`, `sns-share-error.log` |
| production build | 전체 11/11 통과. 마지막 전역 오류 경계 반영 후 SNS 재빌드와 DMS clean guard 추가 통과. 다섯 앱 최종 번들에 경계 포함 확인. `build.log`, `sns-build.log`, `dms-guard.log` |
| lint / preflight / sync / 문서 | lint 11/11 및 필수 검사 통과. 문서 구조 315개. 각 전용 로그 |
| 검증 기준점 / 정리 | `verification.json`, `source-fingerprint.json`. 검증용 게시물·브라우저·임시 서버 정리. 기본 개발 컨테이너/DB 유지 |

증거: `output/playwright/error-routing-20260930/`. 이 검증은 외부 AI/메일/저장소 실서비스나 운영 배포 검증을 포함하지 않는다.

## 검증 환경과 증거

로컬 증거 위치는 `output/playwright/error-recovery-resume-20260930/`다. 로그·스크린샷·실행 fixture는 Git에서 제외되는 검증 산출물이다. 제품에 테스트 오류 발생 route를 추가하지 않았다.

- 전용 서버 4100, DB 5542, 앱 Admin 3100 / CRM 3101 / PMS 3102 / DMS 3113 / SNS 3104를 사용했다. 기본 개발 컨테이너·데이터와 사업연도 이전 작업은 유지했다.
- production build를 `next start`로 실행했다. 초기 공통 앱 검증은 번들에 설정된 API 4000 요청을 실제 격리 API 4100으로 전달했다. 최종 빌드와 DMS guard는 API/WebSocket을 4100, 서비스 링크를 검증 포트로 지정했다.
- Chromium Playwright CLI를 주 검증 경로로 사용했다. DMS 업무 회귀는 기존 저장소 Playwright suite를 추가 실행했다.
- 모바일 390×844, 데스크톱 1440×1000에서 공용 복귀 화면을 확인했다. 한글 글꼴을 설정한 최종 스크린샷을 사용한다.
- 앱 실패 주입은 정확한 URL/상태를 예상 실패로 지정했다. 첫 navigation 전부터 console/pageerror/request/HTTP를 관측했다. 이동 때 취소되는 document/RSC/stream 요청 외의 예상하지 않은 실패는 통과로 처리하지 않았다.

| 검증 | 결과 / 증거 |
|---|---|
| 모델·렌더·실제 adapter | 61개 통과. `verify:error-recovery` / `unit-final.log` |
| 세션 복원·실패 로그아웃 | 53개 통과. `verify-anonymous-session.mjs` |
| PMS/DMS/SNS 실제 access store | 12개 통과. 계정 전환 후 stale 성공/실패, snapshot 보존, 재시도. `verify-access-recovery.mjs` |
| 5앱 CLI | 57개 묶음 통과: Admin 11, CRM 10, PMS/DMS/SNS 각 12. `browser-app-*.log` |
| 공용 컴포넌트 CLI | 6개 묶음 통과. `browser-components.log` |
| 공용 비밀번호 재설정 CLI | 3개 묶음 통과. request 503·confirm 400 입력 보존, 모바일·로그인 복귀. `browser-password-reset.log` |
| Nginx 앞단 CLI | 502/503/504 document, API JSON 보존, 복구 후 정상 홈, 모바일·독립 서비스 목록. `edge.log` |
| DMS 기존 업무 회귀 | 10/10 통과. `domain-regression.json` |
| 전체 production build | 최종 adapter 보완 후 11/11 통과. `production-build.log` |
| 전체 lint | 11/11 통과, 경고 없음 |
| preflight / sync / DMS guard / docs / patterns | 통과. docs 312개, 명시한 변경 TS/TSX 170개 patterns. 각각 `preflight.log` / `sync.log` / `dms-guard.log` / `docs.log` / `patterns.log` |

57·6은 여러 assertion을 포함한 시나리오 묶음 수다. 파일 수나 전체 업무 오류 조합 수가 아니다. 의도적으로 발생시킨 render/chunk 예외는 component fixture에서 각각 정확한 오류 메시지로 식별하며, 그 밖의 오류는 없어야 한다.

## 조사 항목별 구현과 증거

`브라우저`는 실제 실행한 시나리오, `계약`은 모델/adapter/store/렌더 검증, `소스`는 소비 지점과 기존 도메인 동선의 코드 대조를 뜻한다. 소스 대조만 한 개별 업무 화면을 실패 주입 완료로 세지 않는다. 아래 모든 E 항목은 구현/보존 위치에 연결되며, 각 업무의 모든 입력·권한·외부 시스템 조합을 실행했다는 뜻은 아니다.

| ID | 구현·보존 위치 | 확인 수준 |
|---|---|---|
| E01 | 5앱 `app/not-found.tsx`, [route policy](../../../../packages/web-shell/src/route-policy.ts) | 브라우저: 익명 일반/점 포함/허용 prefix 오타, 로그인 404, 홈·뒤로·reload |
| E02 | 5앱 `error.tsx`/`(main)/error.tsx`/`global-error.tsx`, [route error](../../../../packages/web-shell/src/route-error.tsx), [fatal fallback](../../../../packages/web-shell/src/fatal-error.tsx) | 브라우저: 5앱 실제 root Provider throw → global-error → retry 복귀, 모바일. 공용 render throw/reset도 확인 |
| E03 | [chunk recovery](../../../../packages/web-shell/src/chunk-recovery.ts), DMS `ContentArea` lazy import | 계약·브라우저: 한 번 reload 후 수동 reset, 저장소 접근 거부. 후속 PMS 실제 lazy chunk 404·수동 복구 통과 |
| E04 | [session recovery](../../../../packages/web-auth/src/session-recovery.tsx), 각 main layout | 계약·5앱 브라우저: session 503 재확인, 익명/인증 복원 |
| E05 | [login UI](../../../../packages/web-auth/src/ui.tsx) | 계약·5앱 브라우저: 429 대기·입력 보존·제출 제한·실제 로그인 |
| E06 | [password reset](../../../../packages/web-auth/src/password-reset-page.tsx) | 브라우저: 요청 503·만료 코드 400 뒤 입력 보존·다시 제출·로그인 복귀. 메일/비밀번호 변경은 주입 응답이며 실제 전달 미검증 |
| E07 | [Admin layout](../../../../apps/web/admin/src/app/(main)/layout.tsx), [app recovery](../../../../packages/web-auth/src/app-recovery.tsx) | 브라우저: viewer 실제 403, 서비스 0개·일부 실패·계정 전환 |
| E08 | [access recovery](../../../../packages/web-shell/src/access-recovery.tsx), PMS/DMS/SNS access store | 계약·브라우저: 각 접근 API 503과 retry, 캐시/입력 보존·stale 응답 차단 |
| E09 | SNS Feed/BoardList/Search/ContentArea | 소스·공용 panel 계약: 명시적 forbidden, shell 유지 |
| E10 | [BoardDetailPage](../../../../apps/web/sns/src/components/pages/board/BoardDetailPage.tsx) | 브라우저: 503 조회 장애와 실제 404를 구분, 재시도·목록 복귀 |
| E11 | [PostDetailPage](../../../../apps/web/sns/src/components/pages/feed/PostDetailPage.tsx) | 소스·계약: 403/404 비공개 문구, 나머지 조회 실패, 피드 이동 유지 |
| E12 | SNS FeedTimeline/PostComments/ComposeBox/SearchPage | 브라우저 추가: 댓글 저장 503 입력 유지·실제 저장 성공 후 목록 503·목록 재조회와 중복 방지 |
| E13 | PMS Dashboard/WorkQueuePages | 브라우저: 홈 summary 503/retry. 소스: 큐별 refetch 연결 |
| E14 | [PMS DetailPage](../../../../apps/web/pms/src/components/pages/project/DetailPage.tsx) | 소스·panel 계약: ID 누락 목록 복귀, 조회 오류 재시도 |
| E15 | PMS StateDisplay/MasterDataPage 및 관리 화면 소비처 | 소스·panel 계약: 기존 refetch/탭 상태 유지 |
| E16 | PMS project 하위 tabs/sections, request/CreatePage | 브라우저 추가: 요청 등록 실패 입력 유지·실제 부분 저장 후 동일 프로젝트 재시도. 다른 하위 탭은 소스 계약 |
| E17 | Admin Dashboard/UserManagement/AccessManagement/AuthPolicy/Org/Code/AiOperations | 브라우저 추가: 사용자 목록 503/retry, 등록 503·409 입력 유지. 다른 관리 화면은 소스 계약 |
| E18 | CRM 각 Workspace/Preview, [HTTP adapter](../../../../packages/web-auth/src/http-error.ts) | 소스·adapter 계약: status/code/details와 조회 retry 보존 |
| E19 | CRM ContractUpsert/Approval/OpportunityContractDocument/고객 양식 | 브라우저 추가: 영업기회 저장 503 입력 유지. 승인·DMS 생성은 기존 소스 계약 |
| E20 | DMS ContentArea/Chat/Settings/DocumentPage | 소스·브라우저: 접근 snapshot 실패와 실제 기능 제한 분리 |
| E21 | [DMS SettingsPage](../../../../apps/web/dms/src/components/pages/settings/SettingsPage.tsx) | 브라우저: 최초 settings 503 → 같은 화면 재조회 |
| E22 | DMS StateDisplay, 공용 SidebarState, DocumentPagePanels | 소스: 파일 트리 강제 동기화/본문 handleRetry 보존. 도메인 회귀: 문서 재조회 |
| E23 | DMS DocumentAccessSurface/DocumentPermissionsSection/locked preview | 기존 업무 브라우저: 잠긴 검색·요청·승인·거절·회수·redaction·댓글 |
| E24 | [DMS API core](../../../../apps/web/dms/src/lib/api/core.ts), DocumentPage 충돌/초안 경로 | 실제 서버 409 → 최신본/초안 비교 → 병합 저장, 저장 503 초안 유지·수동 재시도. 기존 두 세션 잠금·초안·활성 문서 갱신 회귀 보존 |
| E25 | DMS ImageInsertDialog/TemplateSection/업로드 도메인 처리 | 소스·413 분류 계약: 선택/입력 및 기존 도메인 retry 보존 |
| E26 | DMS IngestOperationsSurface/ChatPage/설정 운영 영역 | 소스·notice 계약: 작업 상태와 개별 복구 유지. 외부 storage/AI 장애 미주입 |
| E27 | web-auth user-surface/search/notifications, web-shell 검색/알림 표면 | 소스·adapter/notice 계약: 부분 데이터·기존 재조회 유지 |
| E28 | 5앱 ContentArea, 공용 route policy | 소스·route 계약: unknown panel·기존 탭/홈 복귀. 정상 DMS 링크는 업무 브라우저 확인 |
| E29 | [error model](../../../../packages/web-shell/src/error-model.ts), Fetch/Axios/DMS adapter | 계약: network/timeout/5xx 분류·원문 HTML/stack 차단. 브라우저: 503 조회 복구 |
| E30 | 공용 model/notice/retry-delay 및 도메인 충돌 처리 | 계약: 400/409/413/422/429와 metadata. 브라우저: 429 countdown·중복 retry 억제 |
| E31 | web-auth store/logout/user-menu/app-recovery | 계약·5앱 브라우저: logout 503 뒤 인증 유지, 재시도 성공 후 로그인 이동 |
| E32 | [docker/error-pages](../../../../docker/error-pages) | 실제 Nginx 브라우저: upstream 없음 502, upstream 503/504, JSON 유지·홈 복구 |

| 결함 | 조치·증거 |
|---|---|
| F01 | E01: 5앱 실제 404와 복귀 링크 |
| F02 | E02: 모든 경계 연결, 공용 render/fatal 및 5앱 실제 root Provider 오류·재시도 브라우저 |
| F03 | E08: PMS/DMS/SNS 각각 503/retry, stale store 검증 |
| F04 | E10: SNS 503 → 실제 404 분리 |
| F05 | E13/E21: PMS 홈·DMS 설정 실제 retry, 큐 refetch 소스 |
| F06 | E31: 로그아웃 실패 상태 보존, 성공 확인 후 계정 전환 |
| F07 | E28: unknown MDI panel과 복귀 action, 기존 가상 경로 보존 |
| F08 | E18/E24/E29/E30: 실제 adapter metadata와 충돌 payload 검증 |
| F09 | E32: 실행 가능한 독립 앞단 구성과 로컬 브라우저. 운영 ingress 배포는 별도 |

## 검증 경계와 인계

- 렌더/root/chunk 장애는 제품에서 사용하는 실제 공용 컴포넌트를 fixture에 가져와 검증했다. 후속 검증에서는 다섯 앱의 실제 root Provider 함수에 브라우저 응답 한정 예외를 주입해 global-error와 재시도까지 확인했다. 배포 자산을 실제 삭제하지 않았다.
- E09/E11/E12/E14–E19/E25–E27의 모든 업무 API 실패 조합, 실제 메일/AI/storage 장애, DNS/TLS 장애는 런타임 전수 완료에 포함하지 않는다. 후속 검증의 대표 업무 흐름 외 나머지 분기는 소스 연결과 공용 계약 수준의 증거로 구분했다. 업무 조합 전수는 사용자 확정 완료 기준에서 제외하며, 외부 환경 검증은 사용자 요청으로 보류한다.
- 중간 실행에서 SNS 조회 대기 45초 초과 1회와 반복 인증에 따른 실제 login 429가 있었다. 실패 실행을 통과로 합산하지 않았다. SNS는 같은 코드/조건의 새 context에서 재검증했고, 로그인 제한은 서버 설정을 바꾸지 않고 대기 후 재실행했다.
- 앞단 proxy는 독립 Docker 이미지/설정으로 제공한다. 기존 dev ingress나 운영 환경에 적용했다는 뜻은 아니다. 운영 URL/TLS 설정은 [배포 계약](error-recovery.md)의 절차를 따른다.
- 테스트 로그인 보조 함수의 모호한 `아이디` 선택자와 오래된 DMS heading 탐색을 현재 화면 계약에 맞췄다. 업무 assertion을 제거하지 않았다.
- 사업연도 이전의 서버/DB/CRM 변경은 다른 세션 소유다. 이 작업에서 원격 sync·커밋·push·운영 배포는 수행하지 않았다.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-30 | 공용 오류 처리 경계 기준 확정, toast/미처리 비동기/대화 오류 연결, AST 강제 검사와 최종 브라우저 증거 추가 |
| 2026-09-30 | 후속 로컬 실패 주입으로 DMS 초안·실제 충돌, PMS 부분 저장, Admin/CRM/SNS 양식·부분 실패와 5앱 root 경계 검증을 추가 |
| 2026-09-30 | WSL 중단 후 공용 오류 작업 복구, 검증 중 결함 보완, E01–E32/F01–F09 구현과 증거 수준 연결 |
