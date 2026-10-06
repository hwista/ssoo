# CRM 원천 데모 직접 테스트 가이드

> 기준일: 2026-08-18  
> 범위: 기능 `SRC-01~28`, UI/UX `UX-01~17`. 보호 발표자료는 선택 보조 자료

이 문서는 원천 데모 이식 결과를 개발 환경에서 사람이 직접 재현하는 최소 절차다. 완료 판정과 항목별 증거는 [원천 기능 패리티 매트릭스](../planning/source-parity-matrix.md)를 정본으로 사용한다.

## 1. 실행

```bash
pnpm install
pnpm run db:up
pnpm run db:push
pnpm run db:seed
pnpm run dev:server
```

별도 터미널에서 다음 앱을 실행한다.

```bash
pnpm --filter web-crm dev
pnpm --filter web-admin dev
pnpm --filter web-dms dev
```

기본 주소는 CRM `http://localhost:3001`, Admin `http://localhost:3000`, DMS `http://localhost:3003`, Server API `http://localhost:4000/api`다. 개발 seed 계정은 `admin` / `admin123!`이며 운영 환경에서는 사용하지 않는다.

## 2. 원천 seed 기준값

`pnpm run db:seed`는 다음 원천 표본을 idempotent하게 적용한다.

- 영업기회: 6개 group, 7개 version row, 53개 매출·원가 line
- `52_crm_opportunities.sql`의 원천 6그룹만 있을 때 대시보드 확정 집계: 4건, 절사·DC 전 매출 1,269,500,000원. 삼성전자 ERP는 미확정 2차가 있어도 확정 1차를 집계한다.
- 전체 seed에는 `58_crm_source_uiux_reference.sql`의 2그룹도 포함된다. 전체 seed 직후에는 8그룹·확정 6건·매출 1,526,500,000원이다. 추가 업무 데이터가 있는 환경에 고정값을 적용하지 않는다.
- 삼성전자 ERP: 확정 1차와 미확정 2차가 함께 존재
- 계약: `crm-source-ct-001~005` 5건, 44개 line, 35개 청구계획, 5개 청구실적
- 원천 계약의 계약금액과 청구합계가 다른 경우도 원천값을 보존하며 화면에서 차이를 경고

원천 seed 정본은 `packages/database/prisma/seeds/52_crm_opportunities.sql`과 `packages/database/prisma/seeds/56_crm_source_contracts.sql`이다.

## 3. 핵심 사용자 시나리오

1. CRM 홈 대시보드(`/`, 기존 `/?sourceSurface=dashboard`도 호환)에서 DB 표본에 맞는 그룹 수와 확정 집계를 확인한다. 위 전체 seed 기준으로 8그룹·확정 6건·매출 1,526,500,000원이다. 일반 홈의 SSOO 운영 지표는 최신 전체 차수의 DC·절사 후 금액이므로 구분한다.
2. 삼성전자 ERP를 열어 2차가 최신 미확정이고 1차가 확정 상태인지 확인한다. 매출 상품·용역과 원가 상품·내부용역·외부용역의 분류와 계산을 확인한다.
3. 새 영업기회를 전 필드로 저장한 뒤 재조회하고, 확정 → 새 차수 → 최신 미확정 삭제 → 이전 차수 자동 선택 규칙을 확인한다.
4. 확정 영업기회를 계약으로 전환하고 WBS와 계약 line을 저장한다. 기간 자동분할 후 매출·원가 분할합계의 차이가 0인지 확인한다.
5. 계약 확정 후 월별 청구실적을 저장하고 계약대비실적에서 계획·실적·차이를 확인한다. 확정 해제 후 실적 입력과 저장이 잠기는지 확인한다.
6. 견적/계약 문서에서 DMS에 등록한 실제 DOCX template을 선택해 산출하고, 다운로드한 DOCX를 열어 한글·금액·계약 변수가 치환됐는지 확인한다.
7. 사업계획에서 3개년 값, 12개월 매출·외부원가, 행 추가·수정·삭제, TSV 붙여넣기, 차수 확정·해제·삭제를 확인한다.
8. 원가/AMS에서 내부원가 고정 5개 항목, 업체 master CRUD, 다중 WBS, 업체×WBS 12개월 계획·실적 붙여넣기와 정산 잠금을 확인한다.
9. Admin에서 공통코드를 관리하고 CRM `/business-years`에서 사업연도를 추가·활성화·비활성화·삭제한 뒤 CRM 조회조건에 반영되는지 확인한다. 사용자 역할별로 조회/생성/수정/확정 권한이 제한되는지 확인한다.
10. 프로필·비밀번호 변경, 30분 idle 정책, 공급자 회사정보와 CI 업로드·문서 소비를 확인한다.

검증 중 만든 영업기회, 계약, 사용자, 코드, 사업년도와 업로드 파일은 확인 후 삭제한다. 원천 seed code를 운영 데이터처럼 수정하지 않는다.

### 영업기회 현황 재검수

`/opportunities?sourceSurface=list`에서 11개 이상 그룹의 전체 행 노출을 확인한다. 소수 수량·절사·DC가 있는 표본으로 행/요약/매출·이익 정렬과 이전 차수 금액을 비교한다. 현황 API는 `view=source-list`일 때 고객/영업기회/담당자 검색과 원값 정렬을 적용하며, 기존 응답의 원장 금액은 바꾸지 않는다. 이전 차수의 원값은 `sourceTotals`다. 일반 작업공간의 기존 정렬/페이지 구분은 유지한다.

공백을 포함한 검색어를 한 글자씩 입력하고 초점·입력·필터를 보존하는지 확인한다. 이전 차수 버튼 Enter/Space는 펼침/접힘만 수행해야 하며 이전 행 링크는 해당 차수의 읽기 전용 상세로 이동해야 한다. 뒤로가기·새로고침과 조회 계정·503 후 재조회를 확인한다. 계산 예제는 `pnpm run verify:crm-source-list`, 실제 증거는 `output/playwright/crm-opportunity-list/verification.json`을 따른다.

## 4. 자동 회귀 게이트

`CRM_SOURCE_PROTOTYPE_DIR`는 `index.html`, `login.js`, `supabase_client.js`가 있는 실제 앱 루트를 지정한다. 다운로드 폴더가 동일 이름의 폴더를 한 번 더 감싼 현재 제공본처럼 sibling 없는 단일 wrapper라면 상위 wrapper 경로도 허용하며 verifier가 내부 유일 앱 루트를 자동 해석한다. wrapper에 파일이나 다른 폴더가 함께 있으면 잘못된 원천 선택을 막기 위해 실패한다.

```bash
pnpm run verify:crm-launch
pnpm run verify:crm-local
pnpm run verify:crm-migration-completion
pnpm run verify:crm-goal-contract
CRM_SOURCE_UIUX_MANIFEST=<source-uiux-manifest.json> CRM_TARGET_UIUX_MANIFEST=<target-uiux-parity-manifest.json> pnpm run verify:crm-uiux-parity:all
CRM_SOURCE_SAMPLE_DATABASE_NAME=<ssoo_crm_ralph_db> pnpm run verify:crm-source-sample
CRM_SOURCE_SAMPLE_DATABASE_NAME=<ssoo_crm_ralph_db> pnpm run verify:crm-source-sample:reseed
CRM_RALPH_DATABASE_NAME=<ssoo_crm_ralph_db> pnpm run verify:crm-domain-access-runtime
pnpm run docs:verify
pnpm run codex:preflight
pnpm run codex:verify-sync
```

`verify:crm-migration-completion:with-extensions`는 외부 회계 provider, 공용 AI/RAG provider, DRM 보호자료 reflection까지 요구하는 별도 확장 감사다. 이 확장 감사는 데모 패리티 분모를 대신하지 않는다. 데모 100%는 `verify:crm-goal-contract`의 REF-01 검사와 `SRC-01~28`·`UX-01~17`의 실제 fresh 증거가 함께 닫혀야 한다.

`verify:crm-uiux-parity:all`은 각 UX의 전체 필수 state에 대해 같은 이름의 source screenshot, 고유 desktop/mobile target screenshot, 구조·interaction·content visual diff, 허용 차이 분류, browser E0를 요구한다. target 정상 화면 하나나 기능 테스트만으로는 통과하지 않는다.

## 2026-09-30 등록/상세 회귀 검수

공용 개발 DB에 재시드를 수행하지 않는다. launch migration/seed를 적용한 격리 DB와 해당 API를 향하는 CRM production build에서 검증한다. 자동 계산 회귀는 `pnpm run verify:crm-source-form`이다.

1. 고객/건명/담당자/사업구분을 입력하고 계열구분·다음 행동은 비운다. 기간 2026-09-01~2026-10-02가 1개월 1일인지 확인한다.
2. 상품 원가 3×12,345원을 매출에 연동한다. 매출 이익률 20% → 단가 15,431원, 절사 1,000 → 금액 46,000원인지 확인한다. 다른 원가 행을 고쳐도 이 값은 유지돼야 한다.
3. 소속만 입력한 용역과 내부/외부 원가를 추가해 저장/재조회한다. 연동 단가·절사가 유지되고 수량 0이 이전 저장 금액으로 돌아가지 않는지 확인한다. 할인율 소수 입력도 저장한다.
4. 확정·새 차수·이전/최신 차수 이동·새 차수 삭제·확정취소를 실제 양식에서 실행한다. 이전 차수와 조회 계정의 필드는 잠겨야 한다.
5. 다시 확정한 뒤 계약생성·계약취소를 실행한다. 계약취소 후 계약 연결은 해제되고 영업기회는 확정 상태여야 한다.
6. 저장 503 주입 후 공용 오류 안내, 입력 보존과 재시도, 390×844 본문 가로 넘침을 확인한다. 증거는 `output/playwright/crm-opportunity-form/verification.json`에 기록한다.

DC 상한, 정수 원장과 소수값, 상태 매핑, 저장 후 원가 연동 유지의 정책 차이는 [검수 대장](../planning/2026-09-30-menu-functional-audit.md)의 잔여 항목이다.

## 2026-10-01 상태/금액 경계 회귀 검수

1. 검토중/검증/진행중/계약완료 각각 확정 후 영업상태가 유지되는지 확인한다. 차수 추가도 같은 상태를 복사하고 확정취소는 진행중으로 바뀌어야 한다. 보류/실패의 기존 확정 제한은 유지한다.
2. 수량×단가/절사를 `0.1×9,999/1,000`, `2.3×100/10`, `0.29×100/1`, `0.5×123/0`, `0.01×19,999/100`, `1.234×1,000/0`으로 입력한다. 각 금액은 0/230/29/62/100/1,230원이다. 마지막 수량은 저장 시 1.23으로 정규화한다.
3. 위 소계 1,651원에 API 할인율 12.345를 전달하면 저장율 12.35%, 적용 할인 204원, 최종 1,447원이어야 한다. 화면의 두 자리 할인율 계산도 일치해야 한다. 계약 전환 후 각 행과 합계를 재확인한다.
4. 금액 할인 1.499원은 1원, 매출 초과 금액 할인은 매출 한도로 적용한다. 할인율 100 초과는 양식과 API에서 거절한다. 금액 입력의 브라우저 `step` 유효성과 API 정규화 검증은 구분한다.
5. 양식에서 할인 전 매출·적용 할인·최종액을 확인하고 저장·재조회한다. 기존 금액이 있는 계약 행의 수량을 0으로 바꿔 이전 금액이 되살아나지 않는지 확인한다.

회귀 명령 `pnpm run verify:crm-source-form`은 두 편집기의 32개 계산/직렬화 검사를 실행한다. API/브라우저 증거는 `output/playwright/crm-form-policy-20261001/verification.json`을 따른다. 현재 정수 원장/DC 상한을 유지하며 원천 정책과 완전 일치로 판정하지 않는다.

## 2026-10-01 수금조건·담당자·미선택과 견적 출력

현재 `pnpm run verify:crm-source-form`은 신규 기본 지역과 다섯 조회 URL을 포함해 38개를 검사한다. 아래 변경/비활성화/계약 확정은 반드시 격리 DB 표본에서 수행한다.

1. 공통 수금조건 코드를 만들어 양식에 저장한다. 이름 변경·비활성화 후에도 기존 선택과 견적 및 계약서의 수금조건 이름이 동일해야 한다. 활성 코드가 없으면 신규 양식에 과거 고정 코드가 되살아나면 안 된다. 기존 선택을 지워 저장·재조회한다.
2. 담당자 도움창에서 선택을 바꾼 뒤 취소하면 원래 선택을 유지해야 한다. 부서명/조직 코드로 검색해 확인하고 이름과 ID를 저장한다. 검색 결과 없음과 조회 503 후 재검색에서도 원래 선택을 보존한다.
3. 신규 영업기회의 국내/해외는 미선택이다. `unspecified`가 저장·수정·계약 전환·계약 확정 후에도 유지돼야 한다. 동일한 미선택 표본을 보고의 미선택과 국내로 각각 조회해 pipeline 및 계약 청구계획이 국내에 섞이지 않는지 확인한다. 기존 국내 데이터는 바꾸지 않는다.
4. 상품 3×12,345원/절사 1,000원, 용역 2×5,000원, DC 3,000원인 최신 확정 영업기회의 견적을 연다. 상품 37,000원·용역 10,000원·최종 44,000원과 수금조건/두 담당자를 미리보기·인쇄 창·PDF에서 대조한다. 이전 차수의 견적 잠금과 팝업 차단 안내는 유지한다.
5. 1440×1000과 390×844에서 도움창/견적을 확인한다. 애니메이션 완료 후 캡처하며 문서 안쪽 스크롤과 페이지 전체 넘침을 구분한다. 증거는 `output/playwright/crm-form-detail-20261001/verification.json`이다.


## 2026-10-06 회사정보 회귀 검수

격리 DB에서 원본 공급자 profile을 먼저 기록한다. `/quote-settings?mode=source-compatible`의 회사명·대표이사·사업자번호·주소·전화·팩스·웹사이트·CI 경로를 저장/재조회하고, 조회·권한 실패의 재시도와 저장 실패 후 초안 보존을 확인한다. 조회 전/저장/업로드 중 입력과 중복 실행은 잠긴다. 원천 CI 경로 편집은 빈 값이면 미설정, 값이 있으면 설정 상태를 함께 저장하며 실제 파일 존재/유효성은 기존 CI 조회 계약을 따른다.

일반 `/quote-settings`에서 CI 업로드에 실패한 후 같은 PNG를 다시 선택한다. 업로드 중 저장/새로고침이 잠기고 완료 후 별도 저장으로 적용되는지 확인한다. 영업기회 견적서에 최신 회사명·대표자·주소·전화와 인증된 CI 그림이 표시되는지, 생성한 계약 DOCX에 공급자 5개 변수가 치환되는지 확인한다. 조회 전용 계정에서는 안내와 편집/저장 잠금을 확인한다. 모바일은 내용 스크롤 후 저장 버튼 접근을 확인한다.

원천의 빈 회사명 허용·공백 유지·빈 CI 기본 상대 경로와 SSOO의 필수 회사명·trim·DMS 저장소 계약은 구분한다. 검증 후 원본 profile 복원, DB 수정 이력 확인과 전용 파일/DB 정리를 수행한다. 증거와 한계는 [18차 검수 대장](../planning/2026-09-30-menu-functional-audit.md)을 따른다.

## 2026-10-06 사용자 관리·개인 설정 회귀 검수

격리 DB에 100명 초과 사용자를 만들고 `/users?mode=source-compatible`에서 마지막 페이지의 사용자/부서도 검색·필터·통계에 포함되는지 확인한다. 2페이지 조회 실패 시 부분 목록으로 편집할 수 없어야 하며 재시도 후 전체 목록을 표시해야 한다. `admin` 이외 관리자 로그인으로 본인 표시/비활성화 보호를 확인한다. 등록 실패 후 입력 보존, 취소 후 새 양식의 오류 초기화, 저장 중 입력/닫기 잠금과 등록·수정·비활성·재활성 재조회를 검증한다.

계정 상태 조회 실패 후 명시적 재조회와 세션 회수·잠금 해제를 확인한다. 메일 worker를 끈 격리 환경에서 재설정 outbox만 생성하며 실제 발송을 검증한 것으로 집계하지 않는다. 실제 viewer는 사용자 관리 API에 접근할 수 없고 본인 프로필은 수정할 수 있으나 자신의 시스템 역할을 바꿀 수 없어야 한다.

공용 `/__user/settings`에서 프로필 저장 실패 후 초안 보존·재시도·재조회, 비밀번호 불일치/잘못된 현재 비밀번호·정상 변경·입력 잠금을 확인한다. 인증 클라이언트의 401 재시도와 1분당 5회 비밀번호 변경 제한을 고려해 검증 요청 간격을 둔다. 변경 후 현재 세션 유지/다른 세션 회수, 비활성화 후 기존 세션/로그인 거부, 재활성화 후 로그인 복구는 실제 API로 검증한다. 원천의 완화된 비밀번호·선택 이메일·평문 임시 비밀번호와 플랫폼 계약 차이는 [19차 검수 대장](../planning/2026-09-30-menu-functional-audit.md)을 따른다.

모바일 MDI는 표의 가로 넘침만 검사하지 않는다. 검색을 비운 전체 목록에서 실제 수정 버튼을 클릭해 양식을 열고 취소한다. 표 section 높이가 2px로 줄어들지 않고 내부 가로 스크롤과 본문 세로 스크롤로 모든 행에 접근할 수 있어야 한다.
