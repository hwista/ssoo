# 오류 안내와 시스템 복귀

> 2026-09-30 · 공용 구현과 로컬 브라우저 검증 반영. [검증 보고서](2026-09-30-error-recovery-verification.md)에서 실제 실행 범위와 제한을, [실행 대장](error-recovery-ralph-plan.md)에서 최종 검사 상태를 확인한다.

## 표면 계약

`@ssoo/web-shell`은 오류를 validation, auth-required, forbidden, not-found, conflict, rate-limited, network, unavailable, unexpected로 분류한다. API adapter는 status/code/details/retryAfterSeconds/requestId를 유지한다. 특히 DMS 409의 서버 본문과 revision 정보는 충돌 해결에 그대로 전달한다.

| 공용 표면 | 적용 위치 | 복귀 규칙 |
|---|---|---|
| `SsooErrorPage` | 404, 앱 접근 제한, 최초 세션 확인 실패 | 안전한 링크 또는 명시적인 계정 전환 action 필수. 기본 홈 링크 제공 |
| `SsooErrorPanel` | 업무 본문, 목록·상세·검색 실패 | shell과 다른 탭 유지. 조회 재시도와 홈/목록 이동 제공 |
| `SsooErrorNotice` | 양식, 부분 조회, 저장·업로드 실패 | 입력값과 열린 작업을 유지. 기존 submit/cancel/도메인 action 사용 |
| `SsooErrorToast` / `ssooToast` | 작업 오류·검증 경고·Promise 실패 | notice에 위임. 기존 ID·재시도 action 유지, 확인 필요 오류는 `showSsooErrorAlert`로 자동 닫힘 없이 확인 제공 |
| `SsooFatalError` | root layout/provider 예외 | auth/query/router/global CSS 없이 안내, reset/reload/홈/복귀 링크 |
| Nginx 정적 오류 화면 | 앱 프로세스 연결 실패와 502/503/504 | 앱 서버와 무관한 서비스 목록 제공. JSON API와 분리 |

React의 error boundary는 렌더 예외를 맡고, 비동기 작업 실패는 호출한 화면의 상태로 처리한다. 정상 empty/loading, 사용자가 취소한 요청, 저장 성공 후 후속 조회 실패를 하나의 전체 페이지 오류로 합치지 않는다. 상태가 unknown인 API 장애를 권한 거부로 표현하지 않는다.

공용 DataGrid, ContentAreaState의 error variant, SidebarState의 error variant, SettingsBanner의 danger tone과 PMS/DMS ErrorState adapter도 공용 표면을 소비한다. 도메인 전용 잠금·ACL 요청/승인·충돌 비교·초안 복원·작업 진행 상태는 해당 작업 화면에 남는다. 기존 toast 호출 위치와 복구 action은 유지하되 오류·검증 경고는 `ssooToast`를 경유한다.

## 오류 처리 경계와 완료 기준

사용자가 확정한 완료 기준은 **업무 오류가 발생하고 처리·표시되는 경로에서 공용 오류 템플릿을 사용하는 것**이다. 모든 업무 API·권한·입력 조합의 실패 주입은 완료 조건으로 두지 않는다. 외부 연동·배포 환경 검증은 사용자 요청으로 보류한다.

새 오류는 경계의 page/panel/notice 또는 공용 toast로 연결한다. 다섯 앱의 `SsooToaster`는 React boundary가 받지 못하는 window error/unhandledrejection도 공용 toast에 연결한다. 같은 오류 알림 ID로 중복을 제한하고 AbortError 취소는 제외하며 브라우저 진단 이벤트는 막지 않는다. 앱의 toast adapter는 `ssooToast`를 사용하고 raw Sonner toast나 native 오류 `alert`를 직접 사용하지 않는다. 정상 빈 목록·진행 상태·오류 건수 통계·사용자 취소·복구 가능한 내부 파싱 fallback은 오류 표시와 구분한다. 개발 로그와 UI 처리도 구분하며 사용자 작업 실패를 로그만 남기고 끝내지 않는다.

`showSsooErrorAlert`의 확인 필요 오류는 공용 `Dialog`와 `SsooErrorNotice`로 표시한다. 열린 업무 모달 바깥의 토스트 버튼이 오버레이·포커스 잠금에 막히던 문제를 해결하기 위해 확인창을 동일한 모달 스택에 올린다. 확인·닫기·Escape는 오류 안내만 닫고 기존 업무창과 입력을 유지하며, 호출 당시의 요소가 남아 있으면 포커스를 돌려준다. 바깥 클릭이나 시간 경과로는 닫지 않는다. 반환 ID와 `ssooToast.dismiss(id)`는 유지하고, 일반 오류/경고·재시도·성공 토스트는 기존 경로를 유지한다. 이 변경을 모든 일반 토스트의 모달 내 키보드 접근성까지 해결한 것으로 확대 해석하지 않는다.

`pnpm run verify:error-routing`은 다섯 웹 앱과 공용 auth/shell의 raw toast import, 오류 alert, 오류값/안내문 직접 JSX 렌더, 독립 alert 표면을 AST로 검사한다. alias와 공용 위임 adapter를 확인하며 build/preflight/push guard/PR에서 실행한다. 이 검사는 식별 규칙에 해당하는 우회를 차단한다. 모든 의미상의 오류를 자동 증명하는 도구는 아니므로 새로운 처리 경로의 코드 검토와 대표 브라우저 검증을 함께 수행한다.

DMS 대화 오류는 text message의 `error` 필드에 보관하여 `AssistantMessageList`의 공용 notice로 표시한다. 이미 받은 부분 응답은 유지하고 스트림 실패를 사용자 취소·빈 응답으로 덮지 않는다. 대화 저장·댓글 갱신·문서 삭제·파일 이동·AI 요약·수집 현황 조회 실패도 공용 경로에 연결한다. SNS 링크 복사 실패는 수동 복사 입력을 유지하면서 notice로 안내한다.

## 인증과 권한

- `SharedSessionRecovery`는 최초 인증 확인 실패에 재확인/로그인/서비스 복귀를 제공한다. 기존 access token과 접근 가능한 본문이 있으면 본문을 유지하며 확인 실패 notice를 표시한다. token만 있고 본문이 없으면 전체 복구를 제공한다. 서버의 실제 권한 검사는 계속 적용된다.
- `SsooAccessRecovery`는 마지막 접근 snapshot이 없으면 조회 실패 panel, 있으면 기존 본문과 notice를 유지한다. 계정 변경 뒤 늦게 도착한 snapshot은 요청 세대 번호로 무시한다.
- `SharedAppRecovery`는 인증·사용자·access token이 준비된 뒤 조회하며 서버에서 홈 접근이 확인된 서비스만 이동 대상으로 제공한다. 일부 probe가 실패하면 “확인하지 못함”을 표시한다. 서비스 목록의 사용자 ID와 요청 세대를 확인해 이전 계정 결과를 노출하지 않는다.
- 계정 전환과 공용 로그아웃은 서버 세션 종료 성공 후 인증 상태를 지우고 로그인으로 이동한다. 실패하면 현재 상태를 유지하고 재시도 안내를 표시한다.
- 로그인 429는 `Retry-After`를 전달해 대기 안내와 제출 제한에 반영한다. 필드 오류는 해당 입력의 `aria-describedby`로 연결한다.

## 주소와 예외 경계

다섯 앱에 `not-found.tsx`, 루트 `error.tsx`, `(main)/error.tsx`, `global-error.tsx`, `/recovery`를 둔다. 미등록 공개 주소는 공용 404로 안내한다. 공용 사용자 표면 rewrite, 공식 deep link와 명시한 기존 virtual path의 루트 복귀는 유지한다.

chunk 오류 자동 새로고침은 탭의 sessionStorage로 1회만 허용한다. 저장소 접근이 막혀 있거나 이미 시도했으면 수동 복구 화면을 사용한다. 일반 렌더 예외에 자동 새로고침을 반복하지 않는다.

## 앞단 정적 오류 화면

배포 파일은 `docker/error-pages/`에 있다. 웹앱 서버마다 이 reverse proxy를 앞단에 두거나 해당 설정을 운영 ingress에 이식한다. 로컬 검증은 별도 `ssoo-error-recovery-edge` 컨테이너로 수행하며 현재 운영 ingress에 적용했다는 뜻은 아니다.

```bash
docker build -f docker/error-pages/Dockerfile -t ssoo-error-pages:local .
docker run --name ssoo-error-pages --network ssoo_default -p 8080:8080 \
  -e SSOO_ERROR_UPSTREAM=http://admin:3000 \
  -e SSOO_ADMIN_URL=http://localhost:3000 \
  -e SSOO_CRM_URL=http://localhost:3001 \
  -e SSOO_PMS_URL=http://localhost:3002 \
  -e SSOO_DMS_URL=http://localhost:3003 \
  -e SSOO_SNS_URL=http://localhost:3004 ssoo-error-pages:local
```

실제 배포에서는 URL을 서비스 공개 HTTPS 주소로 지정하고 TLS/호스트/상위 프록시 설정을 해당 환경에 맞춘다. 잘못된 서비스 URL은 기동 시 거부한다. `/__ssoo_recovery/`는 upstream 없이 제공하며, 서비스 접근 권한은 이동한 앱에서 확인한다. 문서 요청은 장애 HTTP 상태를 유지하고, upstream 연결 실패의 API 요청은 503 JSON을 반환한다. 정상 upstream API 오류 응답은 HTML로 바꾸지 않는다.

DNS/TLS 실패와 브라우저 자체 연결 오류는 앱이나 이 프록시가 HTML을 제공할 수 없는 경계다. 이를 React error boundary가 처리한다고 주장하지 않는다.

## 검증

DMS 저장 오류는 조회 오류와 분리해 편집기를 유지한다. 서버의 DMS revision 충돌은 허용된 비교 필드만 전달한다. PMS 요청 등록의 부분 실패는 이미 생성된 프로젝트 ID로 재시도하며, SNS 댓글 등록 성공 뒤 목록 실패는 등록 실패로 표시하지 않는다. 후속 로컬 브라우저에서 이 경로와 다섯 앱의 실제 root Provider 예외·복구를 확인했다.

`pnpm run verify:error-recovery`는 공유 패키지를 빌드하고 모델/렌더/실제 adapter 61개, 세션 53개, PMS/DMS/SNS 실제 access store 12개, DMS 저장 중 상태·실패 후 초안·부분 메타데이터 저장 11개, toast 7개, 대화 오류 5개로 합계 149개를 검사한다. 우회 검사 자체 검증 13개도 실행한다. 헤더/본문 Retry-After와 DMS 충돌 payload 보존도 포함한다. 5앱 CLI 57개 묶음, 공용 예외/초안 보존 fixture 6개 묶음, 앞단 Nginx와 DMS 기존 업무 회귀 증거는 검증 보고서에 연결한다. 개별 업무의 모든 실패 조합이나 실제 운영 배포까지 완료했다는 뜻은 아니다.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-01 | 확인 필요 오류를 공용 모달 스택에 표시하여 CRM 팝업 차단 안내의 클릭/키보드 차단 해결. [검수 기록](2026-10-01-popup-acknowledgement.md) 참조 |
| 2026-09-30 | 공용 오류 모델/페이지/패널/notice, 인증·권한 복구, 앞단 정적 화면 계약과 검증 범위 기록 |
| 2026-09-30 | 재개 검증에서 발견한 snapshot·세션 복원 경합과 Retry-After 보존을 보완하고 실행 증거 연결 |
