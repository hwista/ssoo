# 공용 오류 안내·복귀 Ralph 실행 대장

> 시작: 2026-09-30 · 상태: 공용 오류 처리 경계 기준으로 구현·로컬 검증. 외부 환경 검증은 사용자 요청으로 보류
> 사용자 승인 범위: 조사 결과의 공용 템플릿 구성, 플랫폼 전수 적용, 실제 검토·테스트. 구현과 복구 동선 변경을 포함한다.
> 기준: [오류 표면 조사](2026-09-30-error-surface-audit.md), [1,016개 소스 대장](../../reference/error-surface-audit-20260930.csv)

## 완료 조건

- [x] 공용 오류 모델: validation/auth-required/forbidden/not-found/conflict/rate-limited/network/unavailable/unexpected, status/code/details/retry metadata 유지
- [x] 전체 페이지·본문 패널·입력/작업 notice 공용 템플릿, 필수 복귀 action, 독립 root fallback
- [x] 5앱 404/render/root/chunk/미등록 MDI 경로 적용; 정상 deep link·가상 경로 유지
- [x] 인증 복원/계정 전환/로그아웃 실패/안전한 서비스 이동 공용화
- [x] 접근 snapshot 실패와 권한 부족 분리, 재조회 제공
- [x] 5앱 업무 화면의 오류 표면 이관·잔여 도메인 분기 대조
- [x] DMS 충돌·초안·ACL 요청/승인·파일 동기화, SNS 부분 실패 등 도메인 복구 보존
- [x] 앞단 정적 502/503/504 fallback과 재현 가능한 배포·검증 구성
- [x] 모델/adapter/복귀 단위·통합 검증, 5앱 production build/lint, preflight/sync/DMS guard
- [x] CLI 브라우저 검증: 익명/로그인, 정상/주입 실패, desktop/mobile, retry/back/refresh, 예외 경계
- [x] 아키텍처 검토, 불필요 import/중복/임시 제품 우회 정리, 변경 후 회귀 재검증
- [x] E01–E32 및 F01–F09 구현 파일·증거 수준 연결: [검증 보고서](2026-09-30-error-recovery-verification.md)
- [x] 사용자 확정 기준: 오류 처리·표시 경로의 공용 템플릿 경유. 업무 조합의 런타임 실패 주입 전수는 완료 조건에서 제외한다.
- [x] raw 오류 toast/alert·인라인·대화 오류 우회 보완 및 build/preflight/push/PR 회귀 검사 연결.
- 외부 연동·배포 환경 검증은 사용자 요청에 따라 보류한다.

## 실행 순서

1. web-shell 오류 모델·표면·독립 fallback과 단위 검증
2. web-auth 세션/서비스 복구, API 오류 adapter 및 5앱 진입 경계
3. 기존 StateDisplay·본문/국소 오류·도메인 복구 전수 적용
4. 앞단 fallback, 누락 검사, 실패 주입 browser scenario, build/guard
5. 독립적인 관점의 아키텍처/코드 정리 검토와 fresh browser 회귀

## 현재 확인한 상태

- 공용 오류 모델·표면, 5앱 boundary/복귀 route, 검색·알림 소비 지점을 연결했다. 초기 배너 이관 수 132개와 최종 검색 파일 1,021개는 적용률/브라우저 완료율로 사용하지 않는다.
- 모델/adapter/render/chunk 61개, 세션 53개, 실제 access store 12개, 합계 126개 통과. 5앱 CLI 57개 묶음과 공용 컴포넌트 6개 묶음 통과. 예상하지 않은 브라우저 실패 0.
- DMS 기존 업무 회귀 10/10 통과: ACL·잠금·초안 저장·댓글·문서 링크·활성 문서 갱신·설정 direct/reload. 업무 단언을 유지하면서 오래된 테스트 선택자를 수정했다.
- Axios/DMS 본문 Retry-After 보완 후 전체 production build와 lint 11/11, preflight/sync/DMS guard/docs/patterns를 통과했다. 공용 비밀번호 재설정의 입력 보존·로그인 복귀도 CLI 3개 묶음으로 확인했다.
- 사용자 확인: 다른 창에서 사업연도·CRM·서버 작업 중. 해당 변경은 보존하고 합쳐진 작업트리로 검증한다.
- WSL 재시작 후 Docker Desktop을 복구하고 기존 dev 컨테이너와 데이터를 유지했다. 전용 `ssoo-error-recovery` DB 5542/서버 4100, 앱 3100/3101/3102/3113/3104를 사용한다. 3103은 다른 작업 포트다.
- 최신 앞단 이미지는 3181/3182에서 실제 Nginx 502·503·504 문서 상태, API JSON, 서비스 목록과 정상 홈 복귀를 검증했다. 증거: `output/playwright/error-recovery-resume-20260930/`.
- 소스 대조만 한 개별 업무 화면, 실제 운영 배포, DNS/TLS/외부 메일·AI·storage 장애는 브라우저 전수 완료에 포함하지 않는다.

- 후속 로컬 검증: DMS 저장 상태 분리·서버 409 비교 정보 보존, PMS 부분 저장 중복 생성 방지를 보완했다. Admin/CRM/SNS 양식·부분 실패와 5앱 실제 root Provider 예외·복귀도 검증했다. 후속 공용 검증 137개·서버 필터 6개, 업무 CLI 14묶음, 실제 5앱 root 및 PMS chunk 2묶음이 통과했다. 상세 증거는 검증 보고서 후속 항목을 따른다.
- 사용자 확인: 외부 연동·배포 설정은 미정이다. 실제 메일·AI·외부 저장소·운영 DNS/TLS 검증은 이번 범위에서 보류한다.

- 최종 오류 처리 경계 검증: 공용 계약 149개, 우회 검사 자체 검증 13개·웹 소스 1,010개, 브라우저 10개 묶음, 전체 build/lint 11/11과 최종 SNS 재빌드/DMS clean guard 통과. 다섯 앱 최종 번들의 미처리 이벤트/Promise 경계를 확인했다. `output/playwright/error-routing-20260930/verification.json`을 따른다. 외부 환경 보류 외에 공용화 완료 조건의 잔여 항목은 없다.

## 증거 원칙

- 검색 후보 수를 적용 완료 수로 취급하지 않는다. 각 실제 표시 분기는 공용 소비 또는 보존하는 도메인 복구의 근거가 있어야 한다.
- 오류 시나리오에서는 주입한 정확한 요청/상태만 예상 실패로 기록하며 나머지 console/pageerror/request/proxy 실패는 실패 판정한다.
- preflight나 manifest 통과만으로 렌더/복귀 완료를 주장하지 않는다.
- local-test는 실패 주입·mutation 검증용 격리 환경이다. 사용자 인계 전 기존 dev 프로필·readiness·파일 트리를 확인한다.
- 현재 운영 환경에 배포했다는 주장은 하지 않는다. 앞단 구성은 로컬 격리 환경에서 실행 가능한 증거를 먼저 만든다.

## 진행 기록

| 날짜 | 단계 | 결과 |
|---|---|---|
| 2026-09-30 | 착수 | 기존 로컬 Admin 복구·조사 문서를 보존하고 전체 공용화 시작. web-ralph/doc-aware-dev 적용 |
| 2026-09-30 | WSL 복구 후 재개 | 사업연도 이전과 세션 범위 분리. 실제 검증으로 stale access 응답·세션/서비스 복원 경합·Retry-After 보존 결함 수정 |
| 2026-09-30 | 브라우저·회귀 | 5앱 공통/주요 장애, 공용 예외 경계, 앞단 Nginx와 DMS 기존 업무 확인. 전체 업무 조합과 증거 수준을 구분 |

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-30 | 범위를 축소하지 않는 구현·검증 완료 조건과 실행 대장 추가 |
| 2026-09-30 | 재개 후 실제 검증 결과와 E/F 연결 보고서 추가. 런타임 전수 미검증 범위 명시 |
