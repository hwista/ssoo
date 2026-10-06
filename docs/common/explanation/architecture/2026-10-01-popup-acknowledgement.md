# 열린 업무창 위의 오류 확인 안내

> 2026-10-01 · CRM 견적 팝업 차단 잔여 문제 수정. [공용 오류 계약](error-recovery.md), [CRM 검수 대장](../../../crm/planning/2026-09-30-menu-functional-audit.md).

## 원인과 변경

CRM 견적 미리보기에서 `window.open`이 차단되면 `showSsooErrorAlert`가 자동으로 닫히지 않는 토스트와 확인 버튼을 표시했다. 열린 Radix Dialog 밖의 버튼은 오버레이에 클릭이 막혔고, 키보드 포커스도 업무 모달에 갇혔다. 앞선 검수의 실패 로그는 `output/playwright/crm-form-detail-20261001/final-capture.log`에 있다.

공용 `packages/web-shell/src/error-toast.tsx`에서 확인 필요 안내를 `Dialog`와 `SsooErrorNotice`로 표시한다. Sonner는 기존 알림 ID·dismiss 수명주기를 맡고 시각 표면은 Dialog portal에서 렌더링한다. 확인, 닫기 버튼, Escape가 안내만 닫으며 바깥 클릭·자동 만료로 닫히지 않는다. 확인 버튼에 초기 포커스를 주고 닫을 때 호출한 요소가 남아 있으면 돌려준다. 기존 업무 Dialog의 열림 상태·초안은 변경하지 않는다.

다섯 서비스가 사용하는 `SsooToaster`와 같은 공용 어댑터에 반영되므로 CRM에서 별도로 z-index를 올리거나 견적창을 강제로 닫지 않는다. 현재 실제 `showSsooErrorAlert` 호출처는 CRM 견적 인쇄와 Admin 사용자/조직 작업이다. 일반 `ssooToast.error/warning/promise/success`와 재시도 action은 기존 구현을 유지한다. 일반 토스트 전체의 모달 내 접근성 문제를 해결했다는 판정은 아니다.

## 검증

- `scripts/verify-error-toast.mjs`: 확인 필요 안내의 자동 만료 방지, 공용 확인 컴포넌트에 전달한 메시지, ID 해제 계약으로 기존 검사를 갱신했다. 공용 오류 회귀 149검사와 우회 검사 자체 검증 13개 통과.
- Playwright CLI 실제 Chromium: 다섯 서비스 테마의 **공용 컴포넌트 검수 페이지**에서 각 8개, 합계 40개 검사. 마우스 확인·Enter·Escape·닫기, 포커스 이동/복귀, 미저장 입력, 중첩 AlertDialog, 연속 오류, 일반 토스트 재시도를 확인했다. 다섯 서비스 업무 API의 전수 검증은 아니다.
- CRM 파일에서 현재 견적 렌더·인쇄 함수와 컴포넌트를 그대로 추출한 검수 페이지에서 desktop 1440×1000 / mobile 390×844 각각 4개 검사. `window.open`의 null 반환을 주입하고 안내를 클릭하여 닫은 뒤 견적 내용 유지, 주입 해제 후 실제 새 창의 44,000원 인쇄 내용을 확인했다. 새 견적이나 DB 데이터를 생성하지 않았다.
- 일반 오류의 자동 만료 방지와 브라우저 진단 2개를 더해 **50검사 통과**, console warning/error·pageerror·HTTP 오류 0건. 모바일/데스크톱 안내 캡처를 육안 확인했다.
- 공용 shell/auth 빌드, 변경 파일 ESLint, UI 소비·스타일 경계 및 규칙 동기화 검사 통과. ESLint는 CRM 설정에 TypeScript 파일 범위와 Next rootDir를 지정하여 공용 파일이 ignore되지 않도록 실행했다. Admin/CRM/PMS/DMS/SNS 다섯 앱 production build가 모두 종료 코드 0으로 완료됐다. 임시 경로의 PMS/DMS 내장 ESLint 플러그인 탐색 오류는 변경 파일의 별도 정식 ESLint 통과와 구분한다. 앱별 로그와 실행 시간은 아래 실행 증거에 기록한다.
- 작업 전 preflight는 통과했다. 최종 preflight는 병행 작업에서 추가한 `20261001090000_common_onboarding`과 `launch-database-contract.test.mjs`의 예상 목록 불일치(TC-DB-06)로 실패했다. 이번 수정에서 DB/마이그레이션 파일은 변경하지 않았다. 문서 산출물 strict 검사는 별도로 통과했다.

증거 디렉터리는 `output/playwright/popup-acknowledgement-20261001/`이며 `verification.json`, `browser-results.json`, `browser.js`, `desktop-blocked.png`, `mobile-blocked.png`, 앱별 빌드 로그를 보존한다. 검수 페이지는 실제 공용 패키지의 동일한 Radix 인스턴스를 사용한다. 원본 앱의 `.next`를 덮지 않도록 `/tmp/ssoo-popup-build`와 `/tmp/ssoo-popup-build-retry`에 복사하여 빌드했다. 최초 임시 복사에서 업무 `home` 디렉터리까지 제외한 실수를 수정한 후 PMS/DMS/SNS를 다시 검증했다.

## 배포와 다음 작업

Docker·공용 DB·실행 중인 서비스에는 반영하지 않았다. 다음 CRM 업무 검수는 계약서 생성의 확정 대상·템플릿·22개 변수·다운로드다.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-01 | 오류 확인 모달의 원인·수정·브라우저 증거 및 검증 범위 기록 |
