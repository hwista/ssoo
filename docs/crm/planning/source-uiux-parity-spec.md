# CRM 원천 UI/UX 패리티 명세

> 2026-09-30 사용자 지시: 사업연도 메뉴·화면·API·마스터/이력은 CRM 소유로 이전한다. 아래 과거 Admin 실행 증거는 당시 기록이며 현재 이전 검증을 대체하지 않는다.
> 기준일: 2026-08-20  
> 상태: 폐쇄 원장은 `UX-01~17` 17/17이다. S12 schema 1 증거는 현재 작업 트리 지문이 없어 schema 2 current-revision capture로 재증명 중이며, 이 결과만으로 `SRC-*`·`OPS-*`까지 포함한 최종 Goal 100%를 선언하지 않는다.  
> 목적: SSOO 공용 shell·template·primitive를 사용하면서 원천 CRM의 업무 화면 구조와 상호작용을 임의로 재설계하지 않는다.

## 1. “UI/UX 디자인 변경 없음”의 구속력 있는 의미

허용되는 플랫폼 적용:

- 로그인·header·sidebar·tabbar·content frame은 `@ssoo/web-auth`, `@ssoo/web-shell`, `@ssoo/web-ui` 정본을 사용한다.
- 접근성, keyboard/touch hit target, mobile document overflow 방지와 semantic token 적용은 허용한다.
- 원천 한 화면을 SSOO MDI의 tab 또는 route state로 여는 것은 허용하되, 사용자가 보는 업무 내용과 조작 순서를 합치거나 생략하지 않는다.
- 공용 Admin/Auth/DMS가 단일 소유자인 기능은 해당 owner surface로 연결할 수 있지만 원천 시나리오 전체가 같은 순서와 결과로 닫혀야 한다.

허용되지 않는 변경:

- 원천 화면의 필드·표 column·section·action·상태·합계·dialog를 삭제, 통합, 재명명 또는 다른 의미로 대체.
- 원천 화면 여러 개를 하나의 요약 dashboard로 흡수하고 원래의 독립 작업 흐름을 제거.
- source와 다른 기본 filter/sort/selection, action 순서, 잠금 시점 또는 modal confirmation을 적용.
- 원천 색·강조·정보 위계를 임의로 새 dashboard/card/queue 디자인으로 재해석하고 이를 원천 화면 대체로 계산.
- desktop에서 원천 정보 밀도나 표 구조를 줄이는 responsive redesign. mobile adaptation은 별도이며 desktop 원형을 대신하지 않는다.

원천 내부 모순은 숨기지 않는다. SSOO의 정합한 기존 동작을 보존하면서 `source-compatible` mode 또는 label을 additive하게 제공하고 두 결과를 각각 검증한다.

## 2. 시각 기준 입력 계약

### REF-01 원천 실행 화면과 자산

Phase 1 closure에 필요한 입력은 다음과 같다.

1. `Sales Management System -proto` 전체 디렉터리와 파일별 SHA-256 manifest.
2. `Create Table script.txt` 원본. 알려진 SHA-256은 `7371cad44d811b8050ca28daa2fe32bfb8f1fb3b19f391616c7632ea2ea3fbd6`이다.
3. 원천 17개 page container의 1440×1000 screenshot과 DOM/text/action manifest.
4. 각 화면의 정상·빈 상태·validation·잠금·confirmation·download 상태 중 원천에 존재하는 상태 분모와 source anchor 목록. Phase 1은 대표 원천 상태를 캡처하고, 각 UX `완료` 전에는 해당 상태 분모 전체를 source/target 쌍으로 캡처한다.

`영업관리시스템_소개_전체.pptx`는 설명 보조 자료이며 현재 패리티 분모의 필수 입력이 아니다. 읽을 수 있는 원본이 제공되면 알려진 SHA-256 `8d999ec75464fcb95ed83f55ece359cc8f34a9532c482ce69b649bf73e727fa6`을 확인하고 코드와 충돌하지 않는 설명만 보조 증거로 사용한다.

원천 파일은 외부 입력 경로로 받을 수 있지만, 추출 결과에는 파일 hash, 상대 경로, capture command, viewport, seed/state, 생성 시각을 남긴다. source reference 없이 기억이나 현재 SSOO 화면만으로 기준 screenshot을 재작성하지 않는다.

## 3. UI/UX 분모

| ID | 원천 page | SSOO owner surface | 보존해야 할 화면·상호작용 | 현재 기준 증거 | 판정 | 구현/검증 |
|---|---|---|---|---|---|---|
| UX-01 | `dashboard` | CRM `/` | 확정 최신차수 금액 KPI, 최신차수 상태 분포, 최근 5건의 순서·drilldown. 플랫폼 KPI/queue는 별도 영역으로 보존 | S12 통합 target 증거에서 정상·확정 0건·최근 drilldown 3상태의 source/desktop/mobile/diff와 E0 완료 | 완료 | IMP-04, IMP-17, BT-04, BT-27 |
| UX-02 | `list` | CRM `/` | 검색·상태 filter·매출/이익 sort·최신/이전차수 표시와 선택 흐름 | 목록·빈 필터·이전차수·상세 진입 4상태의 구조/interaction/perceptual diff와 E0 완료 | 완료 | IMP-04, IMP-17, BT-05, BT-27 |
| UX-03 | `form` | CRM `/` 상세/편집 | 기본정보 section, 5개 line grid, 계산/확정/차수/회수 action의 grouping·order·잠금 | 신규·시드 편집·필수 검증·확정 잠금·회수/삭제 5상태 완료 | 완료 | IMP-04, IMP-17, BT-05, BT-07, BT-27 |
| UX-04 | `contract-gen` | CRM opportunity + DMS | 확정 영업기회 선택, template 선택, 22변수 preview, 생성·download 순서 | 무 template·template·기회 선택·preview·생성/download·실패 6상태 완료 | 완료 | IMP-06, IMP-17, BT-08, BT-27 |
| UX-05 | `contract-list` | CRM `/contracts` | 계약 검색·상태·목록 column·상세 진입 | 시드 목록·빈 필터·상세 진입 3상태 완료 | 완료 | IMP-17, BT-09, BT-27 |
| UX-06 | `contract-form` | CRM `/contracts` | core field, 5개 line, WBS/payment, billing split, 확정·해제·삭제 순서 | 신규·시드 편집·필수 검증·확정 잠금·확정/해제/삭제 5상태 완료 | 완료 | IMP-07, IMP-17, BT-09, BT-27 |
| UX-07 | `billing-actual` | CRM `/contracts` | 확정 계약 선택, 연/월/금액 full-replace grid와 저장 잠금 | 확정 목록·계약 선택·빈/시드 실적·저장 검증 5상태 완료 | 완료 | IMP-17, BT-10, BT-27 |
| UX-08 | `biz-report` | CRM `/contract-performance` | 월별 계획·실적·차이 column, filter, frozen grid 의미 | 시드 비교·빈 필터·필터 조합 3상태 완료 | 완료 | IMP-17, BT-10, BT-27 |
| UX-09 | `biz-plan` | CRM `/business-plan` | 3개년 grid, 12개월+연간 값, row CRUD/paste, 차수·확정·이월·삭제 | 빈/시드·paste·차수·확정/해제·이월·잠금 7상태 완료 | 완료 | IMP-17, BT-11, BT-27 |
| UX-10 | `bp-rpt` | CRM `/business-plan-performance` | 확정 계획 대 계약 청구계획의 WBS/month comparison과 filter | 시드 계획/계약 비교·빈 필터·필터 조합 3상태 완료 | 완료 | IMP-08, IMP-17, BT-12, BT-27 |
| UX-11 | `internal-cost` | CRM `/cost-plan` | 고정 5개 항목, 월별 계획·실적·차이, paste와 잠금 | 시드 grid·paste·실저장/원복·잘못된 paste 4상태 완료 | 완료 | IMP-17, BT-13, BT-27 |
| UX-12 | `biz-year` | CRM `/business-years` | 연도 목록·CRUD·활성 상태와 CRM selector 반영 | 시드/빈·생성 검증·활성/비활성·삭제 확인 5상태 완료 | 완료 | IMP-03, IMP-17, BT-03, BT-27 |
| UX-13 | `ams-vendor` | CRM `/cost-plan` | 연도별 업체 CRUD와 복수 WBS mapping | 시드/빈·생성 검증·복수 WBS 실매핑/원복·삭제 확인 5상태 완료 | 완료 | IMP-10, IMP-17, BT-13, BT-27 |
| UX-14 | `ams-cost` | CRM `/cost-plan` | 업체×WBS 월별 계획·실적·차이 grid와 paste/정산 잠금 | 시드/빈·paste·실저장·잘못된 paste 5상태 완료 | 완료 | IMP-10, IMP-17, BT-13, BT-27 |
| UX-15 | `codes` | Admin `/codes` | code group/item CRUD·활성 상태와 selector 소비 | 시드/빈·생성/수정 검증·실활성/원복·삭제 확인 5상태 완료 | 완료 | IMP-03, IMP-17, BT-03, BT-27 |
| UX-16 | `company` | CRM `/quote-settings` | 공급자 법인 필드·CI 관리와 견적/계약 소비 | 로드/빈·CI 참조·실저장/원복·저장 실패 5상태 완료 | 완료 | IMP-03, IMP-17, BT-03, BT-14, BT-27 |
| UX-17 | `admin` | Admin `/users` + shared profile/auth | 사용자 CRUD·비활성·reset 및 profile/password 흐름 | 로그아웃·로그인 검증/오류·시드/빈·계정 검증·확인·profile/password 8상태 완료 | 완료 | IMP-02, IMP-17, BT-01, BT-02, BT-03, BT-27 |

## 4. Ralph 비교 증거 계약

각 `UX-*`는 다음 증거가 모두 있어야 `완료`다.

1. 동일 source seed/state와 viewport의 원천 capture와 SSOO capture.
2. 화면 title, section 순서, field/column/action 목록과 visible label의 구조 diff.
3. 기본 filter/sort/selection, confirmation, disabled/read-only, validation, empty/error 상태의 interaction diff.
4. 원천 업무 content 영역의 screenshot overlay 또는 perceptual diff. 플랫폼 shell 영역은 비교에서 분리한다.
5. 차이가 있으면 `platform-required`, `responsive-only`, `source-bug-compatible`, `defect` 중 하나로 분류하고 근거를 manifest에 기록한다.
6. `defect` 0, 미분류 차이 0, 누락 capture 0.
7. SSOO target은 desktop 1440×1000과 mobile 390×844에서 E0 browser gate를 함께 통과한다. 원천이 desktop-only이면 mobile은 additive responsive 검증으로 분리한다.

“공용 component를 사용했다”, “화면이 열린다”, “기능 테스트가 통과한다”만으로 UI/UX 패리티를 완료 처리하지 않는다.

### REF-01 manifest 형식과 자동 게이트

`pnpm run verify:crm-goal-contract`는 다음 환경 입력을 요구한다.

- `CRM_SOURCE_PROTOTYPE_DIR`: 원천 prototype 전체 디렉터리. `index.html`, `login.js`, `supabase_client.js`를 직접 포함하는 앱 루트가 원칙이다. 다운로드·압축 해제 결과가 동일 이름의 단일 wrapper 폴더를 한 단계 더 포함한 경우에는 wrapper에 다른 sibling 파일/폴더가 없고 내부 유일 디렉터리에 세 entry file이 모두 있을 때만 내부 앱 루트를 자동 해석한다. 다중 후보나 sibling 항목이 섞인 경로는 실패한다.
- `CRM_SOURCE_DDL_PATH`: 원천 `Create Table script.txt`.
- `CRM_SOURCE_UIUX_MANIFEST`: UTF-8 JSON manifest. `version: 1`, prototype 전체 파일의 `path`/`sha256` 배열인 `prototypeFiles`, `UX-01~17` 각각의 `uxId`, `sourcePage`, `viewport`, `screenshot`, `domManifest`, `stateManifest`, `captureCommand`, `seedState`, `capturedAt`, 세 증거 파일의 `evidenceSha256`을 가진 `captures`를 포함한다.
- `CRM_SOURCE_PPTX_PATH`: 선택 입력. 존재하면 알려진 hash를 검증하지만 누락은 실패가 아니다.

target 비교 증거는 `CRM_TARGET_UIUX_MANIFEST`로 별도 전달한다. 현재 정본의 UX 행이 하나라도 `완료`가 되면 `verify:crm-goal-contract`가 `verify:crm-uiux-parity`를 함께 실행하므로 이 입력은 필수다. 최종 17/17 판정은 다음 명령을 통과해야 한다.

```bash
CRM_SOURCE_UIUX_MANIFEST=<REF-01 manifest> \
CRM_TARGET_UIUX_MANIFEST=<fresh target parity manifest> \
pnpm run verify:crm-uiux-parity:all
```

target manifest는 `version: 2`와 `worktreeIdentity`를 필수로 가진다. capture 시작/종료의 tracked·untracked 실제 파일내용 지문이 같아야 하고, verifier 실행 시점의 current identity와도 일치해야 한다. 각 `완료` UX는 `requiredForTargetComparison`의 모든 state ID와 같은 이름의 source capture, 서로 다른 target desktop 1440×1000/mobile 390×844 capture, content-region overlay 또는 perceptual diff, 구조 diff, interaction 확인, browser E0를 포함한다. missing/renamed/reordered/default-behavior defect, `unclassified`, `defect`, 예상 밖 HTTP 실패, console/page error와 mobile overflow는 모두 0이어야 한다. 플랫폼 shell·반응형·원천 버그 호환 차이는 각각 `platform-required`, `responsive-only`, `source-bug-compatible`로 근거를 기록한 경우만 허용한다.

S12에서 REF-01의 17개 화면·필수 상태 83개를 각각 독립 초기화한 source screenshot으로 확장했고, `states[].name`과 `requiredForTargetComparison[].id`의 완전·순서 일치를 goal-contract가 강제한다. 기존 81개 집계에서 빠졌던 견적 `quote-preview`, `quote-print` 상태도 원천 독립 capture로 포함했다. `docs/crm/evidence/target-uiux/s12-iteration-22-full-83/target-uiux-parity-manifest.json`은 같은 83개 상태의 target desktop/mobile capture, perceptual diff, 구조/interaction 결과와 E0를 단일 실행으로 제공한다.

각 capture의 viewport와 PNG 실제 IHDR 크기는 모두 1440×1000이어야 한다. screenshot/manifest 경로는 UI/UX manifest 파일 기준 상대 경로이며 실제 파일이고 선언된 SHA-256과 일치해야 한다. DOM manifest는 비어 있지 않은 `title`, `sections`, `actions`와 `fields`, `columns`, `labels` 배열을 제공한다. state manifest는 `requiredForTargetComparison`에 열거한 모든 비교 상태와 같은 ID·순서의 capture를 제공해야 한다. 각 상태는 `captured: true`, 1440×1000 PNG와 그 SHA-256을 가지며, 각 요구 상태에는 행동과 실재 source anchor가 있어야 한다. prototype manifest의 파일 집합은 실제 prototype 디렉터리의 전체 regular-file 집합과 같아야 한다.

`pnpm run verify:crm-goal-contract:structure`는 문서 구조만 검사하는 진단 명령이다. `REF-01`을 명시적으로 건너뛰므로 Phase 1 closure 또는 100% 증거로 사용할 수 없다.

## 5. Phase 1/2 판정

- Phase 1 100% 준비: `REF-01` 복구, `UX-01~17` 원천 capture/manifest 존재, 모든 UX가 `IMP-*`와 `BT-*`에 연결되고 `pnpm run verify:crm-goal-contract`가 PASS.
- Phase 2 100% 구현: `SRC-*`, `UX-*`, `OPS-*`가 fresh DB/API/desktop/mobile 증거로 모두 완료되고 BT-27의 미분류/defect가 0.
- 현재 판정: 정본 폐쇄 원장은 `UX-01~17` 17/17이다. 기존 S12 통합 target manifest는 17개 화면·83개 필수 상태의 source/desktop/mobile/diff, 구조·interaction·E0를 제공하지만 schema 1이라 current worktree identity를 증명하지 못한다. schema 2 fresh target capture와 current local/runtime report가 같은 identity로 통과하기 전에는 현재 revision 17/17로 재선언하지 않는다. 남은 `OPS-*`를 이 점수에 합산하거나 UI/UX 완료만으로 최종 Goal 100%를 선언하지 않는다.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-08-24 | target evidence를 schema 2로 올리고 tracked/untracked 실제 파일내용 worktree identity를 capture 시작·종료·검증 시점에 결합했다. 기존 schema 1 S12 증거는 폐쇄 원장으로 보존하되 current revision 재증명에는 사용할 수 없게 fail-closed 처리 |
| 2026-08-24 | `CRM_SOURCE_PROTOTYPE_DIR`가 entry file을 직접 가진 앱 루트이거나 sibling 없는 단일 wrapper인 경우만 결정적으로 해석하도록 capture/goal-contract 공용 resolver와 direct/wrapper/ambiguous negative self-test를 추가 |
| 2026-08-21 | 누락된 견적 preview·print 원천 상태를 추가해 분모를 83상태로 정정하고, 최신 CRM/Admin production build와 격리 DB에서 83/83 source/desktop/mobile/perceptual-diff 쌍을 단일 실행했다. 구조 누락·미분류·defect·예상 밖 HTTP/console/page error·mobile overflow 0과 `verify:crm-uiux-parity:all` PASS를 확인해 UX 17/17을 확정 |
| 2026-08-20 | S12 시작 감사에서 기존 goal-contract가 REF-01 hash와 문서 상태만 검사하고 target pair를 강제하지 않는 gap을 확인. `CRM_TARGET_UIUX_MANIFEST`와 `verify:crm-uiux-parity(:all)`을 추가해 동일 state source/desktop/mobile capture·구조/interaction/visual diff·분류·E0 없이는 UX `완료`가 goal-contract를 통과하지 못하도록 fail-closed 처리 |
| 2026-08-19 | S7 target desktop/mobile에서 UX-12/15/16/17의 user/code/year/seller·CI/auth/profile 동작과 allow/deny/failure/원복을 확인. source/target content overlay·전체 state pair·시각 hierarchy 차이 분류가 남아 `부분` 유지 |
| 2026-08-18 | S6 target desktop/mobile에서 UX-10의 source-compatible 월별 비교·filter·mode 보존과 E0를 확인. source/target content overlay·전체 state pair·시각 hierarchy 차이 분류가 남아 `부분` 유지 |
| 2026-08-18 | S5 target desktop/mobile에서 dashboard 값·상태·최근 5건과 list 12 column·filter/sort·이전차수 interaction을 확인. 원천 content overlay와 전체 state pair, 특히 원천 단일 목록 대비 target MDI 전환 차이의 분류가 남아 UX-01~02는 `부분` 유지 |
| 2026-08-18 | 제공된 원본 프로토타입·DDL을 확인하고 source-owned SQL anchor 기반 오프라인 Chromium 캡처, 17개 1440×1000 화면, DOM/state manifest, 파일·증거 SHA-256으로 REF-01 복구. target 비교 전이므로 UX 상태는 전부 `부분` 유지 |
| 2026-08-18 | 사용자 기준인 “SSOO 공용 template/component 사용 + 원천 UI/UX 디자인 무변경”을 `UX-01~17`, `REF-01`, `BT-27` 분모로 고정하고 원천 시각 기준 없는 완료 선언을 금지 |
