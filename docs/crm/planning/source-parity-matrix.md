# CRM 원천 기능 패리티 재검수 매트릭스

> 2026-10-01 계약서 생성 내부 재검수: 사용자 승인으로 선택 정보 공란을 허용하고 **최신 차수이면서 확정된 영업기회만 생성**한다. 과거 확정 차수까지 허용하는 원천과 합의된 차이다. [DOC-01–05](2026-09-30-menu-functional-audit.md)에서 선택 템플릿·현재 변수 반영, 다운로드 실패/재시도, 선택 유지와 한글 파일명을 검증했다. 아래 SRC-14 과거 완료 기록은 현재 DC 정책·확정 대상 0건·임의 DOCX 서식의 잔여를 해소한 판정이 아니다.

> 2026-09-30 내부 기능 재검수: [메뉴별 재검수 기록](2026-09-30-menu-functional-audit.md)에서 대시보드 확정 차수 선택·절사·최근 목록 정렬의 차이를 수정하고 격리 DB/API/브라우저로 확인했다. 아래 과거 기록의 “최신 차수 중 확정”과 “최신 수정순” 설명은 원천 실행 코드와 다르다. 현재 대시보드는 **확정된 차수 중 최신·수량×단가 원값·그룹 등록 역순**을 따른다. `SRC-07/10`의 목록 화면과 `UX-01`의 전체 실패 상태까지 이번 완료로 확대하지 않는다.

> 2026-09-30 사용자 지시: 사업연도 메뉴·화면·API·마스터/이력은 CRM 소유로 이전한다. 아래 과거 Admin 실행 증거는 당시 기록이며 현재 이전 검증을 대체하지 않는다.
> 기준일: 2026-08-24  
> 상태: Phase 2 S12~S14의 `SRC-01~28` 28/28·`UX-01~17` 17/17은 폐쇄 원장으로 보존한다. 현재 작업본 점수는 동일 worktree identity의 fresh DB/API/browser 증거가 완성된 뒤 다시 판정한다.  
> 정본 우선순위: 원천 데모 실행 코드와 DDL > 원천 표본 SQL/데이터 > 소개 PPTX > 기존 SSOO 문서와 완료 주장.

기능 패리티와 별도로 사용자가 요구한 원천 UI/UX 디자인 무변경 기준은 [CRM 원천 UI/UX 패리티 명세](./source-uiux-parity-spec.md)의 `UX-01~17`을 따른다. 원천 시각 reference `REF-01`과 83/83 target 상태 쌍은 S12에서 통과했으며, strict demo 판정은 SRC 28개와 UX 17개를 합친 45개 분모로 계산한다.

## 1. 재검수 결론

2026-08-14 당시 기존 문서의 “27개 항목 100% 완료” 주장은 독립 재검수 결과 유지할 수 없었다. 원천 분모를 28개로 다시 고정해 확인한 아래 격차는 Phase 2 S1~S12에서 각각 폐쇄했다.

- 원천 대시보드의 **최신 차수 중 확정 건** 지표와 현재 홈의 **최신 전체 영업기회** 지표는 집계 분모가 다르다.
- Phase 2 S7에서 CRM 로그인에만 opt-in하는 아이디 저장과 비밀번호 표시 전환을 추가하고, 30분 idle session 만료·활동 연장·비밀번호 변경 시 타 세션 회수까지 actual auth 경계에서 검증했다.
- Phase 2 S8에서 도메인별 공용 permission과 Admin live catalog를 연결하고 네 역할 allow/deny, permission seed 2회 동일성, 원천 표본 값 hash와 functional identity alias, AMS 업체·복수 WBS·월별 paste·확정 잠금·삭제를 실제 격리 DB/API/브라우저에서 검증했다.
- Phase 2 S2에서 계약 원장/API/UI에 원천 `client_contact`와 공용 사용자 FK 담당자(`assignee_id` 대응 `owner_user_id`)를 additive하게 추가하고 실제 저장·재조회·권한·문서 소비까지 닫았다.
- Phase 2 S3에서 원천의 계약 회수와 연결 계약 삭제 후 확정 해제 흐름을 단일 transaction/API/action으로 이식하고 실제 DB/API/desktop/mobile 증거까지 닫았다.
- 원천 계약서 생성은 확정 영업기회를 입력으로 쓰고 22개 한글 변수를 치환한다. 기존 계약 기반 DMS 패킷은 입력 대상과 변수 집합이 달라 그대로 보존하고, S4에서 별도 영업기회 계약서 흐름으로 원천 분모를 닫았다.
- 원천 사업계획대비실적의 “실적”은 확정 계약의 **청구계획**이다. Phase 2 S6에서 이 산식을 `source-compatible` 모드로 추가하고 기존 청구실적·수동실적 확장은 `extended-actual` 모드로 보존했다.
- `/reports`의 OpenAPI/runtime validation 불일치는 Phase 2 S1에서 닫혔고 route/content 결정성과 production origin/proxy 계약은 S11에서 폐쇄했다.

S12의 BT-06/27과 S13~S14 최종 회귀는 당시 폐쇄 원장에 기능 `SRC-01~28` 28/28, UI/UX `UX-01~17` 17/17, strict demo **45/45(100%)**를 기록했다. 이 값은 현재 작업본의 자동 재증명 결과가 아니다. 현재 판정은 [CRM 데모 100% 이식 검증 계약](./demo-100-verification-contract.md)에 따라 `verify:crm-current-demo`가 동일 파일내용 지문, fresh current build, 격리 DB/API, 17화면·83상태 browser evidence를 모두 통과한 경우에만 45/45로 복원한다. 실제 외부 배포 입력까지 적용된 런칭 완료는 다시 별도다.

## 2. 독립 정본과 해시

| 원천 | 직접 확인 내용 | SHA-256 | 역할 |
|---|---|---|---|
| `Sales Management System -proto` | `index.html`, `login.js`, `supabase_client.js`, 업무 JavaScript를 직접 읽어 화면·필드·이벤트·계산·CRUD를 추출 | 디렉터리 | 최우선 기능 정본 |
| `Create Table script.txt` | `CREATE TABLE` 23개를 직접 확인 | `7371cad44d811b8050ca28daa2fe32bfb8f1fb3b19f391616c7632ea2ea3fbd6` | 데이터 구조 정본 |
| `영업관리시스템_소개_전체.pptx` | OOXML 텍스트를 확인 | `8d999ec75464fcb95ed83f55ece359cc8f34a9532c482ce69b649bf73e727fa6` | 설명 보조. 코드와 충돌하면 코드 우선 |
| 원천 표본 SQL/런타임 데이터 | 사용자 6, 영업기회 그룹 6/차수 7/상세 53, 계약 5/상세 44/계획 35/실적 5 | 개별 파일 | 표본 값·건수 정본 |

기존 PRD, 패리티 문서, 핸드오프와 verifier 출력은 모두 검증 대상이며 정본으로 사용하지 않는다.

## 3. 원천 분모

### 3.1 화면 분모

원천 `navigate()` 분기에서 확인한 page container는 정확히 17개다. `new`와 `contract-new`는 새 container가 아니라 form alias다.

| 원천 page id | 원천 책임 | SSOO 예정 소유 surface |
|---|---|---|
| `dashboard` | 확정 최신차수 지표, 상태 분포, 최근 5건 | CRM `/` |
| `list` | 최신차수 검색·필터·정렬·이전차수 조회 | CRM `/` |
| `form` | 영업기회 필드·라인·계산·확정·차수·회수 | CRM `/` 상세/편집 |
| `contract-gen` | 확정 영업기회 + DOCX template + 22개 변수 | CRM 업무 입력 + DMS template/artifact |
| `contract-list` | 계약 목록·검색·상태 | CRM `/contracts` |
| `contract-form` | 계약 필드·라인·청구계획·확정·삭제 | CRM `/contracts` |
| `billing-actual` | 확정 계약 월별 실적 full replace | CRM `/contracts` |
| `biz-report` | 계약 청구계획/실적/차이 | CRM `/contract-performance` |
| `biz-plan` | 3개년 계획·차수·확정·이월·붙여넣기 | CRM `/business-plan` |
| `bp-rpt` | 확정 사업계획 대비 확정 계약 청구계획 | CRM `/business-plan-performance` |
| `internal-cost` | 고정 5개 항목 월별 계획·실적·차이 | CRM `/cost-plan` |
| `biz-year` | 사업년도 관리 | CRM `/business-years` |
| `ams-vendor` | 연도별 업체 CRUD와 복수 WBS | CRM `/cost-plan` |
| `ams-cost` | 업체×WBS 월별 계획·실적·차이 | CRM `/cost-plan` |
| `codes` | 사업구분·계열·수금조건 코드 | Admin `/codes` |
| `company` | 공급자 법인정보 | CRM `/quote-settings` |
| `admin` | 사용자 CRUD·비활성·비밀번호 초기화 | Admin `/users` + 공용 사용자 설정 |

### 3.2 DDL 분모

DDL 23개 table은 이름 그대로 복제할 대상이 아니라 다음 기능 집합의 데이터 분모다.

| 기능 집합 | 원천 table |
|---|---|
| 계정 | `users` |
| 영업기회 master/라인 | `opportunities`, `opp_rev_products`, `opp_rev_services`, `opp_cost_products`, `opp_cost_isvc`, `opp_cost_esvc` |
| 코드/회사 | `codes`, `company_info` |
| 계약 master/라인/청구 | `contracts`, `contract_rev_products`, `contract_rev_services`, `contract_cost_products`, `contract_cost_isvc`, `contract_cost_esvc`, `contract_billing`, `contract_billing_actual` |
| 내부원가 | `internal_cost` |
| 사업계획 | `biz_plan`, `biz_plan_monthly` |
| AMS | `ams_vendor`, `ams_vendor_wbs`, `ams_ext_cost` |

### 3.3 원천 계산·상태·문서 규칙

- 대시보드 금액 지표: 최신 차수 중 `is_confirmed`만 집계. 상태 분포와 최근 목록은 확정 여부와 무관한 최신 차수 기준.
- 목록: 최신 차수 기준 검색/상태 필터/매출·이익 정렬, 이전 차수 펼침.
- 원천 대시보드/목록의 `calcRevTotal`은 수량×단가 raw 합계로 special DC/절사를 반영하지 않지만, form/견적은 이를 반영한다. 이는 원천 내부 모순이며 숨기지 않는다.
- 영업기회: 최신 차수만 수정/삭제, 확정 후 잠금, 확정 차수에서 새 차수, 계약 생성 후 회수 또는 확정취소 시 연결 계약 삭제.
- 계약: 고객 담당자, 영업 담당자 FK, 기간, 구분/계열/국내외, WBS, 수금조건, 매출/원가 5개 grid, 청구계획, 확정/해제/삭제.
- 청구실적: 확정 계약만, `(YYYY, MM, 금액)` 행을 full replace. 비어 있지 않은 년/월만 정규식 검사.
- 사업계획: 기준년도 12개월 + 차년도/차차년도 연간 값, 차수·확정·해제·이월·관리자 삭제, 확정 후에도 WBS 수정 가능.
- 사업계획대비실적: 확정 사업계획과 확정 계약의 **청구계획**을 WBS/월 기준으로 비교. `contract_billing_actual`을 사용하지 않는다.
- 내부원가: 5개 고정 항목, 월별 계획/실적/차이. 원천 코드 차이는 계획-실적이며 PPT 문구와 충돌한다.
- 계약서: 확정 영업기회를 선택하고 사용자 DOCX template을 영속 보관한 뒤 22개 변수를 치환해 다운로드.

원천 계약서 22개 변수 분모:

`공급자_회사명`, `공급자_대표자`, `공급자_사업자번호`, `공급자_주소`, `공급자_전화`, `고객사명`, `건명`, `계약금액`, `계약금액_한글`, `외부원가`, `순이익`, `계약시작일`, `계약종료일`, `계약기간`, `사업구분`, `담당자명`, `담당자부서`, `담당자연락처`, `담당자이메일`, `수금조건`, `작성일`, `계약년도`.

## 4. 현재 SSOO 독립 증거

### 4.1 코드·DB·API·타입

| 증거 | 확인 사실 |
|---|---|
| `apps/server/src/modules/crm/opportunity/opportunity.service.ts` | 최신 group 선택, 라인 계산, 확정/해제/차수 API가 있다. Phase 2 S3에서 연결 계약 회수 후 확정 유지와 연결 계약 회수+확정 해제를 지원하고 차수 추가·재전환을 복원했다. |
| `apps/server/src/modules/crm/dashboard/dashboard.service.ts` | 최신 전체 opportunity summary와 6단계 pipeline을 사용한다. 원천 확정 지표 분모와 다르다. |
| `apps/server/src/modules/crm/contract/dto/contract.dto.ts` | Phase 2 S2에서 optional `clientContactName`과 공용 사용자 문자열 ID `ownerUserId`의 whitelist validation/OpenAPI metadata를 추가했다. |
| `packages/database/prisma/schema.prisma`와 `20260814090000_add_crm_contract_party_identity` | 계약 master/history에 nullable `client_contact`, `owner_user_id`를 추가했다. 활성 공용 사용자 FK는 update cascade/delete set-null이며 `owner_name` snapshot을 보존한다. 연결 영업기회 값만 deterministic backfill하고 기존 app-style insert는 계속 허용한다. |
| `apps/server/src/modules/crm/contract/contract.service.ts` | 계약 CRUD는 담당자 FK의 활성 공용 사용자를 검증하고 canonical 이름 snapshot과 고객 담당자를 저장·재조회한다. PMS/DMS preview와 markdown도 두 값을 소비한다. 이 계약 기반 23개 변수 패킷은 원천 22개 계약서와 입력 대상·의미·키가 달라 보존하고, 원천 분모는 opportunity의 별도 S4 흐름에서 검증한다. |
| `apps/server/src/modules/crm/contract/contract.service.ts` recovery transaction | 연결 계약과 영업기회의 ID/code 관계를 검증한 뒤 계약 soft-delete와 영업기회 unlink/status/confirmed 갱신을 한 transaction에서 수행한다. 회수는 확정 상태를 유지하고 확정 해제는 `proposal`로 복구하며 row-count guard가 부분 mutation을 막는다. |
| `apps/server/src/modules/crm/business-plan/business-plan.service.ts` | Phase 2 S6에서 `source-compatible`은 확정 계약의 billing plan을 실적으로 사용하고 pipeline/manual actual/확정원가를 제외한다. 기본 `extended-actual`은 기존 billing actual/direct actual/확정원가 확장을 그대로 보존한다. |
| `apps/server/src/modules/crm/reports/dto/reports.dto.ts` | Phase 2 S1에서 모든 preview/confirm query field에 optional/type/range/enum/length validation과 year number transform을 추가해 global whitelist와 OpenAPI 계약을 일치시켰다. |
| `packages/web-auth/src/login-page.tsx`, `packages/web-auth/src/ui.tsx` | ID/password, 설정 기반 reset/SSO를 유지하면서 CRM opt-in 아이디 저장과 password visibility toggle을 제공한다. 저장 대상은 login ID뿐이고 실패 로그인에서는 기록하지 않는다. |
| source seed migrations | 원천 opportunity 6 group/7 row/53 line, 원천 contract 5/44/35/5가 별도 식별자로 보존된다. |
| `scripts/verify-crm-source-sample.mjs` | 고정 baseline hash로 opportunity 6/7/53과 contract 5/44/35/5 전체 값을 검증하고 격리 DB에서 2회 재시드 동일성과 source 6→central 8 functional alias를 확인한다. |
| `apps/server/src/modules/crm/access`, `18_crm_access_policy_foundation.sql` | 계약·사업계획·원가/AMS·보고·공급자 설정 14 capability를 공용 permission resolver/guard에 연결하고 기준 역할 할당을 삭제 없는 idempotent upsert로 제공한다. |

### 4.2 실제 DB·브라우저 기준선

이번 1단계 관찰에서 확인한 시점별 사실이며 최종 회귀 증거로 재사용하지 않는다.

- DB: opportunity 7 row/53 line, contract 7/51/45/7. 그중 원천 계약 subset은 정확히 5/44/35/5.
- CRM `/`: 최신 group 6개와 원천 표본이 보인다. 현재 metric은 최신 전체 opportunity 총액을 표시한다.
- CRM `/contracts`: 7개 계약, 원천 5개 계약, CRUD/확정/해제/실적/DMS 패킷 surface가 있다.
- CRM `/contract-performance`: 원천 확정 계약 5개와 계획/실적 월별 값이 보인다.
- CRM `/business-plan`, `/cost-plan`: 사업계획 grid와 내부원가 5개 항목이 보인다. AMS source는 현재 0건이다.
- CRM `/business-plan-performance`: 청구실적 기반 값과 수동실적 확장이 보인다. 원천 semantic과 다르다.
- CRM `/reports`: `GET /api/crm/reports/preview?year=2026...`가 400, UI가 validation error를 표시하고 console error가 발생했다.
- CRM `/operations/settings` 직접 URL은 `/`로 redirect됐다. `/settings`는 이전 MDI tab state에 따라 URL과 content가 어긋날 수 있었다.
- viewer는 조회 가능, mutation disabled, 운영 Live section 권한 없음 fallback을 보였다.
- Admin은 사용자 8/역할 4/조직 6/권한 37을 보였다. CRM permission catalog 일부가 `planned`로 표시됐다.
- DMS settings는 root에서 메뉴로 들어가면 readiness 9/9 ready를 보였으나, 이전 fresh API와 Admin summary에는 8/9 blocked 또는 0/0이 관찰됐다. 이는 지속 blocker로 단정하지 않고 시간·cache·cross-surface 일관성 finding으로 둔다.
- desktop 1440급과 mobile 390×844에서 관찰한 주요 CRM/Admin/DMS 화면의 document horizontal overflow는 0이었다.
- DMS에서는 `ws://localhost:4000` 연결 warning이 반복됐다. 현재 관찰에서 page error는 없었다.
- 직접 host mapped port와 build의 표준 `localhost:4000`/CORS 기대가 달라 403·connection refused가 발생했고, 표준 port proxy에서 로그인은 성공했다. production launch config 검증 대상이다.

### 4.3 Phase 2 실행 증거

- S1 reports DTO: DTO unit 3건과 reports service 5건이 통과했고 server TypeScript/build와 CRM production build가 통과했다.
- 격리 서버의 실제 `GET /api/crm/reports/preview?year=2026`는 200으로 응답했고 2026년 실데이터 totals와 drilldown을 반환했다.
- CRM `/reports?year=2026`는 desktop과 390×844 mobile에서 렌더링됐고 mobile document width는 viewport와 같은 390px였다. 해당 page console error/warning은 0이었다.
- S1은 reports runtime finding만 닫는다. BT-17의 settings direct route, error/empty-state 전 범위와 BT-23 production origin/proxy는 아직 미완료다.
- S11은 CRM settings/report/opportunity source URL과 DMS settings/root를 URL-first로 정합화했다. standard/approved-mapped origin에서 API·Socket.IO·deep-link와 미승인 origin fail-closed를 actual browser로 확인해 `SRC-28`, BT-17, BT-23을 폐쇄했다.
- S2 contract party identity: DTO/service/opportunity target 3 suite·50 test와 database contract 9/9, types/database/server/CRM production build가 통과했다.
- disposable clean DB에서 launch migration 8개, seed 37개, application trigger 81개와 runtime contract를 통과했다. populated rehearsal은 영업기회 기반 backfill, history 보존, unknown FK 거부, owner 삭제 시 FK set-null+snapshot 보존, 이전 app-style insert 호환을 확인했다.
- 격리 API에서 admin 저장·재조회와 PMS/DMS 소비는 200, unknown owner는 400, viewer mutation은 403이었다. `/contracts` desktop/mobile fresh browser에서 owner 변경과 고객 담당자 저장·재조회, DMS preview 반영, 관련 API 200, console/runtime error 0, mobile overflow 0을 확인하고 임시 DB·process·browser·marker row를 제거했다.
- S2는 `SRC-15`의 계약 party identity만 닫았고 S4가 별도 opportunity 흐름으로 원천 22변수 계약서 의미/키를 닫았다. 전체 BT-09/24 fresh 회귀는 최종 gate에서 계속 검증한다.
- S3 contract recovery: opportunity+contract target 2 suite·52 test와 server/CRM production build가 통과했다. disposable clean DB에서 launch migration 8개, seed 37개, application trigger 81개, DB contract 9/9와 runtime schema drift 0을 확인했다.
- 격리 실제 API에서 admin 회수, viewer 403, 확정 계약 회수 후 confirmed 유지, repeat idempotency, 차수 추가 복원, 연결 계약 회수+확정 해제, 잘못 연결된 contract 400과 양쪽 원장 mutation 0, `revoke-contract`/`reopen-with-contract-revocation` history를 확인했다.
- CRM 영업기회 화면에서 desktop 1440×1000과 mobile 390×844의 두 action을 실제로 실행했다. 모바일에서 발견한 52px grid row hit-target 결함은 기존 surface를 보존한 responsive row 수정 후 production build와 실제 hit target으로 재검증했다. action proxy는 201, 기대 상태·버튼 복원, 예상 밖 4xx/5xx와 console/runtime error는 0, document overflow는 0이었다. auth/state rehydrate가 이전 GET을 취소한 `net::ERR_ABORTED` 기록은 서버 4xx/5xx나 proxy failure가 아니며 최종 fresh regression에서 다시 분리 확인한다.
- S3는 `SRC-12`만 닫는다. 전체 영업기회/계약 fresh 회귀와 production origin/proxy 계약은 BT-24와 IMP-15에서 계속 검증한다.
- S5 source-compatible dashboard/list: source baseline 6 group의 최신차수와 확정 최신차수 3건을 분리해 확정 매출 694,650,000원, 확정 이익 198,080,000원, 이익률 29%를 실제 DB/API/UI에서 동일하게 확인했다. 원천 4상태는 진행중 2·검토중 1·계약완료 2·실패 1, 최근 항목은 최신 수정순 5건으로 일치했다.
- 목록은 고객명 기본 정렬, 원천 상태 filter, 매출·이익·이익률 정렬, 12개 원천 column과 `2차 → 1차(이전)` inline 탐색을 제공한다. dashboard/list의 source-compatible 지표와 기존 SSOO pipeline·queue·정합 합계는 additive하게 분리해 모두 보존했다.
- types build, dashboard/opportunity target 2 suite·36 test, server build, CRM production build가 통과했다. 격리 DB는 launch migration 9개·application trigger 81개·runtime drift 0을 통과했고 실제 API는 200이었다. desktop 1440×1000과 새 인증 mobile 390×844에서 filter/sort/query/previous-version 탐색, console error/warning 0, document overflow 0을 확인했다.
- S5는 기능 분모 `SRC-05~07`만 닫는다. 원천과 target의 콘텐츠 영역 overlay/perceptual diff 및 상태별 차이 분류가 아직 없으므로 `UX-01~02`는 계속 `부분`이다.
- S6 business-plan performance compatibility: `mode=source-compatible`은 확정 사업계획을 계획으로, 확정 계약 청구계획을 실적으로 사용하고 계약 청구실적·manual actual·확정 내부원가/AMS 원가를 제외한다. 기본 `extended-actual`은 기존 확장을 보존한다.
- 격리 DB의 2026년 확정 계약 청구계획은 18행·매출 913,500,000원·외부원가 535,700,000원, 청구실적은 1행·매출 150,000,000원·외부원가 111,900,000원이었다. 실제 API의 두 모드가 각각 이 합계와 일치했고 source mode 1월 매출 144,458,333원·원가 89,000,000원도 청구계획 월값과 일치했다.
- business-plan target unit 16건, types/server/CRM production build가 통과했다. 최초 종료 점검에서 발견한 server component→client query helper 호출 RSC 예외는 순수 query 모듈 분리 후 새 production build의 직접 URL·강제 새로고침으로 폐쇄했다. desktop 1440px와 fresh-auth mobile 390×844에서 mode URL·선택값·기존 직접실적 패널 보존/숨김을 확인했고 console error/warning과 document overflow는 0이었다. S6는 `SRC-22`만 닫으며 overlay/perceptual diff와 전체 state pair가 없는 `UX-10`은 `부분`이다.
- S7 shared substitution: CRM opt-in login ID 저장·password visibility, invalid login, 성공 후 ID-only 복원, 30분 activity 연장과 31분 idle 401/redirect를 actual browser/API/DB에서 확인했다. 명시적 audit `lastActivity`가 공통 extension fallback에 덮이던 결함을 수정하고 정적 회귀 계약을 추가했다.
- 공용 개인 설정은 name/dept/position/tel/email과 display name 저장·reload, optional 빈 문자열 clear, 새 password mismatch·현재 password 오류·정상 변경·타 session revoke·원래 password/profile 복원을 통과했다. mobile 390×844에서 공용 `pageAction` 36px 리듬과 document overflow 0을 확인했다.
- Admin `/users`, `/codes`, `/business-years`에서 disposable user CRUD·비활성/재활성·reset mail·viewer UI/API 403, code/year CRUD·활성 selector 소비·중복 validation을 실제로 수행했다. CRM seller/CI는 업로드·저장·reload 후 견적 preview, 원천 22변수 계약 preview, 확정 계약 DMS 문서 패킷의 verified CI attachment/readiness까지 소비됨을 확인하고 원래 snapshot으로 복원했다.
- auth/web-shell/Admin/CRM production build를 통과했고 `/favicon.ico` 공용 compatibility rewrite를 추가해 fresh browser의 비인증 bootstrap 예상 401 외 favicon/network/runtime 오류를 제거했다. 임시 code/year는 0건, disposable user는 비활성·active session 0, seller/CI는 원복했다. S7은 `SRC-01~04`를 닫지만 source content overlay·전체 state pair가 남은 `UX-12/15/16/17`은 `부분`이다.
- S8 permission/sample/AMS: CRM 25개 permission을 Admin catalog `launch-active`로 정합화하고 `roleCode`를 auth source로 사용하지 않는 14개 domain capability snapshot/guard를 계약·사업계획·원가·보고·공급자 설정 API와 UI에 연결했다. 격리 DB에서 role assignment admin 25/manager 21/user 14/viewer 8, 전체 120건이 seed 2회 전후 동일함을 확인했다.
- 실제 API에서 viewer read 200/write 403, user write 2xx/confirm 403, manager confirm·reopen 2xx, admin 전체 capability를 검증했다. AMS disposable 흐름은 업체 생성, 확정 AMS WBS 2개, 계획/실적 각 24셀, source annual 저장·재조회·cascade delete와 extended monthly 저장→확정→수정 400→해제→재저장을 통과하고 residue 0으로 정리했다.
- desktop user browser에서 업체 생성·2 WBS 선택·계획/실적 각 24셀 paste·저장·reload 값 재조회·연관 원가 삭제 경고/cascade 삭제를 실행했다. viewer 조회 전용, manager 확정 제어/공급자 설정 read-only, admin 공급자 설정 edit 가능을 fresh context로 확인했고 mobile 390×844 document overflow와 네 역할 화면 console error는 0이었다.
- 고정 sample baseline은 opportunity 6 group/7 version/53 line, contract 5/44/35/5의 모든 값 hash와 combined hash를 검증한다. 원천 account 6개는 중앙 8개와 동일인으로 주장하지 않고 owner snapshot을 보존하는 functional alias manifest로만 연결한다. S8은 `SRC-24~27`을 닫지만 source/target overlay가 없는 `UX-13~14`는 계속 `부분`이다.

## 5. 원천 패리티 판정표

상태 정의:

- `완료`: 현재 코드/DB/API/브라우저 증거가 원천 기능과 같은 데이터 흐름을 보인다. 최종 Ralph fresh run은 별도 필수다.
- `부분`: surface 또는 일부 흐름은 있으나 입력·계산·상태·문서·권한 중 하나 이상이 다르거나 끊긴다.
- `누락`: 원천 기능을 현재 사용자 흐름에서 실행할 수 없다.
- `치환 검증`: 공용 Admin/Auth/DMS가 소유하며 중복 구현하면 안 되지만 원천 시나리오 전체 증거를 다시 닫아야 한다.
- `원천 모순`: 원천 내부 구현이 서로 충돌한다. 2단계에서 현재 정합성을 보존하면서 source-compatible evidence를 분리한다.

| ID | 원천 분모 | 현재 판정 | 직접 근거 | 2단계 작업/검증 매핑 |
|---|---|---|---|---|
| SRC-01 | 로그인 ID/password, 표시 전환, 아이디 저장 표시, reset/SSO 표시, 30분 session | 완료 | S7에서 CRM만 opt-in하는 ID-only 저장과 password visibility를 추가했다. invalid login 미저장, 정상 login/reload 복원, 30분 activity 연장과 31분 idle 401/returnTo redirect를 actual browser/API/DB에서 확인했고 reset/SSO 표시는 보존했다. | IMP-01, BT-01, BT-24 최종 fresh 회귀 |
| SRC-02 | 사용자 프로필 name/dept/job/tel/email/password | 완료 | S7 공용 `/settings`에서 name/dept/position/tel/email/display name 저장·reload와 optional clear, password mismatch·현재 password 오류·정상 변경·타 session revoke·원래 profile/password 복원을 desktop/mobile에서 확인했다. | IMP-02, BT-02, BT-24 최종 fresh 회귀 |
| SRC-03 | 사용자 CRUD, 비활성, reset, 관리자 메뉴 | 완료 | S7 Admin actual UI/API에서 disposable 사용자 생성·수정·비활성·재활성·reset mail, viewer Admin 접근 fallback과 direct write 403, session revoke를 확인했다. 검증 계정은 최종 비활성·active session 0으로 정리했다. | IMP-02, BT-03, BT-24 최종 fresh 회귀 |
| SRC-04 | 코드/사업년도/회사정보 CRUD와 selector 소비 | 완료 | S7 Admin code/year CRUD·활성 selector 소비·중복 차단과 CRM seller/CI 저장·reload를 확인했다. disposable 판매자/CI는 견적, 원천 22변수 계약, 확정 계약 DMS preview의 verified attachment에 소비됐고 원래 snapshot으로 복원했다. 실제 운영 법인값/CI는 기능 점수와 분리된 EXT-01이다. | IMP-03, BT-03, BT-14, BT-24 최종 fresh 회귀 |
| SRC-05 | 대시보드 확정 최신차수 금액·이익·이익률 | 완료 | S5에서 최신 group 6건과 확정 최신차수 3건을 분리했다. 실제 DB/API/UI가 확정 매출 694,650,000원, 이익 198,080,000원, 이익률 29%로 일치하며 기존 SSOO 지표도 별도 영역에 보존했다. | IMP-04, BT-04, BT-24 최종 fresh 회귀 |
| SRC-06 | 최신차수 상태 분포와 최근 5건 | 완료 | S5 actual runtime에서 진행중 2·검토중 1·계약완료 2·실패 1과 최신 수정순 5건의 표시·drilldown을 확인했다. 기존 6단계 pipeline/queue는 source-compatible 영역 밖에 additive하게 보존했다. | IMP-04, BT-04, BT-24 최종 fresh 회귀 |
| SRC-07 | 목록 검색·상태·매출/이익 정렬·이전차수 | 완료 | S5에서 고객명 기본 정렬, 원천 4상태 filter, 매출·이익·이익률 정렬, 12개 원천 column, `2차 → 1차(이전)` inline 탐색을 API와 desktop/mobile browser에서 확인했다. | IMP-04, BT-05, BT-24 최종 fresh 회귀 |
| SRC-08 | 영업기회 전 필드와 5개 line grid 저장/재조회 | 완료 | 현재 opportunity DTO/model/UI/DB에 client contact, owner lookup, business/industry/region/payment/DC와 5 line 종류 존재 | BT-05 |
| SRC-09 | form/견적 DC·절사 계산 | 완료 | current payload가 subtotal-special discount를 저장하고 quote가 같은 total을 소비 | BT-05, BT-06 |
| SRC-10 | dashboard/list raw 계산 | 완료/원천 모순 | 원천 `app.globals.js`/`app.list.js`는 line raw 합계를 쓰고 `app.form.js`/`app.quote.js`는 절사·Special DC 후 최종값을 써 서로 모순이다. SSOO는 이를 하나로 덮지 않고 source-compatible dashboard/list raw 합계와 기존 form/quote subtotal·DC·final을 additive하게 보존한다. 고정 표본에서 raw 162,000,000원, DC 5,000,000원, final 157,000,000원을 actual API와 `BT-06` artifact로 재검증했다. | IMP-04, BT-04, BT-05, BT-06 |
| SRC-11 | 확정·해제·차수·최신/이전 잠금·삭제 | 완료 | transaction/guards/UI와 actual browser surface 확인 | BT-05 |
| SRC-12 | 계약 생성 후 영업기회에서 계약 회수 및 확정취소 | 완료 | S3에서 `revoke-contract`와 linked-contract-aware `reopen`을 transactional하게 추가했다. actual DB/API에서 확정 계약 soft-delete, 확정 유지 또는 해제, idempotency, relationship guard/rollback, history를 확인하고 desktop/mobile UI에서 action·재활성화 버튼·상태 복구를 검증했다. | IMP-05, BT-07, BT-24 최종 fresh 회귀 |
| SRC-13 | 견적 preview, 공급자/담당자, 인쇄/PDF | 완료 | `BT-06`에서 원천 고정 표본의 제품 90,000,000원·서비스 72,000,000원·DC 5,000,000원·최종 157,000,000원, 월별 결제조건, 담당자 연락처, 공급자 CI binary hash, 20개 DMS 변수를 exact 검증했다. desktop/mobile preview, source형 인쇄 팝업, 브라우저 PDF reopen, 실제 DOCX/PDF DMS lifecycle과 미해결 placeholder 0, 설정·DB·파일 residue 0을 통과했다. | IMP-06, BT-06 |
| SRC-14 | 확정 영업기회 선택, 복수 DOCX template, 22변수 계약서 download | 완료 | S4에서 confirmed/latest opportunity를 입력으로 하는 별도 preview/draft/lifecycle/artifact 흐름을 추가했다. CRM은 원천 순서 그대로 22개 한글 변수 snapshot과 handoff 원장을 소유하고 DMS는 용도별 active DOCX binary·버전·검토 기록·render·storage를 소유한다. actual DB/API에서 admin allow/viewer deny, 저장·재조회, 동일 idempotency key 409/DB 불변, active handoff 1건, 실제 DOCX 22값 치환·미해결 placeholder 0을 확인했으며 desktop/mobile production browser에서 생성·다운로드, console/network failure 0과 390px overflow 0을 확인했다. 기존 contract DMS packet과 quote workflow는 보존했다. | BT-08, BT-24 최종 fresh 회귀 |
| SRC-15 | 계약 core: customer contact, assignee FK, 기간/분류/WBS/payment | 완료 | S2에서 nullable customer contact와 active common-user FK 담당자를 master/history/API/type/UI에 추가했다. actual DB/API/browser에서 저장·재조회, canonical snapshot, PMS/DMS 소비, admin allow/viewer deny, invalid FK, owner 삭제 set-null을 확인했다. 기존 기간/분류/WBS/payment 흐름은 보존했다. | BT-09, BT-24 최종 fresh 회귀 |
| SRC-16 | 계약 5개 line, 계산, CRUD, 확정/해제/삭제 | 완료 | current contract service/UI/DB에 transaction과 workflow 존재 | BT-09 |
| SRC-17 | 청구계획 합계 검증과 자동분할 | 완료/원천 모순 | current는 revenue와 product+external cost equality를 방어. 원천 auto split은 all cost를 써 validator와 충돌 | IMP-07은 current 방어 유지, BT-09 |
| SRC-18 | 확정 계약 청구실적 full replace/잠금 | 완료 | actual API/UI 존재, confirmed gate 관찰 | BT-10 |
| SRC-19 | 계약대비 월별 계획/실적/차이 | 완료 | `/contract-performance` 실제 source 5계약 plan/actual 표시 | BT-10 |
| SRC-20 | 3개년 사업계획 값/행 CRUD/paste | 완료 | source-compatible grid와 persistence surface 확인 | BT-11 |
| SRC-21 | 사업계획 차수·확정·해제·이월·삭제·WBS 예외 | 완료 | current plan ledger/API/UI에 해당 workflow 존재 | BT-11 |
| SRC-22 | 사업계획대비실적 = 확정 계획 대 확정 계약 청구계획 | 완료 | S6 `source-compatible` 모드는 확정 사업계획을 계획, 확정 계약 청구계획을 실적으로 비교한다. 격리 DB/API에서 청구계획 913,500,000원/535,700,000원과 청구실적 150,000,000원/111,900,000원의 의도적 차이를 정확히 분리했고 desktop/mobile E0를 통과했다. 기존 청구실적·manual actual·확정원가 확장은 기본 `extended-actual`로 보존했다. | IMP-08, BT-12, BT-24 최종 fresh 회귀 |
| SRC-23 | 내부원가 5항목 월별 계획/실적/차이·paste | 완료 | `/cost-plan` 5-item source grid 확인 | BT-13 |
| SRC-24 | AMS 연도별 업체 CRUD·복수 WBS | 완료 | S8 actual API와 user desktop browser에서 2098 disposable 업체를 생성하고 확정 AMS 계약 WBS 2개를 매핑했다. 연관 source cost가 있는 업체 삭제 경고와 cascade 삭제, reload와 residue 0을 확인했다. | IMP-10, BT-13, BT-24 최종 fresh 회귀 |
| SRC-25 | AMS 업체×WBS 월별 계획/실적/차이·paste | 완료 | S8 browser에서 계획 24셀·실적 24셀 paste, 저장·reload exact 값과 차이를 확인했다. API에서는 extended monthly 저장, user confirm 403, manager confirm, 확정 중 수정 400, reopen 후 재저장과 cleanup을 통과했다. | IMP-10, BT-13, BT-24 최종 fresh 회귀 |
| SRC-26 | 역할별 메뉴·mutation allow/deny | 완료 | S8에서 25개 CRM permission이 Admin live catalog에 표시되고 14 domain capability가 공용 resolver/guard/UI snapshot을 공유한다. admin/manager/user/viewer API matrix와 fresh browser read-only/edit/confirm/settings 상태를 확인했다. `roleCode`는 표시만 보존하고 auth source로 사용하지 않는다. | IMP-09, BT-15, BT-24 최종 fresh 회귀 |
| SRC-27 | 원천 표본 데이터 exact count/value/idempotency | 완료 | 고정 SHA-256 baseline으로 opportunity 6/7/53과 source contract 5/44/35/5 전체 값을 검증하고 2회 reseed 동일성을 통과했다. 원천 6계정과 중앙 8계정은 동일인 대체가 아닌 명시적 functional alias이며 production account를 만들지 않는다. | IMP-10, BT-16, BT-24 최종 fresh 회귀 |
| SRC-28 | 오류/빈 상태/수동 복구/권한 fallback | 완료 | reports validation은 S1, 권한 fallback은 S8, readiness의 false-ready/0 fallback은 S9, 실패 원장·수동 복구는 S10에서 닫았다. S11은 CRM settings/report/source deep link와 DMS settings/root의 URL-first direct/reload/back/forward, standard/approved-mapped origin API·Socket.IO를 actual browser에서 통과해 잔여 route/proxy mismatch를 폐쇄했다. | IMP-11, IMP-15, BT-17, BT-23 |

## 6. 원천 밖 확장

다음은 보존하되 원천 패리티와 필수 운영 완료 점수에서 제외한다. 삭제·축소·대체는 Behavior Impact Gate 없이 수행하지 않는다.

| 확장 | 현재 예 | 처리 |
|---|---|---|
| `roleCode` 노출 | 공용 profile과 사용자 surface의 시스템 역할 | 보존. verifier/문서 충돌만 비가시적으로 정합화 |
| 회계 payment executor/evidence | CRM cost/accounting handoff | 보존. production demo 필수 기능으로 계산하지 않음 |
| CRM customer/activity workspace | `/customers` | 보존, 별도 운영 surface |
| AI/RAG index/provider report | CRM search/index adapter | 보존, 원천 100% 근거로 쓰지 않음 |
| PMS handoff | contract PMS preview/accept | 보존, 원천 필수 아님 |
| DMS governance | 승인선, lifecycle, output policy, Git/storage/ingest | 보존. 원천 DOCX 22변수 산출을 대신한 것으로 계산하지 않음 |
| 보고 snapshot | `/reports` confirm/reopen | 보존. launch P1 runtime defect는 별도 수정 |

## 7. 실제 운영 법인정보와 asset

회사정보·CI 관리, 저장, 견적/계약 문서 소비는 `SRC-04`, `SRC-13`, `SRC-14`의 원천 기능이다. 그러나 다음 실제 값은 코드나 seed로 추측하지 않는다.

| 외부 배포 입력 | 현재 관찰 | 완료 영향 |
|---|---|---|
| 법인명 | `SSOO 영업팀` placeholder | 기능 패리티와 분리. production readiness blocker |
| 대표자명 | 미입력 | production readiness blocker |
| 사업자등록번호 | 미입력 | production readiness blocker |
| 주소 | 미입력 | production readiness blocker |
| 전화/e-mail | 확정 필요 | 문서 표시 입력 |
| CI binary/asset | 미등록 | production readiness blocker |

## 8. 1단계 종료 및 2단계 완료 규칙

1단계는 다음을 모두 만족할 때만 닫는다.

1. 이 문서의 원천 분모와 `launch-operations-prd.md`의 운영 분모가 섞이지 않는다.
2. 모든 `부분`·`누락`·`치환 검증`이 `IMP-*`와 `BT-*`에 매핑된다.
3. 원천 모순은 숨기지 않고 기존 정합 동작을 보존하는 additive 설계를 갖는다.
4. 실제 법인값·credential·asset 등 미확정 사실이 외부 입력으로 분리된다.

최종 원천 100%는 모든 `SRC-*`와 `UX-*`가 fresh DB/API/desktop/mobile 및 source-reference 비교 증거로 닫히고, 원천 밖 확장을 분모에 넣지 않았을 때만 선언한다.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-08-19 | Phase 2 S8에서 공용 domain permission/catalog/guard, 네 역할 allow·deny, seed 2회 동일성, 원천 sample 값 hash·functional identity alias, AMS 업체·복수 WBS·월별 paste·확정 잠금·삭제를 actual DB/API/desktop/mobile로 닫아 SRC-24~27을 완료 처리. 시각 overlay가 남은 UX-13~14는 부분 유지하고 현재 단계를 S9 준비로 전환 |
| 2026-08-19 | Phase 2 S7에서 CRM 로그인 control, 공용 profile/password, Admin user/code/year, seller/CI 문서 소비를 actual allow/deny/failure/복구와 desktop/mobile로 폐쇄해 SRC-01~04를 완료 처리. 운영 법인값은 EXT-01, UX-12/15/16/17은 S12 시각 패리티로 분리하고 현재 단계를 S8 준비로 전환 |
| 2026-08-18 | Phase 2 S6에서 사업계획대비실적 `source-compatible`/`extended-actual` 모드를 분리하고 source mode의 실적을 확정 계약 청구계획으로 고정했다. 실제 DB/API/desktop/mobile로 SRC-22를 폐쇄했으며 시각 diff 미완료인 UX-10은 부분 유지 |
| 2026-08-18 | Phase 2 S5에서 source-compatible dashboard/list를 additive하게 구현하고 확정 최신차수 지표·4상태·최근 5건·원천 정렬/filter·12 column·이전차수 탐색을 actual DB/API/desktop/mobile로 검증해 SRC-05~07을 폐쇄. 시각 diff 미완료인 UX-01~02는 부분 유지 |
| 2026-08-18 | 원천 UI/UX 디자인 무변경을 별도 `UX-01~17` 분모로 연결하고 `REF-01` 시각 reference 복구 전 Phase 1/최종 100% 선언을 금지 |
| 2026-08-14 | Phase 2 S3에서 영업기회 연결 계약 회수와 회수+확정 해제를 단일 transaction/API/UI action으로 이식. 확정 계약 회수, 확정 유지/해제, idempotency, relationship guard와 rollback, 차수 추가·재전환 복원, history를 실제 DB/API와 desktop/mobile browser에서 검증하고 모바일 hit-target grid 결함을 additive하게 수정해 SRC-12를 폐쇄 |
| 2026-08-14 | Phase 2 S2에서 계약 고객 담당자와 공용 사용자 FK 담당자를 schema/history/type/API/UI에 additive하게 이식. clean+populated DB migration/rollback compatibility, actual API allow/deny/invalid FK, PMS/DMS 소비, desktop/mobile 저장·재조회, console/runtime error 0, residue 0 증거로 SRC-15를 폐쇄 |
| 2026-08-14 | Phase 2 S1에서 reports query validation/OpenAPI runtime 불일치를 수정하고 unit·service·server/CRM build와 실제 API 200, desktop/mobile browser, console 0 증거로 해당 finding만 폐쇄 |
| 2026-08-14 | 기존 100% 완료 주장을 폐기하고 원천 코드·DDL·표본을 독립 정본으로 재검수. 대시보드 분모, 계약 core/회수, 계약서 22변수, 사업계획 실적 semantic, login control, reports runtime 결함을 부분/누락으로 재분류 |
