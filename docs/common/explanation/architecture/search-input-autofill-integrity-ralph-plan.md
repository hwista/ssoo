# SSOO 검색 입력·Autofill 무결성 Ralph 계획

> 작성일: 2026-08-20  
> 상태: 3차 Web Ralph 고정 5앱 결정론적 검증 완료 · 별도 CRM 스타일 preflight blocker 및 사용자 저장-profile 최종 수용 확인 대기  
> 대상: `packages/web-auth`, `packages/web-shell`, `packages/web-ui`, `apps/web/{admin,crm,pms,dms,sns}`, `automation`, 검증 스크립트

## 1. 목표

SSOO 5개 웹 앱에서 로그인 자격증명이 검색·필터·조회·비자격증명 secret 입력으로 잘못 주입되지 않도록 입력 목적을 구조적으로 분리한다. 올바른 HTML 의미 계약을 1차 방어선으로 두고, 지원 브라우저 또는 비밀번호 관리자가 이를 오판해도 검색 상태가 비의도 값을 수용하지 않는 2차 방어선을 둔다.

이 계획에서 말하는 `100%`는 다음 범위를 뜻한다.

1. 현재 레포에서 식별한 검색·필터·자격증명성 입력이 예외 없이 목적별 inventory에 포함된다.
2. 공용 의미 계약과 화면별 도메인 동작의 소유 경계가 코드·정적 gate·테스트·문서에서 일치한다.
3. SSOO 지원 브라우저 검증 범위에서 저장된 로그인 ID가 비자격증명 입력에 나타나는 경로를 허용하지 않는다.
4. 정상 로그인 자동완성, 사용자가 직접 credential 형태 문자열을 검색하는 동작, URL 초기 검색어, 붙여넣기와 한글 IME는 그대로 보존한다.
5. 미래의 임의 브라우저 또는 확장 프로그램 동작까지 수학적으로 보증한다는 뜻은 아니다. 새 입력 또는 지원 브라우저가 추가되면 같은 정적·브라우저 gate를 통과해야 한다.

### 2026-08-21 고정 5앱 수용 계약

- 최신 Docker build·재배포·브라우저 수용 대상은 Admin/CRM/PMS/DMS/SNS 고정 5앱이며, 환경변수나 별도 명령으로 일부 앱을 선택·제외할 수 없다.
- CRM은 다른 네 앱과 동일하게 공용 shell 2필드, 대표 도메인 필드, desktop/mobile, native autofill 실패주입을 통과해야 한다. CRM 고유 상태 소유권은 `/contracts` GET query 초기값·submit·reload 회귀로 추가 검증한다.
- CRM의 15개 검색·필터·lookup 지점은 전수 정적 inventory로 고정한다. seed/detail/권한에 의존하는 모든 화면을 brittle한 UI 순회로 중복 검증하지 않고, 동일 공용 입력 계약은 대표 브라우저 흐름으로, 각 화면의 id/name/intent와 우회 여부는 AST gate로 증명한다.
- 제품 차단식은 입력값 내용을 분류하지 않는다. 후보가 `admin`, 사번, 점 포함 ID, 이메일형, 한글 ID 중 무엇이든 앱 소유값과 다르고 native autofill이며 최근 실제 입력 의도가 없을 때만 복구한다.
- 전역 `codex:preflight`의 별도 CRM 스타일 경계 실패는 숨기거나 완화하지 않는다. 입력 무결성 scoped gate와 전체 저장소 gate의 판정을 분리해 기록하되, 전체 goal 완료에는 전역 gate 또는 명시적으로 분리된 후속 해결이 필요하다.

## 2. 단계 경계

### 1차 Ralph — 현재 단계

- 입력 inventory와 분류를 확정한다.
- 공용 계약, 최소 변경 매핑, 실패주입, 브라우저 수용 명세를 확정한다.
- 제품 코드는 변경하지 않는다.
- 아래 `설계 완전성 게이트`가 모두 PASS인 경우에만 2차 실행으로 넘어간다.

### 2차 Web Ralph — 후속 단계

- 승인된 순서대로 공용 계약부터 구현한다.
- 앱별 도메인 검색 로직은 유지하고 입력 표면만 이관한다.
- 정적·단위·통합·5앱 브라우저 증거를 모두 통과할 때까지 반복한다.
- 일부 앱 또는 일부 viewport만 통과한 상태에서는 목표를 완료 처리하지 않는다.

## 3. 현재 상태 증거

정적 점검은 Storybook story를 제외한 `apps/web`, `packages/web-auth`, `packages/web-shell`의 TSX를 대상으로 수행했다.

| 증거 | 확인 결과 | 판정 |
|---|---:|---|
| `Input`/`input` 렌더 지점 | 306곳 | 전체 입력을 일괄 변경하면 회귀 위험이 큼 |
| 검색·query·filter 성격의 직접 입력 | 32곳 | 화면별 구현도 공용 의미 계약을 소비 |
| 공용 sidebar 검색 | 1개 구현, 5앱 main sidebar + DMS settings 소비 | 32곳 집계와 별도로 전 앱에 전파 |
| `<form>` | 17곳 | form-level 검색/자동완성 표준 없음 |
| 공용 header 검색 소비 앱 | Admin/CRM/PMS/DMS/SNS | 단일 수정이 5앱에 영향 |
| 공용 login 소비 앱 | Admin/CRM/PMS/DMS/SNS | 자격증명 field signature도 공용 영향 |
| 현행 E2E | fresh browser context + storage state | 브라우저 credential store autofill을 재현하지 않음 |
| fresh Firefox 로그인 재현 | 로그인 직후 검색창 빈 값 | React DOM 재사용이나 앱 상태 주입 경로는 아님 |
| 사용자 Chromium 프로필 | header/sidebar에 `admin` 주입 | 저장 credential이 비자격증명 입력에 유입되는 실제 결함 |

Chromium은 field signature를 `name`, 없으면 `id`, 그리고 input type으로 구성하며 `autocomplete="off"`는 분류 우선순위의 예외다. 따라서 `off` 단독 사용을 완전한 차단으로 취급하지 않는다.

## 4. 입력 목적 분류와 소유권

| 분류 | 예 | 공용 소유 | 앱 소유 |
|---|---|---|---|
| `credential` | 로그인 ID, 현재/새 비밀번호, 재설정 | `web-auth`의 name/id/autocomplete/form 계약 | 앱별 로그인 wrapper와 성공 route |
| `global-search` | 5앱 상단 통합 검색 | `web-shell` 의미·guard·submit | 탭 열기, 권한 |
| `navigation-search` | sidebar 메뉴·파일·설정 검색 | `web-shell` 의미·guard·clear | 검색 대상 tree와 상태 |
| `data-filter` | DataGrid, CRM GET query, Admin/PMS 목록 필터 | `web-shell` 입력 의미·guard | URL query, column/filter state, API |
| `entity-lookup` | 사용자·조직·프로젝트·문서 선택 | `web-shell` 입력 의미·guard | 결과 fetch, 권한, 선택/해제 |
| `in-view-search` | AI 결과·viewer 내부 재검색 | `web-shell` 입력 의미·guard | highlight, 다음/이전 결과 |
| `hybrid-input` | DMS URL/문서 검색 | 명시적 non-credential intent | URL 검증과 문서 검색 mode |
| `noncredential-secret` | Microsoft Client Secret | 명시적 secret intent와 autofill 차단 | Admin 설정 저장·마스킹 |

`@ssoo/web-ui`의 `Input`은 범용 primitive로 유지한다. 범용 `Input`에 검색 guard나 `autocomplete="off"` 기본값을 넣으면 정상 로그인·프로필·연락처 입력을 훼손하므로 금지한다.

## 5. 구조적 불변조건

1. 사용자가 브라우저 credential을 삭제하거나 자동완성을 끄는 것은 제품 해결책으로 인정하지 않는다.
2. 검색 입력은 `type="search"`, 안정적인 고유 `id/name`, 접근 가능한 이름을 가진다. 빈 signature나 예약 credential signature가 동적 props로 정적 분석을 우회해도 공용 입력이 render 단계에서 fail-closed 한다.
3. header/sidebar/standalone search page처럼 화면 구조상 검색 시설인 표면만 명명된 search landmark를 사용한다. 화면 내부의 단순 조건·lookup마다 landmark나 새 컨테이너를 추가하지 않는다.
4. 같은 화면에 search landmark가 둘 이상이면 각각 다른 accessible label을 가진다. 기존 business form 내부의 filter/lookup은 form을 중첩하지 않고 현재 DOM 구조와 submit 경계를 유지한다.
5. 로그인 입력은 `name="username"`, `name="password"`와 `username/current-password` autocomplete token을 사용한다.
6. 신규 사용자 비밀번호, 비밀번호 재설정, 현재 비밀번호 변경, 비자격증명 secret은 서로 다른 intent와 autocomplete 정책을 사용한다.
7. search guard는 controlled source value가 비어 있고 사용자 의도가 없으며 autofill로 확인된 값만 거부한다.
8. URL query, persisted filter 또는 앱 코드가 명시적으로 제공한 초기값은 `admin`이어도 제거하지 않는다.
9. 비제어 검색 입력의 `defaultValue`가 URL·탭·persisted state 변경으로 갱신되면 같은 mounted field의 DOM 값과 guard 기준값도 새 기본값으로 동기화한다.
10. 키보드, 포인터, paste, drop, composition/IME, 접근성 도구의 정상 입력은 차단하지 않는다.
11. header Enter submit, sidebar 실시간 필터, CRM GET query, DataGrid column filter, lookup 선택, viewer highlight의 기존 동작과 상태 소유권을 변경하지 않는다.
12. password manager 차단을 위해 상시 `readOnly`를 사용하는 방식은 기본 설계에 포함하지 않는다. 지원 브라우저 persistent-profile 증거에서 다른 방어가 실패할 때만 접근성 검토 후 별도 승인한다.
13. 앱별 시각 recipe와 레이아웃은 변경하지 않는다. 이번 목표는 DOM 의미, autofill 정책, 상태 수용 경계와 검증만 변경한다.

## 6. 공용 계약 설계

### 6.1 검색 입력 계약

`@ssoo/web-shell`에 검색 목적만 소유하는 공용 계약을 두되, 합성 표면과 화면 내부 입력 동작을 두 단계로 나눈다. 이름은 구현 시 기존 export naming과 충돌을 확인한 뒤 확정한다.

- 합성 표면: header/sidebar/standalone search처럼 레이아웃·submit·clear까지 공용이 소유하는 기존 `Ssoo*SearchBox` 계열
- 입력 동작: 화면별 filter/lookup이 기존 DOM·form·상태를 유지한 채 의미 속성과 guard만 소비하는 `SsooSearchField` 또는 동등한 저수준 계약

필수 계약:

- stable `id`
- stable non-credential `name`
- unique accessible label
- `intent`: `global | navigation | data-filter | entity-lookup | in-view | hybrid`
- `mode`: `live | submit`
- controlled `value`, `onChange`
- optional `onSubmit`, `onClear`, disabled/readOnly
- `type="search"`, `autoComplete="off"`
- `data-ssoo-input-intent` 진단 marker
- 빈 `id/name/ariaLabel`과 예약 credential signature는 정적 gate와 공용 runtime assertion에서 모두 거부
- 합성 검색 시설은 named `role="search"` region/form
- 화면별 filter/lookup은 landmark나 container를 만들지 않고 기존 구조에 input 계약만 적용
- 기존 `Input` primitive의 className과 event contract 보존

기존 `SsooHeaderSearchBox`, `SsooSidebarSearchBox`, DataGrid search, AI viewer search는 이 계약을 내부 소비한다. 앱별 검색 조건과 lookup은 자신의 query/result 로직을 유지하고 저수준 입력 동작만 소비한다. 앱은 guard나 vendor 속성을 직접 조립하지 않는다.

### 6.2 2차 autofill 방어

공용 search field 내부에서만 아래 순서로 적용한다.

1. search semantic, stable signature, `autocomplete="off"`로 native 분류를 교정한다.
2. password manager의 non-credential/ignore hint는 공용 컴포넌트가 소유한다.
3. 포인터·키보드·paste·drop·composition 사용자 의도를 추적한다.
4. controlled source가 빈 값인데 DOM에 값이 주입되고 native autofill 상태가 확인되면 `onChange`에 전달하지 않고 DOM을 source value로 복원한다.
5. mount 직후와 focus 시점에도 source/DOM 불일치를 점검해 event를 누락한 autofill을 복구한다.
6. source가 이미 값이 있거나 사용자가 입력한 경우에는 같은 문자열이 `admin`이어도 허용한다.
7. 비제어 field의 `defaultValue`가 바뀌면 URL·탭·persisted state가 소유한 값으로 DOM과 guard 기준값을 함께 갱신한다.

guard의 판정 로직은 hook/utility로 분리해 단위 실패주입이 가능해야 한다. `Input` primitive 전체에 적용하지 않는다.

### 6.3 Auth·secret 계약

- 공용 login form: stable form name, `username/password` name, 현행 autocomplete 유지
- password reset: email/code/new/confirm field name, `one-time-code`, `new-password` 명시
- account password change: named form/region, current/new/confirm name 분리
- Admin 사용자 생성·수정: 현재 관리자 credential과 다른 section/name, 신규 비밀번호는 `new-password`, target login ID는 명시적 관리 대상 intent
- Microsoft Client Secret: `noncredential-secret` marker, stable non-login name, password manager ignore, 저장됨 placeholder와 마스킹 동작 보존

## 7. 현행 검색 지점 이관 매핑

### 공용 shell

| 지점 | 분류 | 보존 동작 |
|---|---|---|
| header global search | `global-search` | Enter, tab title/path, clear-on-open, 권한 disable |
| sidebar search | `navigation-search` | live tree filter, clear, collapsed rail, 사용자 scope |
| data workspace grid search | `data-filter` | TanStack column filter |
| data workspace 동적 text filter | `data-filter` | field별 stable signature, Enter/검색/초기화와 서버 query 조합 |
| AI/viewer 재검색 | `in-view-search` | submit, highlight, result 이동, close |

### Admin — 4곳

| 지점 | 분류 | 보존 동작 |
|---|---|---|
| 역할·권한 사용자 검색 | `entity-lookup` | 사용자 목록 필터 |
| 역할 대상 login ID 필터 | `data-filter` | includeInactive 등 기존 filter 조합 |
| permission code/이름 검색 | `data-filter` | permission 목록 필터 |
| 계정관리 아이디/이름/부서 검색 | `data-filter` | source-compatible 계정 목록의 local filter 조합 |

추가 auth-sensitive 지점은 사용자 생성·수정 login/password/email과 인증 정책 Client Secret이다.

### CRM — 15곳

- URL GET query 유지: 사업계획, 사업계획대비실적, 계약대비실적, 계약 원장, 계약청구실적, 원가/AMS, 고객/활동, 보고 Preview, 영업기회 목록
- live filter 유지: 영업기회 source 검색, 계약문서 대상 검색
- entity lookup 유지: 영업기회 owner lookup 2곳

URL과 defaultValue를 사용하는 검색은 공용 field로 바꾸더라도 query 직렬화, submit method, 브라우저 history를 바꾸지 않는다.

### PMS — 8곳

- 공용/legacy DataGrid toolbar
- page Header의 동적 text filter renderer
- 기준정보 검색
- 조직 검색
- 관계 프로젝트 검색
- 실행 상세 프로젝트 검색
- 인수인계 계약 검색
- 구성원 사용자 검색

PMS 로컬 DataGrid toolbar가 공용 data workspace와 중복되면 소비 경로만 통합하고 TanStack filter state는 그대로 유지한다.

### DMS — 3곳

- AI reference picker
- picker tree
- 링크 URL/문서 검색 hybrid input

링크 입력은 URL 직접 입력과 문서 검색을 함께 제공하므로 무조건 search form으로 흡수하지 않는다. `hybrid` intent를 사용하고 URL Enter 처리와 선택 초기화를 보존한다.

### SNS — 1곳

- 전문가 검색: query state, 권한 fallback, category UI를 보존하고 입력 의미만 공용 계약으로 이관한다.

## 8. 구현 순서

1. inventory를 machine-readable verifier fixture로 고정하고 새 ad-hoc search 입력 추가를 차단한다.
2. `web-shell` search semantic/guard 계약과 단위 테스트를 추가한다.
3. `web-auth` login/reset/account password field signature를 명확히 한다.
4. header/sidebar/data workspace/AI viewer 공용 소비자를 이관한다.
5. Admin auth-sensitive 입력을 먼저 분리한 뒤 Admin 검색 4곳을 이관한다.
6. CRM 15곳을 URL submit/live lookup으로 나눠 이관한다.
7. PMS 8곳, DMS 3곳, SNS 1곳을 각각 기존 상태 계약을 보존하며 이관한다.
8. `verify:input-intent` 정적 gate를 추가하고 preflight/push guard/PR validation에 연결한다.
9. frame/auth/개발 표준, 공용 문서 index, changelog를 코드와 동기화한다.
10. 전체 lint/build와 브라우저 Ralph를 실행하고 실패가 있으면 해당 단계로 되돌아간다.

공용 패키지 변경은 5개 앱 모두에 영향을 주므로 일부 앱 build만으로 통과하지 않는다.

## 9. 정적·단위·통합 테스트 명세

| ID | 검증 | 통과 기준 |
|---|---|---|
| TC-INPUT-01 | 검색 inventory | 현재 검색/필터 지점이 모두 공용 계약 또는 승인된 hybrid로 분류 |
| TC-INPUT-02 | 신규 우회 | raw `Input` 검색 추가 시 `verify:input-intent` 실패 |
| TC-INPUT-03 | field signature | search id/name이 비어 있지 않고 안정적이며 예약 credential signature와 충돌 0 |
| TC-INPUT-04 | search landmark | 구조상 검색 시설만 landmark를 사용하고 label 고유, 화면별 조건의 landmark 과다 생성 0 |
| TC-INPUT-05 | auth field | login/current/new/reset/secret autocomplete와 name 정확 |
| TC-INPUT-06 | autofill reject | empty source + no user intent + autofill 주입은 state 전달 0, DOM empty 복구 |
| TC-INPUT-07 | intentional query | source 또는 사용자 입력이 `admin`이면 정상 유지 |
| TC-INPUT-08 | input methods | keyboard/paste/drop/IME 입력 보존 |
| TC-INPUT-09 | controlled sync | clear, external value update, disabled/readOnly 동작 보존 |
| TC-INPUT-10 | submit search | Enter 1회당 기존 submit/navigation 1회 |
| TC-INPUT-11 | live filter | sidebar/DataGrid/lookup 결과가 기존 fixture와 동일 |
| TC-INPUT-12 | CRM URL query | query string, history, reload 결과가 변경 전과 동일 |
| TC-INPUT-13 | Admin secret | 현재 admin credential이 target user/Client Secret으로 유입되지 않음 |
| TC-INPUT-14 | package boundary | `web-ui` primitive는 범용 유지, app→package 방향 보존 |
| TC-INPUT-15 | five-app build | Admin/CRM/PMS/DMS/SNS production build 전부 통과 |

## 10. Web Ralph 브라우저 명세

도구: `playwright-cli`를 기본으로 하고, native credential autofill 증거는 Chromium/Edge persistent profile을 사용한다. Firefox fresh profile은 앱 자체 상태 주입이 없음을 확인하는 대조군으로 유지한다.

### Flow A — 5앱 login → shell credential 격리

대상 URL:

- Admin `http://localhost:3000/login`
- CRM `http://localhost:3001/login`
- PMS `http://localhost:3002/login`
- DMS `http://localhost:3003/login`
- SNS `http://localhost:3004/login`

절차:

1. 각 origin에 `admin` credential이 저장된 persistent profile을 준비한다.
2. 로그인 ID/비밀번호의 정상 자동완성을 확인하고 로그인한다.
3. 홈에서 header와 expanded sidebar 검색값이 빈 문자열인지 확인한다.
4. reload, back/forward, sidebar collapse/expand, app main navigation 후에도 빈 값인지 확인한다.
5. header와 sidebar에 사용자가 직접 `admin`을 입력해 정상 검색되는지 확인한다.

기대 결과:

- 로그인 자동완성은 유지된다.
- 비자격증명 검색창에는 자동 주입 0건이다.
- 의도적 `admin` 검색은 차단되지 않는다.

### Flow B — 공용 search 동작 보존

1. 각 앱 header에서 검색어 입력 후 Enter
2. `/ssoo/search?q=...` 또는 기존 MDI search tab 경로 확인
3. sidebar에서 메뉴/파일 검색, clear, collapse/expand 확인
4. DMS에서 사용자 scope 전환 후 이전 사용자의 sidebar query가 노출되지 않는지 확인

### Flow C — 앱별 대표 검색

| 앱 | 시작 화면 | 검증 흐름 |
|---|---|---|
| Admin | `/roles`, `/users`, `/auth` | 사용자/permission 검색, 사용자 추가 dialog 빈 값, Client Secret 비주입 |
| CRM | `/customers`, `/contracts`, `/opportunities` | GET query submit/reload, live source filter, owner lookup |
| PMS | sidebar에서 DataGrid/프로젝트 상세 진입 | grid filter, 조직/프로젝트/구성원 lookup |
| DMS | 홈 빠른 시작→AI 검색 MDI 탭, 문서/AI reference/link dialog | 결과 내 검색, reference/picker filter, URL 직접 입력, 문서 검색 mode |
| SNS | `/search` | 전문가 query와 category UI 보존 |

각 흐름은 기존 결과 건수·선택·URL·탭 동작을 변경 전 fixture와 비교한다.

DMS의 통합 검색은 루트 `AppLayout`이 유지된 상태에서 header 또는 홈의 `AI 검색` 액션이 Zustand MDI 탭을 여는 동작이다. 따라서 브라우저 gate는 `/ssoo/search`에 page navigation으로 직접 진입하지 않고 홈의 실제 사용자 액션으로 검색 탭을 연다. 이 차이는 검색 입력 계약이 아니라 DMS의 기존 route/MDI 소유권이며, 입력 무결성 작업에서 라우팅 구현을 변경하지 않는다.

### Flow D — 입력 방식·초기값

1. 키보드 입력, 붙여넣기, 한글 composition, clear를 수행한다.
2. URL 또는 앱 state의 초기 검색어를 `admin`으로 제공한다.
3. initial value는 유지되고 사용자 입력만 정상 반영되는지 확인한다.
4. autofill 실패주입 값만 제거되는지 확인한다.

### Flow E — responsive

- desktop `1440×1000`: header/sidebar와 대표 페이지 검색을 모두 확인한다.
- mobile `390×844`: mobile sidebar 검색, 앱별 form/lookup, 가로 overflow와 focus 이동을 확인한다.
- 모바일에서 숨겨진 desktop header 검색은 억지로 노출하지 않고 기존 responsive 계약을 유지한다.

### 브라우저 차단 조건

- 비자격증명 입력에 저장 credential이 한 번이라도 나타남
- 정상 login autofill 또는 로그인 submit 회귀
- 사용자가 직접 입력한 `admin`, paste, IME, URL 초기 query가 제거됨
- 기존 filter 결과, URL, MDI tab, clear/Enter 동작 불일치
- 관련 API/local proxy 실패, 예상하지 않은 4xx/5xx
- console error/warning, page runtime error
- desktop/mobile overflow, focus 불가, accessible name 중복 또는 누락

## 11. 실행 검증 명령

구현 단계의 최소 gate:

```bash
pnpm run verify:input-intent
pnpm run test:e2e:input-intent
pnpm run verify:auth-commonization
pnpm run verify:ui-primitives
pnpm run verify:ui-consumption
pnpm run verify:ui-style-boundary
pnpm run verify:ssoo-frame -- --skip-runtime
pnpm run build:web-admin
pnpm run build:web-crm
pnpm run build:web-pms
pnpm run build:web-dms
pnpm run build:web-sns
pnpm run codex:preflight
pnpm run codex:dms-guard
```

`verify:input-intent`와 `verify:input-intent:self-test`는 구현됐으며 build/preflight/push guard/PR validation에서 inventory, raw 우회 입력, 빈 `id/name/ariaLabel`, 예약 credential signature와의 충돌을 차단한다. 공용 컴포넌트의 search semantic, vendor hint, autofill guard, reject event, canonical signature validator 자체도 source contract로 고정해 consumer inventory만 남고 방어 구현이 제거되는 drift를 허용하지 않는다. 동적 props가 정적 분석을 우회하더라도 `SsooSearchInput`이 같은 canonical validator를 실행해 render 단계에서 fail-closed 한다. `test:e2e:input-intent`는 실행 중인 로컬 Docker 5앱을 대상으로 `localhost:3000~3004`에서 Chromium native autofill 실패주입과 의도적 입력 보존을 반복 검증한다. 정적 gate는 공용 shell 10개 field뿐 아니라 앱별 대표 field 5개, DMS 실제 MDI 검색 진입, `390×844` 모바일 증거가 E2E에서 빠지면 실패한다.

## 12. 설계 완전성 게이트

| 기준 | 현재 판정 | 2차 실행 진입 조건 |
|---|---|---|
| 전체 inventory 분류 | PASS | 공용·Admin·CRM·PMS·DMS·SNS 지점과 auth-sensitive 지점 포함 |
| 공용/도메인 소유권 | PASS | 의미·guard는 공용, query/data/result는 앱 소유 |
| 기존 동작 보존 | PASS | 지점별 state/URL/submit/lookup 보존 항목 명시 |
| 정상 auth autofill 보존 | PASS | 별도 불변조건·Flow A 존재 |
| 비의도 autofill 이중 차단 | PASS | semantic + state acceptance guard 설계 |
| 입력 접근성 | PASS | 공용 검색 시설 landmark와 화면별 조건 입력을 분리하고 고유 label, IME/focus 조건 명시 |
| 정적 재발 방지 | PASS | inventory/verifier/preflight/PR gate 설계 |
| 브라우저 증거 | PASS | 5 origin persistent profile + desktop/mobile + failure signals 명시 |
| 제품 코드 적용 | PASS | 공용 계약, 동적 filter renderer를 포함한 36개 검색 지점, 5개 credential surface, 정적 gate와 문서 동기화 완료 |

## 13. 2차 Web Ralph 종료 조건

다음 항목이 모두 충족될 때만 전체 goal을 완료한다.

1. 모든 inventory 지점이 공용 계약 또는 승인된 hybrid/auth intent로 이관된다.
2. 정적 verifier와 실패주입 self-test가 우회 입력을 차단한다.
3. 5개 앱 build, preflight, DMS guard가 통과한다.
4. 저장 credential이 있는 Chromium/Edge persistent profile의 5앱 Flow A가 통과한다.
5. Firefox 대조군과 앱별 Flow B~E가 통과한다.
6. 관련 console warning/error, runtime error, API/proxy 실패가 0이다.
7. 정상 로그인 자동완성·서로 다른 credential 형태의 의도적 검색·IME·paste·URL query 회귀가 0이다.
8. 계획·frame/auth 표준·changelog가 최종 구현과 일치한다.

앱별 선택 실행은 이 종료 조건을 우회하므로 허용하지 않는다. CRM을 포함한 고정 5앱 모두 같은 실행에서 검증하며, 사용자 저장-profile 확인도 5앱 최종 수용 조건으로 남긴다.

## 14. 검색 inventory freeze

직접 JSX에서 식별된 32곳과 별도 공용 sidebar 구현, 완료성 감사에서 동적 props 때문에 최초 AST 탐지를 우회했던 공용 DataWorkspace filter renderer와 PMS page FilterBar, 동시 개발 중 추가된 CRM 계약청구실적 검색을 다음 37개 구현 지점으로 고정한다. 실행 도중 CRM source-compatible 계약/실적 조회 3곳과 Admin source-compatible 계정 검색 1곳이 추가된 것을 정적 gate가 감지해 inventory와 공용 계약에 함께 편입했다. 동적 text filter는 이제 타입 수준에서 stable `id/name/ariaLabel`을 필수로 요구하며, 이후 차이가 생기면 `verify:input-intent`가 실패한다.

| 영역 | 소스 | 수량 | 목적 |
|---|---|---:|---|
| web-shell | `src/header.tsx` | 1 | global search |
| web-shell | `src/sidebar.tsx` | 1 | navigation search; 별도 집계 |
| web-shell | `src/data-workspace-page.tsx` | 2 | DataGrid filter, 동적 DataWorkspace text filter renderer |
| web-shell | `src/ai-search/toolbar/SearchControls.tsx` | 1 | in-view search |
| Admin | `pages/roles/AccessManagementPage.tsx` | 3 | user/login ID/permission filter |
| Admin | `pages/users/UserManagementPage.tsx` | 1 | account directory filter |
| CRM | `BusinessPlanPreviewWorkspaceClient.tsx` | 1 | URL query |
| CRM | `BusinessPlanPerformancePreviewWorkspaceClient.tsx` | 1 | URL query |
| CRM | `ContractPerformanceWorkspaceClient.tsx` | 2 | URL query, source-compatible URL query |
| CRM | `ContractWorkspaceClient.tsx` | 3 | URL query, source-compatible 계약/계약청구실적 URL query |
| CRM | `ContractUpsertPanel.tsx` | 1 | 계약 담당자 도움창의 공용 사용자 검색(2026-10-01 추가) |
| CRM | `CostPlanPreviewWorkspaceClient.tsx` | 1 | URL query |
| CRM | `CustomerWorkspaceClient.tsx` | 1 | URL query |
| CRM | `ReportsPreviewWorkspaceClient.tsx` | 1 | URL query |
| CRM | `OpportunityContractDocumentCard.tsx` | 1 | entity source filter |
| CRM | `OpportunityWorkspaceClient.tsx` | 4 | source/query/owner lookup 2곳 |
| DMS | `common/assistant/reference/Picker.tsx` | 1 | document lookup |
| DMS | `common/picker-tree/PickerTree.tsx` | 1 | tree filter |
| DMS | `editor/LinkInsertDialog.tsx` | 1 | URL/document hybrid |
| PMS | `common/datagrid/Toolbar.tsx` | 1 | DataGrid filter |
| PMS | `common/page/FilterBar.tsx` | 1 | 동적 page text filter renderer |
| PMS | `admin/MasterDataPage.tsx` | 1 | master data filter |
| PMS | `project/sections/OrganizationsSection.tsx` | 1 | organization lookup |
| PMS | `project/sections/RelationsSection.tsx` | 1 | project lookup |
| PMS | `project/tabs/ExecutionDetailTab.tsx` | 1 | project lookup |
| PMS | `project/tabs/HandoffsTab.tsx` | 1 | contract lookup |
| PMS | `project/tabs/MembersTab.tsx` | 1 | user lookup |
| SNS | `pages/search/SearchPage.tsx` | 1 | expert search |

별도 auth-sensitive inventory:

- `packages/web-auth/src/ui.tsx`: login ID/current password
- `packages/web-auth/src/password-reset-page.tsx`: email/code/new/confirm password
- `packages/web-auth/src/user-surface.tsx`: current/new/confirm password
- `apps/web/admin/src/components/pages/users/UserManagementPage.tsx`: target user login/password/email
- `apps/web/admin/src/components/pages/auth/AuthPolicyPage.tsx`: Microsoft Client Secret

## 15. Web Ralph 실행 증거

### 2026-08-20 2차 Web Ralph

| 검증 | 결과 |
|---|---|
| 정적 inventory/실패 fixture | `verify:input-intent` PASS — 36 registered search inputs, 5 credential surfaces, 2 shared contract sources, 2 browser evidence surfaces; raw 우회·빈 signature·예약 credential 충돌 self-test PASS |
| 공용 경계 | UI primitive/consumption/style, SSOO frame, Codex sync, docs gate PASS |
| package/app build | `web-shell`, `web-auth`, 최신 소스의 5개 웹 앱 production Docker build PASS; 5개 컨테이너 healthy |
| 저장소 강제 gate | `codex:preflight`, `codex:dms-guard` PASS |
| 로그인 의미 | Chromium 실제 DOM에서 `username/current-password`, named login form, 정상 로그인 성공 확인 |
| event 기반 실패주입 | 빈 source에 native-autofill로 판정된 `admin` 주입 시 DOM empty 복구, reject event 1회 |
| event 누락 실패주입 | input event 없이 값 주입 후 focus reconcile 시 DOM empty 복구, reject event 1회 |
| 정상 입력 보존 | 키보드 `admin`, paste `admin`, 한글 composition `문서` 모두 reject 0, 입력값 보존 |
| 초기 query 보존 | CRM `/contracts?search=admin`에서 native-autofill 판정을 강제해도 `admin` 보존, reject 0 |
| route-owned 기본값 동기화 | CRM 계약 검색에서 `ralph-query-2` 제출 후 URL·MDI tab path·표시값 일치, reload 후에도 동일 값 유지 |
| Chromium native pseudo 5앱 | 결정론적 Chromium test context에서 CDP `CSS.forcePseudoState`로 5앱 header/sidebar 10필드와 앱별 대표 5필드의 `:autofill`과 `:-webkit-autofill`을 실제 활성화; pre-focus `admin` 주입은 15/15 DOM empty 복구, 필드별 reject 1회, console/page/5xx 0 |
| 반복 가능한 Playwright gate | `pnpm run test:e2e:input-intent` PASS — 2 tests, 1.5m. 5앱 공용 10필드와 대표 도메인 5필드의 native pseudo 거부·키보드 보존, 대표 도메인 5필드의 `390×844` 한글 입력·overflow, paste/composition/CRM 초기 query·GET submit·reload, browser failure 0을 자동 검증 |
| 앱별 대표 흐름 | Admin 계정관리, CRM 계약 GET, PMS 기준정보 실제 메뉴, DMS 홈 `AI 검색` MDI 탭, SNS 전문가 검색에서 의도적 입력 보존·signature 정상·overflow 0 |
| 5앱 desktop | `1440×1000`에서 Admin/CRM/PMS/DMS/SNS header/sidebar signature 확인; DB 정렬 후 console/page/5xx 0 |
| 5앱 mobile | `390×844`에서 Admin 계정관리, CRM 계약 GET, PMS 기준정보 실제 모바일 메뉴, DMS 홈 `AI 검색` MDI 탭, SNS 전문가 검색의 한글 입력 보존·가로 overflow 0과 console/page/5xx 0 확인 |

### 2026-08-21 고정 5앱 재통합 Ralph

| 검증 | 결과 |
|---|---|
| 범위 불변조건 | 앱 선택 환경변수·별도 일부 앱 명령 제거. 정적 gate가 선택 분기의 재도입과 제품 코드의 `admin` 값 결합을 거부하도록 강화 |
| 값 일반화 | 제품 차단식은 기존 값-불문 판정 유지. self-test는 계정명·사번형·점 포함 ID·이메일형·한글 후보, 브라우저는 네 가지 ASCII credential 후보를 순환 검증하도록 확장 |
| CRM 동등 적용 | 15개 전수 AST inventory + shell header/sidebar + 계약 대표 필드 + GET 초기 query/submit/reload를 고정 5앱 실행에 필수화 |
| 이전 4앱 실행 | 구현 진단 이력으로만 취급하고 현재 goal의 완료 증거에서는 제외 |
| 정적·정본 gate | `verify:input-intent:self-test`, `verify:input-intent`, automation `tsc`, Codex sync, docs verify, UI primitive/consumption, SSOO frame 모두 PASS. 36 registered search inputs, 5 credential surfaces 유지 |
| 최신 5앱 Docker | 단일 `build admin crm pms dms sns` PASS 후 다섯 웹 컨테이너를 함께 recreate; Admin/CRM/PMS/DMS/SNS 모두 최신 이미지로 `healthy` |
| 자동 브라우저 gate | `pnpm run test:e2e:input-intent` PASS — 2 tests, 1.4m. 고정 5앱 shell 10필드·대표 도메인 5필드·모바일 5필드, 네 credential 후보 순환, paste/composition, CRM 초기 query·submit·reload, browser failure 0 |
| CLI desktop 5앱 | 별도 Playwright CLI Chromium 세션에서 5앱 header/sidebar 10필드가 `search/searchbox/off`, 올바른 intent, 빈 초기값, horizontal overflow 0으로 일치 |
| CLI CRM desktop/mobile | `/contracts?search=admin`의 URL 소유 초기값과 계약 filter signature 보존. `390×844`에서 이메일형 직접 입력 보존, document/client width `390/390`; reload 후 console warning/error, pageerror, requestfailed, HTTP 5xx 0 |
| DMS guard | runtime profile·launch evidence·shell body·golden example·document hydration·automation typecheck·DMS production build까지 PASS |
| 현재 전역 preflight 경계 | 입력 관련 단계는 모두 통과한 뒤 CRM `OpportunityWorkspaceClient.tsx`의 동시 견적서 print/modal 시각 토큰 32건에서 중단. 사용자-visible 별도 작업을 입력 목표에 섞어 변경하거나 style gate를 완화하지 않음 |

CLI 증거는 `output/playwright/input-intent-fixed-five/.playwright-cli/`의 desktop/mobile CRM screenshot과 page snapshot에 남겼다. CLI 기본 Google Chrome binary가 없는 WSL에서는 run-scoped config로 Playwright bundled Chromium을 명시했으며, 제품·전역 브라우저 설정은 바꾸지 않았다. 실제 Windows Chrome 저장-profile 확인은 결정론적 gate 이후 별도 최종 수용 조건이다.

로컬 보존 DB에는 코드보다 뒤처진 CRM additive migration 3개가 있어 최초 순회에서 `/api/crm/dashboard` 500이 발생했다. `/tmp/ssoo_dev_before_input_ralph_20260820_0424.dump`로 압축 백업한 뒤 누락된 `20260813100000`, `20260814090000`, `20260814100000`만 단일 트랜잭션으로 적용했고 재검증에서 500이 해소됐다. DMS/PMS 등 기존 볼륨은 삭제하지 않았다.

스크린샷 증거는 `/tmp/ssoo-input-intent-ralph-20260820/dms-desktop.png`, `/tmp/ssoo-input-intent-ralph-20260820/dms-mobile.png`에 있다. Playwright의 결정론적 native-autofill 실패주입까지는 완료됐으며, 사용자가 문제를 재현했던 실제 Windows Chrome 저장-profile 확인은 로컬 Docker 인수 테스트에서 최종 수용 확인으로 남긴다.

`verify:auth-commonization`의 공용 auth 검사는 PASS다. 다만 같은 wrapper의 후속 `verify-auth-product-hardening`은 이 목표와 무관한 `common-columns.extension.ts` transaction ID fallback 순서와 verifier 기대값 불일치로 실패한다. 입력 계약·credential signature에 대한 preflight와 DMS guard는 모두 통과했으며, 해당 별도 DB audit 계약은 임의 변경하지 않았다.

## 16. 기준 자료

- [Chromium Autofill README](https://chromium.googlesource.com/chromium/src/+/main/components/autofill/README.md): form/field signature와 `autocomplete="off"` 예외
- [W3C Search Landmark Example](https://www.w3.org/WAI/ARIA/apg/patterns/landmarks/examples/search.html): 구조상 검색 시설의 `role="search"`와 고유 label
- [W3C ARIA in HTML](https://www.w3.org/TR/aria-in-html/): `input type="search"`의 implicit `searchbox` semantics

## Changelog

| 날짜 | 변경 내용 |
|---|---|
| 2026-08-21 | CRM을 선택적 예외로 두었던 재개 회차 분기를 폐기하고 Admin/CRM/PMS/DMS/SNS 고정 5앱 수용 계약으로 재통합했다. 앱 선택 우회와 특정 `admin` 값 결합을 정적 gate로 금지하고, 여러 credential 형태 후보·CRM 15개 정적 inventory·CRM GET query 회귀를 동일 Ralph 실행에 고정했다. |
| 2026-08-20 | 2차 Web Ralph로 `SsooSearchInput`, credential signature, 동적 DataWorkspace/PMS filter renderer와 CRM 계약청구실적 검색을 포함한 36개 AST inventory와 CI gate를 구현했다. 최신 5앱 Docker에서 Chromium native pseudo 공용 10필드+앱별 대표 5필드, 키보드 `admin`, paste, 한글 composition, CRM URL 초기값·submit·reload와 대표 5필드 `390×844` 순회를 통과했다. DMS는 direct page navigation이 아닌 홈 `AI 검색` 실제 MDI 동선을 사용하며, 이 증거 범위를 `verify:input-intent`가 강제한다. 실제 사용자 저장-profile 확인은 로컬 Docker 인수 테스트에서 최종 확인한다. |
| 2026-08-20 | SSOO 5앱 검색·필터·credential/secret 입력 inventory, 공용 의미 계약, 이중 autofill 방어, 앱별 최소 변경 매핑, 정적·브라우저 Ralph 수용 명세를 최초 작성 |
