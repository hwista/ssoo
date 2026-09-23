# CRM 마이그레이션 백로그

> 2026-09-22 검색 결과 표현 완료: 사용자 “적용하자” 승인으로 공통 검색 카드의 고객유형·활동 수·영업기회 상태·우선순위를 업무 명칭으로 표시하고 고객/담당자 정보를 선별했다. 내부 번호는 숨기고 이동 주소는 서비스 이름으로 표시하며 원본 검색·이동 계약을 유지한다. 영업관리 브라우저 27개 검사와 실제 영업기회 열기를 확인했다. [핸드오프](../../common/explanation/architecture/2026-09-22-search-results-handoff.md).

> 2026-09-22 운영 기준년도 후속 승인 완료: 사용자 “승인”으로 운영 기준·제어 조회 후 선택년도가 기본값으로 돌아오던 문제를 해결했다. 선택값을 조회 주소와 동기화하고, 연도 목록이 늦게 갱신되어도 현재 선택을 보존한다. [현재 검증](../../../output/playwright/crm-operations-filter-20260922/results.md)에서 직접 접속·재조회·새로고침, 미제출 선택 유지·목록 갱신·미등록 연도 직접 접속 등 기준년도 27/27을 통과했다. **운영 기준년도 후속 1건 해결·승인 대기 0건**이다. 아래 운영 승인 대기는 해결 전 기록이며 고객·보고·원가 해결 상태도 유지한다. 배치·조회 기준·운영 제어·저장·DMS·공용 패키지·서버·배포는 유지한다. 다음은 로그인/검색 및 다른 서비스 잔여 화면 품질 점검이며 전체 서비스 완료나 실제 운영 준비 판정은 아니다.

> 2026-09-22 운영/설정 화면 순차 보완: 사용자 “진행”으로 운영 기준·제어는 공용 본문 최대 1,380px, 시스템 설정·견적 설정·회사 정보는 975px와 바깥 여백 16px를 적용했다. 중간 화면의 입력/요약 카드 압축, 운영 표의 글자 쪼개짐과 로딩/빈 안내 위치를 보완했다. [검증 결과](../../../output/playwright/crm-operations-layout-20260922/results.md)의 배치 32/32·입력 유지 24/24·표 끝 이동 15/15·운영 표 로딩/빈 안내 12/12를 통과했다. 복원 확인창 취소 2/2는 실제 이력이 없어 브라우저 전용 예시로 검증했다. **운영 기준년도 선택 표시 불일치 1건은 별도 승인 대기**다. 2024년 조회 결과와 주소는 맞지만 선택란은 2026년으로 돌아온다. 기존 고객·보고·원가 해결 건은 유지한다. 이번 변경은 스타일·공용 치수 참조에 한정하며 저장·복원·재시도·업로드·권한·DMS 계약과 배포를 유지한다. 다음은 운영 기준년도 유지 승인 후 처리, 이후 로그인/검색 및 다른 서비스 잔여 품질 점검이다. 실제 운영 준비 판정이나 전체 서비스 완료를 의미하지 않는다.

> 2026-09-22 고객 조회조건 후속 승인 완료: 사용자 “승인”에 따라 고객/활동 화면의 검색어·고객유형·정렬을 조회 후에도 유지하도록 수정했다. 조회조건을 주소와 동기화하며, 미제출 조건은 고객 선택·목록 새로고침·화면 크기 전환 중 보존한다. [현재 검증](../../../output/playwright/crm-customer-filter-20260922/results.md)에서 조회조건 28/28·기존 고객/활동 입력 유지 8/8·표 끝 이동 3/3을 통과했다. **고객 후속 1건 해결·승인 대기 0건**이며 아래 미해결 표기는 해결 전 기록이다. 직전 배치, 조회 기준·저장·권한·DMS·공용 패키지·서버·기존 배포는 유지한다. 다음은 운영/설정 화면이며 다른 서비스 품질 보완도 남아 있다. 고객 기능 전체나 실제 저장 성공을 새로 검증한 판정은 아니다.

> 2026-09-22 고객/활동 화면 순차 보완: 사용자 “진행”으로 본문 최대 1,380px·여백 16px, 목록/상세/활동 입력/고객 저장 영역의 열 배치를 정리했다. 중간 화면의 활동 목록 압축, 작은 화면 입력·저장 버튼 잘림, 날짜·연락처 입력 폭과 로딩/빈 안내 위치를 보완했다. [검증 결과](../../../output/playwright/crm-customer-layout-20260922/results.md)에서 배치 8/8·미저장 입력 유지 8/8·표 끝 이동 3/3·로딩/빈 안내 4/4를 확인했다. **고객 조회 후 유형·정렬 표시가 기본값으로 돌아오는 별도 1건은 미해결·승인 대기**다. 보고·원가의 이전 해결 건을 다시 연 것이 아니다. 이번 제품 변경은 스타일과 공용 치수 참조에 한정하며 저장/권한/조회 계약·DMS는 유지한다. 다음은 고객 조회조건 유지 승인 후 처리이며 운영/설정과 다른 서비스 품질 보완도 남아 있다. 실제 저장 성공이나 전체 고객 기능 완료를 판정한 검증은 아니다.

> 2026-09-22 원가 조회조건 후속 승인 완료: 사용자 “진행” 및 “함께 수정”에 따라 원가 종합 조회 후 선택란이 전체로 돌아오던 문제를 해결했다. 사업년도·사업구분·계열/산업·국내외·검색어를 화면 상태로 관리하고 주소 조건과 동기화하며, 비동기 선택 목록과 빈 결과에서도 현재 조건을 유지한다. [현재 검증](../../../output/playwright/crm-cost-filter-20260922/results.md)에서 조회조건 25/25·기존 입력 유지 24/24·표 끝 이동 15/15·붙여넣기 2/2를 통과했다. **원가 후속 승인 대기 1건은 해결되어 0건**이다. 아래 미해결 표기는 해결 전 기록이다. 계산·저장·확정·DMS·기존 배포는 유지한다. 다음은 고객/활동 화면이며 운영/설정과 다른 서비스는 잔여다.

> 2026-09-22 원가 화면 순차 보완: 사용자 “진행”으로 내부원가 등록·공급업체 관리·연간 외부원가·원가 종합 조회 네 화면의 폭·여백과 입력/카드 배치를 정리했다. 공급업체는 공용 본문 최대 975px, 나머지는 1,380px 및 여백 16px다. 작은 화면의 업체 추가 버튼 잘림·본문 넘침·고정 열의 합계 가림을 보완했다. [검증 결과](../../../output/playwright/crm-cost-layout-20260922/results.md)를 따른다. 배치 32/32·입력 유지 24/24·표 끝 이동 15/15 통과. **원가 종합 조회의 선택조건 표시 불일치 1건은 별도 추가 승인 대기**이며 직전 보고 화면 해결 건과 별개다. 계산·저장·확정·업체 관리 계약과 DMS는 유지한다. 다음은 이 조건 유지 문제 승인 후 처리이며 고객/활동·운영/설정 및 다른 서비스는 잔여다.

> 2026-09-22 보고 조회조건 후속 승인 완료: 사용자 “승인”에 따라 조회 후 사업구분·계열/산업·국내외 선택란이 전체로 돌아오던 문제를 수정했다. 사업년도·검색어를 포함한 입력 조건을 관리하고, 주소 조건 변경을 반영하며 나중에 선택 목록을 불러와도 선택값을 보존한다. [현재 검증](../../../output/playwright/crm-report-filter-20260922/results.md)에서 직접 접속·재조회·새로고침 12/12, 입력 중 조건 크기 전환 8/8 및 변경/전체 해제/빈 결과/미제출 입력 유지 5/5를 확인했다. 직전 별도 승인 대기 1건은 해결되어 대기 0건이다. 아래 미해결 표기는 해결 전 기록이다. 보고 확정/해제·집계 기준·DMS 계약과 기존 배포는 유지한다. 다음은 원가 화면이며 고객/활동·운영/설정과 다른 서비스는 잔여다.

> 2026-09-22 보고 화면 순차 보완: 사용자 “진행”으로 보고 Preview의 공용 본문 최대 1,380px·여백 16px, 요약/월별 카드 열 수와 수치 줄바꿈을 보완했다. [검증 결과](../../../output/playwright/crm-report-width-20260922/results.md)를 따른다. 배치 8개 크기·표 끝 이동·로딩/빈 안내는 통과했으나 **조회 후 선택조건 표시 불일치 1건은 미해결·추가 승인 대기**다. 사업구분·계열/산업·국내외 조건은 주소와 조회 요청에 전달되지만 선택란은 전체로 돌아온다. 수정 전 실행물에서도 재현했고 이번에는 업무 동작을 바꾸지 않았다. 보고 화면 전체 기능 완료로 보지 않는다. 다음은 이 선택조건 유지 문제이며 이후 원가·고객/활동·운영/설정과 다른 서비스가 남아 있다.

> 2026-09-22 종합 조회 후속: 사용자 “진행”으로 사업계획·사업계획대비실적 Preview 두 화면에 공용 본문 최대 1,380px·여백16px를 적용했다. 요약/차수/연도/월별 카드와 직접 실적 입력의 열 수, 차수 선택·이름 줄바꿈, 행 작업 영역 및 빈/로딩 안내 위치를 보완했다. [현재 검증](../../../output/playwright/crm-plan-preview-width-20260922/results.md)을 따른다. 기존 등록·월별 보기와 업무 데이터·저장/확정 계약은 유지한다. 다음은 보고 요약 화면이며 원가·고객/활동·운영/설정 및 다른 서비스도 남아 있다.

> 2026-09-22 사업계획 순차 보완: 사용자 “진행”으로 사업계획 등록·사업계획대비실적(월별) 두 화면의 본문 최대 폭을 공용 1,380px, 바깥 여백을 16px로 맞췄다. 빈 사업계획 행·월별 실적의 로딩/빈 결과 안내는 표 왼쪽에서 읽을 수 있도록 보완했다. 차수·확정 상태·입력·조회·저장 계약을 유지한다. [현재 검증](../../../output/playwright/crm-business-plan-width-20260922/results.md)을 따른다. 작성 중 입력은 실제 원장을 수정하지 않는 브라우저 전용 차수로 검증한다. 다음은 사업계획·사업계획대비실적의 Preview 두 화면이며 보고·원가·고객/활동·운영/설정과 다른 서비스도 잔여다.

> 2026-09-21 계약대비실적 후속: 사용자 “진행”으로 월별·전체 두 화면의 본문을 공용 최대 1,380px·바깥 여백 16px로 맞췄다. 전체 화면의 요약 카드가 중간 화면에서 5열로 눌리던 배치를 화면 크기에 따라 1/2/5열로 보완했다. 월별 열·합계·계획/실적/차이·조회 계약은 유지한다. [최신 검증](../../../output/playwright/crm-performance-width-20260921/results.md)을 따른다. 빈 결과·불러오는 중 안내가 긴 표 중앙에 숨던 문제도 왼쪽 정렬로 보완했다. 다음은 사업계획 등록·월별 실적 화면 묶음이며 보고·원가·고객/활동·운영/설정 및 다른 서비스 품질 검수는 남아 있다. 아래 계약대비실적 잔여 표기는 이전 실행 당시 기록이다.

> 2026-09-21 계약 화면 순차 보완: 계약 현황·청구 목록·원장은 최대 본문 1,380px, 계약 등록·청구 입력은 975px 및 바깥 여백 16px로 맞췄다. 공용 수치를 참조하며, 청구 표·계약 상세의 매출/원가 표·원장 하단 편집 영역이 작은 화면의 폭을 늘리던 배치를 보완했다. 표는 내부에서 가로 이동하며 입력·승인·확정·저장 동작은 유지한다. [최신 검증 범위](../../../output/playwright/crm-contract-width-20260921/results.md)를 따른다. 다음은 계약대비실적(월별/전체) 화면이며 사업계획·원가·고객/활동·운영/설정·로그인/검색도 잔여다. 아래 “계약 화면 잔여”는 이전 실행 당시 기록이다.

> 2026-09-21 본문 폭 순차 보완: 영업기회 대시보드·등록 양식·계약서 생성은 본문 최대 975px, 영업기회 현황·작업공간은 최대 1,380px 및 바깥 여백 16px를 적용했다. 공용 수치를 참조하며 작은 화면에서는 가용 폭으로 줄어든다. [최신 범위와 검증](../../../output/playwright/crm-page-width-20260921/results.md)을 따른다. 이전 표·상세 높이/내부 스크롤, 업무 항목·입력·저장 계약은 유지한다. 다음은 계약 현황·등록·청구 화면의 폭/배치이며, 사업계획·원가·고객/활동·설정·로그인/검색 및 그 외 읽기 품질은 별도 잔여다. 아래 기록의 페이지 폭 미완료는 당시 상태이며 CRM 전체 화면 품질 완료로 바꾸지 않는다.

> 2026-09-21 화면 품질 순차 보완: 사용자 승인 후 영업기회 작업공간의 표·상세 높이와 스크롤, 작은 화면 페이지 이동 영역을 보완했다. 9개 너비에서 기존 행·상세 항목 보존과 영역 경계를 확인했고, 행 선택·이전 차수·수정/취소·화면 크기 전환 중 미저장 입력 보존·빈 결과·기본 현황 목록을 검증했다. [검증 결과](../../../output/playwright/crm-layout-fix-20260921/results.md) 참조. 이번 완료는 작업공간의 높이·스크롤에 한정한다. 로그인·검색·페이지 폭 통일, 대시보드 및 상세 내부의 좁은 표·문구 읽기 품질은 별도 잔여이며 CRM 전체 화면 다듬기 완료가 아니다. 기존 테스트 배포 반영·운영 검증은 수행하지 않았다.

> 2026-09-17 최신 승인-01: 사용자 후속 승인으로 [계약 초안 내부 승인](../../common/explanation/architecture/2026-09-17-contract-internal-approval-handoff.md) 완료. 실제 한 명 지정·요청·승인/반려·철회·이력을 지원한다. 역할별 자동 기록과 구분하며, 기존 계약 확정·청구 조건은 유지한다. 서버 41/41·실제 요청 19/19·세 크기·기존 회귀 6/6. 전체 19완료·3잔여·운영 증거 0/5.

> 작성: 2026-06-08 / 현재 상태 갱신: 2026-08-24
> 기준: 외부 영업관리 데모 기능을 SSOO 프레임워크와 디자인 토큰에 맞게 이식
> AI/RAG 반영: 2026-07-09, CRM opportunity/customer/activity RDB 원장과 공용 AI projection adapter, opportunity/customer/activity 저장 이벤트 queue hook 1차 등록. 고객/활동 Workspace 1차, 고객/활동 owner-aware AI projection ACL snapshot, controlled customer/activity backfill endpoint, 고객/활동 API access guard/snapshot 1차와 Workspace capability 연동, CRM 전용 runtime evidence gate와 공용 `activity` retrieval entity filter를 추가. provider-ready 검증은 SSOO 공통 AI/RAG provider 연결 환경의 확장 readiness에서 별도 판단한다.

> 2026-08-18 운영 Goal: 데모 기능 `SRC-01~28`, 원천 UI/UX `UX-01~17`, [CRM 런칭 운영 PRD](./launch-operations-prd.md)의 `OPS-01~18`, [CRM·DMS 런칭 운영 브라우저 검증 계획](./launch-operations-test-plan.md)의 `BT-01~27`을 서로 분리해 모두 충족한다. 소개자료는 선택 보조 자료다.

## 패리티 요약

> 2026-09-15 최신 후속: 승인-18 프로젝트·문서관리 검색 복원 완료. 고객관리 제품/실행물은 그대로이며 입력·저장·검색·탭 회귀 7/7을 확인했다. 작은 화면 탭 검사의 세션 요청 제한 실패는 원본을 남기고 순차 재검증으로 통과했다. [최신 핸드오프](../../common/explanation/architecture/2026-09-15-search-entry-handoff.md) 기준 총 18항목 중 9완료·9대기, 실제 운영 증거 0/5다.

> 2026-09-11 출시 재점검: [전 서비스 실행 계획](../../common/explanation/architecture/2026-09-11-launch-ralph-plan.md)과 [사용자 승인 대장](../../common/explanation/architecture/2026-09-11-launch-approval-register.md)을 우선 참조한다. 승인-07의 일반 영업기회·계약 데이터 누락을 사용자 승인 후 수정·검증 완료했다. 서버 조회 결과의 시험용 이름 제한 세 곳을 제거했고 권한·검색·최신 차수·확정 조건을 보존했다. 새 빌드에서 두 크기의 실제 브라우저 회귀와 일반 항목 등록·수정 재조회를 확인했다. 기본·작업공간 양식 두 곳의 폭 보정은 확인했지만 기본 등록 저장 실패는 승인-12의 사용자 승인 후 필수 입력과 두 항목의 화면별 이름 연결을 보완해 검증 완료했다. 새 빌드에서 누락 차단·등록·수정·오류·확정 잠금을 두 크기로 확인했다. 승인-10의 잔여 압축 부품을 제거하고 감사 0건·서버 492건·영업/문서 회귀 16건 및 실제 견적 문서 생성·다운로드를 확인해 완료했다. 승인-14도 세 서비스 크기 전환 입력 보존을 수정해 반복 전환 24회·실제 등록 6건·기존 초안 4건을 검증 완료했다. 이후 2026-09-14 승인-11의 입력 이름 연결도 사용자 승인 후 클릭 36/36·등록 2건·수정 1건·두 크기 회귀 2/2로 검증 완료했다. 후속 사용자 승인으로 탭 한도 안내·주소 복구도 새 고객관리 빌드·탭 회귀 2/2·기존 입력/저장 회귀 2/2·두 크기 직접 브라우저 검증을 완료했다. **입력 연결 완료 / 탭 한도 문제 완료**이며 [최신 핸드오프](../../common/explanation/architecture/2026-09-14-crm-tab-limit-handoff.md)를 따른다. 후속 승인-08의 통합 검색 직접 접속·새로고침도 새 빌드·검색 회귀 2/2·기존 회귀 4/4와 두 크기 직접 브라우저로 검증 완료했다. [검색 복구 최신 핸드오프](../../common/explanation/architecture/2026-09-14-crm-search-route-handoff.md)를 우선한다. 작은 화면 검색 보조 영역 가림을 승인-16으로 추가해 총 16항목 중 6완료·10승인 대기다. 작은 화면 기본 노출과 다른 서비스의 한도 처리 후보는 후속 대상이다. 과거 45/45를 현재 수정본의 통과나 실제 운영 출시 가능 판정으로 읽지 않는다.

자체 추정 백분율은 원천 기능 완료를 과대 표시하므로 폐기한다. 분모와 freshness 판정은 [CRM 데모 100% 이식 검증 계약](./demo-100-verification-contract.md), 기능 항목은 [원천 기능 패리티 매트릭스](./source-parity-matrix.md)를 정본으로 삼는다. 기존 45/45는 폐쇄 원장이고 schema 2 worktree identity에 결합된 fresh DB/API/browser 재실행 전에는 현재 revision 45/45로 사용하지 않는다.

| 구분 | 상태 | 우선 처리 |
|---|---|---|
| 현재 revision 재증명 | 최신 strict report 기준 | v1은 build-time API 기본값, v2는 process manifest 경쟁·login rate limit, v3는 생성 ID 대소문자, v4 core 선행 실행은 계약 fixture 외부원가 합계 오류를 각각 검출했다. 모든 반증은 fail-closed·격리 파기했으며 교정 뒤 core 11/11 선행 PASS까지 확인했다. current 점수는 같은 파일 지문의 `current-demo-parity-report.json`만 정본으로 사용 |
| 원천 분석 | 완료 | REF-01 17개 화면·83개 상태, source/DDL manifest, fixed-hash sample, goal-contract와 BT-27 최종 회귀 PASS |
| 영업기회 핵심 | 완료 | SRC 기능과 UX-01~04 source/desktop/mobile 상태 쌍, 구조·interaction·visual diff PASS |
| 견적/문서 | 완료 | UX-04와 BT-06 browser/인쇄 PDF/DMS DOCX·PDF artifact, exact 금액·CI·담당자, residue 0 PASS |
| 계약/청구/실적 | 완료 | S2~S4 기능과 UX-05~08 최종 source/target 회귀 PASS |
| 사업계획 | 완료 | SRC-22 source semantic과 UX-09~10 최종 source/target 회귀 PASS |
| 내부원가/AMS | 완료 | SRC-24~25 actual mutation과 UX-11·13·14 최종 source/target 회귀 PASS |
| Admin/Auth/코드/사업년도 | 완료 | SRC-01~04, 네 역할 allow/deny, UX-12·15~17 최종 source/target 회귀 PASS |
| Production route/origin contract | 완료 | S11에서 CRM settings/report/source URL-first route와 DMS settings/root 복귀, standard/approved mapped API·CORS·Socket.IO, 미승인 origin fail-closed를 desktop/mobile에서 검증. `verify:crm-production-runtime-contract`로 정적 회귀 고정 |
| 운영·릴리스 검증 | 완료 | OPS-01~17 17/17. BT-24 migration/rollback, BT-25 repo/build/docs/OpenAPI/security, BT-26 isolation/residue PASS |
| 실제 런칭 입력 | 외부 입력 대기 | S15 packet·API-ready verifier·같은 release의 DMS 5-track FINAL GO·Playwright CLI desktop/mobile 12 surface 및 견적 PDF·DMS DOCX/PDF 최종 evidence gate/self-test는 준비 완료. schema 3이 real-root path/symlink containment, PNG viewport exact, 세 production origin, seller CI 요청·image, API CRM/DMS snapshot identity와 실제 readiness 문구, quote 산식·화면/산출물 text, PDF/DOCX 재열기·placeholder 0을 fail-closed 검증하고 수동 surface assertion을 거부한다. EXT-01 승인 법인값/CI와 EXT-02 production endpoint/runtime-only credential 적용 후 `CRM-S15-FINAL-GO-LIVE` 판정 |
| 원천 밖 확장 | 완료 판정에서 분리 | 별도 extension readiness로 관리 |

## P0 — 지금 바로 할 일

| 항목 | 내용 | 완료 기준 |
|---|---|---|
| 원천 패리티 정본 | 데모 실행 코드 동작과 현재 구현을 1:1 추적 | 폐쇄 원장 완료: `SRC-01~28` 28/28, `UX-01~17` 17/17, REF-01 83/83. 현재 완료는 `verify:crm-current-demo` fresh PASS 전까지 미확정 |
| 원천 밖 확장 동결 | AI/RAG, 외부 회계 provider, PMS 인계, DMS governance 추가 확장 중단 | 원천 P0 격차가 닫힐 때까지 신규 scope를 패리티 완료에 포함하지 않음 |
| 영업기회 삭제 | 원천의 최신·미확정 삭제 규칙 이식 | 완료: shared type, server DELETE/guard/service, Next proxy, UI, service test, CRM production build. 실제 DB/browser에서 확정 1차→미확정 2차 생성, 2차 삭제 `200`, 1차 자동 재선택, 확정해제, 1차 정리 삭제 `200`, stale detail `404` 없음과 콘솔 오류 0건 확인 |
| CRM 앱 골격 | SSOO 공용 셸과 토큰을 쓰는 CRM 웹 앱 생성 | 1차 완료: `web-crm` 앱과 3001 포트 compose 등록. 후속: PMS식 업무 밀도와 탭/목록 패턴 강화 |
| CRM 서버 골격 | CRM API 모듈 생성 | 1차 완료: RDB 기반 목록/상세/검색/필터/정렬 샘플 API 응답 가능 |
| CRM 타입 경계 | 영업기회, 매출/원가 라인, 상태, 차수 타입 정의 | 1차 완료: 웹/서버가 `@ssoo/types/crm` 공유 타입 사용 |
| PMS/Admin 경계 고정 | 계약/청구/매출/원가는 CRM, 실행 수행은 PMS, 계정/권한/법인은 공용 Admin으로 명시 | 화면 문구와 문서에서 중복 소유 없음. PMS/DMS/SNS/Admin 차이 카드와 `/operations` 운영 기준 Preview로 1차 반영 |
| CRM DB 1차 모델 | 영업기회와 매출/원가 상세 모델 이식 | 1차 완료: `crm.crm_opportunity_m`, `crm.crm_opportunity_line_d`, `crm.crm_customer_m`, `crm.crm_customer_activity_d`, `crm.crm_quote_seller_profile_m`, `crm.crm_quote_dms_handoff_m`, `crm.crm_business_plan_m`, `crm.crm_business_plan_line_d`, `crm.crm_contract_dms_handoff_m`, `crm.crm_report_confirmation_m`, `crm.crm_cost_plan_internal_monthly_d`, `crm.crm_cost_plan_ams_vendor_wbs_r`, `crm.crm_cost_plan_ams_external_monthly_d`, `crm.crm_cost_plan_accounting_handoff_m`, `crm.crm_business_plan_performance_actual_d`, opportunity group/version key, ownerUserId 기반 담당자 매핑, 수량/단가/절사/소속/등급/원가-매출 연동 metadata, 견적 상태 metadata, 견적 DMS handoff snapshot 원장, 고객/활동 backfill 원장과 고객/활동 Workspace, 고객/활동 AI projection owner ACL snapshot과 controlled backfill endpoint, 고객/활동 API access guard/snapshot 1차와 Workspace capability 연동, 견적 공급자 표시 정보, 영업기회 담당자 공용 프로필 기반 견적 담당 연락처 표시, history trigger, seed, 생성/수정/확정/차수추가/변경이력조회 API, 고객/활동 API, CRM permission seed 추가, 계약/청구계획/청구실적 원장 foundation, DMS handoff snapshot 원장, 사업계획 preview snapshot 차수 원장 foundation, 보고 snapshot 확정 원장, 내부원가 월별 입력/확정 원장, AMS 업체-WBS 매핑과 AMS 외부원가 월별 입력/정산 확정 foundation, 확정 원가 회계·지급 handoff snapshot/실행 evidence 원장, 사업계획대비실적 직접 실적 입력 원장. 후속: 실환경 ERP/API provider 실행 결과와 운영 대조 증거 |
| 샘플 데이터 | 원천 데모 샘플을 deterministic seed로 보존 | 완료: 영업기회 6개 group/7 row/53 line과 계약 5건/44 line/35 청구계획/5 실적을 원천값 그대로 적용·DB/UI 대조 |
| 영업기회 현황 | 목록, 검색, 필터, 지표 카드 구현 | 완료: 원천 6개 최신 그룹 기준 dashboard 6건/2,156,150,000원, 검색·다중필터·정렬·선택·pagination과 desktop/mobile E2E 검증 |
| 영업기회 상세/등록 | 기본정보와 매출/원가 계산 구현 | 완료: 원천 전 필드, 담당자, 국내외/단계/등급/수금조건/Special DC, 매출·원가 5개 line 유형과 연결, 계산, 차수·확정·잠금·계약전환·삭제, 역할별 정책을 저장·재조회 및 실제 브라우저에서 검증 |
| 데모 디자인 정렬 | SSOO 공용 shell/component를 사용하되 원천 업무 UI/UX를 변경 없이 이식 | 폐쇄 원장 완료: `UX-01~17` 17/17, REF-01 동일 83개 state. 현재 작업본은 schema 2 target manifest 재capture와 `verify:crm-uiux-parity:all` fresh PASS가 필요 |
| 기능 경계 표시 | DMS 문서 산출과 PMS 인계 소유 경계를 정확히 표시 | 완료: 선택한 실제 DMS DOCX template의 변수 치환·다운로드·재열기와 견적/계약 lifecycle artifact를 실행한다. PMS 신규 프로젝트 자동 생성과 외부 회계 provider 실행처럼 원천 밖 기능은 별도 확장 경계로 유지 |
| CRM launch readiness gate | CRM 이식 완료 판정에 필요한 정적 source gate와 엄격 완료 감사 gate | strict gate 구현 완료·fresh 실행 대기: `verify:crm-launch`는 정적 계약, `verify:crm-local`은 schema 2 worktree identity에 묶인 test/build report다. `verify:crm-core-runtime`은 격리 DB/API source semantics를 실행하고 `verify:crm-current-demo`는 source/DDL, current server·CRM·Admin·DMS build fingerprint와 live PID, schema 2 local/UI evidence, 전체 runtime gate를 같은 identity로 묶어 SRC 28점·UX 17점을 산정한다. 기본 `verify:crm-migration-completion`도 이 strict gate에 위임하며 진단·bundle·개별 PASS는 완료를 대체하지 않는다. 외부 provider/보호자료는 `--require-extensions`의 별도 readiness로 유지 |

## P1 — 1차 이후

| 항목 | 내용 | 완료 기준 |
|---|---|---|
| 차수/확정 | 최신 차수, 이전 차수 조회, 확정 잠금 | 1차 완료: group/version key, 최신 차수 목록, 이전 차수 조회, 변경 이력 조회, 공용 access 기반 확정/차수 capability guard, 확정 최신 차수 기반 차수 추가, 이전 차수 수정 차단, 세부 매출/원가 metadata 복사, 계약 전환 후 확정해제/차수추가 차단. 후속: ownerId/object policy 정밀화 |
| 견적 미리보기·DOCX | 원천 견적서와 문서 생성을 SSOO/DMS 경계로 재구성 | 완료: A4 인쇄/PDF와 함께 DMS에 등록·선택한 실제 DOCX binary를 원천 변수로 치환해 다운로드하고 Word 재열기까지 검증. 견적 상태와 lifecycle evidence를 원장에 보존 |
| 계약 현황 | 계약 목록·등록·수정·삭제·확정·해제 | 완료: 원천 5개 계약 seed와 전 필드 계약 생성, 영업기회 전환, WBS, line, lifecycle, 역할 잠금, 삭제를 실제 DB/API/브라우저로 검증 |
| 청구계획 | 계약기간 기준 월별 자동 분할 | 완료: 7개월 분할의 매출·원가 합계 오차 0, 원천 35개 계획과 5개 실적, 확정 잠금 및 계약대비실적을 실제 DB/UI에서 검증. 회계 전표는 원천 밖 extension 경계 |
| 회사 정보 | 견적/계약 표시용 공급자 정보 | 완료: 공급자 CRUD, CI upload/download/remove, 견적·계약 문서 소비와 잘못된 참조 readiness 차단을 실제 브라우저로 검증 |
| PMS 인계 후보 | 계약 확정 후 실행 전달에 필요한 스냅샷 반영 | 1차 완료: `/api/crm/contracts/:id/pms-handoff-preview`와 계약 상세 PMS 인계 후보 패널이 확정/WBS/청구계획 합계 readiness, 계약 금액, 라인, 청구계획을 스냅샷으로 표시. PMS 상세 인수인계 탭은 CRM 계약 후보를 검색하고 준비 완료 preview를 `/api/projects/:id/contracts/crm-handoff-snapshot`으로 기존 프로젝트의 계약/대금/accepted handoff 스냅샷에 반영한다. PMS 프로젝트 수행 데이터 직접 생성/편집과 신규 프로젝트 자동 생성은 없음 |
| DMS 문서 패킷 | 계약서 생성 전 입력 패킷과 초안 저장 | 1차 완료: `/api/crm/contracts/:id/dms-document-preview`와 계약 상세 DMS 문서 패킷 패널이 계약 확정/WBS/청구계획/공급자 법인정보/DMS 상태 readiness, 템플릿/폴더/파일명 hint, deterministic 초안 경로, 저장된 초안 경로, 최신 handoff id/status/savedAt, 문서 변수, 첨부 후보, CRM markdown 초안부터 DMS 템플릿 검토/첨부 확인/Word 산출/PDF 저장/승인까지의 lifecycle checklist를 표시하고, DMS 기본 시스템 템플릿 `crm-contract-v1`의 active registry source path를 템플릿 검토 evidence로 사용한다. `/api/crm/contracts/:id/dms-document-draft`와 DMS 초안 저장/갱신 버튼은 준비 완료 계약의 markdown 초안을 DMS 파일 서비스에 저장한 뒤 `crm.crm_contract_dms_handoff_m`에 문서/변수/첨부/lifecycle snapshot을 남긴다. `/api/crm/contracts/:id/dms-document-lifecycle-execution`은 DMS `crm-contract-v1` 템플릿과 초안을 기반으로 export policy record, 템플릿 버전 snapshot, 템플릿 변경 검토 기록, 템플릿 변경 요청 원장, 템플릿 검토 기록, 첨부 확인 기록, 첨부 확정 원장, DOCX, PDF, 승인 기록, 승인 route policy 기록, 공용 사용자/조직 directory snapshot, 결재선 원장 동기화 기록, 다자 승인 workflow artifact를 생성하고 CRM handoff에 evidence를 반영한다. `/contracts`는 실행 결과의 export policy, 템플릿 버전, 템플릿 변경 원장, 첨부 확정 원장, 결재선 원장, 승인자 matrix를 읽기 전용 governance evidence로 표시한다. DMS 설정의 `CRM 계약 결재선`은 route policy와 required roles를 관리하고, `CRM 계약 산출 정책`은 markdown evidence와 Word/PDF artifact의 조직 scope별 산출 경로를 관리한다. |
| DMS 첨부 evidence | 공급자 CI와 청구계획 별첨 참조 경로 | 1차 완료: DMS 문서 패킷 attachment에 공급자 CI `ciStorageRef`와 `계약코드#billing-plan:n` 청구계획 evidence path를 내려주고, `ciStorageRef`는 `dms://`, DMS 상대 경로, `local://`/`nas://` storage URI로 검증해 `/contracts` DMS 문서 패킷 패널과 lifecycle/handoff snapshot에 표시한다. DMS lifecycle 실행은 첨부 확인 기록과 `attachment-finalization-ledger.md`/`dmsExecution.governance.attachmentFinalizationLedger` 확정 원장을 생성하고, `crmContractExportPolicy` 기준 조직 scope별 산출 경로 아래 evidence를 남긴다. |
| DMS 실행 evidence 수신 | DMS 산출/승인 결과를 CRM handoff snapshot에 반영 | 1차 완료: `POST /api/crm/opportunities/:id/quote-dms-document-lifecycle-execution`은 DMS quote lifecycle 실행기가 만든 템플릿 버전 snapshot, 템플릿 검토 기록, DOCX, PDF artifact evidence를 active quote handoff lifecycle step에 `completed`로 기록하고, `POST /api/crm/opportunities/:id/quote-dms-document-execution-evidence`는 외부 DMS 실행 결과의 견적 template-review/DOCX/PDF evidence path도 같은 수신 계약으로 기록한다. `POST /api/crm/contracts/:id/dms-document-execution-evidence`는 DMS가 완료한 계약 템플릿 검토/첨부/Word/PDF/승인 lifecycle step의 evidence path를 active handoff snapshot에 기록한다. `POST /api/crm/contracts/:id/dms-document-lifecycle-execution`은 DMS 서비스가 생성한 export policy record, 템플릿 버전 snapshot, 템플릿 변경 검토 기록, 템플릿 변경 요청 원장, 템플릿 검토 기록, 첨부 확인 기록, 첨부 확정 원장, DOCX, PDF, 승인 기록, 승인 route policy 기록, 공용 사용자/조직 directory snapshot, 결재선 원장 동기화 기록, 다자 승인 workflow artifact를 이 수신 계약에 연결한다. 견적 템플릿 검토 확정, CRM 계약 결재선 정책, CRM 계약 산출 정책은 DMS 설정 metadata로 보존한다 |
| CRM 홈 업무 요약 | 원천 데모 첫 화면의 전체 영업관리 스캔 흐름 | 1차 완료: `/api/crm/dashboard`와 홈 상단 요약 밴드가 영업기회 pipeline, 계약 원장 요약, 견적 후보/계약 전환/PMS 인계/DMS 문서 패킷 readiness queue, 다음 액션을 읽기 전용으로 표시. 별도 landing page나 프로젝트/문서 생성 액션 없음. 후속: 보고 drilldown과 월별/담당자별 분석 |
| 운영 기준 Preview | 원천 데모 시스템 관리 항목을 SSOO 운영 경계로 재해석 | 1차 완료: `/api/crm/operations/preview`와 `/operations`가 계정/비밀번호/프로필/권한/법인/조직/CI 파일은 공용 Admin/Auth/DMS 경계로 표시하고, 코드 후보와 사업년도 후보는 CRM 원장 read model에서 읽기 전용으로 수집. CRM 내부 계정 CRUD, 역할 편집, 코드 마스터 저장 없음 |
| CRM/DMS/Admin readiness snapshot | owner probe와 Admin summary의 상태·시각·숫자 정합성 | 완료: 공용 snapshot ID/checkedAt/expiresAt/source/reason/count/owner route, 5초 cache coalescing, 30초 expiry, settings/retry invalidation을 적용했다. Admin은 fresh owner 값을 exact pass-through하고 stale·malformed·probe/upstream failure는 `unknown/null`로 표시한다. `verify:crm-readiness-consistency`, actual server 단절·복구, desktop/mobile expiry·refresh로 BT-19를 통과했다 |
| CRM 실패 복구·비밀정보 마스킹 | 실패 원장, owner 수정, 안전 재시도, correlation, credential 비노출 | 완료: stable correlation과 owner/source link, server retryability/recovery summary, 원본 실패 보존을 적용했다. 격리 actual failure→DMS 초안 원인 수정→retry 성공→repeat 409, artifact hash 불변·duplicate/residue 0을 통과했다. 공용 response/error/log redactor와 admin/viewer/OpenAPI/UI 합성 marker audit 노출 0으로 BT-21/22를 통과했다 |
| CRM AI/RAG projection adapter | 영업기회/고객/활동 RDB 정본을 공용 AI/RAG projection으로 연결 | 진행중. 영업기회 RDB 원장, 고객/활동 원장, 고객/활동 Workspace, opportunity/customer/activity projection, 기존 opportunity row 기반 고객/활동 seed/backfill, opportunity create/update/confirm/reopen/add-version 및 customer/activity 저장 이벤트 queue hook, admin/system-override controlled customer/activity backfill endpoint, customer/activity owner-aware ACL snapshot, 고객/활동 API access guard/snapshot 1차, CRM 전용 runtime evidence gate, CRM AI/RAG provider-ready runtime report verifier, 공용 `activity` retrieval entity filter는 등록. SSOO 공통 AI/RAG provider-backed runtime 품질 검증은 확장 readiness이며, CRM DB 원장을 직접 공용 service에 노출하지 않고 `AiIndexObjectProjection`, ACL snapshot, target resolver만 등록한다 |

## P2 — 보고/실적

| 항목 | 내용 | 완료 기준 |
|---|---|---|
| 청구실적 | 계획 대비 실적 입력 | 1차 완료: `crm.crm_contract_billing_actual_d`, `/api/crm/contracts/:id/billing-actual` 조회/저장, 확정 계약 저장 제한, `/contracts` 계획 대비 실적 입력과 차이/달성률 표시 |
| 계약대비실적 | 월별 계획/실적 표 | 1차 완료: `/api/crm/contracts/monthly-performance`, `/contract-performance` 메뉴, 사업년도/사업구분/계열/국내외/검색 필터, 월별 계획/실적/차이와 합계 표시 |
| 보고 지표 | 사업구분/담당자/WBS별 요약 | 1차 완료: `/api/crm/reports/preview`와 `/reports`가 영업기회 pipeline, 확정 계약 월별 계획/실적 read model을 사업년도/사업구분/계열/국내외/검색 필터 기준으로 집계하고 월별 trend, 사업구분/담당자/WBS drilldown, 확인 항목을 표시한다. `POST /crm/reports/confirm`과 `/crm/reports/confirmations/:id/reopen`은 현재 Preview를 `crm.crm_report_confirmation_m` CRM 보고 snapshot 원장으로 확정/해제한다. 회계 전표 생성, PMS 수행 KPI 편집, DMS 문서 저장 확정은 수행하지 않음 |

## P3 — 사업관리 확장

| 항목 | 내용 | 완료 기준 |
|---|---|---|
| 사업계획 | 3개년 계획, 월별/연간 입력 | 완료: 원천과 같은 3개년 source grid, 월별 계획 매출·외부원가, 미래연도 연간값, 행 CRUD, TSV 붙여넣기, 차수 생성·이월·확정·해제·삭제를 실제 API/브라우저로 검증. 회계 provider는 원천 밖 extension 경계 |
| 사업계획대비실적 | 확정 계획과 계약 실적 비교 | 1차 완료: `/api/crm/business-plan/performance-preview`와 `/business-plan-performance`가 확정 사업계획 차수가 있으면 해당 원장 line의 월별 입력값을 우선 사용하고 미입력 line은 연간 계획 매출을 월 균등 배분해 확정 계약 월별 실적과 비교한다. 확정 차수가 없으면 영업기회 pipeline 후보, 확정 계약 월별 청구계획, 확정 계약 월별 청구실적 fallback을 계획/실적/차이 구조로 표시하며, 확정 내부원가/AMS 원가는 별도 `confirmed-cost` source row로 합산한다. 같은 WBS에 정산 확정된 AMS 외부원가가 있으면 계약 성과 외부원가 계획/실적을 제외해 중복을 조정하고 summary/UI에 조정 WBS 수와 제외 금액을 표시한다. `/api/crm/business-plan/performance-actual/monthly`와 직접 실적 입력 패널은 12개월 매출·원가 실적을 `crm.crm_business_plan_performance_actual_d`에 저장해 `manual-actual` source row로 합산한다. 확정 원가의 CRM 회계·지급 handoff snapshot, demo 실행 evidence, provider-gated 외부 API 실행 evidence는 원가/AMS 화면에서 관리하고, 실환경 ERP/API 완료 판정은 provider 실행 결과와 운영 대조 증거가 필요하다 |
| 내부원가 | 5개 항목 계획/실적/차이 | 완료: 원천 고정 5개 항목의 12개월 계획·실적·차이, TSV 붙여넣기, 저장·확정·해제 잠금을 실제 API/브라우저로 검증. 외부 회계 provider는 원천 밖 extension 경계 |
| AMS 업체 | 업체 master와 WBS 매핑 | 완료: 업체 master CRUD, 다중 WBS, 업체×WBS mapping과 readiness를 실제 API/브라우저로 검증 |
| AMS 외부원가 | 업체×WBS 월별 계획/실적 | 완료: 업체×WBS별 12개월 계획·실적·차이, TSV 붙여넣기, 저장·정산확정·해제 및 사업계획대비실적 반영을 실제 API/브라우저로 검증. 외부 회계 provider 실행은 별도 extension readiness |

## 런칭 리스크

1. 현재 저장소에는 CRM 1차 골격과 홈 업무 요약, opportunity/customer/activity RDB read/write model, 고객/활동 Workspace, ownerUserId 기반 담당자 매핑, 견적/계약/청구/보고/사업계획/원가/AMS 주요 원장 흐름, PMS 기존 프로젝트 스냅샷 반영, DMS markdown 초안/handoff/lifecycle evidence 경계, CRM demo 회계·지급 실행 evidence, provider-gated 외부 회계·지급 API 실행 mode, 운영 기준 Preview가 들어와 있다. 기본 런칭 리스크는 사용자 제공 데모 실행 소스와 DB 스키마의 SSOO CRM 이식 흐름이 로컬에서 재현되는지이며, 실환경 ERP/API provider 실행 결과와 운영 대조 증거는 production cutover 확장 readiness로 분리한다.
2. seed 기반 고객/담당/금액/손익 값이 실제 운영 KPI처럼 보이면 런칭 품질과 신뢰를 해친다.
3. 원천 데모를 그대로 복사하거나 내부 경계 설명을 제품 화면의 주 콘텐츠처럼 노출하면 SSOO 디자인 일관성이 깨진다.
4. 계약/청구/매출/원가는 CRM 원장성 영역으로 두고, PMS는 실행 수행과 읽기용 인계 스냅샷만 소비해야 한다. 이 경계가 흐려지면 중복 구현 위험이 크다.
5. 계정/권한/법인/조직 관리는 CRM 내부가 아니라 공용 Admin 영역에서 관리되어야 한다. 임시 CRM 전용 관리 화면은 런칭 리스크다.
6. DMS 문서 패킷은 CRM 계약 원장 기반 preview와 markdown 초안 저장, 첨부 evidence path 표시, DMS 실행 evidence 수신, DMS lifecycle artifact 실행 1차와 export policy record/템플릿 버전/템플릿 변경 검토/템플릿 변경 요청 원장/첨부 확정 원장/승인 route policy/공용 사용자·조직 directory snapshot/결재선 원장 동기화 기록/다자 승인 workflow evidence까지만 허용한다. 결재선 정책과 산출 정책 편집을 CRM 내부 소유로 확장하면 DMS와 중복 설계 위험이 있다.
7. Docker/디스크 압박 이력이 있으므로 각 구현 slice 후 빌드와 Docker 반영, 용량 확인을 같이 해야 한다.
8. CRM AI/RAG adapter는 opportunity/customer/activity projection baseline, 저장 이벤트 queue hook, controlled customer/activity backfill, owner-aware ACL snapshot, 고객/활동 API access guard/snapshot 1차, runtime evidence gate와 `verify:crm-ai-rag-runtime-report` report verifier가 들어갔다. 실제 RAG 품질과 provider-backed retrieval 품질은 SSOO 공통 AI/RAG embedding provider가 연결된 환경에서 확장 readiness로 판단하며, 기본 CRM 데모 이식 완료의 blocker가 아니다. 고객/활동 seed/backfill은 원장 source를 만들기 위한 1차이며, 샘플 데이터를 운영 원장처럼 보이게 하면 안 된다.

## Changelog

2026-09-22: 사용자 승인으로 운영 기준년도 표시·재조회 유지 문제 해결. 실제 브라우저 기준년도 27건 검증 통과, 운영 후속 승인 대기 1→0건.

2026-09-22: 운영·시스템 설정·견적 설정·회사 정보의 폭/배치 보완, 배치 32건·입력 유지 24건·표 이동 15건 검증. 운영 기준년도 표시 불일치 별도 승인 대기 1건.

2026-09-22: 사용자 후속 승인으로 고객/활동 조회조건 유지 문제 해결. 조회조건 28건·기존 입력 유지·표 이동 검증 통과, 고객 후속 승인 대기 1→0건.

2026-09-22: 고객/활동 화면 공용 폭·배치 및 작은 화면 입력·버튼 잘림 보완. 배치/입력 유지/표 이동/로딩·빈 안내 검증 통과. 유형·정렬 조회조건 표시 불일치 1건 별도 승인 대기.

2026-09-22: 사용자 후속 승인으로 원가 종합 조회의 선택조건 표시·재조회 유지 문제 해결. 조회조건/기존 입력/표 회귀 검증 통과, 원가 후속 승인 대기 1→0건.

2026-09-22: 원가 네 화면 공용 폭/여백·카드/입력 배치, 작은 화면 업체 추가 및 표 고정 열 가림 보완. 원가 조회조건 표시 불일치 1건 별도 승인 대기.

2026-09-22: 사용자 후속 승인으로 보고 조회조건 표시·재조회 유지 문제 해결. 직접 접속/재조회/새로고침·빈 결과·크기 전환 검증, 별도 승인 대기 1→0건.

2026-09-22: 승인된 보고 화면의 폭·여백·카드 배치 보완. 기존 조회조건 표시 불일치 1건 재현, 추가 승인 대기로 구분. 보고 확정·해제 계약 유지.

2026-09-22: 승인된 사업계획·실적 종합 조회의 공용 폭/여백, 카드·직접 입력·차수 이름·긴 표 상태 안내 배치 보완. 기존 등록·월별 화면과 저장 계약 유지.

2026-09-22: 승인된 사업계획 등록·월별 실적 본문 폭/여백 및 긴 표의 빈/로딩 안내 위치 보완. Preview 화면과 저장 계약은 유지.

2026-09-21: 계약 현황·등록·청구 목록/입력·원장에 공용 폭/여백 적용. 작은 화면의 청구 표·원장 하단 편집 영역의 최소 폭 확장을 보완하고 기존 동작을 보존.

2026-09-21: 사용자 승인 후 영업기회 다섯 화면의 본문 폭/여백을 공용 기준에 연결. 대시보드·양식·계약서 생성과 넓은 표/상세 화면을 구분하고, 다른 CRM 화면을 잔여로 유지.

2026-09-21: 사용자 순차 적용 승인 후 영업기회 작업공간 표·상세 높이, 단일 표 스크롤, 페이지 이동 줄바꿈 보완 및 새 빌드·브라우저 검증. 기능·표 항목·조회/저장 계약·DMS 유지. 전체 UI 완료율로 환산하지 않는다.

2026-09-17: 승인-01 사용자 선택 1번 완료. [계약 생성 기록 처리 결과](../../common/explanation/architecture/2026-09-17-contract-records-handoff.md) 기준 생성 기록 의미 보정·기존 계약 보존·실제 결재 미구현 구분 및 회귀 통과.

| 날짜 | 변경 내용 |
|------|----------|
| 2026-09-21 | 승인된 계약대비실적 월별·전체 본문 폭/여백과 중간 화면 요약 카드 배치 보완. 조회·월별 표·집계 계약 보존. 현재 증거는 `crm-performance-width-20260921/results.md`, 다음은 사업계획 등록·월별 실적. |
| 2026-08-25 | fresh v5 전수 capture가 UX-12 중간까지 통과한 뒤 자동화의 공용 알림 요청 누적으로 전역 분당 600회 제한 429를 검출해 fail-closed 됐다. 제품 throttle과 429 차단은 유지하고 1초 상태 간격·20상태마다 61초 냉각 및 manifest pacing 기록을 추가했으며 v5 격리 DB·파일·포트는 residue 0으로 파기했다 |
| 2026-08-25 | fresh v4 core 선행 실행이 계약 fixture의 외부원가 line 합계 1억원과 청구계획 합계 6천만원 불일치를 검출했다. 월별 5천만원×2로 교정한 재실행에서 core 10개 기능군과 identity·cleanup을 합친 11/11이 PASS했으며 최종 strict 전수 실행 전 fixture를 완주했다 |
| 2026-08-25 | fresh v3에서 runtime manifest 4 PID와 UI/UX 17/17·83/83, core 외 모든 strict runtime gate를 통과했다. 실제 `crm-opp-*` 생성 ID를 uppercase로 오판한 core fixture 때문에 29/45로 fail-closed 했고 v3도 residue 0으로 파기한 뒤 opportunity/contract ID 기대값을 API 계약에 맞췄다 |
| 2026-08-24 | fresh v2에서 UI/UX 17/17·83/83 capture를 확인했으나 runtime manifest 병렬 갱신 경쟁과 검증 로그인 rate limit 소진으로 strict 45/45는 거부했다. 네 process PID의 잠금·원자 manifest 갱신, DTO-valid invalid credential, production throttle window 계약을 추가하고 격리 DB·파일·포트를 residue 0으로 파기했다 |
| 2026-08-24 | `verify:crm-core-runtime`과 `verify:crm-current-demo`를 추가하고 runtime manifest schema 2에 같은 worktree identity, current server/CRM/Admin/DMS build fingerprint와 live PID를 결합했다. 기본 migration completion은 strict gate에 위임했으며 fresh 실행 전 current 점수는 미확정이다 |
| 2026-08-24 | 기존 45/45 산정의 직접 검증 범위를 감사해 폐쇄 원장과 current revision proof를 분리했다. tracked/untracked 실제 파일내용 worktree identity와 schema 2 local/UI evidence를 추가했으며 같은 identity의 fresh runtime report 전에는 현재 45/45 선언을 금지했다 |
| 2026-08-24 | S15 browser evidence를 schema 3으로 강화해 수동 surface assertion을 금지하고, API CRM/DMS readiness snapshot identity·0 blocker/degraded를 실제 CRM/Admin/DMS snapshot 문구와 결합했다. 두 browser run의 seller CI 요청과 preview/print 접근 가능한 CI image도 verifier가 직접 판정하며 관련 음성 fixture를 추가했다 |
| 2026-08-24 | S15 browser evidence를 schema 2로 강화했다. evidence root 밖 absolute/`..`/symlink와 파일 재사용을 거부하고, PNG IHDR 크기, CRM/Admin/DMS production origin, quote subtotal-discount-total 산식과 snapshot text를 검증한다. PDF는 parser로, DOCX는 ZIP/XML로 실제 재열어 법인·고객·영업기회·담당자·금액과 placeholder 0을 직접 산출하며 이에 대한 음성 fixture를 추가했다 |
| 2026-08-24 | live API의 `PASS_LIVE_API_READY`를 최종 PASS와 분리하고 Playwright CLI fresh desktop/mobile 12 surface, 고유 snapshot/PNG, 실패·overflow 0, 견적 PDF·DMS DOCX/PDF binary/hash를 결합하는 `verify:crm-go-live:final`과 fail-closed self-test를 추가했다 |
| 2026-08-24 | S15 승인 법인정보·CI packet과 production env/release/API/readiness를 fail-closed로 검증하는 `verify:crm-go-live` 및 credential-free evidence 계약을 추가했다. 실제 EXT-01/02와 production browser·견적/DMS artifact 증거는 제공 전이므로 Goal은 active다 |
| 2026-08-19 | CRM 실패 원장과 owner/source recovery path를 stable correlation로 연결하고 actual 실패→수정→retry·repeat 409·artifact 불변·residue 0을 통과했다. 합성 secret의 response/error/log/viewer/OpenAPI/UI leak 0으로 OPS-06/09/12와 BT-21/22를 완료 처리했다 |
| 2026-08-19 | CRM/DMS owner readiness와 Admin bridge를 공용 snapshot identity와 5초 refresh/30초 expiry로 정합화했다. stale·malformed·probe/upstream failure는 `unknown/null`이며 actual API/browser 단절·복구를 포함한 BT-19를 통과해 OPS-04/13을 완료 처리했다 |
| 2026-08-11 | 영업기회 최신 미확정 차수 삭제를 실제 DB/browser에서 검증. 확정 1차→2차 생성→2차 삭제→1차 자동 재선택→확정해제→정리 삭제 요청이 모두 성공했고 콘솔 오류 0건을 확인. 견적 A4 인쇄/PDF 한글 산출을 검증하고, 브라우저 생성에서 발견한 `paymentTermCode`/Special DC upsert DTO 누락을 수정·테스트 |
| 2026-07-13 | CRM 데모 이식 완료 기준을 사용자 제공 데모 실행 소스와 DB 스키마의 SSOO CRM 이식/로컬 재현성으로 재정렬했다. 기본 `verify:crm-migration-completion`은 정적 readiness와 `verify:crm-local`만 blocking으로 보고, 외부 ERP/API provider execution report, CRM AI/RAG provider-ready runtime report, 보호 발표자료 reflection report와 반영 marker 제거는 `--require-extensions` 확장 readiness에서만 blocking으로 판단한다 |
| 2026-07-10 | `inspect:crm-migration-inputs`를 추가해 completion env/report path, `.runtime` Office 후보, DMS sidecar source metadata를 진단한다. 진단 JSON은 `protectedSourceCandidateSummary`로 같은 SHA-256 후보를 중복 그룹화하고 `requiredExternalInputs`로 남은 외부 입력 요청을 구조화한다. RMS 보호 Office 후보는 경로 복원 단서일 뿐 완료 증거가 아니다 |
| 2026-07-10 | `prepare:crm-migration-evidence`를 추가해 completion evidence report 3종, `crm-migration-input-inspection` JSON/Markdown, `crm-migration-required-external-inputs` JSON/Markdown request packet, env template, README, manifest를 한 번에 생성한다. bundle self-test는 draft report가 verifier를 통과하지 못하고 input inspection이 diagnostic-only, required inputs가 request-only로 남는지 확인한다 |
| 2026-07-10 | `verify:crm-local`을 추가해 `verify:crm-launch`, CRM 관련 server Jest suite, DMS/PMS CRM boundary test, `pnpm build:web-crm` production build를 한 번에 실행한다. `verify:crm-migration-completion`은 이 로컬 build/test gate도 완료 판정에 포함한다 |
| 2026-07-10 | `prepare:crm-migration-evidence` manifest와 README에 `verify:crm-local -- --report-path=crm-local-verification-report.json` local verification evidence 생성 단계를 추가했다 |
| 2026-07-10 | `crm-migration-required-external-inputs` request packet의 각 항목에 completion audit의 `completionCheckId`와 자료별 `verificationCommand`를 포함해 외부 provider/protected-source 증거 수집 후 어떤 gate를 통과시켜야 하는지 고정했다 |
| 2026-07-10 | `verify:crm-migration-evidence-bundle`을 추가해 prepared bundle의 로컬 검증 report와 외부 evidence report 3종이 각 verifier를 통과하는지 제출 전 확인한다. 이 검증은 bundle 파일 상태만 확인하며 `verify:crm-migration-completion`을 대체하지 않는다 |
| 2026-07-10 | `prepare:crm-migration-evidence -- --local-verification-report-path=<report.json>` 옵션을 추가해 통과한 `verify:crm-local` JSON을 bundle 내부 `crm-local-verification-report.json`으로 복사하고 manifest에 포함 여부를 기록한다 |
| 2026-07-10 | `prepare:crm-local-evidence-bundle`을 추가해 로컬 검증 report 생성 또는 기존 report 복사, migration evidence bundle 준비, 선택적으로 제공된 `--accounting-payment-report-path`, `--crm-ai-rag-report-path`, `--protected-source-reflection-report-path` passed report 적용, bundle verifier 실행을 한 번에 수행하고 남은 외부 evidence report가 draft뿐이면 `local-ready-pending-external` 상태로 기록한다 |
| 2026-07-13 | CRM completion report verifier와 `verify:crm-migration-completion`의 확장 readiness 검사가 synthetic/self-test evidence marker를 기본 거부하도록 강화해 verifier self-test용 JSON이 provider/protected-source 증거로 오인되지 않게 했다 |
| 2026-07-10 | `verify:crm-migration-completion` 실패 출력과 JSON report에 diagnostic-only input inspection을 포함해 로컬 후보 경로와 남은 외부 입력 요청을 같은 audit evidence로 남긴다. 이 진단은 완료 증거가 아니다 |
| 2026-07-10 | CRM 완료 evidence report 3종에 `:template` 스크립트를 추가해 draft JSON 작성 양식을 출력한다. template은 `status: draft`라 그대로 완료 증거가 될 수 없고 실제 provider/protected-source 증거로 채워야 한다 |
| 2026-07-10 | `verify:crm-launch` 문서 assertion을 완료 전 미완료 문구 강제에서 완료 판정 evidence 계약 확인으로 조정했다. 실제 완료 여부는 `verify:crm-migration-completion`의 report evidence와 marker 제거가 판단한다 |
| 2026-07-10 | `verify:crm-protected-source-reflection-report`를 추가해 보호된 CRM 발표자료 해제본 SHA-256, 텍스트 추출, 문서 반영 대상, 미매핑 0건을 검증한다. 이 report는 보호자료가 실제 제공되고 별도 승인된 확장 readiness에서만 blocking으로 사용한다 |
| 2026-07-10 | `verify:crm-ai-rag-runtime-report`를 추가해 CRM AI/RAG provider-ready runtime report의 opportunity/customer/activity indexed object, embedding, retrieval audit evidence를 검증한다. 이 report는 SSOO 공통 AI/RAG embedding provider가 연결된 환경의 확장 readiness에서만 blocking으로 사용한다 |
| 2026-07-10 | `verify:crm-accounting-payment-provider-report`를 추가해 외부 회계·지급 `external-api` 실행 report의 전표, 지급 요청, 지급 실행, 외부 시스템 sync evidence와 운영 대조 `matched`/`reconciled` 상태를 검증한다. 이 report는 외부 ERP/API 연계가 별도 승인된 확장 readiness에서만 blocking으로 사용한다 |
| 2026-07-10 | `verify:crm-migration-completion` 완료 감사 gate를 추가해 CRM 정적 readiness와 로컬 build/test gate를 기본 완료 판정으로 묶고, 외부 회계·지급 provider-ready precheck, provider execution report, CRM AI/RAG provider-ready precheck/runtime report, 보호 발표자료 reflection report와 반영 marker 제거는 명시적 확장 readiness로 분리했다 |
| 2026-07-10 | `verify:crm-accounting-payment-provider:ready-precheck`를 추가해 CRM 회계·지급 외부 ERP/API URL/endpoint 환경을 별도 gate로 점검한다. 이 precheck는 provider 환경 readiness만 확인하며 실제 전표·지급 반영과 운영 대조 증거를 대체하지 않는다 |
| 2026-07-10 | `verify:crm-launch` 정적 readiness gate를 추가. CRM 웹 surface, Next API proxy, 서버 모듈/테스트, CRM DB migration/seed/trigger, PMS/DMS 경계, 완료 판정 evidence 계약 문서화를 함께 점검하되 실제 외부 ERP/API, SSOO 공통 AI/RAG provider-ready runtime artifact, 보호된 발표자료 반영은 완료로 보지 않는다 |
| 2026-07-10 | CRM 원가/AMS 회계·지급 실행에 provider-gated 외부 ERP/API mode를 추가. `POST /crm/cost-plan/accounting-payment-handoffs/:id/execute`는 기본 `demo` mode를 유지하고 `mode: external-api`와 provider URL 설정 시 외부 API 응답의 전표/지급/sync evidence를 handoff snapshot에 기록한다. 실환경 ERP/API 완료 판정은 provider 실행 결과와 운영 대조 증거가 필요하다 |
| 2026-07-10 | DMS 설정에 `CRM 계약 결재선` 정책 편집 UI를 추가. `system.crmContractApprovalRoute`가 route key/name, policy version, organization scope, required roles를 저장하고 DMS 계약 lifecycle 실행이 이 설정으로 승인 route/승인자 matrix/결재선 원장 evidence를 생성한다 |
| 2026-07-10 | DMS 설정 관리자 템플릿 목록에 `crm-quote-v1` 검토 확정 UI를 추가. `POST /dms/templates/:id/review-confirmation`과 `/api/templates/:id/review-confirmation`이 템플릿 metadata `reviewConfirmation`에 확정 상태/확정자/확정일을 기록한다 |
| 2026-07-10 | CRM 견적 DMS lifecycle artifact 실행 1차를 추가. `POST /crm/opportunities/:id/quote-dms-document-lifecycle-execution`은 DMS quote lifecycle 실행기로 template-version/template-review record와 DOCX/PDF artifact를 만들고 active `crm.crm_quote_dms_handoff_m` lifecycle snapshot에 evidence를 기록한다. 템플릿 검토 확정 상태는 DMS 설정 metadata로 관리한다 |
| 2026-07-10 | CRM 견적 DMS lifecycle evidence 수신 계약을 추가. `POST /crm/opportunities/:id/quote-dms-document-execution-evidence`는 DMS가 만든 template-review, DOCX, PDF evidence path를 active `crm.crm_quote_dms_handoff_m` lifecycle snapshot에 `completed`로 기록하고 `/opportunities` 견적 패널이 상태/evidence를 표시한다 |
| 2026-07-10 | DMS 기본 시스템 템플릿 registry에 `crm-quote-v1` 견적서 markdown 템플릿을 추가하고, CRM 견적 preview가 active template 이름/상태/source path를 DMS 견적 초안 패널에 표시하도록 연결. 이 템플릿은 DMS quote lifecycle artifact 실행의 입력과 DMS 설정 검토 확정 대상으로 재사용한다 |
| 2026-07-10 | CRM 견적 DMS markdown 초안 handoff를 추가. `POST /crm/opportunities/:id/quote-dms-document-draft`, `crm.crm_quote_dms_handoff_m`, `/opportunities` DMS 견적 초안 패널을 연결해 준비 완료 견적 preview를 DMS markdown 초안으로 저장하고 최신 handoff/saved path/lifecycle을 표시한다. CRM 직접 Word/PDF 생성은 수행하지 않는다 |
| 2026-07-10 | CRM 계약 DMS 산출 정책 UI를 추가. DMS 설정의 `CRM 계약 산출 정책`이 `system.crmContractExportPolicy`를 저장하고, DMS lifecycle 실행은 `export-policy.md`와 `dmsExecution.governance.exportPolicy`를 생성해 markdown evidence와 Word/PDF artifact를 조직 scope별 경로로 산출한다 |
| 2026-07-10 | CRM 계약 DMS 문서 패킷의 공급자 CI 참조 검증을 추가. `ciStorageRef`를 DMS working tree 또는 storage adapter 참조로 확인하고, `/contracts` 첨부 카드가 `referenceStatus`와 사유를 표시하며 누락/잘못된 참조는 DMS 초안 readiness를 차단한다 |
| 2026-07-10 | CRM 계약 DMS governance evidence UI 표시를 추가. `/contracts` DMS 문서 패킷 패널이 lifecycle 실행 후 `dmsExecution.governance`의 템플릿 버전, 템플릿 변경 원장, 첨부 확정 원장, 결재선 원장, 승인자 matrix를 읽기 전용 evidence로 표시한다 |
| 2026-07-09 | CRM 계약 DMS attachment finalization ledger evidence를 추가. DMS `POST /dms/crm-contract-lifecycle/executions`가 CRM handoff의 공급자 CI/청구계획 별첨 evidence를 `attachment-finalization-ledger.md`와 `dmsExecution.governance.attachmentFinalizationLedger`에 확정 원장으로 보존한다 |
| 2026-07-09 | CRM 계약 DMS approval route ledger sync evidence를 추가. DMS `POST /dms/crm-contract-lifecycle/executions`가 승인 route policy와 다자 승인 workflow를 `approval-route-ledger.md`와 `dmsExecution.governance.approvalRouteLedger`에 동기화하고 directory sync status와 resolved actor 수를 남긴다 |
| 2026-07-09 | CRM 계약 DMS template change request ledger evidence를 추가. DMS `POST /dms/crm-contract-lifecycle/executions`가 active 템플릿 재사용 판단을 `template-change-request-ledger.md`와 `dmsExecution.governance.templateChangeRequestLedger`에 남기며, 변경 요청이 필요 없으면 `closed-without-change` entry로 닫는다 |
| 2026-07-09 | CRM 계약 DMS approval route에 공용 사용자/조직 directory snapshot evidence를 추가. DMS `POST /dms/crm-contract-lifecycle/executions`가 `directorySyncStatus`, `directorySource`, `directorySyncedAt`, `resolvedActors`를 `dmsExecution.governance.approvalRoute`와 `approval-route.md`에 남긴다 |
| 2026-07-09 | CRM 계약 DMS lifecycle route/template governance evidence를 추가. DMS `POST /dms/crm-contract-lifecycle/executions`가 `template-change-review.md`와 `approval-route.md` artifact를 추가 생성하고 CRM `dmsExecution.governance`가 `templateChangeReview`와 `approvalRoute`를 노출한다 |
| 2026-07-09 | CRM 계약 DMS lifecycle governance evidence를 추가. DMS `POST /dms/crm-contract-lifecycle/executions`가 `template-version.md`와 `approval-workflow.md` artifact를 생성하고 CRM `dmsExecution.governance`로 active 템플릿 버전 snapshot과 다자 승인 matrix를 노출한다 |
| 2026-07-09 | CRM 원가/AMS 회계·지급 데모 실행 endpoint를 추가. `POST /crm/cost-plan/accounting-payment-handoffs/:id/execute`가 active handoff snapshot의 확정 line으로 전표, 지급 요청, 지급 실행, 외부 동기화 demo artifact evidence를 생성하고 active handoff snapshot에 기록한다. 실제 외부 ERP/API 반영은 후속 |
| 2026-07-09 | CRM 계약 DMS lifecycle artifact 실행 1차를 추가. `POST /crm/contracts/:id/dms-document-lifecycle-execution`이 DMS `POST /dms/crm-contract-lifecycle/executions`를 통해 템플릿 검토 기록, 첨부 확인 기록, DOCX, PDF, 승인 기록 artifact를 만들고 active handoff snapshot에 evidence를 반영한다. 실제 외부 ERP/API 반영은 후속 |
| 2026-07-09 | CRM 원가/AMS 회계·지급 실행 evidence 수신 계약을 추가. 외부 회계·지급 시스템이 만든 전표/지급 evidence path를 `POST /crm/cost-plan/accounting-payment-handoffs/:id/execution-evidence`로 active handoff snapshot에 기록하고, 이전 active row는 `replaced`로 남긴다. 실제 외부 ERP/API 반영은 후속 |
| 2026-07-09 | CRM 계약 DMS lifecycle 실행 evidence 수신 계약을 추가. DMS가 생성한 Word/PDF/승인 evidence path를 active handoff snapshot에 `completed` step으로 기록하고 preview reload 시 유지한다 |
| 2026-07-09 | CRM 계약 DMS 문서 패킷의 공급자 CI `ciStorageRef`와 청구계획 별첨 후보를 첨부 evidence path로 표시하고 lifecycle/handoff snapshot에 남기도록 보강. 해당 evidence는 DMS lifecycle 실행의 첨부 확정 원장으로 보존한다 |
| 2026-07-09 | DMS 기본 시스템 템플릿에 `crm-contract-v1` 계약서 markdown 템플릿을 추가하고, CRM 계약 DMS preview가 DMS TemplateService의 active 템플릿 source path를 `DMS 템플릿 검토` lifecycle evidence로 표시하도록 연결. 템플릿 변경 승인과 조직 승인 라우팅은 후속 |
| 2026-07-09 | CRM 계약 DMS handoff에 문서 lifecycle checklist를 추가. preview와 `/contracts`가 CRM markdown 초안, DMS 템플릿 검토, 첨부 확인, Word 산출, PDF 저장, 승인 단계를 상태/증거와 함께 표시하고, markdown 초안과 handoff snapshot에 같은 lifecycle evidence를 남긴다. 실제 DMS 템플릿 검토/첨부/Word·PDF export/승인은 후속 |
| 2026-07-09 | CRM AI/RAG runtime evidence gate를 추가해 `verify:crm-ai-rag-runtime*`가 opportunity/customer/activity API 선택, opportunity 공용 job queue, customer/activity controlled backfill, common AI object/chunk/ACL/index state/retrieval audit를 검증하도록 연결. 공용 검색 entity type에 `activity`를 추가했으며, SSOO 공통 AI/RAG provider-backed runtime 품질 검증은 확장 readiness로 분리한다 |
| 2026-07-09 | CRM 계약 DMS 초안 저장 후 `crm.crm_contract_dms_handoff_m` handoff snapshot 원장을 남기도록 보강. `/crm/contracts/:id/dms-document-preview`는 최신 handoff id/status/savedAt과 저장 경로를 재조회하며, 문서/변수/첨부 snapshot은 CRM handoff evidence로만 남기고 템플릿 검토/첨부/Word·PDF/승인은 DMS 후속으로 유지 |
| 2026-07-09 | CRM 보고 Preview 확정 snapshot 원장을 추가해 `POST /crm/reports/confirm`, `POST /crm/reports/confirmations/:id/reopen`, `crm.crm_report_confirmation_m`, `/reports` 최신 확정 상태/확정/해제 버튼을 연결. 회계 전표, PMS 수행 KPI, DMS 문서 저장 확정은 후속 |
| 2026-07-09 | CRM 사업계획대비실적에 직접 실적 입력을 추가해 `POST /crm/business-plan/performance-actual/monthly`, `crm.crm_business_plan_performance_actual_d`, `/business-plan-performance` 직접 입력 패널, `manual-actual` source row 합산을 연결. 계약/원가/회계 정본을 덮어쓰지 않으며 회계/지급 반영은 후속 |
| 2026-07-09 | CRM 사업계획대비실적 Preview가 확정 AMS 외부원가와 같은 WBS의 계약 성과 외부원가를 중복 계산하지 않도록 조정. 같은 WBS에 정산 확정 AMS row가 있으면 계약 row의 외부원가 계획/실적을 제외하고 summary/UI에 조정 WBS 수와 제외 금액을 표시. 이 중복 조정 slice 당시에는 회계/지급 반영과 직접 실적 입력 write UI를 후속으로 유지 |
| 2026-07-09 | CRM 계약 DMS 문서 패킷을 DMS markdown 초안 저장까지 확장해 `POST /crm/contracts/:id/dms-document-draft`, DMS `FileCrudService.write`, 계약 `dms_link_status_code='draft-created'`, `/contracts` 저장/갱신 버튼과 재조회 가능한 저장 경로 표시를 연결. Word/PDF 산출, 템플릿 검토/첨부/승인은 후속 |
| 2026-07-08 | CRM 사업계획대비실적 Preview가 확정 내부원가/AMS 외부원가 입력을 별도 `confirmed-cost` source row로 읽어 계획/실적 원가와 손익 차이에 합산하도록 보강. 회계/지급 반영과 계약 외부원가 중복 조정은 후속 |
| 2026-07-08 | CRM 원가/AMS Preview에 AMS 외부원가 월별 입력 정산 확정/해제를 추가해 `POST /crm/cost-plan/ams/external-cost/monthly/:id/confirm`, `/reopen`, `crm.crm_cost_plan_ams_external_monthly_d.status_code/confirmed/confirmed_at`, `/cost-plan` AMS 정산 확정 버튼과 잠금 상태를 연결. 회계 전표/지급 정산 연계는 후속 |
| 2026-07-08 | CRM 원가/AMS Preview에 내부원가 월별 입력 확정/해제를 추가해 `POST /crm/cost-plan/internal-cost/monthly/:id/confirm`, `/reopen`, `crm.crm_cost_plan_internal_monthly_d.status_code/confirmed/confirmed_at`, `/cost-plan` 확정 버튼과 잠금 상태를 연결. 이 내부원가 slice 당시에는 AMS 정산 확정과 사업계획/회계 연동을 후속으로 유지 |
| 2026-07-08 | CRM 원가/AMS Preview에 AMS 외부원가 월별 계획/실적 입력을 추가해 `POST /crm/cost-plan/ams/external-cost/monthly`, `crm.crm_cost_plan_ams_external_monthly_d`, `/cost-plan` AMS 외부원가 입력 패널을 연결. 이 입력 slice 당시에는 내부원가 확정과 AMS 정산 확정을 후속으로 유지 |
| 2026-07-08 | CRM 원가/AMS Preview에 AMS 업체-WBS 매핑 저장을 추가해 `POST /crm/cost-plan/ams/vendor-wbs`, `crm.crm_cost_plan_ams_vendor_wbs_r`, `/cost-plan` 업체 매핑 패널을 연결. 확정 계약 WBS는 저장된 업체 매핑이 있어야 AMS ready로 계산하며, 이 매핑 slice 당시에는 내부원가 확정과 AMS 외부원가 정산 확정을 후속으로 유지 |
| 2026-07-08 | CRM 원가/AMS Preview에 내부원가 월별 계획/실적 입력을 추가해 `POST /crm/cost-plan/internal-cost/monthly`, `crm.crm_cost_plan_internal_monthly_d`, `/cost-plan` 월별 입력 패널을 연결. 내부원가 확정과 AMS 업체-WBS 매핑/외부원가 월별 입력은 당시 후속 |
| 2026-07-08 | CRM 사업계획 draft line 월별 계획 매출 직접 입력을 추가해 `POST /crm/business-plan/plans/:id/lines/:lineId/monthly-plan`과 `/business-plan` 차수 패널에서 12개월 계획 매출을 저장하고, 확정 사업계획대비실적은 월별 입력값을 우선 사용하도록 변경. 이 계획 입력 slice 당시에는 실적 직접 편집과 내부원가 확정/AMS 정산 확정을 후속으로 유지 |
| 2026-07-08 | PMS 프로젝트 상세 인수인계 탭에서 준비 완료 CRM 계약 인계 preview를 기존 PMS 프로젝트의 계약/대금/accepted handoff 스냅샷으로 명시 반영하는 `POST /api/projects/:id/contracts/crm-handoff-snapshot` 흐름을 추가. CRM 계약 원장 소유권, PMS 신규 프로젝트 자동 생성, 계약/청구 직접 편집은 제외 |
| 2026-07-08 | CRM 사업계획 전년 이월을 추가해 `POST /api/crm/business-plan/plans/carry-forward`와 `/business-plan` 차수 패널에서 전년도 확정 차수의 겹치는 연도 line을 새 기준년도 draft로 이월하고 현재 preview 신규 후보를 보강. 이 시점에는 내부원가 확정/AMS 정산 확정을 후속으로 유지 |
| 2026-07-08 | CRM 사업계획대비실적 preview가 확정 사업계획 차수 원장을 기준으로 연간 계획 매출을 월 균등 배분하고 확정 계약 월별 실적과 비교하도록 보강. 확정 차수가 없을 때는 기존 pipeline/계약 청구계획 fallback을 유지하며, 이 시점에는 계획/실적 직접 편집과 내부원가/AMS 정산 확정을 후속으로 유지 |
| 2026-07-08 | CRM 고객/활동 Workspace가 `/api/crm/customers/access`와 object access snapshot을 조회해 고객 등록/수정, 활동 조회/등록 UI를 capability 기반으로 잠그도록 연결. 권한 확인/거부 상태와 verifier coverage를 추가. provider-ready vector evidence는 후속으로 유지 |
| 2026-07-08 | CRM 고객/활동 API access guard/snapshot 1차를 추가해 customer/activity 읽기·생성·수정 권한을 `crm.customer.*` permission과 `crm.customer` object policy로 분리. 기존 `crm.opportunity.read/write` grant는 재시드 전 호환 매핑으로 유지하고, owner-user/name baseline grant 후 object revoke가 우선하도록 서비스 테스트와 verifier를 보강. provider-ready vector evidence는 후속으로 유지 |
| 2026-07-08 | CRM 고객/활동 controlled AI index backfill endpoint를 추가해 `POST /crm/customers/ai-index/backfill`에서 system-override/admin 권한으로 customer/activity row를 제한된 batch의 `jobType: backfill` job에 enqueue. `@ssoo/types` backfill 계약, 실패 요약 테스트, AI projection owner-aware ACL snapshot 검증을 추가. provider-ready vector evidence는 후속으로 유지 |
| 2026-07-07 | CRM 고객/활동 Workspace 1차를 추가해 `/customers` 메뉴, 목록 검색/유형 필터/정렬, 고객 상세, 고객 생성/수정, 활동 등록 UI를 기존 `/api/crm/customers` 원장과 연결. 당시에는 customer/activity object-level owner policy, provider-ready vector evidence, controlled AI backfill endpoint를 후속으로 유지 |
| 2026-07-07 | CRM 고객/활동 원장 1차를 추가해 `crm.crm_customer_m`, `crm.crm_customer_activity_d`, history trigger, opportunity row 기반 migration/seed backfill, `/api/crm/customers`, `/api/crm/customers/:id/activities`, Next proxy route, 공용 검색 고객 결과, customer/activity AI projection 및 저장 이벤트 queue hook을 연결. 당시에는 customer/activity object-level owner policy, provider-ready vector evidence를 후속으로 유지 |
| 2026-07-07 | CRM 사업계획 차수 원장 1차를 추가해 `crm.crm_business_plan_m`, `crm.crm_business_plan_line_d`, history trigger, seed, `/api/crm/business-plan/plans`, `/plans/snapshot`, `/plans/:id/confirm`, `/plans/:id/reopen`, CRM `/business-plan` 차수 원장 패널을 연결. 현재 preview를 draft 차수로 저장하고 기준년도별 확정 차수를 관리하며, 당시 전년 이월·월별 직접 입력·내부원가/AMS 배부 저장은 후속으로 유지 |
| 2026-07-07 | CRM 보고 Preview 1차를 추가해 `/api/crm/reports/preview`와 `/reports`가 영업기회 pipeline과 확정 계약 월별 계약대비실적 read model을 집계하고 월별 trend, 사업구분/담당자/WBS drilldown, 확인 항목을 읽기 전용으로 표시. 회계 전표 생성, PMS 수행 KPI 편집, DMS 문서 저장 확정은 수행하지 않음 |
| 2026-07-07 | CRM 사업계획대비실적 preview 1차를 추가해 `/api/crm/business-plan/performance-preview`와 `/business-plan-performance`가 영업기회 pipeline 후보와 확정 계약 월별 계획/실적을 계획/실적/차이 3행 구조로 읽기 전용 비교. 확정 사업계획 차수 기준 월별 비교, 전년 이월, 내부원가/AMS 원가 배부 저장은 수행하지 않음 |
| 2026-07-07 | CRM 운영 기준 preview 1차를 추가해 `/api/crm/operations/preview`와 `/operations`가 원천 데모의 계정/코드/회사정보/사업년도/프로필 관리를 CRM 원장 설정, 공용 Admin/Auth, DMS 경계로 읽기 전용 표시. CRM 내부 계정 CRUD, 비밀번호 초기화, 역할/권한 편집, 법인/조직 마스터 편집, 코드 마스터 저장, CI 파일 저장은 수행하지 않음 |
| 2026-07-07 | CRM 원가/AMS preview 1차를 추가해 `/api/crm/cost-plan/preview`와 `/cost-plan`이 영업기회/계약 원가 라인, 확정 계약 외부원가 계획/실적, AMS readiness를 읽기 전용으로 표시. 내부원가 월별 저장, 원가 확정, AMS 업체-WBS 매핑, AMS 외부원가 저장은 수행하지 않음 |
| 2026-07-07 | CRM 사업계획 3개년 preview 1차를 추가해 `/api/crm/business-plan/preview`와 `/business-plan`이 영업기회 pipeline, 확정 계약 청구계획/실적, 실적 Gap을 표시. 현재 preview의 차수 원장 저장/확정은 별도 사업계획 원장 slice에서 수행하고 전년 이월/내부원가/AMS 저장은 수행하지 않음 |
| 2026-07-07 | CRM 홈 업무 요약 1차를 추가해 `/api/crm/dashboard`와 홈 상단 요약 밴드가 영업기회 pipeline, 계약 원장 요약, 견적 후보/계약 전환/PMS 인계/DMS 문서 패킷 readiness queue, 다음 액션을 읽기 전용으로 표시. PMS 프로젝트 생성과 DMS 저장은 수행하지 않음 |
| 2026-07-07 | CRM 계약 기반 DMS 계약서 문서 패킷 preview를 추가해 계약 확정/WBS/청구계획/공급자 법인정보 readiness, 템플릿/폴더/파일명 hint, 문서 변수, 첨부 후보를 읽기 전용으로 표시. Word/PDF 생성과 DMS 저장은 수행하지 않음 |
| 2026-07-07 | PMS 프로젝트 상세 인수인계 탭에서 CRM 계약 후보를 검색하고 `/api/crm/contracts/:id/pms-handoff-preview`를 읽기 전용으로 소비하는 1차 흐름을 추가. PMS 프로젝트 생성과 계약/청구 편집은 수행하지 않음 |
| 2026-07-07 | CRM 계약 기반 PMS 인계 후보 preview를 추가해 확정/WBS/청구계획 합계 readiness, 계약 금액, 라인, 청구계획을 읽기용 스냅샷으로 제공. PMS 프로젝트 생성은 수행하지 않음 |
| 2026-07-07 | CRM 영업기회 담당자 공용 사용자 lookup API와 편집 select UI를 추가해 `ownerUserId` 직접 숫자 입력을 기본 흐름에서 제거하고, 선택 시 ownerName을 공용 사용자 표시명으로 동기화 |
| 2026-07-07 | CRM 영업기회에 `owner_user_id`를 추가하고 access/견적 후보가 ownerUserId 공용 사용자 프로필을 우선 사용하도록 전환. db-init protected baseline에도 포함했으며 기존 ownerName fallback은 과거 row 호환용으로 유지 |
| 2026-07-07 | CRM 계약/견적/견적 공급자 migration을 `db-init` protected baseline 적용 경로에 포함해 legacy volume에서도 seed 전 CRM 원장 schema가 재현되도록 보강. 이는 CRM 원장 재현성 수정이며 PMS 계약/청구 편집 범위 확장이 아님 |
| 2026-07-07 | CRM 견적 담당 연락처 1차를 추가해 견적 후보 API/UI가 현재 세션의 공용 사용자 프로필 부서/전화/e-Mail을 표시하도록 연결. 영업기회 ownerId 기반 정밀 담당자 매핑과 PDF/Word/DMS 생성은 후속으로 유지 |
| 2026-07-07 | CRM 견적 공급자 회사 정보 1차를 추가해 `crm.crm_quote_seller_profile_m`/`_h`, seed/history trigger, `/api/crm/quote-seller-profile`, CRM `/quote-settings` 화면을 연결하고 견적 후보의 공급자 표시값을 설정 기반으로 전환. CI 파일 업로드와 DMS 문서 저장은 후속으로 유지 |
| 2026-07-07 | CRM 견적 상태 저장 1차를 추가해 `crm.crm_opportunity_m`에 `quote_status_code`, 수신 담당자, 발행일, 유효기한, 메모를 보관하고 `/api/crm/opportunities/:id/quote-workflow`와 상세 견적 후보 저장 UI를 연결. PDF/Word/DMS 생성은 계속 미구현으로 표시 |
| 2026-07-06 | CRM 계약대비실적 월별 조회 1차를 추가해 `/api/crm/contracts/monthly-performance`, `/contract-performance` 메뉴, 사업년도/사업구분/계열/국내외/검색 필터, 월별 계획/실적/차이와 합계 표를 연결 |
| 2026-07-06 | CRM 계약 청구실적 1차를 추가해 `crm.crm_contract_billing_actual_d`, `/api/crm/contracts/:id/billing-actual` 조회/저장, 확정 계약 저장 제한, `/contracts` 계획 대비 실적 입력/차이/달성률 표시를 연결 |
| 2026-07-06 | CRM opportunity 상세에서 최신 확정 영업기회를 계약으로 전환하는 API/UI를 추가. 전환 시 계약 원장을 생성하고 opportunity에 `contract_created`/`contract_code`를 기록하며, 전환 후 확정해제/차수추가를 차단. 미확정 전환 계약 삭제 시 opportunity 전환 플래그를 되돌리도록 보강 |
| 2026-07-06 | CRM 웹 `/contracts`에 계약 등록/수정/삭제 폼을 추가하고 매출/원가 라인, Special DC, 청구계획 입력, 자동분할 preview/apply를 계약 저장 API에 연결. 계약 저장 시 청구계획 합계 불일치를 서버에서도 거절하도록 보강 |
| 2026-07-06 | CRM 계약 저장/수정/삭제/확정/해제 API를 추가하고 확정 시 WBS와 청구계획 합계 일치를 서버에서 검증하도록 보강. CRM 웹 `/contracts` 계약 원장 surface에서 목록/상세/청구계획/확정 workflow를 열었으며 등록/수정 폼, 영업기회 전환, 청구실적은 잔여 |
| 2026-07-06 | CRM 계약 원장 foundation을 추가해 `crm.crm_contract_m`, 계약 line, billing plan, 계약 history trigger, 계약 목록/상세 API, 청구계획 자동 분할 preview API를 시작. 계약 저장/확정 UI, 청구실적, PMS 인계 생성은 잔여 |
| 2026-07-06 | CRM opportunity 기반 읽기 전용 견적 후보 미리보기를 추가해 원천 데모의 QUOTATION 흐름을 SSOO 상세 surface에 연결하고, PDF/Word/DMS action은 미구현으로 명시. 계약 전환은 후속 slice로 분리 |
| 2026-07-03 | CRM opportunity 권한 1차 slice를 추가해 `crm.opportunity.*` permission seed, 서버 access snapshot/feature guard, CRM 웹 권한 기반 버튼/상세 표시를 연결 |
| 2026-07-03 | CRM opportunity 변경 이력 조회를 추가해 `crm_opportunity_h` history ledger를 서버 API, Next proxy, 상세 화면에서 조회하도록 연결 |
| 2026-07-03 | CRM opportunity 원가 행의 매출 연동 row sync를 추가해 매출단가 입력 시 매출 라인이 자동 생성/갱신되고 서버 저장 시 draft cost id가 persisted cost line code로 remap되도록 보강 |
| 2026-07-03 | CRM opportunity line을 수량/M-M, 단가, 절사, 소속/성명/등급, 내부/외부 구분, 원가-매출 연동 metadata를 보존하는 상세 모델로 확장하고, CRM 웹 등록/수정 패널을 매출 상품/용역 및 원가 상품/내부용역/외부용역 그룹 입력으로 전환 |
| 2026-07-03 | CRM opportunity group/version key, 최신 차수 기준 목록, 이전 차수 조회, 확정 최신 차수 기반 차수 추가 API/UI, 이전 차수 수정 차단, add-version AI index queue hook을 반영. 원천 데모 수준의 세부 그리드, 권한, 견적/계약/청구 원장, provider-ready evidence는 잔여 |
| 2026-07-03 | CRM opportunity 생성/수정/확정/해제 API, 현재 차수 확정 잠금, 매출/원가 line 합계 저장, CRM 웹 create/edit/confirm/reopen panel, opportunity 저장 이벤트 AI index queue hook을 반영. 고객/활동 projection, 기존 row backfill, 견적/계약/청구 원장, provider-ready evidence는 잔여 |
| 2026-07-02 | CRM opportunity RDB 원장, 매출/원가 line seed/history trigger, RDB-backed opportunity service, provider-gated CRM opportunity AI index adapter를 반영. CRM AI/RAG는 customer/activity projection, write-hook/backfill, provider-ready evidence가 남은 partial 상태로 전환 |
| 2026-07-02 | CRM AI/RAG adapter production rollout 조건을 검증된 provider-ready Markdown summary artifact 이후로 강화 |
| 2026-07-02 | CRM AI/RAG adapter production rollout 조건을 검증된 provider-ready runtime smoke artifact 이후로 강화 |
| 2026-07-02 | 공용 AI/RAG 설계 방향을 CRM 백로그에 반영. CRM adapter는 CRM RDB 정본을 `AiIndexObjectProjection`으로 투영하고, provider-ready evidence 전에는 production rollout을 완료로 보지 않는 방식으로 등록 |
| 2026-06-08 | CRM 원천 데모 이식 기준과 PMS/Admin/DMS 경계를 문서화 |
| 2026-06-08 | CRM 앱/서버/타입 1차 골격과 영업기회 검색/필터/정렬 화면 기준 반영 |
| 2026-06-08 | CRM 화면을 PMS 업무 베이스에 맞춰 재정렬: 업무 베이스 헤더, 파이프라인 단계, 원장형 금액 표, 대표 상세/등록 기준, PMS/DMS/SNS/Admin 차이 카드 반영 |
| 2026-06-08 | 사용자 지적 반영: fixture 데이터와 미구현 상태를 실제 원장처럼 보이지 않게 샘플 모드로 낮추고, 진척률/디자인 일관성 평가를 현실화 |

| 2026-09-14 | 승인-08 검색 접속 복구 검증 완료. 작은 화면 보조 영역 가림은 승인-16으로 별도 등록 |

| 2026-09-14 | 승인-16 검색 가림 개선 완료와 승인-17 다른 서비스 검토 대상 연결 |

| 2026-09-14 | 승인-17 후속과 고객관리 보존 회귀 7/7 연결. 8완료·10대기·운영 증거 0/5 |

| 2026-09-15 | 승인-18 후속 완료와 고객관리 회귀 7/7·최초 요청 제한 실패 보존 기록 연결 |
