# CRM 런칭 UI 다듬기 작업 핸드오프

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

> 2026-09-21 계약 화면 후속: 사용자 “진행”으로 계약 현황·등록·청구 목록/입력·원장의 폭과 여백을 정리했다. 등록/청구 입력은 공용 본문 최대 975px, 목록/원장은 1,380px, 바깥 여백은 16px다. 청구 표와 원장 하단 편집 영역의 작은 화면 최소 폭 확장도 보완했다. [새 검증](../../../output/playwright/crm-contract-width-20260921/results.md)을 따른다. 계약대비실적(월별/전체), 사업계획·원가·고객/활동·운영/설정은 이번 완료 범위가 아니다.

> 2026-09-21 본문 폭 후속: 사용자 “진행하자” 승인에 따라 영업기회 다섯 화면의 본문 폭·여백을 정리했다. 대시보드·등록 양식·영업기회 계약서 생성은 공용 기본 본문 975px, 영업기회 현황·표/상세 작업공간은 공용 넓은 본문 1,380px를 최대 폭으로 사용한다. 외곽 여백은 16px이며 작은 화면에서는 가용 폭에 맞게 줄어든다. 아래 폭은 여백을 제외한 본문 값이다. [현재 검증](../../../output/playwright/crm-page-width-20260921/results.md)을 우선한다. 계약 원장·계약 등록/청구·사업계획·원가·고객/활동·운영/설정 화면은 이번 적용 범위가 아니다.

> 2026-09-21 후속: 사용자 순차 적용 승인에 따라 영업기회 작업공간의 표·상세 높이 및 스크롤 보완을 완료했다. [최신 백로그](backlog.md)와 [새 브라우저 검증](../../../output/playwright/crm-layout-fix-20260921/results.md)을 우선한다. 아래의 “미착수·0%”는 8월 28일 당시 기록이며 현재 상태가 아니다. 전체 화면 다듬기 완료를 뜻하지 않으며, 나머지 화면·본문 읽기 품질 검수는 남아 있다.

> 작성일: 2026-08-28 KST\
> 기준 브랜치: `launch/rebaseline-20260721`\
> 기준 커밋: `e93a6663ff35e9fedd57054f2595a4f4761c4f42`\
> 현재 판정: 기능·운영 회귀 기준선은 통과했지만, 사용자 수용 기준의 UI 다듬기는 아직 시작 전이다.\
> 다음 실행 방식: 화면 감사와 구현을 분리한 뒤 `web-ralph`로 순차 수정·브라우저 재검증한다.

## 1. 이 문서가 고정하는 결론

현재 상태를 다음 세 가지로 분리한다.

| 판정축 | 현재 상태 | 의미 |
|---|---|---|
| CRM 데모 기능 이식 | 검증 기준선 `SRC 28/28 + UX 17/17 = 45/45` 통과 기록 | 원천 기능·상태 분모와 자동 계약을 통과했다. |
| 운영·제어 기능 | `OPS-01~17` 폐쇄 기록과 통합 회귀 통과 | CRM/Admin/DMS 운영·복구·권한·설정 흐름이 구현돼 있다. |
| UI 다듬기·실사용성 | **미착수, 완료율 0%** | 사용자가 현재 화면의 깨짐·불일치·사용 불가 문제를 제기했으므로 기존 UI 증거를 최종 수용 판정으로 사용하지 않는다. |

따라서 다음 작업의 목표는 기능을 다시 만드는 것이 아니라, 기존 기능과 원천 업무 흐름을 보존하면서 실제 화면을 사용할 수 있는 상태로 만드는 것이다. `45/45` 통과를 UI 다듬기 완료로 해석하거나, 화면이 열린다는 이유만으로 결함을 닫지 않는다.

실제 법인정보·CI·프로덕션 credential인 `EXT-01~02`는 실환경 최종 런칭 입력이다. 가데이터로 화면과 기능을 검증할 수 있으므로 이번 UI 다듬기의 blocker가 아니다.

## 2. 재개 시점의 저장소 상태

| 항목 | 상태 |
|---|---|
| local HEAD | `e93a6663ff35e9fedd57054f2595a4f4761c4f42` |
| merge parents | `a0cbfa58d1a64f063ffc1bc83e2db3ec5e6d42c2`, `cbd9d7e07a2693f3f531c2c8173260260d695c24` |
| merge 의도 | GitLab `development`의 DMS WS-021/022, exact-SHA CI·rollback·BuildKit 복구 의도를 현재 정본과 합성 |
| GitHub | 2026-08-28 재조회 기준 `origin/launch/rebaseline-20260721 = e93a6663` |
| GitLab | 직전 통합 작업에서 `development = e93a6663` 게시·확인. 현재 셸의 fresh `ls-remote`는 credential을 읽지 못해 재확인하지 못했고 local remote-tracking ref는 이전 `cbd9d7e0`이므로, 다음 publish 전 인증된 fetch가 필요하다. |
| 기준 worktree | 이 핸드오프 작성 전 clean |
| 실행 중 격리 환경 | 없음. CRM Ralph DB/process와 임시 브라우저 stack은 정리됨 |
| 기준 포트 | Admin `3000`, CRM `3001`, PMS `3002`, DMS `3003`, SNS `3004`, Server `4000` |
| toolchain | Node.js `22.13+`, pnpm `11.13.1` |

이 문서와 문서 색인·changelog 변경을 아직 커밋하지 않았다면 다음 세션의 dirty worktree는 해당 문서 변경이어야 한다. 다른 변경이 보이면 소유자와 목적을 먼저 확인하고 전체 restore/staging을 하지 않는다.

## 3. 보존할 검증 기준선

### 3.1 CRM strict demo

통합 후보 작업 트리에서 `20260827_gitlab_merge` run이 다음을 통과했다.

- `SRC-01~28`: 28/28
- `UX-01~17`: 17/17
- 원천 비교 상태: 83/83
- strict demo: 45/45
- source/DDL, 격리 DB, core runtime, 역할별 접근, 견적 binary, readiness, secret masking, 실패→수정→재시도, cleanup 전부 PASS

중요한 provenance 주의점이 있다. 보고서의 `worktreeIdentity.head`는 merge commit 생성 전 부모 SHA인 `a0cbfa58...`이며, 검증 당시 uncommitted merge 결과의 파일 지문을 기록한다. 이후 같은 파일 트리로 merge commit `e93a6663...`을 만들었지만 HEAD identity는 달라졌다. 따라서 이 결과는 통합 내용의 기준선 증거로 보존하되, UI 수정 후 현재 revision 완료 판정은 반드시 새 identity로 다시 생성한다.

### 3.2 통합 회귀

- Server: 76 suites / 482 tests PASS
- CRM boundary: 23 suites / 171 tests PASS
- Admin/CRM/PMS/DMS/SNS 포함 11개 workspace lint/build PASS
- DMS WS-021/022 browser: 7/7 PASS
- DMS/Admin mobile `390×844`: 1/1 PASS, body horizontal overflow 0, console warning/error 0
- `verify:gitlab-pipeline`, auth hardening, DMS guard, Codex preflight/sync/push guard PASS
- 통합 과정에서 SharePoint를 되살리지 않았고 DMS storage는 현재 Local/NAS 계약을 유지한다.

이 숫자는 다음 UI 작업의 회귀 하한선이다. UI 수정으로 하나라도 낮아지면 완료가 아니다.

### 3.3 직접 확인할 증거

- `output/crm-current-demo/current-demo-parity-report.json`
- `output/crm-current-demo/crm-local-verification-report.json`
- `output/playwright/crm-ralph/20260827_gitlab_merge-build-report.json`
- `output/playwright/crm-ralph/20260827_gitlab_merge-uiux/target-uiux-parity-manifest.json`
- `output/playwright/crm-ralph/20260827_gitlab_merge-uiux/`의 desktop/mobile/difference PNG 각 83개
- `output/playwright/gitlab-merge-dms-final/results.json`
- `output/playwright/gitlab-merge-mobile/results.json`
- `docs/dms/planning/2026-08-27-gitlab-workspace-integration-ralph-plan.md`

외부 원천 입력은 다음을 그대로 사용한다.

- `/mnt/c/Users/A0122024330.000/Downloads/Sales Management System -proto`
- `/mnt/c/Users/A0122024330.000/Downloads/Create Table script.txt`

## 4. 기존 UI 증거가 새 수용 판정을 대신하지 못하는 이유

기존 17화면·83상태 증거는 선언된 title, section, field, column, action, 상태, source/target screenshot과 browser E0를 검증한다. 하지만 사용자가 제기한 문제는 화면 단위 계약을 넘어 실제 사용 중 발생하는 조합 문제를 포함할 수 있다.

- 일반 노트북 높이에서 header/tab/content가 겹치거나 핵심 action이 fold 아래로 밀리는 문제
- shell, sidebar, page chrome, 본문이 중복으로 폭·높이·scroll을 소유하는 문제
- 긴 실데이터, 긴 한글 label, 많은 column, validation message에서만 발생하는 잘림·겹침
- grid의 내부 horizontal scroll은 존재하지만 사용자가 scroll bar나 끝 column/action에 도달하기 어려운 문제
- modal, dropdown, sticky/fixed action, toast가 viewport 밖이나 다른 layer 뒤에 놓이는 문제
- mobile에서 body overflow는 0이어도 입력·표·action의 읽기 순서와 조작성이 나쁜 문제
- route 이동, MDI tab 전환, reload, error/retry를 연속 수행할 때만 드러나는 shell 상태 문제

대표 기존 캡처에서는 대시보드의 큰 잔여 canvas, dense cost grid의 제한된 가시 폭, 긴 mobile form의 action 도달성이 우선 감사 후보로 보인다. 이는 아직 확정 defect가 아니라 다음 브라우저 감사에서 재현·분류해야 할 관찰점이다.

## 5. 작업 범위와 우선순위

### A. 원천 데모 패리티 화면 — 최우선

| 묶음 | UX ID | route/surface |
|---|---|---|
| 영업기회 | `UX-01~04` | CRM `/` dashboard/list/form, opportunity 기반 계약서 생성·download |
| 계약 | `UX-05~08` | CRM `/contracts`, `/contract-performance` |
| 사업계획·원가 | `UX-09~11`, `UX-13~14` | CRM `/business-plan`, `/business-plan-performance`, `/cost-plan` |
| 공용 관리·설정 | `UX-12`, `UX-15~17` | Admin `/business-years`, `/codes`, `/users`, shared auth/profile, CRM `/quote-settings` |

원천 desktop 업무 content의 정보 밀도, field/column/section/action 순서, 기본 filter/sort, 잠금·확인 흐름은 변경하지 않는다. mobile은 원천 대체 디자인이 아니라 additive adaptation으로 다룬다.

### B. CRM 런칭 확장 화면 — 두 번째

- `/customers`
- `/reports`
- `/operations`
- `/operations/settings`
- `/settings`
- `/ssoo/search`
- login/password-reset/shared user surface

이 화면들은 strict demo 17화면 밖에 있어도 이미 구현된 사용자-visible 기능이다. 삭제하거나 데모 화면에 흡수하지 않는다.

### C. CRM 런칭 연결 화면 — 세 번째

- Admin `/users`, `/roles`, `/organizations`, `/codes`, `/business-years`, `/auth`, `/ai-operations`
- DMS `/`, `/settings/[[...path]]`, `/settings/operations/git`
- CRM 견적·계약에서 DMS preview/draft/lifecycle/download로 이어지는 화면

전체 Admin/DMS 제품 재설계가 아니라 CRM 런칭에 직접 연결되는 운영·설정·문서 흐름을 우선한다. 반복되는 문제가 공용 shell/template 원인으로 확인되면 5개 앱 영향으로 승격해 검증한다.

## 6. 변경 불변식

1. `@ssoo/web-shell`, `@ssoo/web-ui`, `@ssoo/web-auth`의 기존 frame/template/primitive 경계를 사용한다.
2. CRM 원천 화면의 field, column, section, action, label, 기본 상태와 업무 순서를 삭제·통합·재명명하지 않는다.
3. 기존 오류·빈 상태·수동 복구·권한 fallback·확인 dialog·잠금 표시를 보존한다.
4. visible 동작을 삭제·축소·대체·다른 UI에 흡수해야 하는 경우 Behavior Impact Gate로 사용자 확정을 먼저 받는다.
5. 앱 로컬 primitive recipe, raw control, app-local shell clone을 만들지 않는다.
6. 레이아웃 수정은 가장 좁은 소유 경계에서 한다. 세 화면 이상에서 같은 원인이 재현되거나 shell metric 자체가 원인이어야 공용 package 변경 후보로 올린다.
7. seed/fixture는 상태 재현에 사용할 수 있지만 저장·권한·오류·복구 흐름은 실제 API와 격리 DB로 검증한다.
8. screenshot이나 정적 DOM만 맞추기 위해 기능을 숨기거나 fake action을 만들지 않는다.
9. body horizontal overflow는 금지한다. 업무상 넓은 표는 승인된 내부 scroll container를 사용하고 첫 column, 핵심 action, scrollbar에 실제로 도달할 수 있어야 한다.
10. EXT-01~02 부재를 UI 결함 미수정 사유로 사용하지 않는다.

## 7. 새 UI 결함 원장

구현 전에 `output/playwright/crm-ui-polish/<run-id>/ui-defects.json`과 대응 Markdown 요약을 만든다. 각 결함은 다음 필드를 가진다.

| 필드 | 내용 |
|---|---|
| `id` | `UI-P0-001` 같은 안정 ID |
| `app`, `route`, `surface` | 소유 앱·경로·화면 상태 |
| `viewport` | `1440x1000`, `1366x768`, `390x844` |
| `state` | 정상/빈/로딩/오류/validation/잠금/confirmation/permission 등 |
| `severity` | P0 사용 불가, P1 핵심 작업 방해, P2 품질 저하 |
| `evidence` | before screenshot, 재현 단계, 관련 request |
| `expected` | 원천 reference 또는 SSOO 공용 frame 계약 |
| `ownerBoundary` | app page/template 또는 shared shell/UI/auth |
| `behaviorImpact` | visible 동작 변경 여부와 gate 필요 여부 |
| `status` | open/fixed/verified/deferred |

심각도 기준은 다음과 같다.

- P0: 화면 진입·읽기·입력·저장·복구가 불가능하거나 핵심 action이 보이지 않음
- P1: 주요 흐름을 완료할 수는 있으나 겹침·잘림·scroll·focus·상태 표현 때문에 오조작 위험이 큼
- P2: 기능은 가능하지만 spacing, alignment, hierarchy, density, wrapping이 일관되지 않음

결함을 코드 파일명이나 CSS class 단위로 묶지 않는다. 사용자가 수행하는 화면·상태·flow 단위로 등록하고, 공통 원인은 별도 `rootCause`로 연결한다.

## 8. 순차 실행 계획

### Phase UI-0 — read-only 전수 감사

1. 현재 HEAD와 원격을 다시 확인하고 `pnpm run codex:preflight`를 실행한다.
2. production build 기반 격리 CRM/Admin/DMS runtime을 기동한다.
3. A/B/C 범위의 모든 route를 `1440×1000`, `1366×768`, `390×844`로 연다.
4. 정상 상태만 보지 않고 loading, empty, validation, error/retry, locked/read-only, permission fallback, dialog/dropdown, 긴 데이터 상태를 재현한다.
5. before screenshot과 request/console/pageerror/overflow 기록을 남기고 결함 원장을 확정한다.
6. 이 단계에서는 UI 코드를 수정하지 않는다.

### Phase UI-1 — 공용 frame·scroll 소유권

- header/sidebar/tabbar/content viewport의 높이와 offset
- body와 content pane의 scroll 중복
- page chrome, content width, sticky/fixed action, z-index
- desktop collapse와 mobile navigation 전환

공용 수정은 Admin/CRM/PMS/DMS/SNS 전체 smoke를 통과해야 한다. 원천 업무 content의 개별 배치는 이 단계에서 재설계하지 않는다.

### Phase UI-2 — CRM 원천 17화면

다음 순서로 작은 slice를 닫는다.

1. 영업기회 dashboard/list/form/document
2. 계약 list/form/billing/performance
3. 사업계획·실적·내부원가·AMS dense grid
4. Admin/Auth/company 설정 치환 화면

각 slice는 `before → 최소 수정 → target browser → source 비교 → 회귀`를 같은 run에서 끝내고 다음 slice로 넘어간다.

### Phase UI-3 — CRM 확장·운영 연결

- customers/reports/operations/settings/search
- Admin 운영 화면
- DMS 계약·견적 lifecycle과 settings/error/retry

기존 운영·복구 action을 유지하고, 역할별 allow/deny 및 owner deep link를 다시 확인한다.

### Phase UI-4 — 전체 Ralph 폐쇄

- 새 defect 원장의 P0/P1 open 0
- P2는 verified 또는 사용자가 승인한 명시적 deferred만 허용
- 17화면·83상태 fresh capture와 strict demo 재실행
- 전체 app/build/server/DMS/browser 회귀
- 임시 DB/process/runtime residue 0

UI 작업 실행은 병렬 변경보다 `web-ralph` 순차 loop를 우선한다. 공용 package를 동시에 여러 lane에서 고치면 visual 원인과 회귀 소유권을 잃기 쉽다.

## 9. 브라우저 테스트 명세

기본 도구는 `playwright-cli`다. 첫 navigation 전에 console, pageerror, requestfailed, API/proxy 응답 monitor를 연결한다.

| ID | 시작 경로·flow | 기대 visible/result | 완료 차단 조건 |
|---|---|---|---|
| UI-B01 | CRM `/` 로그인→sidebar→MDI tab 전환→뒤로/앞으로→reload | header/sidebar/tab/content가 겹치지 않고 active route와 content 일치 | shell overlap, stale tab, 잘린 action, 관련 request 실패 |
| UI-B02 | `/` dashboard/list→검색/filter/sort→행 선택→신규/편집/validation/잠금 | 원천 field/column/action 순서와 상태 유지, keyboard/mouse로 핵심 action 도달 | source 요소 누락·재명명, validation 잘림, modal/focus 실패 |
| UI-B03 | `/contracts` 목록→등록/편집→확정/해제→청구실적→DMS preview/download | 목록·form·grid·문서 panel이 viewport 안에서 읽히고 저장 결과 재조회 | local proxy/API 실패, wide grid action 접근 불가, 문서 action 가림 |
| UI-B04 | `/business-plan`, `/business-plan-performance`, `/cost-plan`의 filter/paste/save/confirm/reopen | dense grid는 내부 scroll로 모든 월·합계·action 접근, 고정 열 의미 유지 | body overflow, unreachable column/scrollbar, sticky collision, 값 손실 |
| UI-B05 | Admin `/business-years`, `/codes`, `/users` CRUD/empty/validation/confirmation | CRM selector 소비 흐름과 공용 관리 화면 hierarchy 유지 | CRUD action 가림, dialog viewport 이탈, permission fallback 손상 |
| UI-B06 | CRM `/operations`, `/operations/settings`, `/reports`, `/customers` direct route/reload/error/retry | owner link, readiness, 실패 원장, 수동 retry가 shell 안에서 명확 | full-page 대체, 오류 은폐, retry 제거, route/content mismatch |
| UI-B07 | DMS `/` empty/error/retry→settings→Git/storage/template→CRM 문서 flow 복귀 | DMS shell 유지, `200 + []`은 ready, 오류는 visible retry, lifecycle action 유지 | hidden retry, full-page blocker, unexpected 401/403/5xx, WS 실패 |
| UI-B08 | login/password reset/shared profile/settings, admin·manager·user·viewer | auth/profile field와 권한별 visible/disabled 상태가 안정적 | credential autofill 오염, 권한 action 노출, focus/keyboard 차단 |

모든 flow는 canonical desktop `1440×1000`, 최소 노트북 `1366×768`, mobile `390×844`로 실행한다. 원천 desktop 비교는 1440×1000을 사용하고, 나머지 viewport는 실사용성 회귀다.

## 10. UI 완료 기준

다음 조건의 논리곱만 UI 다듬기 100%다.

1. 감사 대상 route/state가 defect 원장에 누락 없이 등록됐다.
2. P0/P1 open 0, 미분류 layout 차이 0이다.
3. P2는 verified 또는 사용자 승인 deferred만 남는다.
4. viewport 세 종류에서 header/sidebar/tab/page/modal/dropdown/toast가 겹치거나 잘리지 않는다.
5. body horizontal overflow 0이며, 승인된 dense grid 내부 scroll은 실제 포인터·키보드로 끝까지 접근된다.
6. 모든 핵심 action은 visible, enabled/disabled 이유가 식별 가능하고 pointer/keyboard로 실행된다.
7. loading/empty/error/validation/locked/permission 상태가 기존 동작과 복구 경로를 보존한다.
8. source 17화면의 field/column/section/action/default behavior에 defect·미분류 차이 0이다.
9. 관련 API와 local proxy request 실패 0, 예상 밖 401/403/5xx 0, console warning/error 0, page/runtime error 0이다.
10. `SRC 28/28 + UX 17/17 = 45/45`, 운영 회귀, DMS WS-021/022가 UI 변경 뒤 fresh identity로 다시 통과한다.
11. 실행한 격리 DB, process, browser, runtime residue가 0이고 worktree 변경 범위가 의도와 일치한다.

정적 lint/build나 기존 screenshot 하나만 통과한 상태는 완료가 아니다. 자동 브라우저 결과와 대표 화면의 사람 눈 검토를 함께 남긴다.

## 11. 검증 명령 묶음

slice마다 가장 좁은 검증을 먼저 실행하고, 최종에는 다음을 실행한다.

```bash
pnpm run codex:preflight
pnpm run verify:ui-primitives
pnpm run verify:ui-consumption
pnpm run verify:ui-style-boundary
pnpm run verify:ssoo-frame -- --skip-runtime
pnpm run verify:input-intent
pnpm run lint
pnpm run build
pnpm run test:server
pnpm run verify:crm-current-demo
pnpm run codex:verify-sync
pnpm run docs:verify
```

DMS 또는 공용 package 변경이 있으면 다음을 추가한다.

```bash
pnpm run codex:dms-guard
```

push를 요청받은 경우에만 마지막으로 실행한다.

```bash
pnpm run codex:push-guard
```

`verify:crm-current-demo`는 새 run ID, 새 격리 DB, 새 worktree identity와 fresh target UI/UX manifest로 실행한다. 과거 `20260827_gitlab_merge` report를 복사하거나 path만 바꿔 재사용하지 않는다.

## 12. 다음 세션의 정확한 첫 작업

```bash
cd /home/a0122024330/src/ssoo
sed -n '1,360p' docs/crm/planning/2026-08-28-launch-ui-polish-handoff.md
git status --short --branch
git rev-parse HEAD
git fetch origin
git fetch gitlab
pnpm run codex:preflight
```

그다음 `web-ralph`와 Playwright 지침을 읽고 **Phase UI-0만** 수행한다. 첫 산출물은 UI 코드가 아니라 다음 세 가지다.

1. route/state/viewport 전수 목록
2. before screenshot과 재현 단계가 연결된 defect 원장
3. 공용 shell 원인과 app-local 원인을 분리한 첫 수정 slice

첫 구현 slice는 사용자 작업을 막는 P0/P1 중 재현 증거가 가장 명확한 3~5건으로 제한한다. visible 동작 제거가 필요하지 않은 레이아웃 보정은 진행할 수 있지만, 화면·action·상태를 없애거나 합치는 안은 Behavior Impact Gate에서 멈춘다.

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

| 날짜 | 변경 내용 |
|---|---|
| 2026-09-21 | 승인된 계약대비실적 월별·전체 본문 폭/여백과 중간 화면 요약 카드 배치 보완. 조회·월별 표·집계 계약 보존. 현재 증거는 `crm-performance-width-20260921/results.md`, 다음은 사업계획 등록·월별 실적. |
| 2026-09-21 | 계약 다섯 화면의 본문 폭/여백과 작은 화면의 청구 표·원장 하단 편집 영역 확장 보완. 다른 CRM 화면은 잔여로 유지 |
| 2026-09-21 | 영업기회 다섯 화면의 일반/넓은 본문 폭·여백을 공용 수치에 연결. 이전 표/상세 높이·스크롤 보완을 유지하며 다른 CRM 화면은 잔여로 구분 |
| 2026-09-21 | 영업기회 작업공간 높이·스크롤 보완 결과와 최신 백로그를 연결하고, 미착수·0%가 작성 당시 기록임을 명시 |
| 2026-08-28 | merge/publish 뒤 기능·운영 기준선과 UI 실사용성 판정을 분리하고, 다음 UI 다듬기의 범위·불변식·결함 원장·순차 Ralph·브라우저 완료 기준을 최초 고정 |
