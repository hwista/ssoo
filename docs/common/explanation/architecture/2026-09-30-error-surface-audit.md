# 웹 오류 안내·복귀 동선 전수 조사

> 조사일: 2026-09-30 · 기준: `e81cf1d7` + 같은 날 로컬 Admin 접근 복구 변경
> 상태: 정적 전수 검색 및 핵심 경로 재현 완료. 공용 템플릿 구현·전 화면 실패 주입 완료를 뜻하지 않는다.

## 결론

다섯 앱에서 함께 사용하는 **오류 분류 + 안내 화면 + 복귀 행동**의 완성 템플릿은 없다. 공용 상태 표현 부품은 있으나, 전체 페이지 오류·인증/권한 오류·본문 조회 오류·입력 오류에 일관되게 연결되어 있지 않다. 같은 날 추가한 Admin `AccessRecovery` 역시 앱 로컬 구현이다.

먼저 공용 오류 계약과 복귀 행동을 만들고, 기존 상태 표현·도메인별 복구를 보존하면서 다섯 앱에 적용해야 한다. 모든 실패를 별도 URL로 이동시키면 입력값·문서 초안·열린 탭을 잃을 수 있으므로 **전체 페이지 / 본문 영역 / 입력·작업 안내**를 같은 시각 규칙의 서로 다른 배치로 제공한다.

## 조사 범위와 증거

- `apps/web/{admin,crm,pms,dms,sns}` 및 `packages/{web-auth,web-shell,web-ui}/src`의 TS/TSX/JS/MJS/CJS **1,016개 파일**을 검색했다. 경계 컴포넌트, route/middleware, 오류 상태, 권한/부재 안내, 재시도, toast를 함께 검색했다.
- 키워드 후보는 **280개 파일·1,410개 행**이다. 로딩·빈 상태·정상 복귀·오류 문자열 정의도 포함하며, 이를 독립 오류 1,410건이나 수동 검증 1,410건으로 세지 않는다.
- 앱 페이지 엔트리 52개, layout 15개, API route handler 171개를 파일 목록으로 집계했다. MDI의 가상 페이지는 이 엔트리 수와 다르며 각 앱 `ContentArea`와 페이지 컴포넌트를 추가 추적했다.
- 서버의 공용 HTTP 예외 필터, 인증 제한, 프록시, Compose 경계도 별도로 읽었다. 모든 서버 throw 문을 개별 업무 시나리오로 열거한 API 감사는 아니다.
- Chromium에서 익명 주소 진입 **10건**(5앱 × 일반 미등록 주소/`.html` 미등록 주소), 로그인 상태 API 장애 주입 **4건**을 재현했다. 실제 컨테이너를 중단하지 않고 브라우저 응답만 503으로 대체했다.
- 500 렌더 예외, root layout 실패, chunk 손실, offline/TLS, 모든 업무 양식·모든 권한 조합의 런타임 검증은 이번 결과에 포함하지 않는다. 아래 후속 검증 목록으로 남긴다.
- 이전 Admin 복구의 11개 브라우저 검증은 별도 증거이며 이번 14건에 중복 집계하지 않는다.

| 범위 | 검색 파일 | 키워드 후보 파일 |
|---|---:|---:|
| Admin | 74 | 18 |
| CRM | 190 | 23 |
| PMS | 190 | 53 |
| DMS | 373 | 139 |
| SNS | 89 | 21 |
| web-auth | 33 | 18 |
| web-shell | 47 | 8 |
| web-ui | 20 | 0 |

전체 검색 파일/후보 위치는 [소스 조사 대장](../../reference/error-surface-audit-20260930.csv)에 보존한다. 후보가 0인 파일도 포함한다. 대장은 `검색 대상 파일`, `분류`, `행 번호`의 증거 목록이며 자동 적합 판정표가 아니다.

로컬 브라우저 증거는 `output/playwright/error-audit-20260930/`의 `routes.json`, `failure-findings.json`, 스크린샷 및 console log에 있다. 이 디렉터리는 로컬 산출물이며 배포/운영 증거로 사용하지 않는다.

## 기존 템플릿과 처리 부품

| 구현 | 현재 역할 | 부족한 계약 |
|---|---|---|
| [web-shell/content-area.tsx](../../../../packages/web-shell/src/content-area.tsx) `SsooContentAreaState` | loading/empty/notice/error의 본문 상태 표현 | 재시도·목록 복귀·로그인·서비스 이동 action 계약 없음 |
| [web-shell/sidebar.tsx](../../../../packages/web-shell/src/sidebar.tsx) `SsooSidebarState` | 사이드바의 오류/빈 상태 표현 | 도메인 재시도는 children에서 개별 구현 |
| [web-shell/settings-surface.tsx](../../../../packages/web-shell/src/settings-surface.tsx) `SsooSettingsBanner` | 설정의 성공/오류 배너 | 전체 오류 화면 계약은 아님 |
| [PMS StateDisplay](../../../../apps/web/pms/src/components/common/StateDisplay.tsx), [DMS StateDisplay](../../../../apps/web/dms/src/components/common/StateDisplay.tsx) | 로컬 `ErrorState` + 선택적 `onRetry`, Loading/Empty | 두 앱에 유사 구현 중복, 필수 복귀 동선·상태 분류 없음 |
| [SNS StateDisplay](../../../../apps/web/sns/src/components/common/StateDisplay.tsx) | `EmptyState`에 title/description/action 주입 | empty/denied/failure를 같은 부품으로 사용, 분류와 기본 복구 없음 |
| [Admin AccessRecovery](../../../../apps/web/admin/src/components/layout/AccessRecovery.tsx) | 403/조회 실패 구분, 서비스 이동, 로그아웃, 재조회 | Admin에만 구현. 공용 승격 후보 |
| [web-auth/ui.tsx](../../../../packages/web-auth/src/ui.tsx), [password-reset-page.tsx](../../../../packages/web-auth/src/password-reset-page.tsx) | 5앱 로그인/비밀번호 찾기 공용 양식 오류 | 일반 오류 화면으로 통합하지 않고 입력 보존 규칙을 유지해야 함 |
| [서버 HTTP 예외 필터](../../../../apps/server/src/common/filters/http-exception.filter.ts) | `{success:false,error:{code,message,path,statusCode},timestamp}` JSON, PMS 상세 코드 | HTML 안내 화면과 복귀 행동은 프론트 책임 |
| [공용 Axios API client](../../../../packages/web-auth/src/axios-api-client.ts) | 401 세션 복원·재호출, `SharedApiError(message,status)` | error code·재시도 대기·추적 식별자 보존/화면 분류 계약 없음 |
| [DMS API core](../../../../apps/web/dms/src/lib/api/core.ts) | status/details 유지, 409 충돌 정보, 404/413/timeout 문구 | 공용 Axios와 오류 모델이 다름. 충돌 details를 보존하는 adapter 필요 |

## 시스템 오류 페이지와 주소 진입

| 앱 | `not-found.tsx` | `error.tsx` | `global-error.tsx` | 기타 복구 |
|---|---|---|---|---|
| Admin | 없음 | 없음 | 없음 | 로컬 접근 제한 `AccessRecovery` |
| CRM | 없음 | 없음 | 없음 | 개별 업무 배너 |
| PMS | 있음, `/` 자동 이동 | `(main)`에 있음 | 있음 | chunk 실패 자동 reload, 수동 reload/reset |
| DMS | 있음, `/` 자동 이동 | 없음 | 없음 | `ContentArea.lazyWithChunkRetry`에서 reload 후 재실패 throw |
| SNS | 있음, `/` 자동 이동 | 없음 | 없음 | 개별 EmptyState/action |

직접 근거: [PMS main error](../../../../apps/web/pms/src/app/(main)/error.tsx), [PMS global error](../../../../apps/web/pms/src/app/global-error.tsx), [PMS 404](../../../../apps/web/pms/src/app/not-found.tsx), [DMS 404](../../../../apps/web/dms/src/app/not-found.tsx), [SNS 404](../../../../apps/web/sns/src/app/not-found.tsx), [DMS chunk 처리](../../../../apps/web/dms/src/components/layout/ContentArea.tsx).

다섯 middleware는 [공용 route policy](../../../../packages/web-shell/src/route-policy.ts)를 사용한다. Admin/CRM/PMS/DMS는 허용되지 않은 일반 경로를 `/`로 redirect하고, SNS는 `/not-found`로 rewrite한 뒤 404 컴포넌트가 `/`로 보낸다. matcher는 `api`, `_next`, 점이 포함된 경로 등을 제외한다. 따라서 일반 미등록 주소가 홈으로 이동한다고 실제 404 복구까지 보장되는 것은 아니다.

### 실제 브라우저 결과

입력은 `/audit-missing-route-20260930` 및 `/audit-missing-route-20260930.html`, 상태는 익명이다. 표의 HTTP 값은 `page.goto()`가 반환한 최종 document 응답이며 앞선 HTTP redirect를 합산한 값이 아니다.

| 앱 | 일반 미등록 주소 | `.html` 미등록 주소 | 판정 |
|---|---|---|---|
| Admin | 홈 경유 로그인, document 200 | 404 영어 기본 화면, 버튼 0개 | 직접적인 복귀 동선 누락 확인 |
| CRM | 홈 경유 로그인, document 200 | 404 영어 기본 화면, 버튼 0개 | 직접적인 복귀 동선 누락 확인 |
| PMS | 홈 경유 로그인, document 200 | 404 응답 뒤 홈 경유 로그인 | 복귀하지만 오류/원래 주소 안내가 남지 않음 |
| DMS | 홈 경유 로그인, document 200 | 404 응답 뒤 홈 경유 로그인 | 복귀하지만 오류/원래 주소 안내가 남지 않음 |
| SNS | 404 응답 뒤 홈 경유 로그인 | 404 응답 뒤 홈 경유 로그인 | 복귀하지만 오류/원래 주소 안내가 남지 않음 |

복귀 없이 남는 화면은 `admin-404.png`, `crm-404.png`로 확인했다. 자동 이동은 기존 shell/MDI 정책의 일부이므로 이를 무조건 제거하는 수정은 하지 않는다. 유효한 가상 경로 복구와 실제 오타/삭제된 공개 링크를 구분하는 정책이 필요하다.

## 오류 안내가 발생하는 시나리오 대장

`전체`는 shell 이전/바깥의 화면, `본문`은 shell과 탭을 유지한 화면, `국소`는 입력·패널·배너·toast를 뜻한다. shell을 통해 이동할 수 있는 상태를 전체 앱의 막힌 화면과 동일하게 평가하지 않는다.

| ID | 계기·범위 | 현재 안내 / 복귀 | 정리할 부분 |
|---|---|---|---|
| E01 | 잘못된 공개 URL, 5앱·전체 | 위 404 표 | 공용 404 + 확실한 홈/로그인/서비스 이동 |
| E02 | 렌더링 예외, root/provider 예외·전체/본문 | PMS main/global만 사용자 정의 | 5앱 경계 배치, shell 생존 여부에 따른 본문/전체 템플릿 |
| E03 | 배포 후 chunk 누락·전체/본문 | PMS 10초 재시도 억제, DMS retry flag | 무한 reload 방지·최종 수동 복귀, 초안 보존 |
| E04 | 로그아웃 상태·세션 만료/복원 실패, 5앱 | 공용 bootstrap, 401 복원 후 실패 시 로그인 | 익명/만료와 네트워크 복원 실패 구분, 안전한 returnTo |
| E05 | 잘못된 비밀번호/계정 상태/로그인 rate limit | 공용 로그인 양식 안의 오류, 재입력 | 입력 유지, 잠금/제한·재시도 대기 표현 점검 |
| E06 | 비밀번호 재설정 코드 오류·만료·요청 실패 | 공용 양식 배너와 로그인 이동 | 코드 재요청·입력 보존 유지, 메일 수신과 API 접수 성공 구분 |
| E07 | Admin 앱 접근 403·전체 | 서비스 이동/계정 전환/재조회 있음 | 공용 인증 복구로 승격, 이번 기존 동작 보존 |
| E08 | 앱 접근 snapshot 조회 5xx·본문/메뉴 | SNS 권한 없음, PMS 메뉴 없음, DMS 권한 필요로 표현 | 실패와 명시적 권한 부족을 분리하고 권한 재조회 제공 |
| E09 | SNS feed/board/search 권한 부족·본문 | 로컬 EmptyState, shell 유지 | 해당 영역에 권한 설명과 가능한 대체 동선 |
| E10 | SNS 게시판 상세 없음/조회 장애·본문 | 둘 다 “게시판을 찾을 수 없습니다”, 목록 링크 | 403/404와 5xx 분리, 5xx는 재조회도 제공 |
| E11 | SNS 게시물 없음/비공개/조회 실패·본문 | 403/404는 열람 불가, 나머지는 재시도; 피드 링크 유지 | 존재 여부 비공개 정책 유지하며 템플릿 소비 |
| E12 | SNS 피드·목록·검색·댓글·이미지 실패·국소 | 재시도/배너/이미지 fallback 혼재 | 부분 실패는 본문 전체 이동 금지, 성공한 등록과 후속 조회 실패 구분 유지 |
| E13 | PMS 홈 요약/업무 큐 조회 실패·본문 | “잠시 후 다시 시도” 문구, 해당 오류 부품에 버튼 없음 | 직접 재조회 추가, shell 이동 보존 |
| E14 | PMS 프로젝트 ID 없음/상세 조회 실패·본문 | ID 없음은 문구만, 조회 실패는 재시도 | 잘못된/삭제된 대상은 목록 복귀도 제공 |
| E15 | PMS 관리·기준정보·템플릿 조회 실패·본문 | ErrorState + refetch가 다수 존재 | 통일하되 기존 재시도와 탭 상태 보존 |
| E16 | PMS 프로젝트 하위 탭·전이·관계·멤버·산출물 실패·국소 | inline/toast/선택기 재조회 | 업무 선행조건과 서버 장애 분리, 입력 유지 |
| E17 | Admin 통계·사용자·권한·인증·조직·코드·AI 운영 조회/저장 실패 | 개별 배너/toast, 일부 refetch | 기존 조회/저장 복구를 공용 본문/국소 템플릿에 연결 |
| E18 | CRM 영업기회·계약·고객·사업계획·원가·보고·운영·설정 조회 실패 | 각 Workspace의 error/banner, refresh/load 함수 | 응답을 `Error(message)`로 평탄화하는 곳의 status/code 보존 |
| E19 | CRM 입력·승인·전환·견적/계약 문서 생성 실패·국소 | 작업 패널·dialog 오류, 취소/재입력 | 저장 상태/초안 보존, 실패한 단계만 재시도 |
| E20 | DMS 접근/AI/작성/설정 권한 제한·본문 | ErrorState 또는 제한 문구, shell 유지 | 권한 재조회/가능한 메뉴 이동, “없음”과 장애 분리 |
| E21 | DMS 설정 최초 조회 실패·본문 | settingsAccess 없음 + ErrorState, onRetry 없음 | 현재 설정 화면에서 재조회 가능한 action 필요 |
| E22 | DMS 파일 트리/문서 본문 조회 실패·본문/사이드바 | 파일 트리 강제 동기화, 본문 handleRetry 존재 | 기존 수동 복구 보존; 전체 로그인 차단 화면으로 확대 금지 |
| E23 | DMS 문서 ACL·locked preview·권한 요청 | 요청/승인·잠긴 문서 전용 동선 존재 | 단순 403 페이지로 대체하면 기능 손실. 도메인 action slot 유지 |
| E24 | DMS 동시 편집·revision 409·저장 충돌 | 서버 내용/충돌 비교·초안 복구 처리 | 일반 “재시도”로 덮어쓰기 금지, 충돌 해결 동선 유지 |
| E25 | DMS 파일/이미지/템플릿 업로드 크기·형식/처리 실패 | API 413/오류 매핑, dialog/배너/toast | 입력/선택 보존, 파일별 재시도, 상위 화면 복귀 |
| E26 | DMS Git/storage/ingest/AI 생성·stream 실패 | 운영 패널 오류, 작업 상태/개별 retry | 전체 500으로 합치지 않고 작업 상태·복구 action 보존 |
| E27 | 공용 프로필·설정·검색·알림 실패 | 공용 표면의 개별 오류/재시도/notice | 전 앱 동일한 상태 모델 연결; 부분 데이터 유지 |
| E28 | 알 수 없는 MDI 경로·없는 활성 탭 | Admin/CRM “페이지 준비 중”, PMS/DMS 경로 안내; SNS 탭 제한은 재시도 | 미구현과 잘못된 경로 구분, 탭 닫기/기존 탭/홈 복귀 |
| E29 | 네트워크·timeout·API 500/502/503/504 | 각 API client/화면에서 메시지 처리 | retryable 분류, 서버 HTML/기술 오류 노출 방지 |
| E30 | 중복/상태 충돌 409·검증 400/422·과다 요청 429 | 도메인별 구현; 전 앱 공용 status→action 매핑 없음 | 입력 오류는 필드, 충돌은 도메인, 429는 대기 후 재시도 |
| E31 | 서버 로그아웃 실패 | Admin 복구는 성공 확인, 공용 store/hook은 finally로 상태 정리/이동 | 계정 전환 반복 위험을 별도 검증하고 공용 계약 정리 |
| E32 | 앱 프로세스/프록시 중단·정적 자산 실패 | Compose에 공용 HTML 장애 페이지 설정 없음 | 서비스 앞단의 독립 502/503/504 화면 배포 계약 필요 |

E30의 422/504 등은 공용 계약에서 다룰 입력이며 모든 상태 코드가 현재 앱에서 별도 화면을 가진다는 뜻이 아니다.

### 주요 소스 연결

- E04–E06/E31: [protected bootstrap](../../../../packages/web-auth/src/protected-app-bootstrap.ts), [인증 store](../../../../packages/web-auth/src/store.ts), [공용 logout](../../../../packages/web-auth/src/logout.ts), [인증 API](../../../../packages/web-auth/src/auth-api.ts).
- E08: [PMS access store](../../../../apps/web/pms/src/stores/access.store.ts), [SNS access store](../../../../apps/web/sns/src/stores/access.store.ts), [DMS access store](../../../../apps/web/dms/src/stores/access.store.ts). 실패 때 `snapshot:null,hasLoaded:true,error`로 종료하지만 layout은 error를 복구 UI로 연결하지 않는다. PMS 사이드바에는 기존 새로고침 action이 있으므로 복귀가 전혀 없다고 판단하지 않는다.
- E09–E12: [SNS BoardDetail](../../../../apps/web/sns/src/components/pages/board/BoardDetailPage.tsx), [FeedPage](../../../../apps/web/sns/src/components/pages/feed/FeedPage.tsx), [PostDetail](../../../../apps/web/sns/src/components/pages/feed/PostDetailPage.tsx), [PostComments](../../../../apps/web/sns/src/components/pages/feed/PostComments.tsx).
- E13–E16: [PMS Dashboard ErrorHome](../../../../apps/web/pms/src/components/pages/home/DashboardPage.tsx), [WorkQueuePages ErrorState](../../../../apps/web/pms/src/components/pages/work-queues/WorkQueuePages.tsx), [Project Detail](../../../../apps/web/pms/src/components/pages/project/DetailPage.tsx), [PMS 관리 화면](../../../../apps/web/pms/src/components/pages/admin).
- E17–E19: [Admin 페이지](../../../../apps/web/admin/src/components/pages), [CRM 페이지](../../../../apps/web/crm/src/components/pages), [영업기회 Workspace](../../../../apps/web/crm/src/components/pages/opportunities/OpportunityWorkspaceClient.tsx).
- E20–E26: [DMS Settings](../../../../apps/web/dms/src/components/pages/settings/SettingsPage.tsx), [DocumentAccessSurface](../../../../apps/web/dms/src/components/pages/settings/_components/DocumentAccessSurface.tsx), [FileTree](../../../../apps/web/dms/src/components/layout/sidebar/FileTree.tsx), [DocumentPageContent](../../../../apps/web/dms/src/components/pages/markdown/_components/DocumentPagePanels.tsx), [DocumentPage](../../../../apps/web/dms/src/components/pages/markdown/DocumentPage.tsx).
- `MyRequestsPage`에도 retry 없는 오류가 있으나 현재 ContentArea의 `myAccessRequests`는 `LegacyAccessRequestsRedirect`로 설정 화면에 넘긴다. 이 파일을 현재 도달 가능한 독립 오류 페이지로 중복 집계하지 않는다.
- E27–E28: [공용 user surface](../../../../packages/web-auth/src/user-surface.tsx), [각 앱 ContentArea](../../../../apps/web), [frame 계약](ssoo-frame-system.md).

## 우선 보완할 결함

| 우선순위 / ID | 확인한 문제 | 증거 수준 | 필요한 조치 |
|---|---|---|---|
| 높음 F01 | Admin/CRM 실제 404가 영어 기본 화면, 이동 버튼 없음 | 브라우저 재현 | 공용 404 및 정해진 복귀 action |
| 높음 F02 | PMS 외 4앱에 사용자 정의 render/root error 경계 없음 | 소스 확인, 실제 crash 미주입 | 5앱 boundary 배치·독립 최후 fallback |
| 높음 F03 | 권한 조회 장애가 권한 부족/빈 메뉴로 바뀜 | SNS/PMS/DMS 503 주입 재현 | unavailable와 forbidden 분리, snapshot 재조회 |
| 높음 F04 | SNS 게시판 503이 “게시판을 찾을 수 없습니다” | 503 주입 재현 | 5xx 분리, 목록 링크와 재조회 함께 제공 |
| 중간 F05 | PMS 홈·큐, DMS 최초 설정 오류의 직접 retry 누락 | 소스 확인 | 본문 상태에 필수 action 계약 적용 |
| 중간 F06 | 공용 로그아웃 실패에서도 clear/navigate, PMS global 로그인 링크는 세션 종료 없음 | 소스상 반복 진입 위험, 이번 런타임 미검증 | 공용 계정 전환과 로그인 복귀 계약을 분리·검증 |
| 중간 F07 | 미등록 MDI 경로가 준비 중/문구로만 종료 | 소스 확인 | 기존 탭/홈 이동, unknown route 전용 메시지 |
| 중간 F08 | 공용 API 오류에 code/details/retry metadata가 일관되게 전달되지 않음 | API adapter/도메인 소스 확인 | status/code 기반 정규화, DMS conflict payload 보존 |
| 운영 F09 | 웹 서버 자체 중단을 처리할 앞단 HTML fallback은 레포 설정에서 확인 안 됨 | Compose/파일 검색, 운영 외부 설정 미확인 | 실제 프록시·호스팅에 독립 정적 장애 화면 연결 |

### 장애 주입 재현 결과

| 요청 | 주입 | 화면 결과 | 기존 탈출 경로 |
|---|---|---|---|
| SNS `/api/sns/access/me` | 503 | “피드 접근 권한이 없습니다” | shell 메뉴는 남음. 해당 안내에 권한 재조회 없음 |
| SNS `/api/sns/boards/999999999` | 503 | “게시판을 찾을 수 없습니다” + 서버 연결 실패 설명 | 게시판 목록 링크 있음 |
| PMS `/api/menus/my` | 503 | “메뉴가 없습니다”, 홈은 정상 표시 | shell/sidebar 새로고침 존재. 장애임을 설명하지 않음 |
| DMS 브라우저 `/api/access` | 503, 매칭 1회 확인 | 파일 영역 사라짐, “문서 작성 권한이 필요합니다”, “AI 검색 권한이 필요합니다” | shell 유지, 접근 snapshot 장애 안내 없음 |

DMS의 브라우저 프록시는 `/api/access`이고 upstream은 `/api/dms/access/me`다. 재현 증거는 실제 브라우저 프록시 요청을 가로챈 결과만 사용했다. 계정 권한을 바꾸거나 서버를 중지하지 않았다.

## 제안하는 공용 템플릿 계약

아래 이름은 설계 제안이며 아직 구현된 export가 아니다.

| 배치 | 제안 | 적용 |
|---|---|---|
| 전체 화면 | `SsooErrorPage` | 404, 앱 접근 제한, shell을 렌더할 수 없는 오류 |
| 본문/탭 | `SsooErrorPanel` | 상세 없음, 데이터 조회 실패, 기능 접근 제한; header/sidebar/다른 탭 유지 |
| 입력/작업 | `SsooErrorNotice` | 양식 검증, 저장 실패, 부분 로딩 실패; 입력값과 작업 상태 유지 |
| root/배포 장애 | 최소 의존 fallback + 앞단 정적 HTML | provider/CSS/chunk가 깨져도 안내·안전한 링크가 동작해야 함 |

공통 필드는 `kind`, 안전한 제목/설명, 필요할 때의 HTTP 상태/지원 코드, 필수 기본 action과 보조 action이다. `kind`는 validation/auth-required/forbidden/not-found/conflict/rate-limited/network/unavailable/unexpected를 구분한다. 정상 empty/loading은 오류로 분류하지 않는다. 사용자가 취소한 요청도 장애 알림으로 만들지 않는다.

기본 행동 규칙:

1. 전체 화면에는 정상 시스템으로 돌아갈 명시적인 링크/버튼을 최소 하나 둔다. 재시도만 반복하게 하지 않는다.
2. `뒤로가기`는 보조 행동이다. 히스토리가 없거나 실패 주소로 돌아오면 사용할 홈/목록/서비스 경로를 별도로 보장한다.
3. 로그인 상태에서 다른 계정으로 전환할 때는 서버 세션 종료 성공을 확인한다. 일반 `/login` 이동을 계정 전환으로 취급하지 않는다.
4. 앱 자체에 접근 권한이 없으면 그 앱 홈으로 다시 보내지 않는다. 서버에서 확인된 다른 서비스와 계정 전환을 제시한다.
5. 권한 snapshot/API가 실패한 상태를 “권한 없음”으로 표시하지 않는다. 마지막 데이터 사용 여부와 미확인 상태를 명시하고 재조회한다.
6. 필드 검증은 해당 필드에 메시지/접근성 연결을 두고 양식에서 수정한다. 전역 에러 페이지로 이동하지 않는다.
7. 조회 retry와 저장 재실행을 구분한다. 중복 쓰기 위험이 있는 요청은 자동 재전송하지 않고 기존 idempotency/도메인 계약을 따른다.
8. DMS 409 충돌 비교, ACL 요청/승인, 파일 트리 동기화, 복구 초안, SNS 등록 성공 후 댓글 목록 실패 등의 기존 동선을 유지한다.
9. 403/404를 일부 비공개 리소스에서 같은 문구로 표시하는 정책은 유지할 수 있다. 서버 5xx까지 그 문구에 합치지는 않는다.
10. 기술 stack·토큰·원문 upstream HTML을 노출하지 않는다. 추적용 digest/request ID는 실제 제공되는 경우에만 표시하고 서버 로그와 연결한다.
11. 키보드 초점, heading/alert/status 의미, 모바일 줄바꿈, disabled/retry 진행 상태를 공통화한다.
12. 컴포넌트가 auth provider/query client에 의존하지 않는 최소 fallback을 별도로 둔다. 앱 서버까지 내려간 경우에는 앞단에서 같은 내용의 정적 HTML을 제공한다. DNS/TLS 및 브라우저 자체 연결 오류는 웹앱이 렌더할 수 없는 경계다.

패키지 책임: `web-ui`는 기존 원자, `web-shell`은 안내 레이아웃과 action 표현, `web-auth`는 세션 복구·계정 전환·서비스 접근 조회를 맡는다. 각 앱은 도메인 의미/목록 경로/재조회 함수를 주입한다. API 응답 자체는 JSON 계약을 유지하며 모든 API 4xx/5xx를 HTML 페이지로 바꾸지 않는다.

## 적용 순서와 검증 기준

1. **공용 계약/표현**: 오류 모델 adapter, 전체·본문·국소 표면, 최소 fallback, 복귀 action 정책을 만든다. Admin 복구 기능은 유지하면서 재사용 가능하게 옮긴다.
2. **앱 진입 경계**: 5앱 not-found/error/global-error 연결과 unknown MDI 처리를 정리한다. 기존 허용 경로·DMS 가상 문서 경로·SNS 사용자 경로 호환을 보존한다.
3. **장애 오분류**: SNS/PMS/DMS 접근 snapshot 장애, SNS 게시판 상세, PMS 홈/큐와 DMS 초기 설정 retry를 우선 고친다.
4. **업무 화면 이관**: 대장 E09–E30 순서로 기존 inline/toast/양식/충돌 동작을 상태 표현에 연결한다. 이미 있는 기능을 generic error로 축소하지 않는다.
5. **운영 앞단**: 실제 reverse proxy/호스팅을 확인한 뒤 정적 502/503/504·점검 화면을 연결하고 웹 컨테이너가 없는 상태에서 검증한다.

| 검증 묶음 | 반드시 확인할 시나리오 |
|---|---|
| 주소/히스토리 | 5앱 × 익명/로그인 × 일반/점 포함/허용 prefix 하위 잘못된 경로, direct/reload/back, 정상 deep link/MDI handoff |
| 예외 경계 | 일반 페이지 render throw, shell/provider/root throw, lazy import/chunk 실패, CSS/JS 미로드, 한 번 retry 후 반복 실패 |
| 인증 | 잘못된 비밀번호, 실제 만료, 복원 503, logout 503, 다른 계정 로그인, returnTo 검증, 뒤로가기 무한 왕복 없음 |
| 권한 | 명시적 403, snapshot 503, 사용 가능 서비스 0개/일부 조회 실패, 권한 변경 후 재조회 |
| 데이터 | 없는 ID·삭제된 리소스·400/404/500/503·offline/timeout, 0건 정상 응답은 empty로 유지 |
| 입력/저장 | invalid/400/422/409/429/413, 입력/초안 유지, 자동 중복 저장 없음, DMS 충돌 비교·권한 요청 보존 |
| 부분 실패 | 통계/댓글/이미지/검색/알림/파일 트리 실패에서 다른 부분은 사용 가능, 성공 작업을 실패로 오표시하지 않음 |
| UI/관측 | desktop 1440×1000·mobile 390×844, 키보드/읽기 순서, 첫 navigation 전 console/pageerror/request/HTTP monitor, 주입한 실패만 예상 처리 |
| 운영 | 앞단 502/503/504, Retry-After(제공 시), 서버 로그 상관관계, 프로세스 복구 후 정상 복귀 |

이번 작업은 조사 문서와 대장만 추가했다. 기존 자동 redirect·권한 요청·초안 복구 등을 없애는 실행은 포함하지 않는다. 해당 동작을 바꾸는 구현 단계에서는 이 문서의 전후 동선과 회귀 기준으로 변경 범위를 확정한다.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-30 | 5앱/공용 패키지 오류 표면 조사, 14개 브라우저 시나리오, 결함 우선순위와 공용 템플릿 제안 기록 |
