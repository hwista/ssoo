# 서비스 홈과 좌측 탐색 메뉴 공용 계약 검토

> 검토일: 2026-09-30
> 상태: 사용자 승인에 따라 플랫폼 공용 홈 계약 구현. 아래 초기 조사와 제안은 변경 전 기록이며, 적용 결과는 하단에 별도 기록한다.

## 확인한 문제

공용 패키지는 탭 바와 사이드바의 모양·상호작용을 공유하지만, 어떤 화면이 홈인지와 어디에 노출할지는 앱마다 따로 결정한다. 따라서 공용 탭 바를 사용해도 좌측 메뉴의 홈 중복을 자동으로 막지 못한다.

CRM 스크린샷의 홈 아이콘, `영업기회 목록` breadcrumb, 본문의 `대시보드`, 좌측의 `영업기회 작업공간` 선택은 하나의 `/`에 서로 다른 이름과 역할을 붙인 결과다. 별도 `/?sourceSurface=dashboard`는 같은 홈을 여는 별칭이 아니라 `crm-source-dashboard`라는 닫을 수 있는 별도 탭이다.

## 적용 전 서비스별 데이터 출처

| 서비스 | 좌측 탐색 데이터 | 고정 홈 | 홈 중복 상태 |
|---|---|---|---|
| CRM | `AppLayout.tsx`의 `menuItems` 배열 | `/` → 영업기회 작업공간(대시보드·운영 지표·목록·상세/편집 포함) | `/` 작업공간 행이 홈과 같은 대상이며, 대시보드 전용 화면도 별도 행/탭으로 등록 |
| Admin | `navigation.ts`의 `ADMIN_NAV_ITEMS` | `/` → 플랫폼 대시보드 | 대시보드 행과 홈이 같은 대상. 별도 탭을 늘리는 것은 아님 |
| SNS | `shell-navigation.ts`의 `SNS_SHELL_NAV_ITEMS` | `/` → 피드 | 피드 행과 홈이 같은 대상. 별도 탭을 늘리는 것은 아님 |
| PMS | `pms.cm_menu_m`, 역할/사용자별 메뉴 접근 정보 → access snapshot → `menu.store` | `/home` → 운영 대시보드 | seed에서 홈 메뉴 제외 의도. 실행 DB의 `dashboard` 행도 비표시·비활성 |
| DMS | 파일 저장소/API의 문서 트리, 책갈피, 열린 탭. 설정 모드에는 별도 설정 registry | `/home`, `id=home` → DMS 대시보드 | 업무 파일 트리에 홈 노드가 없고 열린 페이지에서도 홈 제외 |

PMS 실행 DB는 `ssoo-postgres`의 `ssoo_dev`에서 읽기 전용 트랜잭션으로 확인했다. `menu_code=dashboard`, `menu_path=/home`, `is_visible=false`, `is_active=false`다. 다섯 앱의 현재 배포 화면을 이번 조사에서 모두 브라우저로 재검증한 것은 아니다.

주요 근거:

- CRM: `apps/web/crm/src/components/layout/AppLayout.tsx`, `apps/web/crm/src/lib/crmWorkspaceRoutes.ts`, `apps/web/crm/src/stores/tab.store.ts`, `OpportunityWorkspaceClient.tsx`.
- Admin/SNS: 각 앱의 navigation 정의, `Sidebar.tsx`, `tab.store.ts`.
- PMS: `apps/server/src/modules/pms/menu/menu.service.ts`, `packages/database/prisma/seeds/05_menu_data.sql`, `apps/web/pms/src/stores/menu.store.ts`.
- DMS: `apps/web/dms/src/components/layout/sidebar/{Sidebar,FileTree,OpenTabs}.tsx`, `ContentArea.tsx`, `stores/tab.store.ts`.
- 공용: `packages/web-shell/src/tabbar.tsx`의 `homeTabId`/`isTabHome`, `sidebar.tsx`의 주입된 트리 렌더링.

## DMS에서 가져올 규칙

DMS 홈은 `HOME_TAB`으로 최초 생성하며 닫을 수 없다. `ContentArea`가 그 탭 ID를 대시보드에 연결한다. 사이드바는 업무 대상인 문서만 제공하며, `OpenTabs`는 `HOME_TAB.id`를 명시적으로 제외한다. 중복 방지는 현재 DMS 앱 코드의 규칙이며 공용 패키지 전체의 강제 계약은 아니다.

다른 앱에 적용할 부분은 **서비스 홈은 고정 탭, 좌측 탐색은 업무 대상/기능, 열린 페이지는 업무 탭**이라는 역할 구분이다. DMS 문서 트리 자체를 다른 서비스의 메뉴 DB로 일반화할 필요는 없다.

## 권장 공용 계약

각 도메인이 화면 정의를 한 곳에 등록하고, `web-shell`이 그 정의로 홈·좌측 노출·탭 식별을 일관되게 처리한다. 현재 `defineSsooMdiPageRegistry`는 주로 본문 렌더링 계약이므로, 이와 연결되는 얇은 탐색 계약을 추가하는 방향이다.

화면 정의에는 안정된 `pageId`, 정규 경로와 기존 경로 별칭, 제목, `home`/`feature` 역할, 메뉴 노출 위치, 아이콘과 권한 판정 연결을 둔다. 실제 업무 컴포넌트와 권한 판단은 도메인 소유로 남긴다. 같은 화면의 메뉴·탭 제목·breadcrumb을 별개의 문자열 목록으로 관리하지 않는다.

공용 규칙:

1. 앱마다 홈 정의는 정확히 하나다. 고정 홈 탭은 닫거나 복제하지 않는다.
2. 홈 역할의 페이지는 기본 좌측 기능 메뉴와 열린 페이지 목록에서 제외한다. 홈 검색 결과나 기존 즐겨찾기 링크가 있으면 기존 홈 탭을 활성화한다.
3. 정규 경로와 별칭은 같은 `pageId`로 해석한다. 탭의 `pageId`와 상세 인스턴스 ID를 구분해 문서/상세의 다중 탭은 유지한다.
4. 숨김, 권한 거부, 비활성은 다른 상태다. 메뉴에서 홈을 제외하려고 기능/API 권한까지 없애지 않는다. 접근 실패는 기존 공용 접근 복구 동선을 따른다.
5. 정적 메뉴와 DB 메뉴는 같은 탐색 계약으로 변환한다. 공용 컴포넌트에 서비스명별 분기를 추가하지 않는다.
6. PMS 메뉴/권한 데이터와 DMS 파일 트리는 각 도메인이 유지한다. 향후 중앙 메뉴 편집이 실제로 필요하면 플랫폼 저장소에 서비스 식별자를 둔 노출 설정을 검토한다. 이번 홈 중복 해결을 위해 모든 메뉴를 한 DB 테이블로 옮길 필요는 없다.

## CRM 적용 제안

| 대상 | 제안 |
|---|---|
| 고정 홈 `/` | 대시보드와 기존 SSOO 운영 지표. 제목/breadcrumb은 홈의 대시보드 정의를 사용 |
| 좌측 대시보드 행 | 고정 홈 진입과 통합하여 기본 메뉴에서는 제외 |
| 영업기회 작업공간 | 예: `/opportunities`의 독립 업무 탭. 기존 조회·상세·편집·견적/계약 동작 유지 |
| 영업기회 현황/등록 | 각각의 기존 업무 기능으로 유지. 작업공간과의 기능 통합 여부는 후속 내부 기능 검수에서 판단 |
| `/?sourceSurface=dashboard` | 홈의 호환 진입 경로로 처리해 홈 탭 하나만 활성화 |
| `/?selected=...`, `/?create=opportunity` 등 | 기존 업무 의미에 맞는 목적지로 전달. `/` 전체를 일괄 홈으로 바꾸면 기존 상세/등록 링크가 깨지므로 query별 해석 필요 |

현재 홈의 대시보드 아래에 있는 운영 지표·업무 기능을 없애는 작업으로 해석하지 않는다. 기능의 이동 위치와 기존 링크 처리까지 정한 뒤 구현한다. Admin은 홈 대시보드, SNS는 홈 피드를 유지하며 같은 대상을 가리키는 기본 좌측 행만 정리한다. SNS에 별도 통계 대시보드를 새로 만드는 제안은 아니다.

## 적용·검증 범위

공용 계약 → 각 앱 데이터 adapter → CRM 홈/작업공간 분리 → 기존 탭/URL 호환 → 5앱 회귀 순서로 적용한다. 저장된 탭 목록을 통째로 초기화하지 않고 과거 홈/대시보드 ID만 정규화하며, 작성 중인 업무 탭과 DMS 미저장 문서를 보존한다.

검증 조건은 앱당 홈 1개, 홈 중복 메뉴/탭 없음, 홈·메뉴·제목·breadcrumb 일치, 기존 deep link와 새로고침/뒤로가기, 계정 전환 및 읽기 권한, PC/모바일, DMS 문서 다중 탭/미저장 상태 보존이다. PMS는 seed 반복 적용/기존 DB/새 DB에서 같은 결과가 나오는지도 확인한다.

## 적용 결과

- `packages/web-shell/src/home-navigation.ts`가 홈 정의(`id`, 경로, 탭 제목, 화면 제목), 홈 판별, 좌측 노출, 저장된 홈 별칭 병합을 소유한다. 다섯 서비스의 store와 좌측 탐색이 이를 소비한다.
- 고정 홈은 닫기·복제·순서 변경 대상에서 제외한다. 탭 상한에 도달해도 홈으로 돌아갈 수 있다. 업무 탭 객체와 DMS 편집 메타데이터를 유지한다.
- Admin 대시보드, SNS 피드, CRM 대시보드의 기본 좌측 행을 제외한다. PMS는 API 메뉴의 `isVisible`과 홈 경로를 화면 투영에 적용하되 원본 `menuMap`은 보존한다. 홈 즐겨찾기 행도 표시에서 제외하며 DB 행/권한은 삭제하지 않는다. DMS 열린 페이지의 홈 제외를 공용 판별로 통일한다.
- CRM `/`는 대시보드와 기존 SSOO 운영 지표를 렌더링한다. `/opportunities`는 기존 영업기회 작업공간이며 현황·등록·계약서 생성은 해당 경로의 `sourceSurface`를 유지한다. dashboard 별칭은 홈으로, root의 상세·등록·필터 query는 작업공간으로 정규화한다. 대시보드 API의 업무 링크도 새 경로를 사용한다.
- CRM 저장 탭 version 0의 기존 홈 작업공간을 닫을 수 있는 업무 탭으로 이전하고 새 홈을 추가한다. 기존 dashboard 탭만 새 홈과 병합한다. 그 외 업무 탭을 초기화하지 않는다.
- 전체 업무 메뉴를 새 통합 registry로 옮기는 작업은 수행하지 않았다. 이번 공용 계약은 홈과 노출/탭 정규화에 한정하며, 메뉴 내용·권한·문서 인스턴스는 기존 도메인 adapter가 소유한다.
- `pnpm run verify:home-navigation`은 실제 다섯 store의 탭 동작과 CRM 이전/별칭을 검증한다. 기존 `verify:ssoo-frame`에도 연결해 preflight에서 실행한다.

### 검증 기록

- `output/playwright/home-navigation/verification.json`: 실제 브라우저 11개 실행 묶음. 다섯 앱의 홈/좌측 메뉴와 1440×1000·390×844 화면, 업무 탭 왕복·복원, CRM 작성 중 입력과 DMS 문서 2탭/미저장 본문·편집 상태 보존을 확인했다. 기록된 실행에서 page error·HTTP 4xx/5xx 없음.
- CRM 기존 dashboard/selected query 정규화, 최근 행의 원천 조회 양식 연결, 관리자와 조회 계정의 대시보드/상세 접근 통과. 최종 홈에 원천 지표와 SSOO 운영 지표가 함께 존재한다.
- 공용 홈 실제 store/경로 검증 74개, 대시보드 서버 테스트 6개, server 및 5앱 production build, 각 앱 정식 lint, preflight, verify-sync, frame 검증, 문서 strict-warnings, DMS guard 통과.
- 일부 직접 Next 빌드 복사본에서 ESLint 플러그인 경로 오류가 표시됐다. build/typecheck는 완료됐으며 lint를 원본 앱의 정식 명령으로 별도 실행해 모두 통과했다. 이를 빌드 내부 lint 통과로 집계하지 않는다.
- DMS guard는 다른 세션의 `.next`를 지우지 않도록 격리 소스에서 실행했다. DB는 별도 launch baseline에 migration/seed/trigger를 적용했다. PMS 메뉴 표시/권한 분리는 실제 store 표본과 이 seed DB로 확인했다. 공용의 이전 DB에 재차 seed/migration을 적용한 결과는 아니다.
- 공용 개발 DB/배포 환경은 갱신하지 않았다. 이번 탐색 변경은 DB migration을 추가하지 않는다. 기존 공통코드/사업연도 이전의 공용 DB 반영 문제는 별도다.

## Changelog

| 날짜 | 변경 내용 |
|---|---|
| 2026-09-30 | 5앱 홈/메뉴 출처 비교, PMS 실행 DB 확인, DMS 중복 방지 방식과 공용 탐색 계약·CRM 이전안 정리 |
